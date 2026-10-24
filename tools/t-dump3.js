(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  
  
  

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const out = [];
  for (const t of [5.40]) {
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const rows = [];
    for (let i = 0; i < sc.poses.length; i++) {
      const p = sc.poses[i];
      if (!p || p.opacity < 0.05) continue;
      const row = {
        i: i,
        x: +p.x.toFixed(1), z: +p.z.toFixed(1),
        ry: +(p.ry * 180 / Math.PI).toFixed(1),
        sc: +p.scale.toFixed(3),
        op: +p.opacity.toFixed(2),
        u: p.u == null ? null : +p.u.toFixed(3)
      };
      if (p.sheet) {
        const a = p.sheet.angles;
        row.sheet = side(a, p.sheet.base);
        row.a0 = +(a[0] * 180 / Math.PI).toFixed(1);
        row.aN = +(a[a.length - 1] * 180 / Math.PI).toFixed(1);
        row.base = +(p.sheet.base * 180 / Math.PI).toFixed(1);
      }
      rows.push(row);
    }
    out.push({ t: t, focus: +sc.focus.toFixed(3), rows: rows });
  }
  function side(a, base) {
    var x = 0, z = 0, L = 1 / a.length;
    for (var k = 0; k < a.length; k++) { x += Math.cos(a[k] + base) * L; z += Math.sin(a[k] + base) * L; }
    return { tipX: +x.toFixed(2), tipZ: +z.toFixed(2) };
  }
  return JSON.stringify(out);
})()
