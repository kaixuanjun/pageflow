(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  /* 竖屏 + 最高分辨率 + 60fps，同时验证 offscreen 渲染路径 */
  PF.app.setAspect('9:16');
  await sl(300);
  PF.state.dur = 2.0;
  $('inpDur').value = 2.0;
  PF.Export.open();
  [...$('expAspect').children].find(b => b.dataset.v === '9:16').click();
  [...$('expRes').children].find(b => b.dataset.v === '2560').click();
  [...$('expFps').children].find(b => b.dataset.v === '60').click();
  const sizeLabel = $('expSize').textContent;

  const t0 = performance.now();
  $('btnStartExport').click();
  for (let i = 0; i < 300; i++) {
    if (!$('exportDone').hidden) break;
    if ($('exportRun').hidden && !$('exportSetup').hidden) break;
    await sl(300);
  }
  const ms = Math.round(performance.now() - t0);
  const v = $('expVideo');
  await new Promise(r => {
    if (v.readyState >= 2) return r();
    v.onloadeddata = r; v.onerror = r; setTimeout(r, 8000);
  });

  /* 从视频里抽 3 帧看是否真有画面 */
  let stats = null;
  try {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 240 * (v.videoHeight / v.videoWidth);
    const g = c.getContext('2d');
    stats = [];
    for (const t of [0.2, 1.0, 1.8]) {
      v.currentTime = t;
      await new Promise(r => { v.onseeked = r; setTimeout(r, 900); });
      g.drawImage(v, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, bright = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += l; if (l > 170) bright++;
      }
      stats.push({ t, mean: Math.round(sum / (d.length / 4)), brightPct: +(100 * bright / (d.length / 4)).toFixed(1) });
    }
  } catch (e) { stats = String(e); }

  return JSON.stringify({
    ms, sizeLabel, info: $('doneInfo').textContent, done: !$('exportDone').hidden,
    vw: v.videoWidth, vh: v.videoHeight, dur: v.duration, verr: v.error && v.error.code,
    bytes: PF.Export._S.blob && PF.Export._S.blob.size, stats
  });
})()
