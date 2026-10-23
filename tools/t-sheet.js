(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 120 && !(window.PF && window.PF.app); i++) await sl(100);

  const S = PF.Sheet;
  const us = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const lines = [];
  let maxAbs = 0, minA = 99, maxA = -99;
  for (const u of us) {
    const a = S.anglesFor('probe', u);
    let row = [];
    for (let k = 0; k < S.N; k += 2) row.push((a[k] * 180 / Math.PI).toFixed(0));
    for (let k = 0; k < S.N; k++) { maxAbs = Math.max(maxAbs, Math.abs(a[k])); minA = Math.min(minA, a[k]); maxA = Math.max(maxA, a[k]); }
    lines.push('u=' + u.toFixed(2) + ' θ(°)/每2段: ' + row.join(' ') + '  | 卷曲=' + (S.curlOf(a) * 180 / Math.PI).toFixed(1) + '°');
  }

  /* 端点检查：u=0 全 0，u=1 全 π */
  const a0 = S.anglesFor('probe', 0), a1 = S.anglesFor('probe', 1);
  let e0 = 0, e1 = 0;
  for (let k = 0; k < S.N; k++) { e0 = Math.max(e0, Math.abs(a0[k])); e1 = Math.max(e1, Math.abs(a1[k] - Math.PI)); }

  /* 单调性：同一段的角度应随 u 单调增加 */
  let mono = true;
  for (let s = 1; s <= 40; s++) {
    const pa = S.anglesFor('probe', (s - 1) / 40), pb = S.anglesFor('probe', s / 40);
    for (let k = 0; k < S.N; k++) if (pb[k] < pa[k] - 1e-6) mono = false;
  }

  return lines.join('\n') +
    '\n范围: 最小=' + (minA * 180 / Math.PI).toFixed(1) + '° 最大=' + (maxA * 180 / Math.PI).toFixed(1) + '° 绝对值最大=' + (maxAbs * 180 / Math.PI).toFixed(1) + '°' +
    '\n端点误差: u=0 → ' + (e0 * 180 / Math.PI).toFixed(4) + '°  u=1 → ' + (e1 * 180 / Math.PI).toFixed(4) + '°' +
    '\n单调递增: ' + mono;
})()
