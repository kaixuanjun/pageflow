(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const times = [1.2, 6.4, 8.6];
  const CW = 640, CH = 360, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (CW + PAD);
  sheet.height = PAD + CH + LAB;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  const num = [];
  for (let k = 0; k < times.length; k++) {
    PF.app.seek(times[k]);
    await raf(); await raf();
    const x = PAD + k * (CW + PAD), y = LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 13px monospace';
    c.fillText('t=' + times[k].toFixed(2), x + 6, 13);

    /* 同时量：物理位姿离目标差多少 */
    const ph = PF.core.sampleScene(PF.state.kfs, times[k], ctx);
    const tg = PF.core.targets(PF.state.kfs, times[k], ctx);
    let mx = 0, mp = null;
    for (let i = 0; i < ph.poses.length; i++) {
      const d = Math.abs(ph.poses[i].x - tg.poses[i].x) + Math.abs(ph.poses[i].y - tg.poses[i].y) + Math.abs(ph.poses[i].z - tg.poses[i].z);
      if (d > mx) { mx = d; mp = i; }
    }
    num.push({ t: times[k], maxLerpDiff: +mx.toFixed(1), page: mp, focus: +ph.focus.toFixed(2) });
  }
  return JSON.stringify({ diff: num, stats: PF.Phys.stats() });
})()
