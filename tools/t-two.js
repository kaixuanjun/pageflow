(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const CW = 940, CH = 529, PAD = 8, LAB = 20;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 2 * (CW + PAD);
  sheet.height = PAD + CH + LAB + PAD;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');
  const times = [4.25, 4.38];
  for (let k = 0; k < times.length; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const x = PAD + k * (CW + PAD), y = PAD + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b';
    c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 16px monospace';
    c.fillText('t=' + times[k].toFixed(2) + 's', x + 6, y - 6);
  }
  return sheet.toDataURL('image/png');
})()
