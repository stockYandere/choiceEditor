const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 일곱 번째 괴담: installed once; every chapter is a different branching shape laid out by hand with a 구조도 메모;
// no two scene boxes overlap; 개요 shows the 12 stories, 2 🎲 묶음 and 8 endings; it plays to the true ending and to a 사망 장면.
const M=require('./assets/story-map.js');globalThis.window=globalThis;require('./assets/mystery-sample.js');const C=require('./assets/core.js');
const data=C.validate(JSON.parse(JSON.stringify(globalThis.MYSTERY_SAMPLE)));
assert.deepEqual(C.inspect(data).filter(x=>x.level!=='info').map(x=>x.message),[],'story check is clean');
assert(data.events.length>=50,'a long example');assert.equal(data.mapNotes.length,9);assert.equal(data.randomGroups.length,2);
const L=M.layout(data),boxes=[...L.boxes.values()];assert.equal(data.events.filter((e,i)=>i>0&&!L.depth.has(e.id)).length,0,'every scene reachable');
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(Math.abs(a.x-b.x)>=132||Math.abs(a.y-b.y)>=60,`boxes overlap: ${a.e.title} / ${b.e.title}`);}
const O=M.overview(data);assert.equal(O.stories.length,12);assert.equal(O.ends.length,8);assert.equal(O.hubs.length,2);
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
assert.equal(await p.evaluate(()=>store.games.filter(g=>g.draft.title==='일곱 번째 괴담').length),1,'installed once');
// 구조도: notes, both 🎲, the 3장 returns as 「→」 tags, 개요 with folded 분기.
await p.evaluate(async()=>{await openGame(store.games.find(g=>g.draft.title==='일곱 번째 괴담').id);openStoryMap('story');});await p.waitForFunction(()=>StoryMap.isOpen());
assert.equal(await p.locator('[data-map-note]').count(),9);assert.equal(await p.locator('[data-map-hub]').count(),2);
assert(await p.locator('[data-map-jump="c3"]').count()>=4,'거점 returns are tags');assert.equal(await p.locator('.mapBox.orphan').count(),0);assert.equal(await p.locator('.mapBox.warn').count(),0);
await p.locator('#mapLevel').click();assert.equal(await p.locator('[data-map-event]').count(),20);assert.match(await p.locator('[data-map-event="c1"] .mapNum').textContent(),/\+9 분기/);
await p.evaluate(()=>StoryMap.close());
// Play: a planned walk (per scene, the choices to take in order; 🎲 takes the first scene left in the pool).
const walk=plan=>p.evaluate(async plan=>{await publishGame();await playGame(store.active,true);const used={},path=[];
 for(let n=0;n<120&&!run.ended;n++){finishDialogue(true);if(run.pendingReward){run.chooseReward(run.pendingReward.offers[0]);renderTest();continue;}
  const e=run.p.events.find(x=>x.id===run.current),ok=run.visibleChoices(e).filter(c=>!run.blocked(c)),want=(plan[e.id]||[])[used[e.id]||0],c=ok.find(c=>c.id===want)||ok[0];used[e.id]=(used[e.id]||0)+1;path.push(e.id+'>'+c.id);run.choose(c.id,()=>0);renderTest();await new Promise(r=>setTimeout(r,5));}
 return {ended:run.ended,dead:run.dead,scene:run.endScene,clues:run.bag.clue,path:path.join(' '),imgs:document.querySelectorAll('#stage img').length};},plan);
const truth=await walk({p1:['p1a'],c1:['c1a'],l1:['l1a'],l2:['l2a'],c3:['c3d','c3b','c3f'],t1:['t1b'],t2:['t2a'],t3:['t3b'],c5:['c5a'],s2:['s2a'],fin:['fa']});
assert.equal(truth.scene,'tEnd',truth.path);assert.equal(truth.dead,false);assert(truth.clues>=6);assert(truth.imgs>0,'pictures on the ending');
const fall=await walk({c1:['c1c'],c3:['c3f'],t1:['t1c']});assert.deepEqual([fall.scene,fall.dead],['x1',true],fall.path);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 일곱 번째 괴담: installed once, 51 scenes, clean story check, every scene reachable, no overlapping boxes, 9 구조도 메모, two 🎲 묶음, 거점 「→」 tags, 개요 12 stories + 8 endings with folded 분기, plays to the true ending and to a 사망 장면.');
})().catch(e=>{console.error(e);process.exit(1)});
