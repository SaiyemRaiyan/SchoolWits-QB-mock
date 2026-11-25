/**
 * PaperExtractor: the steps of reading a paper, in the order they never
 * change (Template Method). A subject overrides single steps, never the order.
 * See docs/paper-extractor.md.
 *
 *   extract()
 *     document()      the file -> preamble and body (the body starts at the LAST \begin{document})
 *     understand()    the preamble -> the file's own definitions, and a typesetter for them
 *     chain()         symbolReader() + readers() + the fixed tail -> the equation chain
 *     readQuestion()  one \examq block -> stem, parts, marks, options, passes
 *     classify()      MCQ or structured, decided over the whole paper
 *     check()         passes and doubts -> warnings
 *     attachAnswers() the answers file, read by the existing reader
 */

import { findSourcePdf } from '../latex/clip.js';
import { parseMarks, parsePaperId, splitQuestions, splitTopics, type QuestionBlock } from '../latex/blocks.js';
import { detectGarbledText, isLayoutDialect, positionedMaths } from '../latex/guard.js';
import { findCommand } from '../latex/scan.js';
import { mergePaper, parseAnswerPaper, parseQuestionPaper } from '../latex/index.js';
import type { ImageMap, Options, PaperMeta, ParsedPaper, Question, Warning } from '../latex/types.js';
import { hideMathBreaks, restoreMathBreaks } from './answers.js';
import { Brackets } from './equations/brackets.js';
import { EquationChain } from './equations/chain.js';
import { Fractions } from './equations/fraction.js';
import { Modulus } from './equations/modulus.js';
import { PassOver } from './equations/pass.js';
import { Roots } from './equations/root.js';
import { TextAndScripts } from './equations/script.js';
import { SymbolPictures } from './equations/symbol.js';
import { TypedMaths } from './equations/typed.js';
import { Underline } from './equations/underline.js';
import { dropComments, MacroTable } from './macros.js';
import { QuestionBuilder, type QuestionRead, type QuestionSource, type ReadingRules } from './questions.js';
import { SymbolTable } from './symbols.js';
import { Typesetter } from './typesetter.js';
import type { EquationReader, ExtractedPaper, Extractor, Pass, PaperSource, SymbolReader } from './types.js';

export interface PaperDocument {
  preamble: string;
  body: string;
}

/** The file without comments, cut at the last \begin{document}: what comes before only describes. */
export function splitPaper(tex: string): PaperDocument {
  const src = dropComments(tex ?? '');
  const begin = src.lastIndexOf('\\begin{document}');
  if (begin === -1) return { preamble: '', body: src };
  const from = begin + '\\begin{document}'.length;
  const end = src.indexOf('\\end{document}', from);
  return { preamble: src.slice(0, begin), body: src.slice(from, end === -1 ? undefined : end) };
}

/** The paper a file holds, read from its first question, or null. */
export function paperOf(source: PaperSource): PaperMeta | null {
  const first = splitQuestions(splitPaper(source.questions).body)[0];
  return first ? parsePaperId(first.paperId) : null;
}

/** The commands a paper written as a copy of the printed page defines. */
const POSITIONING = ['at', 'freerow', 'swglyph', 'swcut', 'row', 'prow', 'mcq', 'stem', 'optrow', 'choice', 'dotline'];

/** Nothing changed: the line as it was set, the text as it was read. */
const PLAIN_RULES: ReadingRules = { pieces: (line) => line, tidy: (tex) => tex };

/** One question as read, before it is classified: what classify() and check() receive. */
export interface QuestionDraft {
  block: QuestionBlock;
  marks: number;
  read: QuestionRead;
}

export abstract class PaperExtractor implements Extractor {
  /** A name for the subject, as a person would say it. */
  abstract readonly subject: string;

  readonly paper: PaperMeta | null;
  private result: { warnings: Warning[]; passes: Pass[]; rebuilt: number[] } = { warnings: [], passes: [], rebuilt: [] };

  constructor(protected readonly source: PaperSource) {
    this.paper = paperOf(source);
  }

  // ---- what the paper is ---------------------------------------------------

