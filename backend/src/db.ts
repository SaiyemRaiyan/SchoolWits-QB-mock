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
export type PaperImage = Tables<"paper_images">;
export type Module = Tables<"modules">;

// The row shape written per question. `content` is the whole parsed
// Question object from backend/src/latex/types.ts — see 0011 for why it is
// one jsonb column rather than several. The scalar columns beside it exist
// only because they are filtered or searched on, which jsonb cannot index
// usefully here.
export type QuestionRow = {
  questionNumber: number;
  kind: "structured" | "mcq";
  topics: string[];
  marks: number;
  ref: string;
  /** Flattened plain text, feeds questions.search_vector. */
  qText: string;
  content: Json;
  videoId?: string;
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

/**
 * Make a string safe as a Supabase Storage object key.
 *
 * Storage accepts a limited character set — notably not "|", which
 * papers.paper_key uses as its delimiter. Dots are kept when `keepDots` is
 * set so filenames retain their extension (the bucket's MIME check and the
 * parser's \qfig lookup both care about it).
 */
function storageSafe(value: string, keepDots = false): string {
  const allowed = keepDots ? /[^a-zA-Z0-9._-]+/g : /[^a-zA-Z0-9_-]+/g;
  return String(value || "")
    .trim()
    .replace(allowed, "-")
    .replace(/-{2,}/g, "-")
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

  // Deletes the paper row (cascades to questions, paper_images,
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
  async addQuestions(meta: PaperMeta, questions: QuestionRow[]): Promise<Question[]> {
    const paper = await this.upsertPaper(meta);
    const rows: TablesInsert<"questions">[] = questions.map((q) => ({
      paper_id: paper.id,
      question_number: q.questionNumber,
      kind: q.kind,
      // An empty array is meaningful (a question with no topic), so it is
      // stored as-is rather than substituting "Uncategorised" the way the
      // single-topic column used to.
      topics: q.topics,
      marks: q.marks,
      ref: q.ref,
      q_text: q.qText,
      content: q.content,
      video_id: q.videoId ?? "",
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
      this.client.from("questions").select("topics"),
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
      // topics is an array per question now, so the facet list is the union
      // across all of them rather than one value each.
      topics: uniq(topicsRes.data.flatMap((q) => q.topics ?? [])),
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
    // `contains` on the text[] uses the GIN index from 0011; a question
    // matches if the chosen topic is one of its several topics.
    if (filters.topic) query = query.contains("topics", [filters.topic]);
    if (filters.text) query = query.textSearch("search_vector", filters.text);

    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as Question[];
  }

  // ---- question images ---------------------------------------------------

  // Uploads a figure to the bucket and records it, returning the public URL.
  //
  // Call this BEFORE parsing, once per figure, and collect the results into
  // the `{ filename: url }` ImageMap that parseQuestionPaper() takes. The
  // parser resolves \qfig{fig1.png} against that map and writes the URL
  // into the figure block's `src`, so the rendered content carries real
  // bucket URLs rather than base64.
  //
  // Keyed by paper, not question: at upload time the questions do not exist
  // yet (they are the output of the parse this feeds), and figures are
  // referenced by bare filename within a paper. See 0012.
  async uploadPaperImage(
    paperId: number,
    paperKey: string,
    filename: string,
    file: Blob | ArrayBuffer,
    contentType = ""
  ): Promise<{ image: PaperImage; publicUrl: string }> {
    // papers.paper_key is pipe-delimited ("physics|2|1|m-j|2025") because it
    // is a natural key, not a path. Storage rejects "|" in object keys, so
    // it is flattened here rather than at each call site.
    const path = `${storageSafe(paperKey)}/${storageSafe(filename, true)}`;
    const { error: uploadError } = await this.client.storage
      .from("question-images")
      .upload(path, file, { upsert: true, contentType: contentType || undefined });
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = this.client.storage.from("question-images").getPublicUrl(path);

    const byteSize =
      file instanceof ArrayBuffer ? file.byteLength : (file as Blob).size ?? 0;

    const { data, error } = await this.client
      .from("paper_images")
      .upsert(
        {
          paper_id: paperId,
          filename,
          storage_path: path,
          public_url: publicUrl,
          byte_size: byteSize,
          content_type: contentType,
        },
        { onConflict: "storage_path" }
      )
      .select()
      .single();
    if (error) throw error;

    return { image: data, publicUrl };
  }

  async getImagesForPaper(paperId: number): Promise<PaperImage[]> {
    const { data, error } = await this.client
      .from("paper_images")
      .select("*")
      .eq("paper_id", paperId)
      .order("filename");
    if (error) throw error;
    return data;
  }

  /** The `{ filename: url }` map the parser takes, for a paper already uploaded. */
  async getImageMapForPaper(paperId: number): Promise<Record<string, string>> {
    const images = await this.getImagesForPaper(paperId);
    return Object.fromEntries(images.map((img) => [img.filename, img.public_url]));
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
