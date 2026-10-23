(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const n = PF.PdfDoc.numPages;
  const V = { w: PF.Engine.view.w, h: PF.Engine.view.h };
  const page = PF.Engine.view.page;
  const kfs = PF.state.kfs;
  const ctx = { n: n, V: V, page: page };

  function vis(p) { return p.opacity > 0.05; }
  function rect(p) {
    const hw = page.w / 2 * p.scale, hh = page.h / 2 * p.scale;
    return { x0: p.x - hw, x1: p.x + hw, y0: p.y - hh, y1: p.y + hh };
  }
  function overlap(a, b) {
    const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return (w > 0 && h > 0) ? (w * h) / (page.w * page.h) : 0;
  }

  let prev = null;
  const flips = [];
  const STEPS = 480;
  for (let s = 0; s <= STEPS; s++) {
    const t = 12 * s / STEPS;
    const sc = PF.core.sampleScene(kfs, t, ctx);
    const order = sc.poses.map((p, i) => i)
      .filter(i => vis(sc.poses[i]))
      .sort((a, b) => sc.poses[a].z - sc.poses[b].z);   /* 升序：先画远的 */
    if (prev) {
      const pa = sc.poses;
      for (let a = 0; a < order.length; a++) {
        for (let b = a + 1; b < order.length; b++) {
          const i = order[a], j = order[b];
          const wasI = prev.order.indexOf(i), wasJ = prev.order.indexOf(j);
          if (wasI < 0 || wasJ < 0) continue;
          if ((wasI - wasJ) * (a - b) < 0) {                /* 名次互换了 */
            const ov = overlap(rect(pa[i]), rect(pa[j]));
            if (ov > 0.02) {
              flips.push({ t: t, i: i, j: j, ov: ov, zi: pa[i].z, zj: pa[j].z });
            }
          }
        }
      }
    }
    prev = { order: order };
  }

  const byT = {};
  for (const f of flips) {
    const k = f.t.toFixed(2);
    if (!byT[k]) byT[k] = { t: f.t, ov: 0, list: [] };
    byT[k].ov = Math.max(byT[k].ov, f.ov);
    if (byT[k].list.length < 4) byT[k].list.push('p' + f.i + '↔p' + f.j);
  }
  const top = Object.values(byT).sort((a, b) => b.ov - a.ov).slice(0, 12);
  const lines = ['可见页层级互换次数: ' + flips.length];
  for (const o of top) {
    const near = kfs.filter(k => Math.abs(k.t - o.t) < 1.5).map(k => k.layout + '#' + k.focus).join('→');
    lines.push('t=' + o.t.toFixed(2) + '  重叠=' + (o.ov * 100).toFixed(1) + '%  ' + o.list.join(' ') + '  [' + near + ']');
  }
  return lines.join('\n');
})()
