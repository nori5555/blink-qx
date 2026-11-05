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
const parserSource=src.match(/\/\*==BLINK_ROUTE_START==\*\/([\s\S]*?)\/\*==BLINK_ROUTE_END==\*\//)[1];
const guardSource=src.match(/\/\*==BLINK_GUARD_START==\*\/([\s\S]*?)\/\*==BLINK_GUARD_END==\*\//)[1];
const parser=vm.runInNewContext('(function(){'+parserSource+';return parseBlinkTarget;})()', {URL,TextEncoder});
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
test('No inline event attributes or popup windows',()=>assert.ok(!/onclick=|window\.open/.test(fn)));
test('Real anchors are used',()=>assert.ok(fn.includes("document.createElement('a')")&&fn.includes('anchor.href=target.deepLink')));

const snippet=fs.readFileSync(path.join(__dirname,'blink-x-local.snippet.conf'),'utf8');
test('Local rewrite refers to filename',()=>assert.ok(/script-response-body blink-x\.js/.test(snippet)&&!snippet.includes('raw.githubusercontent.com')));
const remote=fs.readFileSync(path.join(__dirname,'blink-x.snippet.conf'),'utf8');
const rule=remote.split('\n').find(s=>s.includes(' url script-response-body '));
const pattern=new RegExp(rule.split(' url ')[0]);
function page(options={}) {
 const elements=[],events={},microtasks=[],attempts=[],stored=new Map(),clickEvents=[];
 let pageBubbleCount=0;
 if(options.dismissed)stored.set('blink.qx.dismissed.v2','1');
 let onMutation=()=>{};
 function element(tag){
  const e={tagName:tag.toUpperCase(),children:[],dataset:{},events:{},hidden:false,isConnected:false,
   setAttribute(k,v){this[k]=v;},appendChild(child){this.children.push(child);child.isConnected=this.isConnected;},
   addEventListener(k,handler){this.events[k]=handler;},
   click(){
    const event={isTrusted:false,defaultPrevented:false,propagationStopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.propagationStopped=true;}};
    if(this.events.click)this.events.click(event);
    clickEvents.push(event);
    if(!event.propagationStopped)pageBubbleCount++;
    if(this.tagName==='A'&&!event.defaultPrevented){
     attempts.push(this.href);
     if(options.reentrant&&events.pageshow)events.pageshow();
     if(options.reject)throw new Error('Browser blocked scripted anchor');
    }
   },
   attachShadow(){const s=element('shadow');this.shadow=s;return s;}};
  elements.push(e);return e;
 }
 const document={hidden:!!options.hidden,activeElement:null,createElement:element,
  addEventListener(k,f){events[k]=f;}};
 document.documentElement=element('html');document.documentElement.isConnected=true;
 const location={href:options.url||valid[0][0],assign(){throw new Error('Unexpected location.assign');}};
 const window={location};window.top=window;
 const context={CFG:{label:'在 Blink 中打开',styleNonce:'',autoOpen:options.autoOpen!==false},
  window,location,document,URL,TextEncoder,Object,
  sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
  MutationObserver:class{constructor(fn){onMutation=fn;}observe(){}},
  queueMicrotask:f=>microtasks.push(f),addEventListener:(k,f)=>{events[k]=f;}};
 vm.runInNewContext('('+fn+')(CFG,parse)',{...context,parse:parser},{timeout:3000});
 return {document,location,attempts,stored,elements,window,clickEvents,
  get pageBubbleCount(){return pageBubbleCount;},
  get host(){return elements.find(e=>e.id==='blink-qx-open-in-app');},
  get anchor(){return elements.find(e=>e.tagName==='A');},
  emit:name=>{if(events[name])events[name]();},
  mutate(){onMutation();while(microtasks.length)microtasks.shift()();},
  manualClick(){const event={isTrusted:true,defaultPrevented:false,propagationStopped:false,stopPropagation(){this.propagationStopped=true;},preventDefault(){this.defaultPrevented=true;}};this.anchor.events.click(event);return event;},
  close(){elements.find(e=>e.tagName==='BUTTON').click();}};
}
test('Response enables automatic mode',()=>assert.ok(run().body.includes('"autoOpen":true')));
test('First supported page tries correct deep link once',()=>{const p=page();assert.deepStrictEqual(p.attempts,[valid[0][1]]);assert.strictEqual(p.anchor.href,valid[0][1]);assert.strictEqual(p.host.hidden,false);});
test('Rejected auto launch retains manual anchor',()=>{const p=page({reject:true});assert.strictEqual(p.attempts.length,1);assert.strictEqual(p.anchor.href,valid[0][1]);assert.strictEqual(p.host.hidden,false);});
test('Cancellation, pageshow, focus and mutations never retry',()=>{const p=page({reject:true});for(let i=0;i<3;i++){p.emit('pageshow');p.emit('focusin');p.emit('visibilitychange');p.mutate();}assert.strictEqual(p.attempts.length,1);});
test('Returning from Blink does not open it again',()=>{const p=page();p.document.hidden=true;p.emit('visibilitychange');p.document.hidden=false;p.emit('pageshow');p.emit('visibilitychange');assert.strictEqual(p.attempts.length,1);});
test('Hidden tab waits until visible',()=>{const p=page({hidden:true});assert.strictEqual(p.attempts.length,0);p.document.hidden=false;p.emit('visibilitychange');assert.deepStrictEqual(p.attempts,[valid[0][1]]);});
test('SPA opens a new destination once and suppresses back loops',()=>{const p=page();p.location.href='https://x.com/i/article/456';p.mutate();assert.deepStrictEqual(p.attempts,[valid[0][1],'blink://open/article/456']);p.location.href=valid[0][0];p.emit('popstate');assert.strictEqual(p.attempts.length,2);});
test('Query and hash changes do not duplicate a launch',()=>{const p=page();p.location.href+='?s=20#detail';p.mutate();assert.strictEqual(p.attempts.length,1);});
test('Home does not launch until SPA reaches supported content',()=>{const p=page({url:'https://x.com/home'});assert.strictEqual(p.attempts.length,0);p.location.href='https://x.com/example_user';p.mutate();assert.deepStrictEqual(p.attempts,['blink://open/profile/example_user']);});
test('Manual mode never automatically opens',()=>{const p=page({autoOpen:false});p.emit('pageshow');p.mutate();assert.strictEqual(p.attempts.length,0);assert.strictEqual(p.anchor.href,valid[0][1]);});
test('Closing the fallback suppresses subsequent automatic prompts',()=>{const p=page();p.close();p.location.href='https://x.com/i/article/789';p.emit('popstate');assert.strictEqual(p.attempts.length,1);assert.strictEqual(p.host.hidden,true);});
test('Manual click keeps ordinary anchor navigation and hides on return',()=>{const p=page({reject:true});p.manualClick();assert.strictEqual(p.anchor.href,valid[0][1]);p.emit('pageshow');assert.strictEqual(p.attempts.length,1);assert.strictEqual(p.host.hidden,true);});
test('Foreground editing defers automatic launch',()=>{const p=page({hidden:true});p.document.hidden=false;p.document.activeElement={tagName:'INPUT'};p.emit('focusin');assert.strictEqual(p.attempts.length,0);p.document.activeElement=null;p.emit('focusout');p.mutate();assert.strictEqual(p.attempts.length,1);});
test('Auto attempt state is set before reentrant events',()=>assert.strictEqual(page({reentrant:true}).attempts.length,1));
test('No URLs saved by automatic attempts',()=>assert.strictEqual(page().stored.size,0));
test('Explicit dismissal is respected after reload',()=>assert.strictEqual(page({dismissed:true}).attempts.length,0));
test('Fresh reload permits a new test after a blocked attempt',()=>{assert.strictEqual(page({reject:true}).attempts.length,1);assert.strictEqual(page({reject:true}).attempts.length,1);});
test('Automatic attempt uses the manual anchor instead of location navigation',()=>assert.ok(fn.includes('anchor.click()')&&!/window\.location|location\.assign/.test(fn)));
test('Synthetic auto click does not persist manual dismissal',()=>{const p=page({reject:true});assert.strictEqual(p.stored.size,0);p.emit('pageshow');assert.strictEqual(p.host.hidden,false);});
test('Synthetic auto flag resets before the next real click',()=>{const p=page({reject:true});p.manualClick();assert.strictEqual(p.stored.get('blink.qx.dismissed.v2'),'1');});
test('Auto click is isolated from page bubble handlers',()=>{const p=page();assert.strictEqual(p.pageBubbleCount,0);assert.strictEqual(p.clickEvents[0].defaultPrevented,false);assert.strictEqual(p.attempts.length,1);});
test('Manual click keeps default navigation but stops page propagation',()=>{const event=page().manualClick();assert.strictEqual(event.defaultPrevented,false);assert.strictEqual(event.propagationStopped,true);});
test('Close button is isolated from the page',()=>{const p=page();p.close();assert.strictEqual(p.pageBubbleCount,0);assert.strictEqual(p.host.hidden,true);});
test('Repeated installation never starts a second launch',()=>{const p=page();vm.runInNewContext('('+fn+')(CFG,parse)',{window:p.window,CFG:{autoOpen:true},parse:parser});assert.strictEqual(p.attempts.length,1);});
test('Public script pinned to v2.1.2',()=>assert.ok(rule.endsWith('/v2.1.2/blink-x.js')));
test('No main config sections in remote resource',()=>assert.ok(!/^\[(?:rewrite_local|mitm)\]/m.test(remote)));
test('Public rewrite includes HTTPS X routes',()=>assert.ok(pattern.test('https://x.com/example_user/status/1234567890123456789')));
test('API endpoints do not match',()=>assert.ok(!pattern.test('https://x.com/i/api/graphql/anything')));
test('Unrelated domains do not match',()=>assert.ok(!pattern.test('https://example.org/example_user/status/123')));
test('HTTP is excluded',()=>assert.ok(!pattern.test('http://x.com/example_user')));
test('Legacy test resource uses corrected routes',()=>assert.strictEqual(fs.readFileSync(path.join(__dirname,'blink-x-test.js'),'utf8'),src));
test('No browser-world networking or cookies',()=>assert.ok(!/\bfetch\s*\(|XMLHttpRequest|document\.cookie|\$task\.fetch/.test(src)));
function guarded(url,options={}) {
 const changes=[];const state={retained:true};const location={href:url};
 const window={};window.top=options.iframe?{}:window;
 const history={state,replaceState(value,title,next){if(options.reject)throw new Error('Restricted');changes.push({state:value,url:next});location.href=next;}};
 vm.runInNewContext('('+guardSource+')(parse)',{window,location,history,URL,parse:parser});
 return {location,changes,state};
}
test('Early guard marks supported page without navigating',()=>{const p=guarded(valid[0][0]);assert.strictEqual(new URL(p.location.href).searchParams.get('ct'),'blink-qx');assert.strictEqual(p.changes.length,1);assert.strictEqual(p.changes[0].state,p.state);});
test('Guard preserves existing attribution and login redirect',()=>{for(const suffix of ['?ct=external-source','?ct=rw-null','?redirect_after_login=%2Fhome'])assert.strictEqual(guarded(valid[0][0]+suffix).changes.length,0);});
test('Guard preserves query values and fragment',()=>{const before=new URL(valid[0][0]+'?q=a%2Bb&x=2#photo');const after=new URL(guarded(before.href).location.href);assert.strictEqual(after.searchParams.get('q'),before.searchParams.get('q'));assert.strictEqual(after.searchParams.get('x'),'2');assert.strictEqual(after.hash,'#photo');});
test('Guard is idempotent',()=>{const p=guarded(valid[0][0]);assert.strictEqual(guarded(p.location.href).changes.length,0);});
test('Guard never touches login, search, home or API pages',()=>{for(const p of ['/login','/search?q=x','/home','/i/api/graphql/test'])assert.strictEqual(guarded('https://x.com'+p).changes.length,0);});
test('Guard leaves unrelated hosts, HTTP and iframes unchanged',()=>{assert.strictEqual(guarded('https://example.org/user/status/123').changes.length,0);assert.strictEqual(guarded('http://x.com/user/status/123').changes.length,0);assert.strictEqual(guarded(valid[0][0],{iframe:true}).changes.length,0);});
test('Restricted history access never breaks page code',()=>assert.strictEqual(guarded(valid[0][0],{reject:true}).changes.length,0));
test('Attribution marker leaves Blink destination identical',()=>assert.strictEqual(parser(guarded(valid[0][0]).location.href).deepLink,valid[0][1]));
test('Guard precedes X module while UI still goes before closing body',()=>{const html='<html><head><script id="x-entry" type="module">original()</script></head><body>original</body></html>';const out=run({body:html}).body;assert.ok(out.indexOf('data-blink-qx-guard="1"')<out.indexOf('id="x-entry"'));assert.ok(out.indexOf('data-blink-qx="1"')>out.indexOf('</head>'));assert.strictEqual((out.match(/data-blink-qx-guard="1"/g)||[]).length,1);});
test('Guard and UI use the same allowed CSP nonce',()=>{const out=run({headers:{'content-security-policy':csp}}).body;assert.ok(out.includes('data-blink-qx-guard="1" nonce="A"'));assert.ok(out.includes('data-blink-qx="1" nonce="A"'));});
test('Guard can be disabled while the Blink UI remains enabled',()=>{let out;vm.runInNewContext(src.replace('var GUARD_X_SAFARI_REDIRECT = true;','var GUARD_X_SAFARI_REDIRECT = false;'),{$request:{method:'GET'},$response:{body,headers:{'content-type':'text/html'},statusCode:200},$done:v=>{out=v.body;},console});assert.ok(!out.includes('data-blink-qx-guard="1"'));assert.ok(out.includes('data-blink-qx="1"'));});
console.log('ALL PASS ('+count+' checks). QX device verification is separate.');
