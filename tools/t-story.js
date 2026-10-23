(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 480, CH = 270, PAD = 6, COLS = 4, ROWS = 3;
  const sheet = document.createElement('canvas');
  sheet.width = COLS * (CW + PAD) + PAD;
  sheet.height = ROWS * (CH + PAD) + PAD;
  const c = sheet.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  /* 默认分镜里 book#1(3.9s) → book#2(5.4s) 这一段 */
  const T0 = 4.0, T1 = 5.4;
  for (let k = 0; k < COLS * ROWS; k++) {
    const t = T0 + (T1 - T0) * k / (COLS * ROWS - 1);
    PF.app.seek(t);
    await raf(); await raf();
    const x = PAD + (k % COLS) * (CW + PAD);
    const y = PAD + Math.floor(k / COLS) * (CH + PAD);
    c.drawImage(cv, x, y, CW, CH);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 13px monospace';
    c.fillText(t.toFixed(2) + 's', x + 5, y + 15);
  }
  return sheet.toDataURL('image/png');
})()
