/* =====================================================================
   School Wits — render/QuestionRenderer
   The one class the pages talk to.

   This is the adapter boundary. app.js reads exactly three things off a
   question today — qHTML, markScheme[], exemplarHTML — so this exposes
   those three and nothing else changes on screen:

       const r = new SWRender.QuestionRenderer();
       r.toQuestionHtml(q)     // was q.qHTML
       r.toMarkSchemeRows(q)   // was q.markScheme
       r.toExemplarHtml(q)     // was q.exemplarHTML

   Collaborators are injected so a view can swap one (hide marks in the
   storefront teaser, show guidance in an admin view) without subclassing
   or touching the others.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  class QuestionRenderer {
    constructor(options) {
      const opts = options || {};
      this.blocks = opts.blockRenderer || new ns.BlockRenderer(opts);
      this.parts = opts.partRenderer || new ns.PartRenderer(
        Object.assign({ blockRenderer: this.blocks }, opts)
      );
      this.options = opts.optionsRenderer || new ns.OptionsRenderer(opts);
      this.markScheme = opts.markSchemeRenderer || new ns.MarkSchemeRenderer(opts);
      this.solution = opts.solutionRenderer || new ns.SolutionRenderer(opts);
      this.emptyMessage = opts.emptyQuestionMessage ||
        'No question text was parsed from the uploaded file.';
    }

    /** Stem, then options (MCQ) or parts (structured). */
    toQuestionHtml(question) {
      if (!question) return this._empty();

      let html = this.blocks.renderAll(question.stem);
      html += this.options.render(question.options);
      html += this.parts.renderAll(question.parts);

      return html || this._empty();
    }

    toMarkSchemeRows(question) {
      return this.markScheme.toRows(question);
    }

    toMarkSchemeHtml(question) {
      return this.markScheme.renderTable(question);
    }

    toExemplarHtml(question) {
      return this.solution.render(question);
    }

    /**
     * Everything a card needs, for views that would otherwise call all
     * three and re-derive the header fields themselves.
     */
    toCard(question) {
      return {
        number: question ? question.number : null,
        topic: question ? question.topic : '',
        marks: question ? question.marks : 0,
        kind: question ? question.kind : 'structured',
        questionHtml: this.toQuestionHtml(question),
        markSchemeRows: this.toMarkSchemeRows(question),
        exemplarHtml: this.toExemplarHtml(question)
      };
    }

    _empty() {
      return '<p><i>' + ns.escapeHTML(this.emptyMessage) + '</i></p>';
    }
  }

  ns.QuestionRenderer = QuestionRenderer;

  /** Convenience shared instance for pages that need no customisation. */
  ns.defaultRenderer = function () {
    if (!ns._default) ns._default = new QuestionRenderer();
    return ns._default;
  };
})(window.SWRender);
