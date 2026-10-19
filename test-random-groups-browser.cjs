const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 🎲 묶음: random encounters split by chapter — a scene joins a 묶음, a choice rolls one 묶음 only, the map shows one 🎲 per 묶음.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{const ev=['1장','숲 만남','도시 만남','2장'].map(t=>{const e=C.event();e.title=t;return e;});ev[1].kind='encounter';ev[2].kind='encounter';ev[0].choices[0].next='random';project.events=ev;selected=ev[1].id;part='content';persist();renderEditor();});
// 진행 방식 → ＋ 새 랜덤 묶음… names a 묶음 and puts this scene in it.
await p.locator('#eventKind').selectOption('newGroup');await p.locator('#groupName').fill('1챕터');await p.locator('#groupCreate').click();
const gid=await p.evaluate(()=>project.randomGroups[0].id);assert.equal(await p.evaluate(()=>project.randomGroups[0].name),'1챕터');assert.equal(await p.evaluate(()=>current().randomGroup),gid);assert.equal(await p.locator('#eventKind').inputValue(),'encounter:'+gid);
// A choice's 다음 can roll that 묶음 only.
await p.evaluate(()=>{selected=project.events[0].id;part='choices';renderEditor();});await p.locator('[data-choice]').first().click();await p.locator('#modal [data-form-tab]',{hasText:'다음'}).click();
assert.match(await p.locator(`#cNext option[value="random:${gid}"]`).innerText(),/🎲 랜덤 · 1챕터/);await p.locator('#cNext').selectOption('random:'+gid);await p.locator('#saveChoice').click();
assert.equal(await p.evaluate(()=>project.events[0].choices[0].next),'random:'+gid);
const rolls=await p.evaluate(()=>{const out=new Set();for(let i=0;i<40;i++){const r=new C.Run(clone(project));r.choose(project.events[0].choices[0].id);out.add(project.events.find(e=>e.id===r.current).title);}return [...out];});assert.deepEqual(rolls,['숲 만남']);
await p.evaluate(()=>C.validate(clone(project)));assert.equal(await p.evaluate(()=>C.inspect(project).filter(i=>i.level==='error').length),0);
// Map: one 🎲 per 묶음 (기본 has 도시 만남; 1챕터 has 숲 만남 and the roll).
await p.evaluate(()=>{project.events[3].choices[0].next='random';persist();});
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();assert.equal(await p.locator('[data-map-hub]').count(),2);
assert.match(await p.locator(`[data-map-hub="${gid}"]`).textContent(),/1챕터 1개/);assert.match(await p.locator('[data-map-hub=""]').textContent(),/기본 1개/);
// Its list: tick 도시 만남 (moves it here from 기본), rename, then delete the 묶음 — scenes and rolls go back to 기본.
await p.evaluate(g=>{const r=document.querySelector(`[data-map-hub="${g}"] circle`).getBoundingClientRect(),c=document.getElementById('mapCanvas'),f=t=>c.dispatchEvent(new PointerEvent(t,{pointerId:1,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));f('pointerdown');f('pointerup');},gid);
assert.match(await p.locator('#modal').innerText(),/🎲 1챕터/);assert.match(await p.locator('.poolOther').first().innerText(),/기본/);
await p.locator(`[data-pool="${await p.evaluate(()=>project.events[2].id)}"]`).check();assert.equal(await p.evaluate(()=>project.events[2].randomGroup),gid);
await p.locator('#groupRename').click();await p.locator('#groupName').fill('숲 챕터');await p.locator('#groupSave').click();assert.equal(await p.evaluate(()=>project.randomGroups[0].name),'숲 챕터');assert.match(await p.locator('#modal').innerText(),/🎲 숲 챕터/);
await p.locator('#groupDelete').click();assert.equal(await p.evaluate(()=>project.randomGroups),undefined);assert.equal(await p.evaluate(()=>project.events.filter(e=>e.randomGroup).length),0);assert.equal(await p.evaluate(()=>project.events[0].choices[0].next),'random');
assert.equal(await p.locator('[data-map-hub]').count(),1);await p.evaluate(()=>C.validate(clone(project)));
// ＋ 새 🎲 묶음 from the list makes an empty 묶음 that shows on the map at once.
await p.evaluate(()=>{const r=document.querySelector('[data-map-hub] circle').getBoundingClientRect(),c=document.getElementById('mapCanvas'),f=t=>c.dispatchEvent(new PointerEvent(t,{pointerId:1,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));f('pointerdown');f('pointerup');});
await p.locator('#groupNew').click();await p.locator('#groupName').fill('2챕터');await p.locator('#groupCreate').click();assert.match(await p.locator('#modal').innerText(),/🎲 2챕터/);assert.equal(await p.locator('[data-map-hub]').count(),2);
assert.match(await p.locator('[data-map-hub]').nth(1).textContent(),/비어 있음/);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 🎲 묶음: new 묶음 from 진행 방식, choice rolls only its 묶음, one 🎲 per 묶음 on the map, list moves scenes between 묶음, rename, delete returns scenes and rolls to 기본, new empty 묶음 appears.');
})().catch(e=>{console.error(e);process.exit(1)});
