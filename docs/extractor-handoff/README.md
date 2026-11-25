# Extractor hand-off

Stopped on 25 Nov 2026, part way through the first round, to continue on
another machine. Branch: `paper-extractor`.

- `../paper-extractor.md`: the design and its 8 rules. Read it first.
- `writer-notes.md`: the state of the code, symbol findings, next steps.
- `tester-notes.md`: the tests, the PDF pages looked at, uncertain values.

## Set up

1. Clone the repo and check out `paper-extractor`.
2. Put the papers in `~/Documents/Question_Papers/` with these three folders.
   They are not in git:
   `Physics_5054/` (46 papers), `Chem_5070/` (91), `Add_Maths_4037/` (84).
   Each paper folder holds `*_qp_*.tex`, `*_qa_*.tex` and `*_qp_*.pdf`.
   Two Chemistry papers (S26 41 and 42) have no answers file.
3. Install `pdftotext` and `pdftoppm` (package `poppler-utils`), and Python 3
   with Pillow and numpy.
4. `cd backend && npm install && npm run typecheck && npm test`

## Prompt to paste

> Read `docs/extractor-handoff/README.md`, then `docs/paper-extractor.md`,
> `docs/extractor-handoff/writer-notes.md` and
> `docs/extractor-handoff/tester-notes.md`. Continue building the generic
> PaperExtractor from where it stopped, on branch `paper-extractor`. Use one
> agent to write the code and one to write and update the tests. Loop: run the
> tests, look at the printed PDF page to decide whether the code or the test is
> wrong, fix the right one, repeat. Do not fake tests to get green. Never
> special-case a paper. Do not deploy, push, or run `npm run build`. Do not
> switch the upload page or `parse-paper` to the new extractor until I have seen
> the results. Use simple language with me.

## What is left, in order

1. **Text:** symbols for Chemistry, lines and words, parts, marks, options.
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
