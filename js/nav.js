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

  function isPagesPage() {
    return location.pathname.split('/').includes('pages');
  }

  function appPage(file) {
    return (isPagesPage() ? '' : 'pages/') + file;
  }

  function rootPage(file) {
    return (isPagesPage() ? '../' : '') + file;
  }

  /** Deep link into the student portal, pre-filtered to one syllabus. */
  function browseHref(code) {
    return appPage('home.html') + '?code=' + encodeURIComponent(code);
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
    //   Home   the marketing/gateway page — subject/curriculum picker
    //   Browse the same student/admin UI, with write controls for admins
    // Subject links used to sit between them, one per syllabus. They were
    // removed because both pages pick subject from their own dropdown, so
    // the nav was restating a choice the page already offers.
    let html = link(rootPage('landing.html'), 'Home', current === 'home');
    html += link(appPage('index.html'), 'Browse', current === 'browse');

    nav.innerHTML = html;

    renderAccount();
  }

  /**
   * The signed-in account, and the way back out.
   *
   * Rendered from here rather than written into each page's header for the
   * same reason the nav is: with no bundler, a shared <script> is how four
   * static pages share one control. The container is created on demand, so
   * no page markup has to change.
   *
   * Only drawn when someone is actually signed in. Signing IN happens at
   * the admin gate on the pages that need it, so a permanent "Sign in"
   * button here would be a second, competing entry point.
   */
  async function renderAccount() {
    const host = document.querySelector('.console');
    if (!host) return;

    let box = document.getElementById('siteAccount');
    if (!box) {
      box = document.createElement('div');
      box.id = 'siteAccount';
      box.className = 'console-account';
      host.appendChild(box);
    }

    // Like the syllabus query above: a failure here must not leave the page
    // without its nav, so it degrades to "no account shown".
    let user = null;
    try {
      user = await DB.currentUser();
    } catch (err) {
      console.error('Nav: could not read the current user —', err);
    }

    if (!user) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    const who = user.email || 'Signed in';
    box.hidden = false;
    box.innerHTML =
      '<span class="console-account__who" title="' + escapeHtml(who) + '">' + escapeHtml(who) + '</span>'
      + '<button class="console-account__out" type="button" id="siteSignOut">Sign out</button>';

    document.getElementById('siteSignOut').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Signing out…';
      try {
        await DB.signOut();
        // Reload rather than re-render. Whether someone is an admin is read
        // once at boot (canEdit in app.js, the gate in admin-gate.js), so
        // redrawing this control alone would leave the Builder and Upload
        // panels sitting there open until the next navigation.
        location.reload();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Sign out';
        console.error('Sign out failed —', err);
      }
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render, browseHref };
})();
