/**
 * update-question — admin editing of a single stored question, either in
 * the bank or as one module's own copy of it.
 *
 * All POST to this same endpoint:
 *
 *   { id }                        -> what is editable on the bank question
 *   { id, edits }                 -> edit the bank question
 *   { id, moduleId }              -> what is editable on that module's copy
 *   { id, moduleId, edits }       -> edit that module's copy only
 *   { id, moduleId, reset: true } -> drop the copy, back to the paper
 *
 * ## Module copies
 *
 * A module is a bundle of questions pulled from real papers, and an admin
 * wants to change their values ("10x + 7 = 2" -> "2x + 7 = 67") so students
 * practise the same shape of problem with different numbers -- without
 * touching the source paper or any other module.
 *
 * So the module branch reads `content_override ?? questions.content` and
 * writes back to module_questions.content_override. The first edit is
 * therefore a copy-on-write: no row is created, only a column filled. The
 * source question is never written on this path, and re-importing the paper
 * deliberately does not clear the copy -- see migration 0018.
 *
 * ## Built the way the archived functions were not
 *
 * `supabase/functions/_deleted/README.md` records three Edge Functions that
 * were removed because each held SUPABASE_SERVICE_ROLE_KEY, did no admin
 * check, and relied on verify_jwt -- which only proves the caller presented
 * a valid JWT, and the anon key is a valid JWT served publicly on every page
 * load. One of them was also called update-question. This one follows the
 * rule that README leaves behind: the caller's own client, an explicit
 * is_admin() call, and no service-role key in scope at all.
 *
 * ## Why it takes edits rather than content
 *
 * parse-paper re-parses the .tex on commit so the database can only hold
 * something the parser produced. Editing relaxes that, so the relaxation is
 * made as narrow as possible: the client never sends a content tree. It
 * sends { path, value } pairs, and src/edit/leaves.ts applies them to the
 * content already in the database, accepting a path only if that path
 * already resolves to an editable leaf. Structure cannot be created,
 * deleted or reshaped through this endpoint -- not because a check rejects
 * it, but because the request format cannot express it.
 *
 * ## Derived columns
 *
 * questions.search_vector is generated from q_text/topics/ref, NOT from
 * content. Writing content alone would leave an edited question findable
 * only by its old wording, so q_text is recomputed here in the same
 * statement. topics/marks/kind are recomputed too: they cannot currently
 * change (no leaf maps to them), but recomputing costs nothing and means
 * this stays correct if that ever stops being true.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { applyEdits, collectLeaves, EditError, flattenQuestion } from './vendor/edit.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) return json({ error: 'Missing Authorization header' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Acts as the caller, so auth.uid() inside is_admin() is their id and the
  // admin-only RLS policies on `questions` authorise the write.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: auth } },
  });

  const { data: isAdmin, error: adminError } = await asCaller.rpc('is_admin');
  if (adminError) return json({ error: `Admin check failed: ${adminError.message}` }, 500);
  if (!isAdmin) return json({ error: 'Admins only.' }, 403);

  let payload: { id?: unknown; moduleId?: unknown; edits?: unknown; reset?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, 400);
  }

  const id = Number(payload.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'A numeric question id is required.' }, 400);

  // moduleId switches this from editing the question in the bank to editing
  // ONE module's own copy of it. Absent means the bank.
  const hasModule = payload.moduleId !== undefined && payload.moduleId !== null;
  const moduleId = hasModule ? Number(payload.moduleId) : null;
  if (hasModule && (!Number.isInteger(moduleId) || (moduleId as number) <= 0)) {
    return json({ error: 'moduleId must be a positive integer.' }, 400);
  }

  // Read the source question first in every mode. In edit mode this is what
  // the edits are applied to -- the client's copy is never trusted as the
  // base, so a stale modal cannot resurrect text someone else just changed
  // in a field it did not touch.
  const { data: row, error: readError } = await asCaller
    .from('questions')
    .select('id, ref, content')
    .eq('id', id)
    .single();
  if (readError) return json({ error: `Question ${id} could not be read: ${readError.message}` }, 404);

  /* ------------------------------------------------ module-scoped editing */
  if (hasModule) {
    // The link must already exist. Without this an admin could attach an
    // override to a question that is not in the module at all, leaving a
    // row that nothing renders and nothing would ever clean up.
    const { data: link, error: linkError } = await asCaller
      .from('module_questions')
      .select('module_id, question_id, content_override')
      .eq('module_id', moduleId)
      .eq('question_id', id)
      .maybeSingle();
    if (linkError) return json({ error: `Module lookup failed: ${linkError.message}` }, 500);
    if (!link) {
      return json({ error: `Question ${id} is not in module ${moduleId}.` }, 404);
    }

    // The module's copy if it has one, otherwise the paper's version. This
    // is what makes the first edit a copy-on-write: there is no override row
    // to create, only a column to fill.
    const base = link.content_override ?? row.content;

    if (payload.reset === true) {
      const { error: resetError } = await asCaller
        .from('module_questions')
        .update({ content_override: null })
        .eq('module_id', moduleId)
        .eq('question_id', id);
      if (resetError) return json({ error: `Reset failed: ${resetError.message}` }, 500);
      return json({
        id: row.id,
        ref: row.ref,
        moduleId,
        edited: false,
        saved: true,
        content: row.content,
        leaves: collectLeaves(row.content),
      });
    }

    if (payload.edits === undefined) {
      return json({
        id: row.id,
        ref: row.ref,
        moduleId,
        edited: link.content_override !== null,
        leaves: collectLeaves(base),
      });
    }

    let moduleUpdated: unknown;
    let moduleApplied: number;
    try {
      ({ content: moduleUpdated, applied: moduleApplied } = applyEdits(base, payload.edits));
    } catch (err) {
      if (err instanceof EditError) return json({ error: err.message }, 422);
      throw err;
    }

    if (moduleApplied === 0) {
      return json({
        id: row.id,
        ref: row.ref,
        moduleId,
        applied: 0,
        saved: false,
        edited: link.content_override !== null,
        content: base,
        leaves: collectLeaves(base),
      });
    }

    // No q_text / topics / marks recompute here, unlike the bank path:
    // search_vector is generated from columns on `questions`, which this
    // branch never writes. A module's copy is not separately searchable and
    // does not need to be -- modules are browsed as bundles, not searched.
    const { error: overrideError } = await asCaller
      .from('module_questions')
      .update({ content_override: moduleUpdated })
      .eq('module_id', moduleId)
      .eq('question_id', id);
    if (overrideError) return json({ error: `Saving failed: ${overrideError.message}` }, 500);

    return json({
      id: row.id,
      ref: row.ref,
      moduleId,
      applied: moduleApplied,
      saved: true,
      edited: true,
      content: moduleUpdated,
      leaves: collectLeaves(moduleUpdated),
    });
  }

  /* -------------------------------------------------- the question in the bank */
  if (payload.reset === true) {
    return json({ error: 'reset only applies to a module copy — pass moduleId.' }, 400);
  }

  if (payload.edits === undefined) {
    return json({ id: row.id, ref: row.ref, leaves: collectLeaves(row.content) });
  }

  let updated: unknown;
  let applied: number;
  try {
    ({ content: updated, applied } = applyEdits(row.content, payload.edits));
  } catch (err) {
    if (err instanceof EditError) return json({ error: err.message }, 422);
    throw err;
  }

  if (applied === 0) {
    return json({ id: row.id, ref: row.ref, applied: 0, saved: false, leaves: collectLeaves(row.content) });
  }

  const c = updated as Record<string, any>;
  const { error: writeError } = await asCaller
    .from('questions')
    .update({
      content: updated,
      q_text: flattenQuestion(c),
      marks: c.marks,
      topics: c.topics,
      kind: c.kind,
    })
    .eq('id', id);
  if (writeError) return json({ error: `Saving failed: ${writeError.message}` }, 500);

  return json({
    id: row.id,
    ref: row.ref,
    applied,
    saved: true,
    content: updated,
    leaves: collectLeaves(updated),
  });
});
