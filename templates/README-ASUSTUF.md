# `.tex` paper format — spec, template and audit

What the files in `Updated Latex FIles For Web/` actually look like, and
what has to be true before they can be parsed into JSON.

- `question-paper.template.tex` — canonical QP, with an annotated
  structured question and an MCQ question.
- `answer-paper.template.tex` — canonical QA, with an annotated mark
  scheme and worked solution.

Copy a template, keep the preamble identical, write only between
`\begin{document}` and `\end{document}`.

## The shape of a paper

Every paper is **two files in one folder**, plus its figures:

```
Physics MJ25 21/
  Physics S25QP21.tex     ← question paper
  Physics S25QA21.tex     ← answers + mark scheme
  5054_21_M_J_25_fig1.png
  5054_21_M_J_25_fig2.png
```

The two files are joined by a single command that appears in **both**,
character for character:

```latex
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{9}
%      └ paper id ────┘ └n┘ └ topics, joined by \textperiodcentered ──────────────┘ └marks┘
```

`\examq` is the **only** question delimiter. Everything between one
`\examq` and the next belongs to that question. The paper id decomposes
as `<code>/<paper><variant>/<session>/<year>` — so `5054/21/M/J/25` is
Physics, paper 2, variant 1, May/June 2025.

## What a question looks like

A **structured** question — stem, then figure, then lettered parts, some
with roman subparts, closed by `\total`:

```latex
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{9}
Fig. 1.1 shows a skydiver falling vertically through the air.

\qfig[0.42\linewidth]{5054_21_M_J_25_fig1.png}{Fig. 1.1}

In the first part of the fall, her speed increases and her acceleration decreases.

\begin{parts}
  \item On Fig. 1.2 sketch the speed--time graph for the skydiver.
  \qfig[0.55\linewidth]{5054_21_M_J_25_fig2.png}{Fig. 1.2}
  \markright{[2]}

  \item Explain how the graph shows that the acceleration decreases.
  \Alines{3}{[1]}

  \item During the first part of the fall, there is a resultant force downwards.
  \begin{subparts}
    \item State the name of the other vertical force.
    \Alines{1}{[1]}
    \item Explain why the resultant vertical force eventually becomes zero.
    \Alines{4}{[2]}
  \end{subparts}
\end{parts}
\total
```

Part letters `(a) (b) (c)` and subpart numerals `(i) (ii)` are **never
written in the source** — `enumitem` generates them from position. A
parser has to do the same to reconstruct the `1(c)(ii)` refs the mark
scheme uses.

An **MCQ** question — no parts, no `\total`, marks always 1:

```latex
\examq{5054/11/M/J/25}{7}{Momentum (Dynamics)}{1}
What is a unit for momentum?

\begin{choices}
  \item kg\,m\,/\,s
  \item kg\,m\,/\,s\pow{2}
  \item N\,m
  \item N\,/\,m\pow{2}
\end{choices}
```

## What an answer looks like

The QA file repeats the identical `\examq`, then gives a mark scheme grid
and a worked solution:

```latex
\examq{5054/21/M/J/25}{1}{Motion or Kinematics \textperiodcentered\ Forces or Dynamics}{9}

\begin{mstab}{q1color}
 & curve upwards with decreasing gradient labelled A & B1 \\ \cline{2-3}
\multirow{-2}{1.9cm}{1(a)} & horizontal line labelled B & B1 \\ \hline
1(b) & gradient decreases \newline or \newline speed increase less at later times & B1 \\ \hline
1(c)(i) & air resistance / drag & B1 \\ \hline
\end{mstab}

\begin{ansbox}{q1color}
(a) Speed--Time Graph\\[4pt]
Draw a curve that starts at the origin, rises steeply ...
\end{ansbox}
```

Two conventions worth knowing before writing a row parser:

- **A part worth *n* marks is *n* rows.** They share one label, written
  on the **last** row of the group as `\multirow{-n}{1.9cm}{1(a)}`; the
  rows above start with an empty first cell. The negative count and the
  reversed placement are a deliberate workaround for a
  `multirow`/`columncolor` clipping bug, not a mistake. A parser must
  carry the label *upward*, not downward.
- `\cline{2-3}` separates rows **within** a part; `\hline` closes the
  part. That is the only signal for where one part's rows end.

Part refs in column 1 are uniform across all six papers: `N`, `N(a)`,
`N(a)(i)` — no spaces, no `Q` prefix.

## Macro reference

| Macro | Meaning | Carries content? |
|---|---|---|
| `\examq{id}{n}{topics}{marks}` | question header, the join key | **yes** |
| `\begin{parts}` / `\item` | lettered parts `(a) (b)` | yes |
| `\begin{subparts}` / `\item` | roman subparts `(i) (ii)`, only nested inside a part | yes |
| `\begin{choices}` / `\item` | MCQ options `A B C D` | yes |
| `\qfig[width]{file}{caption}` | figure; caption may be `{}` | yes |
| `\total` | prints the marks stored by `\examq`; takes no argument | no |
| `\markright{[2]}` | mark tag for a part with no ruled space | marks only |
| `\Alines{lines}{[marks]}` | *n* ruled answer lines | marks only |
| `\ansval{label}{unit}{[marks]}` | labelled value line, e.g. `x = ..... [2]` | marks only |
| `\plainline`, `\labelline{...}` | bare ruled lines | no |
| `\begin{mstab}{qNcolor}` | mark scheme grid | yes |
| `\begin{ansbox}{qNcolor}` | worked solution | yes |

