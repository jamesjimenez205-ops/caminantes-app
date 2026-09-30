// Validación estricta de entradas. Se aplica en el almacén de datos (Store), así que protege
// cualquier camino: formularios, filtros y restauración de respaldos.
// Capas: 1) normalización Unicode (NFKC) y caracteres de control/invisibles fuera,
//        2) lista blanca de caracteres, 3) lista negra de patrones de código/comandos,
//        4) tipo, longitud y rango por campo, 5) referencias a ids existentes.
// La defensa principal contra XSS sigue siendo esc() al pintar y la política CSP.
const V = (() => {
  class ValidationError extends Error {
    constructor(field, message) { super(message); this.name = 'ValidationError'; this.field = field; }
  }
  const fail = (field, message) => { throw new ValidationError(field, message); };

  const ALLOWED_CHAR = /^[\p{L}\p{M}\p{N}\p{Zs}\n.,;:!?¡¿()\[\]'"’‘“”«»%+\-–—\/&#@_*=°ºª~…$•·‣▪●○→←✓✗\p{Extended_Pictographic}️‍]$/u;
  const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f​‌‎‏‪-‮⁠-⁩﻿]/;
  const SUSPICIOUS = [
    /(javascript|vbscript|livescript)\s*:/i,
    /data\s*:\s*[\w.+-]+\/[\w.+-]+/i,
    /\bon[a-z]{3,20}\s*=/i,
    /\b(eval|exec|execute|system|alert|prompt|fromcharcode|settimeout|setinterval|atob|btoa)\s*\(/i,
    /\b(document|window|localstorage|sessionstorage|indexeddb|fetch|xmlhttprequest|innerhtml|outerhtml)\s*[.\[(]/i,
    /\b(union\s+select|drop\s+(table|database)|insert\s+into|delete\s+from|truncate\s+table|select\s+.+\s+from)\b/i,
    /;\s*--|\/\*|\*\//,
    /\$\(|\$\{|`|&&|\|\|/,
    /(^|[\s;&|])(rm\s+-|sudo\b|chmod\b|chown\b|powershell\b|cmd(\.exe)?\b|bash\b|curl\s|wget\s|netcat\b|nc\s+-|format\s+c:)/i,
    /\.\.[\\/]/,
    /%(3c|3e|00|22|27)/i,
    /&(#x?[0-9a-f]+|[a-z][a-z0-9]{1,10});/i,
    /\\(u[0-9a-f]{4}|x[0-9a-f]{2}|0)/i,
  ];

  // Texto libre. opts: { field, label, min, max, multiline, required }
  function text(v, { field, label = 'Este campo', min = 0, max = 200, multiline = false, required = false } = {}) {
    if (v == null) v = '';
    if (typeof v !== 'string') fail(field, `${label}: valor no válido`);
    if (v.length > max * 4 + 50) fail(field, `${label}: demasiado largo (máximo ${max} caracteres)`);
    let s = v.normalize('NFKC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
    if (!multiline) s = s.replace(/\n+/g, ' ');
    s = s.split('\n').map(l => l.replace(/ {2,}/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (CONTROL.test(s)) fail(field, `${label}: contiene caracteres de control o invisibles`);
    for (const ch of s) if (!ALLOWED_CHAR.test(ch)) fail(field, `${label}: no se permite el carácter «${ch}»`);
    if (SUSPICIOUS.some(r => r.test(s))) fail(field, `${label}: contiene algo que parece código o un comando, y no se permite`);
    if (s.length > max) fail(field, `${label}: máximo ${max} caracteres`);
    if ((required || min) && s.length < Math.max(min, 1)) fail(field, `${label}: ${min > 1 ? `mínimo ${min} caracteres` : 'es obligatorio'}`);
    return s;
  }

  const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}0-9 .'’\-]*$/u;
  function personName(v, field = 'name', label = 'Nombre') {
    const s = text(v, { field, label, min: 2, max: 60, required: true });
    if (!NAME_RE.test(s)) fail(field, `${label}: solo letras, números, espacios, punto, apóstrofo y guion`);
    return s;
  }

  const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
  function id(v, field = 'id', label = 'Identificador') {
    if (typeof v !== 'string' || !ID_RE.test(v)) fail(field, `${label} no válido`);
    return v;
  }
  const optId = (v, field) => (v == null || v === '' ? null : id(v, field));

  function date(v, { field = 'date', label = 'Fecha', required = false, min = '2000-01-01', max } = {}) {
    if (v == null || v === '') { if (required) fail(field, `${label}: es obligatoria`); return ''; }
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(field, `${label}: formato no válido`);
    const d = new Date(v + 'T00:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) fail(field, `${label}: no es una fecha real`);
    const limit = max || new Date(Date.now() + 366 * 864e5).toISOString().slice(0, 10);
    if (v < min || v > limit) fail(field, `${label}: fuera de rango permitido`);
    return v;
  }
  const birth = v => date(v, { field: 'birthdate', label: 'Fecha de nacimiento', min: '1990-01-01', max: new Date().toISOString().slice(0, 10) });

  function int(v, { field, label, min = 0, max = 100 }) {
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) fail(field, `${label}: número entero entre ${min} y ${max}`);
    return n;
  }
  const color = (v, field = 'color') => { if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) fail(field, 'Color no válido'); return v.toLowerCase(); };
  const icon = (v, field = 'icon') => { if (typeof v !== 'string' || !Object.hasOwn(ICONS, v)) fail(field, 'Ícono no válido'); return v; };
  const arr = (v, max, field, label) => { if (!Array.isArray(v) || v.length > max) fail(field, `${label}: lista no válida (máximo ${max})`); return v; };
  const unique = a => [...new Set(a)];
  const sec = v => { const s = v ?? Store.section; if (typeof s !== 'string' || !Object.hasOwn(SECTIONS, s)) fail('section', 'Sección no válida'); return s; };
  const obj = (v, field, label = 'Datos') => { if (v == null || typeof v !== 'object' || Array.isArray(v)) fail(field, `${label}: formato no válido`); return v; };

  // ---- Entidades
  function scout(o) {
    obj(o, 'name', 'Caminante');
    const stages = {};
    for (const st of SECTIONS[sec(o.section)].stages) stages[st.k] = o.stages?.[st.k] ? date(o.stages[st.k], { field: 'stage', label: `Fecha de ${st.name}`, required: true }) : null;
    const h = o.honor || {}, checks = {}, steps = {};
    for (const k of ['proyectos', 'progresion', 'participacion', 'impacto']) checks[k] = h.checks?.[k] === true;
    for (const st of HONOR_STEPS) steps[st.k] = h.steps?.[st.k] ? date(h.steps[st.k], { field: 'step', label: 'Fecha del paso', required: true }) : null;
    return {
      id: optId(o.id, 'id') || undefined, section: sec(o.section), photoId: optId(o.photoId, 'photo') || '', name: personName(o.name), birthdate: birth(o.birthdate),
      notes: text(o.notes, { field: 'notes', label: 'Notas', max: 500, multiline: true }),
      createdAt: Number.isFinite(o.createdAt) ? o.createdAt : undefined,
      stages, honor: { checks, proyectoPct: int(h.proyectoPct ?? 0, { field: 'proyectoPct', label: 'Porcentaje del proyecto' }), steps },
    };
  }

  const REQ_MAX = 500, REQ_COUNT = 30;
  function reqLines(v, field = 'reqs') {
    if (v == null) v = '';
    if (typeof v !== 'string' || v.length > REQ_COUNT * REQ_MAX * 2) fail(field, 'Requisitos: texto demasiado largo');
    const lines = v.split(/\r\n?|\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > REQ_COUNT) fail(field, `Requisitos: máximo ${REQ_COUNT} (escribiste ${lines.length})`);
    return lines.map((l, i) => text(l, { field, label: `Requisito ${i + 1}`, max: REQ_MAX, required: true }));
  }
  // Ruta de una imagen incluida en el proyecto (solo assets/…), nunca una URL externa
  function badgeImage(v) {
    if (v == null || v === '') return '';
    if (typeof v !== 'string' || !/^assets\/[a-z0-9\/_-]{1,80}\.(png|webp|jpg)$/.test(v)) fail('image', 'Imagen de insignia no válida');
    return v;
  }
  function badgeGroup(o) {
    const keys = SECTIONS[sec(o.section)].groups.map(g => g.k);
    const g = o.group == null || o.group === '' ? keys[0] : o.group;
    if (!keys.includes(g)) fail('group', 'Tipo de insignia no válido');
    return g;
  }
  function badge(o) {
    obj(o, 'name', 'Insignia');
    const reqs = arr(o.requirements, 30, 'reqs', 'Requisitos').map(r => ({ id: id(r?.id, 'reqs'), text: text(r?.text, { field: 'reqs', label: 'Requisito', min: 1, max: REQ_MAX, required: true }) }));
    if (unique(reqs.map(r => r.id)).length !== reqs.length) fail('reqs', 'Requisitos repetidos');
    return {
      id: id(o.id), section: sec(o.section), group: badgeGroup(o), order: int(o.order, { field: 'order', label: 'Orden', min: 1, max: 99 }),
      name: text(o.name, { field: 'name', label: 'Nombre', min: 2, max: 60, required: true }),
      description: text(o.description, { field: 'description', label: 'Descripción', max: 300 }),
      color: color(o.color), icon: icon(o.icon), requirements: reqs, image: badgeImage(o.image), photoId: optId(o.photoId, 'photo') || '',
      reqVersion: o.reqVersion == null ? 0 : int(o.reqVersion, { field: 'reqVersion', label: 'Versión', min: 0, max: 99 }),
    };
  }
  function specific(o, ctx) {
    obj(o, 'name', 'Competencia');
    const out = {
      id: optId(o.id, 'id') || undefined, section: sec(o.section), scoutId: id(o.scoutId, 'scout', 'Caminante'), badgeId: id(o.badgeId, 'badge', 'Área'),
      name: text(o.name, { field: 'name', label: 'Competencia', min: 2, max: 100, required: true }),
      ente: text(o.ente, { field: 'ente', label: 'Ente certificador', max: 150 }), date: date(o.date, { label: 'Fecha del certificado' }),
    };
    if (ctx) { if (!ctx.scouts.has(out.scoutId)) fail('scout', 'Caminante inexistente'); if (!ctx.badges.has(out.badgeId)) fail('badge', 'Área inexistente'); }
    return out;
  }
  function activity(o, ctx) {
    obj(o, 'desc', 'Actividad');
    const out = {
      id: optId(o.id, 'id') || undefined, section: sec(o.section), date: date(o.date, { field: 'date', label: 'Fecha', required: true }),
      badgeId: id(o.badgeId, 'badge', 'Insignia'),
      reqIds: unique(arr(o.reqIds ?? [], 30, 'reqs', 'Requisitos').map(x => id(x, 'reqs'))),
      scoutIds: unique(arr(o.scoutIds ?? [], 200, 'people', 'Participantes').map(x => id(x, 'people'))),
      title: text(o.title, { field: 'title', label: 'Nombre de la actividad', min: 2, max: 80, required: true }),
      description: text(o.description, { field: 'desc', label: 'Descripción', max: 2000, multiline: true }),
      photoIds: unique(arr(o.photoIds ?? [], 20, 'files', 'Fotos').map(x => id(x, 'files'))),
      createdAt: Number.isFinite(o.createdAt) ? o.createdAt : undefined,
    };
    if (ctx) {
      const b = ctx.badgeMap.get(out.badgeId);
      if (!b) fail('badge', 'Insignia inexistente');
      if (out.reqIds.some(r => !b.has(r))) fail('reqs', 'Requisito que no pertenece a la insignia');
      if (out.scoutIds.some(s => !ctx.scouts.has(s))) fail('people', 'Participante inexistente');
    }
    return out;
  }
  // Labor social: un registro puede tener varios participantes; las horas son POR participante.
  function hoursVal(v) {
    const n = typeof v === 'string' ? Number(v.trim().replace(',', '.')) : v;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0.25 || n > 24) fail('hours', 'Horas: entre 0.25 y 24');
    if (Math.abs(n * 4 - Math.round(n * 4)) > 1e-9) fail('hours', 'Horas: usa múltiplos de 0.25 (15 minutos)');
    return n;
  }
  function service(o, ctx) {
    obj(o, 'place', 'Labor social');
    const scoutIds = unique(arr(o.scoutIds ?? [], 200, 'people', 'Participantes').map(x => id(x, 'people', 'Participante')));
    if (!scoutIds.length) fail('people', 'Elige al menos un participante');
    const kind = o.certKind || '';
    if (!['', 'image', 'pdf'].includes(kind)) fail('cert', 'Tipo de certificado no válido');
    const out = {
      id: optId(o.id, 'id') || undefined, section: sec(o.section), scoutIds,
      date: date(o.date, { field: 'date', label: 'Fecha', required: true }), hours: hoursVal(o.hours),
      place: text(o.place, { field: 'place', label: 'Lugar', min: 2, max: 100, required: true }),
      description: text(o.description, { field: 'description', label: 'Descripción', max: 1000, multiline: true }),
      evidenceIds: unique(arr(o.evidenceIds ?? [], 6, 'evidence', 'Evidencia').map(x => id(x, 'evidence', 'Evidencia'))),
      certificateId: optId(o.certificateId, 'cert') || '', certKind: kind,
      createdAt: Number.isFinite(o.createdAt) ? o.createdAt : undefined,
    };
    if (out.certificateId && !out.certKind) fail('cert', 'Falta el tipo de certificado');
    if (ctx && scoutIds.some(s => !ctx.scouts.has(s))) fail('people', 'Participante inexistente');
    return out;
  }
  // Certificado: imagen o PDF (el PDF debe caber en un documento de la nube: máx. 680 KB)
  const PDF_MAX = 680 * 1024;
  async function certificate(file) {
    const nm = String(file?.name || 'archivo').slice(0, 40);
    if (!(file instanceof Blob)) fail('cert', 'Archivo no válido');
    const h = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) { // %PDF
      if (file.type !== 'application/pdf') fail('cert', `«${nm}»: tipo de archivo no válido`);
      if (file.size > PDF_MAX) fail('cert', `«${nm}»: el PDF pesa más de 680 KB. Comprímelo o sube una foto del certificado.`);
      return 'pdf';
    }
    try { await image(file); } catch (e) { if (e instanceof ValidationError) fail('cert', `«${nm}»: sube una imagen (JPG, PNG o WebP) o un PDF válido`); throw e; }
    return 'image';
  }

  // Asistencia de una reunión: un documento por fecha; records = { idCaminante: 'P' | 'A' | 'J' }
  function attendance(o, ctx) {
    obj(o, 'date', 'Asistencia');
    const records = {};
    for (const [sid, v] of Object.entries(obj(o.records ?? {}, 'records', 'Asistencia'))) {
      if (['__proto__', 'constructor', 'prototype'].includes(sid)) fail('records', 'Caminante no válido');
      id(sid, 'records', 'Caminante');
      if (!['P', 'A', 'J'].includes(v)) fail('records', 'Estado de asistencia no válido');
      records[sid] = v;
    }
    if (Object.keys(records).length > 300) fail('records', 'Demasiados registros');
    if (ctx && Object.keys(records).some(s => !ctx.scouts.has(s))) fail('records', 'Caminante inexistente');
    return {
      id: id(o.id), section: sec(o.section), date: date(o.date, { field: 'date', label: 'Fecha', required: true }), records,
      note: text(o.note, { field: 'note', label: 'Nota', max: 120 }), createdAt: Number.isFinite(o.createdAt) ? o.createdAt : Date.now(),
    };
  }
  function completion(o, ctx) {
    obj(o, 'completion', 'Avance');
    const c = { id: id(o.id), scoutId: id(o.scoutId), badgeId: id(o.badgeId), reqId: id(o.reqId), activityId: optId(o.activityId, 'activityId'), date: date(o.date, { label: 'Fecha' }) };
    if (!ctx.scouts.has(c.scoutId) || !ctx.badgeMap.get(c.badgeId)?.has(c.reqId)) fail('completion', 'Avance con referencias inexistentes');
    return c;
  }
  const context = (scouts, badges) => ({
    scouts: new Set(scouts.map(s => s.id)),
    badges: new Set(badges.map(b => b.id)),
    badgeMap: new Map(badges.map(b => [b.id, new Set(b.requirements.map(r => r.id))])),
  });

  // ---- Imágenes: tipo, tamaño, firma real del archivo y decodificación
  const MIME_OK = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const magicOf = h => (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff ? 'image/jpeg'
    : h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47 ? 'image/png'
    : h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50 ? 'image/webp'
    : h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 ? 'application/pdf' : '');
  async function image(file, maxBytes = 15 * 1024 * 1024) {
    const nm = String(file?.name || 'archivo').slice(0, 40);
    if (!(file instanceof Blob)) fail('files', 'Archivo no válido');
    if (file.size === 0 || file.size > maxBytes) fail('files', `«${nm}»: tamaño no permitido (máximo ${Math.round(maxBytes / 1048576)} MB)`);
    const real = magicOf(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    if (!MIME_OK.has(file.type) || !real || real !== file.type) fail('files', `«${nm}»: solo se aceptan imágenes JPG, PNG o WebP reales`);
    try {
      const bmp = await createImageBitmap(file);
      const px = bmp.width * bmp.height; bmp.close?.();
      if (px > 80e6) fail('files', `«${nm}»: la imagen es demasiado grande`);
    } catch (e) { if (e instanceof ValidationError) throw e; fail('files', `«${nm}»: no se pudo leer como imagen`); }
    return file;
  }

  // ---- Respaldo completo: reconstruye todo con lista blanca de campos
  const LIMITS = { service: 4000, attendance: 3000, scouts: 500, badges: 30, completions: 30000, activities: 6000, specifics: 3000, photos: 3000 };
  const PHOTO_RE = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/;
  function backup(d) {
    obj(d, 'file', 'Archivo de respaldo');
    for (const k of Object.keys(LIMITS)) if (d[k] !== undefined) arr(d[k], LIMITS[k], 'file', `Respaldo (${k})`);
    if (!Array.isArray(d.scouts) || !Array.isArray(d.badges) || !Array.isArray(d.activities)) fail('file', 'Respaldo incompleto');
    const scouts = d.scouts.map(scout);
    const badges = d.badges.map(badge);
    if (!scouts.every(s => s.id) || unique(scouts.map(s => s.id)).length !== scouts.length) fail('file', 'Caminantes con ids inválidos o repetidos');
    if (unique(badges.map(b => b.id)).length !== badges.length) fail('file', 'Insignias repetidas');
    const ctx = context(scouts, badges);
    const specifics = (d.specifics || []).map(o => specific(o, ctx));
    if (!specifics.every(s => s.id)) fail('file', 'Competencias sin id');
    // respaldos anteriores no traían nombre de actividad: se toma del inicio de la descripción
    const activities = d.activities.map(o => activity({ ...o, title: o.title || String(o.description || '').slice(0, 60) || 'Actividad' }, ctx));
    if (!activities.every(a => a.id && a.createdAt)) fail('file', 'Actividades sin id o fecha de creación');
    const completions = (d.completions || []).map(o => completion(o, ctx));
    const photos = arr(d.photos || [], LIMITS.photos, 'file', 'Fotos').map(p => {
      obj(p, 'file', 'Foto');
      const m = typeof p.data === 'string' && p.data.length < 40e6 ? PHOTO_RE.exec(p.data) : null;
      if (!m) fail('file', 'Foto con formato no permitido');
      const head = Uint8Array.from(atob(m[2].slice(0, 16)), c => c.charCodeAt(0));
      if (magicOf(head) !== m[1]) fail('file', 'Foto cuyo contenido no coincide con su tipo');
      return { id: id(p.id), data: p.data };
    });
    const have = new Set(photos.map(p => p.id));
    activities.forEach(a => { a.photoIds = a.photoIds.filter(x => have.has(x)); });
    [...scouts, ...badges].forEach(o => { if (o.photoId && !have.has(o.photoId)) o.photoId = ''; });
    const attendanceList = (d.attendance ? arr(d.attendance, LIMITS.attendance, 'file', 'Asistencia') : []).map(o => attendance(o, ctx));
    const serviceList = (d.service ? arr(d.service, LIMITS.service, 'file', 'Labor social') : []).map(o => service(o, ctx));
    serviceList.forEach(r => { r.evidenceIds = r.evidenceIds.filter(x => have.has(x)); if (r.certificateId && !have.has(r.certificateId)) { r.certificateId = ''; r.certKind = ''; } });
    return { scouts, badges, specifics, activities, completions, photos, attendance: attendanceList, service: serviceList };
  }

  // ---- Acceso
  function email(v) {
    if (typeof v !== 'string' || v.length > 120 || !/^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,60}\.[A-Za-z]{2,24}$/.test(v.trim())) fail('u', 'Correo no válido');
    return v.trim().toLowerCase();
  }
  function login(u, p) {
    if (typeof u !== 'string' || !/^[A-Za-z0-9._-]{1,32}$/.test(u.trim())) fail('u', 'Usuario no válido');
    if (typeof p !== 'string' || p.length < 1 || p.length > 128) fail('p', 'Contraseña no válida');
    return [u.trim().toLowerCase(), p];
  }

  return { ValidationError, text, personName, id, optId, date, int, color, icon, scout, badge, specific, activity, completion, reqLines, image, backup, context, login, email, attendance, service, certificate, LIMITS };
})();

// Muestra un error de validación sobre el campo correspondiente del formulario. Devuelve true si era de validación.
function showValidation(root, err) {
  if (!(err instanceof V.ValidationError)) return false;
  toast(err.message, 'err');
  const el = root?.querySelector?.(`[name="${err.field}"]`);
  if (el) {
    const box = el.closest('.field') || el.parentElement;
    let msg = box.querySelector('.field-err');
    if (!msg) { msg = document.createElement('p'); msg.className = 'field-err'; msg.setAttribute('role', 'alert'); box.appendChild(msg); }
    msg.textContent = err.message;
    el.setCustomValidity(err.message); el.reportValidity(); el.focus();
    el.addEventListener('input', () => { el.setCustomValidity(''); msg.remove(); }, { once: true });
  }
  return true;
}
