(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const n = PF.PdfDoc.numPages;
  const CW = 640, CH = 360, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 4 * (CW + PAD);
  sheet.height = PAD + 2 * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  const rows = [
    [n - 2, n - 1, '翻到最后一页 ' + (n - 2) + ' → ' + (n - 1)],
    [n - 1, 0, '从最后一页倒回开头 ' + (n - 1) + ' → 0']
  ];
  for (let r = 0; r < rows.length; r++) {
    const [fA, fB, label] = rows[r];
    PF.state.kfs = [
      PF.core.makeKeyframe(0, 'book', fA),
      PF.core.makeKeyframe(1.6, 'book', fB)
    ];
    PF.state.sel = PF.state.kfs[0].id;
    PF.state.dur = 3;
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 14px monospace';
    c.fillText(label, PAD, y + 13);
    for (let k = 0; k < 4; k++) {
      const t = 1.6 * (k / 3);
      PF.app.seek(t);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b';
      c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d';
      c.font = 'bold 12px monospace';
      c.fillText('t=' + t.toFixed(2), x + 6, yy + 16);
    }
  }
  return sheet.toDataURL('image/png');
})()
