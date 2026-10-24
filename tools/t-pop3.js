(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const W = 240, H = 135;
  const cv = document.getElementById('canvas');
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d', { willReadFrequently: true });

  function grab() {
    tc.clearRect(0, 0, W, H);
    tc.drawImage(cv, 0, 0, W, H);
    return tc.getImageData(0, 0, W, H).data;
  }
  function mad(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i += 4) {
      s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    }
    return s / (a.length / 4 * 3);
  }

  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 2;

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const series = [];
  let prev = null;
  for (let k = 0; k <= 72; k++) {
    const t = 1.02 + k * (0.88 / 72);
    PF.app.seek(t);
    await raf(); await raf();
    const img = grab();
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const page6 = sc.poses[6] || {};
    const u = page6.u;
    const m = prev ? mad(prev, img) : 0;
    series.push({ t: +t.toFixed(3), u: u == null ? null : +u.toFixed(3), mad: +m.toFixed(2), sheet: !!page6.sheet });
    prev = img;
  }

  /* 找出最大跳变，以及它出现在哪一帧、附近帧的平均值 */
  let maxI = 0;
  for (let i = 1; i < series.length; i++) if (series[i].mad > series[maxI].mad) maxI = i;
  const near = series.slice(Math.max(1, maxI - 3), maxI + 4).map(s => s.mad);
  /* 找 sheet 由真变假的那一帧，以及它前后的 mad */
  let cut = -1;
  for (let i = 1; i < series.length; i++) if (series[i - 1].sheet && !series[i].sheet) { cut = i; break; }
  return JSON.stringify({
    peak: series[maxI],
    cutAt: cut < 0 ? null : series[cut],
    aroundCut: cut < 0 ? null : series.slice(Math.max(1, cut - 3), cut + 4)
  });
})()