  /** Syllabus code, "5054". */
  get code(): string | null {
    return this.paper?.subjectCode ?? null;
  }
  /** Paper number, "2" of 5054/21. */
  get paperNumber(): string | null {
    return this.paper?.paper ?? null;
  }
  get variant(): string | null {
    return this.paper?.variant ?? null;
  }
  /** "M/J" or "O/N". */
  get session(): string | null {
    return this.paper?.session ?? null;
  }
  get year(): string | null {
    return this.paper?.year ?? null;
  }

  // ---- what the last extract() found --------------------------------------

  get warnings(): readonly Warning[] {
    return this.result.warnings;
  }
  get passes(): readonly Pass[] {
    return this.result.passes;
  }
  /** Questions with a line rebuilt from position: right as far as known, worth a look. */
  get rebuilt(): readonly number[] {
    return this.result.rebuilt;
  }

  // ---- the template --------------------------------------------------------

  extract(): ExtractedPaper {
    const doc = this.document();
    if (!this.isPositioned(doc)) return this.remember(this.documented(), [], []);

    const setting = this.understand(doc.preamble);
    const chain = this.chain();
    const images = this.source.images ?? {};
    const blocks = splitQuestions(doc.body);
    // The number as printed ("A1"); splitQuestions keeps only its digits.
    const labels = findCommand(doc.body, 'examq', 4).map((call) => call.args[1].trim());
    const drafts: QuestionDraft[] = blocks.map((block, i) => {
      const source: QuestionSource = {
        number: block.number,
        label: labels[i] || String(block.number),
        marks: parseMarks(block.marksRaw),
        body: block.body,
        last: i === blocks.length - 1,
      };
      return { block, marks: source.marks, read: this.readQuestion(source, setting, chain, images) };
    });

    const questions = this.classify(drafts);
    const passes = drafts.flatMap((d) => d.read.passes);
    const rebuilt = drafts.filter((d) => d.read.rebuilt).map((d) => d.block.number);
    const paper = parsePaperId(blocks[0].paperId);
    const warnings: Warning[] = [];
    if (!paper) {
      warnings.push({ code: 'bad-paper-id', message: `Could not read paper id "${blocks[0].paperId}" (expected code/paper-and-variant/session/year).` });
    }
    warnings.push(...this.check(questions, drafts, passes, rebuilt));

    const sourcePdf = findSourcePdf(this.source.questions);
    let parsed: ParsedPaper = { paper, questions, warnings, ...(sourcePdf ? { sourcePdf } : null) };
    parsed = this.attachAnswers(parsed);
    return this.remember(parsed, passes, rebuilt);
  }

  // ---- the steps -----------------------------------------------------------

  /** The file -> preamble and body. */
  protected document(): PaperDocument {
    return splitPaper(this.source.questions);
  }

  /** Written as a copy of the printed page (positions on every line), not in the documented format. */
  protected isPositioned(doc: PaperDocument): boolean {
    if (!splitQuestions(doc.body).length) return false;
    // A file that defines the elements of a placed page is one, however few
    // of them a short file uses; one that defines none is told by its body.
    const own = MacroTable.fromPreamble(doc.preamble);
    return POSITIONING.some((name) => own.has(name)) || isLayoutDialect(doc.body);
  }

  /** A paper in the documented format keeps its own reader. */
  protected documented(): ParsedPaper {
    const qp = parseQuestionPaper(this.source.questions, this.source.images ?? {});
    return this.source.answers ? mergePaper(qp, parseAnswerPaper(this.source.answers, this.source.images ?? {})) : qp;
  }

  /** The preamble's own definitions, and a typesetter that carries them out. */
  protected understand(preamble: string): Typesetter {
    return new Typesetter(MacroTable.fromPreamble(preamble));
  }

  /** Pictures of characters -> characters. */
  protected symbolReader(): SymbolReader {
    return new SymbolTable();
  }

  /**
   * The ways of reading an equation, tried in order. A subclass adds its own
   * with `[...super.readers(), new Mine()]`. Plain text and scripts, and then
   * the pass, always follow: a reader added here sees every line first.
   */
  protected readers(): EquationReader[] {
    return [new TypedMaths(), new SymbolPictures(), new Underline(), new Modulus(), new Roots(), new Fractions(), new Brackets()];
  }

