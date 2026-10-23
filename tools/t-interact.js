(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  PF.app.loadDemo();
  await sl(7000);

  const rep = {};
  const K = () => PF.app.current();
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(n => n.textContent.trim().indexOf(txt) >= 0);

  /* A. 缩略图点击 → 设为聚焦页 */
  const thumbs = [...document.querySelectorAll('.thumb')];
  thumbs[5].click();
  rep.thumb = { focus: K().focus, markedIdx: thumbs.findIndex(t => t.classList.contains('on')) };

  /* B. 布局卡点击 → 改变当前关键帧布局 */
  const card = byText('.layout-card', '平铺');
  rep.cardFound = !!card;
  if (card) card.click();
  rep.layout = K().layout;

  /* C. 空格播放 / 暂停 */
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  const t0 = PF.state.t;
  await sl(420);
  rep.play = { playing: PF.state.playing, advanced: PF.state.t > t0 + 0.15 };
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  rep.play.paused = !PF.state.playing;

  /* D. 方向键微调 */
  const tA = PF.state.t;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  rep.arrow = { from: tA, to: PF.state.t, moved: PF.state.t > tA };

  /* E. K 新增关键帧 */
  const before = PF.state.kfs.length;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
  rep.addKf = { before, after: PF.state.kfs.length };

  /* F. Delete 删除关键帧 */
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  rep.delKf = { after: PF.state.kfs.length };

  /* G. 拖动关键帧 */
  const lane = document.getElementById('lane');
  const kfEl = lane.querySelector('.kf');
  const r = lane.getBoundingClientRect();
  const id = kfEl.dataset.id;
  const beforeT = PF.state.kfs.find(k => k.id === id).t;
  try {
    const cx = r.left + 9, cy = r.top + 46;
    const tx = r.left + 9 + (r.width - 18) * 0.34;
    kfEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: cx, clientY: cy }));
    lane.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: tx, clientY: cy }));
    lane.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: tx, clientY: cy }));
  } catch (e) { rep.dragErr = String(e); }
  await sl(60);
  const afterT = PF.state.kfs.find(k => k.id === id).t;
  rep.drag = {
    beforeT: +beforeT.toFixed(2), afterT: +afterT.toFixed(2),
    moved: Math.abs(afterT - beforeT) > 0.5,
    domLeft: kfEl.style.left, label: (kfEl.querySelector('.lbl') || {}).textContent
  };

  /* H. 空轨拖动（scrub） */
  try {
    lane.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 2, clientX: r.left + (r.width - 18) * 0.72 + 9, clientY: r.top + 60 }));
    lane.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2, clientX: r.left + (r.width - 18) * 0.72 + 9, clientY: r.top + 60 }));
  } catch (e) { }
  rep.scrub = +PF.state.t.toFixed(2);

  /* I. 导出弹窗 */
  document.getElementById('btnExport').click();
  await sl(120);
  rep.modal = {
    open: !document.getElementById('exportModal').hidden,
    aspectOn: [...document.querySelectorAll('#expAspect button.on')].map(b => b.dataset.v),
    resOn: [...document.querySelectorAll('#expRes button.on')].map(b => b.dataset.v),
    fpsOn: [...document.querySelectorAll('#expFps button.on')].map(b => b.dataset.v),
    fmtOn: [...document.querySelectorAll('#expFmt button.on')].map(b => b.dataset.v),
    size: (document.getElementById('expSize') || {}).textContent,
    dur: (document.getElementById('expDur') || {}).textContent
  };
  document.getElementById('btnCloseExport').click();
  rep.modalClosed = document.getElementById('exportModal').hidden;

  /* J. 1:1 画幅 */
  PF.app.setAspect('1:1');
  await sl(500);
  const fr = document.getElementById('stageFrame'), cv = document.getElementById('canvas');
  rep.square = {
    frame: [fr.offsetWidth, fr.offsetHeight], canvas: [cv.width, cv.height],
    view: [Math.round(PF.Engine.view.w), Math.round(PF.Engine.view.h)]
  };
  PF.app.setAspect('16:9');
  await sl(300);

  return JSON.stringify(rep, null, 1);
})()
