(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  await PF.Doc ? null : null;
  PF.app.loadDemo();
  await sl(6000);

  const ids = ['single', 'stack', 'tile', 'book', 'fan', 'carousel', 'coverflow', 'depth'];
  const n = PF.PdfDoc.numPages;
  const fB = Math.min(n - 1, 18);
  const CW = 200, CH = 112, COLS = 6, PADX = 6, PADY = 6, LAB = 16;
  const T0 = 0, T1 = 2.0;

  const sheet = document.createElement('canvas');
  sheet.width = PADX + COLS * (CW + PADX);
  sheet.height = PADY + ids.length * (CH + LAB + PADY);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);

  const cv = document.getElementById('canvas');
  const report = [];

  for (let r = 0; r < ids.length; r++) {
    PF.state.kfs = [
      PF.core.makeKeyframe(T0, ids[r], 0),
      PF.core.makeKeyframe(T1, ids[r], fB)
    ];
    PF.state.sel = PF.state.kfs[0].id;
    PF.state.dur = 3;
    const y = PADY + r * (CH + LAB + PADY);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 12px monospace';
    c.fillText(ids[r] + '   focus 0 → ' + fB, PADX, y + 12);

    let prev = null, moved = 0;
    for (let k = 0; k < COLS; k++) {
      const t = T0 + (T1 - T0) * (k / (COLS - 1));
      PF.app.seek(t);
      await raf(); await raf();
      const x = PADX + k * (CW + PADX);
      const yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b';
      c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      /* 用中心行像素做指纹，判断相邻采样之间画面是否真的在变 */
      const g = document.createElement('canvas');
      g.width = 32; g.height = 18;
      g.getContext('2d').drawImage(cv, 0, 0, 32, 18);
      const sig = g.toDataURL('image/png').length + ':' + g.toDataURL('image/png').slice(-24);
      if (prev !== null && sig !== prev) moved++;
      prev = sig;
    }
    report.push(ids[r] + ':' + moved + '/' + (COLS - 1));
  }

  PF.state.kfs = PF.core.defaultKeyframes(n);
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 12;
  PF.app.seek(0);
  console.log('MOVED ' + report.join(' '));
  return sheet.toDataURL('image/png');
})()