  /** What a subject changes about a line before it is read (pieces) and after (tidy). */
  protected rules(): ReadingRules {
    return PLAIN_RULES;
  }

  /** The chain: this paper's readers, then text and scripts, then the pass. */
  protected chain(): EquationChain {
    return new EquationChain(this.symbolReader(), [...this.readers(), new TextAndScripts(), new PassOver()]);
  }

  /** One \examq block -> what it prints. */
  protected readQuestion(source: QuestionSource, setting: Typesetter, chain: EquationChain, images: ImageMap): QuestionRead {
    return new QuestionBuilder(source, setting, chain, this.rules(), images).build();
  }

  /**
   * MCQ or structured. Decided over the whole paper: a figure-only MCQ looks
   * exactly like a one-mark question with a diagram.
   */
  protected classify(drafts: QuestionDraft[]): Question[] {
    const real = (o: Options | null) => o !== null && o.source !== 'figure' && o.items.length > 0;
    const mcqPaper =
      drafts.length > 0 &&
      drafts.every((d) => d.read.parts.length === 0 && d.marks <= 1) &&
      drafts.filter((d) => real(d.read.options)).length >= Math.max(3, drafts.length * 0.5);
    return drafts.map(({ block, marks, read }) => {
      const options = read.parts.length === 0 ? read.options : null;
      const kind: Question['kind'] = read.parts.length === 0 && marks <= 1 && (real(options) || mcqPaper) ? 'mcq' : 'structured';
      const topics = splitTopics(block.topicsRaw);
      return {
        number: block.number, kind, topics, topic: topics.join(' · '), marks,
        stem: read.stem, parts: read.parts, options: kind === 'mcq' ? options : null, answer: null,
      };
    });
  }

  /** What a person saving the paper should look at. */
  protected check(questions: Question[], drafts: QuestionDraft[], passes: Pass[], rebuilt: number[]): Warning[] {
    const out: Warning[] = [];
    const byQuestion = new Map<number, Pass[]>();
    for (const p of passes) byQuestion.set(p.question, [...(byQuestion.get(p.question) ?? []), p]);
    for (const [n, list] of byQuestion) {
      const reasons = [...new Set(list.map((p) => p.reason))].join(', ');
      out.push({
        code: 'unsupported-layout',
        questionNumber: n,
        message: `Q${n}: ${list.length} thing${list.length === 1 ? '' : 's'} could not be read for certain (${reasons}). Check against the paper.`,
      });
    }
    const looked = positionedMaths(rebuilt.filter((n) => !byQuestion.has(n)));
    if (looked) out.push(looked);
    const garbled = detectGarbledText(questions);
    if (garbled) out.push(garbled);
    questions.forEach((q, i) => {
      if (q.kind === 'mcq' && q.options?.source === 'figure') {
        out.push({ code: 'mcq-options-unparseable', questionNumber: q.number, message: `Q${q.number}: options exist only inside the figure image and cannot be extracted.` });
      }
      const sum = drafts[i].read.partMarks;
      if (q.kind === 'structured' && q.parts.length > 0 && sum !== q.marks) {
        out.push({ code: 'marks-mismatch', questionNumber: q.number, message: `Q${q.number}: \\examq says ${q.marks} marks but the parts sum to ${sum}.` });
      }
    });
    return out;
  }

  /** The answers file, read by the existing mark-scheme and solution readers. */
  protected attachAnswers(paper: ParsedPaper): ParsedPaper {
    if (!this.source.answers) return paper;
    // A matrix's row break inside maths must not end a heading or a table row (see answers.ts).
    const merged = mergePaper(paper, parseAnswerPaper(hideMathBreaks(this.source.answers), this.source.images ?? {}));
    return { ...merged, questions: merged.questions.map((q) => ({ ...q, answer: restoreMathBreaks(q.answer) })) };
  }

  private remember(paper: ParsedPaper, passes: Pass[], rebuilt: number[]): ExtractedPaper {
    this.result = { warnings: paper.warnings, passes, rebuilt };
    return { ...paper, passes };
  }
}
