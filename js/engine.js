/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · engine
   3D 页面渲染（Canvas 2D + 手写透视投影）
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var PF = (global.PF = global.PF || {});
  var C = PF.core;

  var ARS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };
  var UNIT_H = 1000;          // 设计视口高度（与分辨率无关）
  var FOCAL = 2400;           // 焦距（同一单位）
  var SHADOW_PAD = 0.17;

  /* ───────────────────────── 工具 ───────────────────────── */
  function rot3(x, y, z, rx, ry, rz) {
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cz = Math.cos(rz), sz = Math.sin(rz);
    // Rx
    var y1 = y * cx - z * sx;
    var z1 = y * sx + z * cx;
    var x1 = x;
    // Ry
    var x2 = x1 * cy + z1 * sy;
    var z2 = -x1 * sy + z1 * cy;
    var y2 = y1;
    // Rz
    return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2];
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* 诊断开关：index.html?gl=0 强制走 Canvas2D，用来二分定位显卡相关问题 */
  function glOff() {
    try {
      return /[?&#](gl=0|nogl)\b/.test(String(location.search) + String(location.hash));
    } catch (e) { return false; }
  }

  /* ───────────────────────── 背景 ───────────────────────── */
  var bgCache = { key: '', ctx: null };

  function drawBackground(ctx, W, H) {
    var key = W + 'x' + H;
    /* 渐变对象归它被创建的那个画布所有：舞台和导出画布可能同尺寸，必须各自缓存 */
    if (bgCache.key !== key || bgCache.ctx !== ctx) {
      var top = ctx.createLinearGradient(0, 0, 0, H);
      top.addColorStop(0, '#141420');
      top.addColorStop(0.46, '#0a0a11');
      top.addColorStop(1, '#040407');

      var glow = ctx.createRadialGradient(W * 0.5, -H * 0.18, 0, W * 0.5, -H * 0.18, H * 1.25);
      glow.addColorStop(0, 'rgba(150,170,255,.115)');
      glow.addColorStop(0.5, 'rgba(88,100,170,.035)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');

      var bloom = ctx.createRadialGradient(W * 0.5, H * 1.3, 0, W * 0.5, H * 1.3, H * 1.05);
      bloom.addColorStop(0, 'rgba(204,255,77,.06)');
      bloom.addColorStop(1, 'rgba(0,0,0,0)');

      var vig = ctx.createRadialGradient(W * 0.5, H * 0.47, H * 0.3, W * 0.5, H * 0.5, H * 1.0);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(0.72, 'rgba(0,0,0,.24)');
      vig.addColorStop(1, 'rgba(0,0,0,.62)');

      bgCache = { key: key, ctx: ctx, top: top, glow: glow, bloom: bloom, vig: vig };
    }
    ctx.fillStyle = bgCache.top; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bgCache.glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bgCache.bloom; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = bgCache.vig; ctx.fillRect(0, 0, W, H);
  }

  /* ───────────────────────── 阴影精灵 ───────────────────────── */
  var shadowCache = { key: '', cv: null };

  function shadowSprite(pageW, pageH) {
    var key = pageW.toFixed(2) + ':' + pageH.toFixed(2);
    if (shadowCache.key === key && shadowCache.cv) return shadowCache.cv;
    var base = 300;
    var pw = base;
    var ph = Math.round(base * pageH / pageW);
    var cw = Math.round(pw * (1 + 2 * SHADOW_PAD));
    var chh = Math.round(ph * (1 + 2 * SHADOW_PAD));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = chh;
    var c = cv.getContext('2d');
    var blur = Math.max(6, Math.round(cw * 0.05));
    c.filter = 'blur(' + blur + 'px)';
    c.fillStyle = 'rgba(0,0,0,.92)';
    roundRect(c, pw * SHADOW_PAD, ph * SHADOW_PAD, pw, ph, 3);
    c.fill();
    shadowCache = { key: key, cv: cv };
    return cv;
  }

  /* ───────────────────────── 渲染器 ───────────────────────── */
  var R = {
    ctx: null,
    W: 0, H: 0
  };

  /** 把 (u,v) 平面坐标映射到设备像素的变换工具 */
  function quadTransform(ctx, p00, p10, p01) {
    var ax = p10[0] - p00[0], ay = p10[1] - p00[1];
    var bx = p01[0] - p00[0], by = p01[1] - p00[1];
    return { ax: ax, ay: ay, bx: bx, by: by, ox: p00[0], oy: p00[1] };
  }

  /**
   * 渲染一帧
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W 画布像素宽
   * @param {number} H 画布像素高
   * @param {{w:number,h:number}} view 设计视口（UNIT_H 高）
   * @param {object} scene sampleScene 结果
   * @param {function} getPage (i) => HTMLCanvasElement|HTMLImageElement|null
   * @param {object} [painter] PF.GL 合成器；有就走 GPU 精确透视，没有退回 2D 逐格仿射
   */
  function renderTo(ctx, W, H, view, scene, getPage, painter) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawBackground(ctx, W, H);
    if (!scene || !scene.poses) return;

    var s = H / UNIT_H;
    var cx = W / 2, cy = H / 2;

    var cam = scene.cam || { zoom: 1, x: 0, y: 0, rot: 0 };
    var zoom = C.num(cam.zoom, 1);
    var camRad = C.num(cam.rot, 0) * Math.PI / 180;
    var cr = Math.cos(camRad), sr = Math.sin(camRad);
    var panX = C.num(cam.x, 0), panY = C.num(cam.y, 0);

    /* 齐次投影：返回 {x, y, w}，真·屏幕像素是 (x/w, y/w)。
       把 w 一并留给光栅化器，GPU 就能自己除、自己做透视校正插值 —— 几何精确，没有格子。
         screen = (X*zoom + panX)*s + cx
         ⇒ X*w   = Xr*zoom*s + (panX*s + cx)*w */
    function projH(x, y, z) {
      var den = FOCAL - z;
      if (den < 140) den = 140;
      var Xp = x * FOCAL, Yp = y * FOCAL;
      var Xr = Xp * cr - Yp * sr, Yr = Xp * sr + Yp * cr;
      var kz = zoom * s;
      return {
        x: Xr * kz + (panX * s + cx) * den,
        y: Yr * kz + (panY * s + cy) * den,
        w: den
      };
    }

    function project(x, y, z) {
      var h = projH(x, y, z);
      return [h.x / h.w, h.y / h.w];
    }

    var page = view.page;
    var poses = scene.poses;

    /* 按深度排序：远 → 近 */
    var order = [];
    for (var i = 0; i < poses.length; i++) {
      if (poses[i].opacity > 0.004) order.push(i);
    }
    order.sort(function (a, b) { return poses[a].z - poses[b].z; });

    var shadow = shadowSprite(page.w, page.h);

    /* 弯曲的一张纸：沿 u 把纸切成 N 段，每段一个面片。
       纸面是「绕书脊卷起来的弧」——段与段之间的角度由 js/sheet.js 的物理链给出，
       所以自由边会落后、会有卷边。明暗按**顶点**算（相邻两面片法线取平均），
       面片之间才不会出现一条条明暗台阶。 */
    function drawSheet(sh, img, op) {
      var ang = sh.angles, N = ang.length;
      var L = sh.w / N, hh = sh.h / 2, hy = sh.hy;
      var xs = new Array(N + 1), zs = new Array(N + 1);
      var x = sh.hx, z = sh.hz;
      xs[0] = x; zs[0] = z;
      for (var k = 0; k < N; k++) {
        x += Math.cos(ang[k]) * L;
        z += Math.sin(ang[k]) * L;
        xs[k + 1] = x; zs[k + 1] = z;
      }

      /* 顶点法线 = 相邻两面片的角度平均；灯光从左上前方来 */
      var LX = -0.40, LY = -0.50, LZ = 0.76;
      var nodeShade = new Array(N + 1);
      for (k = 0; k <= N; k++) {
        var a0 = ang[k > 0 ? k - 1 : 0];
        var a1 = ang[k < N ? k : N - 1];
        var am = (a0 + a1) * 0.5;
        var nx = -Math.sin(am), nz = Math.cos(am);       /* 纸面朝观者那一侧的法线 */
        var dot = nx * LX + nz * LZ;                     /* 法线不含 y 分量，LY 不参与 */
        nodeShade[k] = 0.78 + 0.40 * (dot > 0 ? dot : 0);
      }

      var minX = xs[0], maxX = xs[0];
      for (k = 1; k <= N; k++) { if (xs[k] < minX) minX = xs[k]; if (xs[k] > maxX) maxX = xs[k]; }

      /* 投影阴影：跟着纸的轮廓走 —— 逐段把该段的落影铺在书页平面上。
         逐段画而不是铺一个包围盒，纸卷起来、叠起来的时候阴影形状才对得上；
         段与段之间留 1 像素重叠，接缝处的 alpha 只叠一次（不叠出亮线）。 */
      var zSh = sh.hz - 5;
      var lift = sh.lift || 0;
      var shA = Math.min(0.55, 0.20 + 0.42 * lift) * op;
      painter.depthWrite(false);
      if (shA > 0.004) {
        var padY = hh * 0.06 + 3;
        for (k = 0; k < N; k++) {
          var sx0 = Math.min(xs[k], xs[k + 1]), sx1 = Math.max(xs[k], xs[k + 1]);
          if (sx1 - sx0 < 0.6) sx0 -= 0.3, sx1 += 0.3;
          painter.quad(shadow,
            [projH(sx0 - 1, hy - hh - padY, zSh), projH(sx1 + 1, hy - hh - padY, zSh),
             projH(sx1 + 1, hy + hh + padY, zSh), projH(sx0 - 1, hy + hh + padY, zSh)],
            shA);
        }
      }
      painter.depthWrite(true);

      /* 纸面：k 递增时 z 单调递增（弧朝观者鼓），按 k 升序画就是由远及近 */
      for (k = 0; k < N; k++) {
        var P0 = projH(xs[k], hy - hh, zs[k]);
        var P1 = projH(xs[k + 1], hy - hh, zs[k + 1]);
        var P2 = projH(xs[k + 1], hy + hh, zs[k + 1]);
        var P3 = projH(xs[k], hy + hh, zs[k]);
        painter.quad(img, [P0, P1, P2, P3], op,
          [k / N, 0, (k + 1) / N, 1], 0,
          [nodeShade[k], nodeShade[k + 1], nodeShade[k + 1], nodeShade[k]]);
      }
    }

    /* ───────────── GPU 精确透视（首选路径） ───────────── */
    if (painter && painter.quad) {
      painter.begin();
      /* 始终用整页排序（画家算法）：纸片必须完整，不接受逐像素穿插。
         层级换手靠 core.js 在换布局时给的横向「先让开、再插队」弧线消化。 */
      if (painter.depthTest) painter.depthTest(false);
      var holes = [];
      for (var gi = 0; gi < order.length; gi++) {
        var ii = order[gi], pp = poses[ii];
        var op = C.clamp(pp.opacity, 0, 1);
        if (op <= 0.004) continue;
        var gpw = page.w * pp.scale, gph = page.h * pp.scale;
        var gb = rot3(-gpw / 2, -gph / 2, 0, pp.rx, pp.ry, pp.rz);
        var gex = rot3(gpw, 0, 0, pp.rx, pp.ry, pp.rz);
        var gey = rot3(0, gph, 0, pp.rx, pp.ry, pp.rz);
        var gx = gb[0] + pp.x, gy = gb[1] + pp.y, gz = gb[2] + pp.z;
        var gimg = getPage ? getPage(ii) : null;

        /* 正在翻的那一张走曲面路径（物理弯页 + 法线明暗 + 投影阴影） */
        if (pp.sheet && gimg && gimg.width && gimg.height) {
          drawSheet(pp.sheet, gimg, op);
          continue;
        }

        var Q = function (u, v) {
          return projH(gx + u * gex[0] + v * gey[0],
                       gy + u * gex[1] + v * gey[1],
                       gz + u * gex[2] + v * gey[2]);
        };

        /* 阴影：页平面外扩 SHADOW_PAD，精灵 uv 铺满。
           不写深度：它只是同一张页面平面上的装饰，写了深度会把自己后面那一片页面判死 */
        if (op > 0.02) {
          var pd = SHADOW_PAD;
          painter.depthWrite(false);
          painter.quad(shadow,
            [Q(-pd, -pd), Q(1 + pd, -pd), Q(1 + pd, 1 + pd), Q(-pd, 1 + pd)], op * 0.62);
          painter.depthWrite(true);
        }

        if (gimg && gimg.width && gimg.height) {
          /* 1 设备像素的描边：按页面单位换算，任何缩放/透视下都正好 1px（同样不写深度） */
          var eps = 1 / Math.max(1, gpw * s);
          painter.depthWrite(false);
          painter.quad(null,
            [Q(-eps, -eps), Q(1 + eps, -eps), Q(1 + eps, 1 + eps), Q(-eps, 1 + eps)], 0.15 * op);
          /* 半透明的页只参与混合、不写深度，免得把更远处的页判死 */
          painter.depthWrite(op >= 0.99);
          painter.quad(gimg, [Q(0, 0), Q(1, 0), Q(1, 1), Q(0, 1)], op);
          painter.depthWrite(true);
        } else {
          var hc = [Q(0, 0), Q(1, 0), Q(1, 1), Q(0, 1)];
          for (var hj = 0; hj < 4; hj++) { hc[hj] = [hc[hj].x / hc[hj].w, hc[hj].y / hc[hj].w]; }
          holes.push({ i: ii, c: hc, w: gpw * s, op: op });
        }
      }

      /* 一次 blit 合成（透明底 + 预乘 alpha，等同逐层绘制） */
      ctx.drawImage(painter.canvas, 0, 0, W, H);

      /* 页面图还没出来的帧：补占位（画在最上层无妨，它们本来就还没内容） */
      for (var hi = 0; hi < holes.length; hi++) {
        var hp = holes[hi], c0 = hp.c[0], c1 = hp.c[1], c2 = hp.c[2], c3 = hp.c[3];
        ctx.globalAlpha = hp.op;
        ctx.beginPath();
        ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]);
        ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.11)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (hp.op > 0.25 && hp.w > 40) {
          ctx.fillStyle = 'rgba(255,255,255,.22)';
          ctx.font = '600 ' + Math.round(11 * s / 0.9) + 'px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(hp.i + 1), (c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2);
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    for (var k = 0; k < order.length; k++) {
      var idx = order[k];
      var p = poses[idx];
      var pw = page.w * p.scale;
      var ph = page.h * p.scale;
      var hw = pw / 2, hh = ph / 2;

      var b = rot3(-hw, -hh, 0, p.rx, p.ry, p.rz);
      var ex = rot3(pw, 0, 0, p.rx, p.ry, p.rz);
      var ey = rot3(0, ph, 0, p.rx, p.ry, p.rz);
      var bx = b[0] + p.x, by = b[1] + p.y, bz = b[2] + p.z;

      function P(u, v) {
        return project(bx + u * ex[0] + v * ey[0],
                       by + u * ex[1] + v * ey[1],
                       bz + u * ex[2] + v * ey[2]);
      }

      var c0 = P(0, 0), c1 = P(1, 0), c2 = P(1, 1), c3 = P(0, 1);

      /* 深度跨度 → 决定是否需要细分网格补偿透视 */
      var zA = bz, zB = bz + ex[2], zC = bz + ey[2], zD = bz + ex[2] + ey[2];
      var zMin = Math.min(zA, zB, zC, zD), zMax = Math.max(zA, zB, zC, zD);
      var tilt = Math.abs(p.rx) + Math.abs(p.ry);
      var needGrid = (zMax - zMin) > FOCAL * 0.045 || tilt > 0.14;
      var N = needGrid ? 4 : 1;

      ctx.globalAlpha = C.clamp(p.opacity, 0, 1);

      /* 阴影 */
      if (p.opacity > 0.02) {
        var q = quadTransform(ctx, c0, c1, c3);
        ctx.save();
        ctx.transform(q.ax, q.ay, q.bx, q.by, q.ox, q.oy);
        ctx.globalAlpha = C.clamp(p.opacity, 0, 1) * 0.62;
        ctx.drawImage(shadow, -SHADOW_PAD, -SHADOW_PAD, 1 + 2 * SHADOW_PAD, 1 + 2 * SHADOW_PAD);
        ctx.restore();
        ctx.globalAlpha = C.clamp(p.opacity, 0, 1);
      }

      var img = getPage ? getPage(idx) : null;

      if (img && img.width && img.height) {
        var iw = img.width, ih = img.height;
        for (var gv = 0; gv < N; gv++) {
          for (var gu = 0; gu < N; gu++) {
            var u0 = gu / N, u1 = (gu + 1) / N;
            var v0 = gv / N, v1 = (gv + 1) / N;
            var p00 = P(u0, v0), p10 = P(u1, v0), p01 = P(u0, v1);
            var dw = Math.hypot(p10[0] - p00[0], p10[1] - p00[1]);
            var dh = Math.hypot(p01[0] - p00[0], p01[1] - p00[1]);
            if (dw < 0.05 || dh < 0.05) continue;
            var sx = u0 * iw, sy = v0 * ih;
            var sw = (u1 - u0) * iw, sh = (v1 - v0) * ih;
            var eu = 0.7 / dw, ev = 0.7 / dh;
            ctx.save();
            ctx.transform((p10[0] - p00[0]) / dw, (p10[1] - p00[1]) / dw,
                          (p01[0] - p00[0]) / dh, (p01[1] - p00[1]) / dh,
                          p00[0], p00[1]);
            ctx.drawImage(img,
              sx - eu * sw, sy - ev * sh, sw * (1 + 2 * eu), sh * (1 + 2 * ev),
              -0.7, -0.7, dw + 1.4, dh + 1.4);
            ctx.restore();
          }
        }
      } else {
        /* 占位 */
        ctx.beginPath();
        ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]);
        ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.11)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (p.opacity > 0.25 && pw * s > 40) {
          ctx.fillStyle = 'rgba(255,255,255,.22)';
          ctx.font = '600 ' + Math.round(11 * s / 0.9) + 'px "Segoe UI", system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), (c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2);
        }
      }

      /* 边缘描边 */
      if (p.opacity > 0.06) {
        ctx.beginPath();
        ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]);
        ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]);
        ctx.closePath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 * p.opacity).toFixed(3) + ')';
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  /* ───────────────────────── 引擎实例 ───────────────────────── */
  var Engine = {
    canvas: null,
    ctx: null,
    aspect: '16:9',
    view: { w: UNIT_H * 16 / 9, h: UNIT_H },
    pageAR: 0.7071,
    getPage: null,
    W: 0,
    H: 0,
    _hpx: 1080,

    init: function (canvas, getPage) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.getPage = getPage || null;
      this.syncSize();
      return this;
    },

    setAspect: function (a) {
      if (!ARS[a]) a = '16:9';
      this.aspect = a;
      this.view = { w: UNIT_H * ARS[a], h: UNIT_H };
      this.syncSize();
      return this;
    },

    setPageAspect: function (ar) {
      this.pageAR = ar > 0 ? ar : 0.7071;
      this.syncSize();
      return this;
    },

    /** 按舞台实际显示尺寸设定画布分辨率（可传入目标 CSS 高度，避免过渡动画期间读到旧尺寸） */
    syncSize: function (cssH) {
      if (!this.canvas) return;
      var dispH = cssH || this.canvas.clientHeight || 540;
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var hpx = C.clamp(Math.round(dispH * dpr), 720, 1400);
      var wpx = Math.round(hpx * (ARS[this.aspect] || 16 / 9));
      this._hpx = hpx;
      this.W = wpx; this.H = hpx;
      if (this.canvas.width !== wpx) this.canvas.width = wpx;
      if (this.canvas.height !== hpx) this.canvas.height = hpx;
      // 设计视口内的页面尺寸
      var v = this.view;
      var pg = C.fitPage(v, this.pageAR);
      this.view.page = pg;
      return this;
    },

    /** 当前帧的完整渲染上下文（供 export 复用） */
    getSceneCtx: function () {
      var v = this.view;
      return { n: 0, V: { w: v.w, h: v.h }, page: v.page };
    },

    /* 每个用途（舞台 / 导出）各留一个 GL 合成器，尺寸变了才重建 */
    _painters: {},
    _painterFor: function (W, H, which) {
      which = which || 'stage';
      var key = W + 'x' + H;
      var slot = this._painters[which];
      if (slot && slot.key === key) {
        if (!slot.p) return null;                                  /* 这台机器没有 WebGL2，稳定降级 */
        if (!(slot.p.isLost && slot.p.isLost())) return slot.p;     /* 正常情况下直接复用 */
        slot = null;                                                /* 上下文丢了 → 重建 */
      }
      if (slot && slot.p) { try { slot.p.dispose(); } catch (e) { } }
      var p = (!glOff() && PF.GL && PF.GL.create) ? PF.GL.create(W, H) : null;
      this._painters[which] = { key: key, p: p };
      if (!p && !this._warned) {
        this._warned = true;
        console.info(glOff()
          ? '[PAGEFLOW] 已按 URL 参数 gl=0 强制走 canvas2D 逐格仿射'
          : '[PAGEFLOW] 没有可用的 WebGL2 —— 退回 canvas2D 逐格仿射合成');
      }
      return p;
    },

    render: function (scene) {
      if (!this.ctx) return;
      var p = this._painterFor(this.W, this.H, 'stage');
      renderTo(this.ctx, this.W, this.H, this.view, scene, this.getPage, p);
    },

    /** 离屏渲染（导出用） */
    renderOffscreen: function (ctx, W, H, scene, getPage) {
      var v = this.view;
      var pg = C.fitPage(v, this.pageAR);
      var p = this._painterFor(W, H, 'export');
      renderTo(ctx, W, H, { w: v.w, h: v.h, page: pg }, scene,
        getPage || this.getPage, p);
    }
  };

  PF.Engine = Engine;
  PF.render = { renderTo: renderTo, drawBackground: drawBackground, ARS: ARS, UNIT_H: UNIT_H };
})(window);
