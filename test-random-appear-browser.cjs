const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 🎲 button on a random scene's content tab opens 랜덤 등장: 한 번만, 무게 with its chance, and up to three 등장 조건.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const hub=C.event();hub.title='갈림길';hub.choices[0].next='random';const evs=['매점','복도','옥상'].map(t=>{const e=C.event();e.title=t;e.kind='encounter';e.once=true;e.choices[0].next='end';return e;});project.events=[hub,...evs];selected=evs[0].id;part='content';persist();renderEditor();});
assert.equal(await p.locator('#appearButton').innerText(),'🎲 한 번');
const bar=await p.locator('.sceneBar').evaluate(x=>x.scrollWidth<=x.clientWidth+1);assert(bar,'scene bar fits 320px');
await p.locator('#appearButton').click();assert.equal(await p.locator('#modalTitle').innerText(),'🎲 랜덤 등장');
assert.match(await p.locator('#appearChance').innerText(),/약 33%/);
await p.locator('#appearWeight').fill('10');assert.match(await p.locator('#appearChance').innerText(),/약 50%/);
await p.locator('#appearWeight').fill('0');await p.locator('#saveAppear').click();assert.match(await p.locator('#formError').innerText(),/1~10/);await p.locator('#appearWeight').fill('10');
await p.locator('#appearOnce').uncheck();await p.locator('#aWhen').selectOption('key');await p.locator('#aWhenAdd').click();await p.locator('#aWhen2').selectOption('@money');await p.locator('#aWhen2Count').fill('2');assert.equal(await p.locator('#aWhenAnyRow').isVisible(),true);await p.locator('#aWhenAny').selectOption('any');
await p.locator('#saveAppear').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
const e=await p.evaluate(()=>project.events[1]);assert.equal(e.once,false);assert.equal(e.weight,10);assert.deepEqual(e.appear,[{id:'key',count:1},{id:'@money',count:2}]);assert.equal(e.appearAny,true);
assert.equal(await p.locator('#appearButton').innerText(),'🎲 반복 ×10 *');
assert.equal(await p.evaluate(()=>{const m=document.getElementById('modalBody');return m.scrollHeight-m.clientHeight<=2;}),true);
// Back to 5 and no conditions: the fields disappear from the scene.
await p.waitForTimeout(100);await p.locator('#appearButton').click();await p.locator('#appearWeight').fill('5');await p.locator('#aWhen').selectOption('');await p.locator('#aWhen2').selectOption('');await p.locator('#saveAppear').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
const e2=await p.evaluate(()=>project.events[1]);assert.equal(e2.weight,undefined);assert.equal(e2.appear,undefined);assert.equal(e2.appearAny,undefined);
// The 🎲 pool sheet shows each scene's chance.
await p.evaluate(()=>{project.events[1].weight=2;randomPoolSheet('');});assert.deepEqual(await p.locator('.poolChance').allInnerTexts(),['17%','42%','42%']);
// Deleting an item takes it out of 등장 조건.
await p.locator('#closeModal').click();await p.evaluate(()=>{project.events[2].appear=[{id:'key',count:1}];deleteDefinition('key');});assert.equal(await p.evaluate(()=>project.events[2].appear),undefined);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 🎲 랜덤 등장 sheet: 한 번만, 무게 with chance, 등장 조건 (all/any), short scene-bar label at 320px, pool chances, item delete cleans.');
})().catch(e=>{console.error(e);process.exit(1)});
