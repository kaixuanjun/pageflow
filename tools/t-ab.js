(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  PF.state.kfs = [
    PF.core.makeKeyframe(0, 'stack', 5),
    PF.core.makeKeyframe(1.2, 'stack', 6)
  ];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 3;

  const CW = 640, CH = 360, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + 3 * (CW + PAD);
  sheet.height = PAD + 2 * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');
  const slot = PF.Engine._painters.stage;
  const gl = slot && slot.p && slot.p.gl;

  const labels = ['旧：只有整页排序（关掉深度测试）', '新：逐像素深度测试'];
  const times = [0.45, 0.6, 0.75];

  for (let row = 0; row < 2; row++) {
    if (row === 0) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST);
    const y = PAD + row * (CH + LAB + PAD);
    c.fillStyle = row === 0 ? '#ff6262' : '#ccff4d';
    c.font = 'bold 14px monospace';
    c.fillText(labels[row], PAD, y + 13);
    for (let k = 0; k < times.length; k++) {
      PF.app.seek(times[k]);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b';
      c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d';
      c.font = 'bold 12px monospace';
      c.fillText('t=' + times[k].toFixed(2), x + 6, yy + 16);
    }
  }
  gl.enable(gl.DEPTH_TEST);
  return sheet.toDataURL('image/png');
})()
