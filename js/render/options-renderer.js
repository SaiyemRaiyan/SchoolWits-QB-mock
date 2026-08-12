/* =====================================================================
   School Wits — render/OptionsRenderer
   Multiple-choice options -> HTML.

   The parser records HOW the options were written in `options.source`,
   because the source papers use four incompatible encodings. That matters
   on screen for exactly one case: `figure`, where the options exist only
   as pixels inside the image and there is nothing to list. Rendering an
   empty option list there would look like a bug, so it says so instead.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  class OptionsRenderer {
    constructor(options) {
      const opts = options || {};
      this.figureNote = opts.figureNote ||
        'The answer options are part of the figure above.';
    }

    render(optionsObj) {
      if (!optionsObj) return '';

      const items = Array.isArray(optionsObj.items) ? optionsObj.items : [];
      if (!items.length) {
        return optionsObj.source === 'figure'
          ? '<p class="mcq-note"><i>' + ns.escapeHTML(this.figureNote) + '</i></p>'
          : '';
      }

      // Reuses .qpart--choice, the class js/latex.js gave lettered options.
      const rows = items.map((item) =>
        '<div class="qpart qpart--sub qpart--choice">' +
        '<span class="pmark">' + ns.escapeHTML(item.label) + '</span>' +
        '<div>' + (item.content || '') + '</div>' +
        '</div>'
      ).join('');

      return '<div class="mcq-options" data-source="' +
             ns.escapeAttr(optionsObj.source || '') + '">' + rows + '</div>';
    }
  }

  ns.OptionsRenderer = OptionsRenderer;
})(window.SWRender);
