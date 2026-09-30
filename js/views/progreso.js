Views.progreso = {
  render() {
    const ov = Store.overall(), many = S.badges.length > 8;
    return `
    <div class="page-head"><div><h1>Progreso</h1><p class="sub">Avance individual y del grupo</p></div></div>
    <section class="card overall-card">
      <div><span class="eyebrow dark">Progreso general del grupo</span><b class="big-pct">${ov.pct}%</b><small class="muted">${ov.done} de ${ov.total} requisitos completados</small></div>
      <div class="badge-bars">${(S.badges.length <= 8 ? S.badges : S.badges.map(b => [b, Store.groupBadgeProgress(b.id).pct]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 8).map(x => x[0])).map(b => { const p = Store.groupBadgeProgress(b.id); return `<div class="bb">${patch(b, 'sm')}<span class="grow"><span class="row-between"><b>${esc(b.name)}</b><small>${p.pct}%</small></span>${bar(p.pct)}</span></div>`; }).join('')}</div>
    </section>
    <div class="sec-head"><h2>Por ${esc(Sec().person)}</h2></div>
    ${S.scouts.length ? `<div class="card table-wrap"><table class="progress-table">
      <thead><tr><th>${esc(Sec().person)}</th>${many ? '<th>En progreso</th><th>Completadas</th>' : S.badges.map(b => `<th><span class="th-b">${patch(b, 'xs')}${esc(b.name)}</span></th>`).join('')}<th>General</th></tr></thead>
      <tbody>${S.scouts.map(s => {
        const p = Store.scoutProgress(s.id);
        return `<tr><td><a class="who-link" href="#/caminantes/${s.id}">${avatar(s.name, 'sm')}${esc(s.name)}</a></td>
          ${many ? `<td>${S.badges.filter(b => { const x = Store.badgeProgress(s.id, b.id).pct; return x > 0 && x < 100; }).length}</td><td>${S.badges.filter(b => Store.badgeProgress(s.id, b.id).pct >= 100).length}</td>`
            : S.badges.map(b => { const bp = Store.badgeProgress(s.id, b.id); return `<td>${bar(bp.pct)}<small>${bp.done}/${bp.total}</small></td>`; }).join('')}
          <td><b>${p.pct}%</b></td></tr>`;
      }).join('')}</tbody></table></div>
      <div class="legend"><span><i class="dot pend"></i>Sin iniciar</span><span><i class="dot prog"></i>En progreso</span><span><i class="dot done"></i>Completada</span></div>`
      : emptyState(`Sin ${Sec().people}`, `Agrega ${Sec().people} para ver su progreso aquí.`, `<a class="btn primary" href="#/caminantes">Ir a ${esc(Sec().people)}</a>`)}`;
  },
};
