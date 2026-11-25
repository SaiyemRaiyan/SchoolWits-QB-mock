# The paper extractor

One system reads every paper of every subject. It replaces the
command-by-command reader in `backend/src/latex/layout.ts`, whose hand-written
command list broke on each new batch of papers.

## Why it can be generic

Measured over 221 papers (46 Physics 5054, 91 Chemistry 5070, 84 Add Maths
4037): 101 commands in total. 39 are the author's own and **every file defines
them in its preamble**, in terms of a few primitives (raise, shift, resize, set
in a font, cut from the PDF). So the extractor reads those definitions instead
of keeping a list.

## Patterns

| Pattern | Where | Why |
|---|---|---|
| Template Method | `PaperExtractor.extract()` | The steps and their order never change; a subject overrides single steps |
| Factory | `createExtractor(source)` | Picks the class from the paper code in `\examq` |
| Strategy (a chain) | `EquationReader[]` | Try each way of reading; the last one passes and flags |

## Shape

```
PaperExtractor (abstract)                 backend/src/extract/
  extract()  = the template
  ├─ understand()  MacroTable    the file's own definitions
  │                Typesetter    LaTeX -> placed Pieces (types.ts)
  ├─ text()        pieces -> lines -> paragraphs, parts, marks, options
  ├─ equations()   EquationReader chain -> inline LaTeX, or a pass
  ├─ figures()     clips from the PDF
  ├─ symbols()     SymbolReader: picture of a character -> character
  └─ check()       passes -> warnings
PhysicsExtractor / ChemistryExtractor / MathsExtractor / GenericExtractor
```

Answers (`mstab`, `ansbox`) and papers in the documented format keep their
existing readers; the extractor calls them.

## Rules

1. **Nothing paper-specific.** No paper id, no question number, no trim value
   in `src/`. A fix must be a rule that is true of any paper.
2. **A subject class holds only what is about the subject** (chemical formulas,
   EITHER/OR, matrices). If another subject could need it, it is in the base.
3. **Sure or pass.** Anything not certain is a `Pass` with a reason, shown as a
   warning. A wrong equation shown confidently is the worst outcome.
4. **Typed maths is never rewritten.**
5. **Element commands have meaning, not just looks.** `\examq \mcq \stem
   \choice \optrow \row \prow \lab \plab \dotline \dotgrid \qmark \swmark \total
   \qfig \freerow \at \ruleat \newpage ...` are read for their role through one
   declarative table. Every other command is expanded from its definition.
6. **Output contract unchanged**: `ParsedPaper` in `src/latex/types.ts`, plus
   `passes`. The database, the renderer and the edit dialog do not change.
7. No dependencies, no `node:` imports, no DOM in `src/extract/` (it is bundled
   into a Deno Edge Function). Nothing in `lib/` changes.
8. Page furniture (BLANK PAGE, "Question 10 is printed on the next page", the
   Periodic Table / data pages after the last question) is not question text.

## How it is judged

Truth is the **printed PDF page**, never our own output and never the old
reader. A test's expected value is what a person reading the page would type.
`npm run check-papers` runs every paper and reports what is read, passed and
suspicious; a change is better only if that improves with no new wrong text.
