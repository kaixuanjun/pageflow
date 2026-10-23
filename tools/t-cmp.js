(async () => {
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const E = PF.Engine, A = PF.app;
  for (let i = 0; i < 100 && !(window.PF && window.PF.app); i++) await sl(100);
  A.loadDemo();
  await sl(6500);
  A.setAspect('9:16');
  A.seek(5.2);
  await sl(600);

  const cv = document.getElementById('canvas');
  const SX = 10, SY = 220, SW = 190, SH = 210, Z = 2;   // 2 倍放大看文字
  const CW = SW * Z, CH = SH * Z;

  const sheet = document.createElement('canvas');
  sheet.width = CW * 2 + 30;
  sheet.height = CH + 44;
  const c = sheet.getContext('2d');
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, sheet.width, sheet.height);

  // 左：强制退回 Canvas2D 逐格仿射（修复前的渲染路径）
  const orig = E._painterFor;
  E._painters = {};
  E._painterFor = function () { return null; };
  A.seek(5.2);
  await sl(800);
  c.drawImage(cv, SX, SY, SW, SH, 0, 44, CW, CH);

  // 右：WebGL2 齐次坐标（修复后）
  E._painterFor = orig;
  E._painters = {};
  A.seek(5.2);
  await sl(800);
  c.drawImage(cv, SX, SY, SW, SH, CW + 30, 44, CW, CH);

  c.font = 'bold 20px "Segoe UI", sans-serif';
  c.fillStyle = '#ff6262';
  c.fillText('修复前 · Canvas2D 逐格仿射（2 倍放大）', 0, 28);
  c.fillStyle = '#ccff4d';
  c.fillText('修复后 · WebGL2 齐次坐标（2 倍放大）', CW + 30, 28);

  return sheet.toDataURL('image/png');
})()
