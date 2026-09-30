// Labor social: horas de servicio por Caminante/Scout, con fecha, lugar, descripción, evidencia y certificado.
// Un registro puede tener varios participantes; las horas cuentan POR participante.
const fmtHours = h => {
  const m = Math.round(h * 60), H = Math.floor(m / 60), M = m % 60;
  return (H ? H + ' h' : '') + (H && M ? ' ' : '') + (M ? M + ' min' : H ? '' : '0 h');
};

Changes['svc-scout'] = el => {
  try { UIState.svcScout = el.value ? (Store.scout(V.id(el.value)) ? el.value : '') : ''; } catch { UIState.svcScout = ''; }
  rerender();
};
Actions['svc-open'] = d => { UIState.svcScout = d.scout || ''; location.hash = '#/laborsocial'; };
Actions['svc-new'] = d => { if (d?.scout) UIState.svcScout = d.scout; svcForm(); };
Actions['svc-edit'] = d => svcForm(d.id);
Actions['svc-del'] = async d => {
  if (!S.service.some(r => r.id === d.id)) return;
  if (!confirm('¿Eliminar este registro de labor social? Se borrarán también su evidencia y su certificado.')) return;
  await Store.deleteService(d.id); toast('Registro eliminado'); rerender();
};
Actions['open-cert'] = async d => {
  const r = S.service.find(x => x.id === d.id);
  if (!r?.certificateId) return;
  if (r.certKind === 'image') return Actions['lightbox']({ id: r.certificateId });
  const url = await Store.photoUrl(r.certificateId);
  if (url) window.open(url, '_blank', 'noopener');
};

