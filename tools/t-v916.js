(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);
  PF.app.setAspect('9:16');
  PF.app.seek(5.2);
  for (let i = 0; i < 6; i++) await raf();
  const f = document.getElementById('stageFrame');
  const cv = document.getElementById('canvas');
  return JSON.stringify({
    frame: [f.clientWidth, f.clientHeight],
    canvas: [cv.clientWidth, cv.clientHeight, cv.width, cv.height],
    view: PF.Engine.view
  });
})()
