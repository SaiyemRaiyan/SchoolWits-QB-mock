import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables, TablesInsert } from "./types/database.js";

// This file mirrors the `DB` object exported by js/store.js (the old
// IndexedDB layer) function-for-function where it makes sense, so that
// swapping the frontend pages over later is mostly a case of pointing
// `DB.foo(...)` calls at this module instead. Two functions from the old
// API are deliberately NOT here: `isPurchased`/`markPurchased` stay on
// `localStorage` exactly as they are today — purchases/pricing are out of
// scope for this backend pass (see backend/CLAUDE.md).

export type Paper = Tables<"papers">;
export type Question = Tables<"questions">;
export type QuestionImage = Tables<"question_images">;
export type Module = Tables<"modules">;

export type MarkSchemeRow = { part: string; answer: string; marks: string };

// What upload.html has in hand right after parsing a Questions/Answers.tex
// pair (TexParse.mergeQuestionsAndAnswers output) — same shape as the old
// IndexedDB "merged question" object, minus the fields that are now
// paper-level (subject/paper/variant/session/year) or generated (uid).
export type ParsedQuestion = {
  id: number; // question number within the paper — becomes question_number
  topic: string;
  marks: string;
  ref: string;
  qText: string;
  qHTML: string;
  markScheme: MarkSchemeRow[];
  exemplarHTML: string;
  videoId: string;
};

export type PaperMeta = {
  subject: string;
  subjectCode?: string;
  paper: string;
  variant: string;
  session: string;
  year: string;
};

