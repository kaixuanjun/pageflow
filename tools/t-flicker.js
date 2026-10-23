(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  const E = PF.Engine, A = PF.app;
  A.loadDemo();
  await sl(6500);

  const cv = document.getElementById('canvas');
  const ctx = cv.getContext('2d');
  const out = { size: [cv.width, cv.height], painter: E._painters.stage && E._painters.stage.key };

  // 监视 painter 是否被反复重建
  let created = 0, seen = null;
  const orig = E._painterFor;
  E._painterFor = function (W, H, w) {
    const r = orig.call(E, W, H, w);
    if (r !== seen) { seen = r; created++; }
    return r;
  };

  function hash() {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4001) s = (s * 31 + d[i]) | 0;
    return s;
  }

  // 1) 暂停状态：画面应当完全静止
  A.seek(3.0);
  await sl(500);
  const pausedHashes = [];
  for (let i = 0; i < 8; i++) {
    await new Promise(r => requestAnimationFrame(r));
    pausedHashes.push(hash());
  }
  out.pausedStable = new Set(pausedHashes).size === 1;
  out.pausedSeq = pausedHashes;

  // 2) 播放状态：画面每帧都该变，但不能「来回跳」
  A.seek(1.0);
  A.togglePlay();
  seen = null; created = 0;
  const playHashes = [];
  for (let i = 0; i < 12; i++) {
    await new Promise(r => requestAnimationFrame(r));
    playHashes.push(hash());
  }
  A.togglePlay();
  out.playSeq = playHashes;
  out.playAllDistinct = new Set(playHashes).size === playHashes.length;
  out.painterCreatesDuringPlay = created;

  // 3) 对比：同一时刻连续渲染 2D 路径 8 次，看 2D 自身是否稳定
  const keep = E._painterFor;
  E._painters = {};
  E._painterFor = function () { return null; };
  A.seek(3.0);
  await sl(400);
  const h2 = [];
  for (let i = 0; i < 8; i++) {
    E.render(PF.core.sampleScene(PF.state.kfs, 3.0, E.getSceneCtx()));
    h2.push(hash());
  }
  out.pure2dStable = new Set(h2).size === 1;
  out.pure2dSeq = h2;
  E._painterFor = keep;

  E._painterFor = orig;
  return JSON.stringify(out);
})()
