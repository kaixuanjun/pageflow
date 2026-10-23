(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  const E = PF.Engine, D = PF.PdfDoc, A = PF.app;

  const url = encodeURI('工业人车安全预警现有技术方案调研文档.pdf');
  const r = await fetch(url);
  const buf = await r.arrayBuffer();
  await D.openBytes(new Uint8Array(buf));
  A._afterOpen();
  await sl(3000);

  const cv = $('canvas'), ctx = cv.getContext('2d');
  const out = {
    pages: D.numPages, ar: +D.pageAR.toFixed(4),
    canvas: [cv.width, cv.height],
    view: [E.view.w, E.view.h, +E.view.page.w.toFixed(1), +E.view.page.h.toFixed(1)],
    frame: [$('stageFrame').clientWidth, $('stageFrame').clientHeight]
  };

  // 每帧：painter 是否重建、页面画布对象是否变化、时间
  let pid = E._painters.stage && E._painters.stage.p;
  let swaps = 0, idChanges = 0;
  let lastSrc = null;
  const rows = [];
  A.seek(0);
  await sl(500);
  A.togglePlay();
  for (let i = 0; i < 16; i++) {
    await new Promise(r2 => requestAnimationFrame(r2));
    const p = E._painters.stage && E._painters.stage.p;
    if (p !== pid) { pid = p; swaps++; }
    const src = D.getPageSync(0);
    if (lastSrc && src !== lastSrc) idChanges++;
    lastSrc = src;
    rows.push([+PF.state.t.toFixed(2),
      cv.width, cv.height,
      src ? src.width + 'x' + src.height : 'null',
      E._painters.stage ? E._painters.stage.key : '-']);
  }
  A.togglePlay();
  out.painterSwaps = swaps;
  out.page0IdentityChanges = idChanges;
  out.rows = rows;

  // 拼 4x4 连续帧
  const SW = 240, SH = 135;
  const sheet = document.createElement('canvas');
  sheet.width = SW * 4; sheet.height = SH * 4;
  const c = sheet.getContext('2d');
  A.seek(0.2);
  await sl(400);
  A.togglePlay();
  for (let i = 0; i < 16; i++) {
    await new Promise(r2 => requestAnimationFrame(r2));
    c.drawImage(cv, (i % 4) * SW, Math.floor(i / 4) * SH, SW, SH);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 12px monospace';
    c.fillText(PF.state.t.toFixed(2), (i % 4) * SW + 4, Math.floor(i / 4) * SH + 14);
  }
  A.togglePlay();
  console.log('PROBE ' + JSON.stringify(out));
  return sheet.toDataURL('image/png');
})()
