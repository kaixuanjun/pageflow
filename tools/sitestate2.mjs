const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
for (const u of ['https://kaixuanjun.rth1.xyz/', 'https://kaixuanjun.rth1.xyz/pageflow/']) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    const txt = (await r.text()).slice(0, 400).replace(/\s+/g, ' ');
    console.log('---', u, r.status, r.headers.get('content-type'));
    console.log('   ', txt);
  } catch (e) {
    console.log('---', u, 'FAIL', e.message);
  }
}
