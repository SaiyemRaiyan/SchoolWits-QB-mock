/* =====================================================================
   The JSON contract between the parser and the renderer.

   backend/src/latex/ emits this shape; lib/render/ turns it into HTML.
   It lives here rather than with the Supabase row mappers so the renderer
   has no dependency on the data layer, which is what lets backend's test
   suite import it without dragging the whole app in.
   ===================================================================== */

/** The parser's output shape. See backend/src/latex/types.ts. */
export type QuestionContent = {
  number?: number;
  topic?: string;
  marks?: number;
  kind?: string;
  stem?: ContentBlock[];
  options?: { source?: string; items?: { label: string; content: string }[] } | null;
  parts?: QuestionPart[];
  answer?: {
    correct?: string | null;
    markScheme?: MarkSchemeRow[];
    workedSolution?: SolutionSegment[];
  } | null;
};

export type ContentBlock =
  | { type: "text"; html?: string }
  | { type: "figure"; file?: string; caption?: string; src?: string }
  | { type: "table"; html?: string };

export type QuestionPart = {
  label: string;
  marks: number | null;
  content?: ContentBlock[];
  subparts?: QuestionPart[];
};

export type MarkSchemeRow = {
  ref?: string;
  answer?: string;
  code?: string;
  marks?: number | string | null;
  guidance?: string;
  alternatives?: string[];
  banner?: boolean;
};

export type SolutionSegment = { ref?: string | null; heading?: string; html?: string };
