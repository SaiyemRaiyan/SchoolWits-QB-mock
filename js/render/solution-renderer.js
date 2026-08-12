/* =====================================================================
   School Wits — render/SolutionRenderer
   Worked-solution segments -> the exemplar HTML the UI expects.

   app.js drops this straight into .exemplar-box, which the stylesheet
   already handles, so the output is a plain fragment rather than a
   wrapper of its own.

   Segments are keyed to the same refs as the mark scheme ("1(c)(ii)"),
   which is what makes it possible to show a part's solution next to its
   marks later. Segments with a null ref (typical for MCQ, which has one
   undivided explanation) simply render without a heading.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  class SolutionRenderer {
    constructor(options) {
      const opts = options || {};
      this.emptyMessage = opts.emptyMessage ||
        'No exemplar answer uploaded for this question.';
    }

    render(question) {
      const segments = this._segmentsOf(question);
      if (!segments.length) {
        return '<p><i>' + ns.escapeHTML(this.emptyMessage) + '</i></p>';
      }

      const correct = question && question.answer ? question.answer.correct : null;
      let html = '';

      // For MCQ the letter is the answer, so it leads rather than hiding at
      // the end of the explanation.
      if (correct) {
        html += '<p class="exemplar-correct"><strong>Answer: ' +
                ns.escapeHTML(correct) + '</strong></p>';
      }

      html += segments.map((seg) => this._segment(seg)).join('');
      return html;
    }

    _segment(seg) {
      let out = '<div class="exemplar-part">';
      const label = this._label(seg);
      if (label) out += '<h4 class="exemplar-head">' + label + '</h4>';
      out += '<div>' + (seg.html || '') + '</div>';
      return out + '</div>';
    }

    /**
     * "1(c)(ii) — Why It Becomes Zero", with either half optional. The ref
     * is escaped (it is a plain string); the heading is already an HTML
     * fragment from the parser and may contain math.
     */
    _label(seg) {
      const ref = seg.ref ? ns.escapeHTML(seg.ref) : '';
      const heading = seg.heading || '';
      if (ref && heading) return ref + ' — ' + heading;
      return ref || heading;
    }

    _segmentsOf(question) {
      if (!question || !question.answer) return [];
      const segs = question.answer.workedSolution;
      return Array.isArray(segs) ? segs : [];
    }
  }

  ns.SolutionRenderer = SolutionRenderer;
})(window.SWRender);
