// Reporte PDF (jsPDF). Filtros: fecha, Caminante, insignia.
const Report = {
  async pdfImage(photoId) {
    const p = await DB.get('photos', photoId);
    if (!p) return null;
    const bmp = await createImageBitmap(p.blob);
    const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return { data: c.toDataURL('image/jpeg', 0.78), w: c.width, h: c.height };
  },

  async generate(f) {
    if (!window.jspdf) { toast('No se cargó el generador de PDF (revisa la conexión a internet)', 'err'); return; }
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 15, CW = W - 2 * M;
    const FOREST = [18, 63, 34], LEAF = [67, 160, 71], SAND = [228, 226, 211], INK = [38, 48, 42], MUTED = [98, 106, 92];
    const STATUS = { done: [62, 142, 65], prog: [224, 160, 48], pend: [200, 191, 169] };
    const acts = Store.filterActivities(f).slice().reverse(); // cronológico
    let y = 0;
    const ensure = h => { if (y + h > H - 18) { doc.addPage(); y = M + 2; } };
    const txt = (s, x, yy, { size = 10, bold = false, color = INK, align = 'left' } = {}) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color); doc.text(String(s), x, yy, { align });
    };
    const para = (s, x, w, opts = {}) => {
      const lines = doc.splitTextToSize(s, w); const lh = (opts.size || 10) * 0.42;
      lines.forEach(l => { ensure(lh + 1); txt(l, x, y, opts); y += lh + 0.8; });
    };
    const drawBar = (x, yy, w, p) => {
      doc.setFillColor(...SAND); doc.roundedRect(x, yy, w, 3, 1.5, 1.5, 'F');
      if (p > 0) { doc.setFillColor(...STATUS[statusOf(p)]); doc.roundedRect(x, yy, Math.max(3, w * p / 100), 3, 1.5, 1.5, 'F'); }
    };

    // Encabezado con montañas
    doc.setFillColor(...FOREST); doc.rect(0, 0, W, 38, 'F');
    try {
      const put = async (src, x, h, w) => doc.addImage(await blobToDataURL(await (await fetch(src)).blob()), 'PNG', x, 6, w, h);
      doc.setFillColor(255, 255, 255); doc.roundedRect(W - M - 52, 5, 23, 28, 2, 2, 'F');
      await put(GROUP.logo, W - M - 51, 26, 21);
      if (Sec().logo) await put(Sec().logo, W - M - 26, 26, 26);
    } catch (e) { /* sin logos si no se pueden cargar */ }
    txt('Reporte · ' + Sec().short, M, 20, { size: 22, bold: true, color: [255, 255, 255] });
    txt(GROUP.name + ' · ' + Sec().name, M, 28, { size: 11, color: [200, 225, 195] });
    y = 48;

    const scout = f.scoutId && Store.scout(f.scoutId), badge = f.badgeId && Store.badge(f.badgeId);
    const fd = d => d ? fmtDate(d) : null;
    const period = f.from || f.to ? `${fd(f.from) || 'inicio'} a ${fd(f.to) || 'hoy'}` : 'Todo el periodo';
    txt(`Periodo: ${period}`, M, y, { size: 10, color: MUTED }); y += 5;
    txt(`Caminante: ${scout ? scout.name : 'Todos'}    Insignia: ${badge ? badge.name : 'Todas'}`, M, y, { size: 10, color: MUTED }); y += 5;
    txt(`Generado el ${fmtDate(today())}`, M, y, { size: 10, color: MUTED }); y += 9;

    const nPhotos = acts.reduce((n, a) => n + a.photoIds.length, 0);
    doc.setFillColor(246, 245, 238); doc.roundedRect(M, y, CW, 16, 3, 3, 'F');
    [[acts.length, 'actividades'], [nPhotos, 'fotografías'], [new Set(acts.flatMap(a => a.scoutIds)).size, 'participantes']].forEach(([n, l], i) => {
      const cx = M + CW / 6 + i * CW / 3;
      txt(n, cx, y + 8, { size: 15, bold: true, color: FOREST, align: 'center' }); txt(l, cx, y + 13, { size: 8, color: MUTED, align: 'center' });
    });
    y += 24;

    // Progreso
    if (f.progress) {
      const scouts = scout ? [scout] : S.scouts, badges = badge ? [badge] : S.badges;
      if (scouts.length) {
        ensure(20); txt('Progreso de insignias', M, y, { size: 14, bold: true, color: FOREST }); y += 3;
        doc.setDrawColor(...LEAF); doc.setLineWidth(0.6); doc.line(M, y, M + 22, y); y += 7;
        for (const s of scouts) {
          ensure(8 + badges.length * 7);
          txt(s.name, M, y, { size: 11, bold: true }); y += 5.5;
          for (const b of badges) {
            const p = Store.badgeProgress(s.id, b.id);
            txt(b.name, M + 4, y, { size: 9 }); drawBar(M + 60, y - 2.6, 80, p.pct);
            txt(`${p.done}/${p.total}  ·  ${p.pct}%`, M + 145, y, { size: 9, color: MUTED }); y += 6;
          }
          y += 3;
        }
        y += 4;
      }
    }

    // Actividades
    ensure(20); txt(`Actividades (${acts.length})`, M, y, { size: 14, bold: true, color: FOREST }); y += 3;
    doc.setDrawColor(...LEAF); doc.line(M, y, M + 22, y); y += 8;
    if (!acts.length) txt('No hay actividades con estos filtros.', M, y, { color: MUTED });

    const cols = 3, gap = 4, cw = (CW - gap * (cols - 1)) / cols, ch = 42;
    for (const a of acts) {
      const b = Store.badge(a.badgeId);
      ensure(34);
      doc.setFillColor(...(b ? [...(b.color.match(/\w\w/g).map(h => parseInt(h, 16)))] : LEAF)); doc.rect(M, y - 4, 1.6, 8, 'F');
      txt(fd(a.date), M + 4, y, { size: 11, bold: true }); if (b) txt(b.name, M + 4 + doc.getTextWidth(fd(a.date)) + 5, y, { size: 10, color: MUTED });
      y += 6;
      const names = a.scoutIds.map(id => Store.scout(id)?.name).filter(Boolean).join(', ');
      para(`Participantes: ${names || '—'}`, M + 4, CW - 4, { size: 9, color: MUTED });
      if (a.description) para(a.description, M + 4, CW - 4, { size: 10 });
      const reqs = (b?.requirements || []).filter(r => a.reqIds.includes(r.id));
      if (reqs.length) para('Requisitos: ' + reqs.map(r => r.text).join('; '), M + 4, CW - 4, { size: 9, color: MUTED });
      if (f.photos && a.photoIds.length) {
        y += 2;
        for (let i = 0; i < a.photoIds.length; i += cols) {
          ensure(ch + 3);
          for (let j = 0; j < cols && i + j < a.photoIds.length; j++) {
            const img = await this.pdfImage(a.photoIds[i + j]); if (!img) continue;
            const k = Math.min(cw / img.w, ch / img.h), w = img.w * k, h = img.h * k;
            const x = M + j * (cw + gap);
            doc.addImage(img.data, 'JPEG', x + (cw - w) / 2, y + (ch - h) / 2, w, h, undefined, 'FAST');
          }
          y += ch + 3;
        }
      }
      y += 5;
      doc.setDrawColor(...SAND); doc.setLineWidth(0.3); doc.line(M, y - 2.5, W - M, y - 2.5);
    }

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); txt(`Página ${i} de ${n}`, W / 2, H - 8, { size: 8, color: MUTED, align: 'center' }); }
    doc.save(`reporte-${Sec().id}-${today()}.pdf`);
    toast('Reporte descargado');
  },
};
