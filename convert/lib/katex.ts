import renderMathInElement from "katex/contrib/auto-render";

// Macros the exam papers define in their own LaTeX preambles. The parser strips
// preambles, so KaTeX has to be taught the same definitions. Never override a
// KaTeX built-in here: \textbf once mapped to \mathbf and broke every \text{}.
const MACROS: Record<string, string> = {
  "\\dd": "\\mathrm{d}",
  "\\dydx": "\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}",
  "\\ncr": "{}^{#1}\\mathrm{C}_{#2}",
  "\\npr": "{}^{#1}\\mathrm{P}_{#2}",
  "\\cosec": "\\operatorname{cosec}",
  "\\pow": "^{#1}",
  "\\dg": "^{\\circ}",
  "\\degC": "^{\\circ}\\mathrm{C}",
  "\\ohms": "\\Omega",
  "\\textperiodcentered": "\\cdot",
};

// Both TeX conventions, because the papers use both. Longer delimiters come
// first so $$ is never mistaken for an empty $...$.
const DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "\\(", right: "\\)", display: false },
  { left: "$", right: "$", display: false },
];

// throwOnError is false so one bad expression degrades to red source text
// instead of taking down the rest of the page.
export function renderMath(el: HTMLElement | null) {
  if (!el) return;
  renderMathInElement(el, { delimiters: DELIMITERS, macros: MACROS, throwOnError: false });
}
