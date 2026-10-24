(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const ids = ['single', 'stack', 'tile', 'book', 'fan', 'carousel', 'coverflow', 'depth'];
  const out = {};
  for (const id of ids) {
    const rows = [];
    for (const f of [0, 3, 7, 13]) {
      const poses = PF.core.layoutPoses(id, {
        n: ctx.n, p1: 1, p2: 1, V: ctx.V, page: ctx.page, focus: f, boost: 0
      });
      let top = 0;
      for (let i = 1; i < poses.length; i++) if (poses[i].z > poses[top].z) top = i;
      /* 画面里还有哪些页跟它抢：z 差距 < 40 的算"并排" */
      const rivals = [];
      for (let i = 0; i < poses.length; i++) {
        if (i === top) continue;
        if (poses[i].opacity < 0.05) continue;
        if (poses[top].z - poses[i].z < 40) rivals.push(i + ':' + (poses[top].z - poses[i].z).toFixed(0));
      }
      rows.push({ f: f, topPage: top, isFocus: top === f, rivals: rivals.slice(0, 6) });
    }
    out[id] = rows;
  }
  return JSON.stringify(out);
})()
