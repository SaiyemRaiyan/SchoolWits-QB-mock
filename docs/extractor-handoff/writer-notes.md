# Writer notes (interruption-safe)

## Done (compiles)
- src/extract/types.ts: contract, plus TextPiece.serif, MathPiece.size, PathPiece.stroke, Line.problems.
- macros.ts: MacroTable (newcommand, def with delimiters, let; preamble lengths such as spaceskip). dropComments().
- metrics.ts: AFM widths. encodings.ts: whole Symbol encoding, dingbats, accents.
- typesetter.ts: Typesetter/Setter, TeX subset -> pieces. "_" raised = minus. \at builtin only when the preamble lacks it.
- scripts/symbol-sheets.py: crops every picture, groups look-alikes, contact sheets.

## Also done: symbols.ts, to-math.ts, flow.ts, equations/* (chain: typed, symbol, underline, root, fraction, script, pass). Brackets, matrices, limits, relations NOT done.

## Planned files
- symbols.ts (SymbolTable), roles.ts (declarative element table), flow.ts (rows, scripts, words -> inline LaTeX),
  to-math.ts (inline -> KaTeX), equations/{chain,geometry,symbols,fraction,script,pass,...}.ts,
  questions.ts (parts, marks, options), paper-extractor.ts + physics/chemistry/maths/generic + index.ts, scripts/check-papers.ts

## Facts found
- \swpath/\at/\ruleat share the freerow origin (49.6); path x needs no shift. Path kinds (Add Maths only): 3 points = root
  (tick lw1.8, then rise+vinculum lw1.0); 2 points H = bar; 2 points V or thin rectangle = modulus post; 8 points filled = vector arrow.
- 47 PDFs are 595x842, so clip width is uncertain by 0.28: for \swcut use the makebox advance.
- Word gap: kerns >= 0.118em are spaces (75\kern1.44bp m), 1.19bp in f(x) is not.
- Picture geometry (w x h, bp, 11.5pt): ink-unanimous: 7.5x1.5 5.4x1.3 5.6x1.3 minus; 6.3x8.7 6.1x8.7 5.8x9.0 6.1x8.5 theta;
  6.8x6.8 6.6x6.6 6.1x5.8 5.8x5.8 6.3x5.8 pi (6.8x6.8 has 1 x); 6.8x3.9 6.3x3.9 infinity; 7.8x9.9 7.5x9.9 not-equal; 7.5x8.5 Delta;
  7.8x21.7 8.7x24.1 integral; 2.2x3.7 2.5x3.7 prime; 8.0x9.0 mu; 7.3x6.6 alpha; 7.0x9.2 7.0x9.4 lambda; 7.0x11.6 7.3x11.6 phi;
  7.0x7.8 plus-minus; 7.8x7.0 element-of; 9.0x9.4 R; 7.5x9.0 universal set; 10.2x4.2 maps-to; 3.0x3.4 3.2x3.2 degree.
- NOT separable by size: <= / >=, < / >, ( / ), cap/cup. A chain a ? x ? b with numbers a<b can only be <= or <.
- Labels by group: reports/symbol-labels.py (group numbers as printed by symbol-sheets.py).
- "Section X" heading + small qfig under it can open a body BEFORE the label (Chemistry A1) or close it.
- EITHER/OR only in Physics S16P21 Q9, S19P21 Q8(b), S21P22 Q8(b). "1n" for ln is typed only in 4037 S16P11.

## Next
symbols (Chemistry only first), flow, questions, extractor, check-papers; then fractions; Add Maths roots/matrices last.

## Decisions (coordinator, 25 Nov 2026, second session)

These settle the open questions so writer and tester agree. `ParsedPaper` does not change.
- **EITHER/OR:** the alternatives stay in `q.parts`, in printed order (a, b, a, b). The word EITHER or OR is a
  bold paragraph at the start of the first part of its alternative. `q.marks` counts ONE alternative. A part before
  EITHER counts once.
- **Units:** a thin space printed between a number and its unit ("20 g", "52 000 J") is read as one ordinary space.
- **Section headings and rubrics** ("Section B", "Answer one question from this section") between questions are page
  furniture, like BLANK PAGE (doc rule 8). They are not question text.
- **Baseline:** the current reader's output for all 221 papers is in the session scratchpad,
  `.../scratchpad/baseline/<subject>/<paper>.json` (made by `.../scratchpad/baseline.ts`). It is for diffing "no worse
  than the current reader", never a source of expected test values.
