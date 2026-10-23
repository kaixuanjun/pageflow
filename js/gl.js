/*!
 * PAGEFLOW · WebGL2 透视合成器
 *
 * 为什么不用 canvas 2D 逐格仿射：
 *   canvas 2D 没有梯形贴图能力，要画透视倾斜的页面只能把页面切成小格、每格用一个仿射
 *   矩阵近似。仿射逼近的误差 ∝ 格宽² × 透视强度：偏航一大，误差迅速放大到肉眼可见，
 *   相邻格的横线接不上，看起来就是「画面被撕裂」。
 *   想靠加密网格压到亚像素，1080p 下要上千格、每格一次 drawImage，代价不可接受。
 *
 * WebGL2 一步到位：把四个角的**齐次坐标**交给光栅化器，硬件自己除 w、自己做透视校正
 * 插值，几何上精确 —— 没有格子，就没有接缝。
 *   screen = (X/w, Y/w)
 *   gl_Position = (2X/W - w, w - 2Y/H, 0, w)
 * 除完 w 正好落在 NDC。
 *
 * 另一件事是缩小采样：一页 PDF 缓存 1400px 高，在平铺/画廊里可能只画到 120px，
 * 一步降采样十几倍、只有双线性可用，文字会被抽成横条（看着也像撕裂）。
 * 所以贴图一律生成 mip 链 + 开满各向异性，让 GPU 逐片元挑 LOD。
 */
