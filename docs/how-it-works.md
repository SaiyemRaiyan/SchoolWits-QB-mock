# How School Wits works

A guide to the whole system for someone who has not followed its
construction: what the pieces are, what happens to a paper from the moment
it is uploaded to the moment a student reads it, and where things go wrong.

It starts simple and gets more detailed. Read sections 1 to 4 for the
picture; the rest is reference.

---

## 1. The one-paragraph version

Someone writes each exam paper as two LaTeX (`.tex`) files, one with the
questions and one with the answers. An admin uploads them. A program called
the **parser** reads the files and turns each question into structured data:
"this is the question text, these are options A to D, this is part (a), this
is the mark scheme". That data is stored in a database. When a student opens
the site, a second program called the **renderer** turns the stored data
into the web page they see. No one types questions into the website by hand.

```
  .tex files ──> PARSER ──> structured data ──> DATABASE ──> RENDERER ──> web page
  (written by      (reads      (JSON)            (Supabase)   (draws        (student)
   the LaTeX       LaTeX)                                       HTML)
   author)
```

Two words used throughout:

- **LaTeX / `.tex`**: a way of writing documents as plain text with commands
  in it, such as `\textbf{bold}`. Normally you feed a `.tex` file to a program
  that produces a PDF.
- **Parser**: a program that reads a file and works out its structure. This
  site's parser is the thing sometimes called "the LaTeX engine". It is
  important to know what it is **not**: it does not produce PDFs and it does
  not run real LaTeX. It only reads the text of the file and looks for the
  commands it knows.

---

## 2. The pieces and where they live

| Piece | What it is | Where it runs | Where the code is |
|---|---|---|---|
| The website | The pages people see | The visitor's browser | `app/`, `components/` |
| The database | Stores papers, questions, modules, admins | Supabase (hosted) | schema in `backend/supabase/migrations/` |
| The file store | Stores figure images | Supabase Storage, bucket `question-images` | - |
| The parser | Reads `.tex`, produces structured data | A Supabase Edge Function (a small server program) | `backend/src/latex/` |
| The renderer | Turns structured data into HTML | The visitor's browser | `lib/render/` |
| Sign-in | Google login | Supabase Auth | `lib/supabase/auth.ts` |

There is **no server of our own**. The website is a set of static files
(built by `npm run build` into `out/`) that any static host can serve. All
data comes from Supabase, directly from the browser.

**Supabase** is a hosted service that gives us a Postgres database, file
storage, login, and the ability to run small server programs called Edge
Functions. We have two Edge Functions:

- `parse-paper`: takes `.tex` text, returns the parsed result, and saves it
  when asked.
- `update-question`: applies an admin's edit to one stored question.

---

## 3. The life of a paper

### Step 1: the admin opens `/upload`

Only admins can use it. The page asks Supabase "is this person an admin?"
and shows the upload form if so. (Section 9 explains why this check is not
what actually protects the data.)

### Step 2: the admin drops the files

- the **questions** `.tex`
- the **answers** `.tex`
- **figures**: either loose image files, or the original paper PDF from
  which figures are cut

### Step 3: first parse

The browser sends the text of the `.tex` files to the `parse-paper` Edge
Function. The function runs the parser and sends back the structured result
plus a list of **warnings**. Nothing is saved yet.

This first pass also tells the browser the paper's id (for example
`5054/21/M/J/25`), which is needed to decide where the figures are stored.

### Step 4: figures are uploaded

The browser uploads each figure to the file store and gets back a web
address (URL) for it. If the figures come from a PDF, the browser first cuts
each one out as a PNG image (section 7).

### Step 5: second parse

The browser sends the `.tex` again, this time together with the list
"figure name -> URL". The parser puts the right URL into each figure, so the
preview on the right-hand side shows the real pictures.

### Step 6: the admin checks the preview and presses Save

The browser sends the `.tex` a third time with `commit: true`. The function
**parses it again from scratch** and writes the result to the database.

Why parse again instead of saving the preview? Because then the database can
only ever contain what the parser itself produced. The browser never gets to
hand over data and say "trust me".

