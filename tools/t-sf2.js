(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  const rows = [
    ['stack 5→6', 'stack', 5, 6],
    ['fan 3→4', 'fan', 3, 4]
  ];
  const times = [0.42, 0.56, 0.70];
  const CW = 640, CH = 360, PAD = 8, LAB = 18;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + times.length * (CW + PAD);
  sheet.height = PAD + rows.length * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let r = 0; r < rows.length; r++) {
    const [label, layout, fA, fB] = rows[r];
    PF.state.kfs = [
      PF.core.makeKeyframe(0, layout, fA),
      PF.core.makeKeyframe(1.2, layout, fB)
    ];
    PF.state.sel = PF.state.kfs[0].id;
    PF.state.dur = 2;
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d'; c.font = 'bold 14px monospace';
    c.fillText(label, PAD, y + 13);
    for (let k = 0; k < times.length; k++) {
      PF.app.seek(times[k]);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
      c.fillText('t=' + times[k].toFixed(2), x + 5, yy + 15);
    }
  }
  return sheet.toDataURL('image/png');
})()
