(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const N = 12, t0 = 1.10, t1 = 1.42;
  const CW = 480, CH = 270, PAD = 6, LAB = 15, COLS = 4;
  const rows = Math.ceil(N / COLS);
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + rows * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 2;

  const ctx = { n: PF.PdfDoc.numPages, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };
  for (let k = 0; k < N; k++) {
    const t = t0 + (t1 - t0) * (k / (N - 1));
    PF.app.seek(t);
    await raf(); await raf();
    const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
    const p6 = sc.poses[6] || {};
    const col = k % COLS, row = Math.floor(k / COLS);
    const x = PAD + col * (CW + PAD), y = PAD + row * (CH + LAB + PAD) + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
    const tag = 't=' + t.toFixed(2) + ' u=' + (p6.u == null ? '-' : p6.u.toFixed(3)) + (p6.sheet ? ' S' : ' R');
    c.fillText(tag, x + 5, y + 13);
  }
  return sheet.toDataURL('image/png');
})()
