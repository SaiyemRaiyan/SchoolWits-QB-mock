# Figures clipped from the source PDF

Implementation spec. Written to be executed start to finish by someone (or
some model) with no memory of the conversation that produced it.

## Status

§1–§4 are implemented. §5 (storing the source PDF) was skipped as optional.
Step 0 was NOT done — no new-style `.tex` was available — so the parser
handles the two shapes this spec guessed at (`\includegraphics[page=,trim=]`
and `\qfig[page=,trim=]{..}{caption}`). If the real files use anything
else, `backend/src/latex/clip.ts` is the one place to change.

Where the code differs from the text below, the code is right:

- `sourcePdf` lives on `ParsedPaper`, not `PaperMeta`. `parsePaperId()` is
  tested by exact equality and has no access to the document.
- A unitless `trim` number is read as **bp**, not pt. That is graphicx's own
  rule for `trim`, unlike the rest of TeX.
- pdf.js is imported dynamically inside `openPdf()`, because it touches DOM
  globals on import and would break the static prerender.

Still to do by hand: `cd backend && npm run deploy:function` (§1e), then the
manual check in §6.

## Why

The `.tex` files changed. Figures used to be separate image files:

```latex
\qfig[0.42\linewidth]{5054_21_M_J_25_fig1.png}{Fig. 1.1}
```

They are now rectangles cut out of the original exam paper PDF:

```latex
\includegraphics[page=3, trim=203.34bp 312.99bp 203.42bp 421.01bp, clip]{5054_w25_qp_12.pdf}
```

Under the current code `resolveImage()` looks up `5054_w25_qp_12.pdf` in the
image map, finds nothing, and sets `src: null`. The parse succeeds and every
figure on the site silently renders as missing. That is the whole bug.

## What we are NOT doing

Read this before starting. A document circulated with the new `.tex` files
describes standing up a TeX Live container to run `pdflatex` twice and
produce a printable `job.pdf`. **That is a different feature.** This site has
never produced a PDF — it renders HTML from JSON. Do not:

- run or install LaTeX anywhere,
- add a FastAPI / Render / Fly / Cloud Run service,
- set any environment variable on Vercel or Netlify,
- move the `.tex` parser into the browser.

Cutting a rectangle out of a PDF needs a PDF renderer, not a TeX engine. We
do it in the admin's browser with pdf.js, on the upload page, where the PDF
already is. The output is PNG files uploaded to the same `question-images`
bucket under the same `{filename: url}` contract the pipeline already uses,
so **nothing downstream changes**.

One rule from that document does NOT apply here: "never rename the source
PDF". It exists because `pdflatex` resolves the filename. We never run
`pdflatex`, so the dropped PDF's name is cosmetic. Warn on a mismatch, never
block.

## Step 0 — get a real file first

This spec was written without a new-style `.tex` in hand. Before writing any
code, open one and confirm the figure macro's actual shape. Specifically:

- Is it `\includegraphics[...]{file.pdf}`, or a `\qfig` whose arguments now
  carry `page`/`trim`, or a `\newcommand` wrapper around one of those?
- Is there a `\newcommand{\srcpdf}{...}` line naming the PDF?
- Are the `trim` values in `bp`, `pt`, or bare numbers?

Adjust §1 to match what is actually there. Everything from §2 onward holds
regardless.

## The flow

```
admin drops:  questions.tex  +  paper.pdf
                     │
   parse #1 (empty image map) ──> figure blocks carrying { clip, file }
                     │
   browser crops each clip from the PDF with pdf.js ──> PNG per figure
                     │
   upload to question-images ──> { file: url }
                     │
   parse #2 (populated map) ──> src resolves ──> preview ──> save
```

`app/(app)/upload/upload-client.tsx` **already does a two-pass parse** in
`preview()` — parse, upload pending figures, parse again. This change slots
into the existing shape rather than inventing a new one.

### The key simplification

The parser derives each clip's filename and writes it into the figure
block's existing `file` field. The browser reads that name off the parse
result and uploads under it.

That means no naming logic is shared across the backend/app boundary (which
the repo forbids anyway — `backend/` and the app do not import each other),
`ImageMap` stays `filename -> url` untouched, `resolveImage()` is unchanged,
and `paper_images.filename` keeps its documented meaning as "the key the
parser matches against".

---

## 1. Parser: read the clip

### 1a. New file `backend/src/latex/clip.ts`

Must stay dependency-free with no `node:` imports — this file also runs
inside a Deno Edge Function.

