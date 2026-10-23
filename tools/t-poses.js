(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);
  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const out = [];
  for (const t of [5.40, 5.90, 6.40, 6.90]) {
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const rows = sc.poses.map((p, i) => i + ' x=' + p.x.toFixed(0) + ' z=' + p.z.toFixed(0) + ' ry=' + (p.ry / Math.PI * 180).toFixed(0) + ' o=' + p.opacity.toFixed(2)).slice(0, 9);
    out.push('t=' + t + '  focus=' + sc.focus.toFixed(2) + '\n  ' + rows.join('\n  '));
  }
  return out.join('\n');
})()
