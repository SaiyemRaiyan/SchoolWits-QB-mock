/* =====================================================================
   Postgres columns are snake_case; everything above this folder speaks
   camelCase. These functions are the only place that knows both, so a
   column rename stays a one-file change.
   ===================================================================== */

export type Paper = {
  /** The real Postgres id. */
  pk: number;
  subject: string;
  subjectCode: string;
  paper: string;
  variant: string;
  session: string;
  year: number;
  paperKey: string;
  label: string;
  createdAt: number;
};

type PaperRow = {
  id: number;
  subject: string;
  subject_code: string | null;
  paper: string;
  variant: string;
  session: string;
  year: number;
  paper_key: string;
  label: string;
  created_at: string | null;
};

export function paperRowToRecord(row: PaperRow): Paper {
  return {
    pk: row.id,
    subject: row.subject,
    subjectCode: row.subject_code || "",
    paper: row.paper,
    variant: row.variant,
    session: row.session,
    year: row.year,
    paperKey: row.paper_key,
    label: row.label,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export type Question = {
  /** Postgres primary key. Not the same as `id`. */
  pk: number;
  uid: string;
  paperKey: string;
  subject: string;
  subjectCode: string;
  paper: string;
  variant: string;
  session: string;
  year: number;
  /** Per-paper question number, which is not unique across the bank. */
  id: number;
  kind: string;
  topics: string[];
  /** The topics joined for display; `topics` is the list to match on. */
  topic: string;
  marks: number | null;
  ref: string | null;
  qText: string | null;
  /** The parsed question object. Rendered by lib/render at display time. */
  content: QuestionContent | null;
  videoId: string | null;
  videoUrl: string;
  createdAt: number;
};

export function questionRowToRecord(row: QuestionRow, paperRow?: PaperRow): Question {
  const p = paperRow || row.papers!;
  const topics = row.topics || [];
  return {
    pk: row.id,
    uid: `${p.paper_key}::${row.question_number}`,
    paperKey: p.paper_key,
    subject: p.subject,
    subjectCode: p.subject_code || "",
    paper: p.paper,
    variant: p.variant,
    session: p.session,
    year: p.year,
    id: row.question_number,
    kind: row.kind || "structured",
    topics,
    topic: topics.join(" · "),
    marks: row.marks,
    ref: row.ref,
    qText: row.q_text,
    content: row.content || null,
    videoId: row.video_id,
    // video_url wins over video_id when both are set (migration 0019).
    videoUrl: row.video_url || "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

type QuestionRow = {
  id: number;
  question_number: number;
  kind: string | null;
  topics: string[] | null;
  marks: number | null;
  ref: string | null;
  q_text: string | null;
  content: QuestionContent | null;
  video_id: string | null;
  video_url: string | null;
  created_at: string | null;
  papers?: PaperRow;
};

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

export type Module = {
  id: number;
  title: string;
  subject: string;
  topics: string[];
  /** The display string every card shows, derived rather than stored. */
  topicLabel: string;
  description: string;
  premium: boolean;
  price: number;
  currency: string;
  questionUids: string[];
  createdAt: number;
};

export function moduleRowToRecord(
  row: {
    id: number;
    title: string;
    subject: string | null;
    topics: string[] | null;
    description: string | null;
    premium: boolean;
    price: number | string | null;
    currency: string | null;
    created_at: string | null;
  },
  questionUids: string[] = [],
): Module {
  const topics = row.topics || [];
  return {
    id: row.id,
    title: row.title,
    subject: row.subject || "",
    topics,
    topicLabel: topics.length ? topics.join(" · ") : "Mixed topics",
    description: row.description || "",
    premium: row.premium,
    price: Number(row.price) || 0,
    currency: row.currency || "৳",
    questionUids,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}
