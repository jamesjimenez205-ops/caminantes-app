// Router por hash, navegación y acciones delegadas.
const NAV = [
  ['inicio', 'Inicio', 'home'], ['caminantes', '', 'users'], ['insignias', 'Insignias', 'award'],
  ['actividades', 'Actividades', 'calendar'], ['asistencia', 'Asistencia', 'clipboard', 'attendance'], ['laborsocial', 'Labor social', 'heart', 'service'], ['progreso', 'Progreso', 'chart'], ['maximo-logro', 'Máximo logro', 'star', 'honor'], ['reportes', 'Reportes', 'file'],
];

const route = () => { const [name, param] = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/'); return { name: Object.hasOwn(Views, name) ? name : 'inicio', param: /^[A-Za-z0-9_-]{1,40}$/.test(param || '') ? param : undefined }; };

// Secciones con varios tipos de insignia (Unidad): «Insignias» se despliega en una página por tipo.
const navGroups = () => Sec().groups.filter(g => !g.hidden);
function navItem([k, label, ic], active, param) {
  const text = esc(k === 'caminantes' ? Sec().people : label);
  if (k === 'insignias' && navGroups().length > 1) {
    const open = active === 'insignias' || UIState.navInsignias;
    return `<div class="nav-group ${open ? 'open' : ''}"><div class="nav-parent"><a href="#/insignias" class="${active === 'insignias' ? 'on' : ''}">${icon(ic)}<span>${text}</span></a>
      <button type="button" class="nav-toggle" data-act="toggle-insignias" aria-label="Mostrar u ocultar tipos de insignia" aria-expanded="${open}">${icon('back')}</button></div>
      <div class="subnav" ${open ? '' : 'hidden'}>${navGroups().map(g => `<a href="#/insignias/${g.k}" class="${active === 'insignias' && param === g.k ? 'on' : ''}">${esc(g.name)} <small>${S.badges.filter(b => (b.group || navGroups()[0].k) === g.k).length}</small></a>`).join('')}</div></div>`;
  }
  return `<a href="#/${k}" class="${k === active ? 'on' : ''}">${icon(ic)}<span>${text}</span></a>`;
}

function renderNav(active, param) {
  $('#side').innerHTML = `
    <a class="brand" href="#/inicio">
      <img src="${GROUP.logo}" alt="Logo del grupo">
      <span><b>${esc(GROUP.name)}</b><small>${esc(GROUP.tagline)}</small></span></a>
    <button class="btn accent side-new" data-act="new-activity">${icon('plus')} Nueva actividad</button>
    <div class="sections">${Object.values(SECTIONS).map(s => `<button class="sec ${s.id === Store.section ? 'on' : ''}" ${s.enabled ? '' : 'disabled'} data-act="pick-section" data-id="${s.id}">${s.logo ? `<img src="${s.logo}" alt="">` : icon('tent')}<span><b>${esc(s.short)}</b><small>${s.enabled ? esc(s.ages) : 'Próximamente'}</small></span></button>`).join('')}</div>
    <nav>${NAV.filter(n => !n[3] || Sec().features[n[3]]).map(n => navItem(n, active, param)).join('')}</nav>
    <button class="side-foot" data-act="backup">${icon('save')}<span>Respaldo</span></button>
    <button class="side-foot" data-act="logout">${icon('logout')}<span>Cerrar sesión</span></button>
    <svg class="side-art" viewBox="0 0 250 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 90V55l40-30 35 25 45-40 55 45 40-25 35 30v30z" fill="#1a5a2c"/>${pineSvg(30, 88, 1.1, '#0c2a16')}${pineSvg(70, 90, .8, '#0c2a16')}${pineSvg(200, 88, 1.2, '#0c2a16')}${pineSvg(230, 90, .9, '#0c2a16')}</svg>`;
}

function sectionBar() {
  const s = Sec();
  return `<div class="section-bar" style="--c:${s.accent}">${s.logo ? `<img src="${s.logo}" alt="">` : icon('tent')}
    <span class="grow"><small>Sección</small><b>${esc(s.name)}</b></span>
    <button class="btn" data-act="open-sections">${icon('users')} Cambiar sección</button></div>`;
}

function render(keepScroll) {
  const { name, param } = route();
  const y = window.scrollY;
  $('#main').innerHTML = `<div class="page">${sectionBar()}${Views[name].render(param)}</div>`;
  Views[name].mount?.($('#main'), param);
  hydratePhotos($('#main'));
  renderNav(name, param);
  window.scrollTo(0, keepScroll ? y : 0);
}
const rerender = () => render(true);

// Cambios hechos por otra persona (tiempo real): se recarga sin pisar lo que se está escribiendo.
let remoteTimer;
function remoteChange() {
  clearTimeout(remoteTimer); // varios cambios seguidos = una sola recarga
  remoteTimer = setTimeout(() => Store.reload().then(() => {
    const busy = $('#modal-root').innerHTML.trim() || document.activeElement?.matches?.('input,textarea,select');
    if (busy) PENDING_RENDER = true; else render(true);
  }), 250);
}
function cloudError(e) { toast(e?.code === 'permission-denied' ? 'Sin permiso para guardar en la nube' : 'No se pudo sincronizar. Se reintentará al volver la conexión.', 'err'); }
document.addEventListener('focusout', () => setTimeout(() => {
  if (PENDING_RENDER && !$('#modal-root').innerHTML.trim() && !document.activeElement?.matches?.('input,textarea,select')) { PENDING_RENDER = false; render(true); }
}, 150));

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el && Object.hasOwn(Actions, el.dataset.act)) { e.preventDefault(); Actions[el.dataset.act](el.dataset, el); }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.act-card')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el && Object.hasOwn(Inputs, el.dataset.input)) Inputs[el.dataset.input](el);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && Object.hasOwn(Changes, el.dataset.change)) Changes[el.dataset.change](el);
});
window.addEventListener('hashchange', () => render());

