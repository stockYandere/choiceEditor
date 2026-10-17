// Built-in sounds: 연출 sounds (loops, one-shots, storm thunder, per-area and per-game switches, mute), the 기본 소리 picker
// (bundled effects, downloaded music with its credit), automatic credits, and which files an exported game carries.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const C=require('./assets/core.js'),F=require('./assets/stage-fx.js');
global.window=global;require('./assets/sound-library.js');const LIB=global.SoundLibrary.SOUNDS;
// Catalogue: every listed file exists; effects/ambience ship with the editor, music is hosted; CC BY entries carry a credit.
for(const s of LIB){const file=path.join(__dirname,s.group==='bgm'?'sound-library':'assets/sounds',s.id+'.ogg');assert.ok(fs.existsSync(file),file);assert.equal(fs.statSync(file).size,s.size);assert.ok(['CC0','CC BY 4.0','CC BY 3.0'].includes(s.credit.license),s.id);if(s.credit.license!=='CC0')assert.ok(s.credit.author&&s.credit.title,s.id);}
assert.ok(LIB.filter(s=>s.group==='effect').length>=30&&LIB.filter(s=>s.group==='ambient').length>=15&&LIB.filter(s=>s.group==='bgm').length>=10);
// Every sound 연출 can play is a bundled file.
for(const table of [F.SOUNDS.weather,F.SOUNDS.weatherOnce,F.SOUNDS.fx,F.SOUNDS.transition,F.SOUNDS.enter,{bolt:F.SOUNDS.bolt}])for(const id of Object.values(table))assert.ok(LIB.some(s=>s.id===id&&s.group!=='bgm'),'연출 sound '+id);
for(const fx of C.STAGE.fx)assert.ok(F.SOUNDS.fx[fx],'beat '+fx+' has a sound');
// Validation: library refs, credits, switches.
assert.equal(C.audio('sounds/rain.ogg'),'sounds/rain.ogg');assert.equal(C.audio('sounds/../x.ogg'),null);
{const p=C.fresh();p.events.push(C.event());p.events[0].choices[0].next='end';p.audio={stageSound:false,stageVolume:40,bgm:{src:'sounds/rain.ogg',name:'비',volume:30,lib:'rain',credit:{title:'t',author:'a',license:'CC BY 4.0',url:'u'}}};p.events[0].stage={all:{weather:'rain',sound:false}};C.validate(p);assert.equal(p.events[0].stage.all.sound,false);
 p.audio.bgm.credit={title:{}};assert.throws(()=>C.validate(p),/출처/);p.audio.bgm.credit=undefined;p.audio.stageVolume=101;assert.throws(()=>C.validate(p),/음량/);}
assert.deepEqual(C.stageSettings({top:{sound:false}}).top.sound,false,'a picture area that only mutes sound is kept');
assert.deepEqual(F.soundsFor({stage:{all:{weather:'storm',beats:[{when:'start',fx:'pulse'}],transition:'slide'},top:{weather:'rain',sound:false},layers:{bottom:{enter:'pop'}}}}).sort(),['heartbeat','pop','storm','thunder','whoosh']);

(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true};});
// Music comes from the repository; serve the local copy.
await p.route(/raw\.githubusercontent\.com\/stockYandere\/choiceEditor\/HEAD\/sound-library\/(.+)$/,route=>{const name=/sound-library\/([a-z0-9-]+\.ogg)$/.exec(route.request().url())[1];route.fulfill({body:fs.readFileSync(path.join(__dirname,'sound-library',name)),contentType:'audio/ogg',headers:{'access-control-allow-origin':'*'}});});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>!!project);
await p.evaluate(async()=>{const g=C.fresh();g.randomStart=0;g.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const a=C.event(),z=C.event();a.title='골목';a.text='비';a.choices[0].next=z.id;a.choices[0].gain='key';z.title='다리';z.text='둘째';z.choices[0].next='end';
 a.stage=C.stageSettings({all:{weather:'storm',transition:'slide',beats:[{when:'start',fx:'lightning'},{when:'gain',fx:'pulse'}]}});g.events=[a,z];await addGame(g);selected=a.id;part='fx';page='story';render();});
