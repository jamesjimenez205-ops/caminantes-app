// Insignia de Máximo Logro: Condecoración Istmeña
Changes['honor-check'] = el => patchScout(el.dataset.scout, s => { s.honor = Store.honorOf(s); s.honor.checks[el.dataset.key] = el.checked; });
Changes['honor-pct'] = el => patchScout(el.dataset.scout, s => { s.honor = Store.honorOf(s); s.honor.proyectoPct = V.int(el.value === '' ? 0 : el.value, { field: 'proyectoPct', label: 'Porcentaje del proyecto' }); });
Changes['honor-step'] = el => patchScout(el.dataset.scout, s => { s.honor = Store.honorOf(s); s.honor.steps[el.dataset.key] = el.checked ? today() : null; });
Changes['honor-step-date'] = el => el.value && patchScout(el.dataset.scout, s => { s.honor = Store.honorOf(s); s.honor.steps[el.dataset.key] = el.value; });

Views['maximo-logro'] = {
  render() {
    if (Sec().id === 'unidad') return this.unit();
    return `
    <div class="page-head"><div><h1>Máximo logro</h1><p class="sub">Condecoración Istmeña · Comunidad de Caminantes</p></div></div>
    <section class="card honor-intro">
      <span class="patch lg" style="--c:#1c4a9a">${icon('compass')}</span>
      <div><p>Insignia celeste con la rosa de los vientos en azul y el istmo de Panamá con la insignia nacional, con letras amarillas «Scouts de Panamá, Condecoración Istmeña».</p>
      <p class="muted">El comité de comunidad revisa periódicamente el trabajo de los integrantes y solicita el otorgamiento cuando se cumplen los criterios y se demuestra el esfuerzo por vivir la Ley y la Promesa Scout.</p></div>
    </section>
    ${S.scouts.length ? S.scouts.map(s => this.scoutCard(s)).join('')
      : emptyState('Sin Caminantes', 'Agrega Caminantes para seguir sus criterios de máximo logro.', '<a class="btn primary" href="#/caminantes">Ir a Caminantes</a>')}`;
  },

  // Unidad: Scout Balboa. Los requisitos los define el grupo (se editan como los de cualquier insignia).
  unit() {
    const b = S.maximo[0];
    if (!b) return emptyState('Sin datos', 'Recarga la página para crear el máximo logro de la sección.');
    return `
    <div class="page-head"><div><h1>Máximo logro</h1><p class="sub">${esc(Sec().honorName)} · ${esc(Sec().name)}</p></div>
      <button class="btn" data-act="edit-badge" data-id="${b.id}">${icon('edit')} Editar requisitos</button></div>
    <section class="card honor-intro" style="--c:${b.color}">
      ${patch(b, 'lg')}
      <div><p>${esc(Sec().honorIntro)}</p>
      <p class="muted">${b.requirements.length ? `${plural(b.requirements.length, 'requisito', 'requisitos')}. Marca el avance de cada Scout y registra la fecha de entrega.` : 'Todavía no tiene requisitos: agrégalos con «Editar requisitos» (uno o varios).'}</p></div>
    </section>
    ${S.scouts.length ? S.scouts.map(s => this.unitCard(s, b)).join('')
      : emptyState(`Sin ${Sec().people}`, `Agrega ${Sec().people} para seguir su avance hacia ${b.name}.`, `<a class="btn primary" href="#/caminantes">Ir a ${esc(Sec().people)}</a>`)}`;
  },

  unitCard(s, b) {
    const p = Store.badgeProgress(s.id, b.id), entrega = Store.honorOf(s).steps.entrega;
    return `<section class="card honor-card">
      <header>${avatar(s, 'lg')}<div class="grow"><h3><a href="#/caminantes/${s.id}">${esc(s.name)}</a></h3><small class="muted">${b.requirements.length ? `${p.done} de ${p.total} requisitos` : 'Sin requisitos definidos'}${Store.stageOf(s) ? ' · Etapa ' + esc(Store.stageOf(s)) : ''}</small>${bar(p.pct)}</div>
        ${entrega ? '<span class="tag done">Entregado</span>' : p.total && p.pct >= 100 ? '<span class="tag prog">Listo para entregar</span>' : '<span class="tag pend">En camino</span>'}</header>
      ${b.requirements.length ? reqChecklist(s.id, b) : ''}
      <div class="steps"><div class="step-row"><label class="check"><input type="checkbox" data-change="honor-step" data-scout="${s.id}" data-key="entrega" ${entrega ? 'checked' : ''}><span class="box">${icon('check')}</span></label>
        <span class="grow">Entrega de ${esc(b.name)}</span>${entrega ? `<input type="date" class="mini-date" data-change="honor-step-date" data-scout="${s.id}" data-key="entrega" value="${esc(entrega)}">` : ''}</div></div>
    </section>`;
  },

  scoutCard(s) {
    const h = Store.honorOf(s), met = Store.honorMet(s), id = s.id;
    const n = Object.values(met).filter(Boolean).length, p = pct(n, HONOR_CRITERIA.length);
    const areas = Store.areasReached(id);
    const ready = n === HONOR_CRITERIA.length;
    return `<section class="card honor-card">
      <header>${avatar(s, 'lg')}<div class="grow"><h3><a href="#/caminantes/${id}">${esc(s.name)}</a></h3><small class="muted">${n} de ${HONOR_CRITERIA.length} criterios${Store.stageOf(s) ? ' · Etapa ' + Store.stageOf(s) : ''}</small>${bar(p)}</div>
        ${h.steps.entrega ? '<span class="tag done">Condecorado</span>' : ready ? '<span class="tag prog">Listo para solicitar</span>' : '<span class="tag pend">En camino</span>'}</header>
      <div class="honor-cols">
        <div><h4>Criterios</h4><ul class="checklist">${HONOR_CRITERIA.map(c => {
          if (c.auto) return `<li><span class="static ${met[c.k] ? 'ok' : ''}"><span class="box">${icon('check')}</span><span class="txt">${c.t}<small class="muted"><br>Automático (área completa o con competencia específica): ${areas.length} ${areas.length === 1 ? 'área' : 'áreas'}${areas.length ? ' (' + areas.map(a => esc(a.name)).join(', ') + ')' : ''}</small></span></span></li>`;
          if (c.pct) return `<li><span class="static ${met[c.k] ? 'ok' : ''}"><span class="box">${icon('check')}</span><span class="txt">${c.t}</span></span><label class="pct-in"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-change="honor-pct" data-scout="${id}" value="${h.proyectoPct || 0}"> %</label></li>`;
          return `<li><label><input type="checkbox" data-change="honor-check" data-scout="${id}" data-key="${c.k}" ${met[c.k] ? 'checked' : ''}><span class="box">${icon('check')}</span><span class="txt">${c.t}</span></label></li>`;
        }).join('')}</ul></div>
        <div><h4>Procedimiento de otorgamiento</h4><ol class="steps">${HONOR_STEPS.map(st => { const d = h.steps[st.k]; return `<li class="${d ? 'on' : ''}">
          <label class="check"><input type="checkbox" data-change="honor-step" data-scout="${id}" data-key="${st.k}" ${d ? 'checked' : ''}><span class="box">${icon('check')}</span></label>
          <span class="grow">${st.t}</span>${d ? `<input type="date" class="mini-date" data-change="honor-step-date" data-scout="${id}" data-key="${st.k}" value="${d}">` : ''}</li>`; }).join('')}</ol></div>
      </div></section>`;
  },
};
