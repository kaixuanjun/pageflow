(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const times = [5.70, 5.85, 6.00, 6.15, 6.30, 6.50];
  const CW = 320, CH = 180, PAD = 6, LAB = 16;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (CW + PAD);
  sheet.height = PAD + 3 * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');
  const rows = ['整帧', '画面左半（1.6x）', '画面右半（1.6x）'];
  for (let r = 0; r < 3; r++) {
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d'; c.font = 'bold 13px monospace';
    c.fillText(rows[r], PAD, y + 12);
    for (let k = 0; k < times.length; k++) {
      const t = times[k];
      PF.app.seek(t);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      if (r === 0) c.drawImage(cv, x, yy, CW, CH);
      else {
        const sx = r === 1 ? 0 : cv.width / 2;
        c.drawImage(cv, sx, 0, cv.width / 2, cv.height * 0.5, x, yy, CW, CH);
      }
      c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d'; c.font = 'bold 11px monospace';
      c.fillText('t=' + t.toFixed(2), x + 5, yy + 14);
    }
  }
  return sheet.toDataURL('image/png');
})()
