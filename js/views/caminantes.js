// Lista de requisitos con checkbox para un Caminante e insignia
function reqChecklist(sid, b) {
  return `<ul class="checklist">${b.requirements.map(r => `<li><label>
    <input type="checkbox" data-change="toggle-req" data-scout="${sid}" data-badge="${b.id}" data-req="${r.id}" ${Store.isDone(sid, r.id) ? 'checked' : ''}>
    <span class="box">${icon('check')}</span><span class="txt">${esc(r.text)}</span></label></li>`).join('')}</ul>`;
}

Changes['toggle-req'] = async el => { await Store.toggleReq(el.dataset.scout, el.dataset.badge, el.dataset.req); rerender(); };

// Con muchas insignias (Unidad) el perfil muestra solo las que tienen avance
const profileBadges = sid => (S.badges.length <= 8 ? S.badges : S.badges.filter(b => Store.badgeProgress(sid, b.id).done > 0));

Views.caminantes = {
  render(id) {
    if (id) return this.profile(id);
    return `
    <div class="page-head"><div><h1>${esc(Sec().people)}</h1><p class="sub">${plural(S.scouts.length, 'joven', 'jóvenes')} en ${esc(Sec().short)}</p></div>
      <button class="btn primary" data-act="new-scout">${icon('plus')} Agregar ${esc(Sec().person)}</button></div>
    ${S.scouts.length ? `<div class="grid scouts">${S.scouts.map(s => {
      const p = Store.scoutProgress(s.id);
      const acts = S.activities.filter(a => a.scoutIds.includes(s.id)).length;
      const doneB = S.badges.filter(b => Store.badgeProgress(s.id, b.id).pct >= 100).length;
      return `<a class="card scout-card" href="#/caminantes/${s.id}">${avatar(s.name, 'lg')}<b class="name">${esc(s.name)}</b>${Sec().features.stages && Store.stageOf(s) ? `<span class="phase p1">Etapa ${Store.stageOf(s)}</span>` : ''}
        <span class="muted">${[ageOf(s.birthdate), plural(acts, 'actividad', 'actividades')].filter(Boolean).join(' · ')}</span>
        ${bar(p.pct)}<span class="row-between"><small>${p.pct}% general</small><small>${S.badges.length > 8 ? plural(doneB, 'insignia completada', 'insignias completadas') : `${doneB}/${S.badges.length} insignias`}</small></span></a>`;
    }).join('')}</div>` : emptyState(`Aún no hay ${Sec().people}`, 'Agrega a cada joven para poder asignarle actividades e insignias.', `<button class="btn primary" data-act="new-scout">${icon('plus')} Agregar ${esc(Sec().person)}</button>`)}`;
  },

  profile(id) {
    const s = Store.scout(id);
    if (!s) return emptyState(`${Sec().person} no encontrado`, '', '<a class="btn" href="#/caminantes">Volver</a>');
    const p = Store.scoutProgress(id);
    const acts = S.activities.filter(a => a.scoutIds.includes(id));
    return `
    <a href="#/caminantes" class="back">${icon('back')} ${esc(Sec().people)}</a>
    <section class="profile-head card">
      ${avatar(s.name, 'xl')}
      <div class="grow"><h1>${esc(s.name)}</h1><p class="muted">${[ageOf(s.birthdate), s.birthdate ? 'Nac. ' + fmtDate(s.birthdate) : ''].filter(Boolean).join(' · ')}</p>
        ${s.notes ? `<p class="notes">${esc(s.notes)}</p>` : ''}
        <div class="overall"><span>Progreso general <b>${p.pct}%</b></span>${bar(p.pct)}</div></div>
      <div class="actions"><button class="btn" data-act="edit-scout" data-id="${id}">${icon('edit')} Editar</button></div>
    </section>

    ${Sec().features.stages ? `<div class="sec-head"><h2>Etapa de progresión</h2></div>
    <section class="card"><ol class="stages">${Sec().stages.map(st => { const d = s.stages?.[st.k]; return `<li class="${d ? 'on' : ''}">
      <label class="check"><input type="checkbox" data-change="stage-toggle" data-scout="${id}" data-key="${st.k}" ${d ? 'checked' : ''}><span class="box">${icon('check')}</span></label>
      <div class="grow"><b>${st.name}</b> <small class="muted">${st.age}</small><p class="muted">${st.desc}</p></div>
      ${d ? `<label class="stage-date"><small>Insignia entregada</small><input type="date" data-change="stage-date" data-scout="${id}" data-key="${st.k}" value="${d}"></label>` : '<small class="muted">Pendiente</small>'}</li>`; }).join('')}</ol></section>` : ''}

    <div class="sec-head"><h2>${Sec().id === 'caminantes' ? 'Insignias de competencias' : 'Insignias'}</h2></div>
    ${S.badges.length > 8 ? `<p class="muted">Aquí se muestran las insignias con avance. Para marcar requisitos de otra, entra a <a href="#/insignias">Insignias</a>.</p>${!profileBadges(id).length ? '<p class="muted"><em>Todavía no tiene avances.</em></p>' : ''}` : ''}
    <div class="grid badges2">${profileBadges(id).map(b => { const bp = Store.badgeProgress(id, b.id); return `
      <section class="card badge-block">
        <header>${patch(b)}<div class="grow"><h3>${esc(b.name)}</h3><small class="muted">${bp.done} de ${bp.total} requisitos</small></div>${tag(bp.pct)}</header>
        ${bar(bp.pct)}${reqChecklist(id, b)}
      </section>`; }).join('')}</div>

    ${Sec().features.specifics ? `<div class="sec-head"><h2>Competencias específicas</h2><button class="btn" data-act="add-specific" data-scout="${id}">${icon('plus')} Agregar</button></div>
    <p class="muted">Certificadas por un ente externo al movimiento scout; se acreditan dentro de un área de competencia.</p>
    ${S.specifics.filter(c => c.scoutId === id).length ? `<div class="card list">${S.specifics.filter(c => c.scoutId === id).map(c => { const b = Store.badge(c.badgeId); return `<div class="row"><span class="grow"><b>${esc(c.name)}</b><br><small class="muted">${esc(c.ente || 'Sin ente indicado')}${c.date ? ' · ' + fmtDate(c.date) : ''}</small></span>${b ? `<span class="chip" style="--c:${b.color}">${esc(b.name)}</span>` : ''}<button class="icon-btn" data-act="del-specific" data-id="${c.id}" aria-label="Quitar">${icon('trash')}</button></div>`; }).join('')}</div>` : '<p class="muted"><em>Ninguna registrada.</em></p>'}` : ''}

    <div class="sec-head"><h2>Actividades (${acts.length})</h2></div>
    ${acts.length ? `<div class="grid acts">${acts.map(activityCard).join('')}</div>` : '<p class="muted">Todavía no participó en actividades registradas.</p>'}`;
  },
};

