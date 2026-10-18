const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 연출 sounds outrank feedback cues, and a 사망 장면 keeps its own staging sound instead of the small built-in death cue.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const p=await browser.newPage({viewport:{width:360,height:740}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
// A built-in cue right after a staging one-shot is dropped; an author-chosen one plays ducked.
const r=await p.evaluate(async()=>{GameAudio.configure(project,{});const root=document.getElementById('stage');GameAudio.stageSound('once','thunder',root,{});GameAudio.playEffect('item');const builtIn=GameAudio.getState().effect;
 GameAudio.playEffect('item',{src:'sounds/ding.ogg',name:'딩',volume:100});const custom=GameAudio.getState().effect;const ducked=custom?._ducked,quiet=custom?.volume;
 GameAudio.stopAll();await new Promise(r=>setTimeout(r,800));GameAudio.playEffect('item');const alone=GameAudio.getState().effect;
 // A staging shot arriving while a built-in cue plays stops that cue.
 GameAudio.stageSound('once','hit',root,{});const after=GameAudio.getState().effect;GameAudio.stopAll();return {builtIn:!!builtIn,ducked,quiet,alone:!!alone,after:!!after};});
assert.deepEqual({builtIn:r.builtIn,ducked:r.ducked,alone:r.alone,after:r.after},{builtIn:false,ducked:true,alone:true,after:false});assert(r.quiet<=.36,'ducked custom cue is quiet');
// A 사망 장면 with a storm: its loop keeps playing after the death and the built-in death cue does not.
await p.evaluate(()=>{const e=C.event();e.title='폭풍 사망';e.text='번개에 맞았다.';e.ending='death';e.kind='branch';e.stage={all:{weather:'storm'}};project.events.splice(1,0,e);const c=project.events[0].choices[0];c.next=e.id;c.hp=0;run=null;switchPage('test');});
await p.evaluate(()=>{const c=project.events[0].choices[0];run.choose(c.id);renderTest();showChanges();});
await p.waitForFunction(()=>GameAudio.getState().stageLoops.includes('storm'),null,{timeout:3000});
assert.equal(await p.evaluate(()=>run.dead&&!!run.endScene),true);assert.equal(await p.evaluate(()=>GameAudio.getState().effect),null,'no built-in death cue over the scene');
// The ordinary 체력 0 death still sounds the death cue and silences the scene.
await p.evaluate(()=>{const c=project.events[0].choices[0];c.next='sequence';c.hp=-99;run=null;GameAudio.stopAll();switchPage('test');});await p.waitForTimeout(800);
await p.evaluate(()=>{run.choose(project.events[0].choices[0].id);renderTest();showChanges();});
assert.equal(await p.evaluate(()=>run.dead&&!run.endScene),true);assert.equal(await p.evaluate(()=>GameAudio.getState().stageLoops.length),0);assert.match(await p.evaluate(()=>GameAudio.getState().effect?.src||''),/sfx\/death\.wav$/);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 연출 one-shots drop built-in cues and duck author cues; 사망 장면 keeps its staging sound without the built-in death cue; 체력 0 death keeps the death cue.');
})().catch(e=>{console.error(e);process.exit(1)});
