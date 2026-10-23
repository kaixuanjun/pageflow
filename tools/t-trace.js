(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const n = PF.PdfDoc.numPages;
  const ctx = { n: n, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const kfs = PF.state.kfs;
  const lines = [];
  let hi = 0;
  for (let t = 4.20; t <= 4.52001; t += 0.02) {
    const sc = PF.core.sampleScene(kfs, t, ctx);
    const vis = [];
    for (let i = 0; i < sc.poses.length; i++) if (sc.poses[i].opacity > 0.02) vis.push(i);
    vis.sort((a, b) => b.z - a.z);   // 由近到远
    const top = vis.slice(0, 5).map(i => i + ':' + sc.poses[i].z.toFixed(0) + '@x' + sc.poses[i].x.toFixed(0) + '@s' + sc.poses[i].scale.toFixed(2) + '@o' + sc.poses[i].opacity.toFixed(2)).join('  ');
    lines.push('t=' + t.toFixed(2) + ' f=' + sc.focus.toFixed(2) + ' zoom=' + sc.cam.zoom.toFixed(3) + ' | ' + top);
    if (++hi > 20) break;
  }
  return lines.join('\n');
})()
