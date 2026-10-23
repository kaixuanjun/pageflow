(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const kfs = PF.state.kfs, dur = PF.state.dur;

  function timeBuild() {
    PF.Phys.invalidate();
    const a = performance.now();
    PF.core.sampleScene(kfs, 0, ctx);
    return performance.now() - a;
  }
  const b1 = timeBuild(), b2 = timeBuild(), b3 = timeBuild();

  /* 查表采样一次多少钱 */
  const a2 = performance.now();
  for (let k = 0; k < 300; k++) PF.core.sampleScene(kfs, (k % 120) / 10, ctx);
  const perSample = (performance.now() - a2) / 300;

  /* 播放时的帧率：连续 90 帧 */
  PF.app.seek(0);
  await sl(300);
  PF.app.togglePlay();
  const stamps = [];
  await new Promise(res => {
    let last = performance.now(), k = 0;
    function tick() {
      const now = performance.now();
      stamps.push(now - last); last = now;
      if (++k < 90) requestAnimationFrame(tick); else res();
    }
    requestAnimationFrame(tick);
  });
  PF.app.togglePlay();
  stamps.sort((a, b) => a - b);

  return JSON.stringify({
    buildMs: [b1, b2, b3].map(v => +v.toFixed(1)),
    perSampleMs: +perSample.toFixed(3),
    frameMs: { median: +stamps[45].toFixed(1), p90: +stamps[81].toFixed(1) },
    stats: PF.Phys.stats()
  });
})()
