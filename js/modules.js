/* =====================================================================
   School Wits — Module builder & storefront logic
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
    '\\textperiodcentered': '\\cdot',
    '\\textbf': '\\mathbf{#1}',
    '\\textit': '\\mathit{#1}',
    '\\texttt': '\\mathtt{#1}'
  };

  // Renders a question's stored `content` into markup — same renderer the
  // Browse page uses, so a module preview and the real question look alike.
  const renderer = new SWRender.QuestionRenderer();

  const els = {
    modeTabs: document.querySelectorAll('#modeTabs a'),
    viewStorefront: document.getElementById('viewStorefront'),
    viewBuilder: document.getElementById('viewBuilder'),

    moduleGrid: document.getElementById('moduleGrid'),
    moduleDetail: document.getElementById('moduleDetail'),

    topicPills: document.getElementById('topicPills'),
    builderSearch: document.getElementById('builderSearch'),
    pickList: document.getElementById('pickList'),
    selCount: document.getElementById('selCount'),

    modTitle: document.getElementById('modTitle'),
    modTopic: document.getElementById('modTopic'),
    modDesc: document.getElementById('modDesc'),
    modPremium: document.getElementById('modPremium'),
    modPrice: document.getElementById('modPrice'),
    saveModBtn: document.getElementById('saveModBtn'),
    modSaveResult: document.getElementById('modSaveResult'),
    builtList: document.getElementById('builtList')
  };

  let allQuestions = [];
  let activeTopic = '';
  let selected = new Set();

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
    const facets = await DB.getFacets();

    els.topicPills.innerHTML = ['<button class="pill active" data-topic="">All topics</button>']
      .concat(facets.topics.map(t => {
        const count = allQuestions.filter(q => q.topic === t).length;
        return `<button class="pill" data-topic="${escAttr(t)}">${escHTML(t)}<span class="count">${count}</span></button>`;
      })).join('');

    els.topicPills.querySelectorAll('.pill').forEach(p => p.addEventListener('click', () => {
      els.topicPills.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      activeTopic = p.dataset.topic;
      if(activeTopic) els.modTopic.value = activeTopic;
      renderPickList();
    }));

    els.builderSearch.addEventListener('input', renderPickList);
    els.saveModBtn.addEventListener('click', saveModule);
    els.modPremium.addEventListener('change', () => {
      els.modPrice.disabled = els.modPremium.value === 'free';
      if(els.modPremium.value === 'free') els.modPrice.value = 0;
    });

    renderPickList();
    await refreshBuiltList();
  }

  function renderPickList(){
    const needle = els.builderSearch.value.trim().toLowerCase();
    let list = allQuestions;
    if(activeTopic) list = list.filter(q => q.topic === activeTopic);
    if(needle) list = list.filter(q => (q.topic + ' ' + q.ref + ' ' + (q.qText || '')).toLowerCase().includes(needle));

    if(list.length === 0){
      els.pickList.innerHTML = `<p class="hint">No questions match. Try a different topic, or <a href="upload.html">upload more papers</a>.</p>`;
    } else {
      els.pickList.innerHTML = list.map(q => `
        <div class="pickrow">
          <label style="display:flex;gap:10px;align-items:flex-start;flex:1;">
            <input type="checkbox" data-uid="${escAttr(q.uid)}" ${selected.has(q.uid) ? 'checked' : ''}>
            <span class="pickrow-body">
              <span class="pickrow-title">Q${q.id} &middot; ${escHTML(q.topic)} &middot; ${escHTML(String(q.marks || '?'))} marks</span>
              <span class="pickrow-meta">${escHTML(q.ref || DB.paperLabel(q))}</span>
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

  function updateSelCount(){
    els.selCount.textContent = `${selected.size} selected`;
  }

  async function saveModule(){
    const title = els.modTitle.value.trim();
    const topic = els.modTopic.value.trim() || activeTopic;
    const premium = els.modPremium.value === 'premium';
    const price = premium ? Math.max(0, Number(els.modPrice.value) || 0) : 0;

    if(!title){ els.modSaveResult.innerHTML = '<span style="color:var(--marker-dark);">Give the module a title first.</span>'; return; }
    if(selected.size === 0){ els.modSaveResult.innerHTML = '<span style="color:var(--marker-dark);">Select at least one question.</span>'; return; }

    await DB.saveModule({
      title, topic,
      description: els.modDesc.value.trim(),
      premium, price,
      currency: '৳',
      questionUids: Array.from(selected)
    });

    els.modSaveResult.innerHTML = `<span style="color:#2A6B42;font-weight:600;">Saved. Visible on the Storefront tab.</span>`;
    selected = new Set();
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
          <div class="pickrow-meta">${escHTML(m.topic || 'Mixed topics')} &middot; ${m.questionUids.length} question${m.questionUids.length === 1 ? '' : 's'} ${m.premium ? '&middot; ৳' + m.price : '&middot; Free'}</div>
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
          <div class="module-topic">${escHTML(m.topic || 'Mixed topics')}</div>
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

    if(typeof renderMathInElement === 'function'){
      renderMathInElement(els.moduleDetail, {
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
            <thead><tr><th>Part</th><th>Expected answer</th><th>Marks</th></tr></thead>
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
