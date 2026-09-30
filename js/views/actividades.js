Changes['act-filter'] = el => { UIState.actFilter = el.value; rerender(); };

Views.actividades = {
  render() {
    const list = S.activities.filter(a => !UIState.actFilter || a.badgeId === UIState.actFilter);
    return `
    <div class="page-head"><div><h1>Actividades</h1><p class="sub">${plural(S.activities.length, 'actividad registrada', 'actividades registradas')}</p></div>
      <button class="btn primary" data-act="new-activity">${icon('plus')} Registrar actividad</button></div>
    <div class="filters">
      <label class="pill-select"><span>Insignia</span><select data-change="act-filter"><option value="">Todas</option>${S.badges.map(b => `<option value="${b.id}" ${UIState.actFilter === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
    </div>
    ${list.length ? `<div class="grid acts">${list.map(activityCard).join('')}</div>`
      : emptyState('No hay actividades', UIState.actFilter ? 'Ninguna con esa insignia todavía.' : 'Registra la primera: toma menos de un minuto.', `<button class="btn primary" data-act="new-activity">${icon('plus')} Registrar actividad</button>`)}`;
  },
};

Actions['new-activity'] = () => ActForm.open();
Actions['edit-activity'] = d => ActForm.open(d.id);
Actions['view-activity'] = d => {
  const a = Store.activity(d.id);
  if (!a) return;
  const b = Store.badge(a.badgeId);
  const people = a.scoutIds.map(Store.scout).filter(Boolean);
  const issues = Store.issues(a);
  openModal(`
    <header class="modal-head"><div><p class="eyebrow dark">${fmtDate(a.date, true)} · ${b ? esc(b.name) : ''} · Actividad n.º ${Store.actNumber(a)}</p><h2>${esc(a.title || 'Actividad')}</h2></div><button class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      ${issues.length ? `<div class="alert">${icon('alert')}<span>${issues.map(i => i.t).join(' · ')}</span></div>` : ''}
      <p class="full-desc">${esc(a.description) || '<em>Sin descripción</em>'}</p>
      <h4>Participantes (${people.length})</h4>
      <div class="chips">${people.map(s => `<span class="chip-person">${avatar(s, 'sm')}${esc(s.name)}</span>`).join('') || '<span class="muted">Ninguno</span>'}</div>
      <h4>Fotografías (${a.photoIds.length})</h4>
      ${a.photoIds.length ? `<div class="gallery">${a.photoIds.map(p => `<a class="ph" data-act="lightbox" data-id="${p}"><img data-photo="${p}" alt=""></a>`).join('')}</div>` : '<p class="muted">Aún no hay fotos.</p>'}
    </div>
    <footer class="modal-foot"><button class="btn danger left" data-act="del-activity" data-id="${a.id}">${icon('trash')} Eliminar</button>
      <button class="btn primary" data-act="edit-activity" data-id="${a.id}">${icon('edit')} Editar</button></footer>`, { wide: true });
};
Actions['lightbox'] = d => openModal(`<button class="icon-btn lb-x" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button><img class="lightbox" data-photo="${d.id}" alt="">`, { wide: true });
Actions['del-activity'] = async d => {
  if (!Store.activity(d.id)) return;
  if (!confirm('¿Eliminar esta actividad? Se borrarán sus fotos y el progreso que marcó.')) return;
  await Store.deleteActivity(d.id); closeModal(); toast('Actividad eliminada'); rerender();
};

// ---------- Formulario: insignia → participantes → nombre → qué hicieron → fotos → guardar (el n.º se cuenta solo)
const ActForm = {
  open(id) {
    if (!S.scouts.length) { toast(`Primero agrega al menos un ${Sec().person}`, 'err'); location.hash = '#/caminantes'; return; }
    const ex = id ? Store.activity(id) : null;
    const st = { badgeId: ex?.badgeId || '', scoutIds: new Set(ex?.scoutIds || []), files: [], keep: [...(ex?.photoIds || [])], removed: [] };
    openModal(`<form id="actform" novalidate>
      <header class="modal-head"><h2>${ex ? 'Editar actividad' : 'Nueva actividad'}</h2>
        <label class="date-field">${icon('calendar')}<input type="date" name="date" value="${ex?.date || today()}" required aria-label="Fecha" min="2000-01-01"></label>
        <button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
      <div class="modal-body">
        <div class="field" id="f-badge"><div class="lbl"><b>1</b> Insignia relacionada</div>
          ${S.badges.length > 8
            ? `<select name="badge" required><option value="">Elige una insignia…</option>${Sec().groups.map(g => `<optgroup label="${esc(g.name)}">${S.badges.filter(b => (b.group || Sec().groups[0].k) === g.k).map(b => `<option value="${b.id}" ${st.badgeId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select>`
            : `<div class="badge-pick">${S.badges.map(b => `<label class="pick" style="--c:${b.color}"><input type="radio" name="badge" value="${b.id}" ${st.badgeId === b.id ? 'checked' : ''}><span>${patch(b, 'sm')}<em>${esc(b.name)}</em></span></label>`).join('')}</div>`}</div>
        <div class="field" id="f-people"><div class="lbl"><b>2</b> Participantes <span class="grow"></span><button type="button" class="link" id="p-all">Todos</button><button type="button" class="link" id="p-none">Ninguno</button></div>
          <div class="people-pick">${S.scouts.map(s => `<label class="pp"><input type="checkbox" value="${s.id}" ${st.scoutIds.has(s.id) ? 'checked' : ''}><span>${avatar(s, 'sm')}${esc(s.name)}</span></label>`).join('')}</div></div>
        <div class="field"><label class="lbl" for="at"><b>3</b> Nombre de la actividad <small id="anum"></small></label>
          <input id="at" name="title" maxlength="80" required autocomplete="off" placeholder="Ej.: Taller de robótica" value="${esc(ex?.title || (ex?.description || '').slice(0, 60))}"></div>
        <div class="field"><label class="lbl" for="ad">¿Qué hicieron? <small>(opcional pero recomendado)</small></label>
          <textarea id="ad" name="desc" rows="4" maxlength="2000" placeholder="Ej.: Caminata de 6 km al cerro; usaron brújula para orientar la ruta y armaron el campamento base.">${esc(ex?.description || '')}</textarea></div>
        <div class="field"><div class="lbl"><b>4</b> Fotografías</div>
          <label class="drop">${icon('camera')}<span>Agregar fotos</span><input type="file" id="files" name="files" accept="image/jpeg,image/png,image/webp" multiple hidden></label>
          <div class="thumbs" id="thumbs"></div></div>
      </div>
      <footer class="modal-foot"><span class="hint" id="hint"></span><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary big" id="save">Guardar actividad</button></footer></form>`,
      { wide: true, onMount: m => ActForm.mount(m, st, ex) });
  },

  mount(m, st, ex) {
    const thumbs = $('#thumbs', m), hint = $('#hint', m);

    // «Será la actividad n.° X de esta insignia»: se cuenta sola, por fecha.
    const showNum = () => {
      const el = $('#anum', m), b = Store.badge(st.badgeId);
      if (!b) { el.textContent = ''; return; }
      const date = $('input[name=date]', m).value || today();
      const n = ex && ex.badgeId === st.badgeId ? Store.actNumber(ex)
        : S.activities.filter(x => x.badgeId === st.badgeId && x.date <= date).length + 1;
      el.textContent = `· será la Actividad n.º ${n} de ${b.name}`;
    };
    const renderThumbs = () => {
      thumbs.innerHTML = st.keep.map(id => `<div class="th"><img data-photo="${id}" alt=""><button type="button" data-keep="${id}" aria-label="Quitar foto">${icon('x')}</button></div>`).join('')
        + st.files.map((f, i) => `<div class="th"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-new="${i}" aria-label="Quitar foto">${icon('x')}</button></div>`).join('');
      hydratePhotos(thumbs);
    };
    renderThumbs(); showNum();
    $('input[name=date]', m).addEventListener('change', showNum);

    $('#f-badge', m).addEventListener('change', e => { st.badgeId = e.target.value; showNum(); });
    const people = $$('#f-people input', m);
    people.forEach(i => i.addEventListener('change', () => { i.checked ? st.scoutIds.add(i.value) : st.scoutIds.delete(i.value); }));
    const setAll = v => people.forEach(i => { i.checked = v; v ? st.scoutIds.add(i.value) : st.scoutIds.delete(i.value); });
    $('#p-all', m).onclick = () => setAll(true);
    $('#p-none', m).onclick = () => setAll(false);

    $('#files', m).addEventListener('change', async e => {
      const picked = [...e.target.files]; e.target.value = '';
      for (const f of picked) {
        if (st.keep.length + st.files.length >= 20) { toast('Máximo 20 fotos por actividad', 'err'); break; }
        try { await V.image(f); st.files.push(f); } catch (err) { if (!showValidation(null, err)) throw err; }
      }
      renderThumbs();
    });
    thumbs.addEventListener('click', e => {
      const k = e.target.closest('[data-keep]'), n = e.target.closest('[data-new]');
      if (k) { st.keep = st.keep.filter(x => x !== k.dataset.keep); st.removed.push(k.dataset.keep); }
      if (n) st.files.splice(+n.dataset.new, 1);
      if (k || n) renderThumbs();
    });

    $('#actform', m).addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (!st.badgeId) { hint.textContent = 'Elige una insignia'; $('#f-badge', m).scrollIntoView({ block: 'center' }); return; }
      if (!st.scoutIds.size) { hint.textContent = 'Elige al menos un participante'; $('#f-people', m).scrollIntoView({ block: 'center' }); return; }
      if (!f.get('date')) { hint.textContent = 'Indica la fecha'; return; }
      const btn = $('#save', m); btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        await Store.saveActivity({
          ...(ex || {}), date: f.get('date'), badgeId: st.badgeId, reqIds: [], scoutIds: [...st.scoutIds],
          title: f.get('title'), description: f.get('desc'), photoIds: [...st.keep],
        }, st.files, st.removed);
        closeModal();
        toast('Actividad guardada · progreso actualizado');
        rerender();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Guardar actividad';
        if (showValidation(e.target, err)) { hint.textContent = err.message; return; }
        console.error(err); hint.textContent = 'No se pudo guardar. Intenta de nuevo.';
      }
    });
  },
};