Views.laborsocial = {
  render() {
    const f = UIState.svcScout && Store.scout(UIState.svcScout) ? UIState.svcScout : '';
    const recs = S.service.filter(r => !f || r.scoutIds.includes(f));
    const totals = S.scouts.map(s => ({ s, h: Store.serviceHours(s.id), n: Store.serviceFor(s.id).length }));
    const groupTotal = Math.round(totals.reduce((n, t) => n + t.h, 0) * 100) / 100, top = Math.max(1, ...totals.map(t => t.h));
    return `
    ${DB.denied?.has('service') ? `<div class="alert">${icon('alert')}<span>La nube todavía no tiene permiso para guardar labor social. Hay que publicar las reglas de Firestore actualizadas (archivo <b>firestore.rules</b>); mientras tanto no se podrán registrar horas.</span></div>` : ''}
    <div class="page-head"><div><h1>Labor social</h1><p class="sub">Horas de servicio de ${esc(Sec().people)} · total del grupo: <b>${fmtHours(groupTotal)}</b></p></div>
      <button class="btn primary" data-act="svc-new">${icon('plus')} Registrar horas</button></div>
    ${S.scouts.length ? `
    <section class="card table-wrap"><table class="progress-table">
      <thead><tr><th>${esc(Sec().person)}</th><th>Horas acumuladas</th><th>Registros</th><th></th></tr></thead>
      <tbody>${totals.map(({ s, h, n }) => `<tr class="${f === s.id ? 'sel' : ''}"><td><a class="who-link" href="#/caminantes/${s.id}">${avatar(s, 'sm')}${esc(s.name)}</a></td>
        <td><b class="hrs-big">${fmtHours(h)}</b>${h ? `<div class="bar"><i class="done" style="width:${Math.round(h / top * 100)}%"></i></div>` : ''}</td>
        <td>${n}</td><td><button class="link" data-act="svc-open" data-scout="${s.id}">Ver registros</button></td></tr>`).join('')}</tbody></table></div>

    <div class="sec-head"><h2>Registros ${f ? `de ${esc(Store.scout(f).name)}` : ''} <small class="muted">(${recs.length})</small></h2>
      <label class="pill-select"><span>Filtrar</span><select data-change="svc-scout"><option value="">Todos</option>${S.scouts.map(s => `<option value="${s.id}" ${f === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>
    ${recs.length ? `<div class="stack">${recs.map(r => this.card(r)).join('')}</div>`
      : emptyState('Aún no hay registros', 'Anota cada jornada de servicio con su lugar, horas, evidencia y certificado.', `<button class="btn primary" data-act="svc-new">${icon('plus')} Registrar horas</button>`)}`
    : emptyState(`Sin ${Sec().people}`, `Agrega ${Sec().people} para poder registrar su labor social.`, `<a class="btn primary" href="#/caminantes">Ir a ${esc(Sec().people)}</a>`)}`;
  },

  card(r) {
    const people = r.scoutIds.map(Store.scout).filter(Boolean);
    return `<article class="card svc">
      <div class="svc-head"><span class="hrs">${fmtHours(r.hours)}</span>
        <div class="grow"><b>${esc(r.place)}</b><br><small class="muted">${fmtDate(r.date, true)} · ${plural(people.length, 'participante', 'participantes')} · ${fmtHours(r.hours * people.length)} en total</small></div>
        <span class="avatars">${people.slice(0, 5).map(s => avatar(s, 'sm')).join('')}${people.length > 5 ? `<span class="avatar sm more">+${people.length - 5}</span>` : ''}</span>
        <button class="icon-btn" data-act="svc-edit" data-id="${r.id}" aria-label="Editar">${icon('edit')}</button>
        <button class="icon-btn" data-act="svc-del" data-id="${r.id}" aria-label="Eliminar">${icon('trash')}</button></div>
      ${r.description ? `<p class="svc-desc">${esc(r.description)}</p>` : ''}
      <div class="svc-people">${people.map(s => `<span class="chip-person">${avatar(s, 'sm')}${esc(s.name)}</span>`).join('')}</div>
      <div class="svc-files">
        ${r.evidenceIds.length ? `<div class="gallery small">${r.evidenceIds.map(p => `<a class="ph" data-act="lightbox" data-id="${p}"><img data-photo="${p}" alt="Evidencia"></a>`).join('')}</div>` : '<span class="tag pend">Sin evidencia</span>'}
        ${r.certificateId ? `<button class="btn" data-act="open-cert" data-id="${r.id}">${icon('file')} Ver certificado (${r.certKind === 'pdf' ? 'PDF' : 'imagen'})</button>` : '<span class="tag pend">Sin certificado</span>'}
      </div></article>`;
  },
};

function svcForm(id) {
  if (!S.scouts.length) { toast(`Primero agrega al menos un ${Sec().person}`, 'err'); location.hash = '#/caminantes'; return; }
  const ex = id ? S.service.find(r => r.id === id) : null;
  const st = {
    scoutIds: new Set(ex?.scoutIds || (UIState.svcScout ? [UIState.svcScout] : [])),
    files: [], keep: [...(ex?.evidenceIds || [])], removed: [], cert: null, removeCert: false,
  };
  openModal(`<form id="svcform" novalidate>
    <header class="modal-head"><h2>${ex ? 'Editar labor social' : 'Registrar labor social'}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field" id="f-people"><div class="lbl"><b>1</b> Participantes <span class="grow"></span><button type="button" class="link" id="p-all">Todos</button><button type="button" class="link" id="p-none">Ninguno</button></div>
        <div class="people-pick">${S.scouts.map(s => `<label class="pp"><input type="checkbox" value="${s.id}" ${st.scoutIds.has(s.id) ? 'checked' : ''}><span>${avatar(s, 'sm')}${esc(s.name)}</span></label>`).join('')}</div></div>
      <div class="field two"><div><label class="lbl" for="sd"><b>2</b> Fecha</label><input id="sd" type="date" name="date" value="${esc(ex?.date || today())}" required min="2000-01-01"></div>
        <div><label class="lbl" for="sh">Horas <small>(por participante)</small></label><input id="sh" name="hours" type="number" step="0.25" min="0.25" max="24" inputmode="decimal" value="${ex ? ex.hours : ''}" placeholder="Ej.: 2.5" required>
          <small class="muted" id="hint-h">2.5 = 2 h 30 min</small></div></div>
      <div class="field"><label class="lbl" for="sp"><b>3</b> Lugar</label><input id="sp" name="place" maxlength="100" required autocomplete="off" value="${esc(ex?.place || '')}" placeholder="Ej.: Hogar de ancianos San José"></div>
      <div class="field"><label class="lbl" for="sx">Descripción <small>(qué se hizo)</small></label><textarea id="sx" name="description" rows="3" maxlength="1000" placeholder="Ej.: Limpieza del patio y actividades recreativas con los abuelos.">${esc(ex?.description || '')}</textarea></div>
      <div class="field"><div class="lbl"><b>4</b> Evidencia <small>(fotos, hasta 6)</small></div>
        <label class="drop">${icon('camera')}<span>Agregar fotos</span><input type="file" id="ev-files" name="evidence" accept="image/jpeg,image/png,image/webp" multiple hidden></label>
        <div class="thumbs" id="ev-thumbs"></div></div>
      <div class="field"><div class="lbl"><b>5</b> Certificado <small>(imagen o PDF de hasta 680 KB)</small></div>
        <label class="drop">${icon('file')}<span id="cert-name">${ex?.certificateId ? 'Cambiar certificado' : 'Subir certificado'}</span><input type="file" id="cert-file" name="cert" accept="image/jpeg,image/png,image/webp,application/pdf" hidden></label>
        ${ex?.certificateId ? `<label class="check rm-photo"><input type="checkbox" id="cert-rm"><span class="box">${icon('check')}</span>Quitar el certificado actual</label>` : ''}</div>
    </div>
    <footer class="modal-foot"><span class="hint" id="hint"></span><button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary big" id="save">Guardar</button></footer></form>`, {
    wide: true,
    onMount: m => {
      const thumbs = $('#ev-thumbs', m), hint = $('#hint', m);
      const renderThumbs = () => {
        thumbs.innerHTML = st.keep.map(pid => `<div class="th"><img data-photo="${pid}" alt=""><button type="button" data-keep="${pid}" aria-label="Quitar foto">${icon('x')}</button></div>`).join('')
          + st.files.map((f, i) => `<div class="th"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" data-new="${i}" aria-label="Quitar foto">${icon('x')}</button></div>`).join('');
        hydratePhotos(thumbs);
      };
      renderThumbs();
      const people = $$('#f-people input', m);
      people.forEach(i => i.addEventListener('change', () => { i.checked ? st.scoutIds.add(i.value) : st.scoutIds.delete(i.value); }));
      const setAll = v => people.forEach(i => { i.checked = v; v ? st.scoutIds.add(i.value) : st.scoutIds.delete(i.value); });
      $('#p-all', m).onclick = () => setAll(true); $('#p-none', m).onclick = () => setAll(false);
      $('#sh', m).addEventListener('input', e => {
        const n = Number(String(e.target.value).replace(',', '.'));
        $('#hint-h', m).textContent = Number.isFinite(n) && n > 0 ? `= ${fmtHours(n)}` : '2.5 = 2 h 30 min';
      });
      $('#ev-files', m).addEventListener('change', async e => {
        const picked = [...e.target.files]; e.target.value = '';
        for (const f of picked) {
          if (st.keep.length + st.files.length >= 6) { toast('Máximo 6 fotos de evidencia', 'err'); break; }
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
      $('#cert-file', m).addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        try { await V.certificate(file); st.cert = file; $('#cert-name', m).textContent = '✓ ' + file.name.slice(0, 40); }
        catch (err) { e.target.value = ''; st.cert = null; if (!showValidation(null, err)) throw err; }
      });
      $('#svcform', m).addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (!st.scoutIds.size) { hint.textContent = 'Elige al menos un participante'; $('#f-people', m).scrollIntoView({ block: 'center' }); return; }
        const btn = $('#save', m); btn.disabled = true; btn.textContent = 'Guardando…';
        try {
          await Store.saveService({ ...(ex || {}), scoutIds: [...st.scoutIds], date: f.get('date'), hours: f.get('hours'), place: f.get('place'), description: f.get('description'), evidenceIds: [...st.keep] },
            { evidenceFiles: st.files, removeEvidence: st.removed, certFile: st.cert, removeCert: !!$('#cert-rm', m)?.checked });
          closeModal(); toast('Labor social guardada'); rerender();
        } catch (err) {
          btn.disabled = false; btn.textContent = 'Guardar';
          if (showValidation(e.target, err)) { hint.textContent = err.message; return; }
          console.error(err); hint.textContent = 'No se pudo guardar. Intenta de nuevo.';
        }
      });
    },
  });
}
