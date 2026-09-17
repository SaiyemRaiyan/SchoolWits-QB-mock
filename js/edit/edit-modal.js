/* =====================================================================
   School Wits — question edit modal (admin only)

   Opens on a stored question, shows every field the server says is
   editable, and posts back only the ones that changed.

   Two things this file deliberately does NOT do:

   1. It does not walk `content` to work out what is editable. The
      update-question Edge Function returns the leaf list, and that same
      list is what it validates against on save. A copy of that logic here
      would be a second opinion, and the two would drift — which is exactly
      what happened to flattenQuestion before it was consolidated.

   2. It does not parse LaTeX. Stored text is plain text plus the seven
      inline tags the parser emits (<strong> <em> <u> <code> <sup> <sub>
      <br>), with math left in raw $…$ / \[…\] delimiters for KaTeX to pick
      up at render time. So a field is just a textarea, and the preview is
      the same SWKatex the page already uses.
   ===================================================================== */

window.SWEdit = (function () {
  'use strict';

  // Which leaf kinds get a live math preview. A code ("B1") or a figure
  // caption ("Fig. 1.1") never contains math, so a preview under those is
  // noise; the rest can and regularly do.
  const PREVIEW_KINDS = new Set(['text', 'markscheme', 'guidance', 'solution', 'option']);

  // Short fields get an <input>, prose gets a <textarea>.
  const SHORT_KINDS = new Set(['code', 'caption', 'heading']);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /** Does this value contain anything KaTeX would render? */
  function hasMath(value) {
    return /\$|\\\(|\\\[/.test(value);
  }

  /**
   * Group leaves under a heading, preserving server order.
   *
   * The leaf label is "1(c)(ii) · body"; the part before the separator is
   * the group. Grouping is presentational only — the path is what
   * identifies a field, and that is never derived from the label.
   */
  function group(leaves) {
    const groups = [];
    const byName = new Map();
    leaves.forEach((leaf, index) => {
      const name = leaf.label.split(' · ')[0];
      if (!byName.has(name)) {
        const g = { name, items: [] };
        byName.set(name, g);
        groups.push(g);
      }
      byName.get(name).items.push({ leaf, index });
    });
    return groups;
  }

  function fieldHtml(leaf, index) {
    const sub = leaf.label.split(' · ').slice(1).join(' · ') || leaf.label;
    const control = SHORT_KINDS.has(leaf.kind)
      ? `<input class="eq-input" type="text" data-i="${index}" value="${esc(leaf.value)}">`
      : `<textarea class="eq-input" data-i="${index}" rows="3">${esc(leaf.value)}</textarea>`;
    const preview = PREVIEW_KINDS.has(leaf.kind)
      ? `<div class="eq-preview" data-preview="${index}" hidden></div>`
      : '';
    return `
      <div class="eq-field" data-field="${index}">
        <label class="eq-label">
          <span class="eq-label-text">${esc(sub)}</span>
          <span class="eq-changed" data-changed="${index}" hidden>changed</span>
        </label>
        ${control}
        ${preview}
      </div>`;
  }

  /**
   * open(questionId, onSaved)                     — edit the question in the bank
   * open(questionId, { moduleId, onSaved })       — edit ONE module's copy
   *
   * The two-argument form is what js/app.js (Browse) calls and is kept as
   * is. With a moduleId the edits land on module_questions.content_override
   * and the paper in the bank is never written — see migration 0018.
   */
  function open(questionId, options) {
    const opts = typeof options === 'function' ? { onSaved: options } : (options || {});
    const moduleId = opts.moduleId != null ? opts.moduleId : null;
    const onSaved = opts.onSaved;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop eq-backdrop';
    backdrop.innerHTML = `
      <div class="modal eq-modal" role="dialog" aria-modal="true" aria-label="Edit question">
        <div class="eq-head">
          <div>
            <h2 class="eq-title">Edit question</h2>
            <p class="eq-sub" id="eqRef">Loading…</p>
          </div>
          <button class="eq-close" type="button" aria-label="Close">&times;</button>
        </div>
        ${moduleId != null ? `
          <div class="eq-banner">
            <strong>Editing this module's own copy.</strong>
            The question in the bank, and every other module using it, stays
            as the paper has it. Change a value and the mark scheme and
            worked solution below will need changing too — nothing can
            recompute them.
          </div>` : ''}
        <div class="eq-body" id="eqBody"><p class="hint">Loading the editable fields…</p></div>
        <div class="eq-foot">
          <div class="eq-status" id="eqStatus"></div>
          <div class="eq-actions">
            ${moduleId != null ? '<button class="btn" type="button" id="eqReset" hidden>Reset to original</button>' : ''}
            <button class="btn" type="button" id="eqCancel">Cancel</button>
            <button class="btn btn--primary" type="button" id="eqSave" disabled>Save changes</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(backdrop);

    const body = backdrop.querySelector('#eqBody');
    const status = backdrop.querySelector('#eqStatus');
    const saveBtn = backdrop.querySelector('#eqSave');
    let leaves = [];
    let saved = false;

    function close() {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') attemptClose();
    }
    function attemptClose() {
      // Losing typed edits to a stray Escape is worse than one extra click.
      if (!saved && changedEdits().length > 0) {
        if (!window.confirm('Discard your unsaved changes to this question?')) return;
      }
      close();
    }
    backdrop.querySelector('.eq-close').addEventListener('click', attemptClose);
    backdrop.querySelector('#eqCancel').addEventListener('click', attemptClose);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) attemptClose(); });
    document.addEventListener('keydown', onKey);

    function inputs() {
      return Array.from(backdrop.querySelectorAll('.eq-input'));
    }

    /** Only the fields whose value differs from what the server sent. */
    function changedEdits() {
      return inputs()
        .map((el) => ({ leaf: leaves[Number(el.dataset.i)], value: el.value }))
        .filter((x) => x.leaf && x.value !== x.leaf.value)
        .map((x) => ({ path: x.leaf.path, value: x.value }));
    }

    function refreshState() {
      const n = changedEdits().length;
      saveBtn.disabled = n === 0;
      status.textContent = n === 0 ? '' : `${n} field${n === 1 ? '' : 's'} changed`;
      inputs().forEach((el) => {
        const i = Number(el.dataset.i);
        const flag = backdrop.querySelector(`[data-changed="${i}"]`);
        if (flag) flag.hidden = el.value === leaves[i].value;
      });
    }

    function updatePreview(el) {
      const i = Number(el.dataset.i);
      const box = backdrop.querySelector(`[data-preview="${i}"]`);
      if (!box) return;
      if (!hasMath(el.value)) { box.hidden = true; return; }
      box.hidden = false;
      // The stored string is HTML-with-math, which is exactly what the page
      // renders elsewhere, so it goes in as-is and KaTeX is run over it.
      box.innerHTML = el.value;
      try {
        SWKatex.renderMathIn(box);
        box.classList.remove('eq-preview--error');
      } catch (err) {
        box.classList.add('eq-preview--error');
        box.textContent = 'Math error: ' + err.message;
      }
    }

    function wire() {
      inputs().forEach((el) => {
        el.addEventListener('input', () => { refreshState(); updatePreview(el); });
        updatePreview(el);
      });
      refreshState();
    }

    function applyLoaded(res) {
      leaves = res.leaves || [];
      const edited = res.edited === true;
      backdrop.querySelector('#eqRef').textContent =
        `${res.ref || '#' + questionId} · ${leaves.length} editable field${leaves.length === 1 ? '' : 's'}`
        + (edited ? ' · edited for this module' : '');
      // Only offer Reset once there is actually a copy to discard.
      const resetBtn = backdrop.querySelector('#eqReset');
      if (resetBtn) resetBtn.hidden = !edited;
    }

    DB.getQuestionLeaves(questionId, moduleId).then((res) => {
      applyLoaded(res);
      if (leaves.length === 0) {
        body.innerHTML = '<p class="hint">This question has no editable text fields.</p>';
        return;
      }
      body.innerHTML = group(leaves).map((g) => `
        <section class="eq-group">
          <h3 class="eq-group-title">${esc(g.name)}</h3>
          ${g.items.map((it) => fieldHtml(it.leaf, it.index)).join('')}
        </section>`).join('');
      wire();
    }).catch((err) => {
      body.innerHTML = `<p class="eq-error">${esc(err.message)}</p>`;
    });

    const resetBtn = backdrop.querySelector('#eqReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (!window.confirm(
          'Discard this module\u2019s edited copy and go back to the paper\u2019s version? '
          + 'The other modules using this question are unaffected either way.'
        )) return;
        resetBtn.disabled = true;
        status.textContent = 'Resetting\u2026';
        try {
          const res = await DB.resetQuestionOverride(moduleId, questionId);
          saved = true;
          // Redraw from the paper's version rather than closing, so it is
          // visible that the reset actually took.
          applyLoaded(res);
          body.innerHTML = group(leaves).map((g) => `
            <section class="eq-group">
              <h3 class="eq-group-title">${esc(g.name)}</h3>
              ${g.items.map((it) => fieldHtml(it.leaf, it.index)).join('')}
            </section>`).join('');
          wire();
          status.textContent = 'Reset to the original.';
          if (typeof onSaved === 'function') onSaved(res.content, { edited: false });
        } catch (err) {
          resetBtn.disabled = false;
          status.innerHTML = `<span class="eq-error">${esc(err.message)}</span>`;
        }
      });
    }

    saveBtn.addEventListener('click', async () => {
      const edits = changedEdits();
      if (edits.length === 0) return;
      saveBtn.disabled = true;
      status.textContent = 'Saving…';
      try {
        const res = await DB.saveQuestionEdits(questionId, edits, moduleId);
        saved = true;
        status.textContent = `Saved ${res.applied} change${res.applied === 1 ? '' : 's'}.`;
        // The response carries the stored content, so the page can re-render
        // from what the database actually holds rather than from what was
        // typed — if the server normalised anything, that is what shows.
        if (typeof onSaved === 'function') onSaved(res.content, { edited: res.edited === true });
        setTimeout(close, 600);
      } catch (err) {
        saveBtn.disabled = false;
        status.innerHTML = `<span class="eq-error">${esc(err.message)}</span>`;
      }
    });
  }

  return { open };
})();
