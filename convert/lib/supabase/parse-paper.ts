/* =====================================================================
   The parse-paper Edge Function, and the figure upload that feeds it.

   Nothing is parsed in the browser: the .tex parser runs on the server so
   there is only one copy of it. Saving re-parses rather than posting back
   the preview JSON, so the database can only ever hold parser output.
   ===================================================================== */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/config/supabase";

import { supabase } from "./client";
import type { QuestionContent } from "./mappers";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-paper`;
const BUCKET = "question-images";

export type ParsedPaper = {
  paperId: string;
  subjectCode: string;
  paper: string;
  variant: string;
  session: string;
  year: string | number;
};

export type ParsedQuestion = QuestionContent & {
  number: number;
  topics: string[];
  marks: number;
};

export type ParseWarning = { code: string; message: string };

export type ParseResult = {
  paper: ParsedPaper | null;
  questions: ParsedQuestion[];
  warnings: ParseWarning[];
  questionCount?: number;
};

export type ParseRequest = {
  qpTex: string;
  qaTex?: string | null;
  images?: Record<string, string>;
  subject?: string;
  commit?: boolean;
};

/** Carries the admin's own token, never the anon key: the function checks
    is_admin() with it and writes as that user, so RLS authorises the insert. */
export async function parsePaper(body: ParseRequest): Promise<ParseResult> {
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

/** Figures go straight to storage, not through the function: it keeps the
    request body at tens of KB and the bucket enforces its own limits. */
export async function uploadFigures(
  paperId: string,
  files: Record<string, File>,
  names: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string>> {
  // Storage rejects "/" runs in a key segment, so the paper id is flattened
  // the same way the importer does it.
  const prefix = paperId
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  const urls: Record<string, string> = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    onProgress?.(i + 1, names.length);
    const path = `${prefix}/${name}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, files[name], { upsert: true, contentType: files[name].type || undefined });
    if (error) throw new Error(`Uploading ${name} failed: ${error.message}`);
    urls[name] = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  return urls;
}
