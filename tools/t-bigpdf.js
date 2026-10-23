(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  const E = PF.Engine, D = PF.PdfDoc, A = PF.app;

  const r = await fetch('assets/big.pdf');
  const buf = await r.arrayBuffer();
  await D.openBytes(new Uint8Array(buf));
  A._afterOpen();
  await sl(2500);

  const cv = $('canvas');
  const out = {
    pages: D.numPages,
    canvas: [cv.width, cv.height],
    cap: D._cap, h: D._h
  };

  let pid = E._painters.stage && E._painters.stage.p;
  let swaps = 0, idChanges = 0, nulls = 0, lows = 0;
  let lastSrc = null;
  const rows = [];
  const TEND = PF.state.kfs[PF.state.kfs.length - 1].t;
  out.probedAt = TEND;
  A.seek(TEND);
  await sl(600);
  A.togglePlay();
  for (let i = 0; i < 20; i++) {
    await new Promise(r2 => requestAnimationFrame(r2));
    const p = E._painters.stage && E._painters.stage.p;
    if (p !== pid) { pid = p; swaps++; }
    const src = D.getPageSync(0);
    if (!src) nulls++;
    else if (src.height < 300) lows++;
    if (lastSrc && src !== lastSrc) idChanges++;
    lastSrc = src;
    rows.push([+PF.state.t.toFixed(2), src ? src.width + 'x' + src.height : 'null']);
  }
  A.togglePlay();
  out.painterSwaps = swaps;
  out.identityChanges = idChanges;
  out.nullFrames = nulls;
  out.lowResFrames = lows;
  out.rows = rows;

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
