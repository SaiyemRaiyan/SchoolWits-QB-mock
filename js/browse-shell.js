/* =====================================================================
   School Wits — browse shell

   The sidebar filters and the whole question-browsing body, in ONE
   place, mounted by both pages that use it:

     home.html   the student portal  (read-only)
     index.html  Browse              (admin, same UI + write controls)

   Why it lives in JS rather than in each page's HTML: the two pages are
   the same interface with different permissions, and this project has no
   build step or templating, so a shared <script> is the only way to keep a
   single copy. Duplicating this markup across two files would guarantee
   they drift.

   Mounted SYNCHRONOUSLY, and this file must load before js/app.js: app.js
   resolves all its elements with getElementById at load time, so the
   markup has to be in the document by then.
   ===================================================================== */

window.SWShell = (function () {
  'use strict';

  // Fills the <aside id="filterMount"> the pages declare. Qualification and
  // stats used to live in #main above the results — moved in here so every
  // "narrow the search" control lives in one colour-coded rail instead of
  // being split across the header and the page body.
  const FILTERS = `
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <span class="sidebar-brand-eyebrow">Refine your search</span>
      </div>

      <!-- Step 1: qualification, rendered from the syllabuses table
           (migration 0015), never hardcoded here. -->
      <div class="sidebar-section sidebar-section--qual">
        <div class="sidebar-section-title"><span class="dot"></span>Qualification</div>
        <div class="pill-row" id="qualPills"></div>
      </div>

      <div class="sidebar-section sidebar-section--filters">
        <div class="sidebar-section-title"><span class="dot"></span>Subject &amp; paper</div>
        <div class="sidebar-fields">
          <div class="field">
            <label for="fSubject">Subject</label>
            <select id="fSubject"><option value="">Any</option></select>
          </div>
          <div class="field">
            <label for="fPaper">Paper</label>
            <select id="fPaper"><option value="">Any</option></select>
          </div>
          <div class="field">
            <label for="fVariant">Variant</label>
            <select id="fVariant"><option value="">Any</option></select>
          </div>
          <div class="field">
            <label for="fSession">Session</label>
            <select id="fSession"><option value="">Any</option></select>
          </div>
          <div class="field">
            <label for="fYear">Year</label>
            <select id="fYear"><option value="">Any</option></select>
          </div>
        </div>
      </div>

      <div class="sidebar-section sidebar-section--topic">
        <div class="sidebar-section-title"><span class="dot"></span>Topic</div>
        <div class="field field--topic" id="topicWrap">
          <div class="combo" id="topicCombo">
            <input type="text" id="fTopicInput" placeholder="Any" autocomplete="off" />
            <input type="hidden" id="fTopic" value="" />
            <!-- Opens the topic list as a flyout beside the sidebar instead
                 of typing — handy for browsing rather than searching. -->
            <button class="topic-flyout-toggle" id="topicFlyoutToggle" type="button" aria-expanded="false" aria-label="Show topic list">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="statstrip" id="statStrip"></div>
    </div>

    <!-- Lives outside .sidebar-inner (position:fixed, placed by JS) so the
         sidebar's own scroll/overflow can never clip it. -->
    <div class="topic-flyout" id="fTopicMenu">
      <div class="topic-flyout-head">
        <span>All topics</span>
        <button class="topic-flyout-close" id="topicFlyoutClose" type="button" aria-label="Close topic list">&times;</button>
      </div>
      <div class="topic-flyout-list" id="fTopicMenuList"></div>
    </div>
  `;

  const MAIN = `

        <div class="paperstrip-row">
          <div class="paperstrip" id="paperStrip"></div>
          <div class="viewmode-toggle" id="viewModeToggle" hidden>
            <button class="vm-btn" data-vm="single" type="button">
              Question-by-question
            </button>
            <button class="vm-btn" data-vm="full" type="button">
              Full paper view
            </button>
          </div>
        </div>

        <!-- Horizontal question navigator, populated by renderHorizontalNav() -->
        <div class="qnav-strip" id="qnavStrip" hidden></div>

        <!-- ===================== FULL PAPER VIEW ===================== -->
        <section class="paperdoc" id="paperDoc" hidden>
          <div class="paperdoc-tabs" id="paperDocTabs" role="tablist">
            <button class="pd-tab active" data-doc="paper" role="tab">
              <span class="tabnum">01</span>Question Paper
            </button>
            <button class="pd-tab" data-doc="markscheme" role="tab">
              <span class="tabnum">02</span>Mark Scheme
            </button>
            <button class="pd-tab" data-doc="worked-solution" role="tab">
              <span class="tabnum">03</span>Worked Solutions
            </button>
          </div>
          <div class="paperdoc-sheet">
            <div class="pd-doc active" id="pdDoc-paper"></div>
            <div class="pd-doc" id="pdDoc-markscheme"></div>
            <div class="pd-doc" id="pdDoc-worked-solution"></div>
          </div>
        </section>

        <section class="card" id="card" hidden>
          <div class="card-head">
            <div class="card-head-left">
              <div class="qtitle" id="qTitle">Question 1</div>
              <div class="qsub" id="qSub">&nbsp;</div>
            </div>
            <div class="card-head-right">
              <div class="marks-panel">
                <div class="stamp" id="stamp">
                  <span id="stampMarks">&mdash;</span><small>marks</small>
                </div>
                <div class="marks-dist" id="marksDist"></div>
              </div>
              <div class="qnav">
                <button
                  id="prevBtn"
                  class="navbtn"
                  aria-label="Previous question"
                >
                  &larr; Prev
                </button>
                <button id="nextBtn" class="navbtn" aria-label="Next question">
                  Next &rarr;
                </button>
              </div>
              <!-- Admin only. app.js unhides this when canEdit is true; the
                   student portal never does, so Home stays read-only. -->
              <button id="editQBtn" class="navbtn navbtn--edit" type="button" hidden>
                Edit question
              </button>
            </div>
          </div>

          <div class="tabs" id="tabs" role="tablist">
            <button class="tab active" data-tab="question" role="tab">
              <span class="tabnum">01</span>Question
            </button>
            <button class="tab" data-tab="markscheme" role="tab">
              <span class="tabnum">02</span>Mark Scheme
            </button>
            <button class="tab" data-tab="worked-solution" role="tab">
              <span class="tabnum">03</span>Worked Solution
            </button>
            <button class="tab" data-tab="video" role="tab">
              <span class="tabnum">04</span>Video
            </button>
          </div>

          <div class="panels">
            <div class="panel active" id="panel-question">
              <div class="eyebrow">Question</div>
              <div class="qbody" id="qBody"></div>
            </div>

            <div class="panel" id="panel-markscheme">
              <div class="eyebrow">Mark Scheme</div>
              <table class="mstable" id="msTable">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Expected answer</th>
                    <th>Mark</th>
                  </tr>
                </thead>
                <tbody id="msBody"></tbody>
              </table>
            </div>

            <div class="panel" id="panel-worked-solution">
              <div class="eyebrow">Worked Solution</div>
              <div class="band">Full-mark response</div>
              <div class="worked-solution-box" id="workedSolutionBody"></div>
            </div>

            <div class="panel" id="panel-video">
              <div class="eyebrow">Video Explanation</div>
              <div id="videoArea"></div>
            </div>
          </div>
        </section>

        <div class="emptystate" id="emptyState" hidden>
          <div class="emptystate-mark">&mdash;</div>
          <h2 id="emptyTitle">No questions match yet</h2>
          <p id="emptyText">
            Try widening a filter, or clear the search box. Nothing uploaded
            yet? Head to <a href="upload.html">Upload</a> to add a paper from a
            .tex file.
          </p>
        </div>

        <footer class="foot">
          <span
            >School Wits &middot; Every result below traces back to a .tex file
            you uploaded, nothing is invented</span
          >
        </footer>
      `;

  /** Fills #filterMount and #main. Safe to call on a page with neither. */
  function mount() {
    const filterMount = document.getElementById('filterMount');
    if (filterMount) filterMount.innerHTML = FILTERS;

    const main = document.getElementById('main');
    if (main) main.innerHTML = MAIN;

    wireSidebarToggle();
  }

  /**
   * The sidebar is a fixed rail on desktop but an off-canvas drawer under
   * 980px (see css/style.css) - this is just the open/close plumbing, kept
   * here rather than app.js since it is presentation, not search state.
   */
  function wireSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('filterMount');
    const overlay = document.getElementById('sidebarOverlay');
    if (!toggle || !sidebar) return;

    const close = () => {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    };
    const open = () => {
      sidebar.classList.add('open');
      if (overlay) overlay.classList.add('open');
    };

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) close(); else open();
    });
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Picking a filter on a phone should get straight to the results.
    if (window.matchMedia('(max-width: 980px)').matches) {
      sidebar.querySelectorAll('select').forEach(sel => sel.addEventListener('change', close));
    }
  }

  return { mount, FILTERS, MAIN };
})();
