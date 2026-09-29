// Estado en memoria + reglas de negocio. Las fotos (blobs) se leen bajo demanda.
// S = datos de la sección activa; ALL = todo lo guardado (todas las secciones).
const S = { scouts: [], badges: [], completions: [], activities: [], specifics: [] };
const ALL = { scouts: [], badges: [], completions: [], activities: [], specifics: [] };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const statusOf = p => (p >= 100 ? 'done' : p > 0 ? 'prog' : 'pend');
const STATUS_LABEL = { done: 'Completada', prog: 'En progreso', pend: 'Sin iniciar' };

const blobToDataURL = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

// Reduce una imagen (File/Blob) a JPEG con lado máximo `max`.
async function resizeImage(file, max = 1400, quality = 0.8, limit = 650 * 1024) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let blob;
  for (const [side, q] of [[max, quality], [max, 0.68], [1100, 0.65], [900, 0.6], [700, 0.55]]) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
    if (blob.size <= limit) break; // cabe con margen en un documento de Firestore (1 MB en base64)
  }
  return blob;
}

const Store = {
  section: 'caminantes',
  _done: null,
  touch() { this._done = null; },

  async setSection(id) {
    if (!Object.hasOwn(SECTIONS, id) || !SECTIONS[id].enabled) return;
    this.section = id; await this.reload();
    if (!S.badges.length) { for (const b of SECTIONS[id].seed) await DB.put('badges', b); await this.reload(); }
  },
  async init() {
    await DB.open();
    await this.reload();
    // Migración: reemplaza las insignias de ejemplo anteriores (b1–b4) si aún no hay datos.
    if (S.badges.some(b => /^b[1-4]$/.test(b.id)) && !S.activities.length) {
      for (const b of S.badges) await DB.del('badges', b.id);
      for (const c of S.completions) await DB.del('completions', c.id);
      await this.reload();
    }
    // Migración: áreas que aún tienen los requisitos genéricos "Competencia N" pasan a los del grupo.
    for (const seed of SEED_BADGES) {
      const b = S.badges.find(x => x.id === seed.id);
      if (b && b.requirements.every(r => /^Competencia \d$/.test(r.text))) { await DB.put('badges', seed); await this.reload(); }
    }
    // Migración: todas las áreas pasan a 4 actividades + proyecto final + informe (una vez por área).
    for (const seed of SEED_BADGES) {
      const b = S.badges.find(x => x.id === seed.id);
      if (!b || (b.reqVersion || 0) >= REQ_VERSION) continue;
      // Lo registrado se conserva si solo usa las posiciones de actividad (las primeras 4, nunca proyecto/informe):
      // esas posiciones pasan a ser «Actividad 1..4» con el mismo id.
      const pos = new Map(b.requirements.map((r, i) => [r.id, i]));
      const usedIds = new Set([
        ...S.completions.filter(c => c.badgeId === b.id).map(c => c.reqId),
        ...S.activities.filter(x => x.badgeId === b.id).flatMap(x => x.reqIds),
      ]);
      const safe = [...usedIds].every(id => pos.has(id) && pos.get(id) < 4 && !/proyecto|informe/i.test(b.requirements[pos.get(id)].text));
      if (safe) await DB.put('badges', { ...seed, name: b.name, description: b.description, color: b.color, icon: b.icon });
    }
    await this.reload();
    const OLD = { a1: '#3f6b6b', a2: '#5f8f3e', a3: '#8a5a34', a4: '#a3743f', a5: '#2d5a3d' };
    for (const b of S.badges) {
      if (OLD[b.id] === b.color) await DB.put('badges', { ...b, color: SEED_BADGES.find(x => x.id === b.id).color });
    }
    await this.reload();
    if (!S.badges.length) { for (const b of SECTIONS[this.section].seed) await DB.put('badges', b); await this.reload(); }
  },
  async reload() {
    for (const k of Object.keys(ALL)) ALL[k] = await DB.all(k);
    const inSec = o => (o.section || 'caminantes') === this.section;
    for (const k of ['scouts', 'badges', 'activities', 'specifics']) S[k] = ALL[k].filter(inSec);
    const mine = new Set(S.scouts.map(s => s.id));
    S.completions = ALL.completions.filter(c => mine.has(c.scoutId));
    S.badges.forEach(b => { if (!/^#[0-9a-f]{6}$/i.test(b.color)) b.color = '#1c4a9a'; if (!Object.hasOwn(ICONS, b.icon)) b.icon = 'compass'; }); // defensa al pintar
    S.badges.sort((a, b) => a.order - b.order);
    S.scouts.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    S.activities.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    this.touch();
  },

  scout: id => S.scouts.find(s => s.id === id),
  badge: id => S.badges.find(b => b.id === id),
  activity: id => S.activities.find(a => a.id === id),

  // ---- Caminantes
  async saveScout(input) {
    const s = V.scout(input);
    if (!s.id) { s.id = uid(); s.createdAt = Date.now(); }
    else if (!this.scout(s.id)) throw new V.ValidationError('id', 'Caminante inexistente');
    await DB.put('scouts', s); await this.reload();
    return s;
  },
  async deleteScout(id) {
    await DB.del('scouts', id);
    for (const c of S.specifics.filter(c => c.scoutId === id)) await DB.del('specifics', c.id);
    for (const c of S.completions.filter(c => c.scoutId === id)) await DB.del('completions', c.id);
    for (const a of S.activities.filter(a => a.scoutIds.includes(id))) await DB.put('activities', { ...a, scoutIds: a.scoutIds.filter(x => x !== id) });
    await this.reload();
  },

  // ---- Etapas, competencias específicas y máximo logro
  stageOf(s) { const st = [...STAGES].reverse().find(x => s.stages?.[x.k]); return st ? st.name : ''; },
  async saveSpecific(input) {
    const o = V.specific(input, V.context(S.scouts, S.badges));
    o.id = o.id || uid(); await DB.put('specifics', o); await this.reload();
  },
  async deleteSpecific(id) { await DB.del('specifics', id); await this.reload(); },
  specificCount(sid, bid) { return S.specifics.filter(c => c.scoutId === sid && c.badgeId === bid).length; },
  // área alcanzada = todos sus requisitos completos, o al menos una competencia específica acreditada en ella
  areasReached(sid) { return S.badges.filter(b => this.badgeProgress(sid, b.id).pct >= 100 || this.specificCount(sid, b.id) >= 1); },
  honorOf(s) { return { checks: {}, proyectoPct: 0, steps: {}, ...(s.honor || {}) }; },
  honorMet(s) {
    const h = this.honorOf(s);
    return {
      proyectos: !!h.checks.proyectos, areas: this.areasReached(s.id).length >= 3, progresion: !!h.checks.progresion,
      participacion: !!h.checks.participacion, impacto: !!h.checks.impacto, proyecto75: (+h.proyectoPct || 0) >= 75,
    };
  },

  // ---- Insignias: `lines` = un requisito por línea; se conserva el id por posición para no perder avances
  async saveBadge(input, rawLines) {
    const lines = V.reqLines(rawLines), cur = this.badge(input.id);
    if (!cur) throw new V.ValidationError('id', 'Insignia inexistente');
    const old = cur.requirements;
    const b = V.badge({ ...cur, name: input.name, description: input.description, requirements: cur.requirements });
    b.requirements = lines.map((text, i) => ({ id: old[i]?.id || b.id + 'r' + uid(), text }));
    for (const r of old.slice(lines.length)) {
      for (const c of S.completions.filter(c => c.reqId === r.id)) await DB.del('completions', c.id);
    }
    Object.assign(b, V.badge(b));
    await DB.put('badges', b); await this.reload();
  },

  // ---- Progreso
  isDone(sid, rid) { return (this._done || (this._done = new Set(S.completions.map(c => c.id)))).has(sid + '_' + rid); },
  async toggleReq(sid, bid, rid) {
    if (!this.scout(sid) || !this.badge(bid)?.requirements.some(r => r.id === rid)) throw new V.ValidationError('req', 'Requisito inexistente');
    const id = sid + '_' + rid;
    if (this.isDone(sid, rid)) await DB.del('completions', id);
    else await DB.put('completions', { id, scoutId: sid, badgeId: bid, reqId: rid, activityId: null, date: today() });
    await this.reload();
  },
  badgeProgress(sid, bid) {
    const reqs = this.badge(bid).requirements;
    const done = reqs.filter(r => this.isDone(sid, r.id)).length;
    return { done, total: reqs.length, pct: pct(done, reqs.length) };
  },
  _sum(pairs) {
    let done = 0, total = 0;
    pairs.forEach(([s, b]) => { const p = this.badgeProgress(s, b); done += p.done; total += p.total; });
    return { done, total, pct: pct(done, total) };
  },
  scoutProgress(sid) { return this._sum(S.badges.map(b => [sid, b.id])); },
  groupBadgeProgress(bid) { return this._sum(S.scouts.map(s => [s.id, bid])); },
  overall() { return this._sum(S.scouts.flatMap(s => S.badges.map(b => [s.id, b.id]))); },
  pairCounts() {
    let inProg = 0, done = 0;
    S.scouts.forEach(s => S.badges.forEach(b => { const p = this.badgeProgress(s.id, b.id).pct; if (p >= 100) done++; else if (p > 0) inProg++; }));
    return { inProg, done };
  },

  // ---- Actividades
  async saveActivity(input, files = [], removed = []) {
    const a = V.activity(input, V.context(S.scouts, S.badges));
    if (a.id && !this.activity(a.id)) throw new V.ValidationError('id', 'Actividad inexistente');
    const prev = a.id ? this.activity(a.id) : null;
    if (prev && a.photoIds.some(p => !prev.photoIds.includes(p))) throw new V.ValidationError('files', 'Foto no válida');
    if (removed.some(p => !prev?.photoIds.includes(p))) throw new V.ValidationError('files', 'Foto no válida');
    if (a.photoIds.length + files.length > 20) throw new V.ValidationError('files', 'Máximo 20 fotos por actividad');
    for (const f of files) await V.image(f); // valida todo antes de escribir nada
    if (!a.id) { a.id = uid(); a.createdAt = Date.now(); }
    for (const pid of removed) await DB.del('photos', pid);
    a.photoIds = a.photoIds.filter(id => !removed.includes(id));
    for (const f of files) {
      const id = uid();
      await DB.put('photos', { id, blob: await resizeImage(f) });
      a.photoIds.push(id);
    }
    await DB.put('activities', a);
    await this.reload();
    await this.syncActivityProgress(a.badgeId);
    if (prev && prev.badgeId !== a.badgeId) await this.syncActivityProgress(prev.badgeId);
  },
  // Cada Caminante suma «Actividad 1..4» de la insignia según a cuántas actividades de ella asistió (por fecha).
  // Solo toca los avances creados automáticamente (con activityId); lo marcado a mano se respeta.
  async syncActivityProgress(badgeId) {
    const b = this.badge(badgeId);
    if (!b) return;
    const slots = b.requirements.map(r => ({ id: r.id, n: +(/^Actividad\s+(\d+)$/i.exec(r.text)?.[1] || 0) })).filter(x => x.n).sort((x, y) => x.n - y.n);
    if (!slots.length) return;
    const all = await DB.all('completions');
    const auto = all.filter(c => c.badgeId === badgeId && c.activityId);
    for (const c of auto) await DB.del('completions', c.id);
    const taken = new Set(all.filter(c => !(c.badgeId === badgeId && c.activityId)).map(c => c.id));
    const acts = S.activities.filter(x => x.badgeId === badgeId).slice()
      .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt);
    for (const sc of S.scouts) {
      const mine = acts.filter(x => x.scoutIds.includes(sc.id));
      for (let i = 0; i < Math.min(slots.length, mine.length); i++) {
        const id = sc.id + '_' + slots[i].id;
        if (!taken.has(id)) await DB.put('completions', { id, scoutId: sc.id, badgeId, reqId: slots[i].id, activityId: mine[i].id, date: mine[i].date });
      }
    }
    await this.reload();
  },
  // Número de la actividad dentro de su insignia (1.ª, 2.ª… por fecha)
  actNumber(a) {
    const same = S.activities.filter(x => x.badgeId === a.badgeId).slice()
      .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt);
    return same.findIndex(x => x.id === a.id) + 1;
  },
  async deleteActivity(id) {
    const a = this.activity(id);
    for (const pid of a.photoIds) await DB.del('photos', pid);
    for (const c of S.completions.filter(c => c.activityId === id)) await DB.del('completions', c.id);
    await DB.del('activities', id);
    await this.reload();
    await this.syncActivityProgress(a.badgeId);
  },
  filterActivities({ from, to, scoutId, badgeId } = {}) {
    return S.activities.filter(a =>
      (!from || a.date >= from) && (!to || a.date <= to) &&
      (!scoutId || a.scoutIds.includes(scoutId)) && (!badgeId || a.badgeId === badgeId));
  },

  // ---- Recordatorios
  issues(a) {
    const r = [];
    if (!a.photoIds.length) r.push({ k: 'photos', t: 'Faltan fotografías' });
    if ((a.description || '').trim().length < 15) r.push({ k: 'desc', t: 'Falta describir la actividad' });
    if (!a.scoutIds.length) r.push({ k: 'people', t: 'Sin participantes' });
    return r;
  },
  reminders() { return S.activities.map(a => ({ a, issues: this.issues(a) })).filter(x => x.issues.length); },

  // ---- Fotos
  _urls: new Map(),
  async photoUrl(id) {
    if (!this._urls.has(id)) {
      const p = await DB.get('photos', id);
      this._urls.set(id, p ? URL.createObjectURL(p.blob) : '');
    }
    return this._urls.get(id);
  },

  // ---- Respaldo
  async exportAll() {
    const photos = await DB.all('photos');
    return JSON.stringify({
      version: 1, exported: new Date().toISOString(),
      scouts: ALL.scouts, badges: ALL.badges, completions: ALL.completions, activities: ALL.activities, specifics: ALL.specifics,
      photos: await Promise.all(photos.map(async p => ({ id: p.id, data: await blobToDataURL(p.blob) }))),
    });
  },
  async importAll(text) {
    if (typeof text !== 'string' || text.length > 400e6) throw new V.ValidationError('file', 'Archivo demasiado grande');
    let raw; try { raw = JSON.parse(text); } catch { throw new V.ValidationError('file', 'El archivo no es un respaldo válido'); }
    const d = V.backup(raw);
    const photos = [];
    for (const p of d.photos) {
      const bin = atob(p.data.slice(p.data.indexOf(',') + 1));
      const blob = new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))], { type: p.data.slice(5, p.data.indexOf(';')) });
      try { photos.push({ id: p.id, blob: await resizeImage(blob) }); } catch { throw new V.ValidationError('file', 'Una de las fotos no se pudo leer como imagen'); }
    }
    for (const s of ['scouts', 'badges', 'completions', 'activities', 'photos', 'specifics']) await DB.clear(s);
    for (const s of ['scouts', 'badges', 'completions', 'activities', 'specifics']) for (const o of d[s] || []) await DB.put(s, o);
    for (const p of photos) await DB.put('photos', p);
    this._urls.clear();
    await this.reload();
  },
};
