/* =====================================================================
   School Wits — Data Layer (DB), Supabase-backed.
   Drop-in replacement for js/store.js: exposes the exact same `DB.*`
   function names/shapes so app.js/upload.js/modules.js don't need to
   change. Internally talks to Postgres (via supabase-js, loaded from a
   CDN in each page's <script> tags) instead of IndexedDB.

   The one thing every function here has to get right: Postgres columns
   are snake_case (paper_key, video_id, question_number); every record
   handed back to the pages is remapped to the camelCase shape they expect
   (paperKey, videoId, id). Get this wrong and a page renders blank with
   no error.

   READ-ONLY for question content. Questions are written by the importer
   (backend/scripts/import-paper.ts) and later by the Edge Function, both
   of which run the real parser — the browser no longer parses anything,
   so there is no addQuestions here. Videos and modules are still written
   from the browser, since those are user actions rather than ingest.

   Records carry `content` (the parsed question object) rather than
   pre-rendered HTML. Turning that into markup is js/render/'s job and
   happens at display time — rendering all 119 questions on every query
   would be wasted work when one is on screen.
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
      kind: row.kind || 'structured',
      topics: row.topics || [],
      // Questions can carry several topics now. `topic` stays as the joined
      // display string the filter UI and module builder already work with;
      // `topics` is the real list, for anything that needs to match one.
      topic: (row.topics || []).join(' · '),
      marks: row.marks,
      ref: row.ref,
      qText: row.q_text,
      // The parsed question object — see backend/src/latex/types.ts. Render
      // it with SWRender.QuestionRenderer at display time.
      content: row.content || null,
      videoId: row.video_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    };
  }

  function moduleRowToRecord(row, questionUids){
    const topics = row.topics || [];
    return {
      id: row.id,
      title: row.title,
      subject: row.subject || '',
      // The real list (see 0014). `topicLabel` is the display string every
      // card and list row shows — derived here rather than stored, so the
      // "Mixed topics" placeholder never ends up in the database.
      topics,
      topicLabel: topics.length ? topics.join(' · ') : 'Mixed topics',
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
  // There is deliberately no addQuestions(). Question content comes from the
  // .tex parser, which runs in Node/Deno and never in a browser — ingest is
  // backend/scripts/import-paper.ts today and an Edge Function next. A
  // browser-side writer would need a second copy of the parser, which is the
  // duplication this split exists to avoid.

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

  // Only fields a user can legitimately change from the browser. Question
  // content is parser output and is not editable here — allowing it would
  // let the page write something the parser never produced.
  const PATCH_KEY_TO_COLUMN = {
    videoId: 'video_id'
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
  async function getFacets(){
    const [qs, papers] = [await getAllQuestions(), await getAllPapers()];
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
    return {
      subjects: uniq(papers.map(p => p.subject)),
      papers: uniq(papers.map(p => p.paper)),
      variants: uniq(papers.map(p => p.variant)),
      sessions: uniq(papers.map(p => p.session)),
      years: uniq(papers.map(p => p.year)).sort((a, b) => b - a),
      // A question has several topics, so the facet list is the union across
      // all of them rather than one value each.
      topics: uniq(qs.flatMap(q => q.topics)),
      paperCount: papers.length,
      questionCount: qs.length
    };
  }

  // Filtering now happens in Postgres rather than by pulling every question
  // and scanning it in memory. That stopped being viable when the question
  // body moved into `content`: matching text would mean walking a JSON tree
  // per question, per keystroke. The generated search_vector (0011) already
  // holds the flattened text, weighted topic > ref > body.
  async function search({ subject, paper, variant, session, year, topic, text } = {}){
    let query = client.from('questions').select('*, papers!inner(*)');

    if(subject) query = query.eq('papers.subject', subject);
    if(paper)   query = query.eq('papers.paper', String(paper));
    if(variant) query = query.eq('papers.variant', String(variant));
    if(session) query = query.eq('papers.session', session);
    if(year)    query = query.eq('papers.year', String(year));
    // `contains` hits the GIN index on topics[]; a question matches if the
    // chosen topic is any one of its topics.
    if(topic)   query = query.contains('topics', [topic]);

    const needle = (text || '').trim();
    if(needle){
      // 'simple' must match the config the column was generated with, and
      // websearch accepts what a user would naturally type (quoted phrases,
      // OR, -exclusions) without throwing on stray punctuation the way
      // to_tsquery does.
      query = query.textSearch('search_vector', needle, { config: 'simple', type: 'websearch' });
    }

    const { data, error } = await query;
    check(error);

    const qs = data.map(row => questionRowToRecord(row, row.papers));
    qs.sort((a, b) => (a.paperKey === b.paperKey) ? (a.id - b.id) : a.paperKey.localeCompare(b.paperKey));
    return qs;
  }

  /* ---------------------------------------------------------- modules */
  async function saveModule(mod){
    const row = {
      title: mod.title,
      subject: mod.subject || '',
      // Deduped and blank-stripped here rather than trusted from the caller,
      // because the builder derives this list from the picked questions and
      // the same topic reappears on question after question.
      topics: Array.from(new Set((mod.topics || []).map(t => String(t).trim()).filter(Boolean))),
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
    // The raw supabase-js client. Exposed for the two things this adapter
    // deliberately does not wrap: Storage uploads and reading the current
    // session's access token (upload.js needs both). Everything else should
    // go through the functions below rather than reaching past them.
    client,
    open, slug, paperKeyOf, paperLabel,
    upsertPaper, getAllPapers, deletePaper,
    getAllQuestions, getQuestionsByPaperKey, getQuestionsByUids, updateQuestion,
    getFacets, search,
    saveModule, getAllModules, getModule, deleteModule,
    isPurchased, markPurchased,
    setVideo,
    signIn, signOut, isAdmin
  };

})();
