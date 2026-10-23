/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · export
   逐帧渲染 → WebCodecs 编码 → WebM 封装
   回退：MediaRecorder 实时录制
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var C = PF.core;

  var $ = function (id) { return document.getElementById(id); };

  var S = {
    running: false,
    cancel: false,
    url: null,
    blob: null,
    ext: 'webm'
  };

  /* ── 快速让出主线程 ── */
  var chan = new MessageChannel();
  var pending = null;
  chan.port1.onmessage = function () {
    if (pending) { var r = pending; pending = null; r(); }
  };
  function yieldNow() {
    return new Promise(function (r) { pending = r; chan.port2.postMessage(0); });
  }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  /* ── 尺寸换算 ── */
  function dimsFor(aspect, resKey) {
    var longSide = +resKey;
    var shortSide = Math.round(longSide * 9 / 16);
    var W, H;
    if (aspect === '9:16') { W = shortSide; H = longSide; }
    else if (aspect === '1:1') { W = shortSide; H = shortSide; }
    else { W = longSide; H = shortSide; }
    W = W % 2 ? W - 1 : W;
    H = H % 2 ? H - 1 : H;
    return { W: W, H: H };
  }

  function readOpts() {
    var aspect = '16:9', res = '1920', fps = 30;
    var a = document.querySelector('#expAspect button.on');
    if (a) aspect = a.dataset.v;
    var r = document.querySelector('#expRes button.on');
    if (r) res = r.dataset.v;
    var f = document.querySelector('#expFps button.on');
    if (f) fps = +f.dataset.v;
    var d = dimsFor(aspect, res);
    return { aspect: aspect, fps: fps, W: d.W, H: d.H, resKey: res };
  }

  function refreshSummary() {
    var o = readOpts();
    var st = PF.state;
    $('expDur').textContent = st.dur.toFixed(1) + ' s';
    $('expSize').textContent = o.W + ' × ' + o.H;
    var webcodecs = !!global.VideoEncoder;
    $('expFmt').textContent = webcodecs ? 'WebM · VP9' : 'WebM · 录制';
    var est = webcodecs ? Math.max(2, Math.round(st.dur * 0.45 + 1)) : Math.ceil(st.dur + 1);
    $('expWait').textContent = String(est);
  }

  /* ── 编码器选择 ── */
  var CODECS = [
    { codec: 'vp09.00.10.08', id: 'V_VP9', name: 'VP9' },
    { codec: 'vp8', id: 'V_VP8', name: 'VP8' },
    { codec: 'av01.0.08M.08', id: 'V_AV1', name: 'AV1' }
  ];

  async function pickCodec(W, H, fps) {
    if (!global.VideoEncoder) return null;
    for (var i = 0; i < CODECS.length; i++) {
      try {
        var cfg = {
          codec: CODECS[i].codec, width: W, height: H, framerate: fps,
          bitrate: bitrateFor(W, H, fps), latencyMode: 'quality'
        };
        var sup = await global.VideoEncoder.isConfigSupported(cfg);
        if (sup && sup.supported) return { cfg: cfg, meta: CODECS[i] };
      } catch (e) { /* 忽略 */ }
    }
    return null;
  }

  function bitrateFor(W, H, fps) {
    var bpp = 0.075;
    var v = W * H * fps * bpp;
    return Math.round(C.clamp(v, 2.2e6, 26e6));
  }

  /* ── 进度 UI ── */
  function setProgress(p, t, dur) {
    p = C.clamp(p, 0, 1);
    $('ringFg').style.strokeDashoffset = String(327 * (1 - p));
    $('runPct').textContent = Math.round(p * 100) + '%';
    $('runBar').style.width = (p * 100).toFixed(2) + '%';
    if (t !== undefined) $('runSub').textContent = t.toFixed(1) + ' / ' + dur.toFixed(1) + ' s';
  }

  function showPane(which) {
    $('exportSetup').hidden = which !== 'setup';
    $('exportRun').hidden = which !== 'run';
    $('exportDone').hidden = which !== 'done';
  }

  /* ── 构建导出用场景上下文 ── */
  function makeSceneCtx(aspect) {
    var ar = (PF.render.ARS[aspect] || 16 / 9);
    var view = { w: PF.render.UNIT_H * ar, h: PF.render.UNIT_H };
    view.page = C.fitPage(view, PF.PdfDoc.pageAR || 0.7071);
    return { view: view, ctx: { n: PF.PdfDoc.numPages, V: { w: view.w, h: view.h }, page: view.page } };
  }

  /* ── 渲染单帧（保证页面已就绪） ── */
  async function readyPages(scene) {
    var doc = PF.PdfDoc;
    var waits = null;
    for (var i = 0; i < scene.poses.length; i++) {
      if (scene.poses[i].opacity <= 0.01) continue;
      if (!doc._pages.has(i)) {
        waits = waits || [];
        waits.push(doc.ensure(i).catch(function () { }));
      }
    }
    if (waits) await Promise.all(waits);
  }

  /* ── 主流程 ── */
  async function start() {
    if (S.running) return;
    var st = PF.state;
    if (!PF.PdfDoc.numPages) { PF.ui.toast('请先导入 PDF'); return; }

    var o = readOpts();
    S.running = true;
    S.cancel = false;
    showPane('run');
    setProgress(0, 0, st.dur);
    $('runTitle').textContent = '正在渲染…';
    $('runSub').textContent = '0.0 / ' + st.dur.toFixed(1) + ' s';

    var sc = makeSceneCtx(o.aspect);
    var cv = document.createElement('canvas');
    cv.width = o.W; cv.height = o.H;
    var ctx = cv.getContext('2d', { alpha: false });

    var total = Math.max(1, Math.round(st.dur * o.fps));
    var getPage = function (i) { return PF.PdfDoc.getPageSync(i); };

    /* 预热：时间轴上出现过的页面 */
    var warmList = [];
    st.kfs.forEach(function (k) { warmList.push(k.focus - 2, k.focus - 1, k.focus, k.focus + 1, k.focus + 2); });
    $('runTitle').textContent = '正在栅格化页面…';
    await PF.PdfDoc.warm(warmList);
    if (S.cancel) return finishCancel();

    var pick = await pickCodec(o.W, o.H, o.fps);

    try {
      if (pick) {
        await encodeWithWebCodecs(pick, o, sc, ctx, cv, total, getPage);
      } else {
        await encodeWithRecorder(o, sc, ctx, cv, total, getPage);
      }
    } catch (err) {
      S.running = false;
      showPane('setup');
      PF.ui.toast('导出失败：' + (err && err.message ? err.message : err));
      console.error(err);
    }
  }

  function finishCancel() {
    S.running = false;
    showPane('setup');
    PF.ui.toast('已取消导出');
  }

  /* ── WebCodecs 路径 ── */
  async function encodeWithWebCodecs(pick, o, sc, ctx, cv, total, getPage) {
    var st = PF.state;
    var webm = new PF.WebM({
      width: o.W, height: o.H, fps: o.fps, codecId: pick.meta.id
    });

    var chunks = [];
    var err = null;
    var enc = new global.VideoEncoder({
      output: function (chunk) {
        var buf = new Uint8Array(chunk.byteLength);
        chunk.copyTo(buf);
        chunks.push({ data: buf, ts: chunk.timestamp, key: chunk.type === 'key' });
      },
      error: function (e) { err = e; }
    });
    enc.configure(pick.cfg);

    var frameUs = 1e6 / o.fps;
    var gop = Math.round(o.fps * 2);

    for (var i = 0; i < total; i++) {
      if (S.cancel) break;
      if (err) throw err;

      var t = i / o.fps;
      var scene = C.sampleScene(st.kfs, t, sc.ctx);
      await readyPages(scene);
      /* 导出帧同样走 GPU 精确透视：不然成片里还是会出现逐格仿射的接缝 */
      var pen = (PF.Engine && PF.Engine._painterFor)
        ? PF.Engine._painterFor(o.W, o.H, 'export') : null;
      PF.render.renderTo(ctx, o.W, o.H, sc.view, scene, getPage, pen);

      var vf = new global.VideoFrame(cv, {
        timestamp: Math.round(i * frameUs),
        duration: Math.round(frameUs)
      });
      enc.encode(vf, { keyFrame: i % gop === 0 });
      vf.close();

      while (enc.encodeQueueSize > 6) await yieldNow();

      if (i % 3 === 0) {
        setProgress(i / total, t, st.dur);
        await yieldNow();
      }
    }

    if (S.cancel) {
      try { enc.close(); } catch (e) { }
      return finishCancel();
    }

    setProgress(0.99, st.dur, st.dur);
    $('runTitle').textContent = '正在封装…';
    await yieldNow();
    await enc.flush();
    try { enc.close(); } catch (e) { }

    chunks.sort(function (a, b) { return a.ts - b.ts; });
    chunks.forEach(function (c) { webm.addFrame(c.data, c.ts, c.key); });

    var blob = webm.finalize();
    S.ext = 'webm';
    deliver(blob, o, 'VP9 · WebCodecs');
  }

  /* ── MediaRecorder 回退 ── */
  function encodeWithRecorder(o, sc, ctx, cv, total, getPage) {
    return new Promise(function (resolve, reject) {
      var st = PF.state;
      var types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      var mime = null;
      for (var i = 0; i < types.length; i++) {
        if (global.MediaRecorder && MediaRecorder.isTypeSupported(types[i])) { mime = types[i]; break; }
      }
      if (!mime) { reject(new Error('浏览器不支持视频录制')); return; }

      var stream = cv.captureStream(0);
      var track = stream.getVideoTracks()[0];
      var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateFor(o.W, o.H, o.fps) });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = function (e) { reject(e.error || new Error('录制失败')); };
      rec.onstop = function () {
        try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { }
        var blob = new Blob(chunks, { type: 'video/webm' });
        S.ext = 'webm';
        deliver(blob, o, 'MediaRecorder');
        resolve();
      };

      rec.start();
      $('runTitle').textContent = '正在录制（实时）…';

      var t0 = 0;
      var raf = null;
      function step(now) {
        if (S.cancel) { if (raf) cancelAnimationFrame(raf); try { rec.stop(); } catch (e) { } finishCancel(); resolve(); return; }
        if (!t0) t0 = now;
        var t = (now - t0) / 1000;
        if (t >= st.dur) {
          setProgress(1, st.dur, st.dur);
          try { rec.stop(); } catch (e) { }
          return;
        }
        var scene = C.sampleScene(st.kfs, t, sc.ctx);
        PF.render.renderTo(ctx, o.W, o.H, sc.view, scene, getPage);
        if (track.requestFrame) track.requestFrame();
        setProgress(t / st.dur, t, st.dur);
        raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    });
  }

  /* ── 交付 ── */
  function deliver(blob, o, how) {
    S.running = false;
    S.blob = blob;
    if (S.url) URL.revokeObjectURL(S.url);
    S.url = URL.createObjectURL(blob);

    var v = $('expVideo');
    v.src = S.url;
    $('btnDownload').href = S.url;
    var stem = (PF.PdfDoc.fileName || 'pageflow').replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_') || 'pageflow';
    $('btnDownload').download = stem + '-' + o.W + 'x' + o.H + '-' + o.fps + 'fps.' + S.ext;
    $('doneInfo').textContent = o.W + ' × ' + o.H + ' · ' + o.fps + ' fps · '
      + PF.state.dur.toFixed(1) + 's · ' + fmtBytes(blob.size) + ' · ' + how;
    setProgress(1, PF.state.dur, PF.state.dur);
    showPane('done');
  }

  /* ── 对外 ── */
  var Export = {
    open: function () {
      if (!PF.PdfDoc.numPages) { PF.ui.toast('请先导入 PDF 文件'); return; }
      var cur = PF.state.aspect;
      document.querySelectorAll('#expAspect button').forEach(function (b) {
        b.classList.toggle('on', b.dataset.v === cur);
      });
      showPane('setup');
      refreshSummary();
      $('exportModal').hidden = false;
      document.body.classList.add('modal-open');
    },
    close: function () {
      if (S.running) { S.cancel = true; }
      $('exportModal').hidden = true;
      document.body.classList.remove('modal-open');
    },
    start: start,
    running: function () { return S.running; },
    cancel: function () {
      S.cancel = true;
      if (!S.running) { showPane('setup'); }
    },
    refresh: refreshSummary,
    _S: S
  };

  PF.Export = Export;
})(window);
