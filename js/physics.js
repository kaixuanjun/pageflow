/* ═══════════════════════════════════════════════════════════════════════════
   PAGEFLOW · 物理引擎（js/physics.js）

   目标只有一个：**让纸按物理规律动**，而不是把两个位姿做线性插值。

   两种物体：
   ── 刚体纸片（每个布局里的每一页）
      有质量、有转动惯量（薄板：绕法线最难转、绕书脊最容易），被一根弹簧拉向
      关键帧给它的目标位姿。因为有惯性与阻尼，它会自己起速、略微过冲再停下来，
      而不是匀速滑过去。
      纸与纸之间做**深度方向的接触解算**：两张纸屏幕范围重叠、深度又挨得太近时，
      沿深度把它们推开并吃掉相对速度 —— 于是两张纸不可能互相穿过，"整块换手"
      在物理上就不存在了。

   ── 正在翻的那一张（书本模式）
      角位移是独立的转动自由度，同样带惯性与阻尼（所以翻页会自己加速、会"扑"
      下去）；弯曲形状由 js/sheet.js 的链式弹簧给出。两者叠在一起才是一张真的
      纸绕书脊翻过去。

   全部确定性（无随机数）：同一组关键帧 → 逐帧一致的积分结果，所以导出成片和
   预览是同一件事。整条时间轴的位姿预积分成表（120Hz），运行时只查表 + 插值，
   渲染循环里不跑动力学。
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var PF = global.PF = global.PF || {};

  var DIV = 120;                 /* 每秒快照数 */
  var DT = 1 / 240;              /* 积分步长 */
  var THICK = 15;                /* 一张纸在深度方向上的厚度（世界单位） */

  /* 弹簧：位置 / 角度 / 缩放 / 翻页进度。阻尼取临界阻尼的 0.92 倍 —— 略微欠阻尼，
     有惯性感但不会来回晃。 */
  var KP = 380, CD = 2 * Math.sqrt(KP) * 0.90;
  var KO = 420, COD = 2 * Math.sqrt(KO) * 0.90;
  var KS = 340, KSD = 2 * Math.sqrt(KS) * 0.95;
  var KU = 240, KUD = 2 * Math.sqrt(KU) * 0.90;

  /* 薄板转动惯量（相对值）：绕 X、Y（面内轴）≈ m L²/12，绕 Z（法线）≈ m L²/6 */
  var INERTIA = [1.00, 0.86, 1.70];

  /* 静止吸附：误差与速度都够小就直接落到目标，避免永远微微抖动 */
  var REST_P = 0.05, REST_V = 0.08, REST_A = 0.0008, REST_AV = 0.0015;

  var cache = { key: '', table: null };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function signature(kfs, ctx, dur) {
    var s = [dur.toFixed(3), ctx.n, ctx.page.w.toFixed(2), ctx.page.h.toFixed(2),
             ctx.V.w.toFixed(2), ctx.V.h.toFixed(2)].join('|');
    for (var i = 0; i < kfs.length; i++) {
      var k = kfs[i];
      s += '#' + [k.id, k.t.toFixed(4), k.layout, k.focus.toFixed(3), k.ease,
                  k.zoom.toFixed(3), k.panX.toFixed(2), k.panY.toFixed(2),
                  k.rot.toFixed(4), k.p1.toFixed(3), k.p2.toFixed(3)].join(',');
    }
    return s;
  }

  function newBody() {
    return {
      x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, o: 1,
      vx: 0, vy: 0, vz: 0, wrx: 0, wry: 0, wrz: 0, vs: 0, vo: 0,
      u: 0, vu: 0            /* 书本翻页进度：0 = 右页位，1 = 已翻到左页位 */
    };
  }

  function snapTo(b, p) {
    b.x = p.x; b.y = p.y; b.z = p.z;
    b.rx = p.rx; b.ry = p.ry; b.rz = p.rz;
    b.s = p.scale; b.o = p.opacity;
  }

  /* 一张纸的积分：线性三个自由度 + 角度三个自由度 + 缩放 + 透明度 */
  function stepBody(b, tp, dt, ctx) {
    var dx = tp.x - b.x, dy = tp.y - b.y, dz = tp.z - b.z;
    b.vx += (KP * dx - CD * b.vx) * dt;
    b.vy += (KP * dy - CD * b.vy) * dt;
    b.vz += (KP * dz - CD * b.vz) * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;

    var ex = tp.rx - b.rx, ey = tp.ry - b.ry, ez = tp.rz - b.rz;
    b.wrx += ((KO * ex - COD * b.wrx) / INERTIA[0]) * dt;
    b.wry += ((KO * ey - COD * b.wry) / INERTIA[1]) * dt;
    b.wrz += ((KO * ez - COD * b.wrz) / INERTIA[2]) * dt;
    b.rx += b.wrx * dt; b.ry += b.wry * dt; b.rz += b.wrz * dt;

    b.vs += (KS * (tp.scale - b.s) - KSD * b.vs) * dt;
    b.s += b.vs * dt;
    b.vo += (KS * (tp.opacity - b.o) - KSD * b.vo) * dt;
    b.o += b.vo * dt;

    if (Math.abs(dx) < REST_P && Math.abs(dy) < REST_P && Math.abs(dz) < REST_P &&
        Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vz) < REST_V) {
      b.x = tp.x; b.y = tp.y; b.z = tp.z; b.vx = b.vy = b.vz = 0;
    }
    if (Math.abs(ex) + Math.abs(ey) + Math.abs(ez) < REST_A &&
        Math.abs(b.wrx) + Math.abs(b.wry) + Math.abs(b.wrz) < REST_AV) {
      b.rx = tp.rx; b.ry = tp.ry; b.rz = tp.rz; b.wrx = b.wry = b.wrz = 0;
    }
    if (Math.abs(tp.scale - b.s) < 0.0008) { b.s = tp.scale; b.vs = 0; }
    if (Math.abs(tp.opacity - b.o) < 0.0008) { b.o = tp.opacity; b.vo = 0; }
    b.o = clamp(b.o, 0, 1);

    /* 目标已经飞到画面外很远：直接吸附过去。它们看不见，没必要让它们慢慢飘，
       否则整条时间轴上会挂着一长串"还在赶路"的尾巴。 */
    if (ctx && ctx.V) {
      b.far = Math.abs(tp.x) > ctx.V.w * 1.8 || tp.z < -1400 || Math.abs(tp.y) > ctx.V.h * 1.8;
      if (b.far) { b.x = tp.x; b.y = tp.y; b.z = tp.z; b.vx = b.vy = b.vz = 0; }
    } else { b.far = false; }
  }

  /* 纸与纸的深度接触：屏幕范围重叠 + 深度太近 → 沿深度推开、吃掉相对速度。
     这就是"纸不能互相穿过"，也是遮挡关系成立的根本原因。 */
  function resolveContacts(bodies, ctx, skip) {
    var n = bodies.length, pw = ctx.page.w, ph = ctx.page.h;
    for (var i = 0; i < n; i++) {
      if (skip[i]) continue;
      var a = bodies[i], hi = pw * a.s * 0.5, vi = ph * a.s * 0.5;
      for (var j = i + 1; j < n; j++) {
        if (skip[j]) continue;
        var b = bodies[j], hj = pw * b.s * 0.5, vj = ph * b.s * 0.5;
        if (a.far && b.far) { continue; }          /* 两张都在画面外，不用解算 */
        if (Math.abs(a.x - b.x) > (hi + hj) * 0.58) continue;
        if (Math.abs(a.y - b.y) > (vi + vj) * 0.58) continue;
        var dz = a.z - b.z;
        if (Math.abs(dz) >= THICK) continue;

        var sgn = dz >= 0 ? 1 : -1;                 /* a 在前（z 更大） */
        var corr = (THICK - Math.abs(dz)) * 0.5;
        a.z += sgn * corr; b.z -= sgn * corr;
        var rv = (a.vz - b.vz) * sgn;
        if (rv < 0) {                                /* 还在互相靠近 → 非弹性碰撞 */
          var imp = -rv * 0.5;
          a.vz += sgn * imp; b.vz -= sgn * imp;
        }
        a.vx *= 0.985; a.vy *= 0.985;                /* 接触摩擦 */
        b.vx *= 0.985; b.vy *= 0.985;
      }
    }
  }

  /* 正在翻的是哪一张：q = i - focus 落在 (0,1) 的那一张，也就是 ceil(focus)。
     （focus 是"左页编号 + 进度"，所以翻页的是它右边那一张。） */
  function turnIndex(focus) { return Math.floor(focus) + 1; }

  /* ─────────────────────────── 建表 ─────────────────────────── */
  function build(kfs, ctx, dur) {
    if (!kfs || !kfs.length || !ctx || !ctx.n || !ctx.page) return null;
    var n = ctx.n;
    var frames = Math.max(2, Math.round(dur * DIV) + 1);
    var sub = Math.max(1, Math.round((1 / DIV) / DT));
    var STRIDE = 9;                                  /* 8 个位姿量 + 翻页进度 u */
    var data = new Float32Array(frames * n * STRIDE);
    var camD = new Float32Array(frames * 4);
    var focD = new Float32Array(frames);

    var bodies = [], i, skip = new Array(n);
    for (i = 0; i < n; i++) bodies.push(newBody());

    var t0 = PF.core.targets(kfs, 0, ctx);
    for (i = 0; i < n; i++) {
      snapTo(bodies[i], t0.poses[i]);
      bodies[i].u = clamp(t0.focus - i + 1, 0, 1);
    }

    var t = 0;
    for (var f = 0; f < frames; f++) {
      var base = f * n * STRIDE;
      for (i = 0; i < n; i++) {
        var bd = bodies[i], o = base + i * STRIDE;
        data[o] = bd.x; data[o + 1] = bd.y; data[o + 2] = bd.z;
        data[o + 3] = bd.rx; data[o + 4] = bd.ry; data[o + 5] = bd.rz;
        data[o + 6] = bd.s; data[o + 7] = bd.o; data[o + 8] = bd.u;
      }
      /* 相机与焦点用解析值：镜头不是纸，不需要惯性 */
      var tgc = PF.core.targets(kfs, t, ctx);
      camD[f * 4] = tgc.cam.zoom; camD[f * 4 + 1] = tgc.cam.x;
      camD[f * 4 + 2] = tgc.cam.y; camD[f * 4 + 3] = tgc.cam.rot;
      focD[f] = tgc.focus;

      for (var s = 0; s < sub; s++) {
        t += DT;
        var tg = PF.core.targets(kfs, t, ctx);
        var book = !!(tg.from && tg.from.layout === 'book' && tg.to && tg.to.layout === 'book');
        var ti = book ? turnIndex(tg.focus) : -1;
        for (i = 0; i < n; i++) {
          skip[i] = (book && i === ti) ? 1 : 0;      /* 翻页那张的遮挡交给弯曲链，不参与纸-纸接触 */
          stepBody(bodies[i], tg.poses[i], DT, ctx);
        }
        if (book) {
          for (i = 0; i < n; i++) {
            var ut = clamp(tg.focus - i + 1, 0, 1);
            bodies[i].vu += (KU * (ut - bodies[i].u) - KUD * bodies[i].vu) * DT;
            bodies[i].u += bodies[i].vu * DT;
            if (Math.abs(ut - bodies[i].u) < 0.0008) { bodies[i].u = ut; bodies[i].vu = 0; }
          }
        }
        resolveContacts(bodies, ctx, skip);
      }
    }

    return { key: signature(kfs, ctx, dur), frames: frames, n: n, dur: dur, stride: STRIDE,
             data: data, cam: camD, focus: focD };
  }

  /* ─────────────────────────── 查表采样 ─────────────────────────── */
  function sample(kfs, t, ctx, dur) {
    if (!kfs || !kfs.length || !ctx || !ctx.n || !ctx.page) return null;
    if (!(dur > 0)) dur = kfs[kfs.length - 1].t + 1;
    var key = signature(kfs, ctx, dur);
    if (!cache.table || cache.key !== key) {
      cache.table = build(kfs, ctx, dur);
      cache.key = key;
    }
    var tb = cache.table;
    if (!tb) return null;
    var n = tb.n, ST = tb.stride;
    var x = clamp(t * DIV, 0, tb.frames - 1);
    var f0 = Math.floor(x), f1 = Math.min(f0 + 1, tb.frames - 1), al = x - f0;

    var poses = new Array(n), i, o0, o1;
    for (i = 0; i < n; i++) {
      o0 = f0 * n * ST + i * ST; o1 = f1 * n * ST + i * ST;
      poses[i] = {
        x: tb.data[o0] + (tb.data[o1] - tb.data[o0]) * al,
        y: tb.data[o0 + 1] + (tb.data[o1 + 1] - tb.data[o0 + 1]) * al,
        z: tb.data[o0 + 2] + (tb.data[o1 + 2] - tb.data[o0 + 2]) * al,
        rx: tb.data[o0 + 3] + (tb.data[o1 + 3] - tb.data[o0 + 3]) * al,
        ry: tb.data[o0 + 4] + (tb.data[o1 + 4] - tb.data[o0 + 4]) * al,
        rz: tb.data[o0 + 5] + (tb.data[o1 + 5] - tb.data[o0 + 5]) * al,
        scale: tb.data[o0 + 6] + (tb.data[o1 + 6] - tb.data[o0 + 6]) * al,
        opacity: tb.data[o0 + 7] + (tb.data[o1 + 7] - tb.data[o0 + 7]) * al,
        u: tb.data[o0 + 8] + (tb.data[o1 + 8] - tb.data[o0 + 8]) * al
      };
    }

    var tg = PF.core.targets(kfs, t, ctx);

    /* 弯纸（js/sheet.js）已经停用：书本不再做独一份的拟真翻页，所有布局统一用刚体页。
       代码保留在 sheet.js / engine.js 的 drawSheet 里，PF.core.sheet = true 可重新打开。 */
    if (PF.core && PF.core.sheet === true) {
      for (i = 0; i < n; i++) {
        var g0 = tg.poses[i];
        if (!g0 || !g0.turnGeom || !PF.Sheet) continue;
        var u0 = clamp(poses[i].u == null ? 0 : poses[i].u, 0, 1);
        if (u0 <= 0.002 || u0 >= 0.998) continue;
        var g1 = g0.turnGeom;
        poses[i].sheet = {
          hx: g1.hx, hy: g1.hy, hz: g1.hz, w: g1.w, h: g1.h,
          angles: PF.Sheet.anglesFor('turn', u0),
          u: u0,
          base: -g1.tilt + 2 * g1.tilt * u0,
          lift: Math.sin(Math.PI * u0)
        };
        poses[i].x = g1.hx + g1.w / 2 - u0 * g1.w;
        poses[i].ry = -g1.tilt + 2 * g1.tilt * u0;
        poses[i].z = -6 * u0 + 120 * Math.sin(Math.PI * u0);
      }
    }

    var cam = {
      zoom: tb.cam[f0 * 4] + (tb.cam[f1 * 4] - tb.cam[f0 * 4]) * al,
      x: tb.cam[f0 * 4 + 1] + (tb.cam[f1 * 4 + 1] - tb.cam[f0 * 4 + 1]) * al,
      y: tb.cam[f0 * 4 + 2] + (tb.cam[f1 * 4 + 2] - tb.cam[f0 * 4 + 2]) * al,
      rot: tb.cam[f0 * 4 + 3] + (tb.cam[f1 * 4 + 3] - tb.cam[f0 * 4 + 3]) * al
    };

    return {
      poses: poses, cam: cam,
      focus: tb.focus[f0] + (tb.focus[f1] - tb.focus[f0]) * al,
      from: tg.from, to: tg.to, e: tg.e
    };
  }

  PF.Phys = {
    sample: sample,
    invalidate: function () { cache.key = ''; cache.table = null; },
    stats: function () {
      var tb = cache.table;
      return tb ? { frames: tb.frames, pages: tb.n, dur: tb.dur } : null;
    },
    DT: DT, DIV: DIV
  };

})(typeof window !== 'undefined' ? window : this);
