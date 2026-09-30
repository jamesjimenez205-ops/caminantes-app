// Asistencia a las reuniones: se marca Presente / Ausente / Justificado por Caminante y por fecha.
const ATT = [['P', 'Presente'], ['A', 'Ausente'], ['J', 'Justificado']];
const attDate = () => UIState.attDate || today();

Changes['att-date'] = el => {
  try { UIState.attDate = V.date(el.value, { field: 'date', label: 'Fecha', required: true }); }
  catch (err) { if (err instanceof V.ValidationError) toast(err.message, 'err'); else throw err; }
  rerender();
};
async function attRun(fn) {
  try { await fn(); } catch (err) { if (err instanceof V.ValidationError) toast(err.message, 'err'); else throw err; }
  rerender();
}
Actions['att-set'] = d => attRun(() => Store.setAttendance(attDate(), d.scout, Store.attendanceOn(attDate())?.records[d.scout] === d.val ? '' : d.val));
Actions['att-all'] = d => attRun(() => Store.setAttendanceAll(attDate(), d.val));
Actions['att-pick'] = d => { UIState.attDate = d.date; rerender(); window.scrollTo(0, 0); };
Actions['att-del'] = d => {
  if (!confirm('¿Borrar la asistencia de esa reunión?')) return;
  return attRun(() => Store.deleteAttendance(d.date));
};

Views.asistencia = {
  render() {
    const date = attDate(), rec = Store.attendanceOn(date)?.records || {};
    const n = k => S.scouts.filter(s => rec[s.id] === k).length;
    const unmarked = S.scouts.filter(s => !rec[s.id]).length;
    return `
    <div class="page-head"><div><h1>Asistencia</h1><p class="sub">${plural(S.attendance.length, 'reunión registrada', 'reuniones registradas')}</p></div></div>
    ${S.scouts.length ? `
    <section class="card">
      <div class="att-bar">
        <label class="att-date">${icon('calendar')}<input type="date" data-change="att-date" value="${esc(date)}" min="2000-01-01" aria-label="Fecha de la reunión"></label>
        <span class="att-count"><span class="tag done">Presentes ${n('P')}</span><span class="tag" style="background:#f6dcdc;color:#8e1f1f">Ausentes ${n('A')}</span><span class="tag prog">Justificados ${n('J')}</span>${unmarked ? `<span class="tag pend">Sin marcar ${unmarked}</span>` : ''}</span>
        <span><button class="btn" data-act="att-all" data-val="P">Todos presentes</button> <button class="btn ghost" data-act="att-all" data-val="">Limpiar</button></span>
      </div>
      <ul class="att-list">${S.scouts.map(s => `<li><span class="who">${avatar(s.name, 'sm')}${esc(s.name)}</span>
        <span class="seg" role="group" aria-label="Asistencia de ${esc(s.name)}">${ATT.map(([k, l]) => `<button type="button" class="${rec[s.id] === k ? 'on ' + k : ''}" data-act="att-set" data-scout="${s.id}" data-val="${k}" aria-pressed="${rec[s.id] === k}">${l}</button>`).join('')}</span></li>`).join('')}</ul>
      <p class="muted"><small>Cada toque se guarda al instante. Toca de nuevo el mismo botón para quitar la marca.</small></p>
    </section>

    ${S.attendance.length ? `
    <div class="sec-head"><h2>Resumen por ${esc(Sec().person)}</h2></div>
    <div class="card table-wrap"><table class="progress-table">
      <thead><tr><th>${esc(Sec().person)}</th><th>Presente</th><th>Ausente</th><th>Justificado</th><th>Asistencia</th></tr></thead>
      <tbody>${S.scouts.map(s => { const t = Store.attendanceStats(s.id); return `<tr><td><a class="who-link" href="#/caminantes/${s.id}">${avatar(s.name, 'sm')}${esc(s.name)}</a></td>
        <td>${t.P}</td><td>${t.A}</td><td>${t.J}</td><td>${t.total ? `${bar(t.pct)}<small>${t.pct}% de ${plural(t.total, 'reunión', 'reuniones')}</small>` : '<small class="muted">Sin datos</small>'}</td></tr>`; }).join('')}</tbody></table></div>

    <div class="sec-head"><h2>Reuniones registradas</h2></div>
    <div class="card list att-hist">${S.attendance.map(a => { const v = Object.values(a.records); return `<div class="row" data-act="att-pick" data-date="${a.date}">
      <span class="grow"><b>${fmtDate(a.date, true)}</b><br><small class="muted">Presentes ${v.filter(x => x === 'P').length} · Ausentes ${v.filter(x => x === 'A').length} · Justificados ${v.filter(x => x === 'J').length}</small></span>
      <button class="icon-btn" data-act="att-del" data-date="${a.date}" aria-label="Borrar">${icon('trash')}</button></div>`; }).join('')}</div>` : ''}`
    : emptyState(`Sin ${Sec().people}`, `Agrega ${Sec().people} para poder tomar asistencia.`, `<a class="btn primary" href="#/caminantes">Ir a ${esc(Sec().people)}</a>`)}`;
  },
};
