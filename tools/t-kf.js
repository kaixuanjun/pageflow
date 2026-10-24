(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(6000);
  PF.app.seek(5.40);
  await sl(400);
  return 't=' + PF.state.t.toFixed(2);
})()
