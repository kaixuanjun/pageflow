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

    /* 堆叠：卡片叠放，聚焦页抽到最前（focus 连续 → 抽牌一张接一张，不会瞬移） */
    stack: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var mid = (n - 1) / 2;
      var sp = 17 * o.p1;
      var span = Math.min(sp * (n - 1), 360);
      var step = n > 1 ? span / (n - 1) : 0;
      var jit = 2.5 * o.p2 * DEG;
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = i - mid;
        var k = Math.abs(i - fc);              /* 到聚焦页的距离：0 = 最上面那叠 */
        var w = clamp(1 - k, 0, 1);
        var p = emptyPose();
        p.x = d * step;
        p.y = -d * step * 0.55;
        /* z 必须随 k 单调下降，聚焦页的抬升也要随 k 递减 —— 否则抽牌时后面那张会
           一瞬间盖到最前面（两页几乎重叠，看起来就是硬切）。 */
        p.z = -k * 16 + 60 * w;
        p.scale = 1 + 0.04 * w;
        p.rz = Math.sin(i * 2.3999 + 0.7) * jit * (1 - 0.88 * w);
        out.push(p);
      }
      return out;
    },

    /* 平铺：自适应网格（聚焦高亮随 focus 连续移动，像在格子里扫过去） */
    tile: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var V = o.V, page = o.page;
      var gap = 20 * o.p1;
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
      var tilt = 8.5 * o.p2 * DEG;
      /* 快到最后一页时右页位会空出来：smoothly 把整体宽度收回去，避免翻页途中尺寸突变 */
      var two = clamp(n - 1 - fc, 0, 1);
      var fit = Math.min(1, (V.w * 0.90) / (page.w * (1 + two) + 12 * o.p1));
      var pw = page.w * fit;
      var gapx = 6 * o.p1 * fit;
      var halfW = pw / 2 + gapx;
      var step = 2 * halfW;
      /* 最后一页没有右页 → 整本书往右挪回来，单页依然居中 */
      var shift = halfW * (1 - two);
      var out = [];
      for (var i = 0; i < n; i++) {
        var q = i - fc;                 /* 0 = 左页，1 = 右页，连续 */
        var p = emptyPose();
        p.scale = fit;
        if (q >= 1) {
          /* 右边还没翻到的页：在右页位后面排队 */
          var ahead = Math.min(q - 1, 3);
          p.x = shift + halfW + (q - 1) * step;
          p.ry = -(tilt + ahead * 7 * DEG);
          p.z = -ahead * 170;
          p.opacity = clamp(1 - Math.max(0, ahead - 1) * 0.55, 0, 1);
        } else if (q > 0) {
          /* 正在翻的这一张：抬起来、绕过书脊，两端用 sin 平滑接上 */
          var sw = Math.sin((1 - q) * Math.PI);
          p.x = shift - halfW + q * step;
          p.ry = -tilt + 2 * tilt * (1 - q) + 62 * DEG * sw;
          p.z = 120 * sw;
          p.opacity = 1;
        } else if (q > -1) {
          /* 刚翻过去的那一张：原地压在左页位上，等下一张落下来才让位 */
          p.x = shift - halfW;
          p.ry = tilt;
          p.z = -6;
          p.opacity = 1;
        } else {
          /* 再往左是已经翻过去的一叠 */
          var back = Math.min(-q - 1, 3);
          p.x = shift - halfW + (q + 1) * step;
          p.ry = tilt + back * 7 * DEG;
          p.z = -6 - back * 170;
          p.opacity = clamp(1 - back * 0.5, 0, 1);
        }
        out.push(p);
      }
      return out;
    },

    /* 扇形：绕下方支点展开（focus 连续 → 整把扇子连续转） */
    fan: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var stepA = 4.6 * o.p1 * DEG;
      var R = 1120 * o.p2;
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = clamp(i - fc, -11, 11);
        var a = d * stepA;
        var p = emptyPose();
        p.x = R * Math.sin(a);
        p.y = R * (1 - Math.cos(a));
        p.rz = a;
        p.z = -Math.abs(d) * 7;
        p.opacity = clamp(1 - Math.max(0, Math.abs(d) - 7) * 0.2, 0, 1);
        out.push(p);
      }
      return out;
    },

    /* 环形：3D 转盘（focus 连续 → 转盘连续旋转） */
    carousel: function (o) {
      var n = o.n, fc = clamp(o.focus, 0, n - 1);
      var stepA = (360 / Math.max(n, 8)) * o.p2 * DEG;
      /* 由"相邻页弦距 ≈ 0.58 页宽"反解半径，保证真的看得到一圈 */
      var chord = o.page.w * 0.58;
      var R = clamp(chord / (2 * Math.sin(clamp(stepA, 0.02, Math.PI * 0.92) / 2)) * o.p1, 240, 2600);
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
      var sp = 196 * o.p1;
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
      var zStep = 132 * o.p1;
      var out = [];
      for (var i = 0; i < n; i++) {
        var d = i - fc;
        var p = emptyPose();
        p.x = d * 7 * o.p2;
        if (d >= 0) {
          p.z = -d * zStep;
          p.opacity = clamp(1 - d * 0.085, 0, 1);
        } else {
          p.z = -d * 330;
          p.opacity = clamp(1 + d * 0.62, 0, 1);
        }
        out.push(p);
      }
      return out;
    }
  };

  /* 按 z 升序排名（0 = 最远 = 最先画） */
  function zRanks(poses) {
    var idx = [];
    for (var i = 0; i < poses.length; i++) idx.push(i);
    idx.sort(function (x, y) { return poses[x].z - poses[y].z; });
    var r = new Array(poses.length);
    for (i = 0; i < idx.length; i++) r[idx[i]] = i;
    return r;
  }

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
  function sampleScene(kfs, t, ctx) {
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
    var base = { n: n, p1: p1, p2: p2, V: ctx.V, page: ctx.page, focus: fNow };

    var poses;
    if (a.layout === b.layout) {
      /* 同一个布局：直接在连续 focus 上采样，位移/翻页都是真连续 */
      poses = layoutPoses(a.layout, base);
    } else {
      /* 换布局：两端各采样一次再形变混合，端点值保持精确 */
      var pa = layoutPoses(a.layout, base);
      var pb = layoutPoses(b.layout, base);
      poses = new Array(n);
      var rankA = zRanks(pa), rankB = zRanks(pb), pw = ctx.page.w;
      var arc = Math.sin(Math.PI * e);

      /* 形变过程中两个布局对 z 的用法完全不同，逐项插值出来的 z 会互相穿越 ——
         两张完整的纸叠在一起，这个先后就只能整块换手，看起来是某一张瞬间盖到
         最上面。所以形变期间改用「离聚焦页越近越靠上」的固定叠放次序（和真实
         卡牌一致），并把 z 按这个次序拉成单调序列，任何一帧都不会再穿越。 */
      var order = [];
      for (var j = 0; j < n; j++) {
        poses[j] = mixPose(pa[j], pb[j], e);
        order.push({ j: j, k: Math.abs(j - fNow) });
      }
      order.sort(function (x, y) { return (y.k - x.k) || (x.j - y.j); });  /* 远的在前 */
      var cap = -1e9;
      for (var o = 0; o < order.length; o++) {
        var po = poses[order[o].j];
        if (po.z < cap + 0.02) po.z = cap + 0.02;
        cap = po.z;
      }

      /* 剩下唯一会换手的是「离聚焦页一样远」的两张（左右对称那一对）：让正在
         插队的那张先横向滑出对方的遮挡范围，插上去之后再滑回原位。两端 arc=0。 */
      if (arc > 0.001) {
        for (j = 0; j < n; j++) {
          var dRank = rankB[j] - rankA[j];         /* >0 往画面近处插队 */
          if (dRank <= 0) continue;
          var mag = Math.min(dRank, 4) / 4;
          var amp = (0.22 + 0.30 * mag) * pw * arc;
          poses[j].x += (pb[j].x >= 0 ? 1 : -1) * amp;  /* 往自己那一侧滑出去 */
        }
      }
    }

    var cam = {
      zoom: lerp(a.zoom, b.zoom, e),
      x: lerp(a.panX, b.panX, e),
      y: lerp(a.panY, b.panY, e),
      rot: lerp(a.rot, b.rot, e)
    };

    return { poses: poses, cam: cam, focus: fNow, from: a, to: b, e: e };
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
    makeKeyframe: makeKeyframe,
    defaultKeyframes: defaultKeyframes
  };
})(window);
