(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const cv = document.getElementById('canvas');
  const S = 160, H = 90;
  const small = document.createElement('canvas');
  small.width = S; small.height = H;
  const sc = small.getContext('2d', { willReadFrequently: true });

  const FPS = 60, dur = PF.state.dur;
  const frames = Math.round(dur * FPS);
  let prev = null;
  const mads = [];

  for (let i = 0; i <= frames; i++) {
    const t = i / FPS;
    PF.app.seek(t);
    await raf(); await raf();
    sc.drawImage(cv, 0, 0, S, H);
    const d = sc.getImageData(0, 0, S, H).data;
    const lum = new Float32Array(S * H);
    for (let k = 0, p = 0; k < d.length; k += 4, p++) lum[p] = d[k] * 0.299 + d[k + 1] * 0.587 + d[k + 2] * 0.114;
    let mad = 0;
    if (prev) { for (let p = 0; p < lum.length; p++) mad += Math.abs(lum[p] - prev[p]); mad /= lum.length; }
    prev = lum;
    mads.push({ t: t, mad: mad });
  }

  const sorted = mads.slice().sort((a, b) => a.mad - b.mad);
  const median = sorted[Math.floor(sorted.length / 2)].mad;
  const spikes = mads.filter(f => f.mad > median * 3 && f.t > 0)
    .sort((a, b) => b.mad - a.mad).slice(0, 16);

  const kfs = PF.state.kfs.map(k => k.t.toFixed(1) + 's:' + k.layout + '#' + k.focus).join(' ');
  const lines = ['median=' + median.toFixed(3), 'kfs= ' + kfs];
  for (const s of spikes) {
    const near = PF.state.kfs.filter(k => Math.abs(k.t - s.t) < 0.6).map(k => k.layout + '#' + k.focus).join(',');
    lines.push('  t=' + s.t.toFixed(3) + ' mad=' + s.mad.toFixed(2) + '  附近帧:' + (near || '-'));
  }
  return lines.join('\n');
})()
