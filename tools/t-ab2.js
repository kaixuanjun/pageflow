(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const slot = PF.Engine._painters.stage;
  const gl = slot && slot.p && slot.p.gl;
  const n = PF.PdfDoc.numPages;
  const ctx = { n: n, V: { w: PF.Engine.view.w, h: PF.Engine.view.h }, page: PF.Engine.view.page };

  const CW = 940, CH = 529, PAD = 8, LAB = 20;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 2 * (CW + PAD);
  sheet.height = PAD + CH + LAB + PAD;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  const t = 8.05;
  const sc = PF.core.sampleScene(PF.state.kfs, t, ctx);
  for (let k = 0; k < 2; k++) {
    if (k === 0) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
    PF.Engine.render(sc);
    await raf();
    const x = PAD + k * (CW + PAD), y = PAD + LAB;
    c.drawImage(cv, x, y, CW, CH);
    c.strokeStyle = '#26262b';
    c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
    c.fillStyle = k === 0 ? '#ff6262' : '#ccff4d';
    c.font = 'bold 16px monospace';
    c.fillText(k === 0 ? '旧：整页排序（t=8.05s coverflow）' : '新：逐像素深度（t=8.05s coverflow）', x + 6, y - 6);
  }
  gl.enable(gl.DEPTH_TEST);
  return sheet.toDataURL('image/png');
})()
