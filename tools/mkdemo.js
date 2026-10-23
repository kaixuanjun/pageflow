const fs = require('fs');
const path = require('path');
const src = process.argv[2];
const dst = process.argv[3];
const b = fs.readFileSync(src);
const s = b.toString('base64');
fs.writeFileSync(dst, 'window.__PAGEFLOW_DEMO__ = "' + s + '";\n');
console.log('demo b64 chars:', s.length);