### Step 7: students see it

On `/browse`, the browser asks the database for questions matching the
filters, and the renderer turns each one into HTML. Maths is drawn by a
library called KaTeX.

---

## 4. What the two `.tex` files contain

### The questions file

Every question starts with one header line:

```latex
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{9}
```

That is: paper id, question number, topics, total marks. This line is the
only thing that separates one question from the next. Everything up to the
next `\examq` belongs to that question.

After the header comes the body, in the **documented format**
(`public/templates/README.md` is the full specification):

```latex
Fig. 1.1 shows a skydiver falling vertically through the air.

\qfig[0.42\linewidth]{5054_21_M_J_25_fig1.png}{Fig. 1.1}

\begin{parts}
  \item On Fig. 1.2 sketch the speed--time graph for the skydiver.
  \markright{[2]}
  \item Explain how the graph shows that the acceleration decreases.
  \Alines{3}{[1]}
\end{parts}
```

and for multiple choice:

```latex
\begin{choices}
  \item The coin has not hit the ground.
  \item The weight of the coin equals the air resistance.
\end{choices}
```

Maths is written the normal LaTeX way, between dollar signs: `$x^2 + 3x$`.

### The answers file

It uses the same `\examq` header for each question, so the two files can be
matched by question number. Under each header it has:

- a **mark scheme table** (`mstab`): rows of answer, mark code such as `B1`
  or `M1`, and sometimes guidance
- a **worked solution box** (`ansbox`): the explanation, split by part

---

## 5. Inside the parser

Uploads are read by the **paper extractor**, `backend/src/extract/`. It looks at
the file first:

- a paper written as a copy of the printed page (all papers we get now) is read
  by the extractor itself: section 8
- a paper in the **documented format** (the older ones) is handed to the reader
  in `backend/src/latex/`, described here
- **answer files** are always read by `backend/src/latex/`

The folder `backend/src/latex/`, file by file, roughly in the order they run:

| File | Job |
|---|---|
| `preprocess.ts` | Remove `%` comments, split the preamble from the body, drop layout-only commands |
| `blocks.ts` | Cut the body into questions at each `\examq`; read the paper id, number, topics, marks |
| `structure.ts` | Build the tree of parts and subparts, and generate the labels (a), (b), (i), (ii) |
| `content.ts` | Turn a run of LaTeX into a list of blocks: text, figure, or table |
| `inline.ts` | Turn inline commands into HTML (`\textbf{x}` -> `<strong>x</strong>`), leaving maths untouched |
| `options.ts` | Find the multiple-choice options A to D |
| `markscheme.ts` | Read the mark scheme table into rows |
| `solutions.ts` | Read the worked solution box into segments, and find the correct MCQ letter |
| `index.ts` | The entry points that call the above and join questions to answers |
| `flatten.ts` | Make a plain-text version of a question, used for search |
| `clip.ts` | Read the page and rectangle of a figure cut from a PDF |
| `guard.ts` | Detect text that is really leaked measurements, so it can be warned about |
| `layout.ts` | The old page-layout reader. No longer used by uploads; kept until the extractor has proved itself |
| `scan.ts` | Low-level helpers: find a command and its `{arguments}`, find `\begin...\end` blocks |
| `report.ts` | A text report of a parse, for the terminal |

Things worth knowing about how it behaves:

**It only understands the commands it has been taught.** It looks for
`\examq`, `\begin{parts}`, `\qfig`, `\begin{choices}`, `mstab`, `ansbox` and a
set of inline commands. A command it does not know is removed, but whatever
was inside its braces is kept as if it were text. For the documented format
this is harmless. For a file written with other commands it produces
nonsense that still looks like a successful parse (section 8).

**Part labels are generated, not read.** In the documented format the source
never contains "(a)" or "(ii)"; LaTeX numbers the list items when it prints.
The parser reproduces that numbering from the position of each `\item`. The
mark scheme refers to parts by those labels (`1(c)(ii)`), so this is what
lets answers be attached to the right part.

