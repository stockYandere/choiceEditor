const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 기능 둘러보기 예제: installed once with the other examples, uses every kind of feature, plays to each ending with
// pictures, characters and staging on screen, and 예제로 새 게임 makes a fresh copy of it.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
const title='기능 둘러보기 · 비 오는 학교';
assert.equal(await p.evaluate(t=>store.games.filter(g=>g.draft.title===t).length,title),1,'installed once');
// The data really covers the features.
const cover=await p.evaluate(()=>{const s=SHOWCASE_SAMPLE,ev=s.events,ch=ev.flatMap(e=>e.choices),st=ev.map(e=>e.stage||{}),areas=st.flatMap(x=>[x.all,x.top,x.bottom].filter(Boolean)),texts=ev.flatMap(e=>[e.text,e.speaker,...e.choices.map(c=>c.text)]).join(' ');
 return {kinds:[...new Set(ev.map(e=>e.kind))].sort().join(),endings:[...new Set(ev.map(e=>e.ending).filter(Boolean))].sort().join(),groups:s.randomGroups.length,modes:[...new Set(ev.map(e=>e.mode))].sort().join(),
  reward:ch.some(c=>c.reward),branch:ch.some(c=>c.branch),hidden:ch.some(c=>c.hideLocked),remember:ch.some(c=>c.remember),ignore:ch.some(c=>c.ignoreEffects),money:ch.some(c=>c.requires==='@money'),
  types:[...new Set(s.definitions.map(d=>d.type))].sort().join(),combo:s.definitions.some(d=>(d.effects||[]).some(f=>f.with)),highlight:s.definitions.some(d=>d.highlight&&d.image&&d.sound),
  camera:areas.some(a=>a.camera),mood:areas.some(a=>a.mood),weather:areas.some(a=>a.weather),warp:areas.some(a=>a.warp),overlays:areas.some(a=>a.overlays?.length),transition:areas.some(a=>a.transition),beats:[...new Set(areas.flatMap(a=>(a.beats||[]).map(b=>b.when)))].sort().join(),
  areas:st.some(x=>x.top)&&st.some(x=>x.bottom),layers:st.some(x=>x.layers?.top)&&st.some(x=>x.layers?.bottom),flip:st.some(x=>x.layers&&Object.values(x.layers).some(l=>l.flip)),
  bgm:!!s.audio.bgm.credit&&ev.some(e=>e.audio?.bgmMode==='play'&&e.audio.bgm?.credit),keep:ev.some(e=>e.audio?.bgmMode==='keep'),stop:ev.some(e=>e.audio?.bgmMode==='stop'),scene:ev.some(e=>e.audio?.dialogue?.src?.startsWith('sounds/')),effects:Object.keys(s.audio.effects).length,
  variations:['{~','{&','{=','{@','{방문','{!','&','>=','<='].every(k=>texts.includes(k)),deathArt:!!s.finish.death.image,defaultArt:!!s.defaultArt.top.image,landing:!!s.landing.image,preset:s.stagePresets.length};});
assert.deepEqual(cover,{kinds:'branch,encounter,story',endings:'death,end',groups:2,modes:'both,bottom,full,top',reward:true,branch:true,hidden:true,remember:true,ignore:true,money:true,
 types:'ability,item,memory,state',combo:true,highlight:true,camera:true,mood:true,weather:true,warp:true,overlays:true,transition:true,beats:'choice,gain,loss,start',areas:true,layers:true,flip:true,
 bgm:true,keep:true,stop:true,scene:true,effects:2,variations:true,deathArt:true,defaultArt:true,landing:true,preset:1});
// Story check: nothing but notes.
assert.deepEqual(await p.evaluate(t=>C.inspect(store.games.find(g=>g.draft.title===t).draft).filter(x=>x.level!=='info').map(x=>x.message),title),[]);
// Play it to every ending: a fixed walk through the scenes, rendering each one on the play screen.
const walk=async(picks,want)=>{await p.evaluate(async t=>{const g=store.games.find(g=>g.draft.title===t);await openGame(g.id);await publishGame();await playGame(g.id,true);},title);
 for(let step=0;step<20;step++){await p.evaluate(()=>finishDialogue(true));const state=await p.evaluate(()=>({id:run.current,imgs:document.querySelectorAll('#stage img').length,ended:run.ended}));if(state.ended)break;assert(state.imgs>0,'pictures on '+state.id);
  await p.evaluate(pk=>{if(run.pendingReward){run.chooseReward(run.pendingReward.offers[0]);renderTest();return;}const e=run.p.events.find(x=>x.id===run.current);const ok=e.choices.filter(c=>!run.blocked(c));const c=ok.find(c=>pk.includes(c.id))||ok[0];window.__path=(window.__path||'')+' '+e.id+'>'+c.id;run.choose(c.id,()=>0);renderTest();},picks);await p.waitForTimeout(80);}
 const end=await p.evaluate(()=>({ended:run.ended,dead:run.dead,scene:run.endScene}));if(end.scene!==want.scene)console.log(await p.evaluate(()=>window.__path));await p.evaluate(()=>{window.__path='';});assert.deepEqual(end,want);};
await walk(['g-hi','h-help','c-lend','n-home','p-rest','hm-call','x'],{ended:true,dead:false,scene:'endTogether'});
await walk(['g-hi','s-buy','c-key','n-roof','rn-edge'],{ended:true,dead:true,scene:'deathRoof'});
// 예제로 새 게임 adds a fresh copy.
const before=await p.evaluate(()=>store.games.length);await p.evaluate(()=>{appBack();appBack();appBack();});await p.evaluate(()=>{showList('editor');});
await p.evaluate(async t=>{await openGame(store.games.find(g=>g.draft.title===t).id);},title);await p.locator('#files').click();const tabs=p.locator('#modal[open] [data-form-tab]');for(let i=0;i<await tabs.count();i++){await tabs.nth(i).click();if(await p.locator('#loadSample').isVisible())break;}
await p.locator('#loadSample').click();await p.locator('[data-sample=SHOWCASE_SAMPLE]').click();await p.waitForFunction(n=>store.games.length===n+1,before);assert.equal(await p.evaluate(()=>project.title),title);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 기능 둘러보기 예제: installed once, covers every feature kind, story check clean, plays to an ending and to a 사망 장면 with pictures, 예제로 새 게임 copies it.');
})().catch(e=>{console.error(e);process.exit(1)});
