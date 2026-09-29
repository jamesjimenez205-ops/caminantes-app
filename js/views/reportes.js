Changes['report-f'] = el => {
  const r = UIState.report, k = el.dataset.key;
  try {
    if (el.type === 'checkbox') r[k] = el.checked;
    else if (k === 'from' || k === 'to') r[k] = V.date(el.value, { field: k, label: k === 'from' ? 'Desde' : 'Hasta' });
    else if (k === 'scoutId') r[k] = el.value && Store.scout(V.id(el.value)) ? el.value : '';
    else if (k === 'badgeId') r[k] = el.value && Store.badge(V.id(el.value)) ? el.value : '';
  } catch (err) { if (err instanceof V.ValidationError) toast(err.message, 'err'); else throw err; }
  rerender();
};

Views.reportes = {
  render() {
    const r = UIState.report;
    const acts = Store.filterActivities(r);
    const photos = acts.reduce((n, a) => n + a.photoIds.length, 0);
    const sel = (key, opts, all) => `<select data-change="report-f" data-key="${key}"><option value="">${all}</option>${opts.map(o => `<option value="${o.id}" ${r[key] === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
    return `
    <div class="page-head"><div><h1>Reportes</h1><p class="sub">Genera un PDF con actividades, fotos y progreso</p></div></div>
    <section class="card filters-card">
      <div class="filter-grid">
        <label>Desde<input type="date" data-change="report-f" data-key="from" value="${esc(r.from)}" min="2000-01-01"></label>
        <label>Hasta<input type="date" data-change="report-f" data-key="to" value="${esc(r.to)}" min="2000-01-01"></label>
        <label>Caminante${sel('scoutId', S.scouts, 'Todos')}</label>
        <label>Insignia${sel('badgeId', S.badges, 'Todas')}</label>
      </div>
      <div class="opts">
        <label class="check"><input type="checkbox" data-change="report-f" data-key="photos" ${r.photos ? 'checked' : ''}><span class="box">${icon('check')}</span>Incluir fotografías</label>
        <label class="check"><input type="checkbox" data-change="report-f" data-key="progress" ${r.progress ? 'checked' : ''}><span class="box">${icon('check')}</span>Incluir progreso de insignias</label>
      </div>
    </section>
    <section class="card report-summary">
      <div class="rs-nums"><div><b>${acts.length}</b><span>actividades</span></div><div><b>${photos}</b><span>fotografías</span></div><div><b>${new Set(acts.flatMap(a => a.scoutIds)).size}</b><span>participantes</span></div></div>
      <button class="btn primary big" data-act="make-report" ${acts.length || r.progress ? '' : 'disabled'}>${icon('download')} Descargar PDF</button>
    </section>
    ${acts.length ? `<div class="card list">${acts.map(a => { const b = Store.badge(a.badgeId); return `<div class="row"><span class="date-col">${fmtDate(a.date)}</span><span class="grow">${esc((a.description || 'Sin descripción').slice(0, 110))}</span>${b ? `<span class="chip" style="--c:${b.color}">${esc(b.name)}</span>` : ''}</div>`; }).join('')}</div>`
      : '<p class="muted">Ninguna actividad coincide con los filtros.</p>'}`;
  },
};

Actions['make-report'] = async (d, el) => {
  el.disabled = true; const t = el.innerHTML; el.textContent = 'Generando…';
  try { await Report.generate(UIState.report); } catch (e) { console.error(e); toast('No se pudo generar el PDF', 'err'); }
  el.disabled = false; el.innerHTML = t;
};
