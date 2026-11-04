const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 구조도 shows the newer settings without opening scenes: 🎲 chance in its 묶음 (* = 등장 조건) and ⏱ seconds on scene
// boxes, 🔒 (conditions) and ♥ (호감도) beside choice circles. Checked on 축제 전날 밤 and after editing a weight.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.evaluate(async()=>{await openGame(store.games.find(g=>g.draft.title==='축제 전날 밤').id);openStoryMap('picker');});await p.waitForTimeout(400);
const meta=id=>p.locator(`[data-map-event="${id}"] .mapMeta`).textContent(),choice=id=>p.evaluate(id=>document.querySelector(`[data-map-choice="${id}"] .mapChoiceMeta`)?.textContent||'',id);
// 밤 순찰: guard 5, sound 3, locked 8*, window 1, cat 1, mirror 3* → 5/21 ≈ 24%, 1/21 ≈ 5%.
const chance=await p.evaluate(()=>{const p=project,pool=p.events.filter(e=>e.kind==='encounter'&&e.randomGroup==='gnight'),t=pool.reduce((n,e)=>n+GameCore.weightOf(e),0);return Object.fromEntries(pool.map(e=>[e.id,Math.round(GameCore.weightOf(e)/t*100)+'%'+(e.appear?.length?'*':'')]));});
for(const [id,want]of Object.entries(chance))assert.equal(await meta(id),want,id);
assert.equal(await meta('s3'),'⏱6');assert.equal(await meta('s5'),'⏱5');assert.equal(await p.locator('[data-map-event="s1"] .mapMeta').count(),0,'a plain story scene has no mark');
assert.equal(await choice('s3-hide'),'🔒♥','condition on 서연 → both');assert.equal(await choice('s1-mj'),'♥','moves 호감도 only');assert.equal(await choice('s4-light'),'🔒','item condition only');assert.equal(await choice('s1-alone'),'','nothing special');
assert.equal(await choice('s6-down'),'♥','다른 결과 reads the hidden 의심');
// Editing a weight shows up when the map is drawn again.
await p.evaluate(()=>{project.events.find(e=>e.id==='r-cat').weight=10;persist();StoryMap.render();});
const after=await p.evaluate(()=>{const pool=project.events.filter(e=>e.kind==='encounter'&&e.randomGroup==='gnight'),t=pool.reduce((n,e)=>n+GameCore.weightOf(e),0);return Math.round(10/t*100)+'%';});assert.equal(await meta('r-cat'),after);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 구조도 marks: 🎲 % (* 등장 조건) and ⏱ on scenes, 🔒/♥ on choices (다른 결과 too), follow edits.');
})().catch(e=>{console.error(e);process.exit(1)});
