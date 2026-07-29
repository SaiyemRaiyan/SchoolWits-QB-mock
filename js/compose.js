/* =====================================================================
   School Wits — Quick Add composer
   Paste one question's raw LaTeX at a time (no \documentclass, no
   \begin{document} needed) with optional mark scheme / sample answer,
   attach images that map to \includegraphics by upload order, preview
   live, then save it straight into the same bank Browse/Modules read
   from. This is an alternative to the two-file batch upload on this
   same page — same data, different (faster, one-question-at-a-time)
   way in.
   ===================================================================== */

(function(){

  const els = {
    modeTabs: document.querySelectorAll('.modetab'),
    viewBatch: document.getElementById('viewBatch'),
    viewQuickAdd: document.getElementById('viewQuickAdd'),

    qaPaperSelect: document.getElementById('qaPaperSelect'),
    qaSubject: document.getElementById('qaSubject'),
    qaSubjectCode: document.getElementById('qaSubjectCode'),
    qaPaper: document.getElementById('qaPaper'),
    qaVariant: document.getElementById('qaVariant'),
    qaSession: document.getElementById('qaSession'),
    qaYear: document.getElementById('qaYear'),

    qaTabs: document.querySelectorAll('#qaTabs .composer-tab'),
    qaFields: document.querySelectorAll('.composer-field'),
    qaQuestionSrc: document.getElementById('qaQuestionSrc'),
    qaSampleAnswerSrc: document.getElementById('qaSampleAnswerSrc'),

    qaImageInput: document.getElementById('qaImageInput'),
    qaImgChips: document.getElementById('qaImgChips'),

    qaTopic: document.getElementById('qaTopic'),
    qaMarks: document.getElementById('qaMarks'),
    qaQNum: document.getElementById('qaQNum'),
    qaImgWarn: document.getElementById('qaImgWarn'),
    qaAddBtn: document.getElementById('qaAddBtn'),
    qaClearBtn: document.getElementById('qaClearBtn'),
    qaSaveResult: document.getElementById('qaSaveResult'),

    pvModeBtns: document.querySelectorAll('.pv-mode'),
    qaPreviewRegion: document.getElementById('qaPreviewRegion'),
    qaAddedList: document.getElementById('qaAddedList')
  };

  // Guard: this script is only meaningful on upload.html. If the quick-add
  // markup isn't present, do nothing (keeps this file safe to include
  // elsewhere without errors).
  if(!els.viewQuickAdd) return;

  let qaImages = [];        // ordered array of dataURLs, maps to \includegraphics by position
  let previewMode = 'side'; // 'side' | 'tab'
  let currentPaperKey = ''; // '' means "new paper"

  /* ---------------------------------------------------------- boot */
  async function boot(){
    await DB.open();
    wireModeTabs();
    wireComposerTabs();
    wirePreviewToggle();
    await refreshPaperOptions();
    wireEvents();
    scheduleRender();
  }

  /* ---------------------------------------------------------- batch vs quick-add toggle */
  function wireModeTabs(){
    els.modeTabs.forEach(btn => btn.addEventListener('click', () => {
      els.modeTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      els.viewBatch.hidden = mode !== 'batch';
      els.viewQuickAdd.hidden = mode !== 'quickadd';
      if(mode === 'quickadd') scheduleRender();
    }));
  }

  /* ---------------------------------------------------------- composer field tabs */
  function wireComposerTabs(){
    els.qaTabs.forEach(btn => btn.addEventListener('click', () => {
      els.qaTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      els.qaFields.forEach(f => f.classList.toggle('active', f.dataset.field === btn.dataset.field));
    }));
  }

  /* ---------------------------------------------------------- preview mode toggle */
  function wirePreviewToggle(){
    els.pvModeBtns.forEach(btn => btn.addEventListener('click', () => {
      els.pvModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      previewMode = btn.dataset.pvmode;
      renderPreview();
    }));
  }

  /* ---------------------------------------------------------- paper picker */
  async function refreshPaperOptions(){
    const papers = await DB.getAllPapers();
    const keep = els.qaPaperSelect.value;
    els.qaPaperSelect.innerHTML = '<option value="">— New paper —</option>' +
      papers.map(p => `<option value="${escAttr(p.paperKey)}">${escHTML(p.subject)} &middot; Paper ${escHTML(String(p.paper))}/${escHTML(String(p.variant))} &middot; ${escHTML(p.session)} ${escHTML(String(p.year))}</option>`).join('');
    if(papers.some(p => p.paperKey === keep)) els.qaPaperSelect.value = keep;
  }

  async function onPaperPicked(){
    currentPaperKey = els.qaPaperSelect.value;
    if(!currentPaperKey){
      await suggestNextQuestionNumber();
      return;
    }
    const papers = await DB.getAllPapers();
    const p = papers.find(x => x.paperKey === currentPaperKey);
    if(!p) return;
    els.qaSubject.value = p.subject || '';
    els.qaSubjectCode.value = p.subjectCode || '';
    els.qaPaper.value = p.paper || '';
    els.qaVariant.value = p.variant || '';
    els.qaSession.value = p.session || '';
    els.qaYear.value = p.year || '';
    await suggestNextQuestionNumber();
  }

  async function suggestNextQuestionNumber(){
    const meta = currentMeta();
    if(!meta.subject || !meta.paper || !meta.variant || !meta.session || !meta.year){
      els.qaQNum.value = els.qaQNum.value || '1';
      return;
    }
    const paperKey = DB.paperKeyOf(meta);
    const existing = await DB.getQuestionsByPaperKey(paperKey);
    const nextId = existing.length ? Math.max(...existing.map(q => q.id)) + 1 : 1;
    els.qaQNum.value = String(nextId);
  }

  function currentMeta(){
    return {
      subject: els.qaSubject.value.trim(),
      subjectCode: els.qaSubjectCode.value.trim(),
      paper: els.qaPaper.value.trim(),
      variant: els.qaVariant.value.trim(),
      session: els.qaSession.value.trim(),
      year: els.qaYear.value.trim()
    };
  }

  /* ---------------------------------------------------------- images (ordered) */
  function handleImageFiles(files){
    const list = Array.from(files);
    let remaining = list.length;
    if(!remaining) return;
    list.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        qaImages.push(reader.result);
        renderImgChips();
        remaining--;
        if(remaining === 0) scheduleRender();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImgChips(){
    els.qaImgChips.innerHTML = qaImages.map((src, i) => `
      <span class="img-chip">#${i + 1} <img src="${src}" alt=""><button data-i="${i}" title="Remove">&times;</button></span>`).join('');
    els.qaImgChips.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        qaImages.splice(Number(btn.dataset.i), 1);
        renderImgChips();
        scheduleRender();
      });
    });
  }

  /* ---------------------------------------------------------- live preview */
  function currentSources(){
    return {
      question: els.qaQuestionSrc.value,
      sampleanswer: els.qaSampleAnswerSrc.value
    };
  }

  function parseAll(){
    const src = currentSources();
    const q = TexParse.parseFragment(src.question, qaImages);
    const sa = src.sampleanswer.trim() ? TexParse.parseFragment(src.sampleanswer, qaImages) : null;
    return { src, q, sa };
  }

  function renderPreview(){
    const { src, q, sa } = parseAll();

    let html = '';
    if(previewMode === 'side'){
      html += `
        <div class="side-by-side">
          <div>
            <div class="qa-pv-label">Source</div>
            <textarea class="qa-pv-source" readonly>${escHTML(src.question)}</textarea>
          </div>
          <div>
            <div class="qa-pv-label">Rendered</div>
            <div class="question-shell qa-pv-surface">${q.html || '<p><i>Nothing to preview yet — paste a question above.</i></p>'}</div>
          </div>
        </div>`;
    } else {
      html += `<div class="question-shell qa-pv-surface">${q.html || '<p><i>Nothing to preview yet — paste a question above.</i></p>'}</div>`;
    }

    if(src.sampleanswer.trim()){
      html += `<div class="qa-pv-label" style="margin-top:16px;">Exemplar / sample answer preview</div>
        <div class="question-shell qa-pv-surface">${sa.html}</div>`;
    }

    els.qaPreviewRegion.innerHTML = html;

    // Flag \includegraphics references beyond what's been attached so far.
    if(q.imageCount > qaImages.length){
      els.qaImgWarn.innerHTML = `<span style="color:var(--marker-dark);">This question references ${q.imageCount} image${q.imageCount === 1 ? '' : 's'} but only ${qaImages.length} ${qaImages.length === 1 ? 'is' : 'are'} attached — attach more, or the missing ones will show as placeholders.</span>`;
    } else {
      els.qaImgWarn.textContent = '';
    }

    if(typeof renderMathInElement === 'function'){
      renderMathInElement(els.qaPreviewRegion, {
        delimiters: [
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }
  }

  let renderTimer = null;
  function scheduleRender(){
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 250);
  }

  /* ---------------------------------------------------------- add to bank */
  async function addToBank(){
    const meta = currentMeta();
    const complete = meta.subject && meta.paper && meta.variant && meta.session && meta.year;
    if(!complete){
      els.qaSaveResult.innerHTML = `<span style="color:var(--marker-dark);">Fill in subject / paper / variant / session / year first.</span>`;
      return;
    }
    const src = currentSources();
    if(!src.question.trim()){
      els.qaSaveResult.innerHTML = `<span style="color:var(--marker-dark);">Paste some question text first.</span>`;
      return;
    }
    const qnum = parseInt(els.qaQNum.value, 10);
    if(!qnum || qnum < 1){
      els.qaSaveResult.innerHTML = `<span style="color:var(--marker-dark);">Give this question a valid question number.</span>`;
      return;
    }

    const { q, sa } = parseAll();
    const record = {
      id: qnum,
      topic: els.qaTopic.value.trim() || 'Uncategorised',
      marks: els.qaMarks.value.trim() || '',
      ref: `${DB.paperLabel(meta)} — Q${qnum}`,
      qText: stripHTML(q.html).replace(/\s+/g, ' ').trim().slice(0, 4000),
      qHTML: q.html,
      markScheme: [],
      exemplarHTML: sa ? sa.html : '',
      videoId: ''
    };

    els.qaAddBtn.disabled = true;
    els.qaSaveResult.textContent = 'Saving…';
    try{
      await DB.addQuestions(meta, [record]);
      els.qaSaveResult.innerHTML = `<span class="save-ok">&#10003; Added Q${qnum}. <a href="index.html">Open in Browse &rarr;</a></span>`;
      await refreshPaperOptions();
      els.qaPaperSelect.value = DB.paperKeyOf(meta);
      currentPaperKey = els.qaPaperSelect.value;
      await pushAddedRow(record);
      clearComposerOnly();
      await suggestNextQuestionNumber();
    } catch(err){
      els.qaSaveResult.innerHTML = `<span style="color:var(--marker-dark);">Could not save: ${escHTML(err.message || String(err))}</span>`;
    } finally {
      els.qaAddBtn.disabled = false;
    }
  }

  function stripHTML(html){
    if(!html) return '';
    return html.replace(/<[^>]*>/g, ' ');
  }

  /* ---------------------------------------------------------- "already added" session list */
  const addedRows = [];
  async function pushAddedRow(record){
    addedRows.unshift(record);
    els.qaAddedList.innerHTML = addedRows.map(r => `
      <div class="preview-q">
        <h4>Q${r.id} <span class="topic-chip">${escHTML(r.topic)}</span> <span class="topic-chip">${escHTML(String(r.marks || '?'))} marks</span></h4>
        <div class="question-shell">${r.qHTML}</div>
      </div>`).join('');
    if(typeof renderMathInElement === 'function'){
      renderMathInElement(els.qaAddedList, {
        delimiters: [
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }
  }

  /* ---------------------------------------------------------- clearing */
  function clearComposerOnly(){
    els.qaQuestionSrc.value = '';
    els.qaSampleAnswerSrc.value = '';
    els.qaTopic.value = '';
    els.qaMarks.value = '';
    qaImages = [];
    renderImgChips();
    scheduleRender();
  }

  function clearEverything(){
    clearComposerOnly();
    els.qaPaperSelect.value = '';
    els.qaSubject.value = ''; els.qaSubjectCode.value = '';
    els.qaPaper.value = ''; els.qaVariant.value = '';
    els.qaSession.value = ''; els.qaYear.value = '';
    currentPaperKey = '';
    els.qaQNum.value = '1';
  }

  /* ---------------------------------------------------------- wiring ---------------------------------------------------------- */
  function wireEvents(){
    els.qaPaperSelect.addEventListener('change', onPaperPicked);
    [els.qaSubject, els.qaSubjectCode, els.qaPaper, els.qaVariant, els.qaSession, els.qaYear]
      .forEach(inp => inp.addEventListener('input', () => { suggestNextQuestionNumber(); }));

    [els.qaQuestionSrc, els.qaSampleAnswerSrc].forEach(ta => {
      ta.addEventListener('input', scheduleRender);
    });

    els.qaImageInput.addEventListener('change', () => handleImageFiles(els.qaImageInput.files));

    els.qaAddBtn.addEventListener('click', addToBank);
    els.qaClearBtn.addEventListener('click', clearEverything);
  }

  function escHTML(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function escAttr(s){ return escHTML(s).replace(/"/g, '&quot;'); }

  document.addEventListener('DOMContentLoaded', boot);

})();