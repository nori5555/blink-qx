/*
 * Blink for X · Quantumult X · v1.1.0
 * https://github.com/nori5555/blink-qx
 * 开发者确认：blink://、blink://widget/home、blink://widget/search。
 * 帖子/个人主页/文章深链尚未确认，不把候选格式当成支持的功能。
 * 保留 CSP，复用页面允许的 nonce；不上传链接、Cookie 或浏览数据。
 */

// ===== 配置区 =====
var POST_TEMPLATE = '';  // 只填已验证格式；支持 {URL} {ENC} {ID} {USER}
var SHOW_TEST_CANDIDATES = true;  // 正常版关闭；独立测试版开启
var HOME_SCHEME   = 'blink://widget/home';
var SEARCH_SCHEME = 'blink://widget/search';
var FAB_LABEL     = 'Blink';
// ==================

/*==INJECT:START==*/
function blinkInject(CFG) {
  if (window.__blinkXInjected) return;
  window.__blinkXInjected = true;

  var HOST_ID = '__blinkx_host__';

  function analyse(u) {
    var m = u.match(/\/([A-Za-z0-9_]{1,20})\/status\/(\d+)/);
    if (m) return { type: 'post', user: m[1], id: m[2] };
    if (/\/i\/article\//.test(u)) return { type: 'article' };
    var p = u.match(/^https?:\/\/(?:www\.|mobile\.|m\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,20})(?:[\/?#]|$)/);
    if (p) {
      var skip = ['home', 'explore', 'search', 'notifications', 'messages', 'i', 'settings',
                  'compose', 'login', 'logout', 'signup', 'jobs', 'tos', 'privacy', 'bookmarks'];
      if (skip.indexOf(p[1].toLowerCase()) < 0) return { type: 'user', user: p[1] };
    }
    return { type: 'page' };
  }

  function buildList(u) {
    var info = analyse(u);
    var enc = encodeURIComponent(u);
    var out = [];
    function add(label, url) { out.push({ label: label, url: url }); }

    if (CFG.postTemplate && (!/\{ID\}/.test(CFG.postTemplate) || info.id)) {
      var target = CFG.postTemplate.replace(/\{URL\}/g, function () { return u; })
        .replace(/\{ENC\}/g, function () { return enc; })
        .replace(/\{ID\}/g, function () { return info.id || ''; })
        .replace(/\{USER\}/g, function () { return info.user || ''; });
      if (/^blink:\/\//i.test(target)) {
        add('打开当前页面（已配置模板）', target);
        if (!CFG.testCandidates) return out;
      }
    }
    if (!CFG.testCandidates) {
      add('打开 Blink 首页', CFG.home);
      add('打开 Blink 搜索', CFG.search);
      return out;
    }
    if (info.type === 'post' || info.type === 'article') {
      if (info.id) {
        add('widget/post?url=', 'blink://widget/post?url=' + enc);
        add('widget/post?id=' + info.id, 'blink://widget/post?id=' + info.id);
        add('widget/status/' + info.id, 'blink://widget/status/' + info.id);
        add('widget/post/' + info.id, 'blink://widget/post/' + info.id);
        add('widget/tweet/' + info.id, 'blink://widget/tweet/' + info.id);
        add('widget/thread/' + info.id, 'blink://widget/thread/' + info.id);
        add('widget/detail?url=', 'blink://widget/detail?url=' + enc);
        add('widget/home?url=', 'blink://widget/home?url=' + enc);
        add('open?url=', 'blink://open?url=' + enc);
        add('裸 URL 当 path', 'blink://' + u.replace(/^https?:\/\//, ''));
      } else {
        add('文章候选：widget/article?url=', 'blink://widget/article?url=' + enc);
        add('文章候选：open?url=', 'blink://open?url=' + enc);
      }
    } else if (info.type === 'user') {
      add('widget/user?screen_name=' + info.user, 'blink://widget/user?screen_name=' + info.user);
      add('widget/user/' + info.user, 'blink://widget/user/' + info.user);
      add('widget/profile?screen_name=' + info.user, 'blink://widget/profile?screen_name=' + info.user);
      add('widget/home?url=', 'blink://widget/home?url=' + enc);
    }
    add('widget/home（已知可用）', CFG.home);
    add('widget/search（已知可用）', CFG.search);
    return out;
  }

  var host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all:initial;position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var css =
    ':host{all:initial}' +
    '.fab{position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);' +
      'width:48px;height:48px;border-radius:24px;background:rgba(10,10,10,.78);color:#fff;' +
      'display:flex;align-items:center;justify-content:center;' +
      'font:700 11px/1 -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.2px;' +
      'box-shadow:0 6px 18px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.22);' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:2;user-select:none;' +
      'cursor:pointer;transition:transform .12s ease}' +
    '.fab:active{transform:scale(.92)}' +
    '.mask{position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,.5);z-index:3;display:none}' +
    '.mask.on{display:block}' +
    '.sheet{position:fixed;left:0;right:0;bottom:0;max-height:72vh;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
      'background:#0f0f10;color:#eee;border-radius:18px 18px 0 0;' +
      'padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px));' +
      'font:13px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;z-index:4;display:none;' +
      'box-shadow:0 -8px 30px rgba(0,0,0,.5)}' +
    '.sheet.on{display:block}' +
    '.hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}' +
    '.ttl{font-size:15px;font-weight:700}' +
    '.x{width:28px;height:28px;border-radius:14px;background:#232326;color:#bbb;display:flex;' +
      'align-items:center;justify-content:center;font-size:16px;cursor:pointer}' +
    '.url{font-size:11px;color:#8a8a8e;word-break:break-all;margin:4px 0 10px;' +
      'background:#17171a;border-radius:8px;padding:8px 10px;font-family:ui-monospace,Menlo,monospace}' +
    '.sec{font-size:11px;color:#8a8a8e;margin:12px 2px 6px;text-transform:uppercase;letter-spacing:.6px}' +
    '.row{display:block;width:100%;text-align:left;background:#1a1a1d;color:#e8e8ea;' +
      'border:1px solid #26262a;border-radius:10px;padding:11px 12px;margin:6px 0;' +
      'font:12px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer}' +
    '.row:active{background:#2a2a2f}' +
    '.row.known{border-color:#1f4d2e;background:#12271a;color:#c8f5d5}' +
    '.row.last:after{content:" ← 上次试过";color:#ffb340;font-size:11px}' +
    '.hint{font-size:11px;color:#77777c;margin-top:10px;line-height:1.5}' +
    '.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:150px;background:rgba(0,0,0,.88);' +
      'color:#fff;font:12px/1.4 -apple-system,sans-serif;padding:9px 14px;border-radius:10px;' +
      'z-index:5;opacity:0;transition:opacity .2s;pointer-events:none;max-width:80vw;text-align:center}' +
    '.toast.on{opacity:1}';

  var html =
    '<style>' + css + '</style>' +
    '<button class="fab" id="fab" type="button" aria-label="在 Blink 中打开"></button>' +
    '<div class="mask" id="mask"></div>' +
    '<div class="sheet" id="sheet">' +
      '<div class="hd"><div class="ttl">在 Blink 中打开</div><div class="x" id="close">×</div></div>' +
      '<div class="url" id="url"></div>' +
      '<div id="body"></div>' +
      '<div class="hint">' + (CFG.testCandidates ?
      '测试版：除首页/搜索外全部是未验证候选；回落首页不能证明深链不存在。' :
      '首页/搜索由开发者确认。当前帖子、个人主页和文章的直达格式尚未确认。') + '</div>' +
    '</div>' +
    '<div class="toast" id="toast"></div>';

  root.innerHTML = html;
  var styleEl = root.querySelector('style');
  if (styleEl && CFG.styleNonce) styleEl.setAttribute('nonce', CFG.styleNonce);
  (document.body || document.documentElement).appendChild(host);

  var $ = function (id) { return root.getElementById ? root.getElementById(id) : host.querySelector('#' + id); };
  var fab = $('fab'), mask = $('mask'), sheet = $('sheet'), bodyEl = $('body'),
      urlEl = $('url'), toastEl = $('toast'), closeEl = $('close');

  fab.textContent = CFG.label;
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = 'toast on';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = 'toast'; }, 2200);
  }

  function openScheme(url) {
    if (!/^blink:\/\//i.test(url)) return;
    if (CFG.testCandidates) {
      try { sessionStorage.setItem('blinkx.last', url); } catch (e) {}
    }
    try { window.location.href = url; } catch (e) {}
    setTimeout(function () {
      if (!document.hidden) toast('请允许 Safari 打开 Blink；此提示不能判断深链是否支持');
    }, 1400);
  }

  function render() {
    var u = location.href;
    urlEl.textContent = u;
    var last = '';
    if (CFG.testCandidates) {
      try { last = sessionStorage.getItem('blinkx.last') || ''; } catch (e) {}
    }
    var list = buildList(u);

    bodyEl.innerHTML = '';
    list.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'row' + (item.url === last ? ' last' : '') +
        (item.url === CFG.home || item.url === CFG.search ? ' known' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openScheme(item.url);
        var rows = bodyEl.querySelectorAll('.row');
        for (var i = 0; i < rows.length; i++) rows[i].classList.remove('last');
        btn.classList.add('last');
      });
      bodyEl.appendChild(btn);
    });
  }

  function openPanel() { render(); mask.classList.add('on'); sheet.classList.add('on'); }
  function closePanel() { mask.classList.remove('on'); sheet.classList.remove('on'); }

  fab.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    var list = buildList(location.href);
    if (!CFG.testCandidates && list.length === 1) openScheme(list[0].url);
    else openPanel();
  });
  mask.addEventListener('click', function (e) { e.stopPropagation(); closePanel(); });
  if (closeEl) closeEl.addEventListener('click', function (e) { e.stopPropagation(); closePanel(); });

  // X 是 SPA，页面内跳转不刷新，靠轮询兜住 FAB 被 React 干掉的情况
  setInterval(function () {
    if (!document.getElementById(HOST_ID)) {
      (document.body || document.documentElement).appendChild(host);
    }
  }, 1500);
}
/*==INJECT:END==*/

