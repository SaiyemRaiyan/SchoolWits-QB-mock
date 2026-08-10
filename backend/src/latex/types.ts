/**
 * The JSON contract for a parsed paper.
 *
 * This is the single source of truth for the shape everything else in
 * src/latex/ produces. It is deliberately a *structured* representation —
 * a parts tree with generated refs — rather than the rendered-HTML blobs
 * the old js/latex.js emits. See templates/README.md for the .tex format
 * this mirrors, and backend/CLAUDE.md for why the current `questions`
 * table does NOT yet store this shape (no migration in this pass).
 *
 * Design rule throughout: **math is never touched**. Every `html` /
 * `content` string keeps `$...$`, `$$...$$`, `\(...\)` and `\[...\]`
 * verbatim so KaTeX renders them client-side, exactly as today.
 */

/** A paper id like `5054/21/M/J/25`, decomposed. */
export interface PaperMeta {
  /** The raw first argument of \examq, e.g. "5054/21/M/J/25". Join key. */
  paperId: string;
  /** Syllabus code, e.g. "5054". */
  subjectCode: string;
  /**
   * Paper and variant come from the two digits of the middle segment:
   * "21" -> paper "2", variant "1".
   */
  paper: string;
  variant: string;
  /** e.g. "M/J" */
  session: string;
  /** Four-digit, expanded from the two-digit source: "25" -> "2025". */
  year: string;
}

export type QuestionKind = 'structured' | 'mcq';

/**
 * A piece of question content. `text` carries an HTML fragment (math left
 * as raw LaTeX); `figure` is a \qfig; `table` is a raw tabular we pass
 * through rather than try to restructure.
 */
export type Block =
  | { type: 'text'; html: string }
  | {
      type: 'figure';
      /** Filename as written in the .tex, e.g. "5054_21_M_J_25_fig1.png". */
      file: string;
      /**
       * Resolved URL from the images map, or null when the file wasn't
       * supplied. Null is normal and fine — many figures are missing from
       * the source folders (see templates/README.md, issue 3).
       */
      src: string | null;
      caption: string;
      /** The optional \qfig argument, e.g. "0.42\\linewidth". */
      width: string | null;
    }
  | { type: 'table'; html: string };

/**
 * How a part asks for its answer. Layout only in the source — we keep the
 * kind because it hints at expected answer length, and discard the rest.
 */
export type AnswerSpace =
  | { kind: 'lines'; lines: number }
  | { kind: 'value'; label: string; unit: string }
  | { kind: 'markright' };

/**
 * A lettered part or roman subpart.
 *
 * `label` and `ref` are GENERATED from list position — they are never
 * written in the .tex (enumitem renders them). Getting this right is what
 * lets mark-scheme rows key back onto parts.
 */
export interface Part {
  /** "a" | "b" ... for parts; "i" | "ii" ... for subparts. */
  label: string;
  /** Fully qualified, matching mark-scheme column 1: "1(c)(ii)". */
  ref: string;
  /** Null for a part that only groups subparts (its marks are their sum). */
  marks: number | null;
  answerSpace: AnswerSpace | null;
  content: Block[];
  subparts: Part[];
}

/**
 * Multiple-choice options.
 *
 * `source` records how they were written, because the source papers use
 * four incompatible encodings (templates/README.md, issue 1). `figure`
 * means the options exist only as pixels inside the image and `items`
 * will be empty — that is a data problem, not a parser bug.
 */
export interface Options {
  source: 'choices' | 'inline' | 'tabular' | 'figure';
  items: { label: string; content: string }[];
}

/** One row of an mstab grid. */
export interface MarkSchemeRow {
  /** Carried from \multirow when the row's own label cell is blank. */
  ref: string;
  /** HTML fragment of the answer cell. */
  answer: string;
  /** The answer cell split on \newline / "or" — [] when there's one form. */
  alternatives: string[];
  /** "B1" | "M1" | "A1" | ... as written. */
  code: string;
  /** Digits parsed out of `code`; 0 when it carries none. */
  marks: number;
  /** 4-column papers only (Add Maths, Maths D); null for 3-column. */
  guidance: string | null;
  /**
   * A full-width `\altrow{colour}{Alternative}` heading rather than a mark
   * row — it introduces an alternative method. Carries no marks and no ref.
   */
  banner: boolean;
}

/** One chunk of an ansbox, split on its leading (a) / (c)(i) marker. */
export interface SolutionSegment {
  /** Null when the box has no part markers (typical for MCQ). */
  ref: string | null;
  heading: string | null;
  html: string;
}

export interface Answer {
  markScheme: MarkSchemeRow[];
  workedSolution: SolutionSegment[];
  /** MCQ only — the letter, read out of the worked solution prose. */
  correct: string | null;
}

export interface Question {
  number: number;
  kind: QuestionKind;
  /** \examq arg 3, split on \textperiodcentered. */
  topics: string[];
  /** The joined display form, matching what the app shows today. */
  topic: string;
  marks: number;
  /** Content between \examq and the first \begin{parts}. */
  stem: Block[];
  parts: Part[];
  /** Null for structured questions. */
  options: Options | null;
  /** Null until mergePaper() attaches the answer half. */
  answer: Answer | null;
}

export type WarningCode =
  | 'no-examq'
  | 'bad-paper-id'
  | 'marks-mismatch'
  | 'unmatched-question'
  | 'missing-image'
  | 'mcq-options-unparseable'
  | 'topic-mismatch';

export interface Warning {
  code: WarningCode;
  message: string;
  questionNumber?: number;
}

export interface ParsedPaper {
  paper: PaperMeta | null;
  questions: Question[];
  warnings: Warning[];
}

/**
 * Filename -> URL. Bucket URLs (https://...) after the image-upload change;
 * an empty map is valid and yields `src: null` figures.
 */
export type ImageMap = Record<string, string>;
