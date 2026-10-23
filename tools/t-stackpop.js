(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 480, CH = 270, PAD = 6, LAB = 16, COLS = 5, ROWS = 2;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + ROWS * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  const times = [];
  for (let t = 0.20; t <= 0.78; t += 0.03) times.push(Math.round(t * 100) / 100);

  for (let k = 0; k < times.length && k < COLS * ROWS; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const col = k % COLS, row = (k - col) / COLS;
    const x = PAD + col * (CW + PAD), y = PAD + row * (CH + LAB + PAD) + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b';
    c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 12px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 5, y - 5);
  }
  return sheet.toDataURL('image/png');
})()
