/* =====================================================================
   School Wits — render/PartRenderer
   The parts/subparts tree -> nested HTML.

   The parser already generated the labels ("a", "i") and the full refs
   ("1(c)(ii)"), so nothing here counts or letters anything — it only
   presents what is on the node. That is the whole benefit of the
   structured shape: numbering was decided once, at parse time, where the
   mark scheme could be keyed to it.

   Markup matches what the previous parser emitted — .qpart / .qpart--sub
   with a .pmark label — because css/style.css styles those already.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  // Cycled per part (and independently per subpart list) so a question
  // with several parts reads as a coherent, colour-coded set rather than
  // one flat block — mirrors the per-question accent used in full-paper view.
  const PART_ACCENTS = ['#2F6FB3', '#1D8A5C', '#B9762A', '#8B4FB0', '#C0392B', '#1A9E96', '#7A6A1E', '#4A5568'];

  class PartRenderer {
    /**
     * @param {object} [options]
     * @param {SWRender.BlockRenderer} [options.blockRenderer]
     * @param {boolean} [options.showMarks] render the [2] badge after a part
     */
    constructor(options) {
      const opts = options || {};
      this.blocks = opts.blockRenderer || new ns.BlockRenderer();
      this.showMarks = opts.showMarks !== false;
    }

    renderAll(parts) {
      if (!Array.isArray(parts)) return '';
      return parts.map((part, i) => this.render(part, false, i)).join('');
    }

    /**
     * @param {object} part
     * @param {boolean} isSub nested one level down — only affects styling
     * @param {number} index position among its siblings — picks the accent
     */
    render(part, isSub, index) {
      if (!part) return '';
      const cls = isSub ? 'qpart qpart--sub' : 'qpart';
      const accent = PART_ACCENTS[(index || 0) % PART_ACCENTS.length];

      let body = this.blocks.renderAll(part.content);
      if (this.showMarks) body += this.renderMarks(part);
      // Subparts nest INSIDE the parent's body, so (c)(i) sits visually
      // under (c) rather than becoming a sibling of it.
      if (Array.isArray(part.subparts) && part.subparts.length) {
        body += part.subparts.map((sub, i) => this.render(sub, true, i)).join('');
      }

      return '<div class="' + cls + '" style="--paccent:' + accent + '">' +
             '<span class="pmark">(' + ns.escapeHTML(part.label) + ')</span>' +
             '<div>' + body + '</div>' +
             '</div>';
    }

    /**
     * A part that only groups subparts carries their summed marks; showing
     * the badge there too would double-count on screen, so it is skipped.
     */
    renderMarks(part) {
      const hasSubparts = Array.isArray(part.subparts) && part.subparts.length > 0;
      if (hasSubparts || part.marks === null || part.marks === undefined) return '';
      return '<span class="marktag">' + ns.escapeHTML(part.marks) + '</span>';
    }
  }

  ns.PartRenderer = PartRenderer;
})(window.SWRender);

