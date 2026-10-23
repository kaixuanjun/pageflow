(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 150 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);
  PF.app.setAspect('9:16');
  await sl(400);
  PF.state.kfs = [PF.core.makeKeyframe(0, 'book', 1), PF.core.makeKeyframe(1.6, 'book', 1)];
  PF.state.sel = PF.state.kfs[0].id;
  PF.state.dur = 3;
  PF.app.seek(1.6);
  await sl(500);
  const f = document.getElementById('stageFrame');
  return 'frame=' + f.style.width + 'x' + f.style.height + ' t=' + PF.state.t.toFixed(2);
})()
