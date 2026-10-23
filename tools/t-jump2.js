(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const halfW = ctx.V.w / 2, halfH = ctx.V.h / 2;
  const T0 = 4.6, T1 = 8.4;                     /* 覆盖 3→4→5→6 三处过渡 */
  const STEPS = Math.round((T1 - T0) * 60);
  let prev = null;
  const worst = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = T0 + (T1 - T0) * s / STEPS;
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const cur = sc.poses.map(p => ({ x: p.x, y: p.y, z: p.z, ry: p.ry, sc: p.scale, o: p.opacity }));
    if (prev) {
      let mx = 0, mz = 0, mr = 0, who = -1, whoZ = -1;
      for (let i = 0; i < cur.length; i++) {
        /* 只统计「这一帧或上一帧在画面内、且不完全透明」的页 */
        const on = (p) => Math.abs(p.x) < halfW * 1.1 && Math.abs(p.y) < halfH * 1.1 && p.o > 0.04;
        if (!on(cur[i]) && !on(prev[i])) continue;
        const dx = Math.abs(cur[i].x - prev[i].x), dz = Math.abs(cur[i].z - prev[i].z);
        const dr = Math.abs(cur[i].ry - prev[i].ry) * 180 / Math.PI;
        if (dx > mx) { mx = dx; who = i; }
        if (dz > mz) { mz = dz; whoZ = i; }
        if (dr > mr) mr = dr;
      }
      worst.push({ t: t, dx: mx, dz: mz, dr: mr, who: who, whoZ: whoZ });
    }
    prev = cur;
  }
  const byX = worst.slice().sort((a, b) => b.dx - a.dx).slice(0, 6);
  const byZ = worst.slice().sort((a, b) => b.dz - a.dz).slice(0, 4);
  const byR = worst.slice().sort((a, b) => b.dr - a.dr).slice(0, 4);
  const f = (r) => 't=' + r.t.toFixed(3) + ' p' + r.who + ' Δx=' + r.dx.toFixed(1);
  const fz = (r) => 't=' + r.t.toFixed(3) + ' p' + r.whoZ + ' Δz=' + r.dz.toFixed(1);
  const fr = (r) => 't=' + r.t.toFixed(3) + ' Δry=' + r.dr.toFixed(1) + '°';
  const allX = worst.map(r => r.dx).sort((a, b) => a - b);
  return '画面内页面·单帧位移 top6:\n' + byX.map(f).join('\n') +
         '\n\n画面内页面·单帧 z 变化 top4:\n' + byZ.map(fz).join('\n') +
         '\n\n画面内页面·单帧转角 top4:\n' + byR.map(fr).join('\n') +
         '\n\nΔx 中位数=' + allX[Math.floor(allX.length / 2)].toFixed(1) +
         ' p90=' + allX[Math.floor(allX.length * 0.9)].toFixed(1) +
         ' 最大=' + allX[allX.length - 1].toFixed(1);
})()
