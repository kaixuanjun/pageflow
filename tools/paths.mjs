import fs from 'node:fs';
const t = fs.readFileSync('tools/rth-bundle.cjs', 'utf8');
const strs = [...new Set((t.match(/["'`]\/[a-z][a-z0-9\-_\/]{2,40}["'`]/gi) || []).map(s => s.slice(1, -1)))];
console.log(strs.join('\n'));
