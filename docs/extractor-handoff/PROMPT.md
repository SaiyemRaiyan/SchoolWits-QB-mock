Continue building the generic **PaperExtractor** in this repo, on branch `paper-extractor`. Earlier work stopped part way. You have none of its context, so read these first, in full, in this order:

1. `docs/extractor-handoff/README.md`: state, set-up, known problems
2. `docs/paper-extractor.md`: the design and its 8 rules
3. `backend/src/extract/types.ts`: the contract
4. `docs/extractor-handoff/writer-notes.md` and `docs/extractor-handoff/tester-notes.md`
5. `CLAUDE.md` and `backend/CLAUDE.md`
6. `backend/src/latex/layout.ts`: the current reader. It is being replaced, but it holds working rules for marks, labels, answer lines, options and stacked fractions. Reuse `backend/src/latex/*` where it fits; do not copy it.

## What I want

School Wits Question Bank stores exam questions. The question papers come as LaTeX that copies the printed page: text is placed by position, and many equations are drawn from pieces instead of typed. The current reader is a hand-written list of commands that breaks on every new batch of papers. I am done with fixing subjects one by one.

I want **one object-oriented extractor for every subject**:

- `PaperExtractor`, an abstract base class that does nearly everything: understand the file's own definitions, then text, equations, figures, symbols, check. It carries the paper's properties (code, paper, variant, session, year).
- `PhysicsExtractor`, `ChemistryExtractor`, `MathsExtractor`, `GenericExtractor` inherit it and hold **only what is truly about that subject**.
- Interfaces for everything that can vary (`Extractor`, `EquationReader`, `SymbolReader`).
- Patterns: **Template Method** for the steps, **Factory** (`createExtractor`) to pick the class from the paper code (5054 Physics, 5070 Chemistry, 4037 and 4024 Maths, anything else Generic), **Strategy** for equations: a chain of readers, where the last one **passes**.
- **Pass, don't guess.** An equation it cannot read for certain is flagged with a reason. A wrong equation that looks right is the worst outcome.
- The output shape (`ParsedPaper`, plus `passes`) does not change, so the database, renderer and editor stay as they are.

## Papers

`~/Documents/Question_Papers/{Physics_5054,Chem_5070,Add_Maths_4037}/`: 221 papers, each folder with `*_qp_*.tex`, `*_qa_*.tex`, `*_qp_*.pdf`. Read them in place. Never copy papers into this branch. If the folder is missing, stop and ask me. The body starts at the LAST `\begin{document}`.

## Agents

Use two agents in a loop. You coordinate. Do not use a summarizer.

**WRITER**: writes `backend/src/extract/` and `backend/scripts/`. Never edits tests. Order:
1. `roles.ts`, `bands.ts` and `questions.ts` were just being written when work stopped: check them before trusting them.
2. `paper-extractor.ts`, `physics.ts`, `chemistry.ts`, `maths.ts`, `generic.ts`, `index.ts` (`createExtractor`, `extractPaper`).
3. `scripts/check-papers.ts` and `npm run check-papers`: every paper, totals per subject: clean, rebuilt, passed by reason, and suspicious (leaked lengths or commands, KaTeX failures with the site's macros from `lib/katex.ts`, MCQs without 4 options, marks that do not add up, empty questions, BLANK PAGE or Periodic Table text).
4. Physics end to end. It must be no worse than the current reader.
5. Chemistry end to end: Cl, KI, copper(II), ticks, equilibrium arrows, C8H18 and H2SO4 equations placed in pieces, isotopes, S26 papers 11 and 12 (a whole question in one `\freerow`), two-column lines.
6. Add Maths: brackets, modulus, matrices and vectors, integrals with limits, relations. Pictures of <= and >=, < and >, ( and ), cap and cup have the same size; ideas are in the README. If it cannot be certain, it passes.
7. EITHER/OR marks, page furniture, answer formulas that fail.

**TESTER**: writes `backend/tests/extract/`. Never edits `src/`.
- The truth is the **printed PDF page**. Render it (`pdftoppm`), look at it, and write what it says. Never take an expected value from our own code, old or new.
- `physics`, `chemistry`, `maths`, `text` and `extractor` tests have **never run**. Expect some of them to be wrong. For each failure look at the page again and decide which side is wrong.
- Re-check the values that `tester-notes.md` lists as not fully seen on the page or unsure.
- Wrong and not flagged must fail. Flagging everything must fail too.
- Add what is missing: subclass overriding, `SymbolTable`, and the cases listed in the notes.

**Loop:** writer builds, tester runs and judges, failures go back to the writer, repeat. Stop when what is left is either right or clearly flagged, or when two rounds bring no real improvement; then tell me.

## Rules

- **Do not fake tests to get green.** Green means nothing by itself; fixing things does. Never weaken a right test.
- **Never special-case a paper, question number or trim value.** A fix must be a rule that is true for any paper.
- After every change, check all three subjects, not only the one being fixed.
- Typed maths (`$...$`) is never rewritten.
- `backend/src/extract/` has no dependencies, no `node:` imports and no DOM. Nothing in `lib/` changes.
- Keep the existing 209 tests (`tests/latex`, `tests/render`, `tests/edit`) green.
- Do not switch `parse-paper`, `src/latex/index.ts` or the upload page to the new extractor until I have seen the results and said yes.
- No deploys, no Supabase, no live site, no `npm run build`.
- Commit to `paper-extractor` after each finished step, and push that branch so nothing is lost when the session ends. Never push to or merge into `main` or any other branch, and never force-push. Never commit question papers to this branch.
- Keep `docs/extractor-handoff/writer-notes.md` and `tester-notes.md` up to date as you go, so the work can be picked up again.

## Reporting to me

Use simple language and be short. Give real numbers per subject: read correctly, flagged, wrong. Say which of these were checked against the PDF and which only by the automatic check. Show a few examples as: what the page prints, what the LaTeX says, what we show. Count wrong as wrong, and if you did not check something, say so.

Start by doing the set-up in the README yourself (check the papers are there, install `poppler-utils`, Pillow and numpy if missing, `npm install`, run the tests), tell me in a few lines what state you found, then begin.
