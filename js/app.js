/* =====================================================================
   School Wits — Browse page logic
   Fully dynamic: filters, facets and results all come from the DB
   (uploaded .tex papers), not from a hardcoded array.
   ===================================================================== */

(function(){

  // Custom math-mode macros the exam papers define in their own LaTeX
  // preambles (\newcommand{\dd}{...} etc.) — those preamble definitions
  // are stripped as non-content, so KaTeX must be taught the same macros
  // directly to render \dd, \dydx, \ncr{}{}, \npr{}{}, \cosec, \pow{},
  // \dg, \degC and \ohms correctly wherever they appear inside math.
  const KATEX_MACROS = {
    '\\dd': '\\mathrm{d}',
    '\\dydx': '\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}',
    '\\ncr': '{}^{#1}\\mathrm{C}_{#2}',
    '\\npr': '{}^{#1}\\mathrm{P}_{#2}',
    '\\cosec': '\\operatorname{cosec}',
    '\\pow': '^{#1}',
    '\\dg': '^{\\circ}',
    '\\degC': '^{\\circ}\\mathrm{C}',
    '\\ohms': '\\Omega',
    '\\textperiodcentered': '\\cdot',
    '\\textbf': '\\mathbf{#1}',
    '\\textit': '\\mathit{#1}',
    '\\texttt': '\\mathtt{#1}'
  };

  // Turns a question's stored `content` (the parsed object — see
  // backend/src/latex/types.ts) into the markup this page draws. Questions
  // arrive from the DB as structure, not HTML, and are rendered here at
  // display time rather than in the data layer.
  const renderer = new SWRender.QuestionRenderer();

  const els = {
    fSubject: document.getElementById('fSubject'),
    fPaper: document.getElementById('fPaper'),
    fVariant: document.getElementById('fVariant'),
    fSession: document.getElementById('fSession'),
    fYear: document.getElementById('fYear'),
    fTopic: document.getElementById('fTopic'),
    fTopicInput: document.getElementById('fTopicInput'),
    fTopicMenu: document.getElementById('fTopicMenu'),
    topicCombo: document.getElementById('topicCombo'),
    fBrowse: document.getElementById('fBrowse'),
    fText: document.getElementById('fText'),

    railList: document.getElementById('railList'),
    railHeading: document.getElementById('railHeading'),
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
    exemplarBody: document.getElementById('exemplarBody'),
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
    pdDocExemplar: document.getElementById('pdDoc-exemplar')
  };

  let currentResults = [];   // questions matching the active filters/search
  let currentIndex = -1;     // index into currentResults
  let viewMode = 'single';   // 'single' (one question at a time) | 'full' (whole paper, continuous)
  let topicList = [];        // full facet list backing the topic combobox's filter
  const ACCENTS = ['#2F6FB3', '#1D8A5C', '#B9762A', '#8B4FB0', '#C0392B', '#1A9E96', '#7A6A1E', '#4A5568'];

  /* ---------------------------------------------------------- boot */
  async function boot(){
    await DB.open();
    await refreshFilterOptions();
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
    fillSelect(els.fSubject, facets.subjects);
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
    [els.fSubject, els.fPaper, els.fVariant, els.fSession, els.fYear, els.fTopic, els.fBrowse]
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
      ['paper', 'markscheme', 'exemplar'].forEach(name => {
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
      els.pdDocExemplar.innerHTML = msg;
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
            <thead><tr><th>Part</th><th>Expected answer</th><th>Marks</th></tr></thead>
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
          <div class="exemplar-box">${renderer.toExemplarHtml(q.content)}</div>
        </article>`;
    }).join('');

    els.pdDocPaper.innerHTML = docHead('Question Paper') + qSections;
    els.pdDocMarkscheme.innerHTML = docHead('Mark Scheme') + msSections;
    els.pdDocExemplar.innerHTML = docHead('Exemplar &amp; Model Answers') + exSections;

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
    const mode = els.fBrowse.value;
    const bits = [filters.subject, filters.paper && `Paper ${filters.paper}`, filters.variant && `Var. ${filters.variant}`, filters.session, filters.year, filters.topic]
      .filter(Boolean);
    els.paperStrip.textContent = bits.length
      ? `${bits.join(' · ')} — Grouped by: ${mode}`
      : `All uploaded papers — Grouped by: ${mode}`;
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

    const mode = els.fBrowse.value;
    let lastGroup = null;
    let groupEl = null;

    currentResults.forEach((q, i) => {
      const groupKey = mode === 'Subject' ? q.subject : mode === 'Topical' ? q.topic : q.paperKey;
      if(groupKey !== lastGroup){
        groupEl = document.createElement('div');
        groupEl.className = 'qnav-group';
        const label = document.createElement('span');
        label.className = 'qnav-group-label';
        label.textContent = mode === 'Subject' ? q.subject : mode === 'Topical' ? (q.topic || 'Uncategorised') : DB.paperLabel(q);
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

  function showEmpty(){
    els.card.hidden = true;
    els.emptyState.hidden = false;
    els.qnavStrip.hidden = true;
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
    els.marksDist.innerHTML = renderMarksDistribution(q);

    els.qBody.innerHTML = `<div class="question-shell">${renderer.toQuestionHtml(q.content)}</div>`;

    els.msBody.innerHTML = renderer.toMarkSchemeRows(q.content).map(row => row.isBanner ? `
      <tr class="ms-banner-row"><td colspan="3">${row.answer}</td></tr>` : `
      <tr>
        <td>${escHTML(row.part)}</td>
        <td>${row.answer}</td>
        <td>${escHTML(row.marks)}</td>
      </tr>`).join('') || '<tr><td colspan="3"><i>No mark scheme uploaded for this question.</i></td></tr>';

    els.exemplarBody.innerHTML = renderer.toExemplarHtml(q.content);

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
    if(typeof renderMathInElement !== 'function') return;
    renderMathInElement(el, {
      delimiters: [
        {left: '\\[', right: '\\]', display: true},
        {left: '\\(', right: '\\)', display: false},
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ],
      macros: KATEX_MACROS,
      throwOnError: false
    });
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
      els.videoArea.innerHTML = `
        <div class="video-frame">
          <iframe src="https://www.youtube.com/embed/${q.videoId}" title="Video explanation for Question ${q.id}" allowfullscreen loading="lazy"></iframe>
        </div>
        <div class="video-meta">
          <span>Linked video: youtu.be/${q.videoId}</span>
          <button id="changeVideoBtn" type="button">Change link</button>
        </div>`;
      document.getElementById('changeVideoBtn').addEventListener('click', () => showVideoForm(q));
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
