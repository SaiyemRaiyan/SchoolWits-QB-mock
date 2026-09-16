/* =====================================================================
   School Wits — site navigation

   Home · <subject titles> · Browse

   The subject links are DATA, not markup: they come from the `syllabuses`
   table (see migration 0015), so adding Cambridge IGCSE Physics is an
   INSERT and every page's nav picks it up on next load. That is why this
   renders at runtime instead of being copied into each page's HTML — with
   no bundler, a shared <script> is the only way three static pages can
   share one nav.

   Only subjects that actually have papers are listed. A subject with none
   would navigate to an empty Browse result, which reads as a broken link.
   ===================================================================== */

window.SWNav = (function () {
  'use strict';

  /** Deep link into the student portal, pre-filtered to one syllabus. */
  function browseHref(code) {
    return 'home.html?code=' + encodeURIComponent(code);
  }

  /**
   * @param {string} current  'home' | 'browse' | 'upload' | 'modules' | a syllabus code
   */
  async function render(current) {
    const nav = document.getElementById('siteNav');
    if (!nav) return;

    // The nav must draw even if the query fails — an offline or erroring
    // database should not leave the user with no way off the page.
    let withPapers = [];
    try {
      ({ withPapers } = await DB.getSyllabuses());
    } catch (err) {
      console.error('Nav: could not load syllabuses —', err);
    }

    const link = (href, label, isActive) =>
      '<a href="' + href + '"' + (isActive ? ' class="active"' : '') + '>' + escapeHtml(label) + '</a>';

    // Two entry points, one interface:
    //   Home   the student portal — read-only
    //   Browse the same UI for admins, with write controls
    // Subject links used to sit between them, one per syllabus. They were
    // removed because both pages pick subject from their own dropdown, so
    // the nav was restating a choice the page already offers.
    let html = link('home.html', 'Home', current === 'home');
    html += link('index.html', 'Browse', current === 'browse');

    nav.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render, browseHref };
})();
