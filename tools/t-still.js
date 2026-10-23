(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);
  PF.app.setAspect('9:16');
  PF.app.seek(5.2);
  await sl(500);
  return 'ok';
})()
