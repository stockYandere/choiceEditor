const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// Whatever the forms accept must still be a game the app can read back: on 축제 전날 밤 (every newer feature in use),
// each item is switched to every other 종류 and each scene to every 진행 방식, and after every step the game validates
// and saves. A change the form refuses is fine; one it accepts and then cannot load is the bug this guards against.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.evaluate(async()=>{await addGame(clone(FESTIVAL_SAMPLE));
 // Plus the shapes that once slipped through: an item behind a 없을 때 condition, a 6-or-more one, and a 없을 때 등장 조건.
 const items=project.definitions.filter(d=>d.type==='item'),free=project.events.flatMap(e=>e.choices).filter(c=>!c.requires),pool=project.events.filter(e=>e.kind==='encounter'&&!e.appear);
 Object.assign(free[0],{requires:items[0].id,requiresCount:1,requiresNot:true});Object.assign(free[1],{requires:items[1].id,requiresCount:6});pool[0].appear=[{id:items[2].id,count:1,not:true}];C.validate(clone(project));window.__base=clone(project);window.__valid=()=>{try{C.validate(clone(project));return '';}catch(e){return e.message;}};});await p.waitForFunction(()=>page==='story');
const settle=()=>p.waitForTimeout(30);
// 종류: every definition to every other type, through the real form.
const defs=await p.evaluate(()=>project.definitions.map(d=>[d.id,d.type,d.name]));let accepted=0,refused=0;
for(const [id,type,name]of defs)for(const next of ['item','ability','state','memory','affinity']){if(next===type)continue;
 await p.evaluate(id=>{project=clone(__base);page='inventory';render();definitionForm(project.definitions.find(d=>d.id===id));},id);await p.selectOption('#dType',next);await p.locator('#saveDef').click();await settle();
 const r=await p.evaluate(id=>({now:project.definitions.find(d=>d.id===id).type,bad:__valid(),open:document.getElementById('modal').open}),id);
 assert.equal(r.bad,'',`${name}: ${type} → ${next} left an unreadable game (${r.bad})`);if(r.now===next)accepted++;else refused++;
 assert.equal(await p.evaluate(async()=>{persist();return await flushEditor();}),true,`${name}: ${type} → ${next} saves`);await p.evaluate(()=>{if(document.getElementById('modal').open)closeForm();});await p.waitForTimeout(60);}
assert(accepted>10&&refused>5,`both paths were exercised (accepted ${accepted}, refused ${refused})`);
// 진행 방식: every scene to every kind.
const events=await p.evaluate(()=>{project=clone(__base);return project.events.map(e=>e.id);});let changes=0;
for(const id of events){const kinds=await p.evaluate(id=>{project=clone(__base);selected=id;part='content';page='story';render();return [...document.getElementById('eventKind').options].map(o=>o.value).filter(v=>v!=='newGroup');},id);
 for(const v of kinds){await p.evaluate(v=>{const s=document.getElementById('eventKind');s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));},v);changes++;
  const bad=await p.evaluate(()=>__valid());assert.equal(bad,'',`scene ${id} → ${v} left an unreadable game (${bad})`);
  const e=await p.evaluate(id=>{const e=project.events.find(e=>e.id===id);return {ending:e.ending,kind:e.kind,group:e.randomGroup,timer:!!e.timer};},id);if(e.ending)assert.deepEqual([e.kind,e.group,e.timer],['branch',undefined,false],'an ending scene is out of every pool and untimed');}}
assert.equal(await p.evaluate(async()=>{persist();return await flushEditor();}),true);
assert.deepEqual(errors,[]);await browser.close();console.log(`PASS invariants: ${accepted} accepted + ${refused} refused 종류 changes and ${changes} 진행 방식 changes on 축제 전날 밤 all leave a game that validates and saves.`);
})().catch(e=>{console.error(e);process.exit(1)});
