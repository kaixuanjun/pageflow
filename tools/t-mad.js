(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const cv = document.getElementById('canvas');
  const W = 240, H = 135;
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d', { willReadFrequently: true });

  const T0 = 5.4, T1 = 7.4, STEPS = Math.round((T1 - T0) * 60);
  let prev = null;
  const rows = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = T0 + (T1 - T0) * s / STEPS;
    PF.app.seek(t);
    await raf(); await raf();
    tc.drawImage(cv, 0, 0, W, H);
    const d = tc.getImageData(0, 0, W, H).data;
    if (prev) {
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) {
        const a = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
        const b = (prev[i] * 0.3 + prev[i + 1] * 0.59 + prev[i + 2] * 0.11);
        sum += Math.abs(a - b);
      }
      rows.push({ t: t, mad: sum / (W * H) });
    }
    prev = d;
  }
  const mads = rows.map(r => r.mad).sort((a, b) => a - b);
  const med = mads[Math.floor(mads.length / 2)];
  const top = rows.slice().sort((a, b) => b.mad - a.mad).slice(0, 8);
  const fmt = r => 't=' + r.t.toFixed(3) + ' mad=' + r.mad.toFixed(2) + ' ×' + (r.mad / med).toFixed(2);
  return '帧间像素差（240×135 亮度 MAD, 1/60s 步长, 5.4→7.4s）\n中位数=' + med.toFixed(2) +
    '\n最大:\n' + top.map(fmt).join('\n');
})()