**Maths is never touched.** Anything between `$...$` is lifted out before
any processing and put back unchanged. The browser draws it later.

**A figure is a name, then a URL.** `\qfig{fig1.png}{Fig. 1.1}` becomes a
figure block with `file: "fig1.png"`. The parser looks that name up in the
"name -> URL" list it was given and fills in `src`. No match means `src` is
empty and the page shows a "missing figure" box. That is allowed, not an
error.

**Questions and answers are joined by number.** A question with no answer is
kept, with a warning. This is why the questions file can be uploaded first
and the answers added later.

**It has no dependencies.** The folder uses no outside libraries and nothing
specific to Node. That is deliberate: the same files are bundled into one
file (`vendor/extract.js`) and run inside the Edge Function, which is a
different environment (Deno). A change to the parser only reaches the live
site after `npm run deploy:function` in `backend/`.

### What the parser produces

One object per question. Simplified:

```json
{
  "number": 1,
  "kind": "structured",
  "topics": ["Motion or Kinematics", "Forces or Dynamics"],
  "marks": 9,
  "stem": [
    { "type": "text", "html": "Fig. 1.1 shows a skydiver..." },
    { "type": "figure", "file": "fig1.png", "src": "https://...", "caption": "Fig. 1.1" }
  ],
  "parts": [
    { "label": "(a)", "marks": 2, "content": [ ... ], "subparts": [] }
  ],
  "options": null,
  "answer": {
    "markScheme": [ { "ref": "1(a)", "answer": "...", "code": "B1", "marks": 1 } ],
    "workedSolution": [ { "ref": "1(a)", "html": "..." } ],
    "correct": null
  }
}
```

This shape is the **contract** between the parser and the renderer. It is
defined in `backend/src/latex/types.ts` and mirrored in
`lib/render/types.ts`. The two halves share no code; they only agree on this
shape.

---

## 6. The database

| Table | One row is | Notes |
|---|---|---|
| `papers` | one paper (subject, paper, variant, session, year) | `label` is the id students see, e.g. `5054/21/M/J/25` |
| `questions` | one question | `content` holds the whole object from section 5; `q_text` is the plain-text copy used for search |
| `paper_images` | one uploaded figure | the list of what is in the file store, so it can be cleaned up |
| `modules` | one topic pack | a hand-picked set of questions |
| `module_questions` | one question inside one module | may hold an edited copy of the question just for that module |
| `syllabuses` | one syllabus (code, title, qualification) | drives the subject pickers |
| `admin_emails` | one email that should be admin | the roster you edit |
| `admin_users` | one user who is admin | filled automatically from `admin_emails` |

Deleting a paper deletes its questions with it.

**Search** works on `q_text`, not on `content`. Postgres builds a search
index from `q_text`. Maths is left out of `q_text` on purpose, because
`\frac{1}{2}` produces no useful search words.

---

## 7. Figures

There are two ways a figure reaches the site.

**Loose image files (older papers).** The `.tex` says
`\qfig{5054_21_M_J_25_fig1.png}{...}` and the admin drops that PNG on the
upload page. The file name is what links them.

**Cut from the original PDF (newer papers).** The `.tex` gives a page number
and a rectangle on that page instead of a file name. The admin drops the
original paper PDF, and the browser:

1. opens the PDF with a library called pdf.js
2. draws the page onto a hidden canvas at high resolution
3. copies out the rectangle
4. saves it as a PNG named after the rectangle, e.g.
   `p3-203_34-312_99-203_42-421_01.png`
5. uploads it like any other figure

The parser produces that same name from the same numbers, so the two meet
without the browser and the parser sharing any code. The code is in
`lib/pdf/`. No LaTeX is compiled and no extra server is involved.

> Status: the cutting and uploading work. The part that reads the command
> was written for `\includegraphics[page=..., trim=...]`; the real files use
> `\qfig{page}{trim}{caption}{above}{below}{left}`. That needs correcting as
> part of supporting the new format (section 8).

