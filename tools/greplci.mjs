import fs from 'node:fs';
const t = fs.readFileSync('tools/rth-bundle.cjs', 'utf8');
const pats = [
  /["'`]\/?api\/[a-z0-9\/_.-]+["'`]/gi,
  /rth[_-]?api[_-]?key/gi,
  /x-[a-z0-9-]*key[a-z0-9-]*/gi,
  /authorization/gi,
  /\/(deploy|upload|sites?|files?)\b/g
];
for (const p of pats) {
  const m = [...new Set(t.match(p) || [])];
  console.log('---', p.source, m.length);
  console.log(m.slice(0, 40).join('  '));
}
