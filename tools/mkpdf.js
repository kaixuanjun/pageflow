/* 生成一个最小的多页 PDF（纯图形，无字体），用于上传/页数变化测试
   用法：node tools/mkpdf.js <out.pdf> [页数]
   注意：纯 ASCII 写入，避免任何编码差异把 xref 偏移量搞乱 */
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || 'assets/tiny.pdf';
const n = Math.max(1, parseInt(process.argv[3] || '3', 10));
const COLORS = ['1 0.15 0.2', '0.1 0.7 0.35', '0.2 0.35 0.95', '0.95 0.7 0.1', '0.6 0.2 0.85'];

const objs = [];
const pageIds = [];
const contentIds = [];
for (let i = 0; i < n; i++) {
  pageIds.push(objs.length + 3 + i * 2);
  contentIds.push(objs.length + 4 + i * 2);
}
objs.push('<< /Type /Catalog /Pages 2 0 R >>');
objs.push('<< /Type /Pages /Count ' + n + ' /Kids [' +
  pageIds.map(id => id + ' 0 R').join(' ') + '] >>');
for (let i = 0; i < n; i++) {
  const c = COLORS[i % COLORS.length];
  const stream = [
    c + ' rg',
    '60 60 ' + (595 - 120) + ' ' + (842 - 120) + ' re f',
    '1 1 1 rg',
    '80 ' + (842 - 200) + ' ' + (595 - 160) + ' 60 re f',
    '0 0 0 rg',
    '90 ' + (842 - 240) + ' 60 60 re f'
  ].join('\n');
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ' +
    '/Resources << >> /Contents ' + contentIds[i] + ' 0 R >>');
  objs.push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
}

let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
const offsets = [];
objs.forEach((body, i) => {
  offsets.push(pdf.length);
  pdf += (i + 1) + ' 0 obj\n' + body + '\nendobj\n';
});
const xref = pdf.length;
pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
offsets.forEach(o => { pdf += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';

const dest = path.resolve(out);
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, Buffer.from(pdf, 'latin1'));
console.log('wrote ' + dest + ' (' + pdf.length + ' bytes, ' + n + ' pages)');
