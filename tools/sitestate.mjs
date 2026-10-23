for (const u of ['https://kaixuanjun.rth1.xyz/', 'https://kaixuanjun.rth1.xyz/pageflow/', 'https://kaixuanjun.rth1.xyz/index.html']) {
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    const txt = (await r.text()).slice(0, 300).replace(/\s+/g, ' ');
    console.log('---', u, r.status, r.headers.get('content-type'));
    console.log('   ', txt);
  } catch (e) {
    console.log('---', u, 'FAIL', e.message);
  }
}
