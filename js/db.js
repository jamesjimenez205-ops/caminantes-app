// Envoltorio mínimo de IndexedDB: un store por entidad, todos con keyPath "id".
const LocalDB = (() => {
  const STORES = ['scouts', 'badges', 'completions', 'activities', 'photos', 'specifics', 'attendance', 'service'];
  let db;
  const wrap = req => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  const os = (s, mode = 'readonly') => db.transaction(s, mode).objectStore(s);
  return {
    open() {
      return new Promise((res, rej) => {
        const r = indexedDB.open('caminantes-scout', 4);
        r.onupgradeneeded = () => STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); });
        r.onsuccess = () => { db = r.result; res(); };
        r.onerror = () => rej(r.error);
      });
    },
    all: s => wrap(os(s).getAll()),
    get: (s, id) => wrap(os(s).get(id)),
    put: (s, o) => wrap(os(s, 'readwrite').put(o)),
    del: (s, id) => wrap(os(s, 'readwrite').delete(id)),
    clear: s => wrap(os(s, 'readwrite').clear()),
  };
})();
let DB = LocalDB; // cloud.js lo reemplaza por Firestore cuando hay configuración
