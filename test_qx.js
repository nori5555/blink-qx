const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'blink-x.js'),'utf8');
const fn=src.match(/\/\*==BLINK_BODY_START==\*\/([\s\S]*?)\/\*==BLINK_BODY_END==\*\//)[1];
const body='<!doctype html><html><head></head><body><div id="react-root">original</div></body></html>';
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function run(options={}) {
 const headers={'content-type':'text/html',...options.headers};const before=JSON.stringify(headers);let result,calls=0;
 vm.runInNewContext(src,{$request:{url:'https://x.com/example_user/status/1234567890123456789',method:options.method||'GET'},$response:{body:options.body===undefined?body:options.body,headers,statusCode:options.status||200},$done:o=>{result=o;calls++;},console:{log(){}}},{timeout:3000});
 assert.strictEqual(calls,1);assert.strictEqual(JSON.stringify(headers),before);return result;
}
const parserSource=fn.slice(fn.indexOf('  var hosts ='),fn.indexOf('  function dismiss('));
const parser=vm.runInNewContext('(function(){'+parserSource+';return parse;})()', {URL,TextEncoder});
const valid=[
 ['https://x.com/example_user/status/1234567890123456789','blink://open/post/1234567890123456789'],
 ['https://x.com/example_user/status/1234567890123456789/photo/2','blink://open/post/1234567890123456789/photo/2'],
 ['https://twitter.com/example_user/status/1234567890123456789/video/1','blink://open/post/1234567890123456789/video/1'],
 ['https://x.com/i/status/123','blink://open/post/123'],
 ['https://x.com/i/web/status/123?foo=bar','blink://open/post/123'],
 ['https://x.com/i/article/123','blink://open/article/123'],
 ['https://x.com/example_user','blink://open/profile/example_user'],
 ['https://mobile.twitter.com/example_user?lang=en','blink://open/profile/example_user'],
 ['https://www.x.com/Example123_/','blink://open/profile/Example123_']
];
valid.forEach(([url,target])=>test('route '+url,()=>assert.strictEqual(parser(url).deepLink,target)));
const invalid=['https://evil.example/user/status/123','http://x.com/user/status/123','https://x.com:443/user/status/123','https://user@x.com/user/status/123','https://x.com/home','https://x.com/search?q=hi','https://x.com/user/status/0','https://x.com/user/status/01','https://x.com/user/status/123/photo/5','https://x.com/user/status/123/photo/0','https://x.com/user/status/123/extra','https://x.com/user//status/123','https://x.com/user/%73tatus/123','https://x.com/user/../other/status/123','https://x.com/abcdefghijklmnop','https://m.x.com/user/status/123','https://x.com/user/status/123?q='+('中'.repeat(800))];
invalid.forEach(url=>test('reject '+url.slice(0,75),()=>assert.strictEqual(parser(url),null)));
test('HTML injected',()=>assert.ok(run().body.includes('data-blink-qx="1"')));
test('Original document retained',()=>assert.ok(run().body.includes('<div id="react-root">original</div>')));
test('Only body returned; no headers changed',()=>assert.deepStrictEqual(Object.keys(run()),['body']));
test('Duplicate injection skipped',()=>assert.ok(!run({body:run().body}).body));
test('JSON skipped',()=>assert.ok(!run({headers:{'content-type':'application/json'},body:'{}'}).body));
test('POST skipped',()=>assert.ok(!run({method:'POST'}).body));
test('Redirect skipped',()=>assert.ok(!run({status:302}).body));
test('Capital HTML supported',()=>assert.ok(run({body:'<HTML><BODY>original</BODY></HTML>'}).body));
test('Incomplete body supported',()=>assert.ok(run({body:'<html><body>hi'}).body.endsWith('</script>')));
const csp="default-src 'self';script-src 'nonce-A';script-src-attr 'none';style-src 'unsafe-inline'";
test('Nonce used with script-src-attr none',()=>assert.ok(run({headers:{'content-security-policy':csp}}).body.includes('nonce="A"')));
test('Conflicting policy skipped',()=>assert.ok(!run({headers:{'content-security-policy':"script-src 'nonce-A',script-src 'nonce-B'"}}).body));
test('Style nonce set',()=>assert.ok(run({headers:{'content-security-policy':"script-src 'nonce-A';style-src 'nonce-S'"}}).body.includes('"styleNonce":"S"')));
test('No nonce cannot bypass CSP',()=>assert.ok(!run({headers:{'content-security-policy':"script-src 'self'"}}).body));
test('Meta CSP respected',()=>assert.ok(run({body:body.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="script-src \'nonce-M\';style-src \'unsafe-inline\'">')}).body.includes('nonce="M"')));
test('No inline click handlers or window navigation',()=>assert.ok(!/onclick=|window\.open|window\.location/.test(fn)));
test('Real anchors are used',()=>assert.ok(fn.includes("document.createElement('a')")&&fn.includes('anchor.href=target.deepLink')));

const snippet=fs.readFileSync(path.join(__dirname,'blink-x-local.snippet.conf'),'utf8');
test('Local rewrite refers to filename',()=>assert.ok(/script-response-body blink-x\.js/.test(snippet)&&!snippet.includes('raw.githubusercontent.com')));
const remote=fs.readFileSync(path.join(__dirname,'blink-x.snippet.conf'),'utf8');
const rule=remote.split('\n').find(s=>s.includes(' url script-response-body '));
const pattern=new RegExp(rule.split(' url ')[0]);
test('Public script pinned to v2.0.0',()=>assert.ok(rule.endsWith('/v2.0.0/blink-x.js')));
test('No main config sections in remote resource',()=>assert.ok(!/^\[(?:rewrite_local|mitm)\]/m.test(remote)));
test('Public rewrite includes HTTPS X routes',()=>assert.ok(pattern.test('https://x.com/example_user/status/1234567890123456789')));
test('API endpoints do not match',()=>assert.ok(!pattern.test('https://x.com/i/api/graphql/anything')));
test('Unrelated domains do not match',()=>assert.ok(!pattern.test('https://example.org/example_user/status/123')));
test('HTTP is excluded',()=>assert.ok(!pattern.test('http://x.com/example_user')));
test('Legacy test resource uses corrected routes',()=>assert.strictEqual(fs.readFileSync(path.join(__dirname,'blink-x-test.js'),'utf8'),src));
test('No browser-world networking or cookies',()=>assert.ok(!/\bfetch\s*\(|XMLHttpRequest|document\.cookie|\$task\.fetch/.test(src)));
console.log('ALL PASS ('+count+' checks). QX device verification is separate.');
