const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync('blink-x.js', 'utf8');
const html = '<!doctype html><html><head><meta charset=utf-8></head><body><div id=react-root></div></body></html>';
const url = 'https://x.com/example_user/status/1234567890123456789';
let count = 0;
function check(name, fn) { fn(); count++; console.log('PASS ' + name); }
function run(options = {}) {
  const headers = { 'Content-Type': 'text/html', ...options.headers };
  const before = JSON.stringify(headers);
  let out, done = 0;
  vm.runInNewContext(src, {
    $request: { url, method: options.method || 'GET' },
    $response: { body: options.body === undefined ? html : options.body, headers,
                 statusCode: options.status || 200 },
    $done: value => { out = value; done++; }, console: { log() {} }
  }, { timeout: 3000 });
  assert.strictEqual(done, 1); assert.strictEqual(JSON.stringify(headers), before);
  return out;
}
check('API JSON unchanged', () => assert.deepStrictEqual(Object.keys(run({ body:'{}', headers:{'Content-Type':'application/json'} })), []));
check('POST unchanged', () => assert.ok(!run({method:'POST'}).body));
check('302 unchanged', () => assert.ok(!run({status:302}).body));
check('Empty body unchanged', () => assert.ok(!run({body:''}).body));
check('Normal HTML injected', () => assert.ok(run().body.includes('data-blink-qx="1"')));
check('Original content retained', () => assert.ok(run().body.includes('id=react-root')));
check('Exactly one closing body', () => assert.strictEqual((run().body.match(/<\/body>/g)||[]).length,1));
check('Uppercase HTML accepted', () => assert.ok(run({body:'<HTML><BODY></BODY></HTML>'}).body));
check('Incomplete HTML fallback', () => assert.ok(run({body:'<html><body>hi'}).body.endsWith('</script>')));
check('Duplicate injection prevented', () => assert.ok(!run({body:run().body}).body));
const csp = "default-src 'self';script-src 'self' 'nonce-abc+/==' 'unsafe-inline';style-src 'unsafe-inline'";
check('CSP nonce reused', () => assert.ok(run({headers:{'Content-Security-Policy':csp}}).body.includes('nonce="abc+/=="')));
check('No response headers modified', () => assert.deepStrictEqual(Object.keys(run({headers:{'Content-Security-Policy':csp}})), ['body']));
check('script-src-elem precedence', () => assert.ok(run({headers:{'Content-Security-Policy':"script-src 'nonce-A';script-src-elem 'nonce-B';style-src 'unsafe-inline'"}}).body.includes('nonce="B"')));
check('style nonce retained', () => assert.ok(run({headers:{'Content-Security-Policy':"script-src 'nonce-A';style-src 'nonce-S'"}}).body.includes('"styleNonce":"S"')));
check('Uninjectable policy kept intact', () => assert.ok(!run({headers:{'Content-Security-Policy':"script-src 'self'"}}).body));
check('Hash disables unsafe-inline', () => assert.ok(!run({headers:{'Content-Security-Policy':"script-src 'unsafe-inline' 'sha256-abc'"}}).body));
check('Conflicting CSP nonce policies skip', () => assert.ok(!run({headers:{'Content-Security-Policy':"script-src 'nonce-A', script-src 'nonce-B'"}}).body));
check('Common nonce across policies works', () => assert.ok(run({headers:{'Content-Security-Policy':"script-src 'nonce-A' 'nonce-B',script-src 'nonce-B';style-src 'unsafe-inline'"}}).body.includes('nonce="B"')));
check('Sandbox restrictions respected', () => assert.ok(!run({headers:{'Content-Security-Policy':"sandbox;script-src 'unsafe-inline'"}}).body));
check('Meta CSP honored', () => assert.ok(run({body:html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="script-src \'nonce-M\';style-src \'unsafe-inline\'">')}).body.includes('nonce="M"')));
check('Report-only headers preserved', () => assert.ok(run({headers:{'Content-Security-Policy-Report-Only':"script-src 'none'"}}).body));

const fn = src.match(/\/\*==INJECT:START==\*\/([\s\S]*?)\/\*==INJECT:END==\*\//)[1];
function ui(cfg = {}, href = url) {
  let root, host, storageWrites = 0;
  function el() { return { textContent:'', className:'', style:{}, children:[], events:{},
    appendChild(x){this.children.push(x);}, addEventListener(k,f){this.events[k]=f;}, setAttribute(){},
    classList:{add(){},remove(){}}, querySelectorAll(){return this.children;},
    set innerHTML(v){this.children=[];}, get innerHTML(){return '';} }; }
  const ids = Object.fromEntries(['fab','mask','sheet','body','url','toast','close'].map(x=>[x,el()]));
  root = {set innerHTML(v){}, getElementById:id=>ids[id], querySelector:()=>el()};
  const location = {href};
  const win = { location };
  const document = {hidden:true, createElement:() => { const e=el(); e.attachShadow=()=>root; host=e; return e; },
    body:el(),documentElement:el(),getElementById:()=>host};
  vm.runInNewContext('(' + fn + ')(CFG)', {CFG:{home:'blink://widget/home',search:'blink://widget/search',label:'Blink',...cfg},
    window:win,location,document,sessionStorage:{getItem(){return '';},setItem(){storageWrites++;}},
    setInterval(){},setTimeout(){},clearTimeout(){}},{timeout:3000});
  ids.fab.events.click({preventDefault(){},stopPropagation(){}});
  return {rows:ids.body.children,ids,location,storageWrites:()=>storageWrites};
}
check('Production UI has only two confirmed links', () => assert.strictEqual(ui().rows.length,2));
check('FAB label visible', () => assert.strictEqual(ui().ids.fab.textContent,'Blink'));
check('Diagnostic UI has 12 links', () => assert.strictEqual(ui({testCandidates:true}).rows.length,12));
check('Only exact home/search URLs highlighted', () => assert.strictEqual(ui({testCandidates:true}).rows.filter(x=>x.className.includes(' known')).length,2));
check('Configured template opens directly', () => assert.strictEqual(ui({postTemplate:'blink://widget/post?id={ID}'}).location.href,'blink://widget/post?id=1234567890123456789'));
check('No ID sends non-post pages to normal menu', () => assert.strictEqual(ui({postTemplate:'blink://widget/post?id={ID}'},'https://x.com/home').rows.length,2));
check('Unsafe template scheme ignored', () => assert.strictEqual(ui({postTemplate:'https://example.com'}).rows.length,2));
check('Production does not store URLs', () => {const u=ui();u.rows[0].events.click({preventDefault(){},stopPropagation(){}});assert.strictEqual(u.storageWrites(),0);});
check('Profile diagnostic has six links', () => assert.strictEqual(ui({testCandidates:true},'https://x.com/example_user').rows.length,6));

const lines = fs.readFileSync('blink-x.snippet.conf','utf8').split('\n').filter(x=>x.includes(' url '));
const patterns = lines.map(x=>new RegExp(x.split(' url ')[0]));
const matches = x=>patterns.some(p=>p.test(x));
check('Remote snippet has real script URLs', () => assert.ok(lines.every(x=>x.endsWith('/main/blink-x.js'))));
check('Root page matches', () => assert.ok(matches('https://x.com/')));
check('Real post and media route match', () => assert.ok(matches(url+'/photo/2')));
check('Article route matches', () => assert.ok(matches('https://x.com/i/article/1234567890123456789')));
check('Home and search routes match', () => assert.ok(matches('https://mobile.twitter.com/search?q=test')&&matches('https://x.com/home')));
check('API requests excluded', () => assert.ok(!matches('https://x.com/i/api/1.1/graphql/viewer_context.json')));
check('Other domains excluded', () => assert.ok(!matches('https://example.com/example_user/status/123')));
check('No configuration sections in remote snippet', () => assert.ok(!/^\[(?:rewrite_local|mitm)\]/m.test(fs.readFileSync('blink-x.snippet.conf','utf8'))));
check('Test script generated correctly', () => assert.strictEqual(fs.readFileSync('blink-x-test.js','utf8'), src.replace('var SHOW_TEST_CANDIDATES = false;','var SHOW_TEST_CANDIDATES = true;')));
console.log('\nALL PASS (' + count + ' checks)');
