import fs from 'node:fs';
const t = fs.readFileSync('tools/rth-bundle.cjs', 'utf8');
function ctx(re, span = 320, max = 6) {
  const out = [];
  let m;
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = g.exec(t)) && out.length < max) {
    out.push(t.slice(Math.max(0, m.index - span), m.index + span).replace(/\s+/g, ' '));
  }
  return out;
}
for (const re of [/RTH_API_KEY/, /Authorization/, /"\/sites"/, /api\.retiehe\.com/]) {
  console.log('\n########## ' + re.source);
  for (const s of ctx(re)) console.log('…' + s + '…\n');
}
