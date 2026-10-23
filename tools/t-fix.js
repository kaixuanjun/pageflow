(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 320, CH = 180, PAD = 6, LAB = 16, COLS = 6;
  const rowsDef = [
    ['stack 抽牌 0 → 5（同布局，整页排序）', 'stack', 0, 5, 1.2],
    ['书本 → 画廊 形变（跨布局，逐像素深度）', null, 5.9, 7.35, null],
    ['成型画廊（深度关闭，不接受穿插）', null, 7.40, 7.46, null]
  ];
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + rowsDef.length * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');
  const n = PF.PdfDoc.numPages;

  for (let r = 0; r < rowsDef.length; r++) {
    const [label, layout, t0, t1, span] = rowsDef[r];
    if (layout) {
      PF.state.kfs = [
        PF.core.makeKeyframe(0, layout, t0),
        PF.core.makeKeyframe(span, layout, t1)
      ];
      PF.state.sel = PF.state.kfs[0].id;
      PF.state.dur = 3;
    } else {
      PF.app.loadDemo();
      await sl(500);
    }
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 13px monospace';
    c.fillText(label, PAD, y + 12);
    for (let k = 0; k < COLS; k++) {
      let t;
      if (layout) t = span * (k / (COLS - 1));
      else t = t0 + (t1 - t0) * (k / (COLS - 1));
      PF.app.seek(t);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b';
      c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d';
      c.font = 'bold 11px monospace';
      c.fillText('t=' + t.toFixed(2), x + 5, yy + 14);
    }
  }
  return sheet.toDataURL('image/png');
})()
