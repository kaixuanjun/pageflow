(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);
  const slot = PF.Engine._painters.stage;
  return JSON.stringify({
    href: location.search,
    slot: slot ? slot.key : null,
    painter: !!(slot && slot.p),
    isLost: slot && slot.p ? slot.p.isLost() : null,
    canvas: [PF.Engine.canvas.width, PF.Engine.canvas.height]
  });
})()