Actions['close-modal'] = closeModal;
Actions['toggle-insignias'] = () => { UIState.navInsignias = !(UIState.navInsignias || route().name === 'insignias'); renderNav(route().name, route().param); };
Actions['open-sections'] = () => openModal(`
  <header class="modal-head"><h2>Secciones del grupo</h2><button class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
  <div class="modal-body"><div class="section-cards">${Object.values(SECTIONS).map(s => `
    <button class="section-card ${s.id === Store.section ? 'on' : ''}" style="--c:${s.accent}" ${s.enabled ? '' : 'disabled'} data-act="pick-section" data-id="${s.id}">
      ${s.logo ? `<img src="${s.logo}" alt="">` : `<span class="ph-ic">${icon('tent')}</span>`}
      <b>${esc(s.name)}</b><small>${esc(s.ages)}</small>
      <span class="tag ${s.enabled ? (s.id === Store.section ? 'done' : 'prog') : 'pend'}">${s.enabled ? (s.id === Store.section ? 'Sección actual' : 'Entrar') : 'Próximamente'}</span>
    </button>`).join('')}</div>
    <p class="muted"><small>Cada sección guarda sus propios integrantes, actividades, insignias, asistencia y progreso, separados de las demás.</small></p></div>`);
Actions['pick-section'] = async d => {
  Object.assign(UIState, { actFilter: '', badgeScout: '', attDate: '' }); Object.assign(UIState.report, { scoutId: '', badgeId: '' });
  await Store.setSection(d.id); closeModal(); location.hash = '#/inicio'; render(); };
Actions['logout'] = () => Auth.logout();
Actions['backup'] = () => openModal(`
  <header class="modal-head"><h2>Respaldo de datos</h2><button class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
  <div class="modal-body">
    <p>${CLOUD ? 'Los datos están en la nube y se comparten en tiempo real entre las cuentas autorizadas. Descarga un respaldo de vez en cuando como copia de seguridad.' : 'Los datos viven en este navegador. Descarga un respaldo con regularidad y úsalo para pasar la información al otro dirigente.'}</p>
    <div class="backup-actions">
      <button class="btn primary" id="do-export">${icon('download')} Descargar respaldo</button>
      <label class="btn">${icon('save')} Restaurar respaldo<input type="file" id="do-import" accept="application/json" hidden></label>
    </div>
    <p class="muted"><small>${CLOUD ? 'Restaurar reemplaza los datos compartidos: lo verán así todas las cuentas.' : 'Restaurar reemplaza todo lo que hay ahora en este navegador.'}</small></p>
  </div>`, {
  onMount: m => {
    $('#do-export', m).onclick = async () => { download(await Store.exportAll(), `respaldo-caminantes-${today()}.json`); toast('Respaldo descargado'); };
    $('#do-import', m).onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      if (f.size > 400e6 || !/\.json$/i.test(f.name)) return toast('Elige un archivo de respaldo .json (máximo 400 MB)', 'err');
      if (!confirm(CLOUD ? 'Se reemplazarán TODOS los datos compartidos (para todas las cuentas) por los del archivo. ¿Continuar?' : 'Se reemplazarán TODOS los datos actuales por los del archivo. ¿Continuar?')) return;
      try { await Store.importAll(await f.text()); closeModal(); toast('Datos restaurados'); render(); }
      catch (err) { toast(err instanceof V.ValidationError ? err.message : 'Archivo no válido', 'err'); }
    };
  },
});

Cloud.boot().then(() => Auth.gate()).then(() => Store.init()).then(() => { if (CLOUD) { DB.onChange = remoteChange; Cloud.onError = cloudError; } render(); }).catch(err => {
  console.error(err);
  const denied = err?.code === 'permission-denied';
  $('#main').innerHTML = `<div class="page"><div class="card note">${CLOUD
    ? (denied ? 'Tu cuenta no tiene permiso para ver los datos del grupo. Pide que agreguen tu correo a las reglas de Firestore.' : 'No se pudo conectar con la nube. Revisa tu conexión a internet e intenta de nuevo.')
    : 'No se pudo abrir el almacenamiento del navegador. Si estás en modo privado, usa una ventana normal.'}</div>${CLOUD ? '<p><button class="btn" data-act="logout">Cerrar sesión</button></p>' : ''}</div>`;
});
