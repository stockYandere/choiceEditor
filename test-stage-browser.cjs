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
// Editor: preset pages, summary and tool icons fit without scrolling; each tool opens its own sheet; no preview buttons.
assert.equal(await p.locator('#fxPreview').count(),0,'no preview takes room in the tab');assert.equal(await p.locator('#editor button',{hasText:'미리보기'}).count(),0,'no preview button');
assert.equal(await p.locator('#editor').evaluate(x=>x.scrollHeight<=x.clientHeight),true,'the tab does not scroll');
const tool=async(name,run)=>{await p.locator(`[data-fx-tool=${name}]`).click();assert.equal(await p.locator('#modal').evaluate(x=>x.open&&x.classList.contains('fxToolSheet')),true);await run();await p.locator('#closeModal').click();};
const pick=(field,value)=>p.locator(`[data-fx-set=${field}][data-value="${value}"]`).click();
const hold=async sel=>{const box=await p.locator(sel).boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.waitForTimeout(600);await p.mouse.up();};
await tool('camera',()=>pick('camera','zoomIn'));
await tool('mood',async()=>{await pick('mood','night');assert.equal(await p.locator('#fxMoodStrength').isVisible(),true,'strength appears once a mood is picked');assert.equal(await p.locator('[data-fx-set=mood][data-value=night]').getAttribute('aria-pressed'),'true');
 await pick('mood','night');assert.equal(await p.evaluate(()=>!!$('fxSheet')?.open),false);assert.equal(await p.evaluate(()=>project.events[0].stage?.all.mood),'none','tapping the chosen option again cancels it');await pick('mood','night');});
await tool('weather',()=>pick('weather','snow'));
await tool('overlays',async()=>{await p.locator('[data-overlay=vignette]').click();await hold('[data-overlay=vignette]');assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),true,'holding an on/off option previews');await p.evaluate(()=>appBack());assert.equal(await p.locator('[data-overlay=vignette]').getAttribute('aria-pressed'),'true','the hold does not toggle it');
 await p.locator('[data-overlay=grain]').click();await p.locator('[data-overlay=grain]').click();assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),false);});await tool('transition',()=>pick('transition','iris'));
