/* =====================================================================
   School Wits — KaTeX configuration
   The one place that decides how stored LaTeX gets rendered to math.

   This exists because the macro table and delimiter list used to be
   copy-pasted into every page that called renderMathInElement(), held
   together by a "kept in sync" comment. They drifted: the upload preview
   had no macros at all (so \dd and \cosec rendered as errors there while
   looking fine on Browse), and a bad \textbf override had to be found and
   fixed three separate times. One copy, loaded by every page instead.
   ===================================================================== */

window.SWKatex = (function () {
  'use strict';

  // Macros the exam papers define in their own LaTeX preambles
  // (\newcommand{\dd}{...} etc.). The parser strips preambles as
  // non-content, so KaTeX has to be taught the same definitions to render
  // \dd, \dydx, \ncr{}{}, \npr{}{}, \cosec, \pow{}, \dg, \degC and \ohms
  // wherever they appear inside math.
  //
  // Only add a macro here if the papers actually define it. KaTeX's own
  // built-ins must be left alone: \textbf, \textit and \texttt were once
  // mapped to \mathbf/\mathit/\mathtt, which are math-mode-only, so
  // \text{\textbf{i} components: } became a parse error and KaTeX dropped
  // the whole surrounding \[...\] block to raw source.
  const MACROS = {
    '\\dd': '\\mathrm{d}',
    '\\dydx': '\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}',
    '\\ncr': '{}^{#1}\\mathrm{C}_{#2}',
    '\\npr': '{}^{#1}\\mathrm{P}_{#2}',
    '\\cosec': '\\operatorname{cosec}',
    '\\pow': '^{#1}',
    '\\dg': '^{\\circ}',
    '\\degC': '^{\\circ}\\mathrm{C}',
    '\\ohms': '\\Omega',
    '\\textperiodcentered': '\\cdot'
  };

  // Both TeX conventions, because papers use both: \[...\] and $$...$$ for
  // display, \(...\) and $...$ for inline. Longer delimiters come first so
  // $$ is never mistaken for an empty $...$.
  const DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
    { left: '$', right: '$', display: false }
  ];

  /**
   * Renders every math span inside `el`, in place. Safe to call when KaTeX
   * has not loaded (offline, blocked CDN) — the page then shows raw LaTeX
   * rather than breaking.
   *
   * throwOnError is false so one bad expression degrades to red source text
   * instead of taking down the rest of the page. That does mean a broken
   * macro fails quietly, which is exactly how the \textbf bug survived —
   * check the console for KaTeX warnings when math looks wrong.
   */
  function renderMathIn(el) {
    if (!el || typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(el, {
      delimiters: DELIMITERS,
      macros: MACROS,
      throwOnError: false
    });
  }

  return { MACROS, DELIMITERS, renderMathIn };
})();
