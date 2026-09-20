/* IndexedDB tabanlı otomatik kayıt + görsel önbelleği. */
(function (global) {
  const DB = 'store-mockup-db';
  const KV = 'kv';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(KV);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  async function set(key, val) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(KV, 'readwrite');
      tx.objectStore(KV).put(val, key);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  }

  async function get(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(KV, 'readonly');
      const rq = tx.objectStore(KV).get(key);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
  }

  // --- görsel önbelleği ---
  const cache = new Map();
  function imageFor(dataUrl) {
    if (!dataUrl) return null;
    return cache.get(dataUrl) || null;
  }
  function loadImage(dataUrl) {
    if (!dataUrl) return Promise.resolve(null);
    if (cache.has(dataUrl)) return Promise.resolve(cache.get(dataUrl));
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => { cache.set(dataUrl, img); res(img); };
      img.onerror = () => res(null);
      img.src = dataUrl;
    });
  }
  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  async function del(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(KV, 'readwrite');
      tx.objectStore(KV).delete(key);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  }

  /* ---- projeler: { id, name, updated, created, tpl, lang, cover } dizini + 'project:<id>' gövdesi ----
     Eski 'apps' / 'app:<id>' kayıtları ilk açılışta taşınır. Gövde = editörün serialize() çıktısı
     (+ setup/copy alanları). İleride kullanıcı hesabıyla senkron için aynı şekil kullanılacak. */
  const PROJECTS = 'projects';
  async function migrate() {
    const done = await get('projects:migrated').catch(() => null);
    if (done) return;
    const apps = (await get('apps').catch(() => null)) || [];
    const list = (await get(PROJECTS).catch(() => null)) || [];
    for (const a of apps) {
      if (list.some((p) => p.id === a.id)) continue;
      const body = await get('app:' + a.id).catch(() => null);
      if (!body) continue;
      await set('project:' + a.id, body);
      list.push({ id: a.id, name: a.name, updated: a.updated || Date.now(), created: a.updated || Date.now() });
    }
    await set(PROJECTS, list);
    await set('projects:migrated', 1);
  }
  async function listProjects() {
    await migrate();
    const l = (await get(PROJECTS).catch(() => null)) || [];
    return l.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }
  async function getProject(id) { return get('project:' + id); }
  /** meta: { name, tpl, lang, cover } — dizin satırını günceller, gövdeyi yazar. */
  async function saveProject(id, body, meta) {
    await migrate();
    const list = (await get(PROJECTS).catch(() => null)) || [];
    let row = list.find((p) => p.id === id);
    if (!row) { row = { id, created: Date.now() }; list.push(row); }
    Object.assign(row, meta || {}, { updated: Date.now() });
    if (body) await set('project:' + id, body);
    await set(PROJECTS, list);
    return row;
  }
  async function deleteProject(id) {
    const list = ((await get(PROJECTS).catch(() => null)) || []).filter((p) => p.id !== id);
    await set(PROJECTS, list);
    await del('project:' + id);
    await del('app:' + id).catch(() => {});
  }
  const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  global.Store = { set, get, del, loadImage, imageFor, fileToDataUrl, listProjects, getProject, saveProject, deleteProject, newId };
})(window);