(function (root) {
  'use strict';
  var PF = root.PF = root.PF || {};

  var VERT = [
    '#version 300 es',
    'in vec4 aPos;',      // (X*w, Y*w, zNdc*w, w) —— 除法交给光栅化器
    'in vec2 aUV;',
    'in float aShade;',   // 逐顶点明暗：弯曲纸面的法线是连续的，明暗也必须连续
    'out vec2 vUV;',
    'out float vShade;',
    'void main() {',
    '  vUV = aUV;',
    '  vShade = aShade;',
    '  gl_Position = aPos;',
    '}'
  ].join('\n');

  var FRAG = [
    '#version 300 es',
    'precision mediump float;',
    'in vec2 vUV;',
    'in float vShade;',
    'uniform sampler2D uTex;',
    'uniform float uAlpha;',
    'out vec4 oColor;',
    'void main() {',
    /* 贴图是预乘 alpha 的：只压 rgb、保留 a，否则曲面上的暗部会跟着变透明。 */
    '  vec4 t = texture(uTex, vUV);',
    '  oColor = vec4(t.rgb * vShade * uAlpha, t.a * uAlpha);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      try { console.warn('[GL] shader: ' + gl.getShaderInfoLog(s)); } catch (e) { }
      return null;
    }
    return s;
  }

  /**
   * 建一个 W×H 的离屏 GL 画布。不支持 WebGL2 / 着色器编译失败时返回 null，
   * 调用方退回 canvas 2D 逐格仿射。
   */
  function create(W, H) {
    if (!W || !H) return null;
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(W));
    cv.height = Math.max(1, Math.round(H));

    var gl = null;
    var opts = {
      alpha: true,                 // 背景留给 2D，这里只要透明底 + 页面
      antialias: true,             // 页面斜边的锯齿交给 MSAA
      /*
       * 开深度缓冲是「不再整页翻层」的关键：
       *   画家算法只能按**整页**的 z 排序，两页的 z 一交叉，前者整块瞬间跳到后者前面 ——
       *   用户看到的就是「后面那页一下子提到最高层」。
       *   有了深度缓冲，遮挡关系变成**逐像素**判定的：某个像素只有在两页在那个点上
       *   深度真正相等的瞬间才换手，也就是沿着两页相交的那条线一像素一像素地换过去，
       *   整页的硬切换就消失了。
       */
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      /*
       * 这张画布不进 DOM，只当 2D 画布的贴图源用。默认 preserveDrawingBuffer:false
       * 时浏览器取走一帧后就会清空绘制缓冲，而 drawImage 读取时机和合成器取帧时机
       * 并不同步 —— 偶尔会读到已经清空的缓冲，表现就是舞台周期性闪一下空白。
       * 关掉这个优化（代价是一次拷贝），保证任何时刻读到的都是完整的一帧。
       */
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    };
    try { gl = cv.getContext('webgl2', opts); } catch (e) { gl = null; }
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      try { console.warn('[GL] link: ' + gl.getProgramInfoLog(prog)); } catch (e) { }
      return null;
    }
    gl.useProgram(prog);

    var aPos = gl.getAttribLocation(prog, 'aPos');
    var aUV = gl.getAttribLocation(prog, 'aUV');
    var aShade = gl.getAttribLocation(prog, 'aShade');
    var uTex = gl.getUniformLocation(prog, 'uTex');
    var uAlpha = gl.getUniformLocation(prog, 'uAlpha');
    gl.uniform1i(uTex, 0);

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    var STRIDE = 7 * 4;                    /* pos(4) + uv(2) + shade(1) */
    var verts = new Float32Array(6 * 7);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, STRIDE, 16);
    gl.enableVertexAttribArray(aShade);
    gl.vertexAttribPointer(aShade, 1, gl.FLOAT, false, STRIDE, 24);

    gl.disable(gl.CULL_FACE);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    var anisoMax = aniso ? Math.min(16, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 1;
    var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

    /* 驱动重置 / 显存吃紧会让上下文失效；作废掉，交给 engine 下一帧重建，避免一直 blit 空画布 */
    var lost = false;
    cv.addEventListener('webglcontextlost', function () { lost = true; }, false);

    var textures = new Map();      // 源画布 → 纹理（同一页只上传一次）
    var whiteTex = null;

    function bindParams(withMips) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (withMips) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, anisoMax);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    }

    /** 上传（含 mip 链）。同一张源画布只做一次 */
    function textureFor(src) {
      if (!src || !src.width || !src.height) return null;
      var hit = textures.get(src);
      if (hit) { hit.used = ++clock; return hit.tex; }
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      } catch (e) {
        gl.deleteTexture(t);
        return null;
      }
      bindParams(false);
      // 一次生成，之后每帧都用（不是每帧 generateMipmap）
      if (src.width <= maxTex && src.height <= maxTex) {
        gl.generateMipmap(gl.TEXTURE_2D);
        bindParams(true);
      }
      textures.set(src, { tex: t, used: ++clock, w: src.width, h: src.height });
      prune();
      return t;
    }

    /** 纯色四边形用（页面描边） */
    function white() {
      if (whiteTex) return whiteTex;
      whiteTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, whiteTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]));
      bindParams(false);
      return whiteTex;
    }

    var clock = 0;
    var MAX_TEX = 40;
    function prune() {
      if (textures.size <= MAX_TEX) return;
      var arr = [];
      textures.forEach(function (v, k) { arr.push([k, v]); });
      arr.sort(function (a, b) { return a[1].used - b[1].used; });
      for (var i = 0; i < arr.length - MAX_TEX; i++) {
        try { gl.deleteTexture(arr[i][1].tex); } catch (e) { }
        textures.delete(arr[i][0]);
      }
    }

    function begin() {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(true);
      depthW = true;
    }

    var ORD = [0, 1, 2, 0, 2, 3];
    var NEAR = 140;          // 与 engine 的 den 下限一致：最近处映射到 NDC z = -1
    var depthW = true;
    var depthT = true;

    /**
     * 布局之间做形变（morph）时，页面会真的互相穿过：这时必须逐像素判遮挡，
     * 否则「后面那张」会在 z 交叉的那一帧整块跳到最前面（= 硬切）。
     * 同一种布局内部则关掉深度测试，保持画家算法的整页遮挡 —— 纸片不该互相穿插。
     */
    function depthTest(on) {
      if (on === depthT) return;
      depthT = on;
      if (on) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    }

    /**
     * 阴影 / 描边这类「贴在同一张页面平面上、但不该挡住别的页面」的东西用：
     * 关掉深度写入、只留深度测试。否则阴影那张外扩的大四边形会把它后面所有页面都遮掉。
     */
    function depthWrite(on) {
      if (on === depthW) return;
      depthW = on;
      gl.depthMask(on);
    }

    /**
     * 画一个贴图四边形
     * @param {CanvasImageSource|HTMLCanvasElement} src 贴图源（null 时用纯白）
     * @param {Array} pts 四个角 [{x,y,w}]，顺序 左上/右上/右下/左下（x、y 已乘过 w，w = 透视分母）
     * @param {number} alpha 透明度
     * @param {Array} [uv] [u0,v0,u1,v1]，默认铺满
     * @param {number} [bias] NDC 深度微调（正数往后退），用来避免同平面的描边/阴影打架
     * @param {number|Array} [shades] 明暗系数（1 = 正面受光）：标量给整片，或四角各一个做渐变
     */
    function quad(src, pts, alpha, uv, bias, shades) {
      if (!(alpha > 0.002)) return;
      var tex = src ? textureFor(src) : white();
      if (!tex) return;
      var u0 = uv ? uv[0] : 0, v0 = uv ? uv[1] : 0;
      var u1 = uv ? uv[2] : 1, v1 = uv ? uv[3] : 1;
      var U = [u0, u1, u1, u0], V = [v0, v0, v1, v1];
      var S = (shades instanceof Array) ? shades : [shades, shades, shades, shades];
      var W2 = cv.width, H2 = cv.height;
      for (var k = 0; k < 6; k++) {
        var i = ORD[k], p = pts[i];
        /* 深度：把透视分母 d 单调映到 [-1,1)，最近 = -1。
           硬件按 1/w 透视校正插值，逐像素拿到的就是这个平面上那一点的真实深度。*/
        var d = p.w > NEAR ? p.w : NEAR;
        var zn = 1 - (2 * NEAR) / d + (bias || 0);
        verts[k * 7] = (2 * p.x) / W2 - p.w;
        verts[k * 7 + 1] = p.w - (2 * p.y) / H2;
        verts[k * 7 + 2] = zn * p.w;
        verts[k * 7 + 3] = p.w;
        verts[k * 7 + 4] = U[i];
        verts[k * 7 + 5] = V[i];
        var sv = (typeof S[i] === 'number') ? S[i] : 1;
        verts[k * 7 + 6] = sv < 0.2 ? 0.2 : (sv > 1.6 ? 1.6 : sv);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1f(uAlpha, alpha > 1 ? 1 : alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    var lose = gl.getExtension('WEBGL_lose_context');
    function dispose() {
      textures.forEach(function (v) { try { gl.deleteTexture(v.tex); } catch (e) { } });
      textures.clear();
      try { if (lose) lose.loseContext(); } catch (e) { }
    }

    return {
      canvas: cv, gl: gl, begin: begin, quad: quad, depthWrite: depthWrite,
      depthTest: depthTest,
      textureFor: textureFor, white: white, dispose: dispose,
      aniso: anisoMax, mip: true,
      isLost: function () { return lost || gl.isContextLost(); },
      size: function () { return { w: cv.width, h: cv.height }; }
    };
  }

  PF.GL = { create: create, VERT: VERT, FRAG: FRAG };
})(this);
