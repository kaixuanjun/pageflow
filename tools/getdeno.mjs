import fs from 'node:fs';
import path from 'node:path';
const dest = path.join(process.env.LOCALAPPDATA, 'rth-deno');
fs.mkdirSync(dest, { recursive: true });
const zip = path.join(dest, 'deno.zip');
const url = 'https://dl.deno.land/release/v2.9.8/deno-x86_64-pc-windows-msvc.zip';
const r = await fetch(url, { signal: AbortSignal.timeout(180000) });
if (!r.ok) { console.error('download failed', r.status); process.exit(1); }
const buf = Buffer.from(await r.arrayBuffer());
fs.writeFileSync(zip, buf);
console.log('downloaded bytes', buf.length, '->', zip);
