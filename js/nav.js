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
    return appPage('index.html') + '?code=' + encodeURIComponent(code);
  }

  const link = (href, label, isActive) =>
    '<a href="' + href + '"' + (isActive ? ' class="active"' : '') + '>' + escapeHtml(label) + '</a>';

  /**
   * The header's right-hand group: admin links, then the account control.
   *
   * Created once and reused. Admin tools sit next to the identity they
   * belong to, so "an admin is signed in" and "this is what that unlocks"
   * read as one fact rather than two unrelated rows.
   */
  function rightRail() {
    const host = document.querySelector('.console');
    if (!host) return null;
    let rail = document.getElementById('siteRight');
    if (!rail) {
      rail = document.createElement('div');
      rail.id = 'siteRight';
      rail.className = 'console-right';
      host.appendChild(rail);
    }
    return rail;
  }

  /**
   * The logo is the way home.
   *
   * "Home" used to be a nav item sitting next to "Browse", which read as
   * two names for the same place. Wiring the brand mark instead is the
   * convention every site already teaches, and it frees the nav to list
   * only real destinations. Done here rather than by wrapping each page's
   * markup in an <a>, because there is no templating.
   */
  function linkBrand() {
    const brand = document.querySelector('.console-brand');
    if (!brand || brand.dataset.linked === '1') return;
    brand.dataset.linked = '1';
    brand.classList.add('console-brand--link');
    brand.setAttribute('role', 'link');
    brand.setAttribute('tabindex', '0');
    brand.setAttribute('title', 'School Wits home');
    const go = () => { location.href = rootPage('landing.html'); };
    brand.addEventListener('click', go);
    brand.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  }

  /**
   * Links only an admin can use.
   *
   * DRAWN only for admins rather than drawn-and-blocked. Upload is fully
   * admin-gated, so offering it to a student promises a page that can only
   * ever answer with a sign-in wall — a dead end dressed as a destination.
   *
   * This is presentation, never the boundary. RLS and each Edge Function's
   * own is_admin() check are what actually refuse the work; hiding a link
   * protects nothing, it just stops lying about what is available.
   */
  function renderAdminLinks(isAdmin, current) {
    const rail = rightRail();
    if (!rail) return;
    let box = document.getElementById('siteAdminNav');
    if (!box) {
      box = document.createElement('nav');
      box.id = 'siteAdminNav';
      box.className = 'sitenav sitenav--admin';
      rail.appendChild(box);
    }
    if (!isAdmin) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = link(appPage('upload.html'), 'Upload', current === 'upload');
  }

  /**
   * @param {string} current  'browse' | 'modules' | 'upload'
   */
  async function render(current) {
    const nav = document.getElementById('siteNav');
    if (!nav) return;

    linkBrand();

    // Public destinations. Browse and Modules both work signed out, so
    // they are the same for everyone; what changes inside them is whether
    // the write controls draw.
    nav.innerHTML =
      link(appPage('index.html'), 'Browse', current === 'browse')
      + link(appPage('modules.html'), 'Modules', current === 'modules');

    // The nav must draw even if this fails — an offline or erroring
    // database should not leave someone with no way off the page. Failing
    // closed (no admin links) is also the safer direction to be wrong in.
    let isAdmin = false;
    try {
      isAdmin = await DB.isAdmin();
    } catch (err) {
      console.error('Nav: could not check admin status —', err);
    }

    renderAdminLinks(isAdmin, current);
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
    const host = rightRail();
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
