(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);

  const COLS = 3, ROWS = 3, CW = 512, CH = 288, GAP = 10;
  const sheet = document.createElement('canvas');
  sheet.width = COLS * CW + GAP * (COLS + 1);
  sheet.height = ROWS * CH + GAP * (ROWS + 1);
  const g = sheet.getContext('2d');
  g.fillStyle = '#07070a';
  g.fillRect(0, 0, sheet.width, sheet.height);

  const src = document.getElementById('canvas');
  const times = [];
  for (let i = 0; i < COLS * ROWS; i++) times.push(+(i * (PF.state.dur / (COLS * ROWS - 1))).toFixed(2));

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    PF.app.seek(t);
    await raf(); await raf(); await raf();
    const cx = GAP + (i % COLS) * (CW + GAP);
    const cy = GAP + Math.floor(i / COLS) * (CH + GAP);
    g.drawImage(src, cx, cy, CW, CH);

    /* 当前生效的关键帧布局 */
    let lay = 'single', n = 0;
    PF.state.kfs.forEach(k => { if (k.t <= t + 1e-6) { lay = k.layout; n = k.focus; } });
    const name = (PF.core.LAYOUT_MAP[lay] && PF.core.LAYOUT_MAP[lay].name) || lay;
    g.fillStyle = 'rgba(0,0,0,.62)';
    g.fillRect(cx, cy + CH - 26, 210, 26);
    g.fillStyle = '#ccff4d';
    g.font = '600 13px "Segoe UI", system-ui, sans-serif';
    g.fillText('t=' + t.toFixed(1) + 's  ' + name + '  p' + (n + 1), cx + 8, cy + CH - 8);
  }
  return sheet.toDataURL('image/png');
})()
