(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);

  /* 涓夎 脳 8 甯э細stack 5鈫?銆乫an 3鈫?銆乫an 0鈫?0锛堝ぇ璺ㄥ害锛?*/
  const rows = [
    ['stack 5鈫?  t=0.30鈥?.80', 'stack', 5, 6, 1.2, 0.30],
    ['fan 3鈫?  t=0.30鈥?.80', 'fan', 3, 4, 1.2, 0.30],
    ['fan 0鈫?0  t=0鈥?.20', 'fan', 0, 10, 1.2, 0.00]
  ];
  const COLS = 8, CW = 240, CH = 135, PAD = 6, LAB = 15;
  const sheet = document.createElement('canvas');
  sheet.width = PAD + COLS * (CW + PAD);
  sheet.height = PAD + rows.length * (CH + LAB + PAD);
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a'; c.fillRect(0, 0, sheet.width, sheet.height);
  const cv = document.getElementById('canvas');

  for (let r = 0; r < rows.length; r++) {
    const [label, layout, fA, fB, dur, t0] = rows[r];
    PF.state.kfs = [
      PF.core.makeKeyframe(0, layout, fA),
      PF.core.makeKeyframe(dur, layout, fB)
    ];
    PF.state.sel = PF.state.kfs[0].id;
    PF.state.dur = 2;
    const y = PAD + r * (CH + LAB + PAD);
    c.fillStyle = '#ccff4d'; c.font = 'bold 12px monospace';
    c.fillText(label, PAD, y + 11);
    for (let k = 0; k < COLS; k++) {
      const t = t0 + (dur - t0) * (k / (COLS - 1));
      PF.app.seek(t);
      await raf(); await raf();
      const x = PAD + k * (CW + PAD), yy = y + LAB;
      c.drawImage(cv, x, yy, CW, CH);
      c.strokeStyle = '#26262b'; c.strokeRect(x + 0.5, yy + 0.5, CW - 1, CH - 1);
      c.fillStyle = '#ccff4d'; c.font = 'bold 10px monospace';
      c.fillText(t.toFixed(2), x + 4, yy + 12);
    }
  }
  return sheet.toDataURL('image/png');
})()

