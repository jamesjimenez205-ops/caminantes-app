// Progreso: resumen general, avance por insignia y por Caminante/Scout.
// Con varios tipos de insignia (Unidad) se separa en pestañas: Destrezas y Segmentos.
const progGroups = () => Sec().groups.filter(g => !g.hidden);
const progTabs = () => [...progGroups()].reverse(); // Destrezas primero, luego Segmentos
const progBadgesOf = g => S.badges.filter(b => (b.group || progGroups()[0].k) === g.k);
const progSum = (sid, list) => Store._sum(list.filter(b => Store.inPlan(sid, b)).map(b => [sid, b.id]));

// Cuántas insignias (por joven) están completas / en progreso, y el avance ponderado por requisitos
function progStats(list) {
  // solo cuentan las insignias del plan de cada joven (las destrezas que eligió o ya trabaja)
  const pairs = S.scouts.flatMap(s => list.filter(b => Store.inPlan(s.id, b)).map(b => [s.id, b.id]));
  let done = 0, prog = 0;
  for (const [sid, bid] of pairs) {
    const p = Store.badgeProgress(sid, bid);
    if (p.total && p.pct >= 100) done++; else if (p.pct > 0) prog++;
  }
  return { ...Store._sum(pairs), insigniasCompletas: done, insigniasEnProgreso: prog, elegidas: pairs.length, jovenes: new Set(pairs.map(p => p[0])).size };
}

const progStat = (icono, valor, texto, cls = '') => `<div class="stat"><span class="stat-ic ${cls}">${icon(icono)}</span><b>${valor}</b><span>${texto}</span></div>`;
const progWide = (titulo, st) => `<div class="stat wide"><span>${titulo}</span><b>${st.pct}%</b>${bar(st.pct)}<small>${st.done} de ${st.total} requisitos</small></div>`;

// Datos extra por joven: labor social y asistencia
const progExtras = s => {
  const a = Store.attendanceStats(s.id), h = Store.serviceHours(s.id);
  return `<span class="chip-mini">${icon('heart')} ${fmtHours(h)}</span><span class="chip-mini">${icon('clipboard')} ${a.total ? a.pct + '% asistencia' : 'sin asistencia'}</span>`;
};

// Un joven: tarjeta desplegable con sus insignias del tipo
function progScoutFold(s, list) {
  const st = progSum(s.id, list);
  const rows = list.filter(b => Store.inPlan(s.id, b)).map(b => [b, Store.badgeProgress(s.id, b.id)]);
  const doneN = rows.filter(([, p]) => p.total && p.pct >= 100).length, progN = rows.filter(([, p]) => p.pct > 0 && p.pct < 100).length;
  const shown = rows.sort((x, y) => y[1].pct - x[1].pct);
  return `<details class="fold scout-fold" data-scout="${s.id}" ${UIState.openScouts.has(s.id) ? 'open' : ''}>
    <summary>${avatar(s, 'sm')}<b class="grow">${esc(s.name)}</b>
      <span class="sum-stats"><span>${list.some(b => Store.isOptional(b)) ? rows.length + (rows.length === 1 ? ' elegida' : ' elegidas') : rows.length + ' áreas'}</span><span>${doneN} completadas</span><span>${progN} en progreso</span></span><span class="sum-bar">${bar(st.pct)}</span><b class="sum-pct">${st.pct}%</b></summary>
    <div class="fold-body">
      <div class="extras">${Store.stageOf(s) ? `<span class="chip-mini">${icon('compass')} ${esc(Store.stageOf(s))}</span>` : ''}${progExtras(s)} <a class="link" href="#/caminantes/${s.id}">Ver perfil</a>${list.some(b => Store.isOptional(b)) ? ` <button class="link" data-act="pick-destrezas" data-scout="${s.id}">Elegir destrezas</button>` : ''}</div>
      ${shown.length ? `<div class="card list">${shown.map(([b, p]) => `<a class="row" href="#/insignias/${b.id}">${patch(b, 'sm')}<span class="grow"><b>${esc(b.name)}</b>${bar(p.pct)}</span><span class="pct">${p.total ? `${p.done}/${p.total}` : '—'}</span></a>`).join('')}</div>`
        : `<p class="muted">Todavía no tiene ${esc(list.some(b => Store.isOptional(b)) ? 'destrezas elegidas' : 'insignias')}.${list.some(b => Store.isOptional(b)) ? ` <button class="link" data-act="pick-destrezas" data-scout="${s.id}">Elegir destrezas</button>` : ''}</p>`}
    </div></details>`;
}

// Insignias con más avance del grupo
function progBadgeList(list) {
  const opt = list.some(b => Store.isOptional(b));
  const all = list.map(b => [b, Store.groupBadgeProgress(b.id), Store.workers(b.id).length]);
  // destrezas: solo las que algún joven eligió o trabaja (nadie tiene que ganarlas todas)
  const withProg = all.filter(([, p, n]) => (opt ? n > 0 : p.pct > 0)).sort((x, y) => y[1].pct - x[1].pct || y[2] - x[2]);
  const base = UIState.progAll ? all.sort((x, y) => y[1].pct - x[1].pct || x[0].name.localeCompare(y[0].name, 'es')) : withProg.slice(0, 12);
  if (!base.length) return `<p class="muted">${list.length ? (opt ? `Ningún ${esc(Sec().person)} ha elegido destrezas todavía: elígelas desde su perfil o desde cada destreza.` : 'Todavía no hay avances en este tipo.') : 'Aún no hay insignias de este tipo.'}</p>`;
  return `<div class="card list">${base.map(([b, p, n]) => `<a class="row" href="#/insignias/${b.id}">${patch(b, 'sm')}<span class="grow"><b>${esc(b.name)}</b>${bar(p.pct)}${opt ? `<small class="muted">${n ? plural(n, Sec().person, Sec().people) + ' la ' + (n === 1 ? 'trabaja' : 'trabajan') : 'Nadie la ha elegido'}</small>` : ''}</span><span class="pct">${n || !opt ? p.pct + '%' : '—'}</span></a>`).join('')}</div>
    ${list.length > 12 || UIState.progAll ? `<p><button class="link" data-act="prog-all">${UIState.progAll ? 'Mostrar solo las que tienen avance' : `Ver las ${list.length} insignias`}</button></p>` : ''}`;
}

