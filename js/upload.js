/* =====================================================================
   School Wits — Upload

   Drives upload.html against the `parse-paper` Edge Function. Nothing is
   parsed in this page: the .tex parser lives in backend/src/latex and runs
   on the server, so there is only one copy of it to maintain.

   The flow, and why it is in this order:

     1. figures upload to the question-images bucket FIRST, because their
        public URLs are an INPUT to the parse — \qfig{fig1.png} resolves to
        a real URL during parsing rather than being patched afterwards
     2. POST the .tex + that URL map  -> parsed JSON + warnings, NO write
     3. render the preview with js/render/ (the same classes Browse uses)
     4. on confirm, POST again with commit:true -> the server re-parses and
        writes

   Step 4 re-parsing rather than sending back the JSON from step 2 is
   deliberate: it means the database can only ever contain something the
   parser actually produced.
   ===================================================================== */

(function () {
  'use strict';

  const FUNCTION_URL = window.SUPABASE_URL + '/functions/v1/parse-paper';
  const BUCKET = 'question-images';

  const renderer = new SWRender.QuestionRenderer({
    // 4-column papers (Add Maths, Maths D) carry a "Partial Marks" column
    // explaining how each mark is earned — "M1 for ... seen". It is part of
    // the official mark scheme, so it is shown rather than dropped.
    showGuidance: true
  });

  const state = {
    qpTex: null,
    qaTex: null,
    qpName: '',
    qaName: '',
    images: {},      // filename -> File, before upload
    imageUrls: {},   // filename -> public URL, after upload
    parsed: null,    // last preview response
    busy: false
  };

  const els = {};
  const ID = [
    'texQInput', 'texAInput', 'imgInput', 'texQDrop', 'texADrop', 'imgDrop',
    'texQFileName', 'texAFileName', 'imgFileList',
    'mSubject', 'mSubjectCode', 'mPaper', 'mVariant', 'mSession', 'mYear',
    'warnArea', 'saveCard', 'saveSummary', 'saveBtn', 'saveResult',
    'previewHint', 'previewDoc', 'previewTabs', 'paperList',
    'previewArea-paper', 'previewArea-markscheme', 'previewArea-exemplar'
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------------------------------------ transport */

  /**
   * Every call carries the signed-in admin's token, not the anon key. The
   * function checks is_admin() with it and writes as that user, so RLS is
   * what authorises the insert.
   */
  async function callFunction(body) {
    const { data: { session } } = await DB.client.auth.getSession();
    if (!session) throw new Error('Your session expired — sign in again.');

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': window.SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    let payload;
    try {
      payload = await res.json();
    } catch {
      throw new Error(`Server returned ${res.status} with no JSON body.`);
    }
    if (!res.ok) throw new Error(payload.error || `Request failed (${res.status}).`);
    return payload;
  }

  /**
   * Figures go straight to storage rather than through the function — it
   * keeps the request body at tens of KB instead of megabytes, and the
   * bucket enforces its own size/MIME limits on the way in.
   */
  async function uploadImages(paperId, names) {
    // The paper id is "5054/21/M/J/25"; Storage rejects "/" runs and other
    // punctuation in a key segment, so it is flattened the same way
    // backend/src/db.ts does it.
    const prefix = paperId.replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
    const urls = {};

    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      setImageStatus(`Uploading figures… ${i + 1}/${names.length}`);
      const path = `${prefix}/${name}`;
      const { error } = await DB.client.storage
        .from(BUCKET)
        .upload(path, state.images[name], {
          upsert: true,
          contentType: state.images[name].type || undefined
        });
      if (error) throw new Error(`Uploading ${name} failed: ${error.message}`);

      const { data } = DB.client.storage.from(BUCKET).getPublicUrl(path);
      urls[name] = data.publicUrl;
    }
    setImageStatus('');
    return urls;
  }

  /* --------------------------------------------------------------- inputs */

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsText(file);
    });
  }

  function pill(name, extra) {
    return `<span class="filepill">${esc(name)}${extra ? ` <small>${esc(extra)}</small>` : ''}</span>`;
  }

  async function onTexChosen(which, file) {
    if (!file) return;
    const text = await readFile(file);
    if (which === 'q') {
      state.qpTex = text;
      state.qpName = file.name;
      els.texQFileName.innerHTML = pill(file.name);
    } else {
      state.qaTex = text;
      state.qaName = file.name;
      els.texAFileName.innerHTML = pill(file.name);
    }
    refresh();
  }

  function onImagesChosen(fileList) {
    for (const file of fileList) {
      state.images[file.name] = file;
      // Re-dropping a file must re-upload it, not keep the stale URL.
      delete state.imageUrls[file.name];
    }
    renderImageList();
    refresh();
  }

  function renderImageList() {
    const names = Object.keys(state.images).sort();
    els.imgFileList.innerHTML = names.length
      ? names.map(n => pill(n, Math.round(state.images[n].size / 1024) + ' KB')).join(' ')
      : '';
  }

  function setImageStatus(message) {
    const existing = document.getElementById('imgStatus');
    if (!message) {
      if (existing) existing.remove();
      return;
    }
    const node = existing || Object.assign(document.createElement('p'), {
      id: 'imgStatus', className: 'hint'
    });
    node.textContent = message;
    if (!existing) els.imgFileList.insertAdjacentElement('afterend', node);
  }

  /* -------------------------------------------------------------- preview */

  async function refresh() {
    if (!state.qpTex || state.busy) return;
    state.busy = true;
    showWarnings([], 'Parsing…');

    try {
      let result = await callFunction({
        qpTex: state.qpTex,
        qaTex: state.qaTex,
        images: state.imageUrls
      });

      // Figures need the paper id for their storage prefix, and the paper id
      // only exists once something has parsed the \examq header — hence the
      // first pass above. Upload anything still pending, then parse again so
      // the preview shows real figures rather than placeholders. Checking a
      // paper without being able to see its diagrams is most of the point.
      const pending = Object.keys(state.images).filter(n => !state.imageUrls[n]);
      if (pending.length && result.paper) {
        state.imageUrls = Object.assign(
          state.imageUrls,
          await uploadImages(result.paper.paperId, pending)
        );
        result = await callFunction({
          qpTex: state.qpTex,
          qaTex: state.qaTex,
          images: state.imageUrls
        });
      }

      state.parsed = result;
      fillMeta(result.paper);
      renderPreview(result.questions);
      showWarnings(result.warnings, '');
      els.saveCard.hidden = false;
      els.saveSummary.textContent =
        `${result.questions.length} questions · ${result.questions.reduce((a, q) => a + q.marks, 0)} marks` +
        (state.qaTex ? '' : ' · no answers file yet');
    } catch (err) {
      state.parsed = null;
      els.saveCard.hidden = true;
      showWarnings([{ code: 'error', message: err.message }], '');
    } finally {
      state.busy = false;
    }
  }

  function fillMeta(paper) {
    if (!paper) return;
    els.mSubjectCode.value = paper.subjectCode || '';
    els.mPaper.value = paper.paper || '';
    els.mVariant.value = paper.variant || '';
    els.mSession.value = paper.session || '';
    els.mYear.value = paper.year || '';
    // Only guess the subject if the admin hasn't typed one — never overwrite.
    if (!els.mSubject.value.trim()) {
      els.mSubject.value = SUBJECT_BY_CODE[paper.subjectCode] || '';
    }
  }

  // The .tex carries a syllabus code, not a subject name. These cover the
  // papers in hand; anything else the admin types in.
  const SUBJECT_BY_CODE = {
    '5054': 'Physics',
    '4037': 'Add Maths',
    '4024': 'Maths D'
  };

  function renderPreview(questions) {
    if (!questions.length) return;
    els.previewHint.textContent = `${questions.length} questions parsed.`;
    els.previewDoc.hidden = false;

    const section = (q, inner) => `
      <article class="pd-qsection">
        <div class="pd-qhead">
          <span class="pd-qnum">Question ${q.number}</span>
          <span class="pd-qtopic">${esc(q.topics.join(' · '))}</span>
          <span class="pd-qmarks">${esc(q.marks)} marks</span>
        </div>
        ${inner}
      </article>`;

    els['previewArea-paper'].innerHTML = questions.map(q =>
      section(q, `<div class="pd-qbody">${renderer.toQuestionHtml(q)}</div>`)).join('');

    els['previewArea-markscheme'].innerHTML = questions.map(q => {
      const rows = renderer.toMarkSchemeRows(q).map(r => r.isBanner
        ? `<tr class="ms-banner-row"><td colspan="3">${r.answer}</td></tr>`
        : `<tr><td>${esc(r.part)}</td><td>${r.answer}</td><td>${esc(r.marks)}</td></tr>`
      ).join('') || '<tr><td colspan="3"><i>No mark scheme.</i></td></tr>';
      return section(q, `<table class="mstable">
        <thead><tr><th>Part</th><th>Expected answer</th><th>Mark</th></tr></thead>
        <tbody>${rows}</tbody></table>`);
    }).join('');

    els['previewArea-exemplar'].innerHTML = questions.map(q =>
      section(q, `<div class="exemplar-box">${renderer.toExemplarHtml(q)}</div>`)).join('');

    // Same config as the live pages, so the preview is a faithful check of
    // what Browse will show rather than an approximation of it.
    SWKatex.renderMathIn(els.previewDoc);
  }

  /**
   * Warnings are shown, never suppressed. Most are advisory (a figure the
   * parser could not resolve), but marks-mismatch and unmatched-question
   * usually mean the source is wrong, and it is much cheaper to fix before
   * saving than after.
   */
  function showWarnings(warnings, status) {
    if (status) {
      els.warnArea.innerHTML = `<div class="section-card"><p class="hint">${esc(status)}</p></div>`;
      return;
    }
    if (!warnings || !warnings.length) {
      els.warnArea.innerHTML = '';
      return;
    }
    els.warnArea.innerHTML = `
      <div class="section-card">
        <h2>${warnings.length} thing${warnings.length === 1 ? '' : 's'} to check</h2>
        <ul class="warnbox">
          ${warnings.map(w => `<li><code>${esc(w.code)}</code> ${esc(w.message)}</li>`).join('')}
        </ul>
      </div>`;
  }

  /* ----------------------------------------------------------------- save */

  async function save() {
    if (!state.parsed || state.busy) return;
    state.busy = true;
    els.saveBtn.disabled = true;
    els.saveResult.textContent = '';

    try {
      // Figures are already in the bucket by now (refresh uploads them so the
      // preview can show them), so saving is a single call.
      const result = await callFunction({
        qpTex: state.qpTex,
        qaTex: state.qaTex,
        images: state.imageUrls,
        subject: els.mSubject.value.trim(),
        commit: true
      });

      els.saveResult.innerHTML =
        `<span class="save-ok">Saved ${result.questionCount} questions.</span> ` +
        `<a href="index.html">Browse them →</a>`;
      showWarnings(result.warnings, '');
      renderPreview(result.questions);
      loadPapers();
    } catch (err) {
      els.saveResult.innerHTML = `<span class="topic-chip topic-chip--warn">${esc(err.message)}</span>`;
    } finally {
      state.busy = false;
      els.saveBtn.disabled = false;
    }
  }

  /* -------------------------------------------------------- existing list */

  async function loadPapers() {
    try {
      const papers = await DB.getAllPapers();
      els.paperList.innerHTML = papers.length
        ? papers.map(p => `
            <div class="pickrow">
              <div class="pickrow-body">
                <div class="pickrow-title">${esc(p.label)}</div>
                <div class="pickrow-meta">${esc(p.subject)}</div>
              </div>
              <button class="btn btn--ghost" data-delete="${esc(p.paperKey)}">Delete</button>
            </div>`).join('')
        : '<p class="hint">Nothing uploaded yet.</p>';
    } catch (err) {
      els.paperList.innerHTML = `<p class="hint">Could not load papers: ${esc(err.message)}</p>`;
    }
  }

  async function deletePaper(paperKey) {
    if (!confirm(`Delete ${paperKey}? Every question from it goes too.`)) return;
    try {
      await DB.deletePaper(paperKey);
      loadPapers();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  }

  /* ----------------------------------------------------------------- wire */

  function dropzone(zone, input, handler) {
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    ['dragenter', 'dragover'].forEach(evt =>
      zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(evt =>
      zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', e => handler(e.dataTransfer.files));
    input.addEventListener('change', () => handler(input.files));
  }

  function boot() {
    for (const id of ID) els[id] = document.getElementById(id);

    dropzone(els.texQDrop, els.texQInput, files => onTexChosen('q', files[0]));
    dropzone(els.texADrop, els.texAInput, files => onTexChosen('a', files[0]));
    dropzone(els.imgDrop, els.imgInput, files => onImagesChosen(files));

    els.saveBtn.addEventListener('click', save);

    els.previewTabs.addEventListener('click', e => {
      const tab = e.target.closest('.pd-tab');
      if (!tab) return;
      els.previewTabs.querySelectorAll('.pd-tab').forEach(t =>
        t.classList.toggle('active', t === tab));
      els.previewDoc.querySelectorAll('.pd-doc').forEach(doc =>
        doc.classList.toggle('active', doc.id === 'previewArea-' + tab.dataset.doc));
    });

    els.paperList.addEventListener('click', e => {
      const btn = e.target.closest('[data-delete]');
      if (btn) deletePaper(btn.dataset.delete);
    });

    loadPapers();
  }

  // admin-gate.js reveals #adminGateContent once signed in; booting before
  // that would query papers as an anonymous user and wire dead elements.
  document.addEventListener('sw:admin-ready', boot);
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('adminGateContent').hidden) boot();
  });
})();
