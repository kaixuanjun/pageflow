/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · ui
   面板构建 / 检查器同步 / 时间轴绘制 / 交互绑定
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var C = PF.core;
  var $ = function (id) { return document.getElementById(id); };

  var E = {};
  var LANE_PAD = 9;
  var toastTimer = 0;
  var dragging = null;

  var UI = {
    el: E,

    /* ─────────────────── 初始化 ─────────────────── */
    init: function () {
      [
        'layoutGrid', 'thumbs', 'layoutTarget', 'kfPill', 'focusLabel',
        'inpTime', 'inpEase', 'inpFocus', 'btnFocusPrev', 'btnFocusNext',
        'inpZoom', 'outZoom', 'inpPanX', 'outPanX', 'inpPanY', 'outPanY',
        'inpRot', 'outRot', 'inpP1', 'outP1', 'inpP2', 'outP2',
        'lblP1', 'lblP2', 'paramHint', 'ruler', 'rulerWrap', 'lane', 'laneWrap',
        'tlLine', 'playhead', 'tlCur', 'tlDur', 'pbTime', 'pbDur', 'inpDur',
        'btnPlay', 'btnLoop', 'btnAddKf', 'btnDupKf', 'btnDelKf',
        'btnPrevKf', 'btnNextKf', 'toast', 'canvas', 'stageFrame', 'stage',
        'dropzone', 'loading', 'ldTitle', 'ldSub', 'ldBar', 'dropOverlay',
        'fileInput', 'fileChip', 'fileName', 'fileMeta', 'btnChangePdf',
        'btnPick', 'btnDemo', 'btnDemo2', 'btnExport', 'aspectSeg',
        'exportModal', 'btnCloseExport', 'btnCancelExport', 'btnExportAgain',
        'btnDownload', 'expAspect', 'expRes', 'expFps',
        'inspector', 'fatal', 'fatalMsg'
      ].forEach(function (id) { E[id] = $(id); });

      this.buildLayouts();
      this.buildEases();
      this.bind();
      return this;
    },

    /* ─────────────────── 布局卡 ─────────────────── */
    buildLayouts: function () {
      var frag = document.createDocumentFragment();
      C.LAYOUTS.forEach(function (L) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'layout-card';
        b.dataset.id = L.id;
        b.title = L.name;
        b.innerHTML = L.icon + '<span>' + L.name + '</span>';
        b.addEventListener('click', function () { PF.app.setLayout(L.id); });
        frag.appendChild(b);
      });
      E.layoutGrid.appendChild(frag);
    },

    buildEases: function () {
      var sel = E.inpEase;
      Object.keys(C.EASINGS).forEach(function (k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = C.EASINGS[k].name;
        sel.appendChild(o);
      });
    },

    /* ─────────────────── 页面缩略图 ─────────────────── */
    renderThumbs: function () {
      var doc = PF.PdfDoc;
      var box = E.thumbs;
      box.innerHTML = '';
      if (!doc.numPages) {
        box.innerHTML = '<div class="thumbs-empty">导入 PDF 后显示页面</div>';
        return;
      }
      var frag = document.createDocumentFragment();
      for (var i = 0; i < doc.numPages; i++) {
        (function (idx) {
          var d = document.createElement('div');
          d.className = 'thumb';
          d.dataset.i = idx;
          var no = document.createElement('span');
          no.className = 'no';
          no.textContent = String(idx + 1);
          d.appendChild(no);
          d.addEventListener('click', function () { PF.app.setFocusPage(idx); });
          frag.appendChild(d);
          doc.thumb(idx, 168).then(function (cv) {
            cv.style.width = '100%';
            cv.style.height = '100%';
            d.insertBefore(cv, d.firstChild);
          }).catch(function () { });
        })(i);
      }
      box.appendChild(frag);
      this.markThumbs();
    },

    markThumbs: function () {
      var k = PF.app.current();
      var f = k ? k.focus : -1;
      Array.prototype.forEach.call(E.thumbs.children, function (el) {
        if (el.dataset && el.dataset.i !== undefined) {
          el.classList.toggle('on', +el.dataset.i === f);
        }
      });
    },

    /* ─────────────────── 检查器 ─────────────────── */
    syncInspector: function () {
      var k = PF.app.current();
      var idx = PF.app.currentIndex();
      var n = PF.PdfDoc.numPages || 1;
      if (!k) return;

      E.kfPill.textContent = '#' + (idx + 1);
      E.layoutTarget.textContent = '关键帧 #' + (idx + 1);

      E.inpTime.value = k.t.toFixed(2).replace(/\.?0+$/, '') || '0';
      E.inpEase.value = k.ease;

      E.inpFocus.max = String(Math.max(0, n - 1));
      E.inpFocus.value = String(C.clamp(k.focus, 0, n - 1));
      E.focusLabel.textContent = (Math.min(k.focus, n - 1) + 1) + ' / ' + n;

      E.inpZoom.value = k.zoom; E.outZoom.textContent = Math.round(k.zoom * 100) + '%';
      E.inpPanX.value = k.panX; E.outPanX.textContent = Math.round(k.panX);
      E.inpPanY.value = k.panY; E.outPanY.textContent = Math.round(k.panY);
      E.inpRot.value = k.rot; E.outRot.textContent = Math.round(k.rot) + '°';

      var L = C.LAYOUT_MAP[k.layout] || C.LAYOUTS[0];
      E.lblP1.textContent = L.p1;
      E.lblP2.textContent = L.p2;
      E.paramHint.textContent = L.name;
      E.inpP1.value = k.p1; E.outP1.textContent = Math.round(k.p1 * 100) + '%';
      E.inpP2.value = k.p2; E.outP2.textContent = Math.round(k.p2 * 100) + '%';

      Array.prototype.forEach.call(E.layoutGrid.children, function (b) {
        b.classList.toggle('on', b.dataset.id === k.layout);
      });
      this.markThumbs();
    },

    /* ─────────────────── 时间轴 ─────────────────── */
    syncTimeline: function () {
      var st = PF.state;
      var dur = st.dur;
      var lane = E.lane;
      var w = Math.max(40, lane.clientWidth - LANE_PAD * 2);
      var px = function (t) { return LANE_PAD + (C.clamp(t, 0, dur) / dur) * w; };

      /* 网格 */
      lane.style.setProperty('--grid', (w / Math.max(1, Math.round(dur))) + 'px');

      /* 刻度 */
      var step = dur <= 6 ? 0.5 : dur <= 14 ? 1 : dur <= 30 ? 2 : 5;
      var ruler = E.ruler;
      ruler.innerHTML = '';
      var frag = document.createDocumentFragment();
      for (var t = 0; t <= dur + 0.0001; t += step) {
        var major = Math.abs(t % (step * 2)) < 1e-6;
        var tick = document.createElement('i');
        tick.className = 'tick' + (major ? ' major' : '');
        tick.style.left = px(t) + 'px';
        frag.appendChild(tick);
        if (major || step >= 1) {
          var lab = document.createElement('b');
          lab.className = 'tick-label';
          lab.style.left = px(t) + 'px';
          lab.textContent = (t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)) + 's';
          if (px(t) < 12) lab.style.transform = 'translateX(0)';
          if (px(t) > w + LANE_PAD * 2 - 18) lab.style.transform = 'translateX(-100%)';
          frag.appendChild(lab);
        }
      }
      ruler.appendChild(frag);

      /* 关键帧 */
      Array.prototype.slice.call(lane.querySelectorAll('.kf')).forEach(function (n) { n.remove(); });
      var curId = st.sel;
      st.kfs.forEach(function (k, i) {
        var d = document.createElement('div');
        d.className = 'kf' + (k.id === curId ? ' on' : '');
        d.dataset.id = k.id;
        d.style.left = px(k.t) + 'px';
        var dot = document.createElement('i');
        dot.className = 'dot';
        d.appendChild(dot);
        var lb = document.createElement('span');
        lb.className = 'lbl';
        lb.textContent = k.t.toFixed(1) + 's';
        d.appendChild(lb);
        lane.appendChild(d);
      });

      /* 连线 */
      if (st.kfs.length > 1) {
        var a = px(st.kfs[0].t), b = px(st.kfs[st.kfs.length - 1].t);
        E.tlLine.style.left = a + 'px';
        E.tlLine.style.width = Math.max(0, b - a) + 'px';
        E.tlLine.style.right = 'auto';
      } else {
        E.tlLine.style.left = '0';
        E.tlLine.style.width = '100%';
        E.tlLine.style.right = '0';
      }

      this.setTime(st.t);
    },

    setTime: function (t) {
      var st = PF.state;
      var dur = st.dur;
      var lane = E.lane;
      var w = Math.max(40, lane.clientWidth - LANE_PAD * 2);
      var x = LANE_PAD + (C.clamp(t, 0, dur) / dur) * w;
      E.playhead.style.left = x + 'px';
      E.tlCur.textContent = t.toFixed(1);
      E.pbTime.textContent = t.toFixed(1);
      E.tlDur.textContent = dur.toFixed(1);
      E.pbDur.textContent = dur.toFixed(1);
    },

    /* ─────────────────── 其它状态 ─────────────────── */
    setPlaying: function (playing) {
      E.btnPlay.classList.toggle('on', playing);
      document.body.classList.toggle('is-playing', playing);
    },

    setLoop: function (on) {
      E.btnLoop.classList.toggle('on', on);
    },

    setAspect: function (a) {
      Array.prototype.forEach.call(E.aspectSeg.children, function (b) {
        b.classList.toggle('on', b.dataset.aspect === a);
      });
    },

    setLoading: function (show, title, sub, p) {
      E.loading.hidden = !show;
      if (title) E.ldTitle.textContent = title;
      if (sub !== undefined) E.ldSub.textContent = sub;
      if (p !== undefined) E.ldBar.style.width = C.clamp(p, 0, 1) * 100 + '%';
    },

    dropzone: function (show) {
      E.dropzone.hidden = !show;
    },

    toast: function (msg) {
      var el = E.toast;
      el.textContent = msg;
      el.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2200);
    },

    fatal: function (msg) {
      E.fatalMsg.textContent = String(msg);
      E.fatal.hidden = false;
    },

    /* ─────────────────── 事件绑定 ─────────────────── */
    bind: function () {
      var A = function () { return PF.app; };

      /* 文件 */
      E.btnPick.addEventListener('click', function () { A().pickFile(); });
      E.btnChangePdf.addEventListener('click', function () { A().pickFile(); });
      E.btnDemo.addEventListener('click', function () { A().loadDemo(); });
      E.btnDemo2.addEventListener('click', function () { A().loadDemo(); });
      E.fileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) A().openFile(e.target.files[0]);
        e.target.value = '';
      });

      /* 拖放 */
      ['dragenter', 'dragover'].forEach(function (ev) {
        document.addEventListener(ev, function (e) {
          if (!e.dataTransfer) return;
          e.preventDefault();
          E.dropOverlay.classList.add('on');
        });
      });
      document.addEventListener('dragleave', function (e) {
        if (e.relatedTarget === null) E.dropOverlay.classList.remove('on');
      });
      document.addEventListener('drop', function (e) {
        e.preventDefault();
        E.dropOverlay.classList.remove('on');
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) {
          if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') A().openFile(f);
          else UI.toast('请拖入 PDF 文件');
        }
      });

      /* 画幅 */
      E.aspectSeg.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (b) A().setAspect(b.dataset.aspect);
      });

      /* 播放条 */
      E.btnPlay.addEventListener('click', function () { A().togglePlay(); });
      E.btnLoop.addEventListener('click', function () { A().toggleLoop(); });
      E.btnPrevKf.addEventListener('click', function () { A().jumpKf(-1); });
      E.btnNextKf.addEventListener('click', function () { A().jumpKf(1); });

      /* 关键帧按钮 */
      E.btnAddKf.addEventListener('click', function () { A().addKeyframe(); });
      E.btnDupKf.addEventListener('click', function () { A().dupKeyframe(); });
      E.btnDelKf.addEventListener('click', function () { A().delKeyframe(); });

      E.inpDur.addEventListener('change', function () {
        A().setDur(parseFloat(E.inpDur.value) || 12);
      });

      /* 检查器 */
      var bindField = function (el, field, transform) {
        el.addEventListener('input', function () {
          var v = parseFloat(el.value);
          if (isNaN(v)) return;
          A().setField(field, transform ? transform(v) : v);
        });
      };
      bindField(E.inpZoom, 'zoom');
      bindField(E.inpPanX, 'panX');
      bindField(E.inpPanY, 'panY');
      bindField(E.inpRot, 'rot');
      bindField(E.inpP1, 'p1');
      bindField(E.inpP2, 'p2');
      bindField(E.inpFocus, 'focus', Math.round);

      E.inpTime.addEventListener('change', function () {
        A().setField('t', Math.max(0, parseFloat(E.inpTime.value) || 0));
      });
      E.inpEase.addEventListener('change', function () {
        A().setField('ease', E.inpEase.value);
      });
      E.btnFocusPrev.addEventListener('click', function () { A().stepFocus(-1); });
      E.btnFocusNext.addEventListener('click', function () { A().stepFocus(1); });

      /* 时间轴：拖动播放头 / 拖关键帧 */
      var lanePoint = function (clientX) {
        var r = E.lane.getBoundingClientRect();
        var w = Math.max(40, r.width - LANE_PAD * 2);
        var p = (clientX - r.left - LANE_PAD) / w;
        return C.clamp(p, 0, 1) * PF.state.dur;
      };

      E.lane.addEventListener('pointerdown', function (e) {
        var kfEl = e.target.closest('.kf');
        if (kfEl) {
          var id = kfEl.dataset.id;
          A().selectKf(id);
          dragging = { type: 'kf', id: id, el: kfEl };
          kfEl.classList.add('dragging');
          try { E.lane.setPointerCapture(e.pointerId); } catch (err) { }
          e.preventDefault();
          return;
        }
        dragging = { type: 'scrub' };
        A().seek(lanePoint(e.clientX));
        try { E.lane.setPointerCapture(e.pointerId); } catch (err) { }
        e.preventDefault();
      });

      E.lane.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var t = lanePoint(e.clientX);
        if (dragging.type === 'scrub') A().seek(t);
        else if (dragging.type === 'kf') {
          A().moveKf(dragging.id, t);
          /* 拖动时让方块直接跟手（不再整层重建） */
          var r = E.lane.getBoundingClientRect();
          var w = Math.max(40, r.width - LANE_PAD * 2);
          var px = LANE_PAD + (t / PF.state.dur) * w;
          dragging.el.style.left = px.toFixed(1) + 'px';
          var lbl = dragging.el.querySelector('.lbl');
          if (lbl) lbl.textContent = t.toFixed(1) + 's';
        }
      });

      var endDrag = function (e) {
        if (!dragging) return;
        if (dragging.el) dragging.el.classList.remove('dragging');
        dragging = null;
        try { E.lane.releasePointerCapture(e.pointerId); } catch (err) { }
        A().commit();
      };
      E.lane.addEventListener('pointerup', endDrag);
      E.lane.addEventListener('pointercancel', endDrag);

      /* 导出 */
      E.btnExport.addEventListener('click', function () { PF.Export.open(); });
      var btnStart = $('btnStartExport');
      if (btnStart) btnStart.addEventListener('click', function () { PF.Export.start(); });
      E.btnCloseExport.addEventListener('click', function () { PF.Export.close(); });
      E.btnCancelExport.addEventListener('click', function () { PF.Export.cancel(); });
      E.btnExportAgain.addEventListener('click', function () {
        PF.Export._S && (PF.Export._S.running = false);
        $('exportRun').hidden = true;
        $('exportDone').hidden = true;
        $('exportSetup').hidden = false;
        PF.Export.refresh();
      });
      E.exportModal.addEventListener('click', function (e) {
        if (e.target === E.exportModal) PF.Export.close();
      });

      ['expAspect', 'expRes', 'expFps'].forEach(function (sel) {
        var box = $(sel);
        if (!box) return;
        box.addEventListener('click', function (e) {
          var b = e.target.closest('button');
          if (!b) return;
          Array.prototype.forEach.call(box.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          PF.Export.refresh();
        });
      });

      /* 键盘 */
      document.addEventListener('keydown', function (e) {
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        if (e.key === ' ') { e.preventDefault(); A().togglePlay(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); A().seek(PF.state.t - (e.shiftKey ? 0.1 : 1 / 30)); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); A().seek(PF.state.t + (e.shiftKey ? 0.1 : 1 / 30)); }
        else if (e.key === 'k' || e.key === 'K') { A().addKeyframe(); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { A().delKeyframe(); }
        else if (e.key === 'Home') { A().seek(0); }
        else if (e.key === 'Escape') { if (!E.exportModal.hidden) PF.Export.close(); }
      });

      /* 尺寸变化 */
      var rt = 0;
      global.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          A().layoutStage();
          UI.syncTimeline();
        }, 90);
      });
    }
  };

  PF.ui = UI;
})(window);
