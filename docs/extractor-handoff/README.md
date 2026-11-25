# Extractor hand-off

Stopped on 25 Nov 2026, part way through the first round, to continue on
another machine. Branch: `paper-extractor`.

- `../paper-extractor.md`: the design and its 8 rules. Read it first.
- `PROMPT.md`: the prompt to continue with.
- `writer-notes.md`: the state of the code, symbol findings, next steps.
- `tester-notes.md`: the tests, the PDF pages looked at, uncertain values.

## Set up

1. Check out the `paper-extractor` branch.
2. `./docs/extractor-handoff/get-papers.sh` fetches the 221 papers from the
   `question-papers` branch (204 MB) into `~/Documents/Question_Papers/`:
   `Physics_5054/` (46), `Chem_5070/` (91), `Add_Maths_4037/` (84).
   Two Chemistry papers (S26 41 and 42) have no answers file.
3. Install `pdftotext` and `pdftoppm` (package `poppler-utils`), and Python 3
   with Pillow and numpy.
4. `cd backend && npm install && npm test` (see "State" for what should fail)

## Prompt to paste

The whole of [`PROMPT.md`](PROMPT.md).

## State when it stopped

- `src/extract` compiles. Written: macros, metrics, encodings, typesetter,
  symbols, to-math, flow, and the equation chain (typed, symbol, underline, root,
  fraction, script, pass).
- `roles.ts`, `bands.ts` and `questions.ts` were written in the last minutes.
  They compile, and nothing else about them has been checked.
- Not written: `paper-extractor.ts`, the subject classes, `index.ts`,
  `scripts/check-papers.ts`, and equation readers for brackets, matrices, limits
  and relations.
- Tests: the 209 existing ones pass. In `tests/extract`, 142 pass (helpers,
  macros, typesetter, no-cheating). `physics`, `chemistry`, `maths`, `text` and
  `extractor` cannot load until `index.ts` exists, and `npm run typecheck`
  reports that missing file too. Both are expected.
- `writer-notes.md` was last updated just before `roles`, `bands` and `questions`.

## What is left, in order

1. **Text:** check `roles.ts`, `bands.ts` and `questions.ts` (parts, marks, options).
2. **Classes:** `PaperExtractor` (template method), `PhysicsExtractor`,
   `ChemistryExtractor`, `MathsExtractor`, `GenericExtractor`,
   `createExtractor()` (factory).
3. **`npm run check-papers`:** one report over all 221 papers.
4. **Run the tests that have never run:** physics, chemistry, maths, text,
   extractor. Expect some to be test mistakes.
5. **Physics** must be no worse than the current reader (`src/latex/layout.ts`).
6. **Chemistry:** about 300 of 1,697 questions are wrong today. Causes are below.
7. **Add Maths:** fractions, roots, modulus, matrices, symbol pictures.
8. **Answers:** 22 answer formulas in Add Maths fail, mostly matrices cut in two.
9. Show the results, then decide about switching over and deploying.

## Known problems to solve

- **Same-size symbols in Add Maths:** <= and >=, < and >, ( and ), cap and cup
  are pictures of identical size, so size cannot separate them. Ideas, untested:
  compare the pixels of the picture in the PDF (in the browser, where pdf.js
  already renders pages); use the sense of the line (brackets come in pairs; in
  `a ? x ? b` with a < b only <= or < fits); otherwise pass. For a passed
  question, Claude reading the PDF page is the fallback that was shown to work.
- **Chemistry today:** letters stored as small pictures (79 questions),
  `\parfillskip=0pt` (70), BLANK PAGE or the Periodic Table after the last
  question (60), a whole question in one `\freerow` in S26 11 and 12 (50),
  equations in pieces (44), charges, isotopes and bold I (about 19), two-column
  "experiment 1 / experiment 2" lines (about 10). 9 questions have marks that do
  not add up, cause unknown.
- **Underlines** drawn as rules (5054 S17 11 Q2; 5070 W19 11 Q16, W19 12 Q16)
  may not be recoverable. They must be flagged.
- **EITHER/OR marks:** 5054 S16 21 Q9, S21 22 Q8.

## What is live

- `main` at `dfdd571`: the current reader, with the Physics fixes. It is deployed
  to Supabase as `parse-paper`. Physics uploads work.
- Nothing on this branch is used by the site.
