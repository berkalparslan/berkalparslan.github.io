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

  global.Store = { set, get, loadImage, imageFor, fileToDataUrl };
})(window);
