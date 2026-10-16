const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:412,height:850},{width:360,height:640},{width:320,height:568}]){
 const p=await browser.newPage({viewport,hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openPlayer').disabled);
 const example=await p.evaluate(()=>store.games.find(g=>g.builtinExample===ExampleGames.release).id);
 assert.equal(await p.evaluate(()=>store.games.length),3);
 if(process.env.QA_FONT){await p.addStyleTag({content:'@font-face{font-family:QA;src:url(data:font/ttf;base64,'+fs.readFileSync(process.env.QA_FONT).toString('base64')+')} :root{font-family:QA,sans-serif}'});await p.evaluate(()=>document.fonts.ready);}
 await p.locator('#openPlayer').tap();await p.locator('[data-play-game="'+example+'"]').tap();
 await p.waitForFunction(()=>GameAudio.getState().bgm&&!GameAudio.getState().bgm.paused);
 assert.equal(await p.locator('#appHeader').isVisible(),false);assert.equal(await p.locator('#editorNav').isVisible(),false);
 await p.waitForFunction(()=>dialogueTyping);await p.locator('#box').tap();assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.evaluate(()=>run.current),'intro');
 async function choose(id){
  await p.evaluate(()=>{skipEffects();finishDialogue(true);});await p.waitForFunction(()=>performance.now()>=choiceReadyAt);
  const index=await p.evaluate(id=>run.p.events.find(e=>e.id===run.current).choices.findIndex(c=>c.id===id),id);assert(index>=0,'choice '+id);
  const button=p.locator('#answers button').nth(index);assert.equal(await button.isDisabled(),false,id);await button.tap();
 }
 // Play a complete route through actual buttons, acquisition art and saved audio.
 for(const id of ['c_begin','c_train_courage','c_pack_radio','c_promise_together','c_first_skip','c_enter_rest','c_heal_free','c_talk_radio','c_radio_key','c_radio_resume','c_second_skip','c_path_radio','c_radio_trust','c_radio_resume']){
  await choose(id);
  if(id==='c_pack_radio'||id==='c_radio_key'){
   assert.equal(await p.evaluate(()=>acquisitionActive),true);const image=p.locator('#acquisitionArt img');await image.evaluate(img=>img.decode());
   const fit=await image.evaluate(img=>getComputedStyle(img).objectFit);assert.equal(fit,'cover');await p.locator('#acquisitionArt').tap();assert.equal(await p.evaluate(()=>acquisitionActive),false);
  }
 }
 assert.equal(await p.evaluate(()=>run.current),'arrival');
 await p.evaluate(()=>appBack());await p.waitForFunction(()=>!playing);await p.evaluate(()=>flushPersist());await p.reload();await p.waitForFunction(()=>!!store);
 assert.equal(await p.evaluate(()=>store.games.filter(g=>g.builtinExample===ExampleGames.release).length),1);
 await p.evaluate(id=>playGame(id),example);assert.equal(await p.evaluate(()=>run.current),'arrival');assert((await p.evaluate(()=>run.bag.key))>=1);
 await choose('c_end_key');assert.equal(await p.evaluate(()=>run.current),'ending_secret');await choose('c_ending_secret_finish');assert.equal(await p.evaluate(()=>run.ended),true);
 await p.evaluate(()=>appBack());await p.waitForFunction(()=>!playing);await p.evaluate(id=>openGame(id),example);
 const ids=await p.evaluate(()=>project.events.map(e=>e.id));
 for(const id of ids){
  await p.evaluate(id=>{startTest(id);for(const d of run.p.definitions)run.bag[d.id]=3;renderTest();finishDialogue(true);},id);
  await p.locator('#upper img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  const layout=await p.evaluate(()=>{const box=document.getElementById('box'),conv=document.getElementById('conversation'),r=conv.getBoundingClientRect();return {w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,bh:box.clientHeight,x:r.x,y:r.y,right:r.right,bottom:r.bottom,musicError:GameAudio.getState().bgm?.error?.code||0,voiceError:GameAudio.getState().voice?.error?.code||0};});
  assert.equal(layout.w,viewport.width,id+' width');assert.equal(layout.h,viewport.height,id+' height');assert(layout.x>=0&&layout.right<=viewport.width&&layout.y>=0&&layout.bottom<=viewport.height,id+' rectangle');assert.equal(layout.bh,Math.round(Math.min(260,viewport.height*.34))-2,id+' fixed box');assert.equal(layout.musicError,0);assert.equal(layout.voiceError,0);
 }
 // All shipped sound data decodes, including per-definition and nine global cues.
 const metadata=await p.evaluate(async()=>{
  const slots=[project.audio.bgm,...Object.values(project.audio.effects),...project.definitions.map(d=>d.sound),...project.events.flatMap(e=>[e.audio.dialogue,e.audio.bgm])].filter(Boolean);
  const distinct=[...new Map(slots.map(s=>[s.src,s])).values()];
  return await Promise.all(distinct.map(s=>new Promise((ok,bad)=>{const a=new Audio();const timer=setTimeout(()=>bad(Error(s.name+' timeout')),10000);a.onloadedmetadata=()=>{clearTimeout(timer);const duration=a.duration;a.removeAttribute('src');a.load();ok({name:s.name,duration});};a.onerror=()=>{clearTimeout(timer);bad(Error(s.name+' decode'));};a.src=s.src;a.load();})));
 });
 assert(metadata.length>=20);assert(metadata.every(s=>Number.isFinite(s.duration)&&s.duration>0));
 await p.evaluate(()=>{selected='intro';part='art';page='story';render();});assert.equal(await p.locator('#artPreview').isVisible(),true);
 await p.locator('#nextEvent').tap();assert.equal(await p.evaluate(()=>selected),'prepare');await p.locator('[data-part=sound]').tap();assert.match(await p.locator('#sceneVoiceLabel').innerText(),/voice-soft/);
 await p.evaluate(()=>{page='inventory';render();});await p.locator('[data-edit-def]').first().tap();
 await p.evaluate(()=>appBack());assert.deepEqual(errors,[]);
 if(viewport.width===412){
  if(process.env.QA_FONT)await p.addStyleTag({content:'@font-face{font-family:QA;src:url(data:font/ttf;base64,'+fs.readFileSync(process.env.QA_FONT).toString('base64')+')} :root{font-family:QA,sans-serif}'});
  await p.evaluate(()=>{startTest('arrival');playing=true;render();finishDialogue(true);});await p.screenshot({path:path.join(__dirname,'preview-advanced-example.png')});
 }
 await p.close();console.log('PASS',viewport,'37 scene layouts, complete secret-ending play route, custom acquisition/tap skip, typewriter, audio decoding, saved resume, unchanged migration, editor arrows/sound controls and no outer scroll.');
}
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
