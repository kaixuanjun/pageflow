import fs from 'node:fs';
import path from 'node:path';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const stage = path.join(process.env.LOCALAPPDATA, 'rth-publish', 'stage');
fs.mkdirSync(path.join(stage, 'pageflow'), { recursive: true });
async function grab(u) {
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) });
  return { status: r.status, text: await r.text() };
}
const root = await grab('https://kaixuanjun.rth1.xyz/');
const app = await grab('https://kaixuanjun.rth1.xyz/pageflow/');
fs.writeFileSync(path.join(stage, 'index.html'), root.text);
fs.writeFileSync(path.join(stage, 'pageflow', 'index.html'), app.text);
console.log('root', root.status, root.text.length, 'app', app.status, app.text.length);
const scripts = [...app.text.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
console.log('app refs:'); for (const s of scripts) console.log('  ', s);
const m = root.text.match(/https?:\/\/[^"'<>\s]+|location[^;]{0,120}/g);
console.log('root jumps:', (m || []).slice(0, 6).join(' | '));
