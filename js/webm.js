/* ══════════════════════════════════════════════════════════════
   PAGEFLOW · webm
   极简 WebM(Matroska) 封装器：单视频轨、VP8/VP9/AV1
   用于 WebCodecs 逐帧编码后的无损封装
   ══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function ubytes(n) {
    if (n === 0) return [0];
    var a = [];
    while (n > 0) { a.unshift(n % 256); n = Math.floor(n / 256); }
    return a;
  }

  function vint(n) {
    var len = 1;
    while (n >= Math.pow(2, 7 * len) - 1) len++;
    if (len > 8) throw new Error('vint too large');
    var b = new Uint8Array(len);
    var v = n;
    for (var i = len - 1; i >= 0; i--) { b[i] = v % 256; v = Math.floor(v / 256); }
    b[0] |= 0x80 >> (len - 1);
    return b;
  }

  function cat(arrs) {
    var len = 0, i;
    for (i = 0; i < arrs.length; i++) len += arrs[i].length;
    var out = new Uint8Array(len), o = 0;
    for (i = 0; i < arrs.length; i++) { out.set(arrs[i], o); o += arrs[i].length; }
    return out;
  }

  function el(id, payload) {
    return cat([new Uint8Array(id), vint(payload.length), payload]);
  }

  function val(id, numBytes) {
    return el(id, new Uint8Array(numBytes));
  }

  function uintEl(id, n) { return el(id, new Uint8Array(ubytes(n))); }

  function strEl(id, s) {
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return el(id, b);
  }

  function f64El(id, n) {
    var b = new Uint8Array(8);
    new DataView(b.buffer).setFloat64(0, n, false);
    return el(id, b);
  }

  var ID = {
    EBML: [0x1A, 0x45, 0xDF, 0xA3],
    EBMLVersion: [0x42, 0x86],
    EBMLReadVersion: [0x42, 0xF7],
    EBMLMaxIDLength: [0x42, 0xF2],
    EBMLMaxSizeLength: [0x42, 0xF3],
    DocType: [0x42, 0x82],
    DocTypeVersion: [0x42, 0x87],
    DocTypeReadVersion: [0x42, 0x85],
    Segment: [0x18, 0x53, 0x80, 0x67],
    Info: [0x15, 0x49, 0xA9, 0x66],
    TimecodeScale: [0x2A, 0xD7, 0xB1],
    MuxingApp: [0x4D, 0x80],
    WritingApp: [0x57, 0x41],
    Duration: [0x44, 0x89],
    Tracks: [0x16, 0x54, 0xAE, 0x6B],
    TrackEntry: [0xAE],
    TrackNumber: [0xD7],
    TrackUID: [0x73, 0xC5],
    TrackType: [0x83],
    CodecID: [0x86],
    DefaultDuration: [0x23, 0xE3, 0x83],
    Video: [0xE0],
    PixelWidth: [0xB0],
    PixelHeight: [0xBA],
    Cluster: [0x1F, 0x43, 0xB6, 0x75],
    Timecode: [0xE7],
    SimpleBlock: [0xA3],
    Cues: [0x1C, 0x53, 0xBB, 0x6B],
    CuePoint: [0xBB],
    CueTime: [0xB3],
    CueTrackPositions: [0xB7],
    CueTrack: [0xF7],
    CueClusterPosition: [0xF1]
  };

  function WebM(opts) {
    this.width = opts.width | 0;
    this.height = opts.height | 0;
    this.fps = opts.fps || 30;
    this.codecId = opts.codecId || 'V_VP9';
    this.frames = [];
  }

  WebM.prototype.addFrame = function (data, timestampUs, isKey) {
    this.frames.push({ data: data, ts: timestampUs, key: !!isKey });
  };

  WebM.prototype.finalize = function () {
    var frames = this.frames;
    var frameDur = 1e6 / this.fps;

    /* ── 分簇 ── */
    var clusters = [], cur = null;
    for (var i = 0; i < frames.length; i++) {
      var f = frames[i];
      var ms = Math.round(f.ts / 1000);
      if (!cur || (f.key && ms - cur.time > 1200) || cur.blocks.length > 220 || ms - cur.time > 16000) {
        cur = { time: ms, blocks: [] };
        clusters.push(cur);
      }
      var rel = ms - cur.time;
      var head = new Uint8Array(4);
      head[0] = 0x81;                    // 轨道号 1
      head[1] = (rel >> 8) & 0xff;
      head[2] = rel & 0xff;
      head[3] = f.key ? 0x80 : 0x00;
      cur.blocks.push(cat([head, f.data]));
    }

    /* ── 簇序列化 ── */
    var clusterBytes = [];
    var clusterOffsets = [];
    var offset = 0;
    for (var c = 0; c < clusters.length; c++) {
      var cl = clusters[c];
      var body = cat([uintEl(ID.Timecode, cl.time)].concat(
        cl.blocks.map(function (b) { return el(ID.SimpleBlock, b); })
      ));
      var full = el(ID.Cluster, body);
      clusterBytes.push(full);
      clusterOffsets.push({ time: cl.time, pos: offset });
      offset += full.length;
    }

    var last = frames.length ? frames[frames.length - 1] : null;
    var durationMs = last ? Math.round(last.ts / 1000) + Math.round(frameDur / 1000) : 0;

    var info = el(ID.Info, cat([
      uintEl(ID.TimecodeScale, 1000000),
      strEl(ID.MuxingApp, 'pageflow'),
      strEl(ID.WritingApp, 'pageflow'),
      f64El(ID.Duration, durationMs)
    ]));

    var tracks = el(ID.Tracks, el(ID.TrackEntry, cat([
      uintEl(ID.TrackNumber, 1),
      uintEl(ID.TrackUID, 1),
      uintEl(ID.TrackType, 1),
      strEl(ID.CodecID, this.codecId),
      uintEl(ID.DefaultDuration, Math.round(1e9 / this.fps)),
      el(ID.Video, cat([
        uintEl(ID.PixelWidth, this.width),
        uintEl(ID.PixelHeight, this.height)
      ]))
    ])));

    var cues = el(ID.Cues, cat(clusterOffsets.map(function (o) {
      return el(ID.CuePoint, cat([
        uintEl(ID.CueTime, o.time),
        el(ID.CueTrackPositions, cat([
          uintEl(ID.CueTrack, 1),
          uintEl(ID.CueClusterPosition, o.pos)
        ]))
      ]));
    })));

    var segmentBody = cat([info, tracks].concat(clusterBytes).concat([cues]));

    var header = el(ID.EBML, cat([
      uintEl(ID.EBMLVersion, 1),
      uintEl(ID.EBMLReadVersion, 1),
      uintEl(ID.EBMLMaxIDLength, 4),
      uintEl(ID.EBMLMaxSizeLength, 8),
      strEl(ID.DocType, 'webm'),
      uintEl(ID.DocTypeVersion, 4),
      uintEl(ID.DocTypeReadVersion, 2)
    ]));

    var all = cat([header, el(ID.Segment, segmentBody)]);
    return new Blob([all], { type: 'video/webm' });
  };

  global.PF = global.PF || {};
  global.PF.WebM = WebM;
})(window);
