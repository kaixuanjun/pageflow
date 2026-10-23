(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const times = [0.15, 0.35, 0.5, 0.65, 0.8, 1.0];
  const CW = 640, CH = 360, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 3 * (CW + PAD);
  sheet.height = PAD + 2 * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 2;

  for (let k = 0; k < times.length; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const r = Math.floor(k / 3), col = k % 3;
    const x = PAD + col * (CW + PAD), y = PAD + r * (CH + LAB + PAD) + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 5, y + 15);
  }
  return sheet.toDataURL('image/png');
})()
