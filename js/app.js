/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · app
   状态 / 渲染循环 / 交互逻辑
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var C = PF.core;
  var $ = function (id) { return document.getElementById(id); };
  var UI, Eng, Doc;

  var state = {
    kfs: [],
    sel: null,
    dur: 12,
    t: 0,
    playing: false,
    loop: true,
    aspect: '16:9'
  };
  PF.state = state;

  var dirty = true;
  var lastNow = 0;

  /* ─────────────────── 关键帧工具 ─────────────────── */
  function sortKfs() {
    state.kfs.sort(function (a, b) { return a.t - b.t; });
  }
  function byId(id) {
    for (var i = 0; i < state.kfs.length; i++) if (state.kfs[i].id === id) return state.kfs[i];
    return null;
  }
  function indexOf(id) {
    for (var i = 0; i < state.kfs.length; i++) if (state.kfs[i].id === id) return i;
    return -1;
  }
  function current() {
    if (!state.kfs.length) return null;
    var k = byId(state.sel);
    if (k) return k;
    state.sel = state.kfs[0].id;
    return state.kfs[0];
  }
  function nPages() { return Doc.numPages || 1; }

  /* ─────────────────── 舞台尺寸 ─────────────────── */
  function layoutStage() {
    var stage = $('stage');
    var frame = $('stageFrame');
    var ar = PF.render.ARS[state.aspect] || 16 / 9;
    var availW = stage.clientWidth - 64;
    var availH = stage.clientHeight - 108;
    if (availW < 40 || availH < 40) return;
    var h = Math.min(availH, availW / ar);
    var w = h * ar;
    frame.style.width = Math.round(w) + 'px';
    frame.style.height = Math.round(h) + 'px';
    Eng.syncSize(Math.round(h));
    dirty = true;
  }

  /* ─────────────────── 渲染 ─────────────────── */
  function sceneCtx() {
    return {
      n: Doc.numPages || 0,
      V: { w: Eng.view.w, h: Eng.view.h },
      page: Eng.view.page
    };
  }

  function renderOnce() {
    if (!Eng.view.page) return;
    var scene = C.sampleScene(state.kfs, state.t, sceneCtx());
    Eng.render(scene);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = lastNow ? (now - lastNow) / 1000 : 0;
    lastNow = now;
    if (dt > 0.2) dt = 0.2;

    if (state.playing) {
      state.t += dt;
      if (state.t >= state.dur) {
        if (state.loop) { state.t = 0; }
        else { state.t = state.dur; setPlaying(false); }
      }
      UI.setTime(state.t);
      dirty = true;
    }
    /* 导出时舞台被弹窗盖住：停掉预览渲染，把 GPU 全留给编码 */
    if (dirty && !(PF.Export && PF.Export.running())) { dirty = false; renderOnce(); }
  }

  function setPlaying(v) {
    state.playing = v;
    lastNow = 0;
    UI.setPlaying(v);
  }

  /* ─────────────────── 应用 API ─────────────────── */
  var app = {
    current: current,
    currentIndex: function () { return Math.max(0, indexOf(state.sel)); },

    pickFile: function () { $('fileInput').click(); },

    loadDemo: function () {
      if (global.__PAGEFLOW_DEMO__) {
        this._openDemo(global.__PAGEFLOW_DEMO__);
        return;
      }
      var self = this;
      UI.setLoading(true, '正在载入示例…', '准备资源', 0.15);
      var s = document.createElement('script');
      s.src = 'assets/demo.b64.js';
      s.onload = function () {
        if (global.__PAGEFLOW_DEMO__) self._openDemo(global.__PAGEFLOW_DEMO__);
        else UI.setLoading(false), UI.toast('示例资源不可用');
      };
      s.onerror = function () {
        UI.setLoading(false);
        UI.toast('示例资源缺失，请直接拖入 PDF');
      };
      document.head.appendChild(s);
    },

    _openDemo: function (b64) {
      UI.setLoading(true, '正在解析示例 PDF…', '渲染页面', 0.4);
      Doc.openBase64(b64, '示例 · 论文排版.pdf')
        .then(function () { app._afterOpen(); })
        .catch(function (e) { UI.setLoading(false); UI.fatal('示例解析失败： ' + e.message); });
    },

    openFile: function (file) {
      UI.setLoading(true, '正在解析 PDF…', file.name, 0.2);
      Doc.openFile(file)
        .then(function () { app._afterOpen(); })
        .catch(function (e) {
          UI.setLoading(false);
          UI.toast('解析失败：' + (e && e.message ? e.message : '不是有效的 PDF'));
        });
    },

    _afterOpen: function () {
      UI.setLoading(false);
      Eng.setPageAspect(Doc.pageAR);

      state.kfs = C.defaultKeyframes(Doc.numPages);
      state.dur = Math.max(6, Math.ceil(state.kfs[state.kfs.length - 1].t + 2.4));
      state.t = 0;
      state.sel = state.kfs[0].id;

      $('fileChip').hidden = false;
      $('fileName').textContent = Doc.fileName;
      $('fileMeta').textContent = '· ' + Doc.numPages + ' 页';
      UI.dropzone(false);

      UI.renderThumbs();
      UI.syncTimeline();
      UI.syncInspector();
      UI.setAspect(state.aspect);
      layoutStage();

      /* 预热：先保证开头几页，再把整本慢慢补齐（≤48 页时缓存能装下整本，
         播放时就不会出现「模糊一下再变清晰」的抖动） */
      Doc.warm([0, 1, 2, 3, 4, 5]).then(function () { dirty = true; });
      if (Doc.numPages > 6 && Doc.numPages <= 48) {
        var rest = [];
        for (var wi = 6; wi < Doc.numPages; wi++) rest.push(wi);
        Doc.warm(rest).then(function () { dirty = true; });
      }
      UI.toast('已载入 ' + Doc.numPages + ' 页');
    },

    setAspect: function (a) {
      state.aspect = a;
      Eng.setAspect(a);
      UI.setAspect(a);
      layoutStage();
    },

    setLayout: function (id) {
      var k = current(); if (!k) return;
      k.layout = id;
      UI.syncInspector();
      dirty = true;
    },

    setField: function (name, v) {
      var k = current(); if (!k) return;
      if (name === 'focus') v = C.clamp(Math.round(v), 0, nPages() - 1);
      if (name === 't') {
        k.t = C.clamp(v, 0, state.dur);
        sortKfs();
      } else {
        k[name] = v;
      }
      UI.syncInspector();
      dirty = true;
    },

    stepFocus: function (d) {
      var k = current(); if (!k) return;
      k.focus = C.clamp((k.focus || 0) + d, 0, nPages() - 1);
      UI.syncInspector();
      dirty = true;
    },

    setFocusPage: function (i) {
      var k = current(); if (!k) return;
      k.focus = C.clamp(Math.round(i), 0, nPages() - 1);
      UI.syncInspector();
      dirty = true;
    },

    selectKf: function (id) {
      if (!byId(id)) return;
      state.sel = id;
      var k = byId(id);
      state.t = k.t;
      UI.syncTimeline();
      UI.syncInspector();
      UI.setTime(state.t);
      dirty = true;
    },

    moveKf: function (id, t) {
      var k = byId(id); if (!k) return;
      k.t = Math.round(C.clamp(t, 0, state.dur) * 100) / 100;
      sortKfs();
      UI.setTime(state.t);
      dirty = true;
    },

    commit: function () {
      sortKfs();
      UI.syncTimeline();
      UI.syncInspector();
      dirty = true;
    },

    addKeyframe: function () {
      if (!state.kfs.length) return;
      /* 已有附近的帧则直接选中 */
      for (var i = 0; i < state.kfs.length; i++) {
        if (Math.abs(state.kfs[i].t - state.t) < 0.06) {
          app.selectKf(state.kfs[i].id);
          return;
        }
      }
      var base = state.kfs[0];
      for (var j = 0; j < state.kfs.length; j++) {
        if (state.kfs[j].t <= state.t + 0.001) base = state.kfs[j];
      }
      var k = C.makeKeyframe(state.t, base.layout, base.focus, {
        ease: base.ease, zoom: base.zoom, panX: base.panX, panY: base.panY,
        rot: base.rot, p1: base.p1, p2: base.p2
      });
      state.kfs.push(k);
      sortKfs();
      state.sel = k.id;
      UI.syncTimeline();
      UI.syncInspector();
      dirty = true;
      UI.toast('已添加关键帧 @ ' + state.t.toFixed(1) + 's');
    },

    dupKeyframe: function () {
      var k = current(); if (!k) return;
      var t = Math.min(state.dur, k.t + 0.6);
      var nk = C.makeKeyframe(t, k.layout, k.focus, {
        ease: k.ease, zoom: k.zoom, panX: k.panX, panY: k.panY,
        rot: k.rot, p1: k.p1, p2: k.p2
      });
      state.kfs.push(nk);
      sortKfs();
      state.sel = nk.id;
      state.t = t;
      UI.syncTimeline();
      UI.syncInspector();
      dirty = true;
    },

    delKeyframe: function () {
      if (state.kfs.length <= 1) { UI.toast('至少保留一个关键帧'); return; }
      var idx = indexOf(state.sel);
      if (idx < 0) return;
      state.kfs.splice(idx, 1);
      state.sel = state.kfs[Math.max(0, idx - 1)].id;
      state.t = C.clamp(state.t, 0, state.dur);
      UI.syncTimeline();
      UI.syncInspector();
      dirty = true;
    },

    setDur: function (v) {
      state.dur = C.clamp(v, 1, 120);
      $('inpDur').value = state.dur;
      state.kfs.forEach(function (k) { k.t = Math.min(k.t, state.dur); });
      state.t = Math.min(state.t, state.dur);
      sortKfs();
      UI.syncTimeline();
      dirty = true;
    },

    seek: function (t) {
      state.t = C.clamp(t, 0, state.dur);
      UI.setTime(state.t);
      dirty = true;
    },

    togglePlay: function () {
      if (state.t >= state.dur - 0.001) state.t = 0;
      setPlaying(!state.playing);
    },

    toggleLoop: function () {
      state.loop = !state.loop;
      UI.setLoop(state.loop);
    },

    jumpKf: function (dir) {
      if (!state.kfs.length) return;
      var i, target = null;
      if (dir > 0) {
        for (i = 0; i < state.kfs.length; i++) {
          if (state.kfs[i].t > state.t + 0.02) { target = state.kfs[i]; break; }
        }
        if (!target) target = state.kfs[state.kfs.length - 1];
      } else {
        for (i = state.kfs.length - 1; i >= 0; i--) {
          if (state.kfs[i].t < state.t - 0.02) { target = state.kfs[i]; break; }
        }
        if (!target) target = state.kfs[0];
      }
      app.selectKf(target.id);
    },

    layoutStage: layoutStage
  };
  PF.app = app;

  /* ─────────────────── 启动 ─────────────────── */
  function boot() {
    UI = PF.ui;
    Eng = PF.Engine;
    Doc = PF.PdfDoc;

    if (!global.pdfjsLib) {
      UI.init();
      UI.fatal('pdf.js 未能加载，请确认 vendor/pdfjs/build/pdf.js 存在。');
      return;
    }

    UI.init();
    Eng.init($('canvas'), function (i) { return Doc.getPageSync(i); });

    Doc.onPageReady = function () { dirty = true; };

    state.kfs = C.defaultKeyframes(1);
    state.sel = state.kfs[0].id;

    Eng.setAspect(state.aspect);
    layoutStage();

    UI.setLoop(state.loop);
    UI.syncTimeline();
    UI.syncInspector();
    UI.dropzone(true);

    requestAnimationFrame(loop);

    /* 首次提示 */
    setTimeout(function () {
      if (!Doc.numPages) UI.toast('拖入 PDF 或点击「示例」开始');
    }, 700);
  }

  global.addEventListener('error', function (e) {
    if (PF.ui && PF.ui.el && PF.ui.el.fatal) {
      PF.ui.fatal((e.message || 'unknown') + '\n' + (e.filename || '') + ':' + (e.lineno || ''));
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
