const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 축제 전날 밤 예제 in the app: installed once, 이야기 점검 clean and 🎲 자동 플레이 sees the 진엔딩, play shows 호감도
// (hidden 의심 stays out), the timed gate runs out into 경비실 앞, the 진엔딩 lands in 엔딩 모음 and the next play reads it,
// and 예제로 새 게임 offers it.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
const title='축제 전날 밤';
assert.equal(await p.evaluate(t=>store.games.filter(g=>g.draft.title===t&&g.builtinExample==='festival-night-v1').length,title),1,'installed once');
await p.reload();await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);assert.equal(await p.evaluate(t=>store.games.filter(g=>g.draft.title===t).length,title),1,'not again after a restart');
const id=await p.evaluate(t=>store.games.find(g=>g.draft.title===t).id,title);
// Editor: 점검 clean, 자동 플레이 lists the 진엔딩.
await p.evaluate(async gid=>{await openGame(gid);showChecks();},id);assert.match(await p.locator('#modalBody').innerText(),/발견된 연결·입력 문제가 없습니다/);
await p.locator('#autoPlayButton').click();await p.waitForFunction(()=>/평균/.test(document.getElementById('autoProgress').textContent),null,{timeout:30000});
assert(await p.evaluate(()=>[...document.querySelectorAll('#autoReport .autoRow span')].some(x=>x.textContent.includes('셋이 함께 본 등불'))));await p.locator('#closeModal').click();
// Play: 호감도 notice and the bag's 호감 tab (two people; 의심 is hidden).
await p.evaluate(()=>showList('player'));await p.waitForFunction(()=>page==='gameList');const card=p.locator('.gameCard').filter({hasText:title});
assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 0/9');
await card.locator('[data-play-game]').click();await p.waitForFunction(()=>playing);await p.evaluate(()=>{Math.random=()=>0;finishDialogue(true);});
await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();
await p.waitForFunction(()=>!document.getElementById('statusMessage').hidden);assert.match(await p.locator('#statusText').innerText(),/민준 ♥ \+1 · 서연 ♥ -1/);
await p.locator('#bag').click();await p.locator('#affinityTab').click();assert.deepEqual(await p.locator('.affinityItem b').allInnerTexts(),['민준','서연']);await p.locator('#closeState').click();
// ⏱ 닫히는 교문: time runs out → 경비실 앞.
await p.evaluate(()=>{run.current='s3';run.turn++;run.storyIndex=run.p.events.findIndex(e=>e.id==='s3');renderTest();finishDialogue(true);});
await p.waitForFunction(()=>!!document.getElementById('choiceTimer'));assert.equal(await p.locator('#timerPause').count(),0,'no pause button in real play');
await p.evaluate(()=>{choiceTimer.left=100;});await p.waitForFunction(()=>run.current==='caught',null,{timeout:4000});
// 진엔딩 from the rooftop when both are close and the lantern is fixed.
await p.evaluate(()=>{run.current='s6';run.turn++;run.storyIndex=run.p.events.findIndex(e=>e.id==='s6');Object.assign(run.bag,{mj:2,sy:2,fixed:1});renderTest();finishDialogue(true);});
await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();await p.waitForFunction(()=>run.ended);
assert.equal(await p.evaluate(()=>run.endNote),'셋이 함께 본 등불');
await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 1/9');
// 2회차.
await p.evaluate(gid=>playGame(gid,true),id);await p.waitForFunction(()=>playing&&run.turn===0);await p.evaluate(()=>finishDialogue(true));assert.match(await p.locator('#dialogue').innerText(),/본 적 있는 오후/);
await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');
// 예제로 새 게임 → 축제 전날 밤.
await p.evaluate(async gid=>{await openGame(gid);},id);await p.locator('#files').click();const tabs=p.locator('#modal[open] [data-form-tab]');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();if(await p.locator('#loadSample').isVisible())break;}
const before=await p.evaluate(()=>store.games.length);await p.locator('#loadSample').click();assert.deepEqual(await p.locator('[data-sample] b').allInnerTexts(),['축제 전날 밤','기능 둘러보기 · 비 오는 학교']);
await p.locator('[data-sample=FESTIVAL_SAMPLE]').click();await p.waitForFunction(n=>store.games.length===n+1,before);assert.equal(await p.evaluate(()=>project.title),title);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 축제 전날 밤 in the app: installed once, 점검 clean, 자동 플레이 sees the 진엔딩, 호감도 notice + 호감 tab (의심 hidden), timed gate runs out, 진엔딩 recorded (1/9), 2회차 line, 예제로 새 게임 chooser.');
})().catch(e=>{console.error(e);process.exit(1)});
