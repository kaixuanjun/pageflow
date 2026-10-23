(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);

  const ASPECT = '9:16', CW = 225, CH = 400;
  PF.app.setAspect(ASPECT);
  await sl(300);

  const ids = PF.core.LAYOUTS.map(l => l.id);
  const sheet = document.createElement('canvas');
  sheet.width = CW * 4 + 10 * 5;
  sheet.height = CH * 2 + 10 * 3;
  const g = sheet.getContext('2d');
  g.fillStyle = '#07070a';
  g.fillRect(0, 0, sheet.width, sheet.height);
  const src = document.getElementById('canvas');
  const raf = () => new Promise(r => requestAnimationFrame(r));

  for (let i = 0; i < ids.length; i++) {
    const kf = PF.state.kfs[0];
    kf.layout = ids[i];
    kf.focus = 3;
    PF.app.selectKf(kf.id);
    await raf(); await raf(); await raf();
    const cx = 10 + (i % 4) * (CW + 10);
    const cy = 10 + Math.floor(i / 4) * (CH + 10);
    g.drawImage(src, cx, cy, CW, CH);
    const l = PF.core.LAYOUT_MAP[ids[i]];
    g.fillStyle = 'rgba(0,0,0,.62)';
    g.fillRect(cx, cy + CH - 24, 150, 24);
    g.fillStyle = '#ccff4d';
    g.font = '600 13px "Segoe UI", system-ui, sans-serif';
    g.fillText(l.name + '  ' + l.id, cx + 8, cy + CH - 7);
  }
  return sheet.toDataURL('image/png');
})()

