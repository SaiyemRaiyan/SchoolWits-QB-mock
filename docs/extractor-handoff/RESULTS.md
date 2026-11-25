# PaperExtractor: results

Branch `paper-extractor`, final commit after 86cc64c. Wired into `parse-paper`
on 26 Nov 2026, after this report was written.

A second sample, of questions that were not flagged, found 2 wrong out of 19
compared with the page: 5070 S24 11 Q10 and 4037 W20 13 Q9.

## Sample checked against the PDF pages

36 questions (12 per subject, seed 20261125), each compared with the printed
page rendered by pdftoppm. Right / flagged / wrong:

| Subject   | New extractor | Current reader |
|-----------|---------------|----------------|
| Physics   | 11 / 1 / 0    | 9 / 1 / 2      |
| Chemistry | 10 / 2 / 0    | 5 / 1 / 6      |
| Maths     | 6 / 6 / 0     | 3 / 0 / 9      |
| **All**   | **27 / 9 / 0**| **17 / 2 / 17**|

The 1 wrong case found outside the sample (5070 W19 41 Q5, NaClO shown as
"NaCl O") was fixed with a general rule and has a test.

## Also checked on the page (spot checks)

- 12 bracket readings: 12 right
- 6 integrals with limits: 6 right
- 5 matrix questions: every matrix value right (4 still flagged for vector arrows)
- 6 figure labels moved into captions: 6 right, nothing lost
- 5 changed answers (KaTeX): 5 right
- 14 upright/italic letters: right
- EITHER/OR (3 papers), page furniture (2), marks beside a figure (3): right

## Whole papers, automatic check only (check-papers)

Not checked on the page; counts of question texts.

| Subject   | Clean | Rebuilt | Passed (flagged) |
|-----------|-------|---------|------------------|
| Physics   | 841   | 23      | 1                |
| Chemistry | 1604  | 77      | 16               |
| Add Maths | 398   | 148     | 400              |

"Suspicious" in the tool output (206 Physics, 347 Chemistry) are MCQs whose
options exist only inside a figure; the current reader has the same.

## What is left

- Add Maths: 400 flagged, mostly ≤/≥, </>, ∩/∪ drawn as same-size pictures.
  The box size cannot tell them apart. Fix: typed `$...$` maths from the LaTeX
  writer (used as-is, no code change), or a pixel-aware SymbolReader outside
  `src/extract` (see writer-notes.md).
- Labels printed above a figure stay as a paragraph in the question.
- Braces and a 2×3 matrix with close-set columns are flagged, not read.

## Tests

209 old tests pass, 336 extractor tests pass, typecheck clean.

## Equations are isolated

Drawn-equation readers live in `backend/src/extract/equations/` and are
chained in `readers()`. `TypedMaths` runs first, and a paper not in the
page-layout style skips the drawing path altogether (`isPositioned()`), so
typed equations work with no change.