// ===== Quantumult X response-body 入口 =====
function blinkResponse() {
  var body = $response.body || '';
  var headers = $response.headers || {};
  var request = typeof $request === 'object' ? $request : {};
  function header(name) {
    for (var k in headers) {
      if (k.toLowerCase() === name) return String(headers[k]);
    }
    return '';
  }
  if ((request.method && request.method.toUpperCase() !== 'GET') ||
      ($response.statusCode && ($response.statusCode < 200 || $response.statusCode >= 300)) ||
      !/text\/html/i.test(header('content-type')) || !/<html(?:\s|>)/i.test(body) ||
      /data-blink-qx="1"/.test(body)) {
    $done({}); return;
  }

  function attribute(tag, name) {
    var match = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
    return match ? (match[1] || match[2] || match[3] || '') : '';
  }
  var policies = [];
  var csp = header('content-security-policy');
  if (csp) policies = csp.split(',');
  var metas = body.match(/<meta\b[^>]*>/gi) || [];
  metas.forEach(function (tag) {
    if (attribute(tag, 'http-equiv').toLowerCase() === 'content-security-policy') {
      policies.push(attribute(tag, 'content').replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'").replace(/&amp;/gi, '&'));
    }
  });
  function directive(policy, name) {
    var match = policy.match(new RegExp('(?:^|;)\\s*' + name + '(?:\\s+([^;]*))?(?:;|$)', 'i'));
    return match ? (match[1] || '').trim() : null;
  }
  function sources(policy, kind) {
    var names = [kind + '-src-elem', kind + '-src', 'default-src'];
    for (var i = 0; i < names.length; i++) {
      var value = directive(policy, names[i]);
      if (value !== null) return value;
    }
    return null;
  }
  function inlineAllowed(kind, nonce) {
    return policies.every(function (policy) {
      var sandbox = directive(policy, 'sandbox');
      if (sandbox !== null && sandbox.split(/\s+/).indexOf('allow-scripts') < 0) return false;
      var value = sources(policy, kind);
      if (value === null) return true;
      var tokens = value.split(/\s+/);
      if (nonce && tokens.indexOf("'nonce-" + nonce + "'") >= 0) return true;
      return tokens.indexOf("'unsafe-inline'") >= 0 &&
        !/'(?:nonce-|sha(?:256|384|512)-)/i.test(value) &&
        !(kind === 'script' && tokens.indexOf("'strict-dynamic'") >= 0);
    });
  }
  function pickNonce(kind) {
    var candidates = [''];
    policies.forEach(function (policy) {
      var value = sources(policy, kind) || '';
      var matches = value.match(/'nonce-([A-Za-z0-9+\/_-]+=*)'/g) || [];
      matches.forEach(function (token) { candidates.push(token.slice(7, -1)); });
    });
    var scripts = body.match(/<(?:script|style)\b[^>]*>/gi) || [];
    scripts.forEach(function (tag) {
      var value = attribute(tag, 'nonce');
      if (/^[A-Za-z0-9+\/_-]+=*$/.test(value)) candidates.push(value);
    });
    for (var i = 0; i < candidates.length; i++) {
      if (inlineAllowed(kind, candidates[i])) return candidates[i];
    }
    return null;
  }
  var scriptNonce = pickNonce('script');
  var styleNonce = pickNonce('style');
  if (scriptNonce === null || styleNonce === null) {
    console.log('[Blink QX] CSP does not allow injection; page left unchanged.');
    $done({}); return;
  }
  var cfg = { postTemplate: POST_TEMPLATE, testCandidates: SHOW_TEST_CANDIDATES,
    home: HOME_SCHEME, search: SEARCH_SCHEME, label: FAB_LABEL, styleNonce: styleNonce };
  var code = '(' + blinkInject.toString() + ')(' + JSON.stringify(cfg).replace(/</g, '\\u003c') + ');';
  var snippet = '<script data-blink-qx="1"' +
    (scriptNonce ? ' nonce="' + scriptNonce + '"' : '') + '>' + code + '</scr' + 'ipt>';
  var out;
  if (/<\/body>/i.test(body)) out = body.replace(/<\/body>/i, function () { return snippet + '</body>'; });
  else if (/<\/html>/i.test(body)) out = body.replace(/<\/html>/i, function () { return snippet + '</html>'; });
  else out = body + snippet;
  // QX 自动处理长度/编码头。CSP、Cookie 与所有响应头均保留不变。
  $done({ body: out });
}
blinkResponse();