`\Alines`, `\ansval`, `\plainline`, `\labelline` and `\markright` exist
only to make writing space in the printed PDF. For JSON, take the mark
value and discard the layout.

## Uniformity audit

I checked all 12 files. **The skeleton is solid; the leaves are not.**

Uniform across all six papers:

- `\examq` count matches exactly between QP and QA in every paper
  (12/12, 11/11, 23/23, 24/24, 40/40, 9/9).
- All six QP preambles define the same macro set with the same
  signatures. Differences are additive only (Add Maths adds `\dd`,
  `\dydx`, `\ncr`, `\npr`, `\cosec`; the MCQ paper adds `choices`).
- `\total` count equals question count in all five structured papers.
- Mark-scheme part refs use one format throughout.

### Issue 1 — MCQ options are written four different ways

`Physics S25QP11.tex` has 40 questions using four incompatible
encodings:

| Encoding | Questions | Parseable? |
|---|---|---|
| `\begin{choices}` | 3, 4, 9, 13, 14, 15, 16, 18, 21, 24, 26, 33, 36, 37, 40 (15) | yes |
| inline `\textbf{A}\hspace{...}` | 2, 7, 8, 20, 27, 28, 30, 31, 35, 38 (10) | fragile |
| bare `tabular` | 1, 10, 11, 15, 17, 22, 25, 29, 32, 34, 39 (11) | hard |
| **none — options only inside the figure** | 5, 6, 12, 19, 23 (5) | **impossible** |

Q15 uses *two* encodings at once. The five figure-only questions cannot
be extracted at any effort level: the options exist as pixels. Those
need their options re-authored as text.

**This is the main blocker for MCQ papers.** Standardise on
`\begin{choices}`.

### Issue 2 — the mark-scheme table has two different column counts

| Papers | Columns | Row separator |
|---|---|---|
| Physics 5054/11, 5054/21 | 3 — Question, Answer, Marks | `\cline{2-3}` |
| Add Maths 4037/11, 4037/21, Maths D 4024/12, 4024/22 | 4 — + Partial Marks / Guidance | `\cline{2-4}` |

The invocation is identical (`\begin{mstab}{qNcolor}`) in all 82 uses, so
a parser **cannot tell the arity from the call site** — it has to read
the `\newenvironment` definition in the preamble, or count cells per row.
Add Maths 4037/21 also contains a stray `\cline{2-2}`.

### Issue 3 — 44 of 59 figures are missing

Only `fig1`–`fig3` were ever committed; every reference above that is a
dangling filename. `\qfig` degrades to a grey box in the PDF, which is
why this has gone unnoticed.

| Paper | Referenced | On disk | Missing |
|---|---|---|---|
| Add Maths MJ25 11 | 2 | 2 | 0 |
| Add Maths MJ25 21 | 3 | 3 | 0 |
| Maths D MJ25 12 | 12 | 2 | **10** |
| Maths D MJ25 22 | 12 | 2 | **10** |
| Physics MJ25 11 | 17 | 3 | **14** |
| Physics MJ25 21 | 13 | 3 | **10** |

### Issue 4 — one topic string differs between QP and QA

`Maths D 4024/22`, questions 18 and 20: the QP writes
`\textperiodcentered\` while the QA writes `\,\textperiodcentered\,`.
Since the `\examq` line is the join key, these two questions will not
match on a byte comparison. Either normalise whitespace before joining,
or fix the source (one-line fix, and the better option).

### Issue 5 — MCQ answers have no mark scheme

`Physics S25QA11.tex` has 40 `ansbox` and **zero** `mstab`. The correct
letter is not recorded in any structured field — it has to be read out of
the prose. Worth adding an explicit `\answer{A}` macro.

## On the JSON target

Before designing the JSON schema, read `backend/CLAUDE.md`. The Supabase
schema deliberately stores **what the parser produces today (rendered
HTML blobs)**, not a structured representation, and `CLAUDE.md` warns
against inventing structured content fields without revisiting that
decision first. Parsing these `.tex` files into structured JSON is a
change to that contract, not just a parser improvement — it should be an
explicit decision, not a side effect.

The natural envelope, once that call is made: a `paper` object carrying
the decomposed `\examq` paper id, and a `questions` array where each
entry has `number`, `kind` (`structured` | `mcq`), `topics[]`, `marks`, a
`stem` block list, a recursive `parts`/`subparts` tree with generated
`(a)`/`(i)` refs, and an `answer` object holding `markScheme` rows keyed
by those same refs plus the worked solution. The refs are what stitch the
QP and QA halves together, so generating them correctly from list
position is the core of the job.
