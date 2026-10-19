const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// The Android back button goes to the screen before: tabs, scenes, 사건 찾기 → 구조도, a scene opened from the map, the game list, home.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
const back=async()=>{const r=await p.evaluate(()=>appBack());await p.waitForTimeout(150);return r;};
const where=()=>p.evaluate(()=>({page,part,selected,map:StoryMap.isOpen(),modal:document.getElementById('modal').open}));
await p.locator('#openEditor').click();assert.equal((await where()).page,'gameList');
await p.locator('[data-edit-game]').first().click();const first=await where();assert.equal(first.page,'story');
// Tab → back → the tab before.
await p.locator('[data-part=choices]').click();assert.equal((await where()).part,'choices');
assert.equal(await back(),'HANDLED');assert.equal((await where()).part,'content');
// Scene picked in 사건 찾기 → back → the scene before.
const second=await p.evaluate(()=>project.events[1].id);await p.locator('#chooseEvent').click();await p.locator(`[data-jump-event="${second}"]`).click();assert.equal((await where()).selected,second);
assert.equal(await back(),'HANDLED');assert.equal((await where()).selected,first.selected);
// 사건 찾기 → 구조도 → back → 사건 찾기 again; back again closes it.
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();assert.equal((await where()).map,true);
assert.equal(await back(),'HANDLED');let w=await where();assert.equal(w.map,false);assert.equal(w.modal,true);assert.equal(await p.locator('#eventSearch').count(),1);
assert.equal(await back(),'HANDLED');w=await where();assert.equal(w.modal,false);assert.equal(w.selected,first.selected);
// A scene opened from the map → back → the map → back → the editor.
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();
await p.evaluate(id=>{const r=document.querySelector(`[data-map-event="${id}"]`).getBoundingClientRect(),c=document.getElementById('mapCanvas'),f=(t)=>c.dispatchEvent(new PointerEvent(t,{pointerId:1,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));f('pointerdown');f('pointerup');},second);
w=await where();assert.equal(w.map,false);assert.equal(w.selected,second);
assert.equal(await back(),'HANDLED');assert.equal((await where()).map,true);
assert.equal(await back(),'HANDLED');w=await where();assert.equal(w.map,false);assert.equal(w.page,'story');
// 닫기 on the map does not leave the map behind in the history.
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();await p.locator('#mapClose').click();assert.equal((await where()).map,false);
assert.equal(await back(),'HANDLED');assert.notEqual((await where()).map,true);
// Keep going back: the game list, then home, then the app's own exit prompt.
for(let i=0;i<8&&(await where()).page!=='gameList';i++)await back();assert.equal((await where()).page,'gameList');
assert.equal(await back(),'HANDLED');assert.equal((await where()).page,'home');
assert.equal(await back(),'EXIT');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS back: previous tab, previous scene, 구조도 → 사건 찾기, map scene → map → editor, 닫기 leaves no map entry, editor → game list → home → exit.');
})().catch(e=>{console.error(e);process.exit(1)});
