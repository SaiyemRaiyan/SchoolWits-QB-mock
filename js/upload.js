/* =====================================================================
   School Wits — Upload page logic
   Two .tex files build one paper: a Questions file (topic/marks/qtext)
   and an Answers file (markscheme/exemplar), matched by question number.
   ===================================================================== */

(function(){

  // Cycled per question number so the segmented preview matches the
  // colour-coded full-paper view on the Browse page.
  const ACCENTS = ['#2F6FB3', '#1D8A5C', '#B9762A', '#8B4FB0', '#C0392B', '#1A9E96', '#7A6A1E', '#4A5568'];

  const TEMPLATE_Q = `\\documentclass[11pt]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{enumitem}

% ============================================================================
%  HOW THIS FILE IS STRUCTURED — READ THIS BEFORE EDITING
%
%  There are TWO different "begin/end" pairs below and they are NOT the
%  same thing — mixing them up is the #1 cause of "no question blocks were
%  found" errors on upload.
%
%   1) \\begin{document} ... \\end{document}
%      Plain, standard LaTeX. It appears EXACTLY ONCE in the whole file —
%      right here, and again at the very bottom — and wraps everything.
%      Never add a second copy of it anywhere in the middle of the file.
%
%   2) \\begin{question}{n} ... \\end{question}
%      Our own custom tag (this is what the parser actually looks for).
%      It appears ONCE PER QUESTION, nested inside \\begin{document} ...
%      \\end{document}. Every question needs BOTH its own \\begin{question}{n}
%      AND its own \\end{question} placed right after that question's
%      content. The single \\end{document} at the bottom of the file does
%      NOT close your questions for you — if even one question is missing
%      its \\end{question}, the parser cannot find ANY question in the file
%      and you will see "no question blocks were found".
%
%  Rule of thumb: count your questions, then count your \\end{question}
%  lines — they must match exactly.
% ============================================================================

\\begin{document}

\\subject{Physics}
\\subjectcode{5054}
\\paper{2}
\\variant{1}
\\session{M/J}
\\year{2025}

\\begin{question}{1}
\\topic{Forces & Motion}
\\marks{9}
\\ref{5054/21/M/J/25 -- Q1}

\\qtext
Fig. 1.1 shows a skydiver falling vertically through the air.

\\image{q1-fig1.png}{Fig. 1.1}

In the first part of the fall, her speed increases and her acceleration decreases.

\\part{2} On Fig. 1.2 sketch the speed--time graph for the skydiver.

\\part{1} Explain how the graph shows that the acceleration decreases as the speed increases.
\\endq
\\end{question}
% ^^^ \\end{question} above closes QUESTION 1. Every question needs this line.

\\begin{question}{2}
\\topic{Moments}
\\marks{6}
\\ref{5054/21/M/J/25 -- Q2}

\\qtext
A uniform beam of length $2.0\\ \\text{m}$ is pivoted at its centre.

\\part{2} State the principle of moments.

\\part{4} Calculate the force needed at one end to balance a $5.0\\ \\text{N}$ weight placed $0.4\\ \\text{m}$ from the opposite end.
\\endq
\\end{question}
% ^^^ \\end{question} above closes QUESTION 2.

\\begin{question}{3}
\\topic{Energy}
\\marks{5}
\\ref{5054/21/M/J/25 -- Q3}

\\qtext
A ball of mass $0.20\\ \\text{kg}$ is dropped from a height of $1.8\\ \\text{m}$
above the ground. Take $g = 9.8\\ \\text{m/s}^2$ and ignore air resistance.

\\part{2} Calculate the gravitational potential energy of the ball before it is released.

\\part{3} Calculate the speed of the ball just before it hits the ground.
\\endq
\\end{question}
% ^^^ \\end{question} above closes QUESTION 3.

% To add another question, copy one whole block above — from its opening
% \\begin{question}{N} tag down to its own closing \\end{question} tag — and
% edit the contents. (Written as {N} here on purpose: the parser scans the
% raw text and does not understand "%" comments, so writing a real digit
% like {4} in a comment would be read as an actual — and broken — question.)

\\end{document}
% ^^^ This single \\end{document} closes the FILE, not any individual
%     question — every \\begin{question}{n} above must already have its own
%     \\end{question} before this line.`;

  const TEMPLATE_A = `\\documentclass[11pt]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{enumitem}

% ============================================================================
%  HOW THIS FILE IS STRUCTURED — READ THIS BEFORE EDITING
%
%  There are TWO different "begin/end" pairs below and they are NOT the
%  same thing — mixing them up is the #1 cause of "no question blocks were
%  found" errors on upload.
%
%   1) \\begin{document} ... \\end{document}
%      Plain, standard LaTeX. It appears EXACTLY ONCE in the whole file —
%      right here, and again at the very bottom — and wraps everything.
%      Never add a second copy of it anywhere in the middle of the file.
%
%   2) \\begin{question}{n} ... \\end{question}
%      Our own custom tag (this is what the parser actually looks for, and
%      it MUST match the same {n} used in TEMPLATE-questions.tex). It
%      appears ONCE PER QUESTION, nested inside \\begin{document} ...
%      \\end{document}. Every question needs BOTH its own \\begin{question}{n}
%      AND its own \\end{question} placed right after that question's
%      mark scheme and exemplar. The single \\end{document} at the bottom
%      of the file does NOT close your questions for you — if even one
%      question is missing its \\end{question}, the parser cannot find ANY
%      question in the file and you will see "no question blocks were
%      found in the answers file", even if the questions file is fine.
%
%  Rule of thumb: count your questions, then count your \\end{question}
%  lines — they must match exactly.
% ============================================================================

\\begin{document}

% --- Document Metadata (optional here if already in the questions file) ---
\\subject{Physics}
\\subjectcode{5054}
\\paper{2}
\\variant{1}
\\session{M/J}
\\year{2025}

% --- Answers ---
% One \\begin{question}{n} ... \\end{question} block per question. The
% number in {n} MUST match the same number used in TEMPLATE-questions.tex.

\\begin{question}{1}
\\markscheme
\\row{1(a)}{Curve upwards with decreasing gradient}{B1}
\\row{}{Horizontal line labelled B}{B1}
\\row{1(b)}{Gradient decreases as speed increases}{B1}
\\endms

\\exemplar
The gradient of a speed--time graph equals the acceleration. As the curve
flattens, its gradient falls, so the acceleration decreases as the speed
increases. The resultant force is given by
$$ R = \\sqrt{400^{2} + 100^{2}} = 410\\ \\text{N} $$
\\endexemplar
\\end{question}
% ^^^ \\end{question} above closes QUESTION 1. Every question needs this line.

\\begin{question}{2}
\\markscheme
\\row{2(a)}{Sum of clockwise moments equals sum of anticlockwise moments about a pivot}{B1}
\\row{2(b)}{Moment $= F \\times d$}{C1}
\\row{}{$F \\times 1.0 = 5.0 \\times 0.4$}{M1}
\\row{}{$F = 2.0\\ \\text{N}$}{A1}
\\endms

\\exemplar
Taking moments about the pivot at the centre, the anticlockwise moment
is $5.0 \\times 0.4 = 2.0\\ \\text{N m}$, so the balancing force at
$1.0\\ \\text{m}$ on the opposite side must satisfy
$$ F \\times 1.0 = 2.0 \\quad \\Rightarrow \\quad F = 2.0\\ \\text{N}. $$
\\endexemplar
\\end{question}
% ^^^ \\end{question} above closes QUESTION 2.

\\begin{question}{3}
\\markscheme
\\row{3(a)}{$E_p = mgh$}{C1}
\\row{}{$E_p = 0.20 \\times 9.8 \\times 1.8 = 3.5\\ \\text{J}$}{A1}
\\row{3(b)}{$\\tfrac{1}{2}mv^{2} = mgh$ or $v = \\sqrt{2gh}$}{C1}
\\row{}{$v = \\sqrt{2 \\times 9.8 \\times 1.8}$}{M1}
\\row{}{$v = 5.9\\ \\text{m/s}$}{A1}
\\endms

\\exemplar
The gravitational potential energy at the release point is
$$ E_p = mgh = 0.20 \\times 9.8 \\times 1.8 = 3.53\\ \\text{J}. $$
Since air resistance is ignored, all of this converts to kinetic energy
at ground level, so
$$ \\tfrac{1}{2}mv^{2} = mgh \\quad\\Rightarrow\\quad v = \\sqrt{2gh} = \\sqrt{2 \\times 9.8 \\times 1.8} \\approx 5.9\\ \\text{m/s}. $$
\\endexemplar
\\end{question}
% ^^^ \\end{question} above closes QUESTION 3.

% To add another question, copy one whole block above — from its opening
% \\begin{question}{N} tag down to its own closing \\end{question} tag — and
% edit the contents. (Written as {N} here on purpose: the parser scans the
% raw text and does not understand "%" comments, so writing a real digit
% like {4} in a comment would be read as an actual — and broken — question.)

\\end{document}
% ^^^ This single \\end{document} closes the FILE, not any individual
%     question — every \\begin{question}{n} above must already have its own
%     \\end{question} before this line.`;

  const SPEC_Q = `% ---- Questions.tex ----
% Top of file — paper metadata (required in at least one of the two files)
\\subject{Physics}
\\subjectcode{5054}         % optional syllabus code
\\paper{1}
\\variant{1}
\\session{M/J}
\\year{2025}

% One block per question — question text only, no answers here
\\begin{question}{1}        % 1 = question number, must match the answers file
  \\topic{Forces & Motion}  % powers the topic filter + module builder
  \\marks{9}                % total marks, shown as the mark stamp
  \\ref{5054/21/M/J/25 -- Q1}

  \\qtext
    Question text. Blank lines start new paragraphs.
    \\image{filename.png}{Fig. 1.1}      % matched by filename to an
                                          % uploaded image
    \\part{2} Text of part (a) ...        % \\part{marks} auto-numbers
    \\part{1} Text of part (b) ...        % (a), (b), (c) ...
  \\endq
\\end{question}      % <- every question needs this closing tag too —
                      %    \\end{document} at the bottom of the file only
                      %    closes the FILE, not individual questions.`;

  const SPEC_A = `% ---- Answers.tex ----
% Metadata again (optional here if already given in the questions file)
\\subject{Physics}  \\paper{1}  \\variant{1}  \\session{M/J}  \\year{2025}

% Same question number as in Questions.tex — mark scheme + exemplar only
\\begin{question}{1}
  \\markscheme
    \\row{1(a)}{Expected answer}{B1}      % \\row{part}{answer}{marks}
    \\row{}{Second marking point}{B1}     % blank part = continues above
  \\endms

  \\exemplar
    Full worked answer. Real LaTeX math is fine and renders with KaTeX:
    $$ R = \\sqrt{400^{2}+100^{2}} $$
  \\endexemplar
\\end{question}      % <- every question needs this closing tag too —
                      %    \\end{document} at the bottom of the file only
                      %    closes the FILE, not individual questions.

% Supported inline markup in either file: \\textbf{}, \\textit{},
% \\underline{}, \\begin{itemize}\\item ...\\end{itemize}, \\\\ for a line
% break. Math delimiters ($...$, \\(...\\), $$...$$, \\[...\\]) pass
% straight through to KaTeX untouched.`;

  const els = {
    texQDrop: document.getElementById('texQDrop'),
    texQInput: document.getElementById('texQInput'),
    texQFileName: document.getElementById('texQFileName'),
    texADrop: document.getElementById('texADrop'),
    texAInput: document.getElementById('texAInput'),
    texAFileName: document.getElementById('texAFileName'),
    imgDrop: document.getElementById('imgDrop'),
    imgInput: document.getElementById('imgInput'),
    imgFileList: document.getElementById('imgFileList'),
    downloadTemplateQ: document.getElementById('downloadTemplateQ'),
    downloadTemplateA: document.getElementById('downloadTemplateA'),
    metaForm: document.getElementById('metaForm'),
    mSubject: document.getElementById('mSubject'),
    mSubjectCode: document.getElementById('mSubjectCode'),
    mPaper: document.getElementById('mPaper'),
    mVariant: document.getElementById('mVariant'),
    mSession: document.getElementById('mSession'),
    mYear: document.getElementById('mYear'),
    warnArea: document.getElementById('warnArea'),
    saveCard: document.getElementById('saveCard'),
    saveSummary: document.getElementById('saveSummary'),
    saveBtn: document.getElementById('saveBtn'),
    saveResult: document.getElementById('saveResult'),
    previewHint: document.getElementById('previewHint'),
    previewDoc: document.getElementById('previewDoc'),
    previewTabs: document.querySelectorAll('#previewTabs .pd-tab'),
    previewAreaPaper: document.getElementById('previewArea-paper'),
    previewAreaMarkscheme: document.getElementById('previewArea-markscheme'),
    previewAreaExemplar: document.getElementById('previewArea-exemplar'),
    paperList: document.getElementById('paperList'),
    specBlockQ: document.getElementById('specBlockQ'),
    specBlockA: document.getElementById('specBlockA')
  };

  let texQSource = null;
  let texASource = null;
  let images = {};       // filename -> dataURL
  let merged = null;     // { paperMeta, questions, warnings }
  let userEditedMeta = false;

  /* ---------------------------------------------------------- boot */
  async function boot(){
    await DB.open();
    els.specBlockQ.textContent = SPEC_Q;
    els.specBlockA.textContent = SPEC_A;
    wireDropzone(els.texQDrop, els.texQInput, handleTexQFiles);
    wireDropzone(els.texADrop, els.texAInput, handleTexAFiles);
    wireDropzone(els.imgDrop, els.imgInput, handleImgFiles);

    els.downloadTemplateQ.addEventListener('click', (e) => {
      e.preventDefault(); downloadText('TEMPLATE-questions.tex', TEMPLATE_Q);
    });
    els.downloadTemplateA.addEventListener('click', (e) => {
      e.preventDefault(); downloadText('TEMPLATE-answers.tex', TEMPLATE_A);
    });

    [els.mSubject, els.mSubjectCode, els.mPaper, els.mVariant, els.mSession, els.mYear]
      .forEach(inp => inp.addEventListener('input', () => { userEditedMeta = true; renderSaveSummary(); }));
    els.saveBtn.addEventListener('click', saveToBank);
    els.previewTabs.forEach(tab => tab.addEventListener('click', () => {
      els.previewTabs.forEach(t => t.classList.toggle('active', t === tab));
      ['paper', 'markscheme', 'exemplar'].forEach(name => {
        document.getElementById('previewArea-' + name).classList.toggle('active', name === tab.dataset.doc);
      });
    }));
    await refreshPaperList();
  }

  function downloadText(filename, text){
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  /* ---------------------------------------------------------- dropzones */
  function wireDropzone(zone, input, onFiles){
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => onFiles(input.files));
    ['dragenter', 'dragover'].forEach(evt => zone.addEventListener(evt, (e) => {
      e.preventDefault(); zone.classList.add('drag');
    }));
    ['dragleave', 'drop'].forEach(evt => zone.addEventListener(evt, (e) => {
      e.preventDefault(); zone.classList.remove('drag');
    }));
    zone.addEventListener('drop', (e) => onFiles(e.dataTransfer.files));
  }

  function handleTexQFiles(files){
    const file = files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      texQSource = reader.result;
      els.texQFileName.innerHTML = `<span class="filepill filepill--q">${escHTML(file.name)}</span>`;
      els.texQDrop.classList.add('filled');
      reparse();
    };
    reader.readAsText(file);
  }

  function handleTexAFiles(files){
    const file = files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      texASource = reader.result;
      els.texAFileName.innerHTML = `<span class="filepill filepill--a">${escHTML(file.name)}</span>`;
      els.texADrop.classList.add('filled');
      reparse();
    };
    reader.readAsText(file);
  }

  function handleImgFiles(files){
    const list = Array.from(files);
    let remaining = list.length;
    if(!remaining) return;
    list.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        images[file.name] = reader.result;
        renderImgList();
        remaining--;
        if(remaining === 0) reparse();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderImgList(){
    const names = Object.keys(images);
    els.imgFileList.innerHTML = names.map(n => `
      <span class="filepill filepill--img">${escHTML(n)}<button data-name="${escAttr(n)}" title="Remove">&times;</button></span>`).join('');
    els.imgFileList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        delete images[btn.dataset.name];
        renderImgList();
        reparse();
      });
    });
  }

  /* ---------------------------------------------------------- parse + merge + preview */
  function reparse(){
    if(!texQSource){ merged = null; renderPreview(); renderWarnings(); return; }

    const qParsed = TexParse.parse(texQSource, images, {
      expectQtext: true, expectMarkscheme: false, expectExemplar: false, label: 'questions file'
    });
    const aParsed = texASource
      ? TexParse.parse(texASource, images, {
          expectQtext: false, expectMarkscheme: true, expectExemplar: true, label: 'answers file'
        })
      : null;

    merged = TexParse.mergeQuestionsAndAnswers(qParsed, aParsed);
    if(!texASource){
      merged.warnings.unshift('No answers file yet — questions will save without a mark scheme or exemplar until you add one.');
    }

    if(!userEditedMeta){
      const m = merged.paperMeta;
      els.mSubject.value = m.subject; els.mSubjectCode.value = m.subjectCode;
      els.mPaper.value = m.paper; els.mVariant.value = m.variant;
      els.mSession.value = m.session; els.mYear.value = m.year;
    }
    renderPreview();
    renderWarnings();
    renderSaveSummary();
  }

  function renderWarnings(){
    if(!merged || merged.warnings.length === 0){ els.warnArea.innerHTML = ''; return; }
    els.warnArea.innerHTML = `
      <div class="warnbox">
        <h4>Check before saving</h4>
        <ul>${merged.warnings.map(w => `<li>${escHTML(w)}</li>`).join('')}</ul>
      </div>`;
  }

  function renderPreview(){
    if(!merged || merged.questions.length === 0){
      els.previewDoc.hidden = true;
      els.previewAreaPaper.innerHTML = '';
      els.previewAreaMarkscheme.innerHTML = '';
      els.previewAreaExemplar.innerHTML = '';
      els.previewHint.textContent = 'Parsed questions will appear here as soon as both files are loaded.';
      els.saveCard.hidden = true;
      return;
    }
    const withMs = merged.questions.filter(q => q.markScheme.length || q.exemplarHTML).length;
    els.previewHint.textContent = `${merged.questions.length} question${merged.questions.length === 1 ? '' : 's'} parsed &middot; ${withMs} with a mark scheme. Review each tab below, then save.`;
    els.previewDoc.hidden = false;

    els.previewAreaPaper.innerHTML = merged.questions.map(q => `
      <article class="pd-qsection" style="--qaccent:${ACCENTS[(q.id - 1) % ACCENTS.length]}">
        <div class="pd-qhead">
          <span class="pd-qnum">Question ${escHTML(String(q.id))}</span>
          ${q.topic ? `<span class="pd-qtopic">${escHTML(q.topic)}</span>` : ''}
          <span class="pd-qmarks">${escHTML(String(q.marks || '—'))} marks</span>
          ${(q.markScheme.length || q.exemplarHTML) ? '<span class="topic-chip topic-chip--ok">answer linked</span>' : '<span class="topic-chip topic-chip--warn">no answer yet</span>'}
        </div>
        <div class="pd-qbody">${q.qHTML || '<p><i>No question text was parsed from the uploaded file.</i></p>'}</div>
      </article>`).join('');

    els.previewAreaMarkscheme.innerHTML = merged.questions.map(q => {
      const rows = (q.markScheme || []).map(row => `
        <tr><td>${escHTML(row.part || '')}</td><td>${row.answer}</td><td>${escHTML(row.marks || '')}</td></tr>`).join('');
      return `
      <article class="pd-qsection" style="--qaccent:${ACCENTS[(q.id - 1) % ACCENTS.length]}">
        <div class="pd-qhead">
          <span class="pd-qnum">Question ${escHTML(String(q.id))}</span>
          <span class="pd-qmarks">${escHTML(String(q.marks || '—'))} marks</span>
        </div>
        <table class="mstable">
          <thead><tr><th>Part</th><th>Expected answer</th><th>Marks</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3"><i>No mark scheme uploaded for this question.</i></td></tr>'}</tbody>
        </table>
      </article>`;
    }).join('');

    els.previewAreaExemplar.innerHTML = merged.questions.map(q => `
      <article class="pd-qsection" style="--qaccent:${ACCENTS[(q.id - 1) % ACCENTS.length]}">
        <div class="pd-qhead"><span class="pd-qnum">Question ${escHTML(String(q.id))}</span></div>
        <div class="exemplar-box">${q.exemplarHTML || '<p><i>No exemplar answer uploaded for this question.</i></p>'}</div>
      </article>`).join('');

    if(typeof renderMathInElement === 'function'){
      renderMathInElement(els.previewDoc, {
        delimiters: [
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }
    els.saveCard.hidden = false;
  }

  function renderSaveSummary(){
    if(!merged || merged.questions.length === 0){ els.saveCard.hidden = true; return; }
    const meta = currentMeta();
    const complete = meta.subject && meta.paper && meta.variant && meta.session && meta.year;
    els.saveSummary.textContent = complete
      ? `Will save ${merged.questions.length} question(s) under ${meta.subject} · Paper ${meta.paper}/${meta.variant} · ${meta.session} ${meta.year}.`
      : `Fill in every paper field above before saving.`;
    els.saveBtn.disabled = !complete;
  }

  function currentMeta(){
    return {
      subject: els.mSubject.value.trim(),
      subjectCode: els.mSubjectCode.value.trim(),
      paper: els.mPaper.value.trim(),
      variant: els.mVariant.value.trim(),
      session: els.mSession.value.trim(),
      year: els.mYear.value.trim()
    };
  }

  /* ---------------------------------------------------------- save */
  async function saveToBank(){
    if(!merged || merged.questions.length === 0) return;
    const meta = currentMeta();
    els.saveBtn.disabled = true;
    els.saveResult.textContent = 'Saving…';
    try{
      await DB.addQuestions(meta, merged.questions);
      els.saveResult.innerHTML = `<span class="save-ok">&#10003; Saved. <a href="index.html">Open in Browse &rarr;</a></span>`;
      await refreshPaperList();
    } catch(err){
      els.saveResult.innerHTML = `<span style="color:var(--marker-dark);">Could not save: ${escHTML(err.message || String(err))}</span>`;
    } finally {
      els.saveBtn.disabled = false;
    }
  }

  /* ---------------------------------------------------------- existing papers */
  async function refreshPaperList(){
    const papers = await DB.getAllPapers();
    if(papers.length === 0){
      els.paperList.innerHTML = `<p class="hint">Nothing uploaded yet.</p>`;
      return;
    }
    const qs = await DB.getAllQuestions();
    els.paperList.innerHTML = papers.map(p => {
      const count = qs.filter(q => q.paperKey === p.paperKey).length;
      return `
        <div class="pickrow">
          <div class="pickrow-body">
            <div class="pickrow-title">${escHTML(p.subject)} &middot; Paper ${escHTML(String(p.paper))}/${escHTML(String(p.variant))}</div>
            <div class="pickrow-meta">${escHTML(p.session)} ${escHTML(String(p.year))} &middot; ${count} question${count === 1 ? '' : 's'}</div>
          </div>
          <button class="btn btn--danger btn--sm" data-key="${escAttr(p.paperKey)}">Delete</button>
        </div>`;
    }).join('');
    els.paperList.querySelectorAll('button[data-key]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!confirm('Remove this paper and every question it contributed?')) return;
        await DB.deletePaper(btn.dataset.key);
        await refreshPaperList();
      });
    });
  }

  function escHTML(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function escAttr(s){ return escHTML(s).replace(/"/g, '&quot;'); }

  document.addEventListener('DOMContentLoaded', boot);

})();