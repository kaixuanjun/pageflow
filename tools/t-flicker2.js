(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  const E = PF.Engine, A = PF.app, D = PF.PdfDoc;
  A.loadDemo();
  await sl(6500);

  const cv = document.getElementById('canvas');
  const SX = Math.round(cv.width * 0.30), SY = Math.round(cv.height * 0.18);
  const SW = 300, SH = 200;

  const sheet = document.createElement('canvas');
  sheet.width = SW * 4 + 12;
  sheet.height = SH * 3 + 8;
  const c = sheet.getContext('2d');
  c.fillStyle = '#111';
  c.fillRect(0, 0, sheet.width, sheet.height);

  A.seek(3.0);
  await sl(400);
  A.togglePlay();
  const info = [];
  for (let i = 0; i < 12; i++) {
    await new Promise(r => requestAnimationFrame(r));
    c.drawImage(cv, SX, SY, SW, SH, (i % 4) * (SW + 4), Math.floor(i / 4) * (SH + 4), SW, SH);
    c.fillStyle = '#ccff4d';
    c.font = 'bold 14px monospace';
    c.fillText('t=' + PF.state.t.toFixed(3), (i % 4) * (SW + 4) + 4, Math.floor(i / 4) * (SH + 4) + 16);
    info.push(+PF.state.t.toFixed(4));
  }
  A.togglePlay();
  console.log('PROBE ' + JSON.stringify({
    times: info,
    pagesCached: D._pages ? Object.keys(D._pages).length : -1,
    thumbsCached: D._thumbs ? Object.keys(D._thumbs).length : -1
  }));
  return sheet.toDataURL('image/png');
})()
