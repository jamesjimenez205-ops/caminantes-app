Changes['pick-scout'] = el => { UIState.badgeScout = el.value; rerender(); };

const normTxt = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Buscador: filtra las tarjetas en pantalla sin volver a dibujar (no pierde el cursor)
Inputs['badge-q'] = el => {
  const q = normTxt(el.value.trim());
  $$('.badge-card').forEach(c => { c.hidden = !!q && !normTxt(c.dataset.name).includes(q); });
  $$('.group-block').forEach(g => { const hit = !!$$('.badge-card:not([hidden])', g).length; g.hidden = !!q && !hit; if (q && hit && g.tagName === 'DETAILS') g.open = true; });
};

const groupOf = b => (Sec().groups.find(g => g.k === b.group) || Sec().groups[0]);
const visibleGroups = () => Sec().groups.filter(g => !g.hidden);
// recuerda qué listas desplegables están abiertas (el evento «toggle» no burbujea: se escucha en captura)
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d?.matches?.('details.fold')) { if (d.open) UIState.openGroups.add(d.dataset.group); else UIState.openGroups.delete(d.dataset.group); }
}, true);

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
    ${visibleGroups().map(g => {
      const list = S.badges.filter(b => groupOf(b).k === g.k);
      const multi = visibleGroups().length > 1;
      if (!list.length && !many && !multi) return '';
      const inner = list.length ? `<div class="grid badges4">${list.map(badgeCard).join('')}</div>` : `<p class="muted">Aún no hay ${esc(g.name.toLowerCase())}. Usa «Agregar insignia» para crearlas.</p>`;
      // con varios tipos (Unidad) cada uno es una lista desplegable
      return multi
        ? `<details class="group-block fold" data-group="${g.k}" ${UIState.openGroups.has(g.k) ? 'open' : ''}><summary><span>${esc(g.name)}</span><small>(${list.length})</small></summary>${inner}</details>`
        : `<section class="group-block"><div class="sec-head"><h2>${esc(g.name)} <small class="muted">(${list.length})</small></h2></div>${inner}</section>`;
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
    ${!b.requirements.length ? `<div class="card note">${icon('alert')}<span>Esta insignia aún no tiene requisitos. Agrega el primero abajo (puede ser uno solo o varios).</span></div>`
      : S.scouts.length ? `
    <section class="card">
      <div class="picker"><label for="ps">Marcar requisitos de:</label>
        <select id="ps" data-change="pick-scout">${S.scouts.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <span class="grow"></span>${tag(p.pct)}</div>
      ${bar(p.pct)}<small class="muted">${p.done} de ${p.total} requisitos completados</small>
      <ul class="checklist big">${b.requirements.map(r => {
        const n = S.scouts.filter(s => Store.isDone(s.id, r.id)).length;
        return `<li><label><input type="checkbox" data-change="toggle-req" data-scout="${sid}" data-badge="${id}" data-req="${r.id}" ${Store.isDone(sid, r.id) ? 'checked' : ''}>
          <span class="box">${icon('check')}</span><span class="txt">${esc(r.text)}${r.hours && sid ? `<small class="muted hrs-note"><br>Labor social: ${fmtHours(Math.min(Store.serviceHours(sid), r.hours))} de ${fmtHours(r.hours)}</small>` : ''}</span><small class="who">${n}/${S.scouts.length}</small></label></li>`;
      }).join('')}</ul>
    </section>` : `<div class="card note">${icon('users')}<span>Agrega <a href="#/caminantes">${esc(Sec().people)}</a> para marcar sus requisitos.</span></div>`}
    <form class="card quick-req" id="quickreq" autocomplete="off">
      <label class="lbl" for="qr">Agregar un requisito</label>
      <div class="qr-row"><input id="qr" name="reqs" maxlength="500" placeholder="Escribe el requisito y pulsa Agregar…"><button class="btn primary">${icon('plus')} Agregar</button></div>
    </form>`;
  },

  mount(root, id) {
    const f = $('#quickreq', root);
    if (!f) return;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const b = Store.badge(id), v = String(new FormData(f).get('reqs') || '').trim();
      if (!b || !v) return;
      try {
        await Store.saveBadge({ id, name: b.name, description: b.description, group: b.group }, [...b.requirements.map(r => r.text), v].join('\n'));
        toast('Requisito agregado'); rerender();
      } catch (err) { if (!showValidation(f, err)) throw err; }
    });
  },
};

Actions['new-badge'] = () => badgeForm();
Actions['edit-badge'] = d => badgeForm(d.id);

function badgeForm(id) {
  const b = id ? Store.badge(id) : { name: '', description: '', group: Sec().groups[0].k, requirements: [] };
  if (!b) return;
  const groups = visibleGroups();
  const hiddenGroup = !!b.group && !!Sec().groups.find(g => g.k === b.group)?.hidden; // p. ej. Scout Balboa: no se cambia de tipo
  openModal(`<form id="badgeform">
    <header class="modal-head"><h2>${id ? 'Editar insignia' : 'Nueva insignia'}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-body">
      <div class="field photo-field"><div class="lbl">Imagen de la insignia <small>(opcional)</small></div>
        <div class="photo-row"><span id="ph-prev">${patch(b, 'lg')}</span>
          <div><label class="btn">${icon('camera')} ${b.photoId || b.image ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" id="ph-file" name="photo" accept="image/jpeg,image/png,image/webp" hidden></label>
            ${b.photoId ? '<label class="check rm-photo"><input type="checkbox" name="rmphoto"><span class="box">' + icon('check') + '</span>Quitar imagen</label>' : ''}
            <small class="muted">JPG, PNG o WebP. Mejor cuadrada.</small></div></div></div>
      <div class="field"><label class="lbl" for="bn">Nombre</label><input id="bn" name="name" value="${esc(b.name)}" required maxlength="60" autocomplete="off"></div>
      ${groups.length > 1 && !hiddenGroup ? `<div class="field"><label class="lbl" for="bg">Tipo</label><select id="bg" name="group">${groups.map(g => `<option value="${g.k}" ${groupOf(b).k === g.k ? 'selected' : ''}>${esc(g.one)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label class="lbl" for="bd">Descripción <small>(opcional)</small></label><input id="bd" name="description" value="${esc(b.description)}" maxlength="300" autocomplete="off"></div>
      <div class="field"><div class="lbl">Requisitos <small>(1 o varios; puedes agregar más después)</small></div>
        <div id="reqrows" class="req-rows"></div>
        <button type="button" class="btn" id="addreq">${icon('plus')} Agregar requisito</button>
        <input type="hidden" name="reqs" id="reqs-h">
        <small class="muted">Hasta 30 requisitos de 500 caracteres cada uno.${id ? ' Si ya hay avances marcados, evita cambiar el orden: el avance sigue a la posición de cada requisito.' : ''} Con Enter se agrega otro; al pegar varias líneas se separan solas. <b>Horas</b> (opcional): si escribes horas en una casilla, ese requisito se marca solo cuando el joven llegue a esas horas de labor social.</small></div>
    </div>
    <footer class="modal-foot">${id && !hiddenGroup ? `<button type="button" class="btn danger left" id="delbadge">${icon('trash')} Eliminar</button>` : ''}
      <button type="button" class="btn ghost" data-act="close-modal">Cancelar</button><button class="btn primary">Guardar</button></footer></form>`, {
    onMount: m => {
      const list = $('#reqrows', m);
      const renumber = () => $$('.req-row', list).forEach((r, i) => { $('.n', r).textContent = i + 1; });
      const addRow = (val = '', focus = true, after = null, hrs = '') => {
        const d = document.createElement('div'); d.className = 'req-row';
        d.innerHTML = `<span class="n"></span><input class="req-in" maxlength="500" autocomplete="off" placeholder="Escribe un requisito…" aria-label="Requisito"><input class="req-hrs" type="number" step="0.25" min="0.25" inputmode="decimal" placeholder="Horas" title="Horas de labor social (opcional): el requisito se marca solo al llegar a esas horas" aria-label="Horas de labor social"><button type="button" class="icon-btn req-del" aria-label="Quitar requisito">${icon('x')}</button>`;
        $('.req-in', d).value = val; $('.req-hrs', d).value = hrs || '';
        if (after) after.after(d); else list.appendChild(d);
        renumber(); if (focus) $('input', d).focus();
        return d;
      };
      (b.requirements.length ? b.requirements : [{ text: '' }]).forEach(r => addRow(r.text, false, null, r.hours));
      $('#addreq', m).onclick = () => addRow();
      list.addEventListener('click', e => {
        const del = e.target.closest('.req-del'); if (!del) return;
        del.closest('.req-row').remove(); if (!$$('.req-row', list).length) addRow('', false); renumber();
      });
      list.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.matches('.req-in')) { e.preventDefault(); addRow('', true, e.target.closest('.req-row')); }
      });
      list.addEventListener('paste', e => {
        const t = (e.clipboardData || window.clipboardData).getData('text');
        if (!/[\r\n]/.test(t)) return;
        e.preventDefault();
        const lines = t.split(/\r\n?|\n/).map(l => l.trim()).filter(Boolean);
        let last = e.target.closest('.req-row');
        lines.forEach((l, i) => { if (i === 0 && !e.target.value.trim()) e.target.value = l; else last = addRow(l, false, last); });
        renumber();
      });
      $('#ph-file', m).addEventListener('change', async e => {
        const file = e.target.files[0]; if (!file) return;
        try { await V.image(file); } catch (err) { e.target.value = ''; if (!showValidation(null, err)) throw err; return; }
        $('#ph-prev', m).innerHTML = `<span class="patch img lg" style="--c:${b.color || '#3f9a52'}"><img src="${URL.createObjectURL(file)}" alt=""></span>`;
      });
      $('#badgeform', m).addEventListener('submit', async e => {
        e.preventDefault();
        const rows = $$('.req-row', m).map(r => [$('.req-in', r).value.trim(), $('.req-hrs', r).value]).filter(x => x[0]);
        $('#reqs-h', m).value = rows.map(x => x[0]).join(String.fromCharCode(10));
        const hours = rows.map(x => (x[1] === '' ? 0 : Number(String(x[1]).replace(',', '.'))));
        const f = new FormData(e.target);
        const data = { name: f.get('name'), description: f.get('description'), group: f.get('group') || groupOf(b).k };
        const opts = { photoFile: $('#ph-file', m).files[0] || null, removePhoto: f.get('rmphoto') === 'on', hours };
        try {
          if (id) await Store.saveBadge({ id, ...data }, f.get('reqs'), opts);
          else { const nb = await Store.createBadge(data, f.get('reqs'), opts); location.hash = '#/insignias/' + nb.id; }
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
