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
