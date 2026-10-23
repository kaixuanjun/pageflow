(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const probe = (t) => PF.core.sampleScene(PF.state.kfs, t, ctx).poses;
  const out = [];
  const pairs = [[3.9, 'book#1→book#2 起点'], [5.4, 'book#2→coverflow 起点'], [7.4, 'coverflow→tile 起点'], [9.6, '末尾']];
  for (const [t0, label] of pairs) {
    const a = probe(t0 - 0.002), b = probe(t0 + 0.002);
    let mx = 0, mz = 0, mo = 0, who = -1;
    for (let i = 0; i < a.length; i++) {
      const dx = Math.abs(b[i].x - a[i].x), dz = Math.abs(b[i].z - a[i].z), dO = Math.abs(b[i].opacity - a[i].opacity);
      if (dx > mx) { mx = dx; who = i; }
      if (dz > mz) mz = dz;
      if (dO > mo) mo = dO;
    }
    out.push(label + ' @' + t0 + '：跨边界 0.004s 最大 Δx=' + mx.toFixed(2) + '（p' + who + '） Δz=' + mz.toFixed(2) + ' Δalpha=' + mo.toFixed(3));
  }
  return out.join('\n');
})()