Actions['prog-tab'] = d => { UIState.progGroup = d.group; rerender(); };
Actions['prog-all'] = () => { UIState.progAll = !UIState.progAll; rerender(); };
// recuerda qué jóvenes están desplegados
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d?.matches?.('details.scout-fold')) { if (d.open) UIState.openScouts.add(d.dataset.scout); else UIState.openScouts.delete(d.dataset.scout); }
}, true);

Views.progreso = {
  render() {
    if (!S.scouts.length) return `<div class="page-head"><div><h1>Progreso</h1><p class="sub">Avance individual y del grupo</p></div></div>`
      + emptyState(`Sin ${Sec().people}`, `Agrega ${Sec().people} para ver su progreso aquí.`, `<a class="btn primary" href="#/caminantes">Ir a ${esc(Sec().people)}</a>`);
    const all = progStats(S.badges), horas = Math.round(S.scouts.reduce((n, s) => n + Store.serviceHours(s.id), 0) * 100) / 100;
    const head = `
    <div class="page-head"><div><h1>Progreso</h1><p class="sub">Avance individual y del grupo · ${esc(Sec().short)}</p></div></div>
    <section class="stats stats-row3">
      ${progStat('award', all.insigniasCompletas, 'Insignias completadas', 'done')}
      ${progStat('compass', all.insigniasEnProgreso, 'Insignias en progreso', 'prog')}
      ${progStat('heart', fmtHours(horas), 'Labor social del grupo')}
      ${progWide('Progreso general', all)}
    </section>`;
    return head + (progGroups().length > 1 ? this.byType() : this.single());
  },

  // Una sola lista de insignias (Caminantes): avance por área y detalle desplegable por Caminante
  single() {
    const rows = S.badges.map(b => [b, Store.groupBadgeProgress(b.id)]).sort((x, y) => y[1].pct - x[1].pct);
    const alcanzadas = S.scouts.filter(s => Store.areasReached(s.id).length === S.badges.length && S.badges.length).length;
    return `
    <div class="sec-head"><h2>Avance por área de competencia</h2><small class="muted">Promedio del grupo</small></div>
    <section class="card overall-card"><div class="badge-bars wide-bars">${rows.map(([b, p]) => `<div class="bb"><a href="#/insignias/${b.id}">${patch(b, 'sm')}</a><span class="grow"><span class="row-between"><b>${esc(b.name)}</b><small>${p.done} de ${p.total} requisitos · ${p.pct}%</small></span>${bar(p.pct)}<small class="muted">${plural(S.scouts.filter(s => Store.badgeProgress(s.id, b.id).pct >= 100).length, 'completada', 'completadas')} por ${plural(S.scouts.filter(s => Store.badgeProgress(s.id, b.id).pct >= 100).length, Sec().person, Sec().people)}</small></span></div>`).join('')}</div></section>
    <div class="sec-head"><h2>Por ${esc(Sec().person)}</h2><small class="muted">${alcanzadas ? plural(alcanzadas, 'con todas las áreas', 'con todas las áreas') + ' · ' : ''}Toca un nombre para ver el detalle</small></div>
    <div class="stack-tight">${[...S.scouts].sort((x, y) => Store.scoutProgress(y.id).pct - Store.scoutProgress(x.id).pct).map(s => progScoutFold(s, S.badges)).join('')}</div>`;
  },

  // Varios tipos (Unidad): pestañas Destrezas / Segmentos, cada una con su propio resumen
  byType() {
    const tabs = progTabs();
    const g = tabs.find(x => x.k === UIState.progGroup) || tabs[0];
    const list = progBadgesOf(g), st = progStats(list);
    return `
    <div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" aria-selected="${t.k === g.k}" class="tab ${t.k === g.k ? 'on' : ''}" data-act="prog-tab" data-group="${t.k}">${esc(t.name)} <small>${progBadgesOf(t).length}</small></button>`).join('')}</div>
    <section class="stats stats-3">
      ${progStat('award', st.insigniasCompletas, `${esc(g.name)} completadas`, 'done')}
      ${progStat('compass', st.insigniasEnProgreso, `${esc(g.name)} en progreso`, 'prog')}
      ${g.optional ? `<div class="stat wide"><span>Progreso en las ${esc(g.name.toLowerCase())} elegidas</span><b>${st.pct}%</b>${bar(st.pct)}<small>${st.done} de ${st.total} requisitos · ${plural(st.elegidas, 'elegida', 'elegidas')} por ${plural(st.jovenes, Sec().person, Sec().people)} (no se ganan todas: cada joven elige las suyas)</small></div>` : progWide(`Progreso en ${esc(g.name.toLowerCase())}`, st)}
    </section>
    <div class="sec-head"><h2>${esc(g.name)} con más avance</h2><a class="link" href="#/insignias/${g.k}">Ver todas</a></div>
    ${progBadgeList(list)}
    <div class="sec-head"><h2>Por ${esc(Sec().person)}</h2><small class="muted">Toca un nombre para ver el detalle</small></div>
    <div class="stack-tight">${S.scouts.map(s => progScoutFold(s, list)).join('')}</div>`;
  },
};
