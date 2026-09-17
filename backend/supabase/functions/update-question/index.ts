/**
 * update-question — admin editing of a single stored question.
 *
 * Two operations, both POST to this same endpoint:
 *
 *   { id }          -> { leaves }   what is editable on that question
 *   { id, edits }   -> { saved }    apply those edits and write the row
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

  let payload: { id?: unknown; edits?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Body must be JSON.' }, 400);
  }

  const id = Number(payload.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'A numeric question id is required.' }, 400);

  // Read the current content first in BOTH modes. In edit mode this is what
  // the edits are applied to -- the client's copy is never trusted as the
  // base, so a stale modal cannot resurrect text someone else just changed
  // in a field it did not touch.
  const { data: row, error: readError } = await asCaller
    .from('questions')
    .select('id, ref, content')
    .eq('id', id)
    .single();
  if (readError) return json({ error: `Question ${id} could not be read: ${readError.message}` }, 404);

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
