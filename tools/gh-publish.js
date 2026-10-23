#!/usr/bin/env node
/**
 * 用 GitHub REST / Git Data API 把当前目录发布成一个仓库。
 * 本机到 github.com 的 git 协议被墙（TLS 被重置），但 api.github.com 可用，
 * 所以走 blobs → tree → commit → ref 这条路，效果等于一次 git push。
 *
 * 用法：GH_TOKEN=xxx node tools/gh-publish.js [owner] [repo]
 * 可选：GH_MSG 提交信息，GH_PRIVATE=1 建私有仓库，GH_PAGES=1 顺手开 Pages
 */
'use strict';
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('缺少 GH_TOKEN 环境变量');
  process.exit(1);
}
const API = 'https://api.github.com';
const H = {
  Authorization: 'Bearer ' + TOKEN,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'pageflow-publish',
  'Content-Type': 'application/json'
};

const OWNER = process.argv[2] || process.env.GH_OWNER || '';
const REPO = process.argv[3] || process.env.GH_REPO || 'pageflow';
const MSG = process.env.GH_MSG || 'PAGEFLOW：PDF 翻页动效工坊';
const PRIVATE = process.env.GH_PRIVATE === '1';

/* 不发布的东西：用户自己的资料、探针截图、生成的测试文件 */
const SKIP_DIRS = [/^shots\//, /^\.git\//, /^node_modules\//, /^\.cdp/, /^\.github\//];
const SKIP_FILES = [
  /^工业人车安全预警现有技术方案调研文档\.pdf$/,
  /^assets\/big\.pdf$/,
  /^assets\/tiny\.pdf$/,
  /^tools\/t-upload\.gen\.js$/,
  /\.zip$/, /\.mp4$/, /\.webm$/
];

async function api(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: H,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* 非 JSON */ }
  if (!res.ok) {
    const err = new Error(method + ' ' + p + ' -> ' + res.status + ' ' + (json && json.message || text.slice(0, 300)));
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? base + '/' + name : name;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.some(re => re.test(rel + '/'))) continue;
      walk(abs, rel, out);
    } else {
      if (SKIP_FILES.some(re => re.test(rel))) continue;
      out.push({ rel, abs, size: st.size });
    }
  }
  return out;
}

async function pool(items, limit, worker) {
  let i = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const k = i++;
      await worker(items[k], k);
    }
  });
  await Promise.all(runners);
}

(async () => {
  const me = await api('GET', '/user');
  const owner = OWNER || me.login;
  console.log('账号：' + me.login + ' · 目标仓库：' + owner + '/' + REPO);

  /* 1. 仓库不存在就建 */
  let repo = null;
  try {
    repo = await api('GET', '/repos/' + owner + '/' + REPO);
    console.log('仓库已存在，将追加一次提交');
  } catch (e) {
    if (e.status !== 404) throw e;
    repo = await api('POST', '/user/repos', {
      name: REPO,
      description: 'PDF 翻页动效工坊 · 上传 PDF，时间轴打关键帧控制翻页与页面摆放（堆叠/平铺/书本/扇形/环形/画廊/纵深），WebGL2 渲染，一键导出视频',
      private: PRIVATE,
      has_issues: true,
      has_wiki: false,
      auto_init: false
    });
    console.log('已创建仓库：' + repo.html_url);
  }
  const branch = repo.default_branch || 'main';

  /* 2. 现有分支头（用于增量提交） */
  let parent = null;
  try {
    const ref = await api('GET', '/repos/' + owner + '/' + REPO + '/git/ref/heads/' + branch);
    parent = ref.object.sha;
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e;
  }

  /* 3. 空仓库先用 Contents API 打一次底：GitHub 对完全没有提交的仓库
        不接受 git/blobs（409 Git Repository is empty） */
  if (!parent) {
    const readmeAbs = path.join(process.cwd(), 'README.md');
    const init = await api('PUT', '/repos/' + owner + '/' + REPO + '/contents/README.md', {
      message: 'chore: 初始化仓库',
      content: fs.existsSync(readmeAbs)
        ? fs.readFileSync(readmeAbs).toString('base64')
        : Buffer.from('# ' + REPO + '\n').toString('base64')
    });
    parent = init.commit.sha;
    console.log('空仓库已初始化：' + parent.slice(0, 12));
  }

  /* 4. 逐个文件上传成 blob */
  const files = walk(process.cwd(), '', []);
  const total = files.reduce((s, f) => s + f.size, 0);
  console.log('待发布 ' + files.length + ' 个文件，' + (total / 1048576).toFixed(2) + ' MB');

  const entries = new Array(files.length);
  let done = 0;
  await pool(files, 4, async (f, k) => {
    const content = fs.readFileSync(f.abs).toString('base64');
    const blob = await api('POST', '/repos/' + owner + '/' + REPO + '/git/blobs', { content, encoding: 'base64' });
    entries[k] = { path: f.rel, mode: '100644', type: 'blob', sha: blob.sha };
    done++;
    if (done % 25 === 0 || done === files.length) process.stdout.write('  blob ' + done + '/' + files.length + '\n');
  });

  /* 4. tree → commit → ref */
  const tree = await api('POST', '/repos/' + owner + '/' + REPO + '/git/trees', { tree: entries });
  const commit = await api('POST', '/repos/' + owner + '/' + REPO + '/git/commits', {
    message: MSG,
    tree: tree.sha,
    parents: parent ? [parent] : []
  });
  if (parent) {
    await api('PATCH', '/repos/' + owner + '/' + REPO + '/git/refs/heads/' + branch, { sha: commit.sha, force: true });
  } else {
    await api('POST', '/repos/' + owner + '/' + REPO + '/git/refs', { ref: 'refs/heads/' + branch, sha: commit.sha });
  }
  console.log('提交完成：' + commit.sha.slice(0, 12) + ' · ' + entries.length + ' 个文件');

  /* 5. 顺手开 Pages（失败不影响主流程） */
  if (process.env.GH_PAGES === '1') {
    try {
      await api('POST', '/repos/' + owner + '/' + REPO + '/pages', {
        source: { branch, path: '/' }
      });
      console.log('GitHub Pages 已开启：https://' + owner + '.github.io/' + REPO + '/');
    } catch (e) {
      console.log('Pages 未开启（' + (e.status || '?') + '）：' + e.message.slice(0, 160));
      console.log('可以到 Settings → Pages 手动选 branch: ' + branch + ' / (root)');
    }
  }

  console.log('仓库地址：' + repo.html_url);
})().catch(e => {
  console.error('失败：' + e.message);
  if (e.body && e.body.errors) console.error(JSON.stringify(e.body.errors));
  process.exit(1);
});
