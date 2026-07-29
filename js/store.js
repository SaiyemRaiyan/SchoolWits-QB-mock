/* =====================================================================
   School Wits — Data Layer (DB)
   IndexedDB-backed store. No backend — everything lives in the browser.
   Shared by index.html (Browse), upload.html (Ingest) and modules.html
   (Module Builder / Storefront).
   ===================================================================== */

const DB = (function(){

  const NAME = 'schoolwits_bank';
  const VERSION = 1;
  let dbp = null;

  function open(){
    if(dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        if(!db.objectStoreNames.contains('questions')){
          const qs = db.createObjectStore('questions', { keyPath: 'uid' });
          qs.createIndex('subject', 'subject', { unique: false });
          qs.createIndex('topic', 'topic', { unique: false });
          qs.createIndex('paperKey', 'paperKey', { unique: false });
          qs.createIndex('year', 'year', { unique: false });
        }
        if(!db.objectStoreNames.contains('papers')){
          db.createObjectStore('papers', { keyPath: 'paperKey' });
        }
        if(!db.objectStoreNames.contains('modules')){
          const ms = db.createObjectStore('modules', { keyPath: 'id', autoIncrement: true });
          ms.createIndex('topic', 'topic', { unique: false });
        }
        if(!db.objectStoreNames.contains('meta')){
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbp;
  }

  function tx(storeNames, mode){
    return open().then(db => db.transaction(storeNames, mode));
  }

  function reqToPromise(req){
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /* ---------------------------------------------------------- helpers */
  function slug(s){
    return String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function paperKeyOf(p){
    return [slug(p.subject), p.paper, p.variant, slug(p.session), p.year].join('|');
  }

  function paperLabel(p){
    return `${p.subjectCode ? p.subjectCode + '/' : ''}${p.paper}${p.variant}/${p.session}/${String(p.year).slice(-2)}`;
  }

  /* ---------------------------------------------------------- papers */
  async function upsertPaper(meta){
    const paperKey = paperKeyOf(meta);
    const record = Object.assign({}, meta, { paperKey, label: paperLabel(meta) });
    const t = await tx('papers', 'readwrite');
    t.objectStore('papers').put(record);
    await reqToPromise(t.objectStore('papers').get(paperKey));
    return record;
  }

  async function getAllPapers(){
    const t = await tx('papers', 'readonly');
    return reqToPromise(t.objectStore('papers').getAll());
  }

  /* ---------------------------------------------------------- questions */
  // question: {subject, subjectCode, paper, variant, session, year, topic,
  //            id (number within paper), ref, marks, qHTML, markScheme[],
  //            exemplarHTML, videoId, images:{filename:dataURL}}
  async function addQuestions(paperMeta, questions){
    const paperKey = paperKeyOf(paperMeta);
    await upsertPaper(paperMeta);
    const t = await tx('questions', 'readwrite');
    const store = t.objectStore('questions');
    const saved = [];
    questions.forEach(q => {
      const uid = `${paperKey}::${q.id}`;
      const record = Object.assign({}, q, {
        uid, paperKey,
        subject: paperMeta.subject,
        subjectCode: paperMeta.subjectCode || '',
        paper: paperMeta.paper,
        variant: paperMeta.variant,
        session: paperMeta.session,
        year: paperMeta.year,
        ref: q.ref || `${paperLabel(paperMeta)} — Q${q.id}`,
        createdAt: Date.now()
      });
      store.put(record);
      saved.push(record);
    });
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    return saved;
  }

  async function getAllQuestions(){
    const t = await tx('questions', 'readonly');
    return reqToPromise(t.objectStore('questions').getAll());
  }

  async function getQuestionsByPaperKey(paperKey){
    const t = await tx('questions', 'readonly');
    return reqToPromise(t.objectStore('questions').index('paperKey').getAll(paperKey));
  }

  async function getQuestionsByUids(uids){
    const all = await getAllQuestions();
    const set = new Set(uids);
    return all.filter(q => set.has(q.uid));
  }

  async function updateQuestion(uid, patch){
    const t = await tx('questions', 'readwrite');
    const store = t.objectStore('questions');
    const existing = await reqToPromise(store.get(uid));
    if(!existing) return null;
    const updated = Object.assign({}, existing, patch);
    store.put(updated);
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    return updated;
  }

  async function deletePaper(paperKey){
    const qs = await getQuestionsByPaperKey(paperKey);
    const t = await tx(['questions', 'papers'], 'readwrite');
    qs.forEach(q => t.objectStore('questions').delete(q.uid));
    t.objectStore('papers').delete(paperKey);
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  }

  async function clearAll(){
    const t = await tx(['questions', 'papers', 'modules', 'meta'], 'readwrite');
    t.objectStore('questions').clear();
    t.objectStore('papers').clear();
    t.objectStore('modules').clear();
    t.objectStore('meta').clear();
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
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
      years: uniq(papers.map(p => p.year)).sort((a,b) => b - a),
      topics: uniq(qs.map(q => q.topic)),
      paperCount: papers.length,
      questionCount: qs.length
    };
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

  function stripHTML(html){
    if(!html) return '';
    return html.replace(/<[^>]*>/g, ' ');
  }

  /* ---------------------------------------------------------- modules */
  async function saveModule(mod){
    const t = await tx('modules', 'readwrite');
    const store = t.objectStore('modules');
    const record = Object.assign({ createdAt: Date.now() }, mod);
    const key = await reqToPromise(store.put(record));
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    return key;
  }

  async function getAllModules(){
    const t = await tx('modules', 'readonly');
    return reqToPromise(t.objectStore('modules').getAll());
  }

  async function getModule(id){
    const t = await tx('modules', 'readonly');
    return reqToPromise(t.objectStore('modules').get(Number(id)));
  }

  async function deleteModule(id){
    const t = await tx('modules', 'readwrite');
    t.objectStore('modules').delete(Number(id));
    await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  }

  /* ---------------------------------------------------------- purchases (mock, local only) */
  function isPurchased(moduleId){
    return localStorage.getItem('sw_purchase_' + moduleId) === '1';
  }
  function markPurchased(moduleId){
    localStorage.setItem('sw_purchase_' + moduleId, '1');
  }

  /* ---------------------------------------------------------- video (per-question override) */
  async function setVideo(uid, videoId){
    return updateQuestion(uid, { videoId });
  }

  /* ---------------------------------------------------------- seed sample data */
  async function seedIfEmpty(sampleMeta, sampleQuestions){
    const t = await tx('meta', 'readonly');
    const flag = await reqToPromise(t.objectStore('meta').get('seeded'));
    if(flag) return false;
    await addQuestions(sampleMeta, sampleQuestions);
    const t2 = await tx('meta', 'readwrite');
    t2.objectStore('meta').put({ key: 'seeded', value: true });
    await new Promise((res, rej) => { t2.oncomplete = res; t2.onerror = () => rej(t2.error); });
    return true;
  }

  return {
    open, slug, paperKeyOf, paperLabel,
    upsertPaper, getAllPapers, deletePaper,
    addQuestions, getAllQuestions, getQuestionsByPaperKey, getQuestionsByUids, updateQuestion,
    getFacets, search, clearAll,
    saveModule, getAllModules, getModule, deleteModule,
    isPurchased, markPurchased,
    setVideo, seedIfEmpty
  };

})();
