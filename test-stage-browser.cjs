// Scene staging (연출): validation, editor tab and presets, play-time camera/mood/particles/overlays/beats/layers,
// reduced motion, cleanup, and inclusion in the exported player.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const C=require('./assets/core.js');
{const p=C.fresh();p.events.push(C.event());p.events[0].choices[0].next='end';p.events[0].stage={camera:'zoomIn',mood:'night',weather:'rain',weatherAmount:9,overlays:['vignette','bogus'],beats:[{when:'gain',fx:'flash'},{when:'x',fx:'flash'}],transition:'iris'};C.validate(p);
 const all=p.events[0].stage.all;assert.deepEqual(all.overlays,['vignette']);assert.equal(all.weatherAmount,3);assert.deepEqual(all.beats,[{when:'gain',fx:'flash'}]);
 // An older flat setting with a camera target moves that camera to its slot; empty slot areas are dropped.
 assert.deepEqual(Object.keys(C.stageSettings({camera:'zoomIn',cameraTarget:'top',mood:'night'})),['all','top']);assert.equal(C.stageSettings({all:{},top:{},bottom:{weather:'snow'}}).top,undefined);
 p.events[0].stage={layers:{top:{image:'not-an-image'}}};assert.throws(()=>C.validate(p),/연출 인물/);p.events[0].stage={};p.stagePresets=[{name:'',stage:{}}];assert.throws(()=>C.validate(p),/프리셋/);}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:360,height:740},{width:320,height:568}]){
const p=await b.newPage({viewport,isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true};});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>!!project);
const pixel=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=60;c.height=120;const x=c.getContext('2d');x.fillStyle='#e9a';x.fillRect(10,10,40,110);return c.toDataURL('image/png');});
await p.evaluate(async()=>{const g=C.fresh();g.randomStart=0;g.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const a=C.event(),z=C.event();a.title='골목';a.text='비가 내린다';a.choices[0].next=z.id;a.choices[0].gain='key';z.title='다리';z.text='둘째';z.choices[0].next='end';g.events=[a,z];await addGame(g);selected=a.id;part='fx';page='story';render();});
// Editor: controls write a sanitized stage; empty staging is removed.
await p.evaluate(()=>document.querySelectorAll('.stageEditor details').forEach(d=>d.open=true));await p.selectOption('#fxCamera','zoomIn');await p.selectOption('#fxMood','night');await p.selectOption('#fxWeather','snow');await p.locator('[data-overlay=vignette]').check();await p.selectOption('#fxTransition','iris');
await p.locator('#fxAddBeat').click();await p.selectOption('[data-beat-when="0"]','gain');await p.selectOption('[data-beat-fx="0"]','flash');
let stage=await p.evaluate(()=>project.events[0].stage.all);assert.equal(stage.camera,'zoomIn');assert.equal(stage.mood,'night');assert.equal(stage.weather,'snow');assert.deepEqual(stage.overlays,['vignette']);assert.equal(stage.transition,'iris');assert.deepEqual(stage.beats,[{when:'gain',fx:'flash'}]);
assert.equal(await p.locator('#fxPreview .fxParticles').count(),1,'preview draws particles');assert.match(await p.locator('#fxPreview .previewUpper').evaluate(x=>x.style.filter),/brightness/);
// Presets: save a user preset, apply a built-in (keeps character layers), delete the user preset.
await p.locator('#fxPresetName').fill('내 눈밤');await p.locator('#fxSavePreset').click();assert.equal(await p.evaluate(()=>project.stagePresets[0].name),'내 눈밤');assert.equal(await p.evaluate(()=>project.stagePresets[0].stage.weather),'snow');
await p.evaluate(img=>{project.events[0].stage.layers={top:{image:img,x:30,y:100,scale:80,enter:'slideLeft',motion:'bob',flip:false}};persist();renderEditor();},pixel);
assert.equal(await p.locator('#fxBeats select').first().isVisible(),true,'sections stay open after a re-render');await p.selectOption('#fxPreset','b4');await p.locator('#fxApplyPreset').click();stage=await p.evaluate(()=>project.events[0].stage);assert.equal(stage.all.weather,'storm');assert.equal(stage.layers.top.x,30,'preset keeps the character');
await p.selectOption('#fxPreset','u0');await p.evaluate(()=>{window.confirm=()=>true;});await p.locator('#fxDeletePreset').click();assert.equal(await p.evaluate(()=>project.stagePresets),undefined);
await p.locator('#fxClear').click();assert.equal(await p.evaluate(()=>project.events[0].stage),undefined);await p.evaluate(()=>$('undoEdit').click());assert.equal(await p.evaluate(()=>project.events[0].stage?.all.weather),'storm','undo restores staging');
// Areas: the top tab edits only the top picture; its particles and shake stay inside that slot.
await p.evaluate(()=>{project.events[0].stage={all:{},layers:project.events[0].stage.layers};persist();renderEditor();});await p.locator('[data-fx-area=top]').click();await p.selectOption('#fxWeather','rain');await p.selectOption('#fxMood','dusk');
stage=await p.evaluate(()=>project.events[0].stage);assert.equal(stage.top.weather,'rain');assert.equal(stage.all.weather,'none');assert.equal(stage.bottom,undefined);
assert.equal(await p.locator('#fxPreview .previewUpper .fxParticles').count(),1);assert.equal(await p.locator('#fxPreview > .fxParticles').count(),0);assert.match(await p.locator('[data-fx-area=top]').innerText(),/•/);
assert.equal(await p.evaluate(()=>{StageFX.runBeat($('fxPreview'),'bigShake','top');return $('fxPreview').getAnimations().length+':'+$('fxPreview').querySelector('.previewLower .fxCam').getAnimations().length;}),'0:0','a top-only shake leaves the frame and the bottom picture still');
await p.locator('[data-fx-area=all]').click();await p.evaluate(()=>{project.events[0].stage=C.stageSettings({mood:'night',weather:'storm',layers:project.events[0].stage?.layers});persist();});
// Play: staging applies on the stage, continues across re-renders, beats fire on gain, cleanup on leaving.
await p.evaluate(()=>{project.events[0].stage={...C.stageSettings({camera:'drift',mood:'memory',weather:'rain',overlays:['vignette','grain','letterbox'],warp:'water',transition:'fade',beats:[{when:'gain',fx:'flash'},{when:'start',fx:'shake'}]}),layers:project.events[0].stage.layers};persist();startTest(project.events[0].id);});
await p.waitForFunction(()=>playing||page==='test');await p.waitForTimeout(300);
assert.equal(await p.locator('#stage .fxParticles').count(),1);assert.match(await p.locator('#upper').evaluate(x=>x.style.filter),/url\("?#fx-water"?\).*sepia/);
assert.equal(await p.locator('#stage .fx-vignette').count(),1);assert.equal(await p.locator('#stage .fx-letterbox .fxBar').count(),2);
assert.ok(await p.locator('#upper .fxCam').evaluate(x=>x.getAnimations().length>0),'camera moves');
const layer=p.locator('#upper img.fxCharacter');assert.equal(await layer.count(),1);assert.equal(await layer.evaluate(x=>x.style.left),'30%');
assert.ok(await p.locator('#conversation').evaluate(x=>getComputedStyle(x).zIndex==='2'));
const frames=await p.evaluate(()=>new Promise(r=>{let n=0;const t=performance.now();(function f(){n++;if(performance.now()-t<1000)requestAnimationFrame(f);else r(n);})();}));assert.ok(frames>20,'animation keeps running '+frames);
await p.evaluate(()=>{finishDialogue(true);skipEffects();});await p.waitForFunction(()=>performance.now()>=choiceReadyAt);
const flashes=p.evaluate(()=>new Promise(r=>{const seen=new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes].some(n=>n.classList?.contains('fxFlash')))){seen.disconnect();r(true);}});seen.observe($('stage'),{childList:true});setTimeout(()=>r(false),1500);}));
await p.locator('#answers button').first().click();assert.equal(await flashes,true,'gain beat flashes');
assert.equal(await p.locator('#stage .fxParticles').count(),0,'next scene without staging clears particles');assert.equal(await p.locator('#upper').evaluate(x=>x.style.filter),'');
await p.evaluate(()=>switchPage('story'));assert.equal(await p.locator('#stage .fxParticles').count(),0);
// Reduced motion: no camera movement or character idle motion.
await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>startTest(project.events[0].id));await p.waitForTimeout(200);assert.equal(await p.locator('#upper .fxCam').evaluate(x=>x.getAnimations().length),0);assert.equal(await p.locator('#stage .fxParticles').count(),1);
await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>switchPage('story'));
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),viewport.width);assert.deepEqual(errors,[]);await p.close();
console.log('PASS',viewport,'staging editor, areas (all/top/bottom), presets, undo, play camera/mood/warp/particles/overlays/layers, gain beat, cleanup, reduced motion.');}
await b.close();
// The exported player carries the runtime but not the editor tab.
const html=fs.readFileSync(path.join(__dirname,'assets/player-index.html'),'utf8');assert.match(html,/stage-fx\.js/);assert.doesNotMatch(html,/stage-editor\.js/);
assert.match(fs.readFileSync(path.join(__dirname,'src/com/example/splitstory/ApkExportEngine.java'),'utf8'),/"stage-fx\.js"/);
console.log('PASS exported player includes stage-fx.js only.');
})().catch(e=>{console.error(e);process.exit(1)});
