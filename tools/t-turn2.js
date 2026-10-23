(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const times = [0.58, 0.72, 0.86];
  const SX = 300, SY = 40, SW = 680, SH = 640;      /* 从 1280×720 画布上裁的源区 */
  const PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (SW + PAD);
  sheet.height = PAD + SH + LAB;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 2;

  for (let k = 0; k < times.length; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const x = PAD + k * (SW + PAD), y = LAB;
    c.drawImage(cv, SX, SY, SW, SH, x, y, SW, SH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + 0.5, SW - 1, SH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 14px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 6, 13);
  }
  return sheet.toDataURL('image/png');
})()
