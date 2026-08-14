/* =====================================================================
   School Wits — App logic
   ===================================================================== */

(function(){

  // Custom math-mode macros the exam papers define in their own LaTeX
  // preambles — see js/app.js for the full explanation. Kept in sync
  // across every file that calls renderMathInElement().
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
    '\\textperiodcentered': '\\cdot'
    // No \textbf/\textit/\texttt overrides — see js/app.js for why.
  };

  const els = {
    fSubject: document.getElementById('fSubject'),
    fPaper: document.getElementById('fPaper'),
    fVariant: document.getElementById('fVariant'),
    fSession: document.getElementById('fSession'),
    fYear: document.getElementById('fYear'),
    fBrowse: document.getElementById('fBrowse'),

    railList: document.getElementById('railList'),
    paperStrip: document.getElementById('paperStrip'),

    card: document.getElementById('card'),
    emptyState: document.getElementById('emptyState'),

    qTitle: document.getElementById('qTitle'),
    qSub: document.getElementById('qSub'),
    stampMarks: document.getElementById('stampMarks'),
    qBody: document.getElementById('qBody'),
    msBody: document.getElementById('msBody'),
    exemplarBody: document.getElementById('exemplarBody'),
    videoArea: document.getElementById('videoArea'),

    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    tabs: document.querySelectorAll('.tab'),
    panels: document.querySelectorAll('.panel')
  };

  let currentIndex = 0; // index into QUESTIONS
  const VIDEO_STORE_PREFIX = 'schoolwits_video_q';

  /* ---------------------------------------------------------- init filters */
  function initFilters(){
    els.fSubject.value = PAPER_META.subject;
    els.fPaper.value = PAPER_META.paper;
    els.fVariant.value = PAPER_META.variant;
    els.fSession.value = PAPER_META.session;
    els.fYear.value = PAPER_META.year;

    [els.fSubject, els.fPaper, els.fVariant, els.fSession, els.fYear, els.fBrowse]
      .forEach(sel => sel.addEventListener('change', handleFilterChange));
  }

  function matchesCurrentPaper(){
    return els.fSubject.value === PAPER_META.subject &&
           els.fPaper.value === PAPER_META.paper &&
           els.fVariant.value === PAPER_META.variant &&
           els.fSession.value === PAPER_META.session &&
           els.fYear.value === PAPER_META.year;
  }

  function handleFilterChange(){
    if(matchesCurrentPaper()){
      showBank();
      currentIndex = 0;
      renderRail();
      renderQuestion();
    } else {
      showEmpty();
    }
  }

  function showEmpty(){
    els.card.hidden = true;
    document.getElementById('rail').hidden = true;
    els.emptyState.hidden = false;
  }
  function showBank(){
    els.card.hidden = false;
    document.getElementById('rail').hidden = false;
    els.emptyState.hidden = true;
  }

  /* ---------------------------------------------------------- paper strip */
  function renderPaperStrip(){
    els.paperStrip.textContent =
      `${PAPER_META.subjectCode} · ${PAPER_META.subject} · Paper ${PAPER_META.paper}/${PAPER_META.variant} · ${PAPER_META.session} ${PAPER_META.year} — Browse: ${els.fBrowse.value}`;
  }

  /* ---------------------------------------------------------- rail */
  function renderRail(){
    els.railList.innerHTML = '';
    QUESTIONS.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.className = 'rail-item' + (i === currentIndex ? ' active' : '');
      btn.innerHTML = `
        <span class="rail-num">${q.id}</span>
        <span class="rail-info">
          <span class="rail-topic">${q.topic}</span>
          <span class="rail-marks">${q.marks} marks</span>
        </span>`;
      btn.addEventListener('click', () => {
        currentIndex = i;
        renderRail();
        renderQuestion();
        setActiveTab('question');
      });
      els.railList.appendChild(btn);
    });
  }

  /* ---------------------------------------------------------- question render */
  function renderQuestion(){
    const q = QUESTIONS[currentIndex];
    renderPaperStrip();

    els.qTitle.textContent = `Question ${q.id}`;
    els.qSub.textContent = `${q.ref} · Topic: ${q.topic}`;
    els.stampMarks.textContent = q.marks;

    els.qBody.innerHTML = q.question;

    els.msBody.innerHTML = q.markScheme.map(row => `
      <tr>
        <td>${row.part || ''}</td>
        <td>${row.answer}</td>
        <td>${row.marks}</td>
      </tr>`).join('');

    els.exemplarBody.innerHTML = q.exemplar;

    renderVideo(q);

    renderMath();

    els.prevBtn.disabled = currentIndex === 0;
    els.nextBtn.disabled = currentIndex === QUESTIONS.length - 1;
  }

  /* ---------------------------------------------------------- KaTeX */
  function renderMath(){
    if(typeof renderMathInElement !== 'function') return;
    renderMathInElement(els.card, {
      delimiters: [
        {left: '\\[', right: '\\]', display: true},
        {left: '\\(', right: '\\)', display: false},
        {left: '$$', right: '$$', display: true}
      ],
      macros: KATEX_MACROS,
      throwOnError: false
    });
  }

  /* ---------------------------------------------------------- video system */
  function videoKey(q){
    return `${VIDEO_STORE_PREFIX}_${PAPER_META.subject}_${PAPER_META.paper}_${PAPER_META.variant}_${PAPER_META.session}_${PAPER_META.year}_${q.id}`;
  }

  function extractYouTubeId(url){
    if(!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/
    ];
    for(const p of patterns){
      const m = url.match(p);
      if(m) return m[1];
    }
    // If they pasted a bare 11-char ID
    if(/^[\w-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  function renderVideo(q){
    const saved = localStorage.getItem(videoKey(q));
    const videoId = saved || q.videoId;

    if(videoId){
      els.videoArea.innerHTML = `
        <div class="video-frame">
          <iframe src="https://www.youtube.com/embed/${videoId}" title="Video explanation for Question ${q.id}" allowfullscreen loading="lazy"></iframe>
        </div>
        <div class="video-meta">
          <span>Linked video: youtu.be/${videoId}</span>
          <button id="changeVideoBtn" type="button">Change link</button>
        </div>`;
      document.getElementById('changeVideoBtn').addEventListener('click', () => showVideoForm(q, videoId));
    } else {
      showVideoForm(q, '');
    }
  }

  function showVideoForm(q, existing){
    els.videoArea.innerHTML = `
      <div class="video-frame">
        <div class="playbtn">&#9658;</div>
        <div class="video-empty-text">No video linked yet for Question ${q.id}. Paste a YouTube link below to attach one — it will play right here.</div>
      </div>
      <form class="video-form" id="videoForm" autocomplete="off">
        <input type="text" id="videoInput" placeholder="https://youtu.be/..." value="${existing || ''}">
        <button type="submit">Save link</button>
      </form>`;
    document.getElementById('videoForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = document.getElementById('videoInput').value.trim();
      const id = extractYouTubeId(raw);
      if(id){
        localStorage.setItem(videoKey(q), id);
        renderVideo(q);
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
    els.tabs.forEach(tab => {
      tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
    });
  }

  /* ---------------------------------------------------------- prev/next */
  function initNav(){
    els.prevBtn.addEventListener('click', () => {
      if(currentIndex > 0){
        currentIndex--;
        renderRail();
        renderQuestion();
        setActiveTab('question');
      }
    });
    els.nextBtn.addEventListener('click', () => {
      if(currentIndex < QUESTIONS.length - 1){
        currentIndex++;
        renderRail();
        renderQuestion();
        setActiveTab('question');
      }
    });
  }

  /* ---------------------------------------------------------- boot */
  function boot(){
    initFilters();
    initTabs();
    initNav();
    renderRail();
    renderQuestion();
  }

  document.addEventListener('DOMContentLoaded', boot);

})();
