const urls = [
  'https://deno.land/',
  'https://dl.deno.land/release-latest.txt',
  'https://host.retiehe.com/cli',
  'https://github.com/denoland/deno/releases/latest'
];
for (const u of urls) {
  try {
    const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    console.log('OK  ', r.status, u, '->', r.headers.get('location') || '');
  } catch (e) {
    console.log('FAIL', u, '->', e.message);
  }
}
