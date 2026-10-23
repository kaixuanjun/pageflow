(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  PF.state.kfs = [
    PF.core.makeKeyframe(0, 'book', 5),
    PF.core.makeKeyframe(1.2, 'book', 6)
  ];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 3;

  const CW = 320, CH = 180, PAD = 4, COLS = 6, ROWS = 6;
  const sheet = document.createElement('canvas');
  sheet.width = COLS * (CW + PAD) + PAD;
  sheet.height = ROWS * (CH + PAD) + PAD;
  const c = sheet.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let k = 0; k < COLS * ROWS; k++) {
    const t = 1.2 * k / (COLS * ROWS - 1);
    PF.app.seek(t);
    await raf(); await raf();
    const x = PAD + (k % COLS) * (CW + PAD);
    const y = PAD + Math.floor(k / COLS) * (CH + PAD);
    c.drawImage(cv, x, y, CW, CH);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 11px monospace';
    c.fillText(t.toFixed(2) + 's', x + 4, y + 12);
  }
  return sheet.toDataURL('image/png');
})()
