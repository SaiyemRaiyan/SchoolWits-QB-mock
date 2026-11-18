/* =====================================================================
   School Wits — render/MarkSchemeRenderer
   Structured mark-scheme rows -> the shape the UI already consumes.

   app.js renders mark schemes from an array of
   { part, answer, marks, isBanner }. The structured rows carry richer
   fields (ref, code, alternatives, guidance, banner), so this class is the
   adapter between them. Keeping the old field names is deliberate — it is
   what lets the Browse and paper-document views stay untouched.
   ===================================================================== */

window.SWRender = window.SWRender || {};

(function (ns) {
  'use strict';

  class MarkSchemeRenderer {
    constructor(options) {
      const opts = options || {};
      // Guidance is a 4-column-paper extra (Add Maths, Maths D). Physics
      // papers have none, so this is off unless a view asks for it.
      this.showGuidance = opts.showGuidance === true;
      // OFF by default, and that is not an oversight: `answer` is the whole
      // authored cell, which already reads "X or Y", while `alternatives`
      // is a split of that same cell. Rendering both prints Y twice. The
      // split exists for machine use (matching a student's answer later),
      // not for display — turn this on only in a view that shows the forms
      // as a list INSTEAD of the raw cell.
      this.showAlternatives = opts.showAlternatives === true;
    }

    /**
     * @returns {Array<{part:string, answer:string, marks:string, isBanner:boolean}>}
     *   The legacy row shape app.js already knows how to draw.
     */
    toRows(question) {
      const rows = this._rowsOf(question);
      return rows.map((row) => ({
        part: row.banner ? '' : (row.ref || ''),
        answer: this._answerHtml(row),
        marks: row.banner ? '' : this._markLabel(row),
        isBanner: row.banner === true
      }));
    }

    /**
     * The mark cell as the official mark scheme writes it: "B1", "M1",
     * "A2" — the letter is the point, not decoration. It tells a candidate
     * HOW the mark is earned (M = method, A = accuracy, B = independent),
     * which is what O/A-Level students are taught to read a mark scheme
     * for. `marks` is the digit parsed out of that same code and is what
     * sums to a question total, so it stays the source for totals (see
     * q.marks in app.js) and is only the fallback here — some rows carry a
     * count with no letter.
     *
     * Stays a string: the old records sometimes held labels, not numbers.
     */
    _markLabel(row) {
      if (row.code) return row.code;
      return String(row.marks == null ? '' : row.marks);
    }

    /** Full <table> for views that draw the mark scheme themselves. */
    renderTable(question) {
      const rows = this.toRows(question);
      if (!rows.length) {
        return '<table class="mstable"><tbody><tr><td colspan="3">' +
               '<i>No mark scheme uploaded for this question.</i></td></tr></tbody></table>';
      }

      const body = rows.map((row) => row.isBanner
        ? '<tr class="ms-banner-row"><td colspan="3">' + row.answer + '</td></tr>'
        : '<tr><td>' + ns.escapeHTML(row.part) + '</td><td>' + row.answer +
          '</td><td>' + ns.escapeHTML(row.marks) + '</td></tr>'
      ).join('');

      return '<table class="mstable">' +
             '<thead><tr><th>Part</th><th>Expected answer</th><th>Mark</th></tr></thead>' +
             '<tbody>' + body + '</tbody></table>';
    }

    _rowsOf(question) {
      if (!question || !question.answer) return [];
      const rows = question.answer.markScheme;
      return Array.isArray(rows) ? rows : [];
    }

    /**
     * The answer cell, plus the extras the structured shape gained.
     * `alternatives` holds every acceptable form INCLUDING the first, which
     * is already in `answer` — so it is sliced to avoid printing it twice.
     */
    _answerHtml(row) {
      let html = row.answer || '';

      if (this.showAlternatives && Array.isArray(row.alternatives) && row.alternatives.length > 1) {
        const rest = row.alternatives.slice(1)
          .map((alt) => '<li>' + alt + '</li>').join('');
        if (rest) html += '<ul class="ms-alternatives">' + rest + '</ul>';
      }

      if (this.showGuidance && row.guidance) {
        html += '<div class="ms-guidance">' + row.guidance + '</div>';
      }

      return html;
    }
  }

  ns.MarkSchemeRenderer = MarkSchemeRenderer;
})(window.SWRender);
