const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

// Tarjeta de actividad (usada en Inicio, Actividades y perfil)
function activityCard(a) {
  const b = Store.badge(a.badgeId);
  const issues = Store.issues(a);
  const people = a.scoutIds.map(Store.scout).filter(Boolean);
  return `<article class="act-card" data-act="view-activity" data-id="${a.id}" tabindex="0">
    <div class="cover">${a.photoIds[0] ? `<img data-photo="${a.photoIds[0]}" alt="">` : `<div class="cover-empty">${icon('camera')}<span>Sin fotografías</span></div>`}
      ${a.photoIds.length > 1 ? `<span class="count">${icon('camera')} ${a.photoIds.length}</span>` : ''}</div>
    <div class="body">
      <div class="meta"><span>${fmtDate(a.date)}</span>${b ? `<span class="chip" style="--c:${b.color}">${esc(b.name)}</span>` : ''}<span class="num">Actividad n.º ${Store.actNumber(a)}</span></div>
      <h3 class="act-title">${esc(a.title || (a.description || '').slice(0, 60) || 'Actividad')}</h3>
      <p class="desc">${esc(a.description) || '<em>Sin descripción</em>'}</p>
      <div class="foot">
        <span class="avatars">${people.slice(0, 5).map(s => avatar(s.name, 'sm')).join('')}${people.length > 5 ? `<span class="avatar sm more">+${people.length - 5}</span>` : ''}</span>
        ${issues.length ? `<span class="warn">${icon('alert')} ${plural(issues.length, 'pendiente', 'pendientes')}</span>` : ''}
      </div>
    </div></article>`;
}

Views.inicio = {
  render() {
    const ov = Store.overall(), { inProg, done } = Store.pairCounts();
    const recent = S.activities.slice(0, 3);
    return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">${greeting()}${Sec().motto ? ' · ' + esc(Sec().motto) : ''}</p>
        <h1>${esc(Sec().name)}</h1>
        <p>${S.activities.length ? `${plural(S.activities.length, 'actividad registrada', 'actividades registradas')}. ` : ''}Registra lo que hicieron hoy y el progreso se actualiza solo.</p>
        <button class="btn accent big" data-act="new-activity">${icon('plus')} Registrar actividad</button>
      </div>
      ${heroArt()}
      ${Sec().logo ? `<img class="hero-logo" src="${Sec().logo}" alt="Insignia de la sección">` : ''}
    </section>

    <section class="stats">
      <div class="stat"><span class="stat-ic">${icon('users')}</span><b>${S.scouts.length}</b><span>Caminantes</span></div>
      <div class="stat"><span class="stat-ic prog">${icon('compass')}</span><b>${inProg}</b><span>Insignias en progreso</span></div>
      <div class="stat"><span class="stat-ic done">${icon('check')}</span><b>${done}</b><span>Insignias completadas</span></div>
      <div class="stat wide"><span>Progreso general</span><b>${ov.pct}%</b>${bar(ov.pct)}<small>${ov.done} de ${ov.total} requisitos</small></div>
    </section>


    <div class="cols">
      <section>
        <div class="sec-head"><h2>Actividades recientes</h2><a href="#/actividades" class="link">Ver todas</a></div>
        ${recent.length ? `<div class="stack">${recent.map(activityCard).join('')}</div>`
          : emptyState('Aún no hay actividades', 'Cuando registres la primera, aparecerá aquí con sus fotos.', `<button class="btn primary" data-act="new-activity">${icon('plus')} Registrar actividad</button>`)}
      </section>
      <section>
        <div class="sec-head"><h2>Insignias del grupo</h2><a href="#/insignias" class="link">Ver requisitos</a></div>
        <div class="card list">${S.badges.map(b => { const p = Store.groupBadgeProgress(b.id); return `<a class="row" href="#/insignias/${b.id}">${patch(b, 'sm')}<span class="grow"><b>${esc(b.name)}</b>${bar(p.pct)}</span><span class="pct">${p.pct}%</span></a>`; }).join('')}</div>
        ${!S.scouts.length ? `<div class="card note">${icon('users')}<span>Empieza <a href="#/caminantes">agregando a los Caminantes</a>.</span></div>` : ''}
      </section>
    </div>`;
  },
};
