/* 在当前 main 上打一个快照 tag：node tools/gh-tag.js <tagName> */
const https = require('https');

const TOKEN = process.env.GH_TOKEN;
const OWNER = 'kaixuanjun', REPO = 'pageflow';
const tag = process.argv[2] || ('snapshot-' + new Date().toISOString().slice(0, 10));

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: Object.assign({
        'User-Agent': 'pageflow-tag',
        Authorization: 'Bearer ' + TOKEN,
        Accept: 'application/vnd.github+json'
      }, data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf || '{}')); } catch (e) { resolve({}); }
        } else reject(new Error(method + ' ' + path + ' -> ' + res.statusCode + ' ' + buf.slice(0, 300)));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const base = '/repos/' + OWNER + '/' + REPO;
  const ref = await api('GET', base + '/git/ref/heads/main');
  const sha = ref.object.sha;
  console.log('main =', sha);
  try {
    const made = await api('POST', base + '/git/refs', { ref: 'refs/tags/' + tag, sha });
    console.log('tag 已创建：' + tag + ' → ' + made.object.sha);
  } catch (e) {
    if (/422/.test(e.message)) console.log('tag 已存在或冲突：' + e.message);
    else throw e;
  }
  const list = await api('GET', base + '/tags?per_page=20');
  console.log('现有 tag：' + list.map(t => t.name).join(', '));
})().catch(e => { console.error('失败：' + e.message); process.exit(1); });
