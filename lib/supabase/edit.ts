/* =====================================================================
   Question editing, through the update-question Edge Function.

   Never a table write from here. The function recomputes q_text (which
   search_vector is generated from, not content), and it applies edits to
   the content already in the database rather than trusting a tree from the
   browser, so what is stored keeps the shape the parser produced.

   Which fields are editable is the function's answer too: it returns the
   leaf list. A second opinion in this file would drift from it.
   ===================================================================== */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase";

import { supabase } from "./client";
import { questionRowToRecord, type Question, type QuestionContent } from "./mappers";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/update-question`;
const BUCKET = "question-images";

export type LeafKind =
  | "text"
  | "caption"
  | "image"
  | "markscheme"
  | "code"
  | "guidance"
  | "solution"
  | "heading"
  | "option";

export type Leaf = {
  /** Where the value lives in `content`, e.g. ['parts',2,'content',0,'html']. */
  path: (string | number)[];
  /** "1(c)(ii) · body" — the part before the separator groups the field. */
  label: string;
  kind: LeafKind;
  value: string;
};

export type EditResponse = {
  id: number;
  ref: string | null;
  moduleId?: number;
  leaves: Leaf[];
  content?: QuestionContent;
  applied?: number;
  saved?: boolean;
  /** True when this module holds its own copy of the question. */
  edited?: boolean;
};

async function callEditFunction(body: Record<string, unknown>): Promise<EditResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session expired. Sign in again.");

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Server returned ${res.status} with no JSON body.`);
  }
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status}).`);
  return payload;
}

/** With a moduleId this describes that module's own copy, falling back to
    the bank's version when the module has not edited it yet. */
export function getQuestionLeaves(id: number, moduleId?: number | null) {
  return callEditFunction(moduleId != null ? { id, moduleId } : { id });
}

export function saveQuestionEdits(
  id: number,
  edits: { path: (string | number)[]; value: string }[],
  moduleId?: number | null,
) {
  return callEditFunction(moduleId != null ? { id, edits, moduleId } : { id, edits });
}

/** Drop a module's edited copy, so it renders the paper's version again. */
export function resetQuestionOverride(moduleId: number, id: number) {
  return callEditFunction({ id, moduleId, reset: true });
}

/**
 * Both video columns are written on every call. The database gives
 * video_url precedence rather than enforcing exclusivity, so writing only
 * the chosen one would leave the other behind, invisible until the first
 * was cleared and a forgotten video came back.
 */
export async function setVideoSource(
  uid: string,
  { videoId = "", videoUrl = "" }: { videoId?: string; videoUrl?: string },
): Promise<Question> {
  const idx = uid.lastIndexOf("::");
  const paperKey = uid.slice(0, idx);
  const questionNumber = Number(uid.slice(idx + 2));

  const { data: paperRow, error: paperError } = await supabase
    .from("papers")
    .select("id")
    .eq("paper_key", paperKey)
    .single();
  if (paperError) throw new Error(paperError.message);

  const { data, error } = await supabase
    .from("questions")
    .update({ video_id: videoId || null, video_url: videoUrl || null })
    .eq("paper_id", paperRow.id)
    .eq("question_number", questionNumber)
    .select("*, papers(*)")
    .single();
  if (error) throw new Error(error.message);
  return questionRowToRecord(data, data.papers);
}

export async function uploadQuestionFigure(questionId: number, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
    throw new Error("Choose a PNG, JPG, GIF, or WEBP image.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `question-edits/${questionId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(`Uploading the figure failed: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Any YouTube URL shape, or a bare id. The column's check constraint
    accepts nothing but the 11-character id. */
export function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  );
  if (m) return m[1];
  return /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}
