/* =====================================================================
   School Wits — render/BlockRenderer
   Content blocks (text / figure / table) -> HTML.

   The markup here deliberately matches what the previous parser emitted,
   because css/style.css already styles those exact classes (.qfig,
   .imgmissing, .datatable). Changing the shape means changing the
   stylesheet too — the whole point of this pass is that the UI does not
   move.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  class BlockRenderer {
    /**
     * @param {object} [options]
     * @param {string} [options.missingImageLabel] shown when a figure has
     *   no resolved src. That is a normal state — most source papers ship
     *   without their figures — so it renders as a note, not an error.
     */
    constructor(options) {
      const opts = options || {};
      this.missingImageLabel = opts.missingImageLabel || 'Image not uploaded';
    }

    /** @param {Array} blocks @returns {string} */
    renderAll(blocks) {
      if (!Array.isArray(blocks)) return '';
      return blocks.map((block) => this.render(block)).join('');
    }

    render(block) {
      if (!block || !block.type) return '';
      switch (block.type) {
        case 'text':
          return this.renderText(block);
        case 'figure':
          return this.renderFigure(block);
        case 'table':
          return this.renderTable(block);
        default:
          return '';
      }
    }

    /**
     * `html` is already an HTML fragment with raw LaTeX math left in it by
     * the parser, so it is inserted verbatim for KaTeX to pick up.
     */
    renderText(block) {
      const html = block.html || '';
      return html ? '<p>' + html + '</p>' : '';
    }

    renderFigure(block) {
      const file = (block.file || '').trim();
      const caption = (block.caption || '').trim();
      const src = block.src || '';
      // data-missing lets the stylesheet dim the placeholder without the
      // renderer needing to know anything about presentation.
      const missing = src ? '' : ' data-missing="1"';
      const alt = ns.escapeAttr(caption || file);

      let out = '<figure class="qfig"' + missing + '>';
      out += '<img src="' + ns.escapeAttr(src) + '" alt="' + alt + '">';
      if (!src) {
        out += '<div class="imgmissing">' + ns.escapeHTML(this.missingImageLabel) +
               ': ' + ns.escapeHTML(file) + '</div>';
      }
      if (caption) out += '<figcaption>' + caption + '</figcaption>';
      return out + '</figure>';
    }

    /** Tables arrive as finished HTML from the parser; only the class is ours. */
    renderTable(block) {
      const html = block.html || '';
      if (!html) return '';
      return html.indexOf('class=') === -1
        ? html.replace(/^<table/, '<table class="datatable"')
        : html;
    }
  }

  ns.BlockRenderer = BlockRenderer;
})(window.SWRender);
