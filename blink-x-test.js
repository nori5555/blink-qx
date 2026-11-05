/*
 * Blink for X · Quantumult X · v2.1.1
 * Tries the same Blink anchor used by the manual button once per destination.
 * https://github.com/nori5555/blink-qx
 * No network requests, cookies or account tokens. The browser controls app prompts.
 */
var LABEL = '在 Blink 中打开';
var AUTO_OPEN = true; // Try once per destination per page load; false keeps manual mode.

/*==BLINK_BODY_START==*/
function installBlinkButton(CFG) {
  if (window.top !== window || window.__blinkQXInstalled) return;
  window.__blinkQXInstalled = true;
  var dismissed = false;
  try { dismissed = sessionStorage.getItem('blink.qx.dismissed.v2') === '1'; } catch (e) {}
  var host = null, anchor = null, label = null, lastURL = '', scheduled = false;
  // Memory only: mark before navigation so cancellation/pageshow cannot start a loop.
  var autoAttempted = Object.create(null);
  var autoClickInProgress = false;
  var hosts = { 'x.com':1, 'www.x.com':1, 'mobile.x.com':1,
    'twitter.com':1, 'www.twitter.com':1, 'mobile.twitter.com':1 };
  var reserved = { i:1, home:1, explore:1, search:1, notifications:1, messages:1,
    settings:1, login:1, logout:1, signup:1, intent:1, share:1, compose:1,
    account:1, oauth:1, tos:1, privacy:1, jobs:1, download:1, about:1,
    help:1, support:1, hashtag:1, communities:1, premium:1, subscriptions:1 };
  function validID(s) { return /^[1-9][0-9]{0,19}$/.test(s); }
  function validHandle(s) { return /^[A-Za-z0-9_]{1,15}$/.test(s) && !Object.prototype.hasOwnProperty.call(reserved, s.toLowerCase()); }
  function parse(raw) {
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > 2048) return null;
    var source = raw.match(/^https:\/\/([^/?#]*)([^?#]*)/i);
    if (!source || /[:@\\\s]/.test(source[1]) || /%|\/\/|\\|(?:^|\/)\.{1,2}(?:\/|$)/.test(source[2])) return null;
    var u;
    try { u = new URL(raw); } catch (e) { return null; }
    if (u.protocol !== 'https:' || !Object.prototype.hasOwnProperty.call(hosts, u.hostname) || u.username || u.password || u.port || /%|\/\//.test(u.pathname)) return null;
    var p = u.pathname.split('/').filter(Boolean), kind, path, pos;
    if (p.length === 1 && validHandle(p[0])) return {kind:'profile', deepLink:'blink://open/profile/' + p[0]};
    if (p.length === 3 && p[0] === 'i' && p[1] === 'article' && validID(p[2]))
      return {kind:'article', deepLink:'blink://open/article/' + p[2]};
    if (p.length >= 3 && (validHandle(p[0]) || p[0] === 'i') && p[1] === 'status') pos = 2;
    else if (p.length >= 4 && p[0] === 'i' && p[1] === 'web' && p[2] === 'status') pos = 3;
    else return null;
    if (!validID(p[pos])) return null;
    path = 'blink://open/post/' + p[pos];
    if (p.length === pos + 3 && (p[pos+1] === 'photo' || p[pos+1] === 'video') && /^[1-4]$/.test(p[pos+2]))
      path += '/' + p[pos+1] + '/' + p[pos+2];
    else if (p.length !== pos + 1) return null;
    return {kind:'post', deepLink:path};
  }
  function dismiss(value) {
    dismissed = value;
    try { value ? sessionStorage.setItem('blink.qx.dismissed.v2','1') : sessionStorage.removeItem('blink.qx.dismissed.v2'); } catch (e) {}
  }
  function create() {
    host = document.createElement('div'); host.id = 'blink-qx-open-in-app';
    host.lang = 'zh-Hans';
    var shadow = host.attachShadow({mode:'closed'});
    var style = document.createElement('style');
    if (CFG.styleNonce) style.setAttribute('nonce', CFG.styleNonce);
    style.textContent = ':host{all:initial!important;position:fixed!important;inset:auto 12px calc(12px + env(safe-area-inset-bottom)) 12px!important;z-index:2147483646!important;display:block!important;pointer-events:none!important;color-scheme:light dark!important}:host([hidden]){display:none!important}*{box-sizing:border-box}.bar{display:flex;align-items:center;gap:4px;max-width:440px;margin:0 auto;padding:6px;border:1px solid light-dark(#dedede,#424242);border-radius:20px;background:light-dark(#fff,#222);color:light-dark(#191919,#f5f5f5);box-shadow:0 4px 20px #0002;pointer-events:auto;font:15px/1.35 -apple-system,BlinkMacSystemFont,sans-serif}.open{flex:1;min-height:48px;min-width:0;display:flex;align-items:center;gap:12px;padding:4px 12px;color:inherit;text-decoration:none;border-radius:14px}.brand{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#111;color:white;font-weight:700;font-size:12px}.copy{font-weight:600}button{flex:none;width:44px;height:44px;border:0;border-radius:14px;color:inherit;background:transparent;font:26px/1 -apple-system,sans-serif;cursor:pointer}.open:focus-visible,button:focus-visible{outline:3px solid #1674df;outline-offset:1px}.open:active,button:active{background:light-dark(#eee,#383838)}@media(min-width:700px){:host{inset-inline-start:auto!important;inset-inline-end:24px!important;width:360px!important}}';
    var bar = document.createElement('aside'); bar.className = 'bar';
    bar.setAttribute('aria-label', CFG.label);
    anchor = document.createElement('a'); anchor.className = 'open';
    var brand = document.createElement('span'); brand.className = 'brand'; brand.textContent = 'B'; brand.setAttribute('aria-hidden','true');
    var copy = document.createElement('span'); label = document.createElement('span'); label.className = 'copy'; label.textContent = CFG.label; copy.appendChild(label);
    anchor.appendChild(brand); anchor.appendChild(copy);
    anchor.addEventListener('click', function(){
      if (!autoClickInProgress) dismiss(true);
    });
    var close = document.createElement('button'); close.type='button'; close.textContent='×'; close.setAttribute('aria-label','关闭'); close.title='关闭';
    close.addEventListener('click',function(){dismiss(true);host.hidden=true;});
    bar.appendChild(anchor); bar.appendChild(close); shadow.appendChild(style); shadow.appendChild(bar);
    document.documentElement.appendChild(host);
  }
  function tryAutoOpen(target) {
    if (!CFG.autoOpen || document.hidden || autoAttempted[target.deepLink]) return;
    autoAttempted[target.deepLink] = true;
    autoClickInProgress = true;
    try { anchor.click(); } catch (e) {
      // A scripted click still lacks a real user gesture and may be blocked.
    } finally {
      autoClickInProgress = false;
    }
  }
  function update(force) {
    var url=location.href;
    if (!force && lastURL===url && host && host.isConnected) return;
    lastURL=url;
    var target=parse(url), active=document.activeElement;
    var editing=active && (/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)||active.isContentEditable);
    if (!target||dismissed||editing) { if(host) host.hidden=true; return; }
    if (!host||!host.isConnected) create();
    anchor.href=target.deepLink; anchor.dataset.kind=target.kind;
    host.hidden=false;
    tryAutoOpen(target);
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(function(){scheduled=false;update(false);});}
  new MutationObserver(schedule).observe(document,{childList:true,subtree:true});
  addEventListener('popstate',function(){update(true);});
  addEventListener('pageshow',function(){update(true);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)update(true);});
  document.addEventListener('focusin',function(){update(true);});
  document.addEventListener('focusout',function(){queueMicrotask(function(){update(true);});});
  update(true);
}
/*==BLINK_BODY_END==*/

function blinkQXResponse() {
  var body=$response.body||'', headers=$response.headers||{};
  var req=typeof $request==='object'?$request:{};
  function getHeader(name){for(var k in headers)if(k.toLowerCase()===name)return String(headers[k]);return '';}
  if ((req.method&&req.method.toUpperCase()!=='GET')||($response.statusCode&&($response.statusCode<200||$response.statusCode>=300))||!/^text\/html\b/i.test(getHeader('content-type'))||!/<html(?:\s|>)/i.test(body)||/data-blink-qx="1"/.test(body)) { $done({});return; }
  function attr(tag, name) {
    var match = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
    return match ? (match[1] || match[2] || match[3] || '') : '';
  }
  var policies = [];
  if (getHeader('content-security-policy-report-only')) {
    console.log('[Blink QX] Report-only CSP present; skipping injection.'); $done({}); return;
  }
  var csp=getHeader('content-security-policy');
  if (csp) {
    policies = [csp];
    var depth = 0, quoted = false;
    for (var ci=0; ci<csp.length; ci++) {
      var ch=csp[ci];
      if (ch === "'") quoted = !quoted;
      else if (!quoted && ch === '(') depth++;
      else if (!quoted && ch === ')' && depth) depth--;
      else if (!quoted && !depth && ch === ',') {
        // Commas in data: or unquoted source values are ambiguous; refuse rather than weaken policy.
        console.log('[Blink QX] Ambiguous multi-policy CSP; skipping injection.'); $done({}); return;
      }
    }
  }
  (body.match(/<meta\b[^>]*>/gi)||[]).forEach(function(t){if(attr(t,'http-equiv').toLowerCase()==='content-security-policy')policies.push(attr(t,'content').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&amp;/gi,'&'));});
  function directive(policy,name){var m=policy.match(new RegExp('(?:^|;)\\s*'+name+'(?:\\s+([^;]*))?(?:;|$)','i'));return m?(m[1]||'').trim():null;}
  function sources(policy,kind){var names=[kind+'-src-elem',kind+'-src','default-src'];for(var i=0;i<names.length;i++){var x=directive(policy,names[i]);if(x!==null)return x;}return null;}
  function allowed(kind,nonce){return policies.every(function(p){var sandbox=directive(p,'sandbox');if(sandbox!==null&&sandbox.split(/\s+/).indexOf('allow-scripts')<0)return false;var s=sources(p,kind);if(s===null)return true;var t=s.split(/\s+/);if(nonce&&t.indexOf("'nonce-"+nonce+"'")>=0)return true;return t.indexOf("'unsafe-inline'")>=0&&!/'(?:nonce-|sha(?:256|384|512)-)/i.test(s)&&!(kind==='script'&&t.indexOf("'strict-dynamic'")>=0);});}
  function nonce(kind){var c=[''];policies.forEach(function(p){var s=sources(p,kind)||'',m=s.match(/'nonce-([A-Za-z0-9+\/_-]+=*)'/g)||[];m.forEach(function(x){c.push(x.slice(7,-1));});});(body.match(/<(?:script|style)\b[^>]*>/gi)||[]).forEach(function(t){var x=attr(t,'nonce');if(/^[A-Za-z0-9+\/_-]+=*$/.test(x))c.push(x);});for(var i=0;i<c.length;i++)if(allowed(kind,c[i]))return c[i];return null;}
  var sn=nonce('script'),st=nonce('style');
  if(sn===null||st===null){console.log('[Blink QX] CSP blocks safe injection; unchanged.');$done({});return;}
  var cfg={label:LABEL,styleNonce:st,autoOpen:AUTO_OPEN};
  var code='('+installBlinkButton.toString()+')('+JSON.stringify(cfg).replace(/</g,'\\u003c')+');';
  var insert='<script data-blink-qx="1"'+(sn?' nonce="'+sn+'"':'')+'>'+code+'</scr'+'ipt>';
  var out=/<\/body>/i.test(body)?body.replace(/<\/body>/i,function(){return insert+'</body>'; }):/<\/html>/i.test(body)?body.replace(/<\/html>/i,function(){return insert+'</html>'; }):body+insert;
  $done({body:out});
}
blinkQXResponse();
