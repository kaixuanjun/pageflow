(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const n = PF.PdfDoc.numPages;
  const ctx = { n: n, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const out = {};

  function probe(name, kfs, steps) {
    const prev = {};
    const events = [];
    let maxRankJump = 0, worst = null;
    for (let s = 0; s <= steps; s++) {
      const t = (kfs[kfs.length - 1].t) * s / steps;
      const sc = PF.core.sampleScene(kfs, t, ctx);
      const vis = [];
      for (let i = 0; i < sc.poses.length; i++) if (sc.poses[i].opacity > 0.004) vis.push(i);
      vis.sort((a, b) => sc.poses[a].z - sc.poses[b].z);
      const rank = {};
      vis.forEach((i, k) => { rank[i] = k; });
      for (const i in rank) {
        const p = prev[i];
        if (p && p.rank !== rank[i]) {
          const dr = rank[i] - p.rank;
          if (Math.abs(dr) > maxRankJump) {
            maxRankJump = Math.abs(dr);
            worst = { page: +i, t: +t.toFixed(3), from: p.rank, to: rank[i], z: +sc.poses[i].z.toFixed(1), zPrev: p.z };
          }
          events.push({ page: +i, t: +t.toFixed(3), dr, z: +sc.poses[i].z.toFixed(1) });
        }
      }
      for (const i of vis) prev[i] = { rank: rank[i], z: +sc.poses[i].z.toFixed(1) };
      for (const i in prev) if (!(i in rank)) delete prev[i];
    }
    out[name] = { steps, maxRankJump, worst, ties: events.length };
  }

  probe('book 5->6', [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)], 120);
  probe('book 5->12', [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 12)], 120);
  probe('coverflow 0->5', [PF.core.makeKeyframe(0, 'coverflow', 0), PF.core.makeKeyframe(1.2, 'coverflow', 5)], 120);
  probe('stack 0->6', [PF.core.makeKeyframe(0, 'stack', 0), PF.core.makeKeyframe(1.2, 'stack', 6)], 120);

  /* 书本翻页中每一页的 z / draw rank 轨迹（0.4~0.6 段，最密集） */
  const kf = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  const trace = [];
  for (let s = 45; s <= 60; s++) {
    const t = 1.2 * s / 120;
    const sc = PF.core.sampleScene(kf, t, ctx);
    const vis = [];
    for (let i = 0; i < sc.poses.length; i++) if (sc.poses[i].opacity > 0.004) vis.push(i);
    vis.sort((a, b) => sc.poses[a].z - sc.poses[b].z);
    trace.push({
      t: +t.toFixed(3),
      top: vis.map(i => i).join('>'),
      z: vis.map(i => i + ':' + sc.poses[i].z.toFixed(0) + '@' + sc.poses[i].x.toFixed(0)).join(' ')
    });
  }
  out.trace = trace;
  const lines = [];
  for (const k in out) {
    if (k === 'trace') continue;
    const v = out[k];
    lines.push(k + ' maxJump=' + v.maxRankJump + ' ties=' + v.ties + ' worst=' + JSON.stringify(v.worst));
  }
  lines.push('TRACE');
  for (const r of trace) lines.push('  t=' + r.t + ' order=' + r.top + ' | ' + r.z);
  return lines.join('\n');
})()