- **katex** is not installed in backend/; Node finds the repo root's copy (0.19.0) from `backend/scripts`. Read the
  site macros from `lib/katex.ts` without editing it.

## Extension points (writer, third session) — for the subclass test

`backend/src/extract/paper-extractor.ts`:

```ts
export abstract class PaperExtractor implements Extractor {
  abstract readonly subject: string;            // 'Physics' | 'Chemistry' | 'Mathematics' | 'Generic'
  readonly paper: PaperMeta | null;             // set in the constructor, from the first \examq of the body
  constructor(protected readonly source: PaperSource);
  get code / paperNumber / variant / session / year: string | null;
  get warnings(): readonly Warning[];  get passes(): readonly Pass[];   // of the last extract()
  get rebuilt(): readonly number[];             // questions with a line rebuilt from position
  extract(): ExtractedPaper;                    // the template; do not override
  // steps, all protected, called inside extract() (never in the constructor):
  protected document(): PaperDocument;                    // {preamble, body}; body after the LAST \begin{document}
  protected isPositioned(doc: PaperDocument): boolean;   // false -> documented(): the old reader, passes []
  protected documented(): ParsedPaper;
  protected understand(preamble: string): Typesetter;   // MacroTable.fromPreamble + Typesetter
  protected symbolReader(): SymbolReader;               // default new SymbolTable()
  protected readers(): EquationReader[];                // [TypedMaths, SymbolPictures, Underline, Roots, Fractions];
                                                        // add with [...super.readers(), new Mine()]
  protected rules(): ReadingRules;                      // { pieces(line): Line; tidy(tex): string }, identity by default
  protected chain(): EquationChain;                     // symbolReader() + readers() + TextAndScripts + PassOver (fixed tail)
  protected readQuestion(source: QuestionSource, setting: Typesetter, chain: EquationChain, images: ImageMap): QuestionRead;
  protected classify(drafts): Question[];               // MCQ or structured, over the whole paper
  protected check(questions, drafts, passes, rebuilt): Warning[];
  protected attachAnswers(paper: ParsedPaper): ParsedPaper;   // parseAnswerPaper + mergePaper when answers is non-empty
}
```
Subclasses: `PhysicsExtractor`, `ChemistryExtractor`, `MathsExtractor`, `GenericExtractor` (each only sets `subject` so far).
`index.ts` exports `createExtractor`, `extractPaper`, `PaperExtractor`, the four subclasses, `SymbolTable`
(`new SymbolTable(boxes?)`, `.read(glyph)`, `.find(glyph)`), `MacroTable`, `Typesetter`, `EquationChain`, `PassOver`,
`UNREAD`, `splitPaper`, `paperOf`, and the types. Every pass also becomes one `unsupported-layout` warning per question
(with `questionNumber`).

## State (writer, third session)

- Written: `paper-extractor.ts`, `physics.ts`, `chemistry.ts`, `maths.ts`, `generic.ts`, `index.ts`,
  `scripts/check-papers.ts` (`npm run check-papers -- [--subject Phys|Chem|Maths] [--only 5054_s16_qp_21]
  [--out DIR] [--baseline DIR] [--show <suspicion kind or pass reason>]`). Dump: one JSON per paper,
  `{paper, number, kind, marks, lines[], passes[], suspicious[], rebuilt, baseline?}`; `lines` are "stem: ..",
  "1(a)(i) [2]: ..", "A: .."; the same flattening is applied to the baseline. `_diff-vs-baseline.txt` per subject
  compares ignoring quote style and whitespace. KaTeX is checked on question text (`katex`) and on answers
  (`katex-answer`) with the MACROS read as text from lib/katex.ts.
- Fixed in roles/questions: element arity read from the file's own \newcommand (text stays the last argument;
  \qfig's [7][] counts its optional); text after `\newline` lost its first word (`\newlinewidth`); EITHER text
  inside a part lost when OR came; bullets merged into the line above; "Question 11(c) is printed..." not
  furniture; data pages after the last question (held back in a `tail`, kept only if a label, marks or option
  follows); marks of a question without parts were dropped (`ownMarks`).
