/* =====================================================================
   School Wits — Data Layer (DB), Supabase-backed.
   Drop-in replacement for js/store.js: exposes the exact same `DB.*`
   function names/shapes so app.js/upload.js/modules.js don't need to
   change. Internally talks to Postgres (via supabase-js, loaded from a
   CDN in each page's <script> tags) instead of IndexedDB.

   The one thing every function here has to get right: Postgres columns
   are snake_case (paper_key, q_html, video_id, mark_scheme); every record
   handed back to the old pages is remapped to the camelCase shape they've
   always expected (paperKey, qHTML, videoId, markScheme). Get this wrong
   and a page renders blank with no error.
   ===================================================================== */

const DB = (function(){

  const client = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // IndexedDB needed an async "open" step; Postgres doesn't. Kept as a
  // no-op so the `await DB.open()` calls already in every page's boot()
  // keep working unchanged.
  async function open(){ return true; }

  /* ---------------------------------------------------------- helpers (ported verbatim from js/store.js) */
  function slug(s){
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  function paperKeyOf(p){
    return [slug(p.subject), p.paper, p.variant, slug(p.session), p.year].join('|');
  }
  function paperLabel(p){
    return `${p.subjectCode ? p.subjectCode + '/' : ''}${p.paper}${p.variant}/${p.session}/${String(p.year).slice(-2)}`;
  }

  // uid mirrors the old IndexedDB primary key (`${paperKey}::${id}`) —
  // synthesized here since Postgres uses a real numeric id instead. `pk`
  // carries that real Postgres id for internal use (module linking,
  // update-by-id); old pages never read `.pk`, only `.uid`/`.id`.
  function parseUid(uid){
    const idx = uid.lastIndexOf('::');
    return { paperKey: uid.slice(0, idx), questionNumber: Number(uid.slice(idx + 2)) };
  }

  function paperRowToRecord(row){
    return {
      pk: row.id,
      subject: row.subject,
      subjectCode: row.subject_code || '',
      paper: row.paper,
      variant: row.variant,
      session: row.session,
      year: row.year,
      paperKey: row.paper_key,
      label: row.label,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function questionRowToRecord(row, paperRow){
    const p = paperRow || row.papers;
    const paperKey = p.paper_key;
    return {
      pk: row.id,
      uid: `${paperKey}::${row.question_number}`,
      paperKey,
      subject: p.subject,
      subjectCode: p.subject_code || '',
      paper: p.paper,
      variant: p.variant,
      session: p.session,
      year: p.year,
      id: row.question_number,   // old semantic: per-paper question number, NOT the Postgres pk
      topic: row.topic,
      marks: row.marks,
      ref: row.ref,
      qText: row.q_text,
      qHTML: row.q_html,
      markScheme: row.mark_scheme || [],
      exemplarHTML: row.exemplar_html,
      videoId: row.video_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function moduleRowToRecord(row, questionUids){
    return {
      id: row.id,
      title: row.title,
      topic: row.topic || '',
      description: row.description || '',
      premium: row.premium,
      price: Number(row.price) || 0,
      currency: row.currency || '৳',
      questionUids: questionUids || [],
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function check(error){ if(error) throw error; }

  /* ---------------------------------------------------------- papers */
  async function upsertPaper(meta){
    const row = {
      subject: meta.subject,
      subject_code: meta.subjectCode || '',
      paper: meta.paper,
      variant: meta.variant,
      session: meta.session,
      year: meta.year,
      label: paperLabel(meta)
    };
    const { data, error } = await client.from('papers').upsert(row, { onConflict: 'paper_key' }).select().single();
    check(error);
    return paperRowToRecord(data);
  }

  async function getAllPapers(){
    const { data, error } = await client.from('papers').select('*');
    check(error);
    return data.map(paperRowToRecord);
  }

  async function deletePaper(paperKey){
    // paper_key is a real unique column, not just the natural key used
    // for display — deleting by it directly needs no id lookup. Cascades
    // (ON DELETE CASCADE) clear the paper's questions/module_questions
    // server-side.
    const { error } = await client.from('papers').delete().eq('paper_key', paperKey);
    check(error);
  }

  /* ---------------------------------------------------------- questions */
  async function addQuestions(paperMeta, questions){
    const paper = await upsertPaper(paperMeta);
    const rows = questions.map(q => ({
      paper_id: paper.pk,
      question_number: q.id,
      topic: q.topic || 'Uncategorised',
      marks: q.marks != null ? String(q.marks) : '',
      ref: q.ref || `${paperLabel(paperMeta)} — Q${q.id}`,
      q_text: q.qText || '',
      q_html: q.qHTML || '',
      mark_scheme: q.markScheme || [],
      exemplar_html: q.exemplarHTML || '',
      video_id: q.videoId || ''
    }));
    // Upsert, not insert: re-uploading a questions/answers file for the
    // same paper is documented app behavior ("click Save again and it
    // updates the same paper" — README.md) and relies on the
    // (paper_id, question_number) unique constraint acting as an update
    // target rather than rejecting the second upload.
    const { data, error } = await client
      .from('questions')
      .upsert(rows, { onConflict: 'paper_id,question_number' })
      .select('*, papers(*)');
    check(error);
    return data.map(row => questionRowToRecord(row, row.papers));
  }

  async function getAllQuestions(){
    const { data, error } = await client.from('questions').select('*, papers(*)');
    check(error);
    return data.map(row => questionRowToRecord(row, row.papers));
  }

  async function getQuestionsByPaperKey(paperKey){
    const { data, error } = await client
      .from('questions')
      .select('*, papers!inner(*)')
      .eq('papers.paper_key', paperKey);
    check(error);
    return data.map(row => questionRowToRecord(row, row.papers));
  }

  async function getQuestionsByUids(uids){
    // Ported as-is from js/store.js: filter the full question list
    // client-side rather than resolving each uid against the DB
    // individually — same behavior, same performance ballpark at this
    // dataset size.
    const set = new Set(uids);
    const all = await getAllQuestions();
    return all.filter(q => set.has(q.uid));
  }

  const PATCH_KEY_TO_COLUMN = {
    topic: 'topic', marks: 'marks', ref: 'ref', qText: 'q_text', qHTML: 'q_html',
    markScheme: 'mark_scheme', exemplarHTML: 'exemplar_html', videoId: 'video_id'
  };
  function patchToRow(patch){
    const row = {};
    Object.keys(patch).forEach(key => {
      const column = PATCH_KEY_TO_COLUMN[key];
      if(column) row[column] = patch[key];
    });
    return row;
  }

  async function updateQuestion(uid, patch){
    const { paperKey, questionNumber } = parseUid(uid);
    const { data: paperRow, error: paperError } = await client
      .from('papers').select('id').eq('paper_key', paperKey).single();
    check(paperError);
    const { data, error } = await client
      .from('questions')
      .update(patchToRow(patch))
      .eq('paper_id', paperRow.id)
      .eq('question_number', questionNumber)
      .select('*, papers(*)')
      .single();
    check(error);
    return questionRowToRecord(data, data.papers);
  }

  async function setVideo(uid, videoId){
    return updateQuestion(uid, { videoId });
  }

  /* ---------------------------------------------------------- facets & search */
  // Both ported verbatim from js/store.js's in-memory logic, just sourced
  // from Postgres via getAllPapers()/getAllQuestions() instead of
  // IndexedDB. Postgres's search_vector/GIN index (0002_questions.sql)
  // exists for a future performance pass — not wired up here, so search
  // behaves identically to today rather than changing ranking/matching.
  async function getFacets(){
    const [qs, papers] = [await getAllQuestions(), await getAllPapers()];
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
    return {
      subjects: uniq(papers.map(p => p.subject)),
      papers: uniq(papers.map(p => p.paper)),
      variants: uniq(papers.map(p => p.variant)),
      sessions: uniq(papers.map(p => p.session)),
      years: uniq(papers.map(p => p.year)).sort((a, b) => b - a),
      topics: uniq(qs.map(q => q.topic)),
      paperCount: papers.length,
      questionCount: qs.length
    };
  }

  function stripHTML(html){
    if(!html) return '';
    return html.replace(/<[^>]*>/g, ' ');
  }

  async function search({ subject, paper, variant, session, year, topic, text } = {}){
    let qs = await getAllQuestions();
    if(subject) qs = qs.filter(q => q.subject === subject);
    if(paper)   qs = qs.filter(q => String(q.paper) === String(paper));
    if(variant) qs = qs.filter(q => String(q.variant) === String(variant));
    if(session) qs = qs.filter(q => q.session === session);
    if(year)    qs = qs.filter(q => String(q.year) === String(year));
    if(topic)   qs = qs.filter(q => q.topic === topic);
    if(text){
      const needle = text.trim().toLowerCase();
      if(needle){
        qs = qs.filter(q => {
          const hay = [q.topic, q.ref, q.qText, stripHTML(q.qHTML), stripHTML(q.exemplarHTML)]
            .join(' ').toLowerCase();
          return hay.includes(needle);
        });
      }
    }
    qs.sort((a, b) => (a.paperKey === b.paperKey) ? (a.id - b.id) : a.paperKey.localeCompare(b.paperKey));
    return qs;
  }

  /* ---------------------------------------------------------- modules */
  async function saveModule(mod){
    const row = {
      title: mod.title,
      topic: mod.topic || '',
      description: mod.description || '',
      premium: !!mod.premium,
      price: mod.premium ? (Number(mod.price) || 0) : 0,
      currency: mod.currency || '৳'
    };
    if(mod.id) row.id = Number(mod.id);

    const { data: savedRow, error } = await client.from('modules').upsert(row).select().single();
    check(error);

    // Resolve the uid list to real question rows the same way
    // getQuestionsByUids does, then replace module_questions wholesale —
    // mirrors the old IndexedDB record's questionUids array being
    // overwritten in full on every save.
    const uids = mod.questionUids || [];
    const questions = await getQuestionsByUids(uids);
    const byUid = new Map(questions.map(q => [q.uid, q]));
    const orderedQuestions = uids.map(u => byUid.get(u)).filter(Boolean);

    const del = await client.from('module_questions').delete().eq('module_id', savedRow.id);
    check(del.error);

    if(orderedQuestions.length){
      const linkRows = orderedQuestions.map((q, i) => ({ module_id: savedRow.id, question_id: q.pk, sort_order: i }));
      const ins = await client.from('module_questions').insert(linkRows);
      check(ins.error);
    }

    return savedRow.id;
  }

  async function getAllModules(){
    const { data: mods, error } = await client.from('modules').select('*');
    check(error);
    if(!mods.length) return [];

    const { data: links, error: linkError } = await client
      .from('module_questions')
      .select('module_id, sort_order, questions(question_number, papers(paper_key))')
      .order('sort_order');
    check(linkError);

    const byModule = new Map();
    (links || []).forEach(l => {
      const uid = `${l.questions.papers.paper_key}::${l.questions.question_number}`;
      if(!byModule.has(l.module_id)) byModule.set(l.module_id, []);
      byModule.get(l.module_id).push(uid);
    });

    return mods.map(m => moduleRowToRecord(m, byModule.get(m.id) || []));
  }

  async function getModule(id){
    const { data: m, error } = await client.from('modules').select('*').eq('id', Number(id)).maybeSingle();
    check(error);
    if(!m) return null;

    const { data: links, error: linkError } = await client
      .from('module_questions')
      .select('sort_order, questions(question_number, papers(paper_key))')
      .eq('module_id', m.id)
      .order('sort_order');
    check(linkError);

    const questionUids = (links || []).map(l => `${l.questions.papers.paper_key}::${l.questions.question_number}`);
    return moduleRowToRecord(m, questionUids);
  }

  async function deleteModule(id){
    const { error } = await client.from('modules').delete().eq('id', Number(id));
    check(error);
  }

  /* ---------------------------------------------------------- purchases (mock, local only — unchanged) */
  function isPurchased(moduleId){
    return localStorage.getItem('sw_purchase_' + moduleId) === '1';
  }
  function markPurchased(moduleId){
    localStorage.setItem('sw_purchase_' + moduleId, '1');
  }

  /* ---------------------------------------------------------- admin auth */
  async function signIn(email, password){
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    check(error);
    return data;
  }
  async function signOut(){
    await client.auth.signOut();
  }
  // Checked both client-side (to show/hide the write UI) and server-side
  // (RLS, via the same is_admin() function) — the client-side check is
  // for UX only, never trust it as the actual access boundary.
  async function isAdmin(){
    const { data: { session } } = await client.auth.getSession();
    if(!session) return false;
    const { data, error } = await client.rpc('is_admin');
    if(error) return false;
    return !!data;
  }

  return {
    open, slug, paperKeyOf, paperLabel,
    upsertPaper, getAllPapers, deletePaper,
    addQuestions, getAllQuestions, getQuestionsByPaperKey, getQuestionsByUids, updateQuestion,
    getFacets, search,
    saveModule, getAllModules, getModule, deleteModule,
    isPurchased, markPurchased,
    setVideo,
    signIn, signOut, isAdmin
  };

})();
