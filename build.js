const fs = require('fs');
const src = fs.readFileSync('blink-x.js', 'utf8');
const base = 'https://raw.githubusercontent.com/nori5555/blink-qx/main/';
const host = '(?:www\\.|mobile\\.|m\\.)?(?:x|twitter)\\.com';
const prefix = '^https:\\/\\/' + host + '\\/';
const rules = [
  prefix + '(?:[?#].*)?$',
  prefix + '(?:[A-Za-z0-9_]{1,20}\\/status|i\\/(?:web\\/status|status|article))\\/\\d+(?:[\\/?#].*)?$',
  prefix + '@?[A-Za-z0-9_]{1,20}(?:\\/(?:with_replies|media|highlights|articles))?\\/?(?:[?#].*)?$'
];
const hosts = 'x.com, www.x.com, m.x.com, mobile.x.com, twitter.com, www.twitter.com, m.twitter.com, mobile.twitter.com';
function snippet(script, test) {
  return '# Blink for X · Quantumult X · ' + (test ? '诊断测试版（候选未经确认）' : '正式版（首页/搜索）') + '\n' +
    '# https://github.com/nori5555/blink-qx\n' +
    '# 添加到 重写 → 引用；需要开启重写、MITM 并信任证书。\n' +
    'hostname = ' + hosts + '\n\n' +
    rules.map(r => r + ' url script-response-body ' + base + script).join('\n') + '\n';
}
fs.writeFileSync('blink-x.snippet.conf', snippet('blink-x.js', false));
fs.writeFileSync('blink-x-test.snippet.conf', snippet('blink-x-test.js', true));
fs.writeFileSync('blink-x-test.js', src.replace('var SHOW_TEST_CANDIDATES = false;', 'var SHOW_TEST_CANDIDATES = true;'));
const fn = src.match(/\/\*==INJECT:START==\*\/([\s\S]*?)\/\*==INJECT:END==\*\//)[1];
const preview = `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Blink QX · 预览</title>
<style>body{margin:0;background:#000;color:#eee;font:16px/1.6 -apple-system,sans-serif}main{padding:24px}h1{font-size:24px}p{color:#a8a8ae}.post{border:1px solid #333;padding:18px;border-radius:14px}</style></head><body>
<main><h1>Blink for X · QX</h1><p>点右下角 Blink 查看首页/搜索入口。仅模拟网页 UI，不代表真实 App 路由验证。</p>
<div class="post">@example_user<br>虚构测试数据。<br>1234567890123456789</div></main>
<script>${fn}
blinkInject({postTemplate:'',testCandidates:new URL(location.href).searchParams.get('test')==='1',home:'blink://widget/home',search:'blink://widget/search',label:'Blink',styleNonce:''});</script>
</body></html>`;
fs.writeFileSync('preview.html', preview);
console.log('Generated normal/test rewrite snippets, test script and preview.');