- Fixed in the typesetter/equations: `\ignorespaces#2` and a body ending in a command word ran into the next word
  (`\ignorespacesthe`, unknown command, words lost); the blank after `\relax` closing a \dimexpr printed a space
  (\ruleat 2.9bp off); a macro that expands without end now passes; to-math wrote `\;` as `;`; a space was put
  before a script ("I 2R"); a fraction now takes the index of a letter in its top/bottom (V_1 was outside);
  a bullet set large and lowered joins the line its middle is on; a bar under words left unread passes as
  `lost-underline`.
- Physics vs baseline: 38 questions differ; all are equal or better (Section B / pages after \total no longer
  appended, EITHER/OR as decided, sin 41° as \sin) EXCEPT `R = V/I` where the I is `\swf{ptm}{12.08}{I}` (upright
  Times in the LaTeX): we give `\dfrac{V}{\mathrm{I}}`, the old reader forced it italic. Not yet checked on the PDF.
- Known wrong, not flagged: nuclides from \nuc / small print (`157N` for 15/7 N), both readers.
- Test notes for the tester: text.test "a label with kerns between its brackets and its letter" wants only 3(c)
  though its fixture prints `\lab{..}{(d)}` too (test mistake?); extractor.test "a picture of a size no table
  knows" uses a 25x22bp picture, which `isDrawing` (>=18x14) takes as a drawing set in the line (a figure).

### Later in the third session
- Underlines: a run of words under which a bar starts or ends is cut into words (AFM widths scaled to the run,
  cut only if it lands within 1.5bp of a word edge); "something under the bar" now means touching it (top within
  0.25em), not the next line of text. 5054 S17 11 Q2: 3 of 4 underlines read, the line passes `lost-underline`.
- No space between typed maths and a "(" that the rough maths width puts inside it.
- check-papers furniture check: only real furniture (BLANK PAGE, "The Periodic Table of Elements", "Turn over",
  a lone "Section B", "is printed on the next page", "Notes for use in", rubrics), not mentions.

### check-papers, end of third session (clean / rebuilt / passed / suspicious; questions)
- Physics 865: 841 / 23 / 1 (lost-underline) / 206 (all mcq-figure, same 206 as the baseline). 38 differ from
  baseline, all equal or better except V/\mathrm{I} (see above).
- Chemistry 1697: 1616 / 78 / 3 (1 unknown-symbol, 2 lost-underline) / 352 (344 mcq-figure = baseline, 2 mcq-not-4,
  6 marks). 471 differ from baseline; sampled: Cl/I/II/KI pictures now read, Section headings and "A1" labels gone,
  bullets read. Not yet reviewed in full.
- Add Maths 946: 390 / 91 / 465 (423 unknown-symbol, 68 unknown-shape, ...) / 6 (katex-answer). Not reviewed.
- 0 crashes, 0 leaked lengths or commands, 0 KaTeX failures in question text.

## Next (writer)
1. Chemistry review of `_diff-vs-baseline.txt` (step 5): C8H18/photosynthesis index order (2 tests), two-column
   lines, the 6 marks mismatches, 2 MCQs without 4 options.
2. Nuclides from \nuc / small print as ${}^{15}_{7}\mathrm{N}$ (Physics and Chemistry).
3. Add Maths readers in MathsExtractor.readers(): modulus posts (4 tests), brackets, matrices; the 37x empty
   `unknown-shape` passes.
4. Decide with the coordinator whether \swf{ptm}{..}{I} (upright serif I) is italic on the page.

### Last changes (third session, after review)
- check-papers baseline compare now collapses whitespace instead of deleting it, and counts "only in spacing"
  separately; it also counts questions without an attached answer (0 in all three subjects).
- Scripts: no space before a script EXCEPT the first of a stacked pair (nuclide numbers); no word space between
  a stacked pair and the symbol after it (gap < 0.25em); answer dots keep their space after "=".
- QuestionBuilder passes `unknown-command` on any command left in a paragraph other than the ones it writes
  (textbf, textit, underline, textsuperscript, textsubscript, newline, qfig): inlineToHtml drops unknown ones
  silently. 0 found over 221 papers.
- `QuestionDraft` (the argument of classify/check) is exported.
- Physics vs baseline now 41 differ (3 only in spacing: "I t" -> "It", "23793 Np" -> "23793Np", "$\dfrac{m}{V}$ ." ->
  "...$."), all reviewed: equal or better except V/\mathrm{I}.
- round1 -> final, text removed from last questions was checked: only furniture (Chemistry paper 4 notes pages,
  "Question 12(b) is printed on the next page", "Continuation of working space").
