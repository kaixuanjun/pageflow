(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 320, CH = 180, PAD = 6, LAB = 16, COLS = 6;
  const rows = [
    ['堆叠 → 书本  t=0.30…2.20', 0.30, 2.20],
    ['书本 → 画廊  t=5.60…7.20', 5.60, 7.20],
    ['画廊 → 平铺  t=7.60…9.40', 7.60, 9.40]
  ];
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + rows.length * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let r = 0; r < rows.length; r++) {
    const [label, t0, t1] = rows[r];
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 13px monospace';
    c.fillText(label, PAD, y + 12);
    for (let k = 0; k < COLS; k++) {
      const t = t0 + (t1 - t0) * (k / (COLS - 1));
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
