const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 이야기 점검 → 🎲 자동 플레이: 1,000 runs with progress, ending shares, a stuck scene with its path, a scene never reached opens.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const ev=(id,title,more={})=>Object.assign(C.event(),{id,title,text:title},more);
 const start=ev('start','갈림길'),good=ev('good','해피',{ending:'end',endLabel:'진엔딩'}),hall=ev('hall','복도'),island=ev('island','외딴 방');
 start.choices=[Object.assign(C.choice(),{id:'toGood',text:'웃는다',next:'good'}),Object.assign(C.choice(),{id:'toHall',text:'복도로',next:'hall'})];hall.choices=[Object.assign(C.choice(),{id:'locked',text:'문을 연다',requires:'key',next:'end'})];island.choices[0].next='island';
 project.events=[start,good,hall,island];selected='start';persist();renderEditor();showChecks();});
await p.locator('#autoPlayButton').click();assert.equal(await p.locator('#modalTitle').innerText(),'🎲 자동 플레이');
await p.waitForFunction(()=>/평균/.test(document.getElementById('autoProgress').textContent),null,{timeout:20000});assert.match(await p.locator('#autoProgress').innerText(),/^1,000판 · 평균 /);
const pct=await p.locator('[data-auto-path="end:good"] b').innerText();assert(Math.abs(parseFloat(pct)-50)<8,pct);
assert.equal(await p.locator('.autoHead.loss').first().innerText(),'선택지가 모두 막혀 멈춘 판');
assert.equal(await p.evaluate(()=>{const m=document.getElementById('modalBody');return m.scrollHeight-m.clientHeight<=2;}),true,'pages instead of scrolling');
// Stuck path.
const findOnPages=async sel=>{for(let i=0;i<6;i++){if(await p.locator(sel).isVisible())return true;const next=p.locator('#autoReport [data-auto-page="1"]');if(!(await next.count())||await next.isDisabled())return false;await next.click();}return false;};
assert(await findOnPages('[data-auto-path="stuck:hall"]'));await p.locator('[data-auto-path="stuck:hall"]').click();assert.match(await p.locator('#modalTitle').innerText(),/예시 경로 · 복도/);
assert.deepEqual(await p.locator('#autoSteps li').allInnerTexts().then(x=>x.map(t=>t.replace(/\s+/g,' '))),['갈림길 「복도로」','복도 막힘']);
await p.locator('#autoBack').click();assert.equal(await p.locator('#modalTitle').innerText(),'🎲 자동 플레이');
// The scene never reached opens in the editor.
assert(await findOnPages('[data-auto-open="island"]'));await p.locator('[data-auto-open="island"]').click();await p.waitForFunction(()=>!document.getElementById('modal').open);assert.equal(await p.evaluate(()=>selected),'island');
// A broken project goes back to 점검 with the reason instead of playing.
await p.waitForTimeout(100);await p.evaluate(()=>{project.events[0].choices[0].next='nowhere';showChecks();});await p.locator('#autoPlayButton').click();assert.equal(await p.locator('#modalTitle').innerText(),'이야기 점검');assert.match(await p.locator('#modalBody p.loss').innerText(),/연결/);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 🎲 자동 플레이: 1,000 runs with progress, ending shares, stuck path and back, unreached scene opens, no scrolling.');
})().catch(e=>{console.error(e);process.exit(1)});
