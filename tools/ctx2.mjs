import fs from 'node:fs';
const t = fs.readFileSync('tools/rth-bundle.cjs', 'utf8');
for (const key of ['/host/site/changes', '/host/site/binary', '/host/sites']) {
  const i = t.indexOf(key);
  console.log('\n########## ' + key + ' @' + i);
  console.log(t.slice(Math.max(0, i - 900), i + 900).replace(/\s+/g, ' '));
}
