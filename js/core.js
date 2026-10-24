/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · core
   数学工具 / 缓动 / 布局函数 / 场景采样
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var DEG = Math.PI / 180;

  /* ───────────────────────── 基础工具 ───────────────────────── */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  var seed = 0;
  function uid() { seed++; return 'k' + seed.toString(36) + Math.random().toString(36).slice(2, 5); }

  var EASINGS = {
    smooth: { name: '平滑', fn: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } },
    linear: { name: '线性', fn: function (t) { return t; } },
    out:    { name: '减速', fn: function (t) { return 1 - Math.pow(1 - t, 3); } },
    soft:   { name: '柔和', fn: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; } },
    snap:   { name: '弹性', fn: function (t) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); } }
  };

  function ease(name, t) {
    var e = EASINGS[name] || EASINGS.smooth;
    return e.fn(clamp(t, 0, 1));
  }

  /* ───────────────────────── 布局定义 ───────────────────────── */
  var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">';

  var LAYOUTS = [
    {
      id: 'single', name: '单页', p1: '留白', p2: '微倾',
      icon: SVG_OPEN +
        '<rect x="5.6" y="2.9" width="12.8" height="18.2" rx="2.2"/>' +
        '<path d="M9 7.4h6M9 10.6h6M9 13.8h3.6" opacity=".45"/>' +
        '</svg>'
    },
    {
      id: 'stack', name: '堆叠', p1: '扩散', p2: '转角',
      icon: SVG_OPEN +
        '<rect x="3.4" y="7.6" width="11.2" height="14" rx="1.8" opacity=".28"/>' +
        '<rect x="6.4" y="5.1" width="11.2" height="14" rx="1.8" opacity=".55"/>' +
        '<rect x="9.4" y="2.6" width="11.2" height="14" rx="1.8"/>' +
        '</svg>'
    },
    {
      id: 'tile', name: '平铺', p1: '间距', p2: '倾角',
      icon: SVG_OPEN +
        '<rect x="2.9" y="3.1" width="7.9" height="8.2" rx="1.4"/>' +
        '<rect x="13.2" y="3.1" width="7.9" height="8.2" rx="1.4" opacity=".45"/>' +
        '<rect x="2.9" y="12.7" width="7.9" height="8.2" rx="1.4" opacity=".45"/>' +
        '<rect x="13.2" y="12.7" width="7.9" height="8.2" rx="1.4" opacity=".75"/>' +
        '</svg>'
    },
    {
      id: 'book', name: '书本', p1: '页距', p2: '倾斜',
      icon: SVG_OPEN +
        '<path d="M11.15 4.1H5.3c-1 0-1.7.7-1.7 1.7v12.4c0 1 .7 1.7 1.7 1.7h5.85z"/>' +
        '<path d="M12.85 4.1h5.85c1 0 1.7.7 1.7 1.7v12.4c0 1-.7 1.7-1.7 1.7h-5.85z" opacity=".55"/>' +
        '</svg>'
    },
    {
      id: 'fan', name: '扇形', p1: '弧度', p2: '半径',
      icon: SVG_OPEN +
        '<g transform="translate(12 20.6)">' +
        '<rect x="-3" y="-16.4" width="6" height="14.6" rx="1.3" transform="rotate(-27)" opacity=".35"/>' +
        '<rect x="-3" y="-16.4" width="6" height="14.6" rx="1.3" transform="rotate(27)" opacity=".35"/>' +
        '<rect x="-3.2" y="-17.4" width="6.4" height="15.4" rx="1.3"/>' +
        '</g></svg>'
    },
    {
      id: 'carousel', name: '环形', p1: '半径', p2: '步进',
      icon: SVG_OPEN +
        '<ellipse cx="12" cy="18.4" rx="8.6" ry="2.7" opacity=".35"/>' +
        '<ellipse cx="12" cy="5.6" rx="8.6" ry="2.7" opacity=".35"/>' +
        '<path d="M3.4 18.4V5.6M20.6 18.4V5.6" opacity=".22"/>' +
        '<path d="M9.7 4.9h4.6v14.2H9.7z" opacity=".85"/>' +
        '</svg>'
    },
    {
      id: 'coverflow', name: '画廊', p1: '间距', p2: '倾角',
      icon: SVG_OPEN +
        '<path d="M9.5 4.6h5v14.8h-5z"/>' +
        '<path d="M8.2 5.3 5.1 6.4v11.2l3.1 1.1z" opacity=".4"/>' +
        '<path d="m15.8 5.3 3.1 1.1v11.2l-3.1 1.1z" opacity=".4"/>' +
        '</svg>'
    },
    {
      id: 'depth', name: '纵深', p1: '层距', p2: '偏移',
      icon: SVG_OPEN +
        '<rect x="2.8" y="3.4" width="18.4" height="17.2" rx="2" opacity=".2"/>' +
        '<rect x="6.4" y="6.4" width="11.2" height="11.2" rx="1.8" opacity=".42"/>' +
        '<rect x="9.5" y="8.9" width="5" height="6.2" rx="1.2"/>' +
        '</svg>'
    }
  ];

  var LAYOUT_MAP = {};
  LAYOUTS.forEach(function (l) { LAYOUT_MAP[l.id] = l; });

  /* ───────────────────────── 页面基准尺寸 ───────────────────────── */
  function fitPage(V, ar) {
    var h = V.h * 0.8;
    var w = h * ar;
    var maxW = V.w * 0.86;
    if (w > maxW) { w = maxW; h = w / ar; }
    return { w: w, h: h };
  }

  function emptyPose() {
    return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 1, opacity: 1 };
  }

  /* ───────────────────────── 各布局 ─────────────────────────
     输入 o = { n, focus, p1, p2, V:{w,h}, page:{w,h} }
     输出 长度 n 的 pose 数组（世界坐标，中心原点，y 向下，z 朝向观察者）
     ─────────────────────────────────────────────────────────── */
  var LAYOUT_FN = {

    /* 单页：只留聚焦页，其余淡出。focus 连续 → 跨页时做交叉淡入，不会突然换页 */
    single: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var s = clamp(1 + (o.p1 - 1) * 0.26, 0.72, Math.min(1.18, o.V.w * 0.94 / o.page.w));
      var tilt = (o.p2 - 1) * 5 * DEG;
      var out = [];
      for (var i = 0; i < n; i++) {
        var w = clamp(1 - Math.abs(i - fc), 0, 1);  /* 1 = 正在显示，0 = 完全退场 */
        var p = emptyPose();
        p.scale = s;
        p.rz = tilt;
        p.x = (i < fc ? -22 : 22) * (1 - w);
        p.z = -40 * (1 - w);
        p.opacity = w;
        out.push(p);
      }
      return out;
    },

    /* 堆叠：卡牌叠成一副，聚焦页抽到最前。整副牌的位置跟着 focus 走（q = i - fc），
       所以每翻一页整副牌都会往前推一格；正在离开最前面的那一张还会额外向左滑出去、
       露着半个身子沉到牌堆下面 —— 抽牌动作是看得见的，不是原地换个高亮。 */
    stack: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var bo = clamp(o.boost || 0, 0, 1);
      var sp = 17 * o.p1 * (1 + 0.85 * bo);
      var span = Math.min(sp * (n - 1), 360);
      var step = n > 1 ? span / (n - 1) : 0;
      var jit = 2.5 * o.p2 * DEG;
      var out = [];
      for (var i = 0; i < n; i++) {
        var q = i - fc;                        /* 相对聚焦页：>0 还没翻到，<0 已经翻过 */
        var k = Math.abs(q);
        var w = clamp(1 - k, 0, 1);            /* 聚焦程度：1 = 正被抽出来的那张 */
        var sw = Math.sin(Math.PI * clamp(-q, 0, 1));   /* 刚离开最前的那张：滑开再落下 */
        var p = emptyPose();
        p.x = q * step - sw * 92 * o.p1;
        p.y = -q * step * 0.55 - 16 * w;
        /* z 随 k 单调下降（抽牌不会突然换手），聚焦页再额外抬到最前 */
        p.z = -k * 16 + 200 * w + 70 * sw;
        p.scale = 1 + 0.07 * w;
        p.rz = Math.sin(i * 2.3999 + 0.7) * jit * (1 - 0.88 * w) + sw * 7 * DEG;
        out.push(p);
      }
      return out;
    },

    /* 平铺：自适应网格（聚焦高亮随 focus 连续移动，像在格子里扫过去） */
    tile: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var V = o.V, page = o.page;
      var bo = clamp(o.boost || 0, 0, 1);
      var gap = 20 * o.p1 * (1 + 1.1 * bo);
      var ar = page.w / page.h;
      var cols = clamp(Math.ceil(Math.sqrt(n * (V.w / V.h) / ar)), 1, n);
      var rows = Math.ceil(n / cols);
      var availW = V.w * 0.9, availH = V.h * 0.84;
      var cw = (availW - gap * (cols - 1)) / cols;
      var chh = (availH - gap * (rows - 1)) / rows;
      var sc = Math.min(cw / page.w, chh / page.h) * 0.97;
      var stepX = cw + gap, stepY = chh + gap;
      var tilt = (o.p2 - 1) * 6 * DEG;
      var out = [];
      for (var i = 0; i < n; i++) {
        var r = Math.floor(i / cols), c = i % cols;
        var inRow = Math.min(cols, n - r * cols);
        var w = clamp(1 - Math.abs(i - fc), 0, 1);
        var p = emptyPose();
        p.x = (c - (inRow - 1) / 2) * stepX;
        p.y = (r - (rows - 1) / 2) * stepY;
        p.scale = sc * (1 + 0.07 * w);
        p.z = 55 * w;
        p.rz = tilt * (1 - w);
        out.push(p);
      }
      return out;
    },

    /* 书本：左右对开。focus 连续 → 整本书像传送带一样滑，跨页的那一张会抬起、绕书脊摆过去。
       相邻页在传送带上的间距正好是 2*halfW（一个书脊到下一个书脊），所以 focus 每加 1 就翻一张。 */
    book: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var page = o.page, V = o.V;
      /* o.flat 只在"正在切到别的布局"时由 sampleScene 传进来（中段为 1、两端为 0）：
         书页朝观者翘起的那个倾角和翻页时的摆动幅度会收敛掉。否则和画廊的倾斜叠加
         起来，已经翻过去的页会一张平一张斜，看着像错位。 */
      var flat = clamp(o.flat || 0, 0, 1);
      var tilt = 8.5 * o.p2 * DEG * (1 - flat);
      /* 快到最后一页时右页位会空出来：平滑把整体宽度收回去，避免翻页途中尺寸突变 */
      var two = clamp(n - 1 - fc, 0, 1);
      var fit = Math.min(1, (V.w * 0.90) / (page.w * (1 + two) + 12 * o.p1));
      var pw = page.w * fit;
      var gapx = 6 * o.p1 * fit * (1 + 1.4 * clamp(o.boost || 0, 0, 1));
      var step = pw + 2 * gapx;
      /* 书脊在 x = shift。左右页位分别是 ±pw/2 —— 这个选择是刻意的：
         物理弯纸的铰链也正好在 shift、平摊时正好铺满 [shift, shift+pw]（右页位）
         或 [shift-pw, shift]（左页位），于是翻页进度走到 0 或 1 时，
         弯纸的姿态和"翻完之后静止的刚体"逐像素吻合，切换时不会闪一下。 */
      var shift = (pw / 2) * (1 - two);
      var out = [];
      for (var i = 0; i < n; i++) {
        var q = i - fc;                 /* 0 = 左页，1 = 右页，连续 */
        var p = emptyPose();
        p.scale = fit;
        p.turnGeom = { hx: shift, hy: 0, hz: 0, w: pw, h: page.h * fit, tilt: tilt };
        if (q >= 1) {
          /* 右边还没翻到的页：在右页位后面排队，退到聚焦页之后（-10 起） */
          var ahead = Math.min(q - 1, 3);
          p.x = shift + pw / 2 + gapx + (q - 1) * step;
          p.ry = -(tilt + ahead * 7 * DEG);
          p.z = -10 - ahead * 170;
          p.opacity = clamp(1 - Math.max(0, ahead - 1) * 0.55, 0, 1);
        } else if (q > 0) {
          /* 正在翻的这一张：页心从右页位线性走到左页位，倾角从 -tilt 过到 +tilt，
             中途抬起(z 拱起来)并甩一下。两端分别对上"还没翻"(z=-10、-tilt)
             与"翻完压在左页位"(z=0、+tilt)，所以不会在交接处跳。 */
          /* q=1 在右页位、q=0 在左页位 —— 所以是 shift-pw/2 + q*pw（这个方向写反过一次，
             结果翻页那张从左边往右边走，落点和静止位全对不上） */
          p.x = shift - pw / 2 + q * pw;
          /* 倾角：右页位 -tilt → 中途几乎侧对观者（这才是"翻过去"）→ 左页位 +tilt */
          p.ry = tilt * (1 - 2 * q) - 70 * DEG * Math.sin(Math.PI * q);
          p.z = 130 * Math.sin(Math.PI * q);
          p.opacity = 1;
          p.turn = { q: q, hx: shift, hy: 0, hz: 0, w: pw, h: page.h * fit };
        } else {
          /* 已经翻到左边的一叠：聚焦页那一张（q=0）正好在左页位、z 最高，
             再往前翻过的依次往左退、往后退、并淡出。 */
          var back = Math.min(-q, 1.2);
          p.x = shift - pw / 2 - back * step * 0.55;
          p.ry = tilt + back * 7 * DEG;
          p.z = back <= 0 ? 0 : -8 - back * 190;
          p.opacity = back <= 0 ? 1 : clamp(1 - back * 0.85, 0, 1);
        }
        out.push(p);
      }
      return out;
    },

    /* 扇形：绕下方支点展开（focus 连续 → 整把扇子连续转），聚焦页会从扇面里
       被抽出来、朝观者抬起；换页时上一张落回扇面、下一张抽出来，动作是连续的。 */
    fan: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      /* 过渡中段把弧度和半径一起放大：扇面张开、纸与纸之间露出缝，
         要上来的那一页就能从缝里抬到最前面，而不必整块换手（关键帧处仍是用户设的值）。 */
      var bo = clamp(o.boost || 0, 0, 1);
      var stepA = 4.6 * o.p1 * (1 + 0.85 * bo) * DEG;
      var R = 1120 * o.p2 * (1 + 0.45 * bo);
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = clamp(i - fc, -11, 11);
        var a = d * stepA;
        var w = clamp(1 - Math.abs(d), 0, 1);          /* 聚焦程度 */
        var sw = Math.sin(Math.PI * clamp(-d, 0, 1));  /* 刚离开聚焦位的那张：滑开再落回 */
        var p = emptyPose();
        p.x = R * Math.sin(a) - sw * 48 * o.p1;
        p.y = R * (1 - Math.cos(a)) - 38 * w;
        p.rz = a + sw * 6 * DEG;
        p.z = -Math.abs(d) * 7 + 260 * w + 50 * sw;
        p.scale = 1 + 0.10 * w;
        p.opacity = clamp(1 - Math.max(0, Math.abs(d) - 7) * 0.2, 0, 1);
        out.push(p);
      }
      return out;
    },

    /* 环形：3D 转盘（focus 连续 → 转盘连续旋转） */
    carousel: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var bo = clamp(o.boost || 0, 0, 1);
      var stepA = (360 / Math.max(n, 8)) * o.p2 * DEG;
      /* 由"相邻页弦距 ≈ 0.58 页宽"反解半径，保证真的看得到一圈 */
      var chord = o.page.w * 0.58;
      var R = clamp(chord / (2 * Math.sin(clamp(stepA, 0.02, Math.PI * 0.92) / 2)) * o.p1 * (1 + 0.45 * bo), 240, 3200);
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = ((i - fc) % n + n) % n;
        if (d > n / 2) d -= n;
        var a = d * stepA;
        var p = emptyPose();
        p.x = R * Math.sin(a);
        p.z = -R * (1 - Math.cos(a));
        p.ry = -a;
        p.opacity = clamp(0.32 + 0.68 * Math.cos(a), 0, 1);
        out.push(p);
      }
      return out;
    },

    /* 画廊：封面流（focus 连续 → 整排封面连续掠过） */
    coverflow: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var bo = clamp(o.boost || 0, 0, 1);
      var sp = 196 * o.p1 * (1 + 0.50 * bo);
      var maxT = 62 * o.p2;
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = i - fc, ad = Math.abs(d);
        var p = emptyPose();
        p.x = d * sp;
        p.z = -Math.min(ad, 7) * 155;
        p.ry = clamp(d * 33, -maxT, maxT) * DEG;
        p.opacity = ad > 4 ? clamp(1 - (ad - 4) * 0.26, 0, 1) : 1;
        out.push(p);
      }
      return out;
    },

    /* 纵深：隧道式后退（focus 连续 → 连续倒退） */
    depth: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var bo = clamp(o.boost || 0, 0, 1);
      var zStep = 132 * o.p1 * (1 + 0.6 * bo);
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = i - fc;
        var p = emptyPose();
        p.x = d * 7 * o.p2;
        if (d >= 0) {
          p.z = -d * zStep;
          p.opacity = clamp(1 - d * 0.085, 0, 1);
        } else {
          /* 已经翻过去的页往后走（负 z），只做淡出，不压到聚焦页前面 */
          p.z = d * 330;
          p.opacity = clamp(1 + d * 0.62, 0, 1);
        }
        out.push(p);
      }
      return out;
    }
  };

  function layoutPoses(id, opt) {
    var fn = LAYOUT_FN[id] || LAYOUT_FN.stack;
    return fn(opt);
  }

  /* ─────────────────────── 场景采样（关键帧插值） ─────────────────────── */
  function mixPose(a, b, t) {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      rx: a.rx + (b.rx - a.rx) * t,
      ry: a.ry + (b.ry - a.ry) * t,
      rz: a.rz + (b.rz - a.rz) * t,
      scale: a.scale + (b.scale - a.scale) * t,
      opacity: a.opacity + (b.opacity - a.opacity) * t
    };
  }

  /**
   * @param {Array} kfs 已按 t 排序的关键帧
   * @param {number} t
   * @param {{n:number,V:{w:number,h:number},page:{w:number,h:number}}} ctx
   */
  function targets(kfs, t, ctx) {
    var n = ctx.n;
    if (!n || !kfs.length) return null;

    var a = kfs[0], b = null, e = 0;
    if (t <= a.t) {
      b = a;
    } else if (t >= kfs[kfs.length - 1].t) {
      a = kfs[kfs.length - 1]; b = a;
    } else {
      for (var i = 0; i < kfs.length - 1; i++) {
        if (t >= kfs[i].t && t < kfs[i + 1].t) { a = kfs[i]; b = kfs[i + 1]; break; }
      }
      if (!b) { a = kfs[kfs.length - 1]; b = a; }
      else if (b.t > a.t) e = ease(a.ease, (t - a.t) / (b.t - a.t));
    }

    var p1 = lerp(a.p1, b.p1, e);
    var p2 = lerp(a.p2, b.p2, e);
    /* 聚焦页也跟着缓动连续推进：大跨度跳页时中间每张都会经过一遍，
       而不是"两端都不在画面里"直接硬切过去 */
    var fNow = lerp(a.focus, b.focus, e);
    /* 让位量：两端为 0（关键帧画面不变），过渡中段为 1。各布局拿它把间距临时撑开，
       让要上来的那一页从缝里穿过去，而不是整块盖住别人。 */
    var boost = Math.sin(Math.PI * e);
    var base = { n: n, p1: p1, p2: p2, V: ctx.V, page: ctx.page, focus: fNow, boost: boost };

    var poses;
    if (a.layout === b.layout) {
      /* 同一个布局：直接在连续 focus 上采样，位移/翻页都是真连续 */
      poses = layoutPoses(a.layout, base);

    } else {
      /* 换布局：两端各采样一次再形变混合，端点值保持精确。
         中段把「书页朝观者翘起/翻页摆动」这类布局自带的姿态收敛掉（flat 两端为 0，
         所以关键帧本身还是原样），免得和目标布局的倾斜互相打架、已经翻过的页错位。 */
      var flatBase = { n: n, p1: p1, p2: p2, V: ctx.V, page: ctx.page, focus: fNow, boost: Math.sin(Math.PI * e), flat: Math.sin(Math.PI * e) };
      var pa = layoutPoses(a.layout, flatBase);
      var pb = layoutPoses(b.layout, flatBase);
      poses = new Array(n);

      /* 形变过程中两个布局对 z 的用法完全不同，逐项插值出来的 z 会互相穿越 ——
         两张完整的纸叠在一起，这个先后就只能整块换手，看起来是某一张瞬间盖到
         最上面。所以形变期间改用「离聚焦页越近越靠上」的固定叠放次序（和真实
         卡牌一致）。做法是把混合出来的那批 z 值**整体按次序重新分配**，而不是
         把越界的 z 夹到邻居旁边 —— 夹会毁掉原有的前后纵深（书本里已经翻过去的
         页本来退得很远，一夹就被拉到最前面来了）。 */
      var order = [], zs = [];
      var kmax = Math.max(1, (n - 1) / 2);
      for (var j = 0; j < n; j++) {
        /* 逐页错开形变进度：离聚焦页越近越早出发。所有页面同时形变的话，中段会
           变成一副「摊开的牌」——每张都带着一半书本姿态一半画廊倾角、还彼此拉开
           等距，看起来像散架；错开之后中段只有少数几张在途中，像真的一把把发牌。 */
        var kj = Math.min(Math.abs(j - fNow) / kmax, 1);
        var lag = 0.42 * kj;
        var ej = clamp((e - lag) / (1 - lag), 0, 1);
        poses[j] = mixPose(pa[j], pb[j], ej);
        order.push({ j: j, k: Math.abs(j - fNow) });
        zs.push(poses[j].z);
      }
      order.sort(function (x, y) { return (y.k - x.k) || (x.j - y.j); });  /* 远的在前 */
      zs.sort(function (x, y) { return x - y; });
      for (var o = 0; o < order.length; o++) poses[order[o].j].z = zs[o];

      /* 注：这里曾经让「正在插队」的页横向滑出去避让，但那个判据是离散的
         （名次差是整数、左右由 x 的正负决定），名次一变位移就整块跳一下 ——
         实测单帧能跳 340 单位，比原来那点换手还难看。整页排序 + 上面的次序
         重排已经保证不会有整块换手，所以这里不再加横向位移。 */
    }

    var cam = {
      zoom: lerp(a.zoom, b.zoom, e),
      x: lerp(a.panX, b.panX, e),
      y: lerp(a.panY, b.panY, e),
      rot: lerp(a.rot, b.rot, e)
    };

    return { poses: poses, cam: cam, focus: fNow, from: a, to: b, e: e,
             aIdx: kfs.indexOf(a), bIdx: kfs.indexOf(b) };
  }

  /* 动画到底怎么走：交给物理引擎（js/physics.js）。
     它把每条关键帧的目标位姿当成"想要的位置"，用有质量、有惯性的纸去追，
     并在纸与纸之间做接触解算 —— 于是位移有起速与收尾、纸不会互相穿过。
     PF.core.physics = false 或 URL 带 ?phys=0 可退回纯解析插值（排查用）。 */
  function physicsOn() {
    if (PF.core.physics === false) return false;
    if (typeof location !== 'undefined' && /[?&#](phys=0|nophys)\b/.test(location.search + location.hash)) return false;
    return !!(PF.Phys && PF.Phys.sample);
  }

  function sampleScene(kfs, t, ctx) {
    if (physicsOn()) {
      var dur = (PF.state && PF.state.dur) || (kfs.length ? kfs[kfs.length - 1].t + 1 : 1);
      try {
        var out = PF.Phys.sample(kfs, t, ctx, dur);
        if (out) return out;
      } catch (err) {
        if (typeof console !== 'undefined') console.warn('[PAGEFLOW] 物理解算失败，退回解析插值：', err && err.message);
        PF.core.physics = false;
      }
    }
    return targets(kfs, t, ctx);
  }

  /* ─────────────────────── 关键帧构造 ─────────────────────── */
  function makeKeyframe(t, layout, focus, extra) {
    var k = {
      id: uid(),
      t: Math.max(0, t),
      layout: layout || 'stack',
      focus: focus || 0,
      ease: 'smooth',
      zoom: 1, panX: 0, panY: 0, rot: 0,
      p1: 1, p2: 1
    };
    if (extra) Object.assign(k, extra);
    return k;
  }

  /** 载入 PDF 后生成的默认动画分镜 */
  function defaultKeyframes(n) {
    var last = Math.max(0, n - 1);
    var mid = Math.min(last, Math.max(0, Math.round(last * 0.5)));
    var specs = [
      [0.0,  'stack',     0, { zoom: 0.92 }],
      [2.4,  'book',      0, { zoom: 1.05 }],
      [3.9,  'book',      Math.min(1, last), { zoom: 1.05 }],
      [5.4,  'book',      Math.min(2, last), { zoom: 1.05 }],
      [7.4,  'coverflow', mid, { zoom: 0.95 }],
      [9.6,  'tile',      0, { zoom: 0.98 }]
    ];
    var out = specs.map(function (s) {
      var k = makeKeyframe(s[0], s[1], s[2], s[3]);
      if (s[1] === 'coverflow') k.ease = 'soft';
      if (s[1] === 'tile') k.ease = 'out';
      return k;
    });
    // 若页数很少，收缩到更紧凑的分镜
    if (n <= 2) {
      out = [
        makeKeyframe(0, 'single', 0),
        makeKeyframe(2.6, 'stack', 0),
        makeKeyframe(5.2, 'fan', 0),
        makeKeyframe(7.6, 'tile', 0)
      ];
    }
    return out;
  }

  PF.core = {
    DEG: DEG,
    clamp: clamp,
    lerp: lerp,
    num: num,
    smoothstep: smoothstep,
    uid: uid,
    EASINGS: EASINGS,
    ease: ease,
    LAYOUTS: LAYOUTS,
    LAYOUT_MAP: LAYOUT_MAP,
    fitPage: fitPage,
    layoutPoses: layoutPoses,
    sampleScene: sampleScene,
    targets: targets,
    makeKeyframe: makeKeyframe,
    defaultKeyframes: defaultKeyframes
  };
})(window);
