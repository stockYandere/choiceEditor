const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 사건 찾기 also finds choice wording and ending names (and says where), and the player picks how fast lines type out.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:640},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{const a=C.event(),b=C.event(),z=C.event();a.title='골목';a.text='비가 온다.';a.choices[0].text='우산을 편다';a.choices[0].next=b.id;b.title='다리 위';b.speaker='민준';b.text='늦었네.';b.choices[0].next=z.id;z.title='마지막';z.text='끝.';z.ending='end';z.endLabel='무지개 엔딩';project.events=[a,b,z];selected=a.id;part='content';persist();renderEditor();});
const search=async q=>{await p.locator('#chooseEvent').click();await p.locator('#eventSearch').fill(q);return p.locator('#eventResults .eventResult').evaluateAll(xs=>xs.map(x=>x.innerText.replace(/\s+/g,' ').trim()));};
assert.deepEqual(await search('우산'),['1 골목 선택지에서 스토리']);
await p.locator('#eventResults .eventResult').first().click();assert.equal(await p.evaluate(()=>part),'choices','a choice match opens the 선택지 tab');
assert.deepEqual(await search('무지개'),['3 마지막 엔딩 이름에서 🏁 엔딩']);await p.locator('#closeModal').click();
assert.deepEqual(await search('민준'),['2 다리 위 말하는 사람에서 스토리']);await p.locator('#closeModal').click();
assert.deepEqual(await search('다리'),['2 다리 위 스토리'],'a name match needs no note');await p.locator('#closeModal').click();
assert.equal((await search('')).length,3);await p.locator('#closeModal').click();
// 글자 속도: 보통 by default, 바로 shows the whole line at once, 느리게 types slower than 보통.
await p.evaluate(()=>{switchPage('test');});await p.waitForFunction(()=>!!run);
const typed=async()=>{await p.evaluate(()=>{run=new C.Run(project);dialogueRun=null;renderTest();});await p.waitForTimeout(150);return p.evaluate(()=>({typing:dialogueTyping,shown:document.querySelector('#dialogue .dialogueTyping')?.textContent.length??-1}));};
await p.evaluate(()=>{project.events[0].text='가'.repeat(60);});
const normal=await typed();assert(normal.typing&&normal.shown>0);
await p.locator('#bag').click();await p.locator('[data-state-tab=settings]').click();
assert.equal(await p.locator('[data-text-speed=normal]').getAttribute('aria-pressed'),'true');
// Every block shows whole on some page (the sheet pages instead of clipping the volumes).
await p.waitForTimeout(50);const clipped=async()=>p.evaluate(()=>{const box=document.getElementById('stateItems').getBoundingClientRect();return [...document.querySelectorAll('#stateItems>section')].filter(x=>!x.hidden&&x.getBoundingClientRect().bottom>box.bottom+1).length;});const seen=new Set();for(let i=0;i<5;i++){assert.equal(await clipped(),0);if(await p.locator('#playerSpeedSettings').isVisible()){const row=await p.locator('#playerSpeedSettings .textSpeedRow').boundingBox(),sheet=await p.locator('#stateSheet').boundingBox();assert(row.x>=sheet.x&&row.x+row.width<=sheet.x+sheet.width+1,'four buttons fit the sheet');}for(const x of await p.locator('#stateItems>section:not([hidden]) [data-player-volume]').evaluateAll(xs=>xs.map(x=>x.dataset.playerVolume)))seen.add(x);const next=p.locator('[data-auto-page="1"]');if(!(await next.count())||await next.isDisabled())break;await next.click();}
assert.deepEqual([...seen].sort(),['bgmVolume','effectsVolume','voiceVolume']);if(await p.locator('[data-auto-page="-1"]').count())while(!(await p.locator('[data-auto-page="-1"]').isDisabled()))await p.locator('[data-auto-page="-1"]').click();
await p.locator('[data-auto-page="1"]').click();await p.locator('[data-text-speed=instant]').click();assert.equal(await p.evaluate(()=>store.preferences.textSpeed),'instant');assert.equal(await p.locator('[data-text-speed=instant]').getAttribute('aria-pressed'),'true');
await p.locator('#closeState').click();
const instant=await typed();assert.equal(instant.typing,false);assert.equal(await p.locator('#dialogue').innerText(),'가'.repeat(60));
await p.evaluate(()=>{store.preferences.textSpeed='slow';});const slow=await typed();assert(slow.typing&&slow.shown<normal.shown,`slow ${slow.shown} < normal ${normal.shown}`);
await p.evaluate(()=>{store.preferences.textSpeed='fast';});const fast=await typed();assert(fast.shown>normal.shown,`fast ${fast.shown} > normal ${normal.shown}`);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS search finds choice wording/ending names/speakers and says where (choice → 선택지 tab); 글자 속도 느리게·보통·빠르게·바로 saved and applied.');
})().catch(e=>{console.error(e);process.exit(1)});
