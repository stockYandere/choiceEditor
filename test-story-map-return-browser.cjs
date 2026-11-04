const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 구조도 comes back where it was left: open a scene from it and press back, or reopen it from 사건 찾기 — same pan and
// zoom. Another game starts on the whole map, and 전체 still fits everything.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
const game=t=>p.evaluate(t=>store.games.find(g=>g.draft.title===t).id,t);
await p.locator('#openEditor').click();await p.locator('.gameCard').filter({hasText:'일곱 번째 괴담'}).locator('[data-edit-game]').click();await p.waitForFunction(()=>page==='story');
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();await p.waitForFunction(()=>StoryMap.isOpen());await p.waitForTimeout(200);
const whole=await p.evaluate(()=>StoryMap._view());
// Move down the map with a drag on empty space, then zoom in a little.
const svg=await p.locator('#storyMap svg, .storyMap svg').first().boundingBox().catch(()=>null)||{x:0,y:0,width:360,height:740};
await p.mouse.move(svg.x+svg.width-12,svg.y+svg.height*.6);await p.mouse.down();await p.mouse.move(svg.x+svg.width-12,svg.y+svg.height*.15,{steps:8});await p.mouse.up();
await p.evaluate(()=>{const v=StoryMap._view();v.s*=1.3;});await p.evaluate(()=>StoryMap.render());
const moved=await p.evaluate(()=>({...StoryMap._view()}));assert(Math.abs(moved.y-whole.y)>50,'the drag moved the map');
const same=(a,b)=>Math.abs(a.s-b.s)<1e-6&&Math.abs(a.x-b.x)<.5&&Math.abs(a.y-b.y)<.5;
// Open a visible scene, then back.
const box=await p.evaluate(()=>{const r=document.querySelector('.mapBox')?.getBoundingClientRect();const vis=[...document.querySelectorAll('.mapBox')].map(x=>({id:x.dataset.mapEvent,r:x.getBoundingClientRect()})).find(x=>x.r.top>140&&x.r.bottom<innerHeight-160&&x.r.left>0&&x.r.right<innerWidth);return vis&&{id:vis.id,x:vis.r.left+vis.r.width/2,y:vis.r.top+vis.r.height/2};});
assert(box,'a scene box on screen');await p.mouse.click(box.x,box.y);await p.waitForFunction(()=>!StoryMap.isOpen());assert.equal(await p.evaluate(()=>selected),box.id);
await p.evaluate(()=>appBack());await p.waitForFunction(()=>StoryMap.isOpen());assert(same(await p.evaluate(()=>StoryMap._view()),moved),'back returns to the same place');
// Close, then open again from 사건 찾기: still there.
await p.evaluate(()=>appBack());await p.waitForFunction(()=>!StoryMap.isOpen());await p.waitForTimeout(100);await p.locator('#closeModal').click().catch(()=>{});
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();await p.waitForFunction(()=>StoryMap.isOpen());assert(same(await p.evaluate(()=>StoryMap._view()),moved),'reopened where it was left');
// 전체 still fits the whole story.
await p.locator('#mapFit').click();assert(same(await p.evaluate(()=>StoryMap._view()),whole),'전체 fits everything again');
// Another game starts on its whole map.
await p.evaluate(()=>{const v=StoryMap._view();v.y-=300;StoryMap.render();});await p.evaluate(()=>StoryMap.close({silent:true}));
await p.evaluate(async gid=>{await openGame(gid);openStoryMap('picker');},await game('축제 전날 밤'));await p.waitForFunction(()=>StoryMap.isOpen());const other=await p.evaluate(()=>({...StoryMap._view()}));
await p.locator('#mapFit').click();assert(same(await p.evaluate(()=>StoryMap._view()),other),'opens on its whole map, as 전체 shows it');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 구조도 keeps its place: back from a scene and reopening return to the same pan/zoom, 전체 fits all, another game starts fresh.');
})().catch(e=>{console.error(e);process.exit(1)});
