(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const slot = PF.Engine._painters.stage;
  const gl = slot && slot.p && slot.p.gl;
  if (!gl) return 'NO_GL';

  const cv = document.getElementById('canvas');
  const S = 192, H = 108;
  const a = document.createElement('canvas'); a.width = S; a.height = H;
  const b = document.createElement('canvas'); b.width = S; b.height = H;
  const ca = a.getContext('2d', { willReadFrequently: true });
  const cb = b.getContext('2d', { willReadFrequently: true });

  const n = PF.PdfDoc.numPages;
  const ctx = { n: n, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const kfs = PF.state.kfs;

  function grab(g) {
    ca.drawImage(cv, 0, 0, S, H);
    const d = ca.getImageData(0, 0, S, H).data;
    const out = new Float32Array(S * H);
    for (let k = 0, p = 0; k < d.length; k += 4, p++) out[p] = d[k] * 0.3 + d[k + 1] * 0.6 + d[k + 2] * 0.1;
    return out;
  }

  const rows = [];
  for (let f = 0; f <= 360; f++) {
    const t = f / 30;
    const sc = PF.core.sampleScene(kfs, t, ctx);
    gl.disable(gl.DEPTH_TEST);
    PF.Engine.render(sc);
    const A = grab();
    gl.enable(gl.DEPTH_TEST);
    PF.Engine.render(sc);
    const B = grab();
    let mad = 0, changed = 0;
    for (let p = 0; p < A.length; p++) {
      const d = Math.abs(A[p] - B[p]);
      mad += d;
      if (d > 6) changed++;
    }
    rows.push({ t: t, mad: mad / A.length, changed: changed / A.length });
  }

  const worst = rows.slice().sort((x, y) => y.changed - x.changed).slice(0, 10);
  const lines = [];
  for (const w of worst) {
    const near = kfs.filter(k => Math.abs(k.t - w.t) < 1.4).map(k => k.layout + '#' + k.focus).join('→');
    lines.push('t=' + w.t.toFixed(2) + ' 差异像素=' + (w.changed * 100).toFixed(1) + '%  段:' + near);
  }
  const anyBig = rows.filter(r => r.changed > 0.01).length;
  lines.unshift('有可见差异的帧数(>1% 像素): ' + anyBig + ' / ' + rows.length);
  return lines.join('\n');
})()
