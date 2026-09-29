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
async function resizeImage(file, max = 1600, quality = 0.82) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/jpeg', quality));
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
    // Sincroniza el progreso: retira lo que esta actividad marcó antes y marca lo actual.
    const all = await DB.all('completions');
    const mine = new Set(all.filter(c => c.activityId === a.id).map(c => c.id));
    for (const id of mine) await DB.del('completions', id);
    const existing = new Set(all.filter(c => !mine.has(c.id)).map(c => c.id));
    for (const sid of a.scoutIds) for (const rid of a.reqIds) {
      const id = sid + '_' + rid;
      if (!existing.has(id)) await DB.put('completions', { id, scoutId: sid, badgeId: a.badgeId, reqId: rid, activityId: a.id, date: a.date });
    }
    await this.reload();
  },
  async deleteActivity(id) {
    const a = this.activity(id);
    for (const pid of a.photoIds) await DB.del('photos', pid);
    for (const c of S.completions.filter(c => c.activityId === id)) await DB.del('completions', c.id);
    await DB.del('activities', id);
    await this.reload();
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
    if (!a.reqIds.length) r.push({ k: 'reqs', t: 'Sin requisitos asociados' });
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
