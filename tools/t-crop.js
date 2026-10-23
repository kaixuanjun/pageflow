(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);
  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 5), PF.core.makeKeyframe(1.2, 'book', 6)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 2;
  PF.app.seek(0.62);
  await sl(400);
  return 't=' + PF.state.t.toFixed(2);
})()
