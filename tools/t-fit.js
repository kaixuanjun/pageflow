(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);
  const rep = {};
  for (const asp of ['16:9', '9:16']) {
    PF.app.setAspect(asp);
    const V = { w: PF.Engine.view.w, h: PF.Engine.view.h };
    const pg = PF.Engine.view.page;
    const ctx = { n: PF.PdfDoc.numPages, V, page: pg };
    const row = { V: [V.w, V.h], page: [pg.w, pg.h] };
    for (const t of [3.0, 5.2]) {
      const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, vis = 0;
      sc.poses.forEach(p => {
        if (p.opacity <= 0.02) return;
        vis++;
        const w = pg.w * p.scale / 2, h = pg.h * p.scale / 2;
        minX = Math.min(minX, p.x - w); maxX = Math.max(maxX, p.x + w);
        minY = Math.min(minY, p.y - h); maxY = Math.max(maxY, p.y + h);
      });
      row['t' + t] = {
        vis, bbox: [Math.round(minX), Math.round(maxX), Math.round(minY), Math.round(maxY)],
        fits: (maxX - minX) <= V.w + 1 && (maxY - minY) <= V.h + 1,
        cam: sc.cam
      };
    }
    rep[asp] = row;
  }
  return JSON.stringify(rep, null, 1);
})()
