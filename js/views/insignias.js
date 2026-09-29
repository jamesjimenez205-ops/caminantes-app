Changes['pick-scout'] = el => { UIState.badgeScout = el.value; rerender(); };

Views.insignias = {
  render(id) {
    if (id && Store.badge(id)) return this.detail(id);
    return `
    <div class="page-head"><div><h1>Insignias</h1><p class="sub">Las 5 áreas de competencia y sus requisitos</p></div></div>
    <div class="grid badges4">${S.badges.map(b => {
      const p = Store.groupBadgeProgress(b.id);
      return `<a class="card badge-card" href="#/insignias/${b.id}" style="--c:${b.color}">
        <div class="badge-top">${patch(b, 'lg')}<svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40V26l30-16 25 14 35-22 40 26 30-14 40 18v8z" fill="rgba(255,255,255,.14)"/></svg></div>
        <div class="badge-info"><h3>${esc(b.name)}</h3><p class="muted">${esc(b.description)}</p>
        ${bar(p.pct)}<span class="row-between"><small>${plural(b.requirements.length, 'requisito', 'requisitos')}</small><small>${p.pct}% del grupo</small></span></div></a>`;
    }).join('')}</div>`;
  },

  detail(id) {
    const b = Store.badge(id);
    if (!UIState.badgeScout || !Store.scout(UIState.badgeScout)) UIState.badgeScout = S.scouts[0]?.id || '';
    const sid = UIState.badgeScout;
    const p = sid ? Store.badgeProgress(sid, id) : null;
    return `
    <a href="#/insignias" class="back">${icon('back')} Insignias</a>
    <section class="card badge-head" style="--c:${b.color}">
      ${patch(b, 'lg')}<div class="grow"><h1>${esc(b.name)}</h1><p class="muted">${esc(b.description)}</p></div>
      <button class="btn" data-act="edit-badge" data-id="${id}">${icon('edit')} Editar</button>
    </section>
    ${S.scouts.length ? `
    <section class="card">
      <div class="picker"><label for="ps">Marcar requisitos de:</label>
        <select id="ps" data-change="pick-scout">${S.scouts.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <span class="grow"></span>${tag(p.pct)}</div>
      ${bar(p.pct)}<small class="muted">${p.done} de ${p.total} requisitos completados</small>
      <ul class="checklist big">${b.requirements.map(r => {
        const n = S.scouts.filter(s => Store.isDone(s.id, r.id)).length;
        return `<li><label><input type="checkbox" data-change="toggle-req" data-scout="${sid}" data-badge="${id}" data-req="${r.id}" ${Store.isDone(sid, r.id) ? 'checked' : ''}>
          <span class="box">${icon('check')}</span><span class="txt">${esc(r.text)}</span><small class="who">${n}/${S.scouts.length}</small></label></li>`;
      }).join('')}</ul>
    </section>` : `<div class="card note">${icon('users')}<span>Agrega <a href="#/caminantes">Caminantes</a> para marcar sus requisitos.</span></div>`}`;
  },
};

Actions['edit-badge'] = d => {
  const b = Store.badge(d.id);
  if (!b) return;
  openModal(`<form id="badgeform">
    <header class="modal-head"><h2>Editar insignia</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field"><label class="lbl" for="bn">Nombre</label><input id="bn" name="name" value="${esc(b.name)}" required maxlength="60" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="bd">Descripción</label><input id="bd" name="description" value="${esc(b.description)}" maxlength="300" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="br">Requisitos <small>(uno por línea)</small></label>
        <textarea id="br" name="reqs" rows="9" maxlength="6000">${esc(b.requirements.map(r => r.text).join('\n'))}</textarea>
        <small class="muted">Si ya hay avances marcados, evita reordenar las líneas: el avance sigue a la posición de cada requisito.</small></div>
    </div>
    <footer class="modal-foot"><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary">Guardar</button></footer></form>`, {
    onMount: m => $('#badgeform', m).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await Store.saveBadge({ id: b.id, name: f.get('name'), description: f.get('description') }, f.get('reqs'));
        closeModal(); toast('Insignia actualizada'); rerender();
      } catch (err) { if (!showValidation(e.target, err)) throw err; }
    }),
  });
};
