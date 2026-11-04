# School Wits — Cambridge Question Bank

A searchable bank of Cambridge O Level and IGCSE past-paper questions, with
mark schemes and worked solutions. Papers are uploaded as LaTeX and parsed
into structured JSON; nothing on screen is hand-written content.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

The app talks to a hosted Supabase project. The publishable key is committed
in `config/supabase.ts` on purpose — it can only do what RLS allows, which is
public read and admin-authenticated write. **No environment variables are
needed to run or deploy.**

## Pages

| Route | What it does |
| --- | --- |
| `/` | Gateway. Pick subject, curriculum and optionally a topic, then jump into the bank. |
| `/browse` | The bank. Filter by qualification, subject, paper, variant, session, year and topic, or search full text. Shows a question with its mark scheme, worked solution and video, or the whole paper end to end. |
| `/modules` | Topic packs. The storefront is public; the builder is admin-only, and can edit a question's values for one module without touching the paper. |
| `/upload` | Admin-only. Upload a Questions `.tex` and an Answers `.tex` plus figures, preview what the parser produced, then commit. |

Admins are rows in `admin_users` (see `backend/`). Signing in is Google OAuth
through Supabase. Every UI gate is presentation only — RLS refuses the write
regardless.

## The `.tex` format

Papers are written against the templates in `templates/`, which are served
from the Upload page too. The parser accepts that documented format, not
arbitrary LaTeX; `templates/README.md` is the spec, including the conventions
that are easy to get wrong (how mark-scheme labels carry across rows, and the
two different `mstab` column counts).

`samples/` holds older templates from the previous parser's dialect.

## Layout

```
app/           Next.js routes. (app)/ is the signed-in shell: one nav, one search.
components/    Feature folders (browse/, modules/, upload/, edit/) + ui/ from shadcn.
lib/render/    questions.content (JSON) -> HTML. types.ts is the parser contract.
lib/supabase/  The data layer, split by domain. Components import from "@/lib/supabase".
config/        Supabase connection and the nav, as data.
backend/       Postgres schema, migrations, the .tex parser, Edge Functions, ops scripts.
templates/     The canonical .tex templates and the format spec.
```

## Deploying

`npm run build` writes a static export to `out/`. There is no server and no
serverless runtime: it deploys the same way to Vercel, Netlify or Cloudflare
Pages. `netlify.toml` is set up; Vercel detects Next.js on its own.

The only hosting-side setup is Supabase **Authentication → URL Configuration
→ Redirect URLs**, which must list the deployed origin (`https://example.com/**`)
or sign-in silently bounces to the Site URL instead.
