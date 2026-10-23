const r = await fetch('https://dl.retiehe.com/host-cli/bundle.cjs', { signal: AbortSignal.timeout(30000) });
const txt = await r.text();
await (await import('node:fs/promises')).writeFile('tools/rth-bundle.cjs', txt);
console.log('bytes', txt.length);
const urls = [...new Set(txt.match(/https:\/\/[a-z0-9.-]+[^\s"'\`)]*/gi) || [])];
console.log('URLS:');
for (const u of urls.slice(0, 60)) console.log('  ', u);
