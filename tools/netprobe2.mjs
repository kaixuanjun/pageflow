const urls = [
  'https://api.retiehe.com/backend',
  'https://registry.npmjs.org/',
  'https://github.com/denoland/deno/releases/download/v2.9.8/deno-x86_64-pc-windows-msvc.zip',
  'https://dl.deno.land/release/v2.9.8/deno-x86_64-pc-windows-msvc.zip',
  'https://objects.githubusercontent.com/'
];
for (const u of urls) {
  try {
    const r = await fetch(u, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
    console.log('OK  ', r.status, r.headers.get('content-length') || '-', u);
  } catch (e) {
    console.log('FAIL', u, '->', e.message);
  }
}
