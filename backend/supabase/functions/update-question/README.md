# `update-question`

Admin editing of one already-imported question. Deployed to
`https://<project>.supabase.co/functions/v1/update-question`.

Called by `js/edit/edit-modal.js` through `DB.getQuestionLeaves()` /
`DB.saveQuestionEdits()` in `js/supabase/store.js`.

## Operations, one endpoint

```
POST { id }                        -> { id, ref, leaves }
POST { id, edits: [...] }          -> { id, ref, applied, saved, content, leaves }
POST { id, moduleId }              -> { ..., moduleId, edited }
POST { id, moduleId, edits: [...] }-> { ..., moduleId, edited, applied, saved }
POST { id, moduleId, reset: true } -> { ..., edited: false }
```

A `leaf` is `{ path, label, kind, value }` — one editable string, where
`path` locates it inside `content` (`['parts',2,'content',0,'html']`).

## Module copies

Without `moduleId` this edits the question in the bank. With one, it edits
**that module's own copy** — an admin changing values ("10x + 7 = 2" ->
"2x + 7 = 67") so students practise the same shape of problem with different
numbers, without touching the source paper or any other module.

| | base content read | written to |
|---|---|---|
| no `moduleId` | `questions.content` | `questions` (+ `q_text` recompute) |
| `moduleId` | `content_override ?? questions.content` | `module_questions.content_override` |

Three things follow from that:

- **The first edit is copy-on-write.** There is no override row to create,
  only a column to fill (migration 0018), so nothing has to be prepared
  before an admin edits a question for the first time.
- **The module link must already exist**, and is checked. Otherwise an
  override could be attached to a question that is not in the module, and
  nothing would ever render or clean up that row.
- **No `q_text`/`topics`/`marks` recompute on this path.** Those columns and
  `search_vector` live on `questions`, which this branch never writes. A
  module copy is not separately searchable and does not need to be — modules
  are browsed as bundles, not searched.

`reset: true` clears the copy so the module renders the paper's version
again. It is rejected without a `moduleId`, because there is nothing to
reset on the bank question.

### Editing during creation

An override needs a `module_id`, but that is not a reason to make an admin
finish the pack first. `js/modules.js` calls `moduleIdForEditing()` on the
Edit button: if the pack has never been saved it saves it there and then
(and ticks the question, since editing a question for a pack means it is in
the pack), and the edit proceeds. Saving again updates that module rather
than creating another, because `persistModule()` passes the id.

So the ordering constraint is satisfied by creating the row at the moment it
is first needed, not by imposing a workflow.

### `saveModule` must never touch the override

`saveModule` in both `js/supabase/store.js` and `backend/src/db.ts` used to
**delete every `module_questions` row and re-insert them**. With 0018 that
would destroy every edited copy the moment a pack was re-saved, so both are
now upsert-then-prune: the upserted row object never mentions
`content_override`, so only this endpoint can change it.

## Why it takes edits and not `content`

`parse-paper` re-parses the `.tex` on commit, so the database can only ever
hold `content` the parser produced. A client cannot post a handcrafted
question.

Editing has to relax that, so the relaxation is made as narrow as it can
be: **the client never sends a content tree.** It sends `{ path, value }`
pairs. The function reads the current `content` from the database, and
`src/edit/leaves.ts` applies each edit only if that exact path already
resolves to an editable leaf *in the stored document*.

The consequence is structural, not procedural: adding a part, deleting a
mark-scheme row, changing `kind`, or pointing a figure at another URL are
not rejected by a check someone could forget to write — they cannot be
expressed in the request format at all.

## What is not editable, and why

| Field | Why |
|---|---|
| `marks` (question, part, mark-scheme row) | Part marks must sum to the question total and the parser warns when they do not (`marks-mismatch`). Editing one number in isolation breaks that silently. Fix the `.tex` and re-upload. |
| `kind`, `topics`, `number`, `ref` | Filters and mark-scheme keying are built on these. |
| `figure.src` / `file` | Points at a Storage object tracked in `paper_images`. |
| `table` blocks | Pre-rendered HTML with structure inside it, not a sentence. |

Everything else — stem and part text, figure captions, MCQ option text,
mark-scheme answers, codes and guidance, worked-solution headings and
bodies — is editable.

## Derived columns

`questions.search_vector` is generated from `q_text`/`topics`/`ref`, **not**
from `content`. Writing `content` alone leaves an edited question findable
only by its old wording, so `q_text` is recomputed on every save with the
shared `flattenQuestion` from `src/latex/flatten.ts`. `topics`/`marks`/
`kind` are recomputed too — they cannot currently change, but that costs
nothing and stays correct if it ever stops being true.

## Authorisation

Caller's own client, explicit `is_admin()`, **no service-role key in scope**.

This matters here specifically. `../_deleted/README.md` records three Edge
Functions removed in August 2026 because each held the service-role key, did
no admin check, and relied on `verify_jwt` — which only proves the caller
presented a valid JWT, and the anon key is a valid JWT served publicly in
`js/supabase/config.js` on every page load. One of those three was also
called `update-question`. This one is built the way that README says its
replacement should be.

Verified against the deployment: an anon-key caller gets `403 Admins only.`
for every operation including the module ones (read, edit, reset), and a
request with no `Authorization` header gets `401`.

## Re-upload wins

Re-importing a paper upserts on `(paper_id, question_number)`, which
overwrites `content`. Edits to the **bank** question do not survive that —
deliberately. The `.tex` stays the source format; this endpoint fixes what
is already in the bank.

**Module copies are the exception**: a re-import does not clear
`content_override`, so once a question is edited for a module that copy is
independent of the paper for good. Removing the question from the module
does discard it, since the row goes with it.

## Deploying

```
npm run deploy:edit-function     # bundles src/edit/ then deploys
```

`vendor/edit.js` is generated — edit `src/edit/`, never that file.
