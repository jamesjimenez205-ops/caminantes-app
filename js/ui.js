// Utilidades de interfaz: iconos, ilustraciones, barras, modal, toast.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4 2 4 5"/>',
  award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',
  camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v5M12 17.5v.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  save: '<path d="M4 8h16v12H4zM3 4h18v4H3z"/><path d="M10 13h4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  tent: '<path d="M2.5 20 12 4l9.5 16z"/><path d="M12 20l-3.5 0 3.5-7 3.5 7"/>',
  pine: '<path d="M12 3 7 10h3l-4 6h5v5h2v-5h5l-4-6h3z"/>',
  mountain: '<path d="M2 20 9 7l4 7 3-4 6 10z"/>',
  fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

// Parche de insignia: círculo con "costura" punteada
const patch = (b, cls = '') => `<span class="patch ${cls}" style="--c:${b.color}">${icon(b.icon)}</span>`;

const AV_COLORS = ['#1f7a34', '#b8860b', '#c62828', '#33383f', '#43a047'];
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const avatar = (name, cls = '') => {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<span class="avatar ${cls}" style="background:${AV_COLORS[h % AV_COLORS.length]}" title="${esc(name)}">${esc(initials(name))}</span>`;
};

const bar = p => `<div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i class="${statusOf(p)}" style="width:${p}%"></i></div>`;
const phaseOf = n => (n >= 3 ? 2 : n >= 1 ? 1 : 0);
const phaseChip = n => `<span class="phase p${phaseOf(n)}">${['Sin fase', 'Fase 1', 'Fase 2'][phaseOf(n)]}</span>`;
const tag = p => `<span class="tag ${statusOf(p)}">${STATUS_LABEL[statusOf(p)]}</span>`;

const fmtDate = (d, long) => new Date(d + 'T00:00:00').toLocaleDateString('es', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
const ageOf = d => { if (!d) return ''; const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a + ' años'; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function pineSvg(x, y, s, fill) {
  return `<g fill="${fill}" transform="translate(${x} ${y}) scale(${s})"><path d="M0-34-9-16h5l-7 14h6L-12 12h24L5-2h6L4-16h5z"/><rect x="-1.5" y="12" width="3" height="6"/></g>`;
}
const heroArt = () => `<svg class="hero-art" viewBox="0 0 560 240" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
  <path d="M0 240V150l70-70 60 60 80-100 90 110 60-50 90 90 70-40 40 40v50z" fill="#3f9a52" opacity=".6"/>
  <path d="M0 240V185l90-62 70 50 100-80 100 90 80-40 120 60v40z" fill="#1d6a30"/>
  ${pineSvg(330, 215, 1.3, '#0c2a16')}${pineSvg(365, 222, 1, '#0c2a16')}${pineSvg(410, 218, 1.5, '#0c2a16')}${pineSvg(470, 224, 1.1, '#0c2a16')}${pineSvg(520, 220, 1.4, '#0c2a16')}
  <path d="M0 240v-22c60-8 120 4 180 0s130-10 380 4v18z" fill="#183424"/>
</svg>`;
const emptyArt = () => `<svg class="empty-art" viewBox="0 0 160 100" aria-hidden="true"><path d="M0 100 45 40l25 30 30-45 60 75z" fill="#d9e6cf"/><path d="M20 100 80 30l60 70z" fill="#bcd5ae"/><path d="M62 100l18-34 18 34z" fill="#1f7a34"/><path d="M80 66v34" stroke="#f4eedd" stroke-width="2"/>${pineSvg(22, 92, .8, '#43a047')}${pineSvg(140, 94, .7, '#43a047')}</svg>`;

// ---- Fotos (se cargan desde IndexedDB al pintar)
function hydratePhotos(root = document) {
  $$('img[data-photo]', root).forEach(async img => { img.src = await Store.photoUrl(img.dataset.photo); });
}

// ---- Modal / toast
function openModal(html, { wide = false, onMount } = {}) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="scrim"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  $('.scrim', root).addEventListener('mousedown', e => { if (e.target.classList.contains('scrim')) closeModal(); });
  document.body.classList.add('noscroll');
  const m = $('.modal', root);
  hydratePhotos(m);
  onMount && onMount(m);
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

let toastTimer;
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ''), 3200);
}

function download(blobOrText, name, type = 'application/json') {
  const blob = blobOrText instanceof Blob ? blobOrText : new Blob([blobOrText], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const emptyState = (title, text, btn = '') => `<div class="empty">${emptyArt()}<h3>${esc(title)}</h3><p>${esc(text)}</p>${btn}</div>`;

// Vistas y manejadores globales (los definen los archivos de views/)
const Views = {}, Actions = {}, Changes = {};
const UIState = { actFilter: '', badgeScout: '', report: { from: '', to: '', scoutId: '', badgeId: '', photos: true, progress: true } };
