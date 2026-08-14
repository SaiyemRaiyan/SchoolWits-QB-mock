/* =====================================================================
   School Wits — Module builder & storefront logic
   ===================================================================== */

(function(){

  // Math rendering (macros + delimiters) lives in js/katex-config.js.

  // Renders a question's stored `content` into markup — same renderer the
  // Browse page uses, so a module preview and the real question look alike.
  const renderer = new SWRender.QuestionRenderer();

  const els = {
    modeTabs: document.querySelectorAll('#modeTabs a'),
    viewStorefront: document.getElementById('viewStorefront'),
    viewBuilder: document.getElementById('viewBuilder'),

    moduleGrid: document.getElementById('moduleGrid'),
    moduleDetail: document.getElementById('moduleDetail'),

    bSubject: document.getElementById('bSubject'),
    bPaper: document.getElementById('bPaper'),
    topicPills: document.getElementById('topicPills'),
    builderSearch: document.getElementById('builderSearch'),
    pickList: document.getElementById('pickList'),
    selCount: document.getElementById('selCount'),
    selSummary: document.getElementById('selSummary'),

    modTitle: document.getElementById('modTitle'),
    modTopicPills: document.getElementById('modTopicPills'),
    modTopicEmpty: document.getElementById('modTopicEmpty'),
    modDesc: document.getElementById('modDesc'),
    modPremium: document.getElementById('modPremium'),
    modPrice: document.getElementById('modPrice'),
    saveModBtn: document.getElementById('saveModBtn'),
    modSaveResult: document.getElementById('modSaveResult'),
    builtList: document.getElementById('builtList')
  };

  let allQuestions = [];
  let allPapers = [];
  // Filter state. `activeTopics` is a Set because topic filtering is now
  // multi-select (match ANY), which is what makes "one pack, several topics"
  // possible in the first place.
  let activeSubject = '';
  let activePaperKey = '';
  let activeTopics = new Set();

  // Picked questions, keyed by uid. Deliberately survives every filter
  // change — the whole point is assembling one module from questions that no
  // single filter shows together.
  let selected = new Set();
  // Topics the user has explicitly UNticked in the form. Everything else is
  // derived from the picked questions, so the derived list stays live as the
  // selection grows instead of going stale the moment it is touched once.
  let excludedTopics = new Set();

  /* ---------------------------------------------------------- boot */
  async function boot(){
    await DB.open();
    wireModeTabs();
    await refreshBuilder();
    await refreshStorefront();
  }

  function wireModeTabs(){
    els.modeTabs.forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      els.modeTabs.forEach(x => x.classList.remove('active'));
      a.classList.add('active');
      const mode = a.dataset.mode;
      els.viewStorefront.hidden = mode !== 'storefront';
      els.viewBuilder.hidden = mode !== 'builder';
    }));
  }

  /* ================================================================ BUILDER */
  async function refreshBuilder(){
    allQuestions = await DB.getAllQuestions();
    allPapers = await DB.getAllPapers();
    const facets = await DB.getFacets();

    // Subject is the outermost scope, so it is a plain select rather than
    // pills: it is a single choice and changing it invalidates everything
    // below. Defaults to the first subject so the page is never empty.
    els.bSubject.innerHTML = facets.subjects
      .map(s => `<option value="${escAttr(s)}">${escHTML(s)}</option>`).join('');
    activeSubject = facets.subjects[0] || '';
    els.bSubject.value = activeSubject;

    els.bSubject.addEventListener('change', () => {
      activeSubject = els.bSubject.value;
      // Topics and papers are subject-specific, so a stale selection here
      // would silently filter everything out.
      activePaperKey = '';
      activeTopics.clear();
      renderPaperOptions();
      renderTopicPills();
      renderPickList();
    });
    els.bPaper.addEventListener('change', () => {
      activePaperKey = els.bPaper.value;
      renderPickList();
    });

    els.builderSearch.addEventListener('input', renderPickList);
    els.saveModBtn.addEventListener('click', saveModule);
    els.modPremium.addEventListener('change', () => {
      els.modPrice.disabled = els.modPremium.value === 'free';
      if(els.modPremium.value === 'free') els.modPrice.value = 0;
    });

    renderPaperOptions();
    renderTopicPills();
    renderPickList();
    await refreshBuiltList();
  }

  /** Questions in the chosen subject — the pool every other filter narrows. */
  function subjectQuestions(){
    return allQuestions.filter(q => q.subject === activeSubject);
  }

  function renderPaperOptions(){
    const papers = allPapers
      .filter(p => p.subject === activeSubject)
      .sort((a, b) => b.year - a.year || String(a.paper).localeCompare(String(b.paper)));
    els.bPaper.innerHTML = '<option value="">Any paper</option>' + papers.map(p => {
      const n = allQuestions.filter(q => q.paperKey === p.paperKey).length;
      return `<option value="${escAttr(p.paperKey)}">${escHTML(DB.paperLabel(p))} — ${n} question${n === 1 ? '' : 's'}</option>`;
    }).join('');
    els.bPaper.value = activePaperKey;
  }

  function renderTopicPills(){
    const pool = subjectQuestions();
    // Union of topics across the subject's questions, counted by how many
    // questions carry each — a question with three topics counts for all
    // three, which is why this is not a groupBy.
    const counts = new Map();
    pool.forEach(q => q.topics.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    const topics = Array.from(counts.keys()).sort();

    if(!topics.length){
      els.topicPills.innerHTML = '<p class="hint">No topics tagged in this subject yet.</p>';
      return;
    }

    els.topicPills.innerHTML =
      `<button class="pill ${activeTopics.size === 0 ? 'active' : ''}" data-topic="">All topics<span class="count">${pool.length}</span></button>` +
      topics.map(t => `<button class="pill ${activeTopics.has(t) ? 'active' : ''}" data-topic="${escAttr(t)}">${escHTML(t)}<span class="count">${counts.get(t)}</span></button>`).join('');

    els.topicPills.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => {
      const topic = p.dataset.topic;
      if(!topic) activeTopics.clear();            // "All topics" resets
      else if(activeTopics.has(topic)) activeTopics.delete(topic);
      else activeTopics.add(topic);
      renderTopicPills();
      renderPickList();
    }));
  }

  function renderPickList(){
    const needle = els.builderSearch.value.trim().toLowerCase();
    let list = subjectQuestions();
    if(activePaperKey) list = list.filter(q => q.paperKey === activePaperKey);
    // Match ANY selected topic. Questions carry a topic LIST, so the old
    // `q.topic === activeTopic` never matched a multi-topic question — its
    // `topic` is the joined display string ("Vectors · Kinematics").
    if(activeTopics.size) list = list.filter(q => q.topics.some(t => activeTopics.has(t)));
    if(needle) list = list.filter(q => (q.topic + ' ' + q.ref + ' ' + (q.qText || '')).toLowerCase().includes(needle));

    list.sort((a, b) => a.paperKey === b.paperKey ? a.id - b.id : a.paperKey.localeCompare(b.paperKey));

    if(list.length === 0){
      els.pickList.innerHTML = `<p class="hint">No questions match. Widen the topic or paper filter, or <a href="upload.html">upload more papers</a>.</p>`;
    } else {
      els.pickList.innerHTML = list.map(q => `
        <div class="pickrow">
          <label style="display:flex;gap:10px;align-items:flex-start;flex:1;">
            <input type="checkbox" data-uid="${escAttr(q.uid)}" ${selected.has(q.uid) ? 'checked' : ''}>
            <span class="pickrow-body">
              <span class="pickrow-title">Q${q.id} &middot; ${escHTML(q.topic || 'Untagged')} &middot; ${escHTML(String(q.marks || '?'))} marks</span>
              <span class="pickrow-meta">${escHTML(DB.paperLabel(q))}${q.ref ? ' &middot; ' + escHTML(q.ref) : ''}</span>
            </span>
          </label>
          <button class="btn btn--ghost btn--sm" type="button" data-video-uid="${escAttr(q.uid)}">${q.videoId ? 'Update video' : 'Add video'}</button>
        </div>`).join('');
      els.pickList.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', () => {
          if(cb.checked) selected.add(cb.dataset.uid); else selected.delete(cb.dataset.uid);
          updateSelCount();
        });
      });
      els.pickList.querySelectorAll('button[data-video-uid]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.videoUid;
          const q = allQuestions.find(item => item.uid === uid);
          const url = prompt(`Paste a YouTube link for Question ${q?.id || ''}`, q?.videoId ? `https://youtu.be/${q.videoId}` : '');
          if(!url) return;
          const id = extractYouTubeId(url);
          if(!id){ alert('Please use a valid YouTube URL or video ID.'); return; }
          const updated = await DB.setVideo(uid, id);
          const index = allQuestions.findIndex(item => item.uid === uid);
          if(index >= 0) allQuestions[index] = updated;
          renderPickList();
        });
      });
    }
    updateSelCount();
  }

  /** The picked questions themselves, in the order they were ticked. */
  function selectedQuestions(){
    const byUid = new Map(allQuestions.map(q => [q.uid, q]));
    return Array.from(selected).map(uid => byUid.get(uid)).filter(Boolean);
  }

  /**
   * Every topic across the picked questions, minus any the user unticked.
   * Derived rather than typed: the questions already carry the truth, and a
   * free-text box let a "Vectors" pack quietly fill up with Kinematics.
   */
  function derivedTopics(){
    const all = new Set();
    selectedQuestions().forEach(q => q.topics.forEach(t => all.add(t)));
    return Array.from(all).sort();
  }
  function chosenTopics(){
    return derivedTopics().filter(t => !excludedTopics.has(t));
  }

  function updateSelCount(){
    const picked = selectedQuestions();
    els.selCount.textContent = `${picked.length} selected`;

    // Spelling out the spread is the point of the builder: it is the only
    // place that shows a pack really does span several papers and topics.
    if(!picked.length){
      els.selSummary.textContent = 'Nothing picked yet.';
    } else {
      const marks = picked.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      const papers = new Set(picked.map(q => q.paperKey)).size;
      const topics = derivedTopics().length;
      els.selSummary.innerHTML =
        `${marks} marks &middot; ${papers} paper${papers === 1 ? '' : 's'} &middot; ${topics} topic${topics === 1 ? '' : 's'}`;
    }
    renderModTopicPills();
  }

  function renderModTopicPills(){
    const topics = derivedTopics();
    els.modTopicEmpty.hidden = topics.length > 0;
    els.modTopicPills.innerHTML = topics.map(t =>
      `<button type="button" class="pill ${excludedTopics.has(t) ? '' : 'active'}" data-modtopic="${escAttr(t)}">${escHTML(t)}</button>`
    ).join('');
    els.modTopicPills.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => {
      const t = p.dataset.modtopic;
      if(excludedTopics.has(t)) excludedTopics.delete(t); else excludedTopics.add(t);
      renderModTopicPills();
    }));
  }

  async function saveModule(){
    const title = els.modTitle.value.trim();
    const premium = els.modPremium.value === 'premium';
    const price = premium ? Math.max(0, Number(els.modPrice.value) || 0) : 0;
    const picked = selectedQuestions();

    if(!title){ els.modSaveResult.innerHTML = '<span style="color:var(--marker-dark);">Give the module a title first.</span>'; return; }
    if(!picked.length){ els.modSaveResult.innerHTML = '<span style="color:var(--marker-dark);">Select at least one question.</span>'; return; }

    // The subject is taken from the questions, not the filter dropdown — the
    // dropdown is where picking STARTED, and a stale value there would
    // mislabel the pack. They agree in normal use; this only matters if
    // selections were carried across a subject change.
    const subjects = Array.from(new Set(picked.map(q => q.subject)));
    if(subjects.length > 1){
      els.modSaveResult.innerHTML = `<span style="color:var(--marker-dark);">This pack mixes ${escHTML(subjects.join(' and '))}. A module covers one subject — untick the questions that don't belong.</span>`;
      return;
    }

    els.saveModBtn.disabled = true;
    try {
      await DB.saveModule({
        title,
        subject: subjects[0] || activeSubject,
        topics: chosenTopics(),
        description: els.modDesc.value.trim(),
        premium, price,
        currency: '৳',
        questionUids: Array.from(selected)
      });
    } catch (err) {
      els.modSaveResult.innerHTML = `<span style="color:var(--marker-dark);">Could not save: ${escHTML(err.message || String(err))}</span>`;
      return;
    } finally {
      els.saveModBtn.disabled = false;
    }

    els.modSaveResult.innerHTML = `<span style="color:#2A6B42;font-weight:600;">Saved. Visible on the Storefront tab.</span>`;
    selected = new Set();
    excludedTopics = new Set();
    els.modTitle.value = ''; els.modDesc.value = '';
    renderPickList();
    await refreshBuiltList();
    await refreshStorefront();
  }

  async function refreshBuiltList(){
    const mods = await DB.getAllModules();
    if(mods.length === 0){
      els.builtList.innerHTML = `<p class="hint">No modules yet — build your first one above.</p>`;
      return;
    }
    els.builtList.innerHTML = mods.map(m => `
      <div class="pickrow">
        <div class="pickrow-body">
          <div class="pickrow-title">${escHTML(m.title)} ${m.premium ? `<span class="module-badge" style="position:static;display:inline-block;color:var(--brass-dark);border-color:var(--brass);background:var(--brass-glow);">Premium</span>` : ''}</div>
          <div class="pickrow-meta">${m.subject ? escHTML(m.subject) + ' &middot; ' : ''}${escHTML(m.topicLabel)} &middot; ${m.questionUids.length} question${m.questionUids.length === 1 ? '' : 's'} ${m.premium ? '&middot; ৳' + m.price : '&middot; Free'}</div>
        </div>
        <button class="btn btn--danger btn--sm" data-id="${m.id}">Delete</button>
      </div>`).join('');
    els.builtList.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!confirm('Delete this module? (The underlying questions stay in the bank.)')) return;
        await DB.deleteModule(btn.dataset.id);
        await refreshBuiltList();
        await refreshStorefront();
      });
    });
  }

  /* ================================================================ STOREFRONT */
  async function refreshStorefront(){
    const mods = await DB.getAllModules();
    if(mods.length === 0){
      els.moduleGrid.innerHTML = `<div class="emptymodules" style="grid-column:1/-1;">No modules yet. Head to the <a href="#" data-mode="builder">Builder</a> tab to package your first topic pack.</div>`;
      els.moduleGrid.querySelector('a[data-mode]')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('#modeTabs a[data-mode="builder"]').click();
      });
      return;
    }
    els.moduleGrid.innerHTML = mods.map(m => {
      const owned = !m.premium || DB.isPurchased(m.id);
      return `
      <div class="module-card">
        <div class="module-card-top">
          ${m.premium ? '<span class="module-badge">Premium</span>' : ''}
          <div class="module-topic">${m.subject ? escHTML(m.subject) + ' &middot; ' : ''}${escHTML(m.topicLabel)}</div>
          <div class="module-title">${escHTML(m.title)}</div>
        </div>
        <div class="module-body">
          <div class="module-desc">${escHTML(m.description || 'A focused set of past-paper questions on this topic, with full mark schemes and exemplar answers.')}</div>
          <div class="module-foot">
            <span class="module-qcount">${m.questionUids.length} question${m.questionUids.length === 1 ? '' : 's'}</span>
            ${owned
              ? `<span class="module-owned">${m.premium ? 'Owned' : 'Free'}</span>`
              : `<span class="module-price">৳${m.price}</span>`}
          </div>
          <button class="btn ${owned ? 'btn--primary' : 'btn--ghost'}" style="margin-top:14px;width:100%;" data-open="${m.id}">${owned ? 'Open module' : 'Preview'}</button>
        </div>
      </div>`;
    }).join('');

    els.moduleGrid.querySelectorAll('button[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openModule(Number(btn.dataset.open)));
    });
  }

  async function openModule(id){
    const mod = await DB.getModule(id);
    if(!mod) return;
    const questions = await DB.getQuestionsByUids(mod.questionUids);
    const owned = !mod.premium || DB.isPurchased(mod.id);

    const listHTML = questions.map((q, i) => renderModQuestion(q, i, owned || i === 0)).join('');

    els.moduleDetail.innerHTML = `
      <div class="section-card">
        <h2>${escHTML(mod.title)}</h2>
        <p class="hint">${escHTML(mod.description || '')} &middot; ${questions.length} question${questions.length === 1 ? '' : 's'}</p>
        <div class="locked-wrap">
          <div id="modQuestions" class="${owned ? '' : 'locked-blur'}">${listHTML}</div>
          ${owned ? '' : `
          <div class="lockpanel">
            <div class="lockicon">&#128274;</div>
            <h3>Unlock the full module</h3>
            <p>The first question is open above as a preview. Unlock all ${questions.length} for ৳${mod.price}.</p>
            <button class="btn btn--primary" id="unlockBtn">Unlock — ৳${mod.price}</button>
          </div>`}
        </div>
      </div>`;

    SWKatex.renderMathIn(els.moduleDetail);

    const unlockBtn = document.getElementById('unlockBtn');
    if(unlockBtn) unlockBtn.addEventListener('click', () => showCheckout(mod, () => openModule(id)));

    els.moduleDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderModQuestion(q, i, visible){
    if(!visible){
      return `<div class="preview-q"><h4>Q${q.id} <span class="topic-chip">${escHTML(q.topic)}</span></h4><p style="color:var(--muted);">Locked.</p></div>`;
    }
    return `
      <div class="preview-q">
        <h4>Q${q.id} <span class="topic-chip">${escHTML(q.topic)}</span> <span class="topic-chip">${escHTML(String(q.marks || '?'))} marks</span></h4>
        ${renderer.toQuestionHtml(q.content)}
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-blue);">Mark scheme</summary>
          <table class="mstable" style="margin-top:8px;">
            <thead><tr><th>Part</th><th>Expected answer</th><th>Mark</th></tr></thead>
            <tbody>${renderer.toMarkSchemeRows(q.content).map(r => r.isBanner
              ? `<tr class="ms-banner-row"><td colspan="3">${r.answer}</td></tr>`
              : `<tr><td>${escHTML(r.part)}</td><td>${r.answer}</td><td>${escHTML(r.marks)}</td></tr>`).join('') || '<tr><td colspan="3"><i>None uploaded.</i></td></tr>'}</tbody>
          </table>
        </details>
        <details style="margin-top:8px;">
          <summary style="cursor:pointer;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent-blue);">Exemplar</summary>
          <div style="margin-top:8px;">${renderer.toExemplarHtml(q.content)}</div>
        </details>
      </div>`;
  }

  /* ================================================================ CHECKOUT (mock, local-only) */
  function showCheckout(mod, onDone){
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal">
        <h3>Unlock "${escHTML(mod.title)}"</h3>
        <p class="modal-sub">One-time purchase. Unlocks all ${mod.questionUids.length} questions with full mark schemes and exemplars, forever, on this device.</p>
        <div class="modal-price">৳${mod.price}</div>
        <div class="modal-note">This is a demo checkout — no real payment is taken. Connect a real payment provider (SSLCommerz, Stripe, bKash) before selling for real; the purchase flag is currently stored only in this browser.</div>
        <div class="modal-actions">
          <button class="btn btn--ghost" id="checkoutCancel">Cancel</button>
          <button class="btn btn--primary" id="checkoutConfirm">Confirm demo purchase</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', (e) => { if(e.target === wrap) wrap.remove(); });
    document.getElementById('checkoutCancel').addEventListener('click', () => wrap.remove());
    document.getElementById('checkoutConfirm').addEventListener('click', () => {
      DB.markPurchased(mod.id);
      wrap.remove();
      onDone();
      refreshStorefront();
    });
  }

  function extractYouTubeId(url){
    if(!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    if(m) return m[1];
    if(/^[\w-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  function escHTML(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function escAttr(s){ return escHTML(s).replace(/"/g, '&quot;'); }

  document.addEventListener('DOMContentLoaded', boot);

})();
