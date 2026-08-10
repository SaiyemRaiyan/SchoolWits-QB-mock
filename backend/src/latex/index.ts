/**
 * Public API for the .tex -> JSON parser.
 *
 * Three entry points, mirroring how the papers are authored:
 *   parseQuestionPaper(tex)  — the QP half
 *   parseAnswerPaper(tex)    — the QA half
 *   mergePaper(qp, qa)       — join them on paper id + question number
 *
 * See templates/README.md for the .tex contract and types.ts for the JSON
 * shape. Nothing here writes to the database — the `questions` table does
 * not yet have columns for this shape (see backend/CLAUDE.md).
 */

import { detectMstabColumns, normalizeWhitespace, splitDocument, stripLayoutNoise } from './preprocess.js';
import { parseMarks, parsePaperId, splitQuestions, splitTopics } from './blocks.js';
import { parseStructure } from './structure.js';
import { parseOptions } from './options.js';
import { extractMarkScheme } from './markscheme.js';
import { extractCorrectOption, extractSolution } from './solutions.js';
import type { ImageMap, Options, ParsedPaper, Question, Warning } from './types.js';

export * from './types.js';
export { parsePaperId, splitTopics, splitQuestions } from './blocks.js';
export { parseStructure, splitItems, extractAnswerSpace } from './structure.js';
export { parseMstab, extractMarkScheme, parseLabelCell } from './markscheme.js';
export { parseAnsbox, extractSolution, parseCorrectOption } from './solutions.js';
export { parseOptions } from './options.js';
export { inlineToHtml } from './inline.js';
export { toBlocks, resolveImage } from './content.js';

/**
 * Whether a question states its options as text we could actually read,
 * as opposed to them being locked inside a figure image.
 */
function hasRealOptions(options: Options | null): boolean {
  return options !== null && options.source !== 'figure' && options.items.length > 0;
}

/**
 * Is this an MCQ paper?
 *
 * Decided at paper level, not per question, because a figure-only MCQ is
 * indistinguishable from a 1-mark structured question with a diagram —
 * both are "no parts, one mark, has a figure". Maths D 4024/22 has several
 * of the latter and is not an MCQ paper at all, so judging each question
 * alone misclassifies them and raises bogus warnings.
 */
function looksLikeMcqPaper(
  questions: { parts: unknown[]; marks: number; options: Options | null }[],
): boolean {
  if (questions.length === 0) return false;
  const real = questions.filter((q) => hasRealOptions(q.options)).length;
  const allSingleMark = questions.every((q) => q.parts.length === 0 && q.marks <= 1);
  return allSingleMark && real >= Math.max(3, questions.length * 0.5);
}

export function parseQuestionPaper(tex: string, images: ImageMap = {}): ParsedPaper {
  const { body } = splitDocument(tex);
  const cleaned = normalizeWhitespace(stripLayoutNoise(body));
  const blocks = splitQuestions(cleaned);
  const warnings: Warning[] = [];

  if (blocks.length === 0) {
    warnings.push({
      code: 'no-examq',
      message: 'No \\examq{...} headers found — the file does not use the documented format.',
    });
    return { paper: null, questions: [], warnings };
  }

  const paper = parsePaperId(blocks[0].paperId);
  if (!paper) {
    warnings.push({
      code: 'bad-paper-id',
      message: `Could not read paper id "${blocks[0].paperId}" (expected e.g. 5054/21/M/J/25).`,
    });
  }

  // First pass: structure only. Classification needs to see the whole paper
  // before it can tell a figure-only MCQ from a 1-mark diagram question.
  const drafts = blocks.map((block) => {
    const marks = parseMarks(block.marksRaw);
    const { stem, parts } = parseStructure(block.body, block.number, images);
    return {
      block,
      marks,
      stem,
      parts,
      options: parts.length === 0 ? parseOptions(block.body) : null,
    };
  });

  const isMcqPaper = looksLikeMcqPaper(drafts);

  const questions: Question[] = drafts.map(({ block, marks, stem, parts, options }) => {
    const kind: Question['kind'] =
      parts.length === 0 && marks <= 1 && (hasRealOptions(options) || isMcqPaper)
        ? 'mcq'
        : 'structured';
    const topics = splitTopics(block.topicsRaw);

    if (kind === 'mcq' && options?.source === 'figure') {
      warnings.push({
        code: 'mcq-options-unparseable',
        questionNumber: block.number,
        message: `Q${block.number}: options exist only inside the figure image and cannot be extracted.`,
      });
    }

    // A structured question's parts should account for its stated marks.
    if (kind === 'structured' && parts.length > 0) {
      const sum = parts.reduce((acc, p) => acc + (p.marks ?? 0), 0);
      if (sum !== marks) {
        warnings.push({
          code: 'marks-mismatch',
          questionNumber: block.number,
          message: `Q${block.number}: \\examq says ${marks} marks but the parts sum to ${sum}.`,
        });
      }
    }

    return {
      number: block.number,
      kind,
      topics,
      topic: topics.join(' · '),
      marks,
      stem,
      parts,
      options: kind === 'mcq' ? options : null,
      answer: null,
    };
  });

  return { paper, questions, warnings };
}

export interface ParsedAnswers {
  paper: ReturnType<typeof parsePaperId>;
  byNumber: Map<number, NonNullable<Question['answer']>>;
  warnings: Warning[];
}

export function parseAnswerPaper(tex: string, images: ImageMap = {}): ParsedAnswers {
  const { preamble, body } = splitDocument(tex);
  // The column count lives in the preamble and nowhere else — see markscheme.ts.
  const columns = detectMstabColumns(preamble);
  const cleaned = normalizeWhitespace(stripLayoutNoise(body));
  const blocks = splitQuestions(cleaned);
  const warnings: Warning[] = [];

  if (blocks.length === 0) {
    warnings.push({
      code: 'no-examq',
      message: 'No \\examq{...} headers found in the answers file.',
    });
  }

  const byNumber = new Map<number, NonNullable<Question['answer']>>();
  for (const block of blocks) {
    byNumber.set(block.number, {
      markScheme: extractMarkScheme(block.body, columns, images),
      workedSolution: extractSolution(block.body, block.number),
      correct: extractCorrectOption(block.body),
    });
  }

  return {
    paper: blocks.length > 0 ? parsePaperId(blocks[0].paperId) : null,
    byNumber,
    warnings,
  };
}

/**
 * Attach answers to questions, matching on question number.
 *
 * A question with no matching answer is kept with `answer: null` and a
 * warning — the upload flow has always allowed saving the questions file
 * first and adding answers later, and that stays true here.
 */
export function mergePaper(qp: ParsedPaper, qa: ParsedAnswers): ParsedPaper {
  const warnings: Warning[] = [...qp.warnings, ...qa.warnings];

  const questions = qp.questions.map((q) => {
    const answer = qa.byNumber.get(q.number) ?? null;
    if (!answer) {
      warnings.push({
        code: 'unmatched-question',
        questionNumber: q.number,
        message: `Q${q.number}: no matching question in the answers file.`,
      });
    }
    return { ...q, answer };
  });

  for (const number of qa.byNumber.keys()) {
    if (!qp.questions.some((q) => q.number === number)) {
      warnings.push({
        code: 'unmatched-question',
        questionNumber: number,
        message: `Q${number}: present in the answers file but not in the questions file.`,
      });
    }
  }

  return { paper: qp.paper ?? qa.paper, questions, warnings };
}