```ts
export interface FigureClip {
  /** 1-based, as in \includegraphics[page=N]. Defaults to 1. */
  page: number;
  /** Trim in bp (= PDF points), from each edge of the page. */
  left: number;
  bottom: number;
  right: number;
  top: number;
}

/** Reads page= and trim= out of a graphics option list. Null when absent. */
export function parseClipOptions(optional: string | null): FigureClip | null;

/** Deterministic, collision-free filename for a clip. */
export function clipKey(clip: FigureClip): string;
```

`parseClipOptions` must handle:

- `page=3, trim=203.34bp 312.99bp 203.42bp 421.01bp, clip` — the normal case
- key order in any sequence, arbitrary whitespace, optional trailing comma
- `trim` present without `page` → `page: 1`
- `page` present without `trim` → all four zero (a whole page)
- neither present (e.g. `0.42\linewidth`) → **return null**, so old-style
  `\qfig` keeps working exactly as it does today
- units: `bp` as-is; `pt` multiplied by `72/72.27`; a bare number is TeX `pt`,
  so convert it the same way; `in` × 72, `mm` × 72/25.4, `cm` × 72/2.54
- a `width=` key alongside, which must not be mistaken for a trim

`clipKey` format — two decimals, `.` written as `_`, always `.png`:

```
p3-203_34-312_99-203_42-421_01.png
```

Readable in the bucket, stable across re-parses, and distinct per rectangle.
Two figures with identical page and trim are the same picture and should
share one file; that is correct, not a collision.

### 1b. `backend/src/latex/types.ts`

Add `clip` to the `figure` variant of `Block`:

```ts
| {
    type: 'figure';
    file: string;          // now: the clip key when clip !== null
    src: string | null;
    caption: string;
    width: string | null;
    /** Set when the figure is a region of the source PDF, not a file. */
    clip?: FigureClip;
  }
```

Also add `sourcePdf: string | null` to `PaperMeta` — the filename the `.tex`
refers to, for the upload page's mismatch warning. Null for old papers.

### 1c. `backend/src/latex/content.ts`

In `toBlocks()`, both the `qfig` loop (~line 100) and the `includegraphics`
loop below it:

```ts
const clip = parseClipOptions(call.optional);
const file = clip ? clipKey(clip) : call.args[0].trim();
const block = {
  type: 'figure',
  file,
  src: resolveImage(file, images),
  caption: ...,
  width: clip ? null : call.optional,
  ...(clip ? { clip } : null),
};
```

`resolveImage` is called with the derived key and needs no change.

### 1d. Tests — `backend/tests/latex/clip.test.ts` (new)

Cover every bullet in §1a, plus `clipKey` stability (the same clip always
produces the same string). Add two cases to `backend/tests/latex/blocks.test.ts`:
a new-style figure produces `clip` + the derived `file`, and an old-style
`\qfig[0.42\linewidth]{fig1.png}{...}` is byte-for-byte unchanged.

Run `cd backend && npm test`. 203 tests pass today; none may break.

### 1e. Deploy the function

`backend/src/latex/` is bundled into the Edge Function, so the parser change
only reaches the site after:

```bash
cd backend && npm run deploy:function
```

---

## 2. App: mirror the contract

`lib/render/types.ts` — add `clip` to the figure block so the upload page can
read it with types:

```ts
| { type: "figure"; file?: string; caption?: string; src?: string;
    clip?: { page: number; left: number; bottom: number; right: number; top: number } }
```

`lib/render/` must keep having **no imports outside itself** — declare the
shape inline as above, do not import from `backend/`.

The renderer itself needs no change: it draws `src`, and `src` resolves
normally once the crops are uploaded.

---

## 3. Browser: crop the PDF

```bash
npm i pdfjs-dist
```

Pin whatever exact version npm resolves (no `^`). Set the worker once:

```ts
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc =
  new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
```

If that URL form does not survive `output: "export"`, copy the worker file
into `public/` and point `workerSrc` at `/pdf.worker.min.mjs` instead. This
is the one line most likely to need adjusting — verify `npm run build` still
emits only static routes.

### 3a. New file `lib/pdf/clip.ts`

```ts
export async function openPdf(file: File): Promise<PdfSource>;
export async function cropToFile(src: PdfSource, clip: FigureClip, name: string): Promise<File>;
export function closePdf(src: PdfSource): void;
```

Mechanics:

- `page.getViewport({ scale: 1 })` is in PDF points, which is the same unit
  as `bp`, so the trim numbers need no conversion.