// Ported from js/store.js's `slug()` — must stay byte-for-byte identical to
// how papers.paper_key is generated in SQL (0001_papers.sql), since this is
// only used for *display* (paperLabel below); the actual paper_key value
// itself is computed by Postgres as a generated column, not by this code.
function slug(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Ported from js/store.js's `paperLabel()`. Kept in application code rather
// than as a second generated SQL column (see 0001_papers.sql comment) so
// this formatting rule — including the subjectCode-may-be-blank branch —
// only has to be gotten right in one place.
export function paperLabel(meta: PaperMeta): string {
  const yy = String(meta.year || "").slice(-2);
  const code = meta.subjectCode || slug(meta.subject).toUpperCase();
  return `${code}/${meta.paper}${meta.variant}/${meta.session}/${yy}`;
}

export class SchoolWitsDB {
  constructor(private readonly client: SupabaseClient<Database>) {}

  // ---- papers ----------------------------------------------------------

  async upsertPaper(meta: PaperMeta): Promise<Paper> {
    const row: TablesInsert<"papers"> = {
      subject: meta.subject,
      subject_code: meta.subjectCode ?? "",
      paper: meta.paper,
      variant: meta.variant,
      session: meta.session,
      year: meta.year,
      label: paperLabel(meta),
    };
    // paper_key is a generated column, so `onConflict` targets it without
    // us having to compute/pass it — Postgres recomputes and matches it.
    const { data, error } = await this.client
      .from("papers")
      .upsert(row, { onConflict: "paper_key" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getAllPapers(): Promise<Paper[]> {
    const { data, error } = await this.client.from("papers").select("*");
    if (error) throw error;
    return data;
  }

  // Deletes the paper row (cascades to questions, question_images,
  // module_questions via ON DELETE CASCADE) AND the paper's image files —
  // Storage objects are NOT covered by SQL cascade, so they're removed
  // explicitly here first, before the row (and its FK trail) disappears.
  async deletePaper(paperId: number): Promise<void> {
    const { data: list, error: listError } = await this.client.storage
      .from("question-images")
      .list(String(paperId));
    if (listError) throw listError;
    if (list && list.length) {
      // list() is not recursive; question images live one level deeper at
      // {paperId}/{questionId}/{filename}, so walk each question folder.
      const paths: string[] = [];
      for (const entry of list) {
        const sub = await this.client.storage
          .from("question-images")
          .list(`${paperId}/${entry.name}`);
        if (sub.error) throw sub.error;
        for (const file of sub.data ?? []) {
          paths.push(`${paperId}/${entry.name}/${file.name}`);
        }
      }
      if (paths.length) {
        const { error: removeError } = await this.client.storage
          .from("question-images")
          .remove(paths);
        if (removeError) throw removeError;
      }
    }

    const { error } = await this.client.from("papers").delete().eq("id", paperId);
    if (error) throw error;
  }

  // ---- questions ---------------------------------------------------------

  // Mirrors js/store.js's addQuestions(paperMeta, questions[]): upsert the
  // paper first, then upsert each question against it. Upsert (not insert)
  // on purpose — README.md documents "upload questions first, add answers
  // later, click Save again and it updates the same paper," which relies
  // on the (paper_id, question_number) unique constraint acting as an
  // update target rather than rejecting the second upload. (An earlier
  // version of this function used a plain insert and treated the resulting
  // constraint violation as an intentional duplicate-upload guard — that
  // was a mistake, it contradicted the app's documented behavior; fixed
  // here to match js/supabase/store.js's addQuestions, the browser-side
  // mirror of this same function actually used by upload.html.)
  async addQuestions(meta: PaperMeta, questions: ParsedQuestion[]): Promise<Question[]> {
    const paper = await this.upsertPaper(meta);
    const rows: TablesInsert<"questions">[] = questions.map((q) => ({
      paper_id: paper.id,
      question_number: q.id,
      topic: q.topic || "Uncategorised",
      marks: q.marks,
      ref: q.ref,
      q_text: q.qText,
      q_html: q.qHTML,
      mark_scheme: q.markScheme as unknown as Json,
      exemplar_html: q.exemplarHTML,
      video_id: q.videoId,
    }));
    const { data, error } = await this.client
      .from("questions")
      .upsert(rows, { onConflict: "paper_id,question_number" })
      .select();
    if (error) throw error;
    return data;
  }

  async getAllQuestions(): Promise<Question[]> {
    const { data, error } = await this.client.from("questions").select("*");
    if (error) throw error;
    return data;
  }

  async getQuestionsByPaperId(paperId: number): Promise<Question[]> {
    const { data, error } = await this.client
      .from("questions")
      .select("*")
      .eq("paper_id", paperId);
    if (error) throw error;
    return data;
  }

  async getQuestionsByIds(ids: number[]): Promise<Question[]> {
    if (!ids.length) return [];
    const { data, error } = await this.client.from("questions").select("*").in("id", ids);
    if (error) throw error;
    return data;
  }

  async updateQuestion(
    id: number,
    patch: Partial<TablesInsert<"questions">>
  ): Promise<Question> {
    const { data, error } = await this.client
      .from("questions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async setVideo(id: number, videoId: string): Promise<Question> {
    return this.updateQuestion(id, { video_id: videoId });
  }

  // Replaces DB.getFacets()'s in-memory Set-building over every paper and
  // question with small distinct queries. Not the most round-trip-efficient
  // possible version (5 separate queries) — left this way for readability;
  // worth collapsing into one SQL function/view later if it becomes a
  // measured hot path, not a speculative optimization now.
  async getFacets(): Promise<{
    subjects: string[];
    papers: string[];
    variants: string[];
    sessions: string[];
    years: string[];
    topics: string[];
    paperCount: number;
    questionCount: number;
  }> {
    const [papersRes, topicsRes, paperCountRes, questionCountRes] = await Promise.all([
      this.client.from("papers").select("subject, paper, variant, session, year"),
      this.client.from("questions").select("topic"),
      this.client.from("papers").select("id", { count: "exact", head: true }),
      this.client.from("questions").select("id", { count: "exact", head: true }),
    ]);
    if (papersRes.error) throw papersRes.error;
    if (topicsRes.error) throw topicsRes.error;
    if (paperCountRes.error) throw paperCountRes.error;
    if (questionCountRes.error) throw questionCountRes.error;

    const uniq = (values: (string | null)[]) =>
      Array.from(new Set(values.filter((v): v is string => !!v))).sort();

    return {
      subjects: uniq(papersRes.data.map((p) => p.subject)),
      papers: uniq(papersRes.data.map((p) => p.paper)),
      variants: uniq(papersRes.data.map((p) => p.variant)),
      sessions: uniq(papersRes.data.map((p) => p.session)),
      years: uniq(papersRes.data.map((p) => p.year)),
      topics: uniq(topicsRes.data.map((q) => q.topic)),
      paperCount: paperCountRes.count ?? 0,
      questionCount: questionCountRes.count ?? 0,
    };
  }

  // Replaces DB.search()'s in-memory linear scan. Filter fields join
  // through to `papers`; free-text uses the search_vector GIN index
  // (0002_questions.sql) instead of stripping HTML client-side.
  async search(filters: {
    subject?: string;
    paper?: string;
    variant?: string;
    session?: string;
    year?: string;
    topic?: string;
    text?: string;
  }): Promise<Question[]> {
    let query = this.client
      .from("questions")
      .select("*, papers!inner(subject, paper, variant, session, year)");

    if (filters.subject) query = query.eq("papers.subject", filters.subject);
    if (filters.paper) query = query.eq("papers.paper", filters.paper);
    if (filters.variant) query = query.eq("papers.variant", filters.variant);
    if (filters.session) query = query.eq("papers.session", filters.session);
    if (filters.year) query = query.eq("papers.year", filters.year);
    if (filters.topic) query = query.eq("topic", filters.topic);
    if (filters.text) query = query.textSearch("search_vector", filters.text);

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as Question[];
  }

  // ---- question images ---------------------------------------------------

  // Uploads a figure to the bucket and records it, returning the public
  // URL. Call this BEFORE TexParse.parse() and feed the returned URL into
  // the `images: {filename: url}` map — js/latex.js's resolveImageSrc()
  // already passes https:// URLs through unchanged, so the parser itself
  // needs no changes to consume bucket URLs instead of base64 data URLs.
  async uploadQuestionImage(
    paperId: number,
    questionId: number,
    filename: string,
    file: Blob | ArrayBuffer,
    caption = ""
  ): Promise<{ image: QuestionImage; publicUrl: string }> {
    const path = `${paperId}/${questionId}/${filename}`;
    const { error: uploadError } = await this.client.storage
      .from("question-images")
      .upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = this.client.storage.from("question-images").getPublicUrl(path);

    const { data, error } = await this.client
      .from("question_images")
      .upsert(
        { question_id: questionId, storage_path: path, filename, caption },
        { onConflict: "storage_path" }
      )
      .select()
      .single();
    if (error) throw error;

    return { image: data, publicUrl };
  }

  async getImagesForQuestion(questionId: number): Promise<QuestionImage[]> {
    const { data, error } = await this.client
      .from("question_images")
      .select("*")
      .eq("question_id", questionId)
      .order("sort_order");
    if (error) throw error;
    return data;
  }

  // ---- modules -------------------------------------------------------------

  async saveModule(mod: {
    id?: number;
    title: string;
    topic?: string;
    description?: string;
    premium: boolean;
    price: number;
    currency?: string;
    questionIds: number[];
  }): Promise<Module> {
    const row: TablesInsert<"modules"> = {
      title: mod.title,
      topic: mod.topic ?? "",
      description: mod.description ?? "",
      premium: mod.premium,
      price: mod.premium ? mod.price : 0,
      currency: mod.currency ?? "৳",
    };
    if (mod.id) (row as { id?: number }).id = mod.id;

    const { data: savedModule, error } = await this.client
      .from("modules")
      .upsert(row)
      .select()
      .single();
    if (error) throw error;

    // Replace the module's question set wholesale — mirrors the old
    // IndexedDB record's `questionUids` array being overwritten in full on
    // every save, rather than diffed.
    const del = await this.client
      .from("module_questions")
      .delete()
      .eq("module_id", savedModule.id);
    if (del.error) throw del.error;

    if (mod.questionIds.length) {
      const rows = mod.questionIds.map((question_id, i) => ({
        module_id: savedModule.id,
        question_id,
        sort_order: i,
      }));
      const ins = await this.client.from("module_questions").insert(rows);
      if (ins.error) throw ins.error;
    }

    return savedModule;
  }

  async getAllModules(): Promise<Module[]> {
    const { data, error } = await this.client.from("modules").select("*");
    if (error) throw error;
    return data;
  }

  async getModule(id: number): Promise<Module | null> {
    const { data, error } = await this.client
      .from("modules")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async deleteModule(id: number): Promise<void> {
    const { error } = await this.client.from("modules").delete().eq("id", id);
    if (error) throw error;
  }

  // isPurchased / markPurchased are intentionally NOT here — purchases stay
  // exactly as they are today, a `localStorage` flag in the frontend, with
  // no server-side record at all. See backend/CLAUDE.md.
}
