(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);

  const E = PF.Engine, A = PF.app;
  const cv = $('canvas'), frame = $('stageFrame'), stage = $('stage');
  const rows = [];
  let painterId = E._painters.stage ? E._painters.stage.p : null;
  let painterSwaps = 0;

  A.seek(3.0);
  await sl(300);
  A.togglePlay();
  for (let i = 0; i < 20; i++) {
    await new Promise(r => requestAnimationFrame(r));
    const p = E._painters.stage ? E._painters.stage.p : null;
    if (p !== painterId) { painterId = p; painterSwaps++; }
    rows.push([
      +PF.state.t.toFixed(3),
      cv.width, cv.height,
      frame.clientWidth, frame.clientHeight,
      stage.clientWidth, stage.clientHeight,
      $('loading').className + '|' + (getComputedStyle($('loading')).opacity),
      $('dropOverlay').className,
      $('exportModal').hidden ? 1 : 0,
      document.getAnimations().length,
      document.body.className
    ]);
  }
  A.togglePlay();
  return JSON.stringify({
    dpr: devicePixelRatio,
    painterSwaps,
    anis: document.getAnimations().map(a => {
      const t = a.effect && a.effect.target;
      return (t && (t.id || t.className || t.tagName)) + ':' + (a.animationName || '') + ':' + a.playState;
    }),
    rows
  });
})()
