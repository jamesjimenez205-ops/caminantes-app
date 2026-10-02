// Estado en memoria + reglas de negocio. Las fotos (blobs) se leen bajo demanda.
// S = datos de la sección activa; ALL = todo lo guardado (todas las secciones).
const S = { scouts: [], badges: [], completions: [], activities: [], specifics: [], attendance: [], service: [] };
const ALL = { scouts: [], badges: [], completions: [], activities: [], specifics: [], attendance: [], service: [] };

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
    this.section = id; try { localStorage.setItem('caminantes-seccion', id); } catch { /* nada */ }
    await this.reload();
    if (!S.badges.length) { for (const b of SECTIONS[id].seed) await DB.put('badges', b); await this.reload(); }
    await this.syncAllActivityProgress();
    await this.syncServiceProgress();
  },
  async init() {
    try { const s = localStorage.getItem('caminantes-seccion'); if (s && Object.hasOwn(SECTIONS, s) && SECTIONS[s].enabled) this.section = s; } catch { /* nada */ }
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
    // Migración: todas las áreas pasan a actividades + proyecto final + informe (una vez por área).
    for (const seed of SEED_BADGES) {
      const b = S.badges.find(x => x.id === seed.id);
      if (!b || (b.reqVersion || 0) >= 2) continue;
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
    // v3: solo 3 actividades. Se quita «Actividad 4» y se conserva todo lo demás (ids y avances).
    for (const b of [...S.badges]) {
      if (!SEED_IDS.has(b.id) || (b.reqVersion || 0) >= REQ_VERSION) continue;
      const gone = b.requirements.filter(r => /^Actividad\s+4$/i.test(r.text)).map(r => r.id);
      for (const c of S.completions.filter(c => gone.includes(c.reqId))) await DB.del('completions', c.id);
      await DB.put('badges', { ...b, requirements: b.requirements.filter(r => !gone.includes(r.id)), reqVersion: REQ_VERSION });
    }
    await this.reload();
    // Migración: las destrezas de Unidad que aún no tienen imagen reciben la del documento (todas las secciones)
    for (const seed of UNIT_SEED) {
      const b = ALL.badges.find(x => x.id === seed.id);
      if (b && seed.image && !b.image && !b.photoId) await DB.put('badges', { ...b, image: seed.image });
    }
    await this.reload();
    // Vínculo con la labor social de las dos insignias de servicio (solo si siguen como las creó la app)
    const cam = ALL.badges.find(b => b.id === 'a5');
    if (cam && cam.requirements.find(r => r.id === 'a5r1')?.text === 'Actividad 1') {
      for (const c of ALL.completions.filter(c => c.reqId === 'a5r3')) await DB.del('completions', c.id);
      await DB.put('badges', { ...cam, requirements: SEED_BADGES.find(b => b.id === 'a5').requirements.filter(r => r.id !== 'a5r3').map(r => r) });
    }
    const uni = UNIT_SEED.find(b => b.name === 'Servicio a la comunidad'), ub = ALL.badges.find(b => b.id === uni.id);
    if (ub && !ub.requirements.length) await DB.put('badges', { ...ub, requirements: uni.requirements });
    await this.reload();
    await this.syncAllActivityProgress();
    await this.syncServiceProgress();
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
    for (const k of ['scouts', 'badges', 'activities', 'specifics', 'attendance', 'service']) S[k] = ALL[k].filter(inSec);
    S.attendance.sort((a, b) => b.date.localeCompare(a.date));
    S.service.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
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
  // Foto de perfil: se valida, se reduce (480 px) y se guarda en el almacén de fotos. opts: { photoFile, removePhoto }
  async _setPhoto(obj, prevId, { photoFile, removePhoto } = {}, max) {
    if (photoFile) {
      await V.image(photoFile);
      const pid = uid();
      await DB.put('photos', { id: pid, blob: await resizeImage(photoFile, max, 0.85, 200 * 1024) });
      if (prevId) await DB.del('photos', prevId);
      obj.photoId = pid;
    } else if (removePhoto && prevId) { await DB.del('photos', prevId); obj.photoId = ''; }
    else obj.photoId = prevId || '';
  },
  async saveScout(input, opts = {}) {
    const s = V.scout(input);
    if (opts.photoFile) await V.image(opts.photoFile);
    if (!s.id) { s.id = uid(); s.createdAt = Date.now(); }
    else if (!this.scout(s.id)) throw new V.ValidationError('id', 'Caminante inexistente');
    await this._setPhoto(s, this.scout(s.id)?.photoId, opts, 480);
    await DB.put('scouts', s); await this.reload();
    return s;
  },
  async deleteScout(id) {
    const ph = this.scout(id)?.photoId; if (ph) await DB.del('photos', ph);
    await DB.del('scouts', id);
    for (const c of S.specifics.filter(c => c.scoutId === id)) await DB.del('specifics', c.id);
    for (const c of S.completions.filter(c => c.scoutId === id)) await DB.del('completions', c.id);
    for (const a of S.activities.filter(a => a.scoutIds.includes(id))) await DB.put('activities', { ...a, scoutIds: a.scoutIds.filter(x => x !== id) });
    for (const r of S.service.filter(r => r.scoutIds.includes(id))) {
      const rest = r.scoutIds.filter(x => x !== id);
      if (rest.length) { await DB.put('service', { ...r, scoutIds: rest }); continue; }
      for (const pid of [...r.evidenceIds, r.certificateId].filter(Boolean)) await DB.del('photos', pid);
      await DB.del('service', r.id);
    }
    for (const a of S.attendance.filter(a => id in a.records)) {
      const records = { ...a.records }; delete records[id];
      if (Object.keys(records).length) await DB.put('attendance', { ...a, records }); else await DB.del('attendance', a.id);
    }
    await this.reload();
  },

  // ---- Etapas, competencias específicas y máximo logro
  stageOf(s) { const st = [...(SECTIONS[s.section || this.section]?.stages || [])].reverse().find(x => s.stages?.[x.k]); return st ? st.name : ''; },
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
  async createBadge(input, rawLines, opts = {}) {
    if (opts.photoFile) await V.image(opts.photoFile);
    const lines = V.reqLines(rawLines), g = SECTIONS[this.section].groups.find(x => x.k === input.group) || SECTIONS[this.section].groups[0];
    const bid = 'n' + uid();
    const b = V.badge({
      id: bid, section: this.section, group: g.k, order: Math.max(0, ...S.badges.map(x => x.order || 0)) + 1,
      name: input.name, description: input.description ?? '', color: g.color, icon: g.icon, reqVersion: REQ_VERSION,
      requirements: lines.map((text, i) => ({ id: bid + 'r' + (i + 1), text, ...(opts.hours?.[i] ? { hours: opts.hours[i] } : {}) })),
    });
    await this._setPhoto(b, '', opts, 320);
    await DB.put('badges', b); await this.reload();
    return b;
  },
  async deleteBadge(id) {
    const b = this.badge(id);
    if (!b) throw new V.ValidationError('name', 'Insignia inexistente');
    if (S.activities.some(a => a.badgeId === id)) throw new V.ValidationError('name', 'Tiene actividades registradas: no se puede eliminar');
    for (const c of S.completions.filter(c => c.badgeId === id)) await DB.del('completions', c.id);
    if (b.photoId) await DB.del('photos', b.photoId);
    await DB.del('badges', id); await this.reload();
  },
  async saveBadge(input, rawLines, opts = {}) {
    if (opts.photoFile) await V.image(opts.photoFile);
    const lines = V.reqLines(rawLines), cur = this.badge(input.id);
    if (!cur) throw new V.ValidationError('id', 'Insignia inexistente');
    const old = cur.requirements;
    const b = V.badge({ ...cur, name: input.name, description: input.description, group: input.group ?? cur.group, requirements: cur.requirements });
    const hrs = i => (opts.hours ? opts.hours[i] : old[i]?.hours); // sin horas indicadas se conservan las que ya tenía
    b.requirements = lines.map((text, i) => ({ id: old[i]?.id || b.id + 'r' + uid(), text, ...(hrs(i) ? { hours: hrs(i) } : {}) }));
    for (const r of old.slice(lines.length)) {
      for (const c of S.completions.filter(c => c.reqId === r.id)) await DB.del('completions', c.id);
    }
    Object.assign(b, V.badge(b));
    await this._setPhoto(b, cur.photoId, opts, 320);
    await DB.put('badges', b); await this.reload();
    await this.syncActivityProgress(b.id);
    await this.syncServiceProgress();
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
  // Progreso automático por asistencia a actividades. Cada Caminante/Scout suma un requisito por cada actividad de la
  // insignia a la que asistió (contadas por fecha): la 1.ª actividad marca el 1.er requisito, la 2.ª el 2.º, etc.
  //  · Caminantes: solo los requisitos «Actividad 1, 2, 3» (proyecto final e informe se marcan a mano).
  //  · Unidad: todos los requisitos de la insignia, en su orden (pueden ser 1 o varios según la insignia).
  // Solo toca los avances creados automáticamente (con activityId) y solo escribe lo que cambió; lo marcado a mano se respeta.
  async syncActivityProgress(badgeId) {
    const b = this.badge(badgeId);
    if (!b) return;
    const manualOrHours = b.requirements.filter(r => !r.hours); // los requisitos con horas los marca la labor social
    let slots = manualOrHours.map(r => r.id);
    if (SECTIONS[this.section].autoProgress !== 'todos') {
      slots = manualOrHours.map(r => ({ id: r.id, n: +(/^Actividad\s+(\d+)$/i.exec(r.text)?.[1] || 0) })).filter(x => x.n).sort((x, y) => x.n - y.n).map(x => x.id);
    }
    const all = await DB.all('completions');
    const isAuto = c => c.badgeId === badgeId && c.activityId && c.activityId !== 'labor';
    const current = new Map(all.filter(isAuto).map(c => [c.id, c]));
    const taken = new Set(all.filter(c => !isAuto(c)).map(c => c.id));
    const acts = S.activities.filter(x => x.badgeId === badgeId).slice()
      .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt);
    const want = new Map();
    for (const sc of S.scouts) {
      const mine = acts.filter(x => x.scoutIds.includes(sc.id));
      for (let i = 0; i < Math.min(slots.length, mine.length); i++) {
        const id = sc.id + '_' + slots[i];
        if (!taken.has(id)) want.set(id, { id, scoutId: sc.id, badgeId, reqId: slots[i], activityId: mine[i].id, date: mine[i].date });
      }
    }
    let changed = false;
    for (const [id] of current) if (!want.has(id)) { await DB.del('completions', id); changed = true; }
    for (const [id, c] of want) if (current.get(id)?.activityId !== c.activityId) { await DB.put('completions', c); changed = true; }
    if (changed) await this.reload();
  },
  // Requisitos con horas (insignias vinculadas a la labor social): se marcan solos cuando el total de horas de labor
  // social del joven llega a esa cantidad, y se desmarcan si baja. Solo escribe lo que cambió; lo manual se respeta.
  async syncServiceProgress() {
    const badges = S.badges.filter(b => b.requirements.some(r => r.hours));
    if (!badges.length) return;
    const all = await DB.all('completions');
    let changed = false;
    for (const b of badges) {
      const current = new Map(all.filter(c => c.badgeId === b.id && c.activityId === 'labor').map(c => [c.id, c]));
      const taken = new Set(all.filter(c => c.badgeId === b.id && c.activityId !== 'labor').map(c => c.id));
      const want = new Map();
      for (const sc of S.scouts) {
        const h = this.serviceHours(sc.id);
        for (const r of b.requirements) {
          const id = sc.id + '_' + r.id;
          if (r.hours && h >= r.hours && !taken.has(id)) want.set(id, { id, scoutId: sc.id, badgeId: b.id, reqId: r.id, activityId: 'labor', date: today() });
        }
      }
      for (const [id] of current) if (!want.has(id)) { await DB.del('completions', id); changed = true; }
      for (const [id, c] of want) if (!current.has(id)) { await DB.put('completions', c); changed = true; }
    }
    if (changed) await this.reload();
  },
  async syncAllActivityProgress() {
    for (const b of [...S.badges]) if (S.activities.some(a => a.badgeId === b.id)) await this.syncActivityProgress(b.id);
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

  // ---- Asistencia
  attendanceOn(date) { return S.attendance.find(a => a.date === date); },
  async _saveAttendance(date, records, note) {
    V.date(date, { field: 'date', label: 'Fecha', required: true });
    const cur = this.attendanceOn(date);
    if (!Object.keys(records).length) { if (cur) { await DB.del('attendance', cur.id); await this.reload(); } return; }
    const o = V.attendance({ id: cur?.id || this.section + '_' + date, section: this.section, date, records,
      note: note ?? cur?.note ?? '', createdAt: cur?.createdAt || Date.now() }, V.context(S.scouts, S.badges));
    await DB.put('attendance', o); await this.reload();
  },
  async setAttendance(date, sid, val) {
    if (!this.scout(sid)) throw new V.ValidationError('records', 'Caminante inexistente');
    const rec = { ...(this.attendanceOn(date)?.records || {}) };
    if (val) rec[sid] = val; else delete rec[sid];
    await this._saveAttendance(date, rec);
  },
  async setAttendanceAll(date, val) {
    const rec = {}; if (val) S.scouts.forEach(s => { rec[s.id] = val; });
    await this._saveAttendance(date, rec);
  },
  async deleteAttendance(date) { await this._saveAttendance(date, {}); },
  attendanceStats(sid, { from, to } = {}) {
    let P = 0, A = 0, J = 0;
    for (const a of S.attendance) {
      if ((from && a.date < from) || (to && a.date > to)) continue;
      const v = a.records[sid]; if (v === 'P') P++; else if (v === 'A') A++; else if (v === 'J') J++;
    }
    const total = P + A + J;
    return { P, A, J, total, pct: pct(P, total) };
  },

  // ---- Labor social (horas de servicio por Caminante/Scout, con evidencia y certificado)
  serviceFor(sid, { from, to } = {}) { return S.service.filter(r => r.scoutIds.includes(sid) && (!from || r.date >= from) && (!to || r.date <= to)); },
  serviceHours(sid, range) { return Math.round(this.serviceFor(sid, range).reduce((n, r) => n + r.hours, 0) * 100) / 100; },
  async saveService(input, { evidenceFiles = [], removeEvidence = [], certFile = null, removeCert = false } = {}) {
    const a = V.service(input, V.context(S.scouts, S.badges));
    const prev = a.id ? S.service.find(x => x.id === a.id) : null;
    if (a.id && !prev) throw new V.ValidationError('id', 'Registro inexistente');
    if (prev && a.evidenceIds.some(p => !prev.evidenceIds.includes(p))) throw new V.ValidationError('evidence', 'Evidencia no válida');
    if (removeEvidence.some(p => !prev?.evidenceIds.includes(p))) throw new V.ValidationError('evidence', 'Evidencia no válida');
    if (a.evidenceIds.length + evidenceFiles.length > 6) throw new V.ValidationError('evidence', 'Máximo 6 fotos de evidencia por registro');
    for (const f of evidenceFiles) await V.image(f); // se valida todo antes de escribir nada
    const certKind = certFile ? await V.certificate(certFile) : '';
    if (!a.id) { a.id = uid(); a.createdAt = Date.now(); }
    for (const pid of removeEvidence) await DB.del('photos', pid);
    a.evidenceIds = a.evidenceIds.filter(x => !removeEvidence.includes(x));
    for (const f of evidenceFiles) { const pid = uid(); await DB.put('photos', { id: pid, blob: await resizeImage(f) }); a.evidenceIds.push(pid); }
    const oldCert = prev?.certificateId || '';
    if (certFile) {
      const cid = uid();
      await DB.put('photos', { id: cid, blob: certKind === 'pdf' ? certFile : await resizeImage(certFile, 1600, 0.85) });
      if (oldCert) await DB.del('photos', oldCert);
      a.certificateId = cid; a.certKind = certKind;
    } else if (removeCert && oldCert) { await DB.del('photos', oldCert); a.certificateId = ''; a.certKind = ''; }
    else { a.certificateId = oldCert; a.certKind = prev?.certKind || ''; }
    await DB.put('service', a); await this.reload();
    await this.syncServiceProgress();
    return a;
  },
  async deleteService(id) {
    const r = S.service.find(x => x.id === id);
    if (!r) return;
    for (const pid of [...r.evidenceIds, r.certificateId].filter(Boolean)) await DB.del('photos', pid);
    await DB.del('service', id); await this.reload();
    await this.syncServiceProgress();
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
      scouts: ALL.scouts, badges: ALL.badges, completions: ALL.completions, activities: ALL.activities, specifics: ALL.specifics, attendance: ALL.attendance, service: ALL.service,
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
      try { photos.push({ id: p.id, blob: blob.type === 'application/pdf' ? blob : await resizeImage(blob) }); } catch { throw new V.ValidationError('file', 'Una de las fotos no se pudo leer como imagen'); }
    }
    for (const s of ['scouts', 'badges', 'completions', 'activities', 'photos', 'specifics', 'attendance', 'service']) await DB.clear(s);
    for (const s of ['scouts', 'badges', 'completions', 'activities', 'specifics', 'attendance', 'service']) for (const o of d[s] || []) await DB.put(s, o);
    for (const p of photos) await DB.put('photos', p);
    this._urls.clear();
    await this.reload();
  },
};
