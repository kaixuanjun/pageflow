(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);
  const f = document.getElementById('stageFrame');
  const st = document.getElementById('stage');
  const out = { before: [f.style.width, f.style.height, f.clientWidth, f.clientHeight] };
  out.stage = [st.clientWidth, st.clientHeight];
  out.ars = PF.render.ARS;
  PF.app.setAspect('9:16');
  out.aspect = PF.state.aspect;
  out.afterInline = [f.style.width, f.style.height];
  out.after = [f.clientWidth, f.clientHeight];
  await raf(); await raf();
  out.after2 = [f.clientWidth, f.clientHeight, f.style.width];
  out.cs = getComputedStyle(f).cssText ? getComputedStyle(f).width + ' / ' + getComputedStyle(f).height : '';
  PF.app.layoutStage();
  out.manual = [f.clientWidth, f.clientHeight, f.style.width, f.style.height];
  out.view = [PF.Engine.view.w, PF.Engine.view.h];
  return JSON.stringify(out);
})()
