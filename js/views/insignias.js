Changes['pick-scout'] = el => { UIState.badgeScout = el.value; rerender(); };

const normTxt = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Buscador: filtra las tarjetas en pantalla sin volver a dibujar (no pierde el cursor)
Inputs['badge-q'] = el => {
  const q = normTxt(el.value.trim());
  $$('.badge-card').forEach(c => { c.hidden = !!q && !normTxt(c.dataset.name).includes(q); });
  $$('.group-block').forEach(g => { g.hidden = !!q && !$$('.badge-card:not([hidden])', g).length; });
};

const groupOf = b => (Sec().groups.find(g => g.k === b.group) || Sec().groups[0]);

function badgeCard(b) {
  const p = Store.groupBadgeProgress(b.id);
  return `<a class="card badge-card" href="#/insignias/${b.id}" style="--c:${b.color}" data-name="${esc(b.name)}">
    <div class="badge-top">${patch(b, 'lg')}<svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40V26l30-16 25 14 35-22 40 26 30-14 40 18v8z" fill="rgba(255,255,255,.14)"/></svg></div>
    <div class="badge-info"><h3>${esc(b.name)}</h3>${b.description ? `<p class="muted">${esc(b.description)}</p>` : ''}
    ${bar(p.pct)}<span class="row-between"><small>${b.requirements.length ? plural(b.requirements.length, 'requisito', 'requisitos') : 'Sin requisitos aún'}</small><small>${p.pct}% del grupo</small></span></div></a>`;
}

Views.insignias = {
  render(id) {
    if (id && Store.badge(id)) return this.detail(id);
    const many = S.badges.length > 8;
    return `
    <div class="page-head"><div><h1>Insignias</h1><p class="sub">${esc(Sec().short)} · ${plural(S.badges.length, 'insignia', 'insignias')}</p></div>
      <button class="btn primary" data-act="new-badge">${icon('plus')} Agregar insignia</button></div>
    ${many ? `<div class="search"><input type="search" data-input="badge-q" placeholder="Buscar insignia…" maxlength="60" aria-label="Buscar insignia" autocomplete="off"></div>` : ''}
    ${Sec().groups.map(g => {
      const list = S.badges.filter(b => groupOf(b).k === g.k);
      if (!list.length && !many && Sec().groups.length === 1) return '';
      return `<section class="group-block"><div class="sec-head"><h2>${esc(g.name)} <small class="muted">(${list.length})</small></h2></div>
        ${list.length ? `<div class="grid badges4">${list.map(badgeCard).join('')}</div>` : `<p class="muted">Aún no hay ${esc(g.name.toLowerCase())}. Usa «Agregar insignia» para crearlas.</p>`}</section>`;
    }).join('')}`;
  },

  detail(id) {
    const b = Store.badge(id);
    if (!UIState.badgeScout || !Store.scout(UIState.badgeScout)) UIState.badgeScout = S.scouts[0]?.id || '';
    const sid = UIState.badgeScout;
    const p = sid ? Store.badgeProgress(sid, id) : null;
    return `
    <a href="#/insignias" class="back">${icon('back')} Insignias</a>
    <section class="card badge-head" style="--c:${b.color}">
      ${patch(b, 'lg')}<div class="grow"><small class="muted">${esc(groupOf(b).one)}</small><h1>${esc(b.name)}</h1>${b.description ? `<p class="muted">${esc(b.description)}</p>` : ''}</div>
      <button class="btn" data-act="edit-badge" data-id="${id}">${icon('edit')} Editar</button>
    </section>
    ${!b.requirements.length ? `<div class="card note">${icon('alert')}<span>Esta insignia aún no tiene requisitos. <a href="#" data-act="edit-badge" data-id="${id}">Agrégalos aquí</a>.</span></div>`
      : S.scouts.length ? `
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
    </section>` : `<div class="card note">${icon('users')}<span>Agrega <a href="#/caminantes">${esc(Sec().people)}</a> para marcar sus requisitos.</span></div>`}`;
  },
};

Actions['new-badge'] = () => badgeForm();
Actions['edit-badge'] = d => badgeForm(d.id);

function badgeForm(id) {
  const b = id ? Store.badge(id) : { name: '', description: '', group: Sec().groups[0].k, requirements: [] };
  if (!b) return;
  const groups = Sec().groups;
  openModal(`<form id="badgeform">
    <header class="modal-head"><h2>${id ? 'Editar insignia' : 'Nueva insignia'}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field"><label class="lbl" for="bn">Nombre</label><input id="bn" name="name" value="${esc(b.name)}" required maxlength="60" autocomplete="off"></div>
      ${groups.length > 1 ? `<div class="field"><label class="lbl" for="bg">Tipo</label><select id="bg" name="group">${groups.map(g => `<option value="${g.k}" ${groupOf(b).k === g.k ? 'selected' : ''}>${esc(g.one)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label class="lbl" for="bd">Descripción <small>(opcional)</small></label><input id="bd" name="description" value="${esc(b.description)}" maxlength="300" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="br">Requisitos <small>(uno por línea; puede quedar vacío y agregarse después)</small></label>
        <textarea id="br" name="reqs" rows="9" maxlength="6000" placeholder="Escribe un requisito por línea">${esc(b.requirements.map(r => r.text).join('\n'))}</textarea>
        ${id ? '<small class="muted">Si ya hay avances marcados, evita reordenar las líneas: el avance sigue a la posición de cada requisito.</small>' : ''}</div>
    </div>
    <footer class="modal-foot">${id ? `<button type="button" class="btn danger left" id="delbadge">${icon('trash')} Eliminar</button>` : ''}
      <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary">Guardar</button></footer></form>`, {
    onMount: m => {
      $('#badgeform', m).addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        const data = { name: f.get('name'), description: f.get('description'), group: f.get('group') || groupOf(b).k };
        try {
          if (id) await Store.saveBadge({ id, ...data }, f.get('reqs'));
          else { const nb = await Store.createBadge(data, f.get('reqs')); location.hash = '#/insignias/' + nb.id; }
          closeModal(); toast(id ? 'Insignia actualizada' : 'Insignia creada'); rerender();
        } catch (err) { if (!showValidation(e.target, err)) throw err; }
      });
      $('#delbadge', m)?.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar la insignia «${b.name}»? Se borrará también el progreso marcado en ella.`)) return;
        try { await Store.deleteBadge(id); closeModal(); toast('Insignia eliminada'); location.hash = '#/insignias'; rerender(); }
        catch (err) { if (!showValidation($('#badgeform', m), err)) throw err; }
      });
    },
  });
}
