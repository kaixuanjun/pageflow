(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  const ov = $('dropOverlay');
  const dt = new DataTransfer();
  dt.items.add(new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' }));
  document.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }));
  const onShow = ov.classList.contains('on');
  document.dispatchEvent(new DragEvent('dragleave', { bubbles: true, dataTransfer: dt, relatedTarget: null }));
  const onHide = ov.classList.contains('on');
  /* 再确认它不拦截点击 */
  return JSON.stringify({ shown: onShow, stillOnAfterLeave: onHide, pe: getComputedStyle(ov).pointerEvents });
})()
