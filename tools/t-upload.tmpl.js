(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  const rep = {};

  /* 先载入 14 页示例，再上传 3 页的小 PDF，验证状态重置 */
  PF.app.loadDemo();
  await sl(6500);
  rep.before = { pages: PF.PdfDoc.numPages, thumbs: document.querySelectorAll('.thumb').length };

  const raw = atob('__B64__');
  const u8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  const file = new File([u8], 'tiny-3p.pdf', { type: 'application/pdf' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const inp = $('fileInput');
  inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles: true }));

  for (let i = 0; i < 60; i++) {
    if (PF.PdfDoc.numPages === 3 && document.querySelectorAll('.thumb canvas').length >= 3) break;
    await sl(250);
  }
  await sl(500);

  rep.after = {
    pages: PF.PdfDoc.numPages,
    thumbs: document.querySelectorAll('.thumb').length,
    chip: ($('fileChip') || {}).textContent,
    focusMax: Math.max(...PF.state.kfs.map(k => k.focus)),
    focusLabel: ($('focusLabel') || {}).textContent,
    kfs: PF.state.kfs.map(k => [k.t, k.layout, k.focus]),
    pageAR: +PF.PdfDoc.pageAR.toFixed(3),
    emptyHidden: $('dropzone').hidden
  };

  /* 拖拽高亮 */
  const stage = $('stage');
  stage.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer: dt }));
  rep.dropOn = !$('dropOverlay').hidden;
  stage.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: dt }));
  rep.dropOff = $('dropOverlay').hidden;

  /* 用 3 页 PDF 导出一个 0.6 秒短片 */
  PF.state.dur = 0.6;
  $('inpDur').value = 0.6;
  PF.Export.open();
  [...$('expRes').children].find(b => b.dataset.v === '1280').click();
  $('btnStartExport').click();
  for (let i = 0; i < 200; i++) {
    if (!$('exportDone').hidden) break;
    await sl(200);
  }
  const v = $('expVideo');
  await new Promise(r => { if (v.readyState >= 2) return r(); v.onloadeddata = r; v.onerror = r; setTimeout(r, 5000); });
  rep.export = {
    info: $('doneInfo').textContent,
    vw: v.videoWidth, vh: v.videoHeight, dur: v.duration, verr: v.error && v.error.code,
    bytes: PF.Export._S.blob && PF.Export._S.blob.size
  };

  return JSON.stringify(rep, null, 1);
})()
