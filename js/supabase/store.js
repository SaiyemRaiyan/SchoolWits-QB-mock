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

  /* ---------------------------------------------------------- reference-data cache
     `papers` and `syllabuses` are small, read-mostly, and now wanted by
     several independent things on one page load — the nav, the Browse
     filters, the syllabus picker and getFacets each asked for them, which
     meant the same rows crossed the wire three to five times per load.

     Cached for the lifetime of the page only (a reload refetches), and
     dropped explicitly whenever this adapter writes a paper, so an admin
     never sees their own change missing. Question rows are deliberately NOT
     cached here: they are large and this file is not their owner. */
  let paperCache = null;      // Promise<Paper[]>, not the array — see below
  let syllabusCache = null;
  function invalidatePaperCache(){ paperCache = null; syllabusCache = null; }

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
    invalidatePaperCache();
    return paperRowToRecord(data);
  }

  function getAllPapers(){
    // Returns the in-flight promise when one exists. The nav and the page
    // body boot concurrently and both want this list; caching the resolved
    // value only would still let both fire a query before either landed.
    if (paperCache) return paperCache;
    paperCache = (async () => {
      const { data, error } = await client.from('papers').select('*');
      check(error);
      return data.map(paperRowToRecord);
    })();
    paperCache.catch(() => { paperCache = null; });   // don't cache a failure
    return paperCache;
  }

  async function deletePaper(paperKey){
    // paper_key is a real unique column, not just the natural key used
    // for display — deleting by it directly needs no id lookup. Cascades
    // (ON DELETE CASCADE) clear the paper's questions/module_questions
    // server-side.
    const { error } = await client.from('papers').delete().eq('paper_key', paperKey);
    check(error);
    invalidatePaperCache();
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

  /* ------------------------------------------------- question editing */

  /**
   * Question editing goes through the update-question Edge Function, not
   * through a table write from here.
   *
   * Two reasons. First, q_text has to be recomputed from content on every
   * save -- search_vector is generated from q_text/topics/ref, not from
   * content, so writing content alone leaves the question findable only by
   * its old wording -- and the code that flattens a question lives in
   * backend/src/latex, which a browser cannot import. Second, the function
   * applies edits to the content already in the database rather than
   * trusting a tree from here, so what is stored keeps the shape the parser
   * produced.
   *
   * Which fields are editable is also the function's answer, not ours: it
   * returns the leaf list. A second opinion in this file would drift.
   */
  const EDIT_FUNCTION_URL = window.SUPABASE_URL + '/functions/v1/update-question';

  async function callEditFunction(body){
    const { data: { session } } = await client.auth.getSession();
    if(!session) throw new Error('Your session expired \u2014 sign in again.');

    const res = await fetch(EDIT_FUNCTION_URL, {
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
    if(!res.ok) throw new Error(payload.error || `Request failed (${res.status}).`);
    return payload;
  }

  /**
   * The editable fields of one question, as { path, label, kind, value }.
   *
   * With a moduleId this describes that module's own copy (0018) rather
   * than the question in the bank, falling back to the bank's version when
   * the module has not edited it yet.
   */
  async function getQuestionLeaves(id, moduleId){
    const body = { id: Number(id) };
    if(moduleId != null) body.moduleId = Number(moduleId);
    return callEditFunction(body);
  }

  /**
   * Apply [{ path, value }] edits. Returns the saved content and new leaves.
   * With a moduleId the edit lands on that module's copy and the paper in
   * the bank is left untouched.
   */
  async function saveQuestionEdits(id, edits, moduleId){
    const body = { id: Number(id), edits };
    if(moduleId != null) body.moduleId = Number(moduleId);
    return callEditFunction(body);
  }

  /* ---------------------------------------------------------- facets & search */
  async function getFacets(){
    // Only the columns the facets actually need. This used to call
    // getAllQuestions(), which selects `content` — the whole parsed question
    // — for every row, to compute a topic list. Mirrors what
    // backend/src/db.ts already does. Also runs the two queries in parallel;
    // `[await a, await b]` ran them one after the other.
    const [topicRes, papers] = await Promise.all([
      client.from('questions').select('topics'),
      getAllPapers()
    ]);
    check(topicRes.error);
    const qs = topicRes.data || [];
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
    return {
      subjects: uniq(papers.map(p => p.subject)),
      papers: uniq(papers.map(p => p.paper)),
      variants: uniq(papers.map(p => p.variant)),
      sessions: uniq(papers.map(p => p.session)),
      years: uniq(papers.map(p => p.year)).sort((a, b) => b - a),
      // A question has several topics, so the facet list is the union across
      // all of them rather than one value each.
      topics: uniq(qs.flatMap(q => q.topics || [])),
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
    const uids = mod.questionUids || [];
    const questions = await getQuestionsByUids(uids);
    const byUid = new Map(questions.map(q => [q.uid, q]));
    const orderedQuestions = uids.map(u => byUid.get(u)).filter(Boolean);
    const keptIds = orderedQuestions.map(q => q.pk);

    // Refuse to prune on an incomplete resolve.
    //
    // keptIds is what survives the prune below, and it is built from the
    // uids that RESOLVED. A uid that failed to resolve is indistinguishable
    // from one the admin removed, so a partial read would silently delete
    // live links — and with them the modules' edited copies, which are not
    // recoverable from the .tex.
    //
    // getQuestionsByUids resolves against getAllQuestions(), so this can
    // happen for reasons that have nothing to do with intent: PostgREST's
    // max-rows cap once the bank outgrows it, or a question deleted between
    // the builder loading and the admin saving. Failing loudly is the only
    // safe answer — the save is abandoned with nothing written.
    if(orderedQuestions.length !== uids.length){
      const missing = uids.filter(u => !byUid.has(u));
      throw new Error(
        `Refusing to save: ${missing.length} of ${uids.length} questions could not be read back `
        + `(${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ', …' : ''}). `
        + `Saving now would remove them from the module along with any edits made for it. `
        + `Reload the page and try again.`
      );
    }

    // INSERT for a new module, UPDATE for an existing one — deliberately not
    // an upsert with the id in the row.
    //
    // modules.id is `generated always as identity`, and PostgREST implements
    // upsert as INSERT ... ON CONFLICT, so the id is part of the INSERT
    // column list even when the row already exists. Postgres rejects that
    // outright: "cannot insert a non-DEFAULT value into column id". The
    // upsert worked only for as long as nothing ever passed an id.
    let savedRow;
    if(mod.id){
      const { data, error } = await client
        .from('modules').update(row).eq('id', Number(mod.id)).select().single();
      check(error);
      savedRow = data;
    } else {
      const { data, error } = await client
        .from('modules').insert(row).select().single();
      check(error);
      savedRow = data;
    }

    // Resolve the uid list to real question rows the same way
    // getQuestionsByUids does.
    // Upsert-then-prune, NOT delete-then-insert.
    //
    // This used to replace module_questions wholesale, mirroring the old
    // IndexedDB record's questionUids array. That stopped being safe when
    // 0018 added content_override: a module's own edited copy of a question
    // lives on this row, so deleting and re-inserting would silently destroy
    // every edit the moment the pack was re-saved.
    //
    // Upserting refreshes sort_order while leaving content_override alone —
    // the row object below never mentions that column, so an update cannot
    // clear it. Overrides therefore only ever change through the
    // update-question Edge Function.
    if(orderedQuestions.length){
      const linkRows = orderedQuestions.map((q, i) => ({ module_id: savedRow.id, question_id: q.pk, sort_order: i }));
      const up = await client
        .from('module_questions')
        .upsert(linkRows, { onConflict: 'module_id,question_id' });
      check(up.error);
    }

    // Drop only the links no longer picked. Removing a question from a pack
    // does discard its edited copy — that is the right reading of "this
    // question is not in this module any more".
    let prune = client.from('module_questions').delete().eq('module_id', savedRow.id);
    if(keptIds.length) prune = prune.not('question_id', 'in', `(${keptIds.join(',')})`);
    const del = await prune;
    check(del.error);

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

  /**
   * A module's questions, in module order, with each module's own edited
   * copy already applied.
   *
   * Replaces the getQuestionsByUids() path the storefront used to take,
   * which fetched EVERY question in the bank (each with its whole `content`
   * blob) and then filtered in memory — and returned them in table order,
   * silently losing the sort_order getModule() had just resolved.
   *
   * `content_override` (0018) is merged into `.content` here so that
   * js/render and js/modules need no knowledge of overrides at all: they
   * render whatever `.content` holds. `hasOverride` is exposed separately
   * for the builder, which marks edited rows.
   */
  async function getModuleQuestions(moduleId){
    const { data, error } = await client
      .from('module_questions')
      .select('sort_order, content_override, questions(*, papers(*))')
      .eq('module_id', Number(moduleId))
      .order('sort_order');
    check(error);

    return (data || [])
      .filter(link => link.questions)
      .map(link => {
        const record = questionRowToRecord(link.questions, link.questions.papers);
        return Object.assign(record, {
          content: link.content_override || record.content,
          hasOverride: link.content_override != null,
          sortOrder: link.sort_order
        });
      });
  }

  /**
   * Make sure one question is linked to a module, without disturbing the
   * rest of the pack.
   *
   * Needed because an edited copy is keyed on (module_id, question_id): a
   * question ticked in the builder but not yet saved has no row for the
   * override to live on, and update-question rightly refuses to create one.
   *
   * ignoreDuplicates so an existing link keeps its sort_order — this is a
   * "make sure it is there", not a reorder. The full reconcile (including
   * pruning what was unticked) still happens on Save, so nothing here
   * destroys a link or an override.
   */
  async function addModuleQuestion(moduleId, questionPk, sortOrder){
    const { error } = await client
      .from('module_questions')
      .upsert(
        { module_id: Number(moduleId), question_id: Number(questionPk), sort_order: Number(sortOrder) || 0 },
        { onConflict: 'module_id,question_id', ignoreDuplicates: true }
      );
    check(error);
  }

  /** Drop a module's edited copy, so it renders the paper's version again. */
  async function resetQuestionOverride(moduleId, questionId){
    return callEditFunction({ id: Number(questionId), moduleId: Number(moduleId), reset: true });
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
  /**
   * Google OAuth, via Supabase Auth's own provider.
   *
   * There is no client id or secret in this codebase and no callback route
   * to write: the credentials live in the Supabase project (Authentication
   * -> Providers -> Google) and Supabase owns the callback at
   * <project>.supabase.co/auth/v1/callback. The browser's only job is to
   * start the flow and to say where the user should land afterwards.
   *
   * `redirectTo` is the CURRENT page, so an admin who hits the gate on
   * modules.html comes back to modules.html rather than the site root. That
   * URL must be listed under Authentication -> URL Configuration ->
   * Redirect URLs, or Supabase refuses the round trip.
   */
  async function signInWithGoogle(redirectTo){
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.href.split('#')[0]
      }
    });
    check(error);
    return data;
  }
  async function currentUser(){
    const { data: { user } } = await client.auth.getUser();
    return user || null;
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



  /**
   * Paper and question totals only.
   *
   * Home showed two numbers but reached them through getFacets(), which
   * reads a row per question to build topic/subject/year lists it then threw
   * away. `head: true` makes PostgREST return the count in a header and no
   * rows at all.
   */
  async function getCounts(){
    const [papers, questions] = await Promise.all([
      client.from('papers').select('*', { count: 'exact', head: true }),
      client.from('questions').select('*', { count: 'exact', head: true })
    ]);
    check(papers.error); check(questions.error);
    return { paperCount: papers.count || 0, questionCount: questions.count || 0 };
  }

  /* ---------------------------------------------------------- syllabuses */
  /**
   * The subject/code catalogue that drives Browse navigation (see 0015),
   * grouped by qualification and annotated with how many papers each
   * subject actually has.
   *
   * Joined on `subject_code`, never on the subject NAME: papers.subject is
   * derived from a folder name at import time ("Add Maths"), while the
   * catalogue carries the board's own title ("Additional Mathematics").
   * They differ today for 2 of the 5 subjects.
   *
   * `withPapers` is what the nav renders — a subject nobody has uploaded a
   * paper for yet would otherwise be a dead end.
   */
  function getSyllabuses(knownPapers){
    if (syllabusCache) return syllabusCache;
    syllabusCache = buildSyllabuses(knownPapers);
    syllabusCache.catch(() => { syllabusCache = null; });
    return syllabusCache;
  }

  async function buildSyllabuses(knownPapers){
    const [{ data: rows, error }, papers] = await Promise.all([
      client.from('syllabuses').select('*').order('qualification').order('sort_order'),
      // Browse already loads the paper list for its filters; re-fetching it
      // here made three round-trips for the same rows on every page load.
      knownPapers || getAllPapers()
    ]);
    check(error);

    const paperCount = new Map();
    papers.forEach(p => {
      const code = p.subjectCode;
      if (code) paperCount.set(code, (paperCount.get(code) || 0) + 1);
    });

    const subjects = (rows || []).map(r => ({
      code: r.code,
      title: r.title,
      qualification: r.qualification,
      board: r.board,
      sortOrder: r.sort_order,
      paperCount: paperCount.get(r.code) || 0
    }));

    // Preserve the order the query returned rather than re-sorting by name:
    // sort_order is editable data, and that is the point of the table.
    const byQualification = [];
    subjects.forEach(s => {
      let group = byQualification.find(g => g.qualification === s.qualification);
      if (!group) byQualification.push(group = { qualification: s.qualification, board: s.board, subjects: [] });
      group.subjects.push(s);
    });

    // Qualifications that actually have papers come first, then alphabetical.
    // Plain alphabetical put "IGCSE" (0 papers) ahead of "O Level" (9), so
    // Browse opened on an empty branch.
    byQualification.forEach(g => { g.paperCount = g.subjects.reduce((n, x) => n + x.paperCount, 0); });
    byQualification.sort((a, b) =>
      (b.paperCount > 0) - (a.paperCount > 0) || a.qualification.localeCompare(b.qualification));

    return {
      subjects,
      byQualification,
      withPapers: subjects.filter(s => s.paperCount > 0)
    };
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
    getFacets, getCounts, search, getSyllabuses, invalidatePaperCache,
    saveModule, getAllModules, getModule, deleteModule,
    getModuleQuestions, resetQuestionOverride, addModuleQuestion,
    isPurchased, markPurchased,
    setVideo,
    getQuestionLeaves, saveQuestionEdits,
    signInWithGoogle, signOut, isAdmin, currentUser
  };

})();
