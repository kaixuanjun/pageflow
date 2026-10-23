/* tools/shot.js —— Edge headless + CDP 截图 & 求值
   用法:
     node tools/shot.js --url <url> [--out shots/x.png] [--wait 2500]
                        [--eval "<js>"] [--w 1600] [--h 1000] [--keep]
   输出 JSON 到 stdout：{ ok, errors, logs, evalResult }
*/
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function argv() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const k = a[i].slice(2);
      if (a[i + 1] && !a[i + 1].startsWith('--')) { o[k] = a[++i]; }
      else o[k] = true;
    }
  }
  return o;
}
const opt = argv();
const URL_ = opt.url || 'file:///E:/Files/OneDrive/Project/00%20VibeCoding/00%20HTML/pdf-switch%20page/index.html';
const WAIT = parseInt(opt.wait || '2600', 10);
const W = parseInt(opt.w || '1600', 10);
const H = parseInt(opt.h || '1000', 10);
const PORT = 9411 + Math.floor(Math.random() * 300);
/* 临时 profile 放系统临时目录，跑完即删，不污染工程目录 */
const UDD = path.join(require('os').tmpdir(), 'pageflow-cdp-' + process.pid);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchJson(url) {
  return fetch(url).then((r) => r.json());
}

async function main() {
  const args = [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + UDD,
    '--window-size=' + W + ',' + H,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-sync',
    '--mute-audio',
    URL_
  ];
  const proc = spawn(EDGE, args, { stdio: 'ignore' });

  /* 等 CDP 起来 */
  let ver = null;
  for (let i = 0; i < 80; i++) {
    try { ver = await fetchJson('http://127.0.0.1:' + PORT + '/json/version'); break; }
    catch (e) { await sleep(150); }
  }
  if (!ver) { cleanup(proc); throw new Error('CDP 未就绪'); }

  /* 找页面 target */
  let target = null;
  for (let i = 0; i < 60; i++) {
    const list = await fetchJson('http://127.0.0.1:' + PORT + '/json/list');
    target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (target) break;
    await sleep(150);
  }
  if (!target) { cleanup(proc); throw new Error('无 page target'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const errors = [];
  const logs = [];
  let id = 0;

  const send = (method, params) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });

  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error)));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const txt = (msg.params.args || []).map((a) => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      logs.push(msg.params.type + ': ' + txt);
      if (msg.params.type === 'error') errors.push(txt);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      logs.push(e.level + ': ' + e.text);
      if (e.level === 'error') errors.push(e.text);
    }
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  /* 页面可能已经加载完，重新载入以便捕获全部日志 */
  await send('Page.navigate', { url: URL_ });
  await sleep(WAIT);

  let evalResult = null;
  let expr = opt.eval;
  if (opt['eval-file']) expr = fs.readFileSync(path.resolve(opt['eval-file']), 'utf8').trim();
  if (expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true, userGesture: true
    });
    if (r.exceptionDetails) {
      evalResult = { error: (r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text };
    } else {
      evalResult = r.result.value;
    }
  }

  if (opt.out) {
    const outPath = path.resolve(opt.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (typeof evalResult === 'string' && evalResult.startsWith('data:image')) {
      /* 页面自绘的拼图（contact sheet）优先落盘 */
      fs.writeFileSync(outPath, Buffer.from(evalResult.split(',')[1], 'base64'));
    } else {
      const params = { format: 'png', captureBeyondViewport: false };
      if (opt.clip) {
        const [x, y, width, height] = String(opt.clip).split(',').map(Number);
        params.clip = { x, y, width, height, scale: parseFloat(opt.scale || '2') };
      }
      const shot = await send('Page.captureScreenshot', params);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    }
  }

  const info = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({w:innerWidth,h:innerHeight,title:document.title,scripts:[...document.scripts].map(s=>s.src.split("/").slice(-1)[0])})',
    returnByValue: true
  });

  console.log(JSON.stringify({
    ok: errors.length === 0,
    errors: errors.slice(0, 25),
    logs: logs.slice(0, 60),
    evalResult: typeof evalResult === 'string' && evalResult.length > 3000
      ? evalResult.slice(0, 200) + ' …[' + evalResult.length + ' chars]'
      : evalResult,
    page: info.result.value
  }, null, 2));

  ws.close();
  if (!opt.keep) cleanup(proc);
}

function cleanup(proc) {
  try { proc.kill(); } catch (e) { }
  setTimeout(() => { try { proc.kill('SIGKILL'); } catch (e) { } }, 400);
  setTimeout(() => { try { fs.rmSync(UDD, { recursive: true, force: true }); } catch (e) { } }, 900);
}

main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
