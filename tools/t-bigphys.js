(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  const E = PF.Engine, D = PF.PdfDoc, A = PF.app;

  const r = await fetch('assets/big.pdf');
  const buf = await r.arrayBuffer();
  await D.openBytes(new Uint8Array(buf));
  A._afterOpen();
  await sl(2500);

  const ctx = { n: D.numPages, V: { w: E.view.w, h: E.view.h }, page: E.view.page };
  const times = [];
  for (let k = 0; k < 3; k++) {
    PF.Phys.invalidate();
    const t0 = performance.now();
    PF.core.sampleScene(PF.state.kfs, 0, ctx);
    times.push(+(performance.now() - t0).toFixed(1));
  }
  A.seek(5.0);
  await sl(400);
  return JSON.stringify({
    pages: D.numPages,
    buildMs: times,
    stats: PF.Phys.stats(),
    fps: (function () { return null; })()
  });
})()
