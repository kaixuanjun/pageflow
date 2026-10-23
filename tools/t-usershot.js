(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);
  const r = await fetch(encodeURI('工业人车安全预警现有技术方案调研文档.pdf'));
  const buf = await r.arrayBuffer();
  await PF.PdfDoc.openBytes(new Uint8Array(buf));
  PF.app._afterOpen();
  await sl(4000);
  const last = PF.state.kfs[PF.state.kfs.length - 1];
  PF.app.seek(last.t);
  await sl(1500);
  return 'ok t=' + PF.state.t.toFixed(2) + ' layout=' + last.layout + ' pages=' + PF.PdfDoc.numPages;
})()
