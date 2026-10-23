(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const times = [6.44, 6.47, 6.50, 6.53];
  const CW = 460, CH = 259, PAD = 6, LAB = 16;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (CW + PAD);
  sheet.height = PAD + CH + LAB + PAD;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');
  for (let k = 0; k < times.length; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const x = PAD + k * (CW + PAD), y = PAD;
    c.drawImage(cv, x, y + LAB, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + LAB + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 4, y + 12);
  }
  return sheet.toDataURL('image/png');
})()
