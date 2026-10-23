(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 640, CH = 360, PAD = 8, LAB = 18, COLS = 4;
  const times = [5.40, 5.90, 6.40, 6.90, 7.15, 7.40];
  const ROWS = 2;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + ROWS * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let k = 0; k < times.length; k++) {
    const r = Math.floor(k / COLS), col = k % COLS;
    PF.app.seek(times[k]);
    await raf(); await raf();
    const x = PAD + col * (CW + PAD), y = PAD + r * (CH + LAB + PAD);
    c.drawImage(cv, x, y + LAB, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + LAB + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 13px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 5, y + 13);
  }
  return sheet.toDataURL('image/png');
})()