- Render the **whole page** to a canvas at `scale = 4` (≈288 dpi), then
  `drawImage` the sub-rectangle into a second canvas:

  ```
  sx = clip.left   * scale
  sy = clip.top    * scale          // canvas y runs from the top
  sw = (pageW - clip.left - clip.right)  * scale
  sh = (pageH - clip.top  - clip.bottom) * scale
  ```

- **Cache the rendered page canvas by page number.** A paper has ~36 figures
  across ~14 pages; without the cache you re-render the same page a dozen
  times and the upload crawls.
- Guard `viewport.rotation !== 0` with a thrown error naming the page —
  exam papers are upright, and silently producing sideways figures is worse
  than refusing.
- Guard a degenerate rectangle (`sw <= 0 || sh <= 0`), which means bad trim
  values, with an error naming the page and the numbers.
- If `sw * sh` exceeds ~16M px, halve the scale and retry, so a full-page
  clip cannot blow up the canvas.
- Output `canvas.toBlob(..., "image/png")` wrapped in
  `new File([blob], name, { type: "image/png" })`.
- Call `closePdf` (→ `pdf.destroy()`) when the admin swaps the PDF out.

### 3b. New file `lib/pdf/collect-clips.ts`

Walk a `ParsedQuestion[]` and return every figure block that has a `clip` and
no `src`, de-duplicated by `file`. Blocks live in `stem[]`,
`parts[].content[]` and `parts[].subparts[].content[]` — recurse, do not
hand-roll two levels.

Known limitation, pre-existing and out of scope: figures inside the
**answers** file are carried as HTML by `markscheme.ts` / `solutions.ts`, not
as figure blocks, so clips there are not collected. Note it; do not fix it
here.

---

## 4. Upload page

`app/(app)/upload/upload-client.tsx`:

1. New state `const [sourcePdf, setSourcePdf] = useState<File | null>(null)`.
2. A third `Dropzone` beside the two `.tex` boxes: title "Drop the source
   paper PDF", hint "figures are cut from this", `accept="application/pdf"`,
   single file. Show a `FilePill` with its size when set. Dropping a new PDF
   replaces the old one and clears `figureUrls` (the crops are stale).
3. In `preview()`, after the first `parsePaper(...)` call, before the
   existing pending-figures branch:

   - `const clips = collectFigureClips(parsed.questions)`
   - if `clips.length && !sourcePdf` → set an error naming the file the
     parser reported in `parsed.paper.sourcePdf` ("This paper cuts 36 figures
     out of `5054_w25_qp_12.pdf`. Drop that PDF to continue.") and stop
     before saving. Keep showing the preview; it is just figure-less.
   - otherwise crop each clip, reporting progress as
     `Cutting figures… {done}/{total}`, then pass the resulting
     `Record<name, File>` straight into the **existing** `uploadFigures()`,
     then re-parse with the merged map. The existing code already does the
     re-parse — extend that branch, do not write a second one.
4. If `parsed.paper.sourcePdf` and the dropped PDF's name differ, show a
   non-blocking warning. Do not refuse the upload.
5. Keep the old figure-image dropzone exactly as it is. Old papers still use
   it, and both paths feed the same `figureUrls` map.
6. Update the Step 1 hint text, which currently says figures are matched "by
   filename".

Crops are ordinary PNGs, so `assertUploadableFigure()` in `lib/supabase/storage.ts`
passes them unchanged. Nothing in `lib/supabase/` needs editing.

---

## 5. Optional, and only after §1–4 work: keep the source PDF

Not needed for figures to render — the crops are already saved as PNGs. It
matters only for re-cutting a paper later when trim values change, without
asking the admin to find the PDF again.

- `backend/supabase/migrations/0021_source_pdf.sql`: add
  `papers.source_pdf_path text`, and add `'application/pdf'` to the
  `question-images` bucket's `allowed_mime_types` (currently set in `0013`).
- Keep `FIGURE_TYPES` in `lib/supabase/storage.ts` **without** PDF, so figure
  validation stays strict; add a separate `SOURCE_PDF_TYPE` constant.
- `npm run gen:types` in `backend/` after applying the migration.

Skip this entirely if time is short. Say so in the commit message if skipped.

---

## 6. Done means

```bash
npm run lint && npx tsc --noEmit && npm run build   # app; all routes still ○ (Static)
cd backend && npm run typecheck && npm test         # 203 passing, plus the new ones
```

Then, by hand on `/upload`: drop a new-style `.tex` and its PDF, and confirm
every figure appears in the live preview; drop an old-style `.tex` with loose
`.png` figures and confirm that path still works untouched.

`npm run deploy:function` must be run for the parser change to take effect on
the deployed site (§1e) — a green local test suite does not mean the live
site has the new parser.
