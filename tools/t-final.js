(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6500);
  const kf = PF.state.kfs.filter(k => k.layout === 'coverflow')[0];
  if (kf) PF.app.selectKf(kf.id);
  PF.app.seek(7.4);
  await sl(900);
  return JSON.stringify({
    t: PF.state.t,
    sel: PF.app.current() && PF.app.current().layout,
    painter: !!PF.Engine._painters.stage
  });
})()