Limits set by the file store: 5 MB per file, images only (PNG, JPG, GIF,
WEBP, SVG).

---

## 8. Page-layout papers and the extractor

The LaTeX we get now is a copy of the printed page. Nothing says "this is a
fraction" or "this is part (a)"; each piece only says where it goes:

```latex
\at{94.96}{-0.53}{Show that}         put "Show that" here
\swglyph{7}{184.63bp 766.09bp ...}   paste a small picture cut from the PDF
```

### How it is read

```
 .tex ─► understand ─► text ─► equations ─► figures ─► check ─► questions
         (the file's    lines,   try each     cut from   flag what
         own commands)  parts    reader       the PDF    is unsure
```

- **It reads the file's own definitions**, so a new command usually works with
  no code change.
- **One class for every subject.** `PaperExtractor` does the work.
  `PhysicsExtractor`, `ChemistryExtractor`, `MathsExtractor` and
  `GenericExtractor` inherit it, and `createExtractor()` picks one from the paper
  code. They are almost empty today because the rules are shared.
- **Equations go through a list of readers** (`equations/`): typed maths,
  symbols, modulus, roots, fractions, integrals, brackets. If none is sure, the
  line is **passed**: it is shown with `□` where something could not be read, and
  the question gets a warning. A wrong equation should never be shown as if it
  were right.

The design is in `paper-extractor.md`.

### The main problem left: drawn equations

Where the LaTeX has a **picture** of θ, ≤ or a bracket instead of the typed
symbol, there is nothing to read. Some pictures are recognised by their size. But
≤ and ≥, < and >, ∩ and ∪ have the same size, so they are passed.

| Subject | Questions | Flagged |
|---|---|---|
| Physics | 865 | 1 |
| Chemistry | 1,697 | 16 |
| Add Maths | 946 | **400** |

(26 Nov 2026, all 221 papers. Counted automatically: "not flagged" does not mean
each one was compared with the PDF.)

**The fix is in the LaTeX**: equations typed between dollar signs. Typed maths is
used exactly as it is, so nothing has to change here.

### Other known problems

- Chemistry S24 paper 11 Q10: the equations under the options land in the
  question text. Add Maths W20 paper 13 Q9: the vector arrows are lost. **Neither
  is flagged.**
- A sentence is sometimes split into two paragraphs (roughly 155 questions).
- Underlines may be lost; those questions are flagged.
- The subject name identifies a paper in the database (the code does not), so a
  wrong subject can overwrite another paper. Names are in `config/subjects.ts`.
- A preview is not a check. Compare flagged questions with the PDF before saving.

---

## 9. Who is allowed to do what

Anyone can **read**. Only admins can **write**.

The rule is enforced inside the database, by a feature called Row Level
Security (RLS). Every write to `papers`, `questions`, `modules` and the file
store is checked against a function `is_admin()`, which looks the current
user up in `admin_users`.

This is why the hidden buttons and the admin-only upload page are described
as "presentation only". They make the site pleasant to use, but if someone
bypassed them, the database would still refuse the write.

The Edge Functions follow the same rule: they act **as the signed-in
user**, with that user's own login token, and never with a master key. So a
bug in a function cannot do more than the user could do anyway.

The website contains a Supabase key in `config/supabase.ts`. It is the
*publishable* key, meant to be public. It can only do what RLS allows. The
*service-role* key, which bypasses RLS, must never be put in the website or
committed; it is only for scripts run from a terminal.

**Adding an admin**: add the person's email to `admin_emails` and run the
backfill, both in the Supabase SQL editor. See
`backend/supabase/migrations/0020_admin_email_saiyem.sql` for the exact two
statements. The email must be verified, which a Google sign-in does.

---

## 10. The renderer

The folder `lib/render/` turns one stored question into HTML strings:

| File | Draws |
|---|---|
| `blocks.ts` | text, figures, tables |
| `parts.ts` | the parts tree with labels and marks |
| `options.ts` | MCQ options |
| `mark-scheme.ts` | mark scheme rows |
| `solution.ts` | worked solution |
| `index.ts` | the functions the page components call |

