(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const n = PF.PdfDoc.numPages;
  const SW = 240, SH = 135;
  const palette = [];
  for (let i = 0; i < n; i++) {
    /* 每页一个高辨识度的纯色（互相差别够大，混色后也能最近邻解出来） */
    const c = document.createElement('canvas');
    c.width = 64; c.height = 90;
    const g = c.getContext('2d');
    const r = 40 + (i * 53) % 200, gg = 40 + (i * 97) % 200, b = 40 + (i * 151) % 200;
    g.fillStyle = 'rgb(' + r + ',' + gg + ',' + b + ')';
    g.fillRect(0, 0, 64, 90);
    palette.push({ c: c, r: r, g: gg, b: b });
  }
  const canvases = palette.map(p => p.c);

  const orig = PF.Engine.getPage;
  PF.Engine.getPage = function (idx) { return canvases[idx] || null; };

  const cv = document.getElementById('canvas');
  const tmp = document.createElement('canvas');
  tmp.width = SW; tmp.height = SH;
  const tc = tmp.getContext('2d', { willReadFrequently: true });

  function idMap() {
    tc.clearRect(0, 0, SW, SH);
    tc.drawImage(cv, 0, 0, SW, SH);
    const d = tc.getImageData(0, 0, SW, SH).data;
    const out = new Int8Array(SW * SH).fill(-1);
    for (let p = 0, k = 0; p < d.length; p += 4, k++) {
      const r = d[p], g = d[p + 1], b = d[p + 2];
      if (r + g + b < 40) continue;                    /* 背景 */
      let best = -1, bd = 1e9;
      for (let i = 0; i < palette.length; i++) {
        const q = palette[i];
        const dd = (r - q.r) * (r - q.r) + (g - q.g) * (g - q.g) + (b - q.b) * (b - q.b);
        if (dd < bd) { bd = dd; best = i; }
      }
      if (bd < 9000) out[k] = best;
    }
    return out;
  }

  const ctx = { n: n, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const kfs = PF.state.kfs;
  const STEPS = 720;                                  /* 1/60s */
  let prev = null;
  const rows = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = 12 * s / STEPS;
    const sc = PF.core.sampleScene(kfs, t, ctx);
    for (let i = 0; i < sc.poses.length; i++) sc.poses[i].opacity = 1;  /* 半透明会混色，令 id 判断失真 */
    PF.Engine.render(sc);
    const m = idMap();
    let page = 0, change = 0;
    for (let k = 0; k < m.length; k++) {
      if (m[k] >= 0) page++;
      if (prev && prev[k] !== m[k]) change++;
    }
    rows.push({ t: t, area: page / m.length, churn: change / m.length });
    prev = m;
  }
  PF.Engine.getPage = orig;

  const top = rows.slice().sort((a, b) => b.churn - a.churn).slice(0, 12);
  const lines = ['画面被页面覆盖比例中位数: ' + (100 * rows.map(r => r.area).sort((a, b) => a - b)[Math.floor(rows.length / 2)]).toFixed(1) + '%'];
  for (const r of top) {
    const near = kfs.filter(k => Math.abs(k.t - r.t) < 1.5).map(k => k.layout + '#' + k.focus).join('→');
    lines.push('t=' + r.t.toFixed(2) + '  换手面积=' + (r.churn * 100).toFixed(1) + '%  [' + near + ']');
  }
  return lines.join('\n');
})()
