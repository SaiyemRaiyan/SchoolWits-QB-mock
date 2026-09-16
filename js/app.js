/* =====================================================================
   School Wits — Browse page logic
   Fully dynamic: filters, facets and results all come from the DB
   (uploaded .tex papers), not from a hardcoded array.
   ===================================================================== */

(function(){

  // Math rendering (macros + delimiters) lives in js/katex-config.js, so
  // every page renders stored LaTeX identically. See SWKatex.

  // Turns a question's stored `content` (the parsed object — see
  // backend/src/latex/types.ts) into the markup this page draws. Questions
  // arrive from the DB as structure, not HTML, and are rendered here at
  // display time rather than in the data layer.
  const renderer = new SWRender.QuestionRenderer({
    // 4-column papers (Add Maths, Maths D) carry a "Partial Marks" column
    // explaining how each mark is earned — "M1 for ... seen". It is part of
    // the official mark scheme, so it is shown rather than dropped.
    showGuidance: true
  });

  const els = {
    fSubject: document.getElementById('fSubject'),
    fPaper: document.getElementById('fPaper'),
    fVariant: document.getElementById('fVariant'),
    fSession: document.getElementById('fSession'),
    fYear: document.getElementById('fYear'),
    fTopic: document.getElementById('fTopic'),
    // Topic is a type-to-filter combobox (from main): #fTopic is a hidden
    // input holding the value, so the rest of this file still reads it like
    // the old <select>. fBrowse is deliberately NOT here — the "Group by"
    // control was removed.
    fTopicInput: document.getElementById('fTopicInput'),
    fTopicMenu: document.getElementById('fTopicMenu'),
    topicCombo: document.getElementById('topicCombo'),
    marksDist: document.getElementById('marksDist'),
    fText: document.getElementById('fText'),

    qualPills: document.getElementById('qualPills'),
    statStrip: document.getElementById('statStrip'),
    paperStrip: document.getElementById('paperStrip'),

    qnavStrip: document.getElementById('qnavStrip'),

    card: document.getElementById('card'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    emptyText: document.getElementById('emptyText'),

    qTitle: document.getElementById('qTitle'),
    qSub: document.getElementById('qSub'),
    stampMarks: document.getElementById('stampMarks'),
    marksDist: document.getElementById('marksDist'),
    qBody: document.getElementById('qBody'),
    msBody: document.getElementById('msBody'),
    workedSolutionBody: document.getElementById('workedSolutionBody'),
    videoArea: document.getElementById('videoArea'),

    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    tabs: document.querySelectorAll('.tab'),
    panels: document.querySelectorAll('.panel'),

    viewModeToggle: document.getElementById('viewModeToggle'),
    vmBtns: document.querySelectorAll('.vm-btn'),
    paperDoc: document.getElementById('paperDoc'),
    pdTabs: document.querySelectorAll('.pd-tab'),
    pdDocPaper: document.getElementById('pdDoc-paper'),
    pdDocMarkscheme: document.getElementById('pdDoc-markscheme'),
    pdDocWorkedSolution: document.getElementById('pdDoc-worked-solution')
  };

  // Can this visitor change anything? False on the student portal by
  // construction, and false for a signed-out or non-admin visitor on
  // Browse. Only affects what is DRAWN — every write is independently
  // refused by the database (anon lost INSERT/UPDATE/DELETE in migration
  // 0017, and RLS checks is_admin() behind that), so this is UX, never the
  // boundary.
  const isStudentPortal = document.body.dataset.role === 'student';
  let canEdit = false;

  let currentResults = [];   // questions matching the active filters/search
  let currentIndex = -1;     // index into currentResults
  let viewMode = 'single';   // 'single' (one question at a time) | 'full' (whole paper, continuous)
  let topicList = [];        // full facet list backing the topic combobox's filter
  const ACCENTS = ['#2F6FB3', '#1D8A5C', '#B9762A', '#8B4FB0', '#C0392B', '#1A9E96', '#7A6A1E', '#4A5568'];

  /**
   * The syllabus code from ?code=4037, set by the subject links in the nav
   * (js/nav.js). Null on a plain Browse visit.
   */
  function activeCode(){
    return new URLSearchParams(location.search).get('code');
  }

  /* ---------------------------------------------------------- syllabus picker */
  // Browse now starts one level up: pick a qualification (Cambridge O Level
  // / Cambridge IGCSE), then a subject. Both lists come from the
  // `syllabuses` table, so a new subject is an INSERT rather than an edit
  // here. Selecting a subject sets the `subject` filter the rest of the
  // page already understands, which is why this bolts on without touching
  // search().
  let syllabus = { byQualification: [], subjects: [] };
  let activeQualification = '';
  let paperSubjectByCode = null;

  async function initSyllabusPicker(){
    try {
      const papers = await DB.getAllPapers();
      syllabus = await DB.getSyllabuses(papers);
      paperSubjectByCode = new Map();
      papers.forEach(pr => { if (pr.subjectCode) paperSubjectByCode.set(pr.subjectCode, pr.subject); });
    } catch (err) {
      console.error('Browse: could not load syllabuses —', err);
      if (els.qualPills) els.qualPills.innerHTML = '<p class="hint">Could not load subjects.</p>';
      return;
    }

    const code = activeCode();
    const preset = code && syllabus.subjects.find(x => x.code === code);
    activeQualification = preset ? preset.qualification
      : (syllabus.byQualification.find(g => g.subjects.some(x => x.paperCount > 0))?.qualification || '');

    renderQualPills();
    fillSubjectOptions();
    if (preset) applySubject(preset);
  }

  function renderQualPills(){
    els.qualPills.innerHTML = syllabus.byQualification.map(g =>
      `<button class="pill ${g.qualification === activeQualification ? 'active' : ''}" data-qual="${escAttr(g.qualification)}">`
      + `${escHTML(g.board + ' ' + g.qualification)}<span class="count">${g.paperCount}</span></button>`).join('');

    els.qualPills.querySelectorAll('.pill').forEach(b => b.addEventListener('click', () => {
      activeQualification = b.dataset.qual;
      renderQualPills();
      // Subject options are scoped to the qualification, so the previous
      // choice may not exist in the new list.
      els.fSubject.value = '';
      fillSubjectOptions();
      runSearch();
    }));
  }

  /**
   * The Subject dropdown, scoped to the chosen qualification and labelled
   * with the official syllabus code ("4037 — Additional Mathematics").
   *
   * The option VALUE stays the subject name the papers carry ("Add Maths"),
   * because that is what search() filters on; only the label comes from the
   * catalogue. The two differ for 2 of 5 subjects, which is why the code
   * cannot simply be prepended to the stored name.
   */
  function fillSubjectOptions(){
    const group = syllabus.byQualification.find(g => g.qualification === activeQualification);
    const subjects = (group ? group.subjects : []).filter(x => x.paperCount > 0);
    const keep = els.fSubject.value;

    els.fSubject.innerHTML = '<option value="">Any subject</option>' + subjects.map(x => {
      const name = syllabusSubjectName(x.code);
      if (!name) return '';
      return `<option value="${escAttr(name)}">${escHTML(x.code)} &mdash; ${escHTML(x.title)}</option>`;
    }).join('');

    if ([...els.fSubject.options].some(o => o.value === keep)) els.fSubject.value = keep;
  }

  /**
   * Bridges the catalogue to the existing filters. `papers.subject` is a
   * folder-derived name ("Add Maths") while the catalogue holds the board's
   * title ("Additional Mathematics"), so the subject NAME is looked up from
   * a paper carrying this code rather than assumed to match.
   */
  function applySubject(chosen){
    const match = syllabusSubjectName(chosen.code);
    if (match) els.fSubject.value = match;
  }

  function syllabusSubjectName(code){
    return paperSubjectByCode ? (paperSubjectByCode.get(code) || null) : null;
  }

  /* ---------------------------------------------------------- boot */
  async function boot(){
    await DB.open();
    canEdit = isStudentPortal ? false : await DB.isAdmin();
    SWNav.render(isStudentPortal ? 'home' : 'browse');
    await refreshFilterOptions();
    await initSyllabusPicker();
    initEvents();
    await runSearch();
  }

  /* ---------------------------------------------------------- filter option population */
  function fillSelect(sel, values, current){
    const keep = current !== undefined ? current : sel.value;
    sel.innerHTML = '<option value="">Any</option>' + values.map(v => `<option value="${escAttr(v)}">${escHTML(v)}</option>`).join('');
    if(values.includes(keep)) sel.value = keep;
  }

  async function refreshFilterOptions(){
    const facets = await DB.getFacets();
    // fSubject is NOT filled here. It is built by fillSubjectOptions() from
    // the syllabuses catalogue so each option can show its code, and it is
    // scoped to the chosen qualification. Filling it from raw facet names
    // would overwrite those labels with bare "Add Maths" strings.
    fillSelect(els.fPaper, facets.papers);
    fillSelect(els.fVariant, facets.variants);
    fillSelect(els.fSession, facets.sessions);
    fillSelect(els.fYear, facets.years.map(String));
    fillTopicCombo(facets.topics);
    els.statStrip.innerHTML = facets.paperCount
      ? `<span><b>${facets.paperCount}</b> paper${facets.paperCount === 1 ? '' : 's'} indexed</span><span class="dot">&middot;</span><span><b>${facets.questionCount}</b> questions searchable</span>`
      : `<span>No papers indexed yet &mdash; <a href="upload.html">upload a .tex file</a> to get started</span>`;
  }

  /* ---------------------------------------------------------- topic combobox */
  // A plain <select> gets unwieldy once a subject has dozens of topics, so
  // Topic is a type-to-filter combobox instead. #fTopic stays a hidden input
  // holding the actual filter value — everything else in this file keeps
  // reading/writing it exactly like the old <select>.
  function fillTopicCombo(topics){
    topicList = topics || [];
    const keep = els.fTopic.value;
    if(!topicList.includes(keep)){
      els.fTopic.value = '';
      els.fTopicInput.value = '';
    }
  }

  function renderTopicMenu(filterText){
    const q = (filterText || '').trim().toLowerCase();
    const matches = q ? topicList.filter(t => t.toLowerCase().includes(q)) : topicList;
    const rows = ['<div class="combo-option' + (els.fTopic.value ? '' : ' active') + '" data-value="">Any topic</div>']
      .concat(matches.map(t => `<div class="combo-option${t === els.fTopic.value ? ' active' : ''}" data-value="${escAttr(t)}">${escHTML(t)}</div>`));
    if(!matches.length) rows.push('<div class="combo-empty">No matching topics</div>');
    els.fTopicMenu.innerHTML = rows.join('');
    els.fTopicMenu.hidden = false;
  }

  function selectTopic(value){
    els.fTopic.value = value;
    els.fTopicInput.value = value;
    els.fTopicMenu.hidden = true;
    els.fTopic.dispatchEvent(new Event('change'));
  }

  function wireTopicCombo(){
    els.fTopicInput.addEventListener('focus', () => renderTopicMenu(''));
    els.fTopicInput.addEventListener('input', () => renderTopicMenu(els.fTopicInput.value));
    els.fTopicInput.addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        e.preventDefault();
        const options = els.fTopicMenu.querySelectorAll('.combo-option');
        // Skip the always-present "Any topic" row once the user has typed
        // something to filter by, so Enter picks the match, not "Any".
        const pick = els.fTopicInput.value.trim() && options.length > 1 ? options[1] : options[0];
        if(pick) selectTopic(pick.dataset.value);
      } else if(e.key === 'Escape'){
        els.fTopicMenu.hidden = true;
        els.fTopicInput.blur();
      }
    });
    els.fTopicMenu.addEventListener('mousedown', (e) => {
      const opt = e.target.closest('.combo-option');
      if(opt) selectTopic(opt.dataset.value);
    });
    document.addEventListener('click', (e) => {
      if(!els.topicCombo.contains(e.target)) els.fTopicMenu.hidden = true;
    });
  }

  /* ---------------------------------------------------------- events */
  function initEvents(){
    [els.fSubject, els.fPaper, els.fVariant, els.fSession, els.fYear, els.fTopic]
      .forEach(sel => sel.addEventListener('change', runSearch));
    wireTopicCombo();
    let debounce;
    els.fText.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(runSearch, 180);
    });
    initTabs();
    initNav();
    wireViewModeToggle();
  }

  /* ---------------------------------------------------------- search / filter */
  /** True when the user has narrowed to something worth fetching. */
  function hasFilter(f){
    return Boolean(f.subject || f.paper || f.variant || f.session || f.year || f.topic || (f.text || '').trim());
  }

  async function runSearch(){
    const filters = {
      subject: els.fSubject.value,
      paper: els.fPaper.value,
      variant: els.fVariant.value,
      session: els.fSession.value,
      year: els.fYear.value,
      topic: els.fTopic.value,
      text: els.fText.value
    };
    // Nothing chosen yet? Don't fetch. An unfiltered search pulls every
    // question in the bank WITH its full `content` blob — measured at
    // 908 KB — only for the user to immediately narrow it to one subject.
    // The picker above is the prompt; the bank loads once it is answered.
    if(!hasFilter(filters)){
      currentResults = [];
      currentIndex = -1;
      renderPaperStrip(filters);
      await updateViewModeUI(filters);
      els.qnavStrip.hidden = true;
      showEmpty('Choose a subject', 'Pick a qualification and subject above to load its questions.');
      return;
    }

    currentResults = await DB.search(filters);
    currentIndex = currentResults.length ? 0 : -1;
    renderPaperStrip(filters);
    await updateViewModeUI(filters);
    if(viewMode === 'full' && activePaper(filters)){
      await renderFullPaper(activePaper(filters));
    } else {
      renderHorizontalNav();
      renderQuestion();
    }
  }

  /* ---------------------------------------------------------- full paper view */
  function currentFilters(){
    return {
      subject: els.fSubject.value, paper: els.fPaper.value, variant: els.fVariant.value,
      session: els.fSession.value, year: els.fYear.value, topic: els.fTopic.value, text: els.fText.value
    };
  }

  async function updateViewModeUI(filters){
    const paperKey = activePaper(filters);
    if(!paperKey){
      viewMode = 'single';
      els.viewModeToggle.hidden = true;
      els.paperDoc.hidden = true;
      return;
    }
    els.viewModeToggle.hidden = false;
    els.vmBtns.forEach(b => b.classList.toggle('active', b.dataset.vm === viewMode));
  }

  function wireViewModeToggle(){
    els.vmBtns.forEach(btn => btn.addEventListener('click', async () => {
      viewMode = btn.dataset.vm;
      els.vmBtns.forEach(b => b.classList.toggle('active', b === btn));
      const filters = currentFilters();
      const paperKey = activePaper(filters);
      if(viewMode === 'full' && paperKey){
        await renderFullPaper(paperKey);
      } else {
        els.paperDoc.hidden = true;
        renderHorizontalNav();
        renderQuestion();
      }
    }));
    els.pdTabs.forEach(tab => tab.addEventListener('click', () => {
      els.pdTabs.forEach(t => t.classList.toggle('active', t === tab));
      ['paper', 'markscheme', 'worked-solution'].forEach(name => {
        document.getElementById('pdDoc-' + name).classList.toggle('active', name === tab.dataset.doc);
      });
    }));
  }

  async function renderFullPaper(paperKey){
    const questions = (await DB.getQuestionsByPaperKey(paperKey)).sort((a, b) => a.id - b.id);
    els.paperDoc.hidden = false;
    els.card.hidden = true;
    els.emptyState.hidden = true;

    if(questions.length === 0){
      const msg = '<div class="pd-empty">No questions found for this paper.</div>';
      els.pdDocPaper.innerHTML = msg;
      els.pdDocMarkscheme.innerHTML = msg;
      els.pdDocWorkedSolution.innerHTML = msg;
      return;
    }

    const meta = questions[0];
    const heading = `${meta.subjectCode ? meta.subjectCode + '/' : ''}${meta.paper}${meta.variant}/${meta.session}/${meta.year}`;
    const totalMarks = questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 0), 0);

    const docHead = (title) => `
      <div class="pd-sessionhead">
        <div class="pd-sessionhead-code">${escHTML(heading)} &middot; ${escHTML(meta.subject)}</div>
        <div class="pd-sessionhead-title">${escHTML(title)}</div>
        <div class="pd-sessionhead-sub">${questions.length} question${questions.length === 1 ? '' : 's'} &middot; ${totalMarks || '—'} total marks</div>
      </div>`;

    const qSections = questions.map((q, i) => {
      const accent = ACCENTS[i % ACCENTS.length];
      return `
        <article class="pd-qsection" style="--qaccent:${accent}">
          <div class="pd-qhead">
            <span class="pd-qnum">Question ${q.id}</span>
            ${q.topic ? `<span class="pd-qtopic">${escHTML(q.topic)}</span>` : ''}
            <div class="pd-marks-panel">
              <span class="pd-qmarks">${escHTML(String(q.marks || '—'))} marks</span>
              ${renderMarksDistribution(q)}
            </div>
          </div>
          <div class="pd-qbody">${renderer.toQuestionHtml(q.content)}</div>
        </article>`;
    }).join('');

    const msSections = questions.map((q, i) => {
      const accent = ACCENTS[i % ACCENTS.length];
      const rows = renderer.toMarkSchemeRows(q.content).map(row => row.isBanner
        ? `<tr class="ms-banner-row"><td colspan="3">${row.answer}</td></tr>`
        : `<tr><td>${escHTML(row.part)}</td><td>${row.answer}</td><td>${escHTML(row.marks)}</td></tr>`).join('');
      return `
        <article class="pd-qsection" style="--qaccent:${accent}">
          <div class="pd-qhead">
            <span class="pd-qnum">Question ${q.id}</span>
            <div class="pd-marks-panel">
              <span class="pd-qmarks">${escHTML(String(q.marks || '—'))} marks</span>
            </div>
          </div>
          <table class="mstable">
            <thead><tr><th>Part</th><th>Expected answer</th><th>Mark</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3"><i>No mark scheme uploaded for this question.</i></td></tr>'}</tbody>
          </table>
        </article>`;
    }).join('');

    const exSections = questions.map((q, i) => {
      const accent = ACCENTS[i % ACCENTS.length];
      return `
        <article class="pd-qsection" style="--qaccent:${accent}">
          <div class="pd-qhead">
            <span class="pd-qnum">Question ${q.id}</span>
          </div>
          <div class="worked-solution-box">${renderer.toWorkedSolutionHtml(q.content)}</div>
        </article>`;
    }).join('');

    els.pdDocPaper.innerHTML = docHead('Question Paper') + qSections;
    els.pdDocMarkscheme.innerHTML = docHead('Mark Scheme') + msSections;
    els.pdDocWorkedSolution.innerHTML = docHead('Worked Solutions') + exSections;

    renderMathIn(els.paperDoc);
  }

  function activePaper(filters){
    // A single, fully-specified paper is selected when all 5 core fields are set
    if(filters.subject && filters.paper && filters.variant && filters.session && filters.year){
      return DB.paperKeyOf(filters);
    }
    return null;
  }

  function renderPaperStrip(filters){
    const bits = [filters.subject, filters.paper && `Paper ${filters.paper}`, filters.variant && `Var. ${filters.variant}`, filters.session, filters.year, filters.topic]
      .filter(Boolean);
    els.paperStrip.textContent = bits.length
      ? bits.join(' · ')
      : 'All uploaded papers';
  }

  /* ---------------------------------------------------------- horizontal question nav */
  function renderHorizontalNav(){
    const strip = els.qnavStrip;
    strip.innerHTML = '';

    if(currentResults.length === 0){
      strip.hidden = true;
      showEmpty();
      return;
    }
    strip.hidden = false;
    showBank();

    let lastGroup = null;
    let groupEl = null;

    currentResults.forEach((q, i) => {
      // Always grouped by paper now that the "Group by" control is gone —
      // that was its default, and it is the order a question bank is read in.
      const groupKey = q.paperKey;
      if(groupKey !== lastGroup){
        groupEl = document.createElement('div');
        groupEl.className = 'qnav-group';
        const label = document.createElement('span');
        label.className = 'qnav-group-label';
        label.textContent = DB.paperLabel(q);
        groupEl.appendChild(label);
        strip.appendChild(groupEl);
        lastGroup = groupKey;
      }

      const btn = document.createElement('button');
      btn.className = 'qnav-pill' + (i === currentIndex ? ' active' : '');
      btn.title = (q.topic ? q.topic + ' · ' : '') + (q.marks ? q.marks + ' marks' : '');
      btn.innerHTML = `<span class="pill-num">Q${q.id}</span><span class="pill-marks">${escHTML(String(q.marks || '—'))}</span>`;
      btn.addEventListener('click', () => {
        currentIndex = i;
        els.paperDoc.hidden = true;
        renderHorizontalNav();
        renderQuestion();
        setActiveTab('question');
        els.card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      groupEl.appendChild(btn);
    });
  }

  function showEmpty(title, text){
    els.card.hidden = true;
    els.emptyState.hidden = false;
    els.qnavStrip.hidden = true;
    // Explicit copy wins — used by the "nothing chosen yet" state, which is
    // a prompt rather than a failure and should not read like one.
    if(title){
      els.emptyTitle.textContent = title;
      els.emptyText.textContent = text || '';
      els.paperDoc.hidden = true;
      return;
    }
    const anyFilter = els.fSubject.value || els.fPaper.value || els.fVariant.value || els.fSession.value || els.fYear.value || els.fTopic.value || els.fText.value.trim();
    if(anyFilter){
      els.emptyTitle.textContent = 'No questions match those filters';
      els.emptyText.innerHTML = 'Try widening a filter or clearing the search box. If this combination genuinely isn\'t in the bank yet, <a href="upload.html">upload it</a>.';
    } else {
      els.emptyTitle.textContent = 'No questions in the bank yet';
      els.emptyText.innerHTML = 'Head to <a href="upload.html">Upload</a> and add a paper from a .tex file to start building a searchable bank.';
    }
  }
  function showBank(){
    els.card.hidden = false;
    els.emptyState.hidden = true;
    els.paperDoc.hidden = true;
  }

  /* ---------------------------------------------------------- question render */
  function renderQuestion(){
    if(currentIndex < 0 || !currentResults[currentIndex]) return;
    const q = currentResults[currentIndex];
    const selectedTopic = els.fTopic.value.trim();
    const topicLabel = selectedTopic || q.topic || 'Uncategorised';

    els.qTitle.textContent = `Question ${q.id}`;
    els.qSub.textContent = `${q.ref || DB.paperLabel(q) + ' · Q' + q.id}${topicLabel ? ' · Topic: ' + topicLabel : ''}`;
    els.stampMarks.textContent = q.marks || '—';
    // "1 marks" was wrong on every one-mark question, and the MCQ paper is
    // 40 of them. The <small> sits next to the number in the stamp.
    const unit = els.stampMarks.nextElementSibling;
    if(unit) unit.textContent = Number(q.marks) === 1 ? ' mark' : ' marks';
    if(els.marksDist) els.marksDist.innerHTML = renderMarksDistribution(q);

    els.qBody.innerHTML = `<div class="question-shell">${renderer.toQuestionHtml(q.content)}</div>`;

    els.msBody.innerHTML = renderer.toMarkSchemeRows(q.content).map(row => row.isBanner ? `
      <tr class="ms-banner-row"><td colspan="3">${row.answer}</td></tr>` : `
      <tr>
        <td>${escHTML(row.part)}</td>
        <td>${row.answer}</td>
        <td>${escHTML(row.marks)}</td>
      </tr>`).join('') || '<tr><td colspan="3"><i>No mark scheme uploaded for this question.</i></td></tr>';

    els.workedSolutionBody.innerHTML = renderer.toWorkedSolutionHtml(q.content);

    const videoTab = Array.from(els.tabs).find(tab => tab.dataset.tab === 'video');
    if(videoTab){
      videoTab.hidden = !q.videoId;
      if(!q.videoId && document.querySelector('.tab.active')?.dataset.tab === 'video'){ setActiveTab('question'); }
    }

    renderVideo(q);
    renderMath();

    els.prevBtn.disabled = currentIndex === 0;
    els.nextBtn.disabled = currentIndex === currentResults.length - 1;
  }

  /* ---------------------------------------------------------- KaTeX */
  function renderMath(){
    renderMathIn(els.card);
  }
  function renderMathIn(el){
    SWKatex.renderMathIn(el);
  }

  /* ---------------------------------------------------------- video system */
  // A video only ever appears if one has actually been attached to this
  // exact question (q.videoId, persisted in the DB record). Nothing is
  // shown otherwise — there is no fallback or placeholder video.
  function extractYouTubeId(url){
    if(!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if(m) return m[1];
    if(/^[\w-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  function renderVideo(q){
    if(q.videoId){
      // Students get the video; only an admin gets the control that
      // changes it. Previously "Change link" was drawn for everyone, which
      // meant a student could click a button that could only ever fail.
      els.videoArea.innerHTML = `
        <div class="video-frame">
          <iframe src="https://www.youtube.com/embed/${q.videoId}" title="Video explanation for Question ${q.id}" allowfullscreen loading="lazy"></iframe>
        </div>
        ${canEdit ? `<div class="video-meta">
          <span>Linked video: youtu.be/${q.videoId}</span>
          <button id="changeVideoBtn" type="button">Change link</button>
        </div>` : ''}`;
      if(canEdit) document.getElementById('changeVideoBtn').addEventListener('click', () => showVideoForm(q));
    } else if(!canEdit){
      els.videoArea.innerHTML = `
        <div class="video-frame">
          <div class="playbtn">&#9658;</div>
          <div class="video-empty-text">No video for Question ${q.id} yet.</div>
        </div>`;
    } else {
      els.videoArea.innerHTML = `
        <div class="video-frame">
          <div class="playbtn">&#9658;</div>
          <div class="video-empty-text">No video has been uploaded for Question ${q.id} yet.</div>
        </div>
        <form class="video-form" id="videoForm" autocomplete="off">
          <input type="text" id="videoInput" placeholder="https://youtu.be/..." value="${q.videoId || ''}">
          <button type="submit">Save link</button>
        </form>`;
      document.getElementById('videoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const raw = document.getElementById('videoInput').value.trim();
        const id = extractYouTubeId(raw);
        if(id){
          const updated = await DB.setVideo(q.uid, id);
          currentResults[currentIndex] = updated;
          renderVideo(updated);
        } else {
          document.getElementById('videoInput').style.borderColor = 'var(--marker)';
        }
      });
    }
  }

  function showVideoForm(q){
    els.videoArea.innerHTML = `
      <div class="video-frame">
        <div class="playbtn">&#9658;</div>
        <div class="video-empty-text">No video has been uploaded for Question ${q.id} yet.</div>
      </div>
      <form class="video-form" id="videoForm" autocomplete="off">
        <input type="text" id="videoInput" placeholder="https://youtu.be/..." value="${q.videoId || ''}">
        <button type="submit">Save link</button>
      </form>`;
    document.getElementById('videoForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const raw = document.getElementById('videoInput').value.trim();
      const id = extractYouTubeId(raw);
      if(id){
        const updated = await DB.setVideo(q.uid, id);
        currentResults[currentIndex] = updated;
        renderVideo(updated);
      } else {
        document.getElementById('videoInput').style.borderColor = 'var(--marker)';
      }
    });
  }

  /* ---------------------------------------------------------- tabs */
  function setActiveTab(tabName){
    els.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    els.panels.forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabName));
  }
  function initTabs(){
    els.tabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab.dataset.tab)));
  }

  /* ---------------------------------------------------------- prev/next */
  function initNav(){
    els.prevBtn.addEventListener('click', () => {
      if(currentIndex > 0){ currentIndex--; renderHorizontalNav(); renderQuestion(); setActiveTab('question'); }
    });
    els.nextBtn.addEventListener('click', () => {
      if(currentIndex < currentResults.length - 1){ currentIndex++; renderHorizontalNav(); renderQuestion(); setActiveTab('question'); }
    });
  }

  /* ---------------------------------------------------------- utils */
  function escHTML(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function escAttr(s){ return escHTML(s).replace(/"/g, '&quot;'); }

  // Walks a question's parts tree and pulls out the leaf marks — a part
  // that only groups subparts has marks:null, so we recurse into it
  // instead of reporting a blank entry.
  function collectMarksBreakdown(parts){
    const out = [];
    (function walk(list){
      (list || []).forEach(p => {
        if(p.marks !== null && p.marks !== undefined){
          out.push({ label: p.label, marks: p.marks });
        } else if(Array.isArray(p.subparts) && p.subparts.length){
          walk(p.subparts);
        }
      });
    })(parts);
    return out;
  }

  // Renders the small per-part chip row shown under a question's total
  // marks badge. Empty string when there's nothing to break down (MCQs,
  // single-part questions).
  function renderMarksDistribution(question){
    const parts = question && question.content ? question.content.parts : null;
    const breakdown = collectMarksBreakdown(parts);
    if(breakdown.length < 2) return '';
    return '<div class="marks-dist">' + breakdown.map(part =>
      `<span class="marks-chip"><b>(${escHTML(part.label)})</b>${escHTML(part.marks)}</span>`
    ).join('') + '</div>';
  }

  // (cleanupLegacyLatexStyles / normalizeLegacyMarks lived here. They
  // patched raw \textbf{...} left behind by the old regex parser at render
  // time. The current parser converts those to real markup before storage,
  // so there is nothing left to clean up.)

  document.addEventListener('DOMContentLoaded', boot);

})();
