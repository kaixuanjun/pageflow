(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const cases = [
    ['fan 3→4', 'fan', 3, 4],
    ['fan 2→9 大跨度', 'fan', 2, 9],
    ['stack 5→6', 'stack', 5, 6]
  ];
  const times = [0.0, 0.3, 0.6, 0.9, 1.2];
  const CW = 400, CH = 225, PAD = 6, LAB = 15;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (CW + PAD);
  sheet.height = PAD + cases.length * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let r = 0; r < cases.length; r++) {
    const [label, layout, fA, fB] = cases[r];
    PF.state.kfs = [PF.core.makeKeyframe(0, layout, fA), PF.core.makeKeyframe(1.2, layout, fB)];
    PF.state.sel = PF.state.kfs[0].id;
    PF.state.dur = 2;
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
    c.fillText(label, PAD, y + 12);
    for (let k = 0; k < times.length; k++) {
      PF.app.seek(times[k]);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d'; c.font = 'bold 10px monospace';
      c.fillText('t=' + times[k].toFixed(1), x + 4, yy + 12);
    }
  }
  return sheet.toDataURL('image/png');
})()
