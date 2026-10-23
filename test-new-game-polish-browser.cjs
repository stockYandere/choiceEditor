const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// First minutes with a new game: no warning about random start abilities before any ability exists, the header names the
// game being edited, and the scene/picture/sound buttons say what they do.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
const header=()=>p.locator('#editorBrand strong').textContent();
assert.equal(await header(),'새 이야기');
assert(!(await p.evaluate(()=>C.inspect(project).some(x=>/2종보다/.test(x.message)))),'no random-start warning without abilities');
await p.evaluate(()=>switchPage('inventory'));assert.equal(await p.locator('#startWarning').isVisible(),false);
// One ability with 무작위 2개: now the warning makes sense.
await p.evaluate(()=>{const d=C.definition?C.definition():{id:'a1',name:'용기',type:'ability',initial:0,effects:[]};d.name='용기';d.type='ability';project.definitions.push(d);persist();switchPage('inventory');});
assert.equal(await p.locator('#startWarning').isVisible(),true);assert(await p.evaluate(()=>C.inspect(project).some(x=>/2종보다/.test(x.message))));
// Renaming the game updates the header after the save.
await p.evaluate(()=>{project.title='비 오는 날';persist();switchPage('story');});await p.waitForFunction(()=>document.querySelector('#editorBrand strong').textContent==='비 오는 날');
// Clearer labels.
await p.evaluate(()=>{part='content';renderEditor();});assert.equal(await p.locator('#eventTools').textContent(),'관리');
await p.evaluate(()=>{part='art';renderEditor();});assert.equal(await p.locator('#artDefaults').textContent(),'기본 그림 설정');assert.equal(await p.locator('[data-default=top]').textContent(),'기본으로');
await p.evaluate(()=>{part='sound';renderEditor();});assert.equal(await p.locator('[data-sound-panel=bgm]').textContent(),'사건 BGM');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS new game: no early random-start warning, header shows the game title (and follows renames), clearer 관리 · 기본 그림 설정 · 기본으로 · 사건 BGM labels.');
})().catch(e=>{console.error(e);process.exit(1)});
