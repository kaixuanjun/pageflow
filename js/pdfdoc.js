/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · pdfdoc
   PDF 载入 / 页面栅格化 / LRU 缓存 / 缩略图
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var lib = global.pdfjsLib;

  var queue = [];
  var active = 0;
  var MAX_CONCURRENT = 2;

  function enqueue(fn) {
    return new Promise(function (resolve, reject) {
      queue.push({ fn: fn, resolve: resolve, reject: reject });
      pump();
    });
  }
  function pump() {
    while (active < MAX_CONCURRENT && queue.length) {
      var job = queue.shift();
      active++;
      Promise.resolve()
        .then(job.fn)
        .then(function (r) { job.resolve(r); })
        .catch(function (e) { job.reject(e); })
        .then(function () { active--; pump(); });
    }
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var out = new Uint8Array(len);
    for (var i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  var Doc = {
    pdf: null,
    numPages: 0,
    pageAR: 0.7071,
    fileName: '',
    ready: false,

    _pages: new Map(),      // i -> canvas
    _order: [],             // LRU 顺序
    _pending: new Map(),    // i -> Promise
    _thumbs: new Map(),
    _cap: 24,
    _h: 1300,
    _dirty: 0,

    onPageReady: null,      // (i) => void

    /* ───────────── 打开 ───────────── */
    openBytes: function (bytes, name, onProgress) {
      var self = this;
      if (!lib) return Promise.reject(new Error('pdf.js 未加载'));
      self.destroy(!!self.pdf);

      lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/build/pdf.worker.js';

      var task = lib.getDocument({
        data: bytes,
        cMapUrl: 'vendor/pdfjs/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'vendor/pdfjs/standard_fonts/',
        useSystemFonts: true,
        isEvalSupported: true,
        disableAutoFetch: false
      });

      return task.promise.then(function (pdf) {
        self.pdf = pdf;
        self.numPages = pdf.numPages;
        self.fileName = name || 'document.pdf';
        self.ready = true;
        self._pages.clear();
        self._thumbs.clear();
        self._pending.clear();
        self._order = [];
        /* 小于 48 页就整本缓存：容量小于页数会导致正在播放的页被反复淘汰、重渲染，
           画面上就是页面一闪一闪（示例只有 14 页，所以看不出这个问题） */
        self._cap = pdf.numPages <= 48 ? pdf.numPages : 28;
        self._h = pdf.numPages <= 24 ? 1400 : (pdf.numPages <= 60 ? 950 : 820);

        /* 以第一页比例为准 */
        return pdf.getPage(1).then(function (p) {
          var vp = p.getViewport({ scale: 1 });
          self.pageAR = vp.width / vp.height;
          self.baseW = vp.width;
          self.baseH = vp.height;
          if (onProgress) onProgress(1, 1);
          return self;
        });
      });
    },

    openFile: function (file, onProgress) {
      var self = this;
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onerror = function () { reject(new Error('读取文件失败')); };
        fr.onload = function () {
          try {
            var bytes = new Uint8Array(fr.result);
            resolve(self.openBytes(bytes, file.name, onProgress));
          } catch (e) { reject(e); }
        };
        fr.readAsArrayBuffer(file);
      });
    },

    openBase64: function (b64, name, onProgress) {
      return this.openBytes(b64ToBytes(b64), name, onProgress);
    },

    /* ───────────── 页面画布 ───────────── */
    renderPage: function (i) {
      var self = this;
      if (self._pages.has(i)) {
        self._touch(i);
        return Promise.resolve(self._pages.get(i));
      }
      if (self._pending.has(i)) return self._pending.get(i);

      var p = enqueue(function () {
        return self.pdf.getPage(i + 1).then(function (page) {
          var vp1 = page.getViewport({ scale: 1 });
          var scale = self._h / vp1.height;
          /* 超大页面限制像素总量 */
          var maxPix = 2600 * 2600;
          if (vp1.width * vp1.height * scale * scale > maxPix) {
            scale = Math.sqrt(maxPix / (vp1.width * vp1.height));
          }
          var vp = page.getViewport({ scale: scale });
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(vp.width));
          cv.height = Math.max(1, Math.round(vp.height));
          var ctx = cv.getContext('2d', { alpha: false });
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
            page.cleanup();
            self._store(i, cv);
            return cv;
          });
        });
      });

      self._pending.set(i, p);
      p.catch(function () { }).then(function () { self._pending.delete(i); });
      return p;
    },

    _store: function (i, cv) {
      this._pages.set(i, cv);
      this._touch(i);
      /* 超容量时淘汰最久没被画到的一页；刚存进来的 i 绝不淘汰 */
      var guard = 0;
      while (this._pages.size > this._cap && guard++ < 256) {
        var old = this._order.shift();
        if (old === undefined) break;
        if (old === i) { this._order.push(old); continue; }
        this._pages.delete(old);
      }
      if (this.onPageReady) this.onPageReady(i);
    },

    _touch: function (i) {
      var k = this._order.indexOf(i);
      if (k >= 0) this._order.splice(k, 1);
      this._order.push(i);
    },

    /**
     * 同步取。未就绪时返回能用的低清替身（缩略图）并触发异步渲染，不会返回 null——
     * 每帧都调用一次，所以这里命中就 _touch，保证“正在画面上”的页不会被淘汰掉，
     * 否则播放时页面会在“有图 / 空帧”之间反复跳，看起来就是页面一闪一闪。
     */
    getPageSync: function (i) {
      var cv = this._pages.get(i);
      if (cv) {
        this._touch(i);
        return cv;
      }
      if (i < 0 || i >= this.numPages) return null;
      var lo = this._thumbs.get(i + ':168') || null;
      if (lo) this._touch(i);
      if (!this._pending.has(i)) this.renderPage(i).catch(function () { });
      return lo;
    },

    ensure: function (i) {
      if (i < 0 || i >= this.numPages) return Promise.resolve(null);
      return this.renderPage(i);
    },

    /** 预渲染一批页面 */
    warm: function (list) {
      var self = this;
      var uniq = [];
      list.forEach(function (i) {
        if (i >= 0 && i < self.numPages && uniq.indexOf(i) < 0 && !self._pages.has(i)) uniq.push(i);
      });
      return Promise.all(uniq.map(function (i) {
        return self.renderPage(i).catch(function () { });
      }));
    },

    /* ───────────── 缩略图 ───────────── */
    thumb: function (i, hpx) {
      var self = this;
      hpx = hpx || 168;
      var key = i + ':' + hpx;
      if (self._thumbs.has(key)) return Promise.resolve(self._thumbs.get(key));
      return self.pdf.getPage(i + 1).then(function (page) {
        var vp1 = page.getViewport({ scale: 1 });
        var vp = page.getViewport({ scale: hpx / vp1.height });
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(vp.width));
        cv.height = Math.max(1, Math.round(vp.height));
        var ctx = cv.getContext('2d', { alpha: false });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
          page.cleanup();
          self._thumbs.set(key, cv);
          return cv;
        });
      });
    },

    /* ───────────── 清理 ───────────── */
    destroy: function (keep) {
      if (this.pdf) {
        try { this.pdf.destroy(); } catch (e) { }
      }
      this.pdf = null;
      this.numPages = 0;
      this.ready = false;
      this._pages.clear();
      this._thumbs.clear();
      this._pending.clear();
      this._order = [];
      queue.length = 0;
    }
  };

  PF.PdfDoc = Doc;
  PF.b64ToBytes = b64ToBytes;
})(window);
