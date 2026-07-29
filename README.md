# School Wits — Question Bank (dynamic)

A fully front-end system — no server, no database to host. Everything lives
in the browser via **IndexedDB**, so it scales to hundreds or thousands of
questions without a backend.

Open `index.html` directly in a browser (double-click, or serve the folder
with any static file server). All three pages share the same data:

## Pages

- **`index.html` — Browse & Search.**
  Filter by subject, paper, variant, session, year and topic (all options
  are generated from whatever you've uploaded — nothing is hardcoded), or
  free-text search across every question, mark scheme and exemplar.
  "Group by" switches between paper-by-paper (yearly), topic, or subject
  views. Comes pre-loaded with the sample paper you provided: Physics,
  Paper 1, Variant 1, M/J session, 2025 (all 9 questions).

- **`upload.html` — Upload.**
  Two separate `.tex` files build one paper: a **Questions** file (topic,
  marks, `\qtext`) and an **Answers** file (`\markscheme`, `\exemplar`),
  matched automatically by question number — download
  `TEMPLATE-questions.tex` + `TEMPLATE-answers.tex` from the page (also
  copied into `samples/` here) to see the exact format. Drop in any figure
  images either file references via `\image{filename}{caption}`. The page
  parses both files client-side, merges them live, shows a KaTeX preview
  and any warnings (e.g. a question with no matching mark scheme yet),
  lets you confirm/edit the paper's subject/paper/variant/session/year,
  and saves the merged result to the bank with one click. Existing papers
  can be deleted from the same page. You can also upload just the
  questions file first and add the answers file later — click Save again
  and it updates the same paper.

- **`modules.html` — Modules.**
  *Builder* tab: filter the whole bank by topic, tick the questions you
  want, and package them into a named module with a description and a
  price (or mark it free). *Storefront* tab: modules appear as cards;
  free ones open immediately, premium ones show a blurred preview with a
  "first question free" teaser and an unlock button. Checkout is a clearly
  labelled **demo** — no real payment is taken; the unlock is just a flag
  stored in `localStorage` on that device. Swap in a real payment provider
  (SSLCommerz, Stripe, bKash, etc.) behind `showCheckout()` in
  `js/modules.js` before selling for real.

## Videos

A video only ever appears on a question's Video tab if one has actually
been attached to that exact question (a YouTube link saved into its
record). There's no placeholder or fallback video — unattached questions
show "No video has been uploaded" and a form to add one.

## Data model (`js/store.js`)

IndexedDB database `schoolwits_bank` with three stores:
- `papers` — one record per subject/paper/variant/session/year combo.
- `questions` — one record per question, keyed by
  `subject|paper|variant|session|year::id`, indexed by subject, topic,
  paperKey and year so filtering and search stay fast at scale.
- `modules` — topic packs referencing question keys by id.

Purchases are a simple `localStorage` flag per module id (`js/store.js` →
`isPurchased` / `markPurchased`) — intentionally the one piece of state
that's per-device rather than per-bank, since it stands in for a future
"who bought what" table on a real backend.

## The `.tex` format — two files, matched by question number

See `samples/TEMPLATE-questions.tex` + `samples/TEMPLATE-answers.tex`, or
the two spec boxes at the bottom of the Upload page.

Both files start with the same paper metadata: `\subject`, `\paper`,
`\variant`, `\session`, `\year` (only one of the two files needs to have
it; if both do and they disagree, the questions file wins and a warning
is shown).

**Questions.tex** — one `\begin{question}{n} ... \end{question}` block
per question, with `\topic`, `\marks`, `\ref`, and a `\qtext ... \endq`
body (supporting `\part{marks}` for auto-lettered parts and
`\image{file}{caption}`).

**Answers.tex** — the same `\begin{question}{n} ... \end{question}`
numbering, containing a `\markscheme ... \endms` block of
`\row{part}{answer}{marks}` rows and an `\exemplar ... \endexemplar`
block.

The upload page merges the two by question number as soon as both are
loaded. A question with no matching number in the answers file still
saves (with an on-screen warning) and just shows "no mark scheme
uploaded" in Browse until you add one. Real LaTeX math (`$...$`,
`\(..\)`, `$$...$$`, `\[..\]`) passes straight through untouched and
renders with KaTeX in every view. `samples/TEMPLATE.tex` is kept as a
reference showing the old single-file (combined) layout the parser still
understands if you ever prefer one file over two.

## Known limits, worth knowing before you scale this up

- This is genuinely frontend-only, as asked — so the bank lives in one
  browser on one device. Uploading on your laptop won't show up on a
  student's phone. To make it multi-device you'd move `store.js`'s
  IndexedDB calls behind a real API (the function signatures are already
  written as if that boundary exists, so the swap is mostly mechanical).
- The `.tex` parser understands the School Wits dialect above, not
  arbitrary LaTeX exam-class documents — a full LaTeX engine in the
  browser is a much bigger project than "no backend for now" implies.
- Checkout is a mock, as flagged in the modal itself and above.
