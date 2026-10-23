(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  if (!window.PF) return JSON.stringify({ error: 'PF missing', href: location.href });
  PF.app.loadDemo();
  await sl(6500);
  PF.state.dur = 2.5;
  $('inpDur').value = 2.5;
  PF.Export.open();
  $('expRes').children[1].click();
  $('expFps').children[0].click();
  const t0 = performance.now();
  $('btnStartExport').click();
  for (let i = 0; i < 200; i++) {
    if (!$('exportDone').hidden) break;
    if ($('exportRun').hidden && !$('exportSetup').hidden) break;
    await sl(300);
  }
  const ms = Math.round(performance.now() - t0);
  const v = $('expVideo');
  await new Promise(r => {
    if (v.readyState >= 2) return r();
    v.onloadeddata = r; v.onerror = r; setTimeout(r, 6000);
  });
  let played = false, perr = null;
  try { await v.play(); await sl(800); played = v.currentTime > 0; }
  catch (e) { perr = String(e && e.message); }
  return JSON.stringify({
    ms,
    info: $('doneInfo').textContent,
    done: !$('exportDone').hidden,
    setup: !$('exportSetup').hidden,
    title: $('runTitle').textContent,
    vw: v.videoWidth, vh: v.videoHeight,
    dur: v.duration,
    verr: v.error && v.error.code,
    played, perr, ct: v.currentTime,
    size: PF.Export._S.blob && PF.Export._S.blob.size
  });
})()

