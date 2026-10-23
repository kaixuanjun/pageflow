(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);
  PF.state.dur = 2.5;
  $('inpDur').value = 2.5;
  PF.Export.open();
  $('expRes').children[0].click();   // 720p
  $('expFps').children[0].click();   // 30
  $('btnStartExport').click();
  for (let i = 0; i < 200; i++) {
    if (!$('exportDone').hidden) break;
    await sl(300);
  }
  const v = $('expVideo');
  await new Promise(r => { if (v.readyState >= 2) return r(); v.onloadeddata = r; setTimeout(r, 6000); });

  const sheet = document.createElement('canvas');
  sheet.width = 1920; sheet.height = 360 + 1080;
  const c = sheet.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, sheet.width, sheet.height);

  for (let i = 0; i < 3; i++) {
    const t = 0.3 + i * 1.0;
    v.currentTime = t;
    await new Promise(r => { v.onseeked = r; setTimeout(r, 600); });
    c.drawImage(v, i * 640, 0, 640, 360);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 20px "Segoe UI", sans-serif';
    c.fillText('t=' + t.toFixed(1) + 's', i * 640 + 12, 30);
  }

  // 中段帧 2 倍放大（看文字是否还被抽成横条 / 有没有接缝）
  v.currentTime = 1.3;
  await new Promise(r => { v.onseeked = r; setTimeout(r, 600); });
  c.drawImage(v, 260, 80, 960, 540, 0, 360, 1920, 1080);
  c.fillStyle = '#ccff4d';
  c.font = 'bold 20px "Segoe UI", sans-serif';
  c.fillText('2x 放大 · t=1.3s', 12, 388);

  return sheet.toDataURL('image/png');
})()