Actions['new-scout'] = () => scoutForm();
Actions['edit-scout'] = d => scoutForm(d.id);

function scoutForm(id) {
  const s = id ? Store.scout(id) : { name: '', birthdate: '', notes: '' };
  openModal(`<form id="scoutform">
    <header class="modal-head"><h2>${id ? 'Editar' : 'Nuevo'} ${esc(Sec().person)}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field"><label class="lbl" for="sn">Nombre completo</label><input id="sn" name="name" value="${esc(s.name)}" required autofocus maxlength="60" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="sb">Fecha de nacimiento <small>(opcional)</small></label><input id="sb" type="date" name="birthdate" value="${esc(s.birthdate)}" min="1990-01-01" max="${today()}"></div>
      <div class="field"><label class="lbl" for="so">Notas <small>(opcional)</small></label><textarea id="so" name="notes" rows="3" maxlength="500">${esc(s.notes)}</textarea></div>
    </div>
    <footer class="modal-foot">
      ${id ? `<button type="button" class="btn danger left" id="delscout">${icon('trash')} Eliminar</button>` : ''}
      <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary">Guardar</button>
    </footer></form>`, {
    onMount: m => {
      $('#scoutform', m).addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
          const saved = await Store.saveScout({ ...s, id, name: f.get('name'), birthdate: f.get('birthdate'), notes: f.get('notes') });
          closeModal(); toast(`${Sec().person} guardado`); rerender();
          if (!id) location.hash = '#/caminantes/' + saved.id;
        } catch (err) { if (!showValidation(e.target, err)) throw err; }
      });
      $('#delscout', m)?.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar a ${s.name}? Se borrará su progreso y saldrá de las actividades.`)) return;
        await Store.deleteScout(id); closeModal(); toast(`${Sec().person} eliminado`); location.hash = '#/caminantes'; rerender();
      });
    },
  });
}

async function patchScout(id, fn) {
  try { const s = structuredClone(Store.scout(id)); fn(s); await Store.saveScout(s); }
  catch (err) { if (err instanceof V.ValidationError) toast(err.message, 'err'); else throw err; }
  rerender();
}

Changes['stage-toggle'] = el => patchScout(el.dataset.scout, s => { s.stages = { ...(s.stages || {}), [el.dataset.key]: el.checked ? today() : null }; });
Changes['stage-date'] = el => el.value && patchScout(el.dataset.scout, s => { s.stages[el.dataset.key] = el.value; });

Actions['add-specific'] = d => {
  openModal(`<form id="specform">
    <header class="modal-head"><h2>Competencia específica</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field"><label class="lbl" for="sp">Ejemplos del manual</label><select id="sp"><option value="">— Otra —</option>${SPECIFIC_PRESETS.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="lbl" for="spn">Competencia</label><input id="spn" name="name" required maxlength="100" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="spe">Ente certificador</label><input id="spe" name="ente" maxlength="150" autocomplete="off"></div>
      <div class="field"><label class="lbl" for="spa">Área de competencia</label><select id="spa" name="badge">${S.badges.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="lbl" for="spd">Fecha del certificado</label><input id="spd" type="date" name="date" value="${today()}" min="2000-01-01"></div>
    </div>
    <footer class="modal-foot"><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary">Guardar</button></footer></form>`, {
    onMount: m => {
      $('#sp', m).onchange = e => { const p = SPECIFIC_PRESETS[e.target.value]; if (!p) return; $('#spn', m).value = p.name; $('#spe', m).value = p.ente; $('#spa', m).value = p.area; };
      $('#specform', m).addEventListener('submit', async e => {
        e.preventDefault(); const f = new FormData(e.target);
        try {
          await Store.saveSpecific({ scoutId: d.scout, name: f.get('name'), ente: f.get('ente'), badgeId: f.get('badge'), date: f.get('date') });
          closeModal(); toast('Competencia específica registrada'); rerender();
        } catch (err) { if (!showValidation(e.target, err)) throw err; }
      });
    },
  });
};
Actions['del-specific'] = async d => { if (!S.specifics.some(c => c.id === d.id)) return; if (confirm('¿Quitar esta competencia específica?')) { await Store.deleteSpecific(d.id); rerender(); } };
