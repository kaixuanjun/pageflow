(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const T0 = 5.40, T1 = 7.40, STEPS = Math.round((T1 - T0) * 60);
  let prev = null;
  const worst = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = T0 + (T1 - T0) * s / STEPS;
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const cur = sc.poses.map(p => ({ x: p.x, y: p.y, z: p.z, ry: p.ry, sc: p.scale, o: p.opacity }));
    if (prev) {
      let mx = 0, mz = 0, mr = 0, ms = 0, mo = 0, who = 0;
      for (let i = 0; i < cur.length; i++) {
        const dx = Math.abs(cur[i].x - prev[i].x), dz = Math.abs(cur[i].z - prev[i].z);
        const dr = Math.abs(cur[i].ry - prev[i].ry) * 180 / Math.PI, ds = Math.abs(cur[i].sc - prev[i].sc);
        const doo = Math.abs(cur[i].o - prev[i].o);
        if (dx > mx) { mx = dx; who = i; }
        if (dz > mz) mz = dz;
        if (dr > mr) mr = dr;
        if (ds > ms) ms = ds;
        if (doo > mo) mo = doo;
      }
      worst.push({ t: t, dx: mx, dz: mz, dr: mr, ds: ms, do: mo, who: who });
    }
    prev = cur;
  }
  const byX = worst.slice().sort((a, b) => b.dx - a.dx).slice(0, 6);
  const byR = worst.slice().sort((a, b) => b.dr - a.dr).slice(0, 6);
  const byO = worst.slice().sort((a, b) => b.do - a.do).slice(0, 6);
  const fmt = (r) => 't=' + r.t.toFixed(3) + ' p' + r.who + ' Δx=' + r.dx.toFixed(1) + ' Δz=' + r.dz.toFixed(1) + ' Δry=' + r.dr.toFixed(1) + '° Δs=' + r.ds.toFixed(3) + ' Δalpha=' + r.do.toFixed(3);
  return '每帧最大位移(单帧, 1/60s):\n' + byX.map(fmt).join('\n') +
         '\n\n每帧最大转角:\n' + byR.map(fmt).join('\n') +
         '\n\n每帧最大透明度变化:\n' + byO.map(fmt).join('\n');
})()
