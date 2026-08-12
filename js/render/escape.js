/* =====================================================================
   School Wits — render/escape
   Shared escaping helpers for the JSON -> HTML renderer.

   Plain JS on purpose: the frontend has no build step (see CLAUDE.md), so
   these load as ordinary <script> tags like js/supabase/* already do.
   Everything attaches to one window.SWRender namespace.

   NOTE ON MATH: the parser leaves $...$ / \[...\] as raw LaTeX inside the
   `html` fields, and KaTeX renders them after insertion. So renderer output
   is inserted as-is and never re-escaped — escaping here is only for values
   that came from OUTSIDE an html field (filenames, captions, labels).
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/"/g, '&quot;');
  }

  ns.escapeHTML = escapeHTML;
  ns.escapeAttr = escapeAttr;
})(window.SWRender);
