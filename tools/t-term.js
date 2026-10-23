(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const kfs = PF.state.kfs;
  const out = [];
  const times = [6.400, 6.417, 6.433, 6.450, 6.467];
  for (const t of times) {
    const sc = PF.core.sampleScene(kfs, t, ctx);
    const a = kfs[3], b = kfs[4];
    const e = PF.core.ease(a.ease, (t - a.t) / (b.t - a.t));
    const p1 = PF.core.lerp(a.p1, b.p1, e), p2 = PF.core.lerp(a.p2, b.p2, e);
    const fNow = PF.core.lerp(a.focus, b.focus, e);
    const base = { n: ctx.n, p1: p1, p2: p2, V: ctx.V, page: ctx.page, focus: fNow };
    const pa = PF.core.layoutPoses(a.layout, base);
    const pb = PF.core.layoutPoses(b.layout, base);
    const pick = [3, 4, 7, 8];
    out.push('t=' + t.toFixed(3) + ' f=' + fNow.toFixed(2) + ' e=' + e.toFixed(3) + '\n' +
      pick.map(i => '  p' + i + ' book(x=' + pa[i].x.toFixed(0) + ',z=' + pa[i].z.toFixed(0) + ') cov(x=' + pb[i].x.toFixed(0) + ',z=' + pb[i].z.toFixed(0) + ') → x=' + sc.poses[i].x.toFixed(0) + ' z=' + sc.poses[i].z.toFixed(0)).join('\n'));
  }
  return out.join('\n');
})()
