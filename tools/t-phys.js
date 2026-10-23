(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  const t0 = performance.now();
  PF.app.loadDemo();
  await sl(7000);

  const n = PF.PdfDoc.numPages;
  const ctx = { n: n, V: PF.Engine.view ? { w: PF.Engine.view.w, h: PF.Engine.view.h } : { w: 1777, h: 1000 }, page: PF.Engine.view.page };
  if (!ctx.page) return 'no page';

  /* 第一次采样会触发整条时间轴积分 —— 量一下耗时 */
  PF.core.sampleScene(PF.state.kfs, 6.0, ctx);
  const t1 = performance.now();
  const stats = PF.Phys.stats();

  /* 采样若干时刻，看是否有 NaN / 跳变 */
  const rows = [];
  let maxJump = 0, prev = null;
  for (let k = 0; k <= 240; k++) {
    const t = 12 * k / 240;
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    if (k % 40 === 0) {
      const p = sc.poses[Math.min(2, sc.poses.length - 1)];
      rows.push([t.toFixed(2), p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1), (p.ry * 57.2958).toFixed(1)]);
    }
    if (prev) {
      for (let i = 0; i < sc.poses.length; i++) {
        const d = Math.abs(sc.poses[i].x - prev[i].x) + Math.abs(sc.poses[i].z - prev[i].z);
        if (d > maxJump) maxJump = d;
      }
    }
    prev = sc.poses;
    for (const p of sc.poses) {
      if (!isFinite(p.x) || !isFinite(p.z) || !isFinite(p.ry)) return 'NaN at t=' + t;
    }
  }
  return JSON.stringify({
    buildMs: Math.round(t1 - t0), stats: stats,
    maxJumpPerFrame: +maxJump.toFixed(1),
    rows: rows
  });
})()
