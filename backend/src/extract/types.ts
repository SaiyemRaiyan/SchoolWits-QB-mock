/**
 * The contract of the paper extractor. See docs/paper-extractor.md.
 *
 * Everything a paper prints is reduced to placed pieces before anyone asks
 * what it means. That is what makes the extractor the same for every subject:
 * a new command in a new paper only has to expand to these pieces, which its
 * own definition in the file's preamble already says how to do.
 */

import type { FigureClip } from '../latex/clip.js';
import type { ImageMap, PaperMeta, ParsedPaper, Warning } from '../latex/types.js';

// ---- pieces -------------------------------------------------------------

/** Where a piece sits, in bp. y is up from the line's baseline. */
export interface Placed {
  x: number;
  y: number;
  width: number;
}

export interface TextPiece extends Placed {
  kind: 'text';
  text: string;
  /** Type size in bp; small print against its neighbours is a script. */
  size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Set in a serif font inside a sans-serif paper, as Roman numerals are. */
  serif?: boolean;
  /** Read from a picture of the character, whose box only stands in for the letter's width. */
  pictured?: boolean;
}

/** Maths the author typed. Never rewritten: KaTeX reads it as it stands. */
export interface MathPiece extends Placed {
  kind: 'math';
  tex: string;
  /** Type size, when the piece stands among small print. */
  size?: number;
}

/** A picture of one character, cut from the source PDF. */
export interface GlyphPiece extends Placed {
  kind: 'glyph';
  clip: FigureClip;
  height: number;
}

/** A straight line: a fraction bar, an underline, the bar of a root. */
export interface RulePiece extends Placed {
  kind: 'rule';
  thickness: number;
}

/** A drawn shape: a root sign, a tall bracket, a modulus bar. */
export interface PathPiece extends Placed {
  kind: 'path';
  points: { x: number; y: number }[];
  /** Line width; absent when the shape is filled rather than drawn. */
  stroke?: number;
}

export type Piece = TextPiece | MathPiece | GlyphPiece | RulePiece | PathPiece;

/** One printed line (or band of maths), pieces in no guaranteed order. */
export interface Line {
  pieces: Piece[];
  /** The type size most of the line is set in. */
  size: number;
  /** What setting the line could not deal with. Nothing of it is printed. */
  problems?: Problem[];
}

export interface Problem {
  reason: PassReason;
  detail: string;
}

// ---- reading pieces -----------------------------------------------------

/** What reading a line produced: the parser's own inline LaTeX, or a pass. */
export type Reading =
  | { ok: true; tex: string; /** Rebuilt from position: worth a human look. */ rebuilt: boolean }
  | { ok: false; reason: PassReason; /** Best effort, shown but flagged. */ tex: string };

/** Why something was passed over rather than guessed. */
export type PassReason =
  | 'unknown-symbol'
  | 'unknown-shape'
  | 'ambiguous-layout'
  | 'unknown-command'
  | 'lost-underline';

export interface Pass {
  question: number;
  reason: PassReason;
  detail: string;
}

/**
 * Strategy: one way of turning a group of pieces into an equation.
 *
 * Readers are tried in order and the first to accept wins. A reader that is
 * not sure must return null, never its best guess: the last reader in the
 * chain is the pass, which flags the line.
 */
export interface EquationReader {
  readonly name: string;
  read(line: Line, context: ReadContext): Reading | null;
}

/** Turns a picture of a character into the character, or null if not known. */
export interface SymbolReader {
  read(glyph: GlyphPiece): string | null;
}

export interface ReadContext {
  symbols: SymbolReader;
  /** Read a smaller group with the whole chain, e.g. a fraction's top half. */
  read(line: Line): Reading;
}

// ---- the extractor ------------------------------------------------------

export interface PaperSource {
  /** The question paper's .tex. */
  questions: string;
  /** The answers' .tex, when there is one. */
  answers?: string | null;
  images?: ImageMap;
}

/** Same output as the current parser, plus what was passed over and why. */
export interface ExtractedPaper extends ParsedPaper {
  passes: Pass[];
}

export interface Extractor {
  readonly subject: string;
  readonly paper: PaperMeta | null;
  readonly warnings: readonly Warning[];
  readonly passes: readonly Pass[];
  extract(): ExtractedPaper;
}
