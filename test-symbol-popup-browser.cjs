const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 기호 button: variation symbols in two taps, inserted at the caret (with their braces when outside one), keyboard focus kept.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:360,height:740},{width:320,height:568}]){
const p=await browser.newPage({viewport,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();await p.evaluate(()=>{switchPage('story');part='content';renderEditor();});
assert.equal(await p.evaluate(()=>new Set([...document.querySelectorAll('.varTools>button:not([hidden])')].map(x=>Math.round(x.getBoundingClientRect().top))).size),1,'buttons stay on one row');
const state=()=>p.evaluate(()=>{const t=document.getElementById('copy');return {v:t.value,at:t.selectionStart,focus:document.activeElement===t,open:!document.getElementById('symbolPop').hidden};});
const put=(v,a,b=a)=>p.evaluate(([v,a,b])=>{const t=document.getElementById('copy');t.focus();t.value=v;t.setSelectionRange(a,b);t.dispatchEvent(new Event('input',{bubbles:true}));},[v,a,b]);
const symbol=async s=>{await p.locator('#varSymbols').click();assert((await state()).open,'popup opens');
 // every symbol is on screen and tappable (nothing covers it)
 assert(await p.evaluate(()=>[...document.querySelectorAll('#symbolPop button')].every(b=>{const r=b.getBoundingClientRect(),x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&b.contains(x);})),'symbols visible and not covered');
 await p.locator('#symbolPop button',{has:p.locator('b',{hasText:new RegExp('^'+s.replace(/[|?\\{}()*+.^$[\]]/g,'\\$&')+'$')})}).click();const st=await state();assert(!st.open,'popup closes');assert(st.focus,'dialogue keeps focus');return st;};
// Outside braces a symbol comes with its braces.
await put('비가 온다.',6);let s=await symbol('~');assert.deepEqual([s.v,s.at],['비가 온다.{~|}',8]);
await put('지갑에 원',4);s=await symbol('=');assert.deepEqual([s.v,s.at],['지갑에 {=}원',6]);
await put('',0);s=await symbol('@');assert.deepEqual([s.v,s.at],['{@? |}',2]);
await put('',0);s=await symbol('!');assert.deepEqual([s.v,s.at],['{!? |}',2]);
// Inside braces: as typed; & means 돌아가며 right after { and 모두 만족 elsewhere.
await put('{|}',1);s=await symbol('&');assert.deepEqual([s.v,s.at],['{&|}',2]);
await put('{용기? 간다}',3);s=await symbol('&');assert.deepEqual([s.v,s.at],['{용기 & ? 간다}',6]);
await put('{돈? 간다}',2);s=await symbol('>=');assert.deepEqual([s.v,s.at],['{돈>=? 간다}',4]);
await put('{용기 간다}',3);s=await symbol('?');assert.equal(s.v,'{용기? 간다}');
await put('{A}',2);s=await symbol('|');assert.deepEqual([s.v,s.at],['{A|}',3]);
// { } wraps a selection or opens an empty pair.
await put('문을 연다',0,2);s=await symbol('{ }');assert.equal(s.v,'{문을} 연다');
await put('',0);s=await symbol('{ }');assert.deepEqual([s.v,s.at],['{|}',1]);
await put('',0);s=await symbol('\\');assert.equal(s.v,'\\');
// The scene keeps what was typed.
assert.equal(await p.evaluate(()=>current().text),'\\');
// Back and a tap elsewhere close it without inserting.
await p.locator('#varSymbols').click();assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert(!(await state()).open);
await p.locator('#varSymbols').click();await p.locator('#varCondition').click();assert(!(await state()).open);
assert.deepEqual(errors,[]);await p.close();}
await browser.close();console.log('PASS 기호 popup: two taps insert variation symbols (with braces outside one), focus kept, fits at 360/320 px, Back and outside tap close it.');
})().catch(e=>{console.error(e);process.exit(1)});