await tool('beats',async()=>{await p.locator('#fxAddBeat').click();assert.equal(await p.locator('[data-beat-when="0"]').isVisible(),true,'a new beat row is visible after the re-render');await p.selectOption('[data-beat-when="0"]','gain');await p.selectOption('[data-beat-fx="0"]','flash');});
let stage=await p.evaluate(()=>project.events[0].stage.all);assert.equal(stage.camera,'zoomIn');assert.equal(stage.mood,'night');assert.equal(stage.weather,'snow');assert.deepEqual(stage.overlays,['vignette']);assert.equal(stage.transition,'iris');assert.deepEqual(stage.beats,[{when:'gain',fx:'flash'}]);
assert.match(await p.locator('#fxSummary').innerText(),/밤.*눈.*얻을 때 번쩍/);assert.equal(await p.locator('[data-fx-tool=mood] .fxDot').count(),1);assert.equal(await p.locator('[data-fx-tool=warp] .fxDot').count(),0);
assert.equal(await p.locator('#editor').evaluate(x=>x.scrollWidth<=x.clientWidth),true,'no sideways scroll in the tab');
// Tapping the summary previews the whole staging; back closes it and stops the particles.
await p.locator('#fxSummary').click();assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),true);assert.equal(await p.locator('#fxPreview .fxParticles').count(),1,'preview draws particles');assert.match(await p.locator('#fxPreview .previewUpper').evaluate(x=>x.style.filter),/brightness/);
await p.evaluate(()=>appBack());assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),false);assert.equal(await p.locator('#fxPreview .fxParticles').count(),0);
// Presets: two rows a page; save a user preset from the ⋯ sheet, apply a built-in by tapping its tile (keeps characters), tap it again to preview, delete the user preset.
await p.locator('#fxMore').click();await p.locator('#fxPresetName').fill('내 눈밤');await p.locator('#fxSavePreset').click();assert.equal(await p.evaluate(()=>project.stagePresets[0].name),'내 눈밤');assert.equal(await p.evaluate(()=>project.stagePresets[0].stage.weather),'snow');assert.equal(await p.locator('.fxPresets [data-preset]').count(),await p.locator('.fxPresets').evaluate(x=>2*Number(x.style.getPropertyValue('--fx-cols'))),'two full rows');
assert.equal(await p.locator('[data-preset=u0]').count(),0);await p.locator('[data-preset-step="1"]').click();assert.equal(await p.locator('[data-preset=u0]').count(),1,'my preset is on the next page');assert.equal(await p.locator('[data-preset=u0]').getAttribute('aria-pressed'),'true','the current staging matches it');
await hold('[data-preset=u0]');assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),true,'holding a preset previews');await p.evaluate(()=>appBack());assert.equal(await p.evaluate(()=>project.events[0].stage.all.weather),'snow','the hold changes nothing');
await p.locator('[data-preset=u0]').click();assert.equal(await p.evaluate(()=>project.events[0].stage),undefined,'tapping the applied preset again cancels it');assert.equal(await p.locator('[data-preset=u0]').count(),1,'the page stays');
const gridBox=await p.locator('.fxPresets').boundingBox();await p.mouse.move(gridBox.x+40,gridBox.y+gridBox.height/2);await p.mouse.down();await p.mouse.move(gridBox.x+200,gridBox.y+gridBox.height/2,{steps:4});await p.mouse.up();assert.equal(await p.locator('[data-preset=b0]').count(),1,'a sideways swipe turns back to page 1');
await p.evaluate(img=>{project.events[0].stage={...C.stageSettings(project.events[0].stage||{}),layers:{top:{image:img,x:30,y:100,scale:80,enter:'slideLeft',motion:'bob',flip:false}}};persist();renderEditor();},pixel);
await p.locator('[data-preset=b4]').click();stage=await p.evaluate(()=>project.events[0].stage);assert.equal(stage.all.weather,'storm');assert.equal(stage.all.camera,'sway','the preset replaces the whole-screen staging');assert.equal(stage.layers.top.x,30,'preset keeps the character');assert.equal(await p.locator('[data-preset=b4]').getAttribute('aria-pressed'),'true');
await p.evaluate(()=>{window.confirm=()=>true;});await p.locator('#fxMore').click();await p.locator('[data-delete-preset="0"]').click();assert.equal(await p.evaluate(()=>project.stagePresets),undefined);
await p.locator('#fxMore').click();await p.locator('#fxClear').click();assert.equal(await p.evaluate(()=>project.events[0].stage),undefined);await p.evaluate(()=>$('undoEdit').click());assert.equal(await p.evaluate(()=>project.events[0].stage?.all.weather),'storm','undo restores staging');
// Areas: a tool sheet picks where it applies; the top picture's particles and shake stay inside that slot; the character tool works per picture.
await p.evaluate(()=>{project.events[0].stage={all:{},layers:project.events[0].stage.layers};persist();renderEditor();});
await tool('weather',async()=>{await p.locator('[data-fx-area=top]').click();await pick('weather','rain');});
await tool('mood',async()=>{assert.equal(await p.locator('[data-fx-area=all]').getAttribute('aria-selected'),'true','an unused tool starts on 전체');await p.locator('[data-fx-area=top]').click();await pick('mood','dusk');assert.equal(await p.locator('[data-fx-area=top] .fxDot').count(),1);});
stage=await p.evaluate(()=>project.events[0].stage);assert.equal(stage.top.weather,'rain');assert.equal(stage.top.mood,'dusk');assert.equal(stage.all.weather,'none');assert.equal(stage.bottom,undefined);assert.match(await p.locator('#fxSummary').innerText(),/비\(위\)/);
await tool('character',async()=>{assert.equal(await p.locator('[data-fx-area=all]').count(),0,'characters belong to a picture');assert.equal(await p.locator('[data-layer-remove=top]').count(),1,'the top character');await pick('motion','float');});
assert.equal(await p.evaluate(()=>project.events[0].stage.layers.top.motion),'float');
await p.locator('[data-fx-tool=weather]').click();assert.equal(await p.locator('[data-fx-area=top]').getAttribute('aria-selected'),'true','a used tool opens where it is used');
await hold('[data-fx-area=top]');assert.equal(await p.locator('#fxSheet').evaluate(x=>x.open),true,'holding previews');assert.equal(await p.locator('#fxPreview .previewUpper .fxParticles').count(),1);assert.equal(await p.locator('#fxPreview > .fxParticles').count(),0);
assert.equal(await p.evaluate(()=>{StageFX.runBeat($('fxPreview'),'bigShake','top');return $('fxPreview').getAnimations().length+':'+$('fxPreview').querySelector('.previewLower .fxCam').getAnimations().length;}),'0:0','a top-only shake leaves the frame and the bottom picture still');
await p.evaluate(()=>appBack());assert.equal(await p.locator('#modal').evaluate(x=>x.open),true,'back closes the preview first');await p.evaluate(()=>appBack());assert.equal(await p.locator('#modal').evaluate(x=>x.open),false);
await p.evaluate(()=>{project.events[0].stage=C.stageSettings({mood:'night',weather:'storm',layers:project.events[0].stage?.layers});persist();});
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
console.log('PASS',viewport,'staging tab without scroll, tool sheets, tap-again cancels, hold previews, areas (all/top/bottom), preset pages and swipe, undo, play camera/mood/warp/particles/overlays/layers, gain beat, cleanup, reduced motion.');}
await b.close();
// The exported player carries the runtime but not the editor tab.
const html=fs.readFileSync(path.join(__dirname,'assets/player-index.html'),'utf8');assert.match(html,/stage-fx\.js/);assert.doesNotMatch(html,/stage-editor\.js/);
assert.match(fs.readFileSync(path.join(__dirname,'src/com/example/splitstory/ApkExportEngine.java'),'utf8'),/"stage-fx\.js"/);
console.log('PASS exported player includes stage-fx.js only.');
})().catch(e=>{console.error(e);process.exit(1)});