const state=()=>p.evaluate(()=>GameAudio.getState());
// Play: the storm loop runs, its start sounds play, a re-render keeps the same loop, a gain beat plays its sound, the next scene stops the loop.
await p.evaluate(()=>startTest(project.events[0].id));await p.waitForFunction(()=>GameAudio.getState().stageLoops.includes('storm'));
let st=await state();assert.ok(st.stageShots.includes('thunder.ogg')&&st.stageShots.includes('whoosh.ogg'),'start beat and transition sounds '+st.stageShots);
assert.equal(await p.evaluate(async()=>{const before=GameAudio.getState();render();await new Promise(r=>setTimeout(r,50));return before.stageLoops.join()===GameAudio.getState().stageLoops.join()&&!document.querySelector('audio');}),true);
await p.evaluate(()=>{finishDialogue(true);skipEffects();});await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();
await p.waitForFunction(()=>GameAudio.getState().stageShots.includes('heartbeat.ogg'));await p.waitForFunction(()=>GameAudio.getState().stageLoops.length===0,null,{timeout:3000});
// Mute pauses loops; the game switch and an area switch silence 연출.
await p.evaluate(()=>switchPage('story'));await p.evaluate(()=>startTest(project.events[0].id));await p.waitForFunction(()=>GameAudio.getState().stageLoops.includes('storm'));
assert.equal(await p.evaluate(()=>{GameAudio.setEnabled(false);const paused=[...document.querySelectorAll('audio')].length===0;GameAudio.setEnabled(true);return paused;}),true);
await p.evaluate(()=>{switchPage('story');project.audio={stageSound:false};persist();startTest(project.events[0].id);});await p.waitForTimeout(150);st=await state();assert.deepEqual(st.stageLoops,[],'game switch off');assert.deepEqual(st.stageShots,[]);
await p.evaluate(()=>{switchPage('story');delete project.audio.stageSound;project.events[0].stage.all.sound=false;persist();startTest(project.events[0].id);});await p.waitForTimeout(150);st=await state();assert.deepEqual(st.stageLoops,[],'area switch off');
await p.evaluate(()=>{switchPage('story');project.events[0].stage.all.sound=true;persist();selected=project.events[0].id;part='fx';renderEditor();});
// 연출 tab: the weather sheet names its sound and switches it per place; ⋯ holds the game switch.
await p.locator('[data-fx-tool=weather]').click();assert.match(await p.locator('.fxSoundRow small').innerText(),/거센 비.*천둥/);await p.locator('[data-fx-sound]').click();
assert.equal(await p.evaluate(()=>project.events[0].stage.all.sound),false);assert.equal(await p.locator('[data-fx-sound]').innerText(),'효과음 꺼짐');await p.locator('[data-fx-sound]').click();await p.locator('#closeModal').click();
await p.locator('#fxMore').click();await p.locator('#fxGameSound').uncheck();assert.equal(await p.evaluate(()=>project.audio.stageSound),false);await p.locator('#fxGameSound').check();assert.equal(await p.evaluate(()=>project.audio.stageSound),undefined);await p.locator('#closeModal').click();
// 소리 tab: pick a bundled effect, then hosted music with its credit.
await p.evaluate(()=>{part='sound';renderEditor();});await p.locator('#sceneVoiceLibrary').click();assert.equal(await p.locator('[data-lib-group=effect]').getAttribute('aria-selected'),'true');
assert.ok(await p.locator('.libRow').count()<=7,'one page');await p.locator('[data-lib-page="1"]').last().click();assert.match(await p.locator('#modal .libPager').innerText(),/2 \/ \d+/,'many pages show a count');
await p.locator('[data-lib-play]').first().click();assert.equal(await p.locator('[data-lib-play]').first().getAttribute('aria-pressed'),'true');
await p.locator('[data-lib-page="0"]').first().click();await p.locator('[data-lib-pick=thunder]').click();
let slot=await p.evaluate(()=>project.events[0].audio.dialogue);assert.equal(slot.src,'sounds/thunder.ogg');assert.equal(slot.kind,'effect');assert.equal(slot.lib,'thunder');assert.equal(slot.credit,undefined,'CC0 needs no credit');
await p.locator('[data-sound-panel=bgm]').click();await p.locator('#sceneBgmMode').selectOption('play');await p.locator('#sceneBgmLibrary').click();assert.equal(await p.locator('[data-lib-group=bgm]').getAttribute('aria-selected'),'true');await p.locator('[data-lib-pick=bgm-morning]').click();
await p.waitForFunction(()=>project.events[0].audio?.bgm?.src?.startsWith('data:audio/ogg;base64,'),null,{timeout:10000});slot=await p.evaluate(()=>project.events[0].audio.bgm);assert.equal(slot.credit.license,'CC BY 4.0');assert.equal(slot.loop,true);
assert.match(await p.locator('#sceneBgmCredit').innerText(),/Kevin MacLeod.*CC BY 4\.0/);
// Credits: listed automatically on the credits screen and in the APK form; the export list holds picked and 연출 sounds.
assert.deepEqual(await p.evaluate(()=>GameTitle.soundCredits(project)),['“Morning” · Kevin MacLeod (incompetech.com) · CC BY 4.0 (creativecommons.org/licenses/by/4.0)']);
await p.evaluate(()=>{GameTitle.paint(project,null,()=>{},()=>{});});assert.equal(await p.locator('#titleCredits').evaluate(x=>x.hidden),false,'the credits button appears');assert.equal(await p.locator('#creditsSounds').evaluate(x=>x.hidden),false);assert.match(await p.locator('#creditsSounds li').textContent(),/Morning/);
assert.deepEqual(await p.evaluate(()=>exportSounds(project)),['heartbeat','storm','thunder','whoosh']);
await p.evaluate(()=>{project.audio={stageSound:false};});assert.deepEqual(await p.evaluate(()=>exportSounds(project)),['thunder'],'game switch off: only picked sounds');
// Offline music pick fails with a message and changes nothing.
await p.unrouteAll({behavior:'ignoreErrors'});await p.route(/raw\.githubusercontent/,r=>r.abort());await p.evaluate(()=>{delete project.events[0].audio.bgm;renderEditor();});await p.locator('#sceneBgmMode').selectOption('play');await p.locator('#sceneBgmLibrary').click();await p.locator('[data-lib-pick=bgm-heartbreaking]').click();
await p.waitForFunction(()=>!$('formError').hidden);assert.match(await p.locator('#formError').innerText(),/인터넷/);assert.equal(await p.evaluate(()=>project.events[0].audio.bgm),undefined);await p.locator('#closeModal').click();
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),360);assert.deepEqual(errors,[]);await b.close();
// The exported player has no catalogue; the engine copies only listed sounds.
const html=fs.readFileSync(path.join(__dirname,'assets/player-index.html'),'utf8');assert.doesNotMatch(html,/sound-library\.js/);assert.match(html,/creditsSounds/);
assert.match(fs.readFileSync(path.join(__dirname,'src/com/example/splitstory/ApkExportEngine.java'),'utf8'),/sounds!=null&&!sounds\.contains/);
console.log('PASS sound library ('+LIB.length+' sounds), 연출 loops/one-shots/thunder/mute/switches, picker with paging/preview/download/offline, automatic credits, export list.');
})().catch(e=>{console.error(e);process.exit(1);});
