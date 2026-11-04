# CLAUDE.md

Guidance for working in this repo. See `README.md` first for the product
description (routes, the `.tex` format, how to run it).

## Two projects in one repo

- **The app** at the repo root: Next.js App Router, TypeScript, Tailwind v4,
  shadcn (base-nova preset, so the primitives are **Base UI**, not Radix —
  `render` props rather than `asChild`, and `Menu.GroupLabel` must sit inside
  a `Menu.Group`). Builds as `output: "export"`, so **no route may depend on
  a server at request time**. Data loads client-side.
- **`backend/`** — its own npm project: Postgres schema and migrations, the
  `.tex` parser, the Edge Functions, and ops scripts. It has its own
  `package.json`, `tsconfig`, and test suite. Read `backend/CLAUDE.md` before
  touching anything in it.

They are excluded from each other's tooling (`tsconfig.json` and
`eslint.config.mjs` at the root ignore `backend/`), with one deliberate
exception: `backend/tests/render/` imports `lib/render/` so the parser and
the renderer are tested against each other.

## Working conventions

- **Parser and renderer are one pipeline cut in half, not two copies.**
  `backend/src/latex/` knows LaTeX and emits only inline formatting tags;
  `lib/render/` knows CSS classes and emits only structure. They share no
  code and meet at the JSON contract in `lib/render/types.ts`. Parsing LaTeX
  in `lib/render/`, or hardcoding a CSS class in `backend/src/latex/`, is the
  mistake.
- **`lib/render/` has no imports outside itself.** That is what lets the
  backend's test suite pull it in without dragging the app along. Keep it
  that way.
- **The parser never runs in the browser.** Upload POSTs the `.tex` to the
  `parse-paper` Edge Function, and committing re-parses server-side rather
  than posting back the preview JSON, so the database can only ever hold
  parser output.
- **Question editing posts `{path, value}` edits, never a content tree.** The
  `update-question` function returns the leaf list and validates against it,
  so the client never decides what is editable. See `backend/src/edit/leaves.ts`.
- **RLS is the security boundary.** Every UI gate (`useAuth().admin`,
  `AdminGate`) is presentation. Writes carry the signed-in admin's own token,
  never the anon key.
- `backend/src/latex/` must stay **dependency-free with no `node:` imports**,
  so the same files run inside a Deno Edge Function.

## Styling

- School Wits colours live in `app/globals.css` as `--sw-*`, with the shadcn
  semantic tokens defined in terms of them. Change the token, not the
  component, when a colour is wrong in several places at once.
- `styles/question-content.css` styles the HTML `lib/render/` emits. Tailwind
  cannot reach inside `dangerouslySetInnerHTML`, so that file is the only way
  to style a question body.
- `styles/landing.css` is the landing page's own stylesheet, carried over from
  the static site. It must not style `<body>` or anything outside `.landing-*`:
  page CSS stays in the document after a client-side navigation and will leak.

## Checks

```bash
npm run lint && npx tsc --noEmit && npm run build   # the app
cd backend && npm run typecheck && npm test          # the parser, 196 tests
```
