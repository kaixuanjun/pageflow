/* PAGEFLOW · 纸张弯曲链（真实换页的物理模型）
 *
 * 一张纸不是一个刚体平面：翻页时它绕书脊转动，而自由边会因为惯性 / 空气阻力落后于
 * 内侧 —— 这就是「纸」和「翻牌」的区别。这里用一个一维角度链来解这件事：
 *
 *   把纸沿水平方向切成 N 段，第 k 段相对上一段转过的角度记作 θ_k（在 x-z 平面里，
 *   θ=0 表示平摊在右侧、θ=π 表示完全翻到左侧）。书脊那一段是铰链（θ_0），由时间轴
 *   驱动；内段之间用弯曲刚度弹簧耦合，再加上两项阻尼：
 *
 *     弯曲：τ_k = K_B (θ_{k-1} - θ_k) + K_B (θ_{k+1} - θ_k)     （自由端只受内侧约束）
 *     空气：τ_k += -C_A · k/N · (ω_k - ω_0)                      （外段被空气拖住 → 落后）
 *     粘滞：τ_k += -C_D · ω_k
 *
 *   铰链本身是一个临界阻尼弹簧跟住目标角度，所以起步/收尾都是加速度连续、末尾略微
 *   过冲再回位，不会有「到点啪一下」。
 *
 * 两个必须保证的工程性质：
 *   1) 决定性 —— 同一个 s 永远解出同一组角度，导出逐帧渲染才能和预览一致。所以整段
 *      预积分成 (s, angles) 表，按 key 缓存，之后只是查表 + 线性插值。
 *   2) 端点精确 —— 弹簧有滞后，两端会差一点点角度，而布局要求「翻到底」时纸必须完全
 *      贴合。所以两端在小窗口内把物理解混合回刚体解（rigid_k = π·s），端点误差为 0。
 */
(function (root) {
  'use strict';

  var N = 22;               /* 分段数：越多越圆。22 段时每段约 3~4 像素高，配合逐顶点明暗看不出折线 */
  var DT = 1 / 240;         /* 固定步长，与帧率无关 */
  var DUR = 1.6;            /* 一次翻页的物理时长（s），够走完 0→π */

  var K_H = 210;            /* 铰链跟随刚度 */
  var C_H = 26;             /* 铰链阻尼（≈临界阻尼） */
  var K_B = 130;            /* 弯曲刚度 */
  var C_A = 7.5;            /* 空气阻力（相对铰链速度） */
  var C_D = 2.2;            /* 粘滞阻尼 */
  var END = 0.12;           /* 端点混合窗口 */

  var cache = {};

  /* 由细到粗的积分：把 0→π 的驱动预积分成一张表 */
  function bake(key) {
    if (cache[key]) return cache[key];

    var steps = Math.round(DUR / DT);
    var th = new Float32Array(N);
    var om = new Float32Array(N);
    var rows = [];

    for (var s = 0; s <= steps; s++) {
      var u = s / steps;                       /* 归一化进度 0..1 */
      if (s > 0) {
        var drive = Math.PI * u;
        /* 铰链：临界阻尼弹簧跟住驱动 */
        var a0 = K_H * (drive - th[0]) - C_H * om[0];
        om[0] += a0 * DT;
        th[0] += om[0] * DT;

        /* 内段：弯曲 + 空气 + 粘滞 */
        for (var k = 1; k < N; k++) {
          var prev = th[k - 1];
          var next = th[k + 1 < N ? k + 1 : N - 1];
          var tau = K_B * (prev - th[k]) + K_B * (next - th[k]);
          tau -= C_A * (k / N) * (om[k] - om[0]);
          tau -= C_D * om[k];
          var J = 1 + 0.16 * k;                /* 外段转动惯量略大，摆动更慢 */
          om[k] += (tau / J) * DT;
          th[k] += om[k] * DT;
        }
      }
      rows.push(Float32Array.from(th));
    }

    var out = { steps: steps, rows: rows };
    cache[key] = out;
    return out;
  }

  function smoothstep(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  /* 取进度 u∈[0,1] 处的 N 段绝对角度；两端 100% 贴回刚体解 */
  function anglesFor(key, u) {
    var tbl = bake(key);
    var x = Math.min(1, Math.max(0, u)) * tbl.steps;
    var i0 = Math.floor(x), i1 = Math.min(tbl.steps, i0 + 1), f = x - i0;
    var a = tbl.rows[i0], b = tbl.rows[i1];

    var rigid = Math.PI * u;
    /* 两端窗口内混回刚体解：起点/终点严丝合缝，布局不会错位 */
    var blend = smoothstep(0, END, u) * smoothstep(0, END, 1 - u);
    var out = new Float32Array(N);
    for (var k = 0; k < N; k++) {
      var phys = a[k] + (b[k] - a[k]) * f;
      out[k] = rigid + (phys - rigid) * blend;
    }
    return out;
  }

  /* 自由边相对内侧的落后量（弧度），用于估卷曲强度 / 阴影浓淡 */
  function curlOf(angles) {
    return angles[N - 1] - angles[0];
  }

  function isBaked(key) { return !!cache[key]; }
  function keys() { return Object.keys(cache); }

  root.PF = root.PF || {};
  root.PF.Sheet = {
    N: N,
    DUR: DUR,
    anglesFor: anglesFor,
    curlOf: curlOf,
    bake: bake,
    isBaked: isBaked,
    keys: keys
  };
})(window);
