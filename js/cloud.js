// Modo nube (Firebase): datos compartidos en tiempo real entre los usuarios autorizados.
// Sin configuración (firebase-config.js vacío) la app funciona en modo local, como antes.
// Cloud.attach() reemplaza el almacenamiento local (DB) por Firestore con la misma interfaz.
const CLOUD = typeof FIREBASE_CONFIG === 'object' && FIREBASE_CONFIG !== null;

const Cloud = (() => {
  const BASE = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-';
  const LIBS = [
    ['app-compat.js', 'sha384-mLD+wdwynYnAhgHAkdPP5hroWJXJTNy5C2OhPKM55zuiV2vjzFD1LtBohaHq2Ex8'],
    ['auth-compat.js', 'sha384-NiuRnBs5Z0OgJ12kYJLSeWxANeJN369zH3+Zn0TGVPaCH/TKmbPFqfOmmLtrj+wg'],
    ['firestore-compat.js', 'sha384-/SBCyt0JELVRyyrOp+QG5CdnpVoAry+uw9hdherLgyZxxePtHjOvQmJU5CHymUhT'],
  ];
  const COLS = ['scouts', 'badges', 'completions', 'activities', 'specifics', 'attendance', 'service']; // en memoria y en vivo
  const mirror = Object.fromEntries(COLS.map(c => [c, new Map()]));
  const photoCache = new Map();
  // Colecciones cuyo permiso puede faltar sin romper el resto de la app (hasta que se publiquen las reglas actualizadas)
  const OPTIONAL = new Set(['attendance', 'service']);
  let fs, auth;

  const plain = o => JSON.parse(JSON.stringify(o)); // Firestore no admite undefined
  const report = e => { console.error(e); if (Cloud.onError) Cloud.onError(e); };
  const dataUrlToBlob = url => {
    const bin = atob(url.slice(url.indexOf(',') + 1)), type = url.slice(5, url.indexOf(';'));
    return new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))], { type });
  };
  const loadScript = (src, integrity) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.integrity = integrity; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
    s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
  async function wipe(name) {
    const snap = await fs.collection(name).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fs.batch();
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Misma interfaz que el almacenamiento local: all / get / put / del / clear
  const denied = () => { throw new V.ValidationError('place', 'La nube todavía no permite guardar esto: hay que publicar las reglas de Firestore actualizadas (firestore.rules).'); };
  const db = {
    onChange: null, denied: new Set(),
    open() {
      return Promise.all(COLS.map(c => new Promise((res, rej) => {
        let first = true;
        fs.collection(c).onSnapshot(snap => {
          snap.docChanges().forEach(ch => (ch.type === 'removed' ? mirror[c].delete(ch.doc.id) : mirror[c].set(ch.doc.id, ch.doc.data())));
          if (first) { first = false; res(); } else if (db.onChange) db.onChange(c);
        }, err => {
          if (first && OPTIONAL.has(c)) { first = false; db.denied.add(c); console.warn('Sin permiso en la colección «' + c + '»: publica las reglas de firestore.rules'); res(); }
          else if (first) rej(err); else report(err);
        });
      })));
    },
    async all(s) {
      if (s !== 'photos') return [...mirror[s].values()];
      const snap = await fs.collection('photos').get();
      return snap.docs.map(d => ({ id: d.id, blob: dataUrlToBlob(d.data().data) }));
    },
    async get(s, id) {
      if (s !== 'photos') return mirror[s].get(id);
      if (photoCache.has(id)) return photoCache.get(id);
      const d = await fs.collection('photos').doc(id).get();
      if (!d.exists) return undefined;
      const p = { id, blob: dataUrlToBlob(d.data().data) };
      photoCache.set(id, p); return p;
    },
    async put(s, o) {
      if (db.denied.has(s)) denied();
      if (s === 'photos') {
        photoCache.set(o.id, o);
        const data = await blobToDataURL(o.blob);
        fs.collection('photos').doc(o.id).set({ data, createdAt: Date.now() }).catch(report);
        return;
      }
      const d = plain(o);
      mirror[s].set(o.id, d); // optimista: visible al instante, se sincroniza en segundo plano
      fs.collection(s).doc(o.id).set(d).catch(report);
    },
    async del(s, id) {
      if (db.denied.has(s)) denied();
      if (s === 'photos') photoCache.delete(id); else mirror[s].delete(id);
      fs.collection(s).doc(id).delete().catch(report);
    },
    async clear(s) {
      if (s === 'photos') photoCache.clear(); else mirror[s].clear();
      await wipe(s);
    },
  };

  return {
    onError: null,
    // Enlaza el SDK ya cargado (firebase) con la app. Separado de boot() para poder probarlo.
    async attach(firebase, config) {
      firebase.initializeApp(config);
      auth = firebase.auth();
      fs = firebase.firestore();
      try { await fs.enablePersistence({ synchronizeTabs: true }); } catch { /* sin caché sin conexión */ }
      DB = db;
      await new Promise(res => { const un = auth.onAuthStateChanged(() => { un(); res(); }); });
    },
    async boot() {
      if (!CLOUD) return;
      for (const [file, sri] of LIBS) await loadScript(BASE + file, sri);
      await this.attach(window.firebase, FIREBASE_CONFIG);
    },
    user: () => auth?.currentUser || null,
    signIn: (email, pw) => auth.signInWithEmailAndPassword(email, pw),
    signOut: () => auth.signOut(),
    db,
  };
})();
