(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const t0 = 2.55, t1 = 3.40, N = 8;
  const CW = 400, CH = 225, PAD = 6, LAB = 15, COLS = 4;
  const rows = Math.ceil(N / COLS);
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + rows * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let k = 0; k < N; k++) {
    const t = t0 + (t1 - t0) * (k / (N - 1));
    PF.app.seek(t);
    await raf(); await raf();
    const col = k % COLS, row = Math.floor(k / COLS);
    const x = PAD + col * (CW + PAD), y = PAD + row * (CH + LAB + PAD) + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 11px monospace';
    c.fillText('t=' + t.toFixed(2), x + 5, y + 12);
  }
  return sheet.toDataURL('image/png');
})()

