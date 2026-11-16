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
  | {
      type: "figure";
      file?: string;
      caption?: string;
      src?: string;
      /** Set when the figure is a region of the source PDF; `file` names the crop. */
      clip?: FigureClip;
    }
  | { type: "table"; html?: string };

/** Trim in bp from each edge of a 1-based page. See backend/src/latex/clip.ts. */
export type FigureClip = { page: number; left: number; bottom: number; right: number; top: number };

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
