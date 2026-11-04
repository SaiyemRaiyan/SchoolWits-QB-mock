import { check, supabase } from "./client";
import {
  moduleRowToRecord,
  questionRowToRecord,
  type Module,
  type Question,
  type QuestionContent,
} from "./mappers";

/* Without generated database types, supabase-js widens an embedded to-one
   relation to an array. These are the real row shapes PostgREST returns. */
type UidLink = {
  module_id: number;
  sort_order: number;
  questions: { question_number: number; papers: { paper_key: string } };
};
type ContentLink = {
  sort_order: number;
  content_override: QuestionContent | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  questions: any;
};

export type ModuleQuestion = Question & {
  /** True when this module holds its own edited copy of the question. */
  hasOverride: boolean;
  sortOrder: number;
};

export async function getAllModules(): Promise<Module[]> {
  const { data: mods, error } = await supabase.from("modules").select("*");
  check(error);
  if (!mods?.length) return [];

  const { data: links, error: linkError } = await supabase
    .from("module_questions")
    .select("module_id, sort_order, questions(question_number, papers(paper_key))")
    .order("sort_order");
  check(linkError);

  const byModule = new Map<number, string[]>();
  ((links ?? []) as unknown as UidLink[]).forEach((l) => {
    const uid = `${l.questions.papers.paper_key}::${l.questions.question_number}`;
    byModule.set(l.module_id, [...(byModule.get(l.module_id) ?? []), uid]);
  });

  return mods.map((m) => moduleRowToRecord(m, byModule.get(m.id) || []));
}

export async function getModule(id: number | string): Promise<Module | null> {
  const { data: m, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", Number(id))
    .maybeSingle();
  check(error);
  if (!m) return null;

  const { data: links, error: linkError } = await supabase
    .from("module_questions")
    .select("sort_order, questions(question_number, papers(paper_key))")
    .eq("module_id", m.id)
    .order("sort_order");
  check(linkError);

  const uids = ((links ?? []) as unknown as UidLink[]).map(
    (l) => `${l.questions.papers.paper_key}::${l.questions.question_number}`,
  );
  return moduleRowToRecord(m, uids);
}

/**
 * A module's questions, in module order, with its own edited copies applied.
 * `content_override` is merged into `.content` here so nothing above this
 * file needs to know overrides exist.
 */
export async function getModuleQuestions(moduleId: number | string): Promise<ModuleQuestion[]> {
  const { data, error } = await supabase
    .from("module_questions")
    .select("sort_order, content_override, questions(*, papers(*))")
    .eq("module_id", Number(moduleId))
    .order("sort_order");
  check(error);

  return ((data ?? []) as unknown as ContentLink[])
    .filter((link) => link.questions)
    .map((link) => ({
      ...questionRowToRecord(link.questions, link.questions.papers),
      content: link.content_override || link.questions.content,
      hasOverride: link.content_override != null,
      sortOrder: link.sort_order,
    }));
}

export type SaveModuleInput = {
  id?: number | null;
  title: string;
  subject: string;
  topics: string[];
  description: string;
  premium: boolean;
  price: number;
  currency?: string;
  questionUids: string[];
};

export async function saveModule(mod: SaveModuleInput): Promise<number> {
  const row = {
    title: mod.title,
    subject: mod.subject || "",
    // Deduped here rather than trusted: the builder derives this from the
    // picked questions, where the same topic recurs on question after question.
    topics: Array.from(new Set(mod.topics.map((t) => t.trim()).filter(Boolean))),
    description: mod.description || "",
    premium: mod.premium,
    price: mod.premium ? Number(mod.price) || 0 : 0,
    currency: mod.currency || "৳",
  };

  const ordered = await resolveUids(mod.questionUids);
  const keptIds = ordered.map((q) => q.pk);

  // INSERT for a new module, UPDATE for an existing one, deliberately not an
  // upsert: modules.id is `generated always as identity` and PostgREST's
  // upsert puts the id in the INSERT column list, which Postgres rejects.
  let savedId: number;
  if (mod.id) {
    const { data, error } = await supabase
      .from("modules")
      .update(row)
      .eq("id", Number(mod.id))
      .select()
      .single();
    check(error);
    savedId = data.id;
  } else {
    const { data, error } = await supabase.from("modules").insert(row).select().single();
    check(error);
    savedId = data.id;
  }

  // Upsert then prune, never delete then re-insert: a module's edited copy of
  // a question lives on this row, and a wholesale replace would destroy it.
  if (ordered.length) {
    const links = ordered.map((q, i) => ({ module_id: savedId, question_id: q.pk, sort_order: i }));
    const up = await supabase
      .from("module_questions")
      .upsert(links, { onConflict: "module_id,question_id" });
    check(up.error);
  }

  let prune = supabase.from("module_questions").delete().eq("module_id", savedId);
  if (keptIds.length) prune = prune.not("question_id", "in", `(${keptIds.join(",")})`);
  check((await prune).error);

  return savedId;
}

/**
 * Refuse to save on an incomplete read. A uid that failed to resolve looks
 * exactly like one the admin removed, so pruning on a partial read would
 * silently delete live links and the edits hanging off them.
 */
async function resolveUids(uids: string[]): Promise<Question[]> {
  if (!uids.length) return [];

  const { data, error } = await supabase.from("questions").select("*, papers(*)");
  check(error);
  const byUid = new Map(
    (data || []).map((row) => {
      const record = questionRowToRecord(row, row.papers);
      return [record.uid, record];
    }),
  );

  const ordered = uids.map((u) => byUid.get(u)).filter(Boolean) as Question[];
  if (ordered.length !== uids.length) {
    const missing = uids.filter((u) => !byUid.has(u));
    throw new Error(
      `Refusing to save: ${missing.length} of ${uids.length} questions could not be read back. ` +
        `Saving now would remove them from the module along with any edits made for it. ` +
        `Reload the page and try again.`,
    );
  }
  return ordered;
}

/**
 * Link one question without disturbing the rest of the pack. An edited copy
 * is keyed on (module_id, question_id), so a newly ticked question needs a
 * row before an override can hang off it.
 */
export async function addModuleQuestion(moduleId: number, questionPk: number, sortOrder: number) {
  const { error } = await supabase
    .from("module_questions")
    .upsert(
      { module_id: moduleId, question_id: questionPk, sort_order: sortOrder || 0 },
      { onConflict: "module_id,question_id", ignoreDuplicates: true },
    );
  check(error);
}

export async function deleteModule(id: number) {
  const { error } = await supabase.from("modules").delete().eq("id", Number(id));
  check(error);
}

/* Purchases are a local-only mock until a real payment provider is wired in. */
export function isPurchased(moduleId: number): boolean {
  try {
    return localStorage.getItem(`sw_purchase_${moduleId}`) === "1";
  } catch {
    return false;
  }
}

export function markPurchased(moduleId: number) {
  try {
    localStorage.setItem(`sw_purchase_${moduleId}`, "1");
  } catch {
    // A blocked localStorage just means the unlock does not persist.
  }
}