The HTML is placed on the page, and then KaTeX runs over it and draws every
`$...$` as proper maths. `styles/question-content.css` controls how it
looks.

The split of responsibility is strict: the parser knows LaTeX and nothing
about how the site looks; the renderer knows how the site looks and nothing
about LaTeX.

---

## 11. Editing a question

An admin can press Edit on a question in `/browse`.

The browser asks the `update-question` function for the question's
**leaves**: the list of individual pieces of text that may be edited, each
with a path saying where it lives inside the question. The admin changes
some, and the browser sends back only `{ path, new value }` pairs. The
function checks every path against its own list before saving.

The browser never sends a whole question back. That keeps the structure
under the server's control: an edit can change wording, but cannot add a
part or reshape the question. The one exception is "add a figure", which is
a specific operation the server performs itself.

Inside a module, the same editor changes that module's own copy of the
question, leaving the original paper untouched.

---

## 12. The pages

| Route | Purpose |
|---|---|
| `/` | Landing page: pick a subject and jump into the bank |
| `/browse` | The bank: filters, search, one question at a time or the full paper |
| `/modules` | Topic packs: public storefront, admin-only builder |
| `/upload` | Admin-only: upload and preview papers, delete papers |

On `/browse` the filters live in the page address (`?subject=...&paper=...`),
so a filtered view can be bookmarked or shared.

---

## 13. Running and checking things

```bash
npm install
npm run dev                 # the site, at http://localhost:3000

npm run lint                # code style
npx tsc --noEmit            # type errors
npm run build               # the production build (slow)

cd backend
npm test                    # the parser's tests
npm run typecheck
npm run check-papers        # read every paper in ~/Documents/Question_Papers and report
npm run deploy:function     # put a parser change on the live site
```

Two things that are easy to forget:

- A parser change is **not live** until `npm run deploy:function` has run,
  even if all tests pass.
- A website change is **not live** until it has been pushed and the host has
  rebuilt the site. Setting up the host: `netlify.md`.

---

## 14. Where to look when something is wrong

| Symptom | Likely cause | Look at |
|---|---|---|
| `□` in an equation | A symbol drawn as a picture | section 8; have it typed in the LaTeX |
| Question text has stray numbers or `bp` in it | A command that could not be understood | section 8; `npm run check-papers` |
| Figure shows as missing | The figure name in the `.tex` has no matching upload | upload the file, or check the name |
| Mark scheme rows are on the wrong part | Part labels did not line up | `structure.ts`, `markscheme.ts`, and the conventions in `templates/README.md` |
| "Check before saving: some of this will be wrong" | Drawn maths, unknown commands or leaked measurements | the red box names the questions |
| Save or edit fails with a permission error | The user is not an admin, or the session expired | section 9 |
| A parser fix works in tests but not on the site | The function was not redeployed | `npm run deploy:function` |
| Login returns to the wrong site | The address is missing from Supabase's allowed redirect URLs | Supabase > Authentication > URL Configuration |
| A question cannot be found by search | Search uses `q_text`, and maths is not indexed | section 6 |

---

## 15. Things the parser now removes or rewrites

Found by running every sample paper through parser and renderer and looking
for text that should not be on a page.

| In the `.tex` | What reaches the page | Why |
|---|---|---|
| `\$` in prose | a literal dollar sign in its own `<span>` | A bare `$` shared a text node with the next one, and KaTeX read the pair as maths |
| `\begin{itemize}[leftmargin=2em]` / `enumerate` | a real list; the option block is dropped | It used to print `itemize[leftmargin=...]` as text |
| `tikzpicture`, `pgfpicture`, `picture` | nothing, plus a `diagram-omitted` warning | A browser cannot draw them, and the code printed as text. Use a figure image or a PDF clip for anything that must show |

The filters on `/browse` cascade: Paper, Variant, Session and Year list only
values that exist for the other choices (`scopeFacets` in
`lib/supabase/facets.ts`), so no combination of dropdowns reaches an empty page.

