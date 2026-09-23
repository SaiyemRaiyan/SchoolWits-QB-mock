/* =====================================================================
   School Wits — Landing / gateway page

   Subject choice -> Curriculum -> optional Topic -> "Search Question Bank"
   hands off to home.html with a syllabus `code` (and optional `topic`)
   query param, which js/app.js already knows how to apply (see
   initSyllabusPicker / activeCode there). This file only has to resolve
   the user's picks down to that one `code`.
   ===================================================================== */

(function () {
  'use strict';

  const els = {
    subject: document.getElementById('pfSubject'),
    qual: document.getElementById('pfQual'),
    topicCombo: document.getElementById('pfTopicCombo'),
    topicInput: document.getElementById('pfTopicInput'),
    topic: document.getElementById('pfTopic'),
    topicMenu: document.getElementById('pfTopicMenu'),
    form: document.getElementById('pickerForm'),
    hint: document.getElementById('pickerHint'),
    searchBtn: document.getElementById('pickerSearchBtn'),
    stats: document.getElementById('landingStats')
  };

  let byQualification = [];
  let paperSubjectByCode = null; // syllabus code -> papers.subject name (they can differ, see store.js)
  let topicList = [];
  let topicsRequestId = 0; // guards against a slower, stale fetch overwriting a newer one

  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------------------------------------------------------- subject / curriculum */
  function fillQualSelect() {
    const preferred = byQualification.find(g => g.subjects.some(x => x.paperCount > 0));
    const defaultQual = (preferred || byQualification[0] || {}).qualification || '';

    els.qual.innerHTML = byQualification.map(g =>
      `<option value="${escAttr(g.qualification)}">${escHtml(g.board + ' ' + g.qualification)}</option>`
    ).join('');
    els.qual.value = defaultQual;
    els.qual.disabled = byQualification.length === 0;
  }

  function fillSubjectSelect() {
    const group = byQualification.find(g => g.qualification === els.qual.value);
    const subjects = group ? group.subjects : [];
    const keep = els.subject.value;

    els.subject.innerHTML = '<option value="">Choose a subject</option>' + subjects.map(s =>
      `<option value="${escAttr(s.code)}">${escHtml(s.title)}</option>`
    ).join('');
    els.subject.disabled = subjects.length === 0;
    if ([...els.subject.options].some(o => o.value === keep)) els.subject.value = keep;

    refreshTopicsForSubject();
    updateFormState();
  }

  /* ---------------------------------------------------------- topic combobox */
  /**
   * Topic is scoped to the chosen subject — Physics must never offer
   * Chemistry's topics. Re-fetched (via DB.getTopicsForSubject) every time
   * the subject changes, rather than filtering one global list client-side,
   * because the global list has no idea which subject each topic belongs to.
   */
  async function refreshTopicsForSubject() {
    els.topic.value = '';
    els.topicInput.value = '';
    els.topicMenu.hidden = true;

    const code = els.subject.value;
    const subjectName = code && paperSubjectByCode ? paperSubjectByCode.get(code) : null;

    if (!subjectName) {
      topicList = [];
      els.topicInput.value = '';
      els.topicInput.placeholder = 'Choose a subject first';
      els.topicInput.disabled = true;
      return;
    }

    const requestId = ++topicsRequestId;
    els.topicInput.disabled = true;
    els.topicInput.placeholder = 'Loading topics…';
    try {
      const topics = await DB.getTopicsForSubject(subjectName);
      if (requestId !== topicsRequestId) return; // a newer subject change won the race
      topicList = topics;
      els.topicInput.disabled = false;
      els.topicInput.placeholder = topics.length ? 'Any topic' : 'No topics for this subject yet';
    } catch (err) {
      if (requestId !== topicsRequestId) return;
      console.error('Landing: could not load topics for subject —', err);
      topicList = [];
      els.topicInput.disabled = false;
      els.topicInput.placeholder = 'Any topic';
    }
  }

  function renderTopicMenu(filterText) {
    const q = (filterText || '').trim().toLowerCase();
    const matches = q ? topicList.filter(t => t.toLowerCase().includes(q)) : topicList;
    const rows = ['<div class="lp-combo-option' + (els.topic.value ? '' : ' active') + '" data-value="">Any topic</div>']
      .concat(matches.map(t => `<div class="lp-combo-option${t === els.topic.value ? ' active' : ''}" data-value="${escAttr(t)}">${escHtml(t)}</div>`));
    if (!matches.length) rows.push('<div class="lp-combo-empty">No matching topics</div>');
    els.topicMenu.innerHTML = rows.join('');
    els.topicMenu.hidden = false;
  }

  function selectTopic(value) {
    els.topic.value = value;
    els.topicInput.value = value;
    els.topicMenu.hidden = true;
  }

  function wireTopicCombo() {
    els.topicInput.addEventListener('focus', () => renderTopicMenu(''));
    els.topicInput.addEventListener('input', () => {
      // Free typing without a matching topic still counts as "no topic
      // chosen" — only an exact pick from the list narrows the search.
      if (els.topicInput.value !== els.topic.value) els.topic.value = '';
      renderTopicMenu(els.topicInput.value);
    });
    els.topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const options = els.topicMenu.querySelectorAll('.lp-combo-option');
        const pick = els.topicInput.value.trim() && options.length > 1 ? options[1] : options[0];
        if (pick) selectTopic(pick.dataset.value);
      } else if (e.key === 'Escape') {
        els.topicMenu.hidden = true;
        els.topicInput.blur();
      }
    });
    els.topicMenu.addEventListener('mousedown', (e) => {
      const opt = e.target.closest('.lp-combo-option');
      if (opt) selectTopic(opt.dataset.value);
    });
    document.addEventListener('click', (e) => {
      if (!els.topicCombo.contains(e.target)) els.topicMenu.hidden = true;
    });
  }

  /* ---------------------------------------------------------- form state */
  function updateFormState() {
    const ready = Boolean(els.subject.value && els.qual.value);
    els.searchBtn.disabled = !ready;
    els.hint.textContent = ready
      ? 'Ready — opens the question bank filtered to your choice.'
      : 'Pick a subject and curriculum to continue.';
    els.hint.classList.remove('is-error');
  }

  /* ---------------------------------------------------------- boot */
  async function boot() {
    wireTopicCombo();
    els.qual.addEventListener('change', () => { fillSubjectSelect(); });
    els.subject.addEventListener('change', () => { refreshTopicsForSubject(); updateFormState(); });

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = els.subject.value;
      if (!code || !els.qual.value) {
        els.hint.textContent = 'Please choose a subject and a curriculum first.';
        els.hint.classList.add('is-error');
        return;
      }
      const params = new URLSearchParams({ code });
      if (els.topic.value) params.set('topic', els.topic.value);
      location.href = 'home.html?' + params.toString();
    });

    try {
      const [papers, facets] = await Promise.all([
        DB.getAllPapers(),
        DB.getFacets()
      ]);
      const { byQualification: groups } = await DB.getSyllabuses(papers);
      byQualification = groups;
      paperSubjectByCode = new Map();
      papers.forEach(p => { if (p.subjectCode) paperSubjectByCode.set(p.subjectCode, p.subject); });

      fillQualSelect();
      fillSubjectSelect();

      if (facets.paperCount) {
        els.stats.innerHTML =
          `<div class="landing-stat"><b>${facets.paperCount}</b><span>Past papers</span></div>` +
          `<div class="landing-stat"><b>${facets.questionCount}</b><span>Questions</span></div>` +
          `<div class="landing-stat"><b>${(facets.topics || []).length}</b><span>Topics</span></div>`;
      }
    } catch (err) {
      console.error('Landing: could not load syllabuses —', err);
      els.hint.textContent = 'Could not load subjects — please refresh the page.';
      els.hint.classList.add('is-error');
      els.subject.innerHTML = '<option value="">Unavailable</option>';
      els.qual.innerHTML = '<option value="">Unavailable</option>';
    }
  }

  boot();
})();
