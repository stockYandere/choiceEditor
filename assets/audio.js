(function(root){'use strict';
const cues={ability:'능력 획득',item:'아이템 획득',state:'상태 획득',money:'돈 획득',important:'특별 획득',recovery:'회복',loss:'손실',death:'사망',mixed:'손실과 획득'};
let project={},preferences={},enabled=true,suspended=false,context=null,key='',voice=null,voiceSlot=null,pendingVoice=null,effect=null,bgm=null,bgmRef='',preview=null;
const defaults={},errors=new Set();
const level=(n,fallback=100)=>Math.max(0,Math.min(100,Number.isFinite(n)?n:fallback))/100;
const track=s=>s&&GameCore.audio(s.src)?s:null;
function dispose(a){if(!a)return;a.pause();a.onended=a.onerror=a.onplaying=a.onloadedmetadata=null;try{a.removeAttribute('src');a.load();}catch(e){}}
function report(label,src){if(errors.has(src))return;errors.add(src);if(errors.size>16)errors.delete(errors.values().next().value);root.dispatchEvent(new CustomEvent('game-audio-error',{detail:label+' 소리를 재생하지 못했습니다.'}));}
function safePlay(a,label){if(!a||document.hidden||suspended)return;try{const result=a.play();result?.catch(e=>{if(e.name!=='AbortError'&&e.name!=='NotAllowedError')report(label,a.src);});}catch(e){report(label,a.src);}}
function create(slot,label){const a=new Audio(slot.src);a.preload='auto';a._volume=slot.volume;a.onerror=()=>{if(a===voice)stopVoice();if(a===bgm)stopBgm();if(a===effect)stopEffect();if(a===preview)stopPreview();report(label,slot.src);};return a;}
function volume(){if(bgm)bgm.volume=level(bgm._volume,30)*level(preferences.bgmVolume)*(voice&&!voice.paused&&voiceSlot?.kind!=='effect' ? .4 : 1);if(voice)voice.volume=level(voice._volume)*level(project.audio?.voiceVolume)*level(preferences.voiceVolume);if(effect)effect.volume=level(effect._volume)*level(project.audio?.effectsVolume)*level(preferences.effectsVolume);}
function prepareEffects(){for(const cue of Object.keys(cues))if(!defaults[cue]){const a=create({src:'sfx/'+cue+'.wav',volume:60},cues[cue]);a.load();defaults[cue]=a;}}
function stopEffect(){if(effect){effect.pause();try{effect.currentTime=0;}catch(e){}if(!Object.values(defaults).includes(effect))dispose(effect);effect=null;}}
function stopVoice(){pendingVoice=null;dispose(voice);voice=null;voiceSlot=null;volume();}
// A tap or skip stops a spoken line; a scene sound effect (kind 'effect') plays to its end.
function skipVoice(){if((pendingVoice||voiceSlot)?.kind==='effect')return;stopVoice();}
function stopPreview(){dispose(preview);preview=null;document.querySelectorAll('[data-audio-preview]').forEach(b=>{b.textContent='▶';b.setAttribute('aria-pressed','false');});}
function stopBgm(){dispose(bgm);bgm=null;bgmRef='';}
function stopAll(){capture(context);stopVoice();stopEffect();stopBgm();stopPreview();stopStage();context=null;key='';}
function setEnabled(v){enabled=!!v;if(!enabled){stopVoice();stopEffect();bgm?.pause();pauseStage();}else{if(context&&bgm&&bgm.paused&&!bgm.ended)safePlay(bgm,'BGM');resumeStage();}}
function configure(p,prefs){project=p||{};preferences=prefs||{};setEnabled(preferences.soundEnabled!==false);volume();}
function capture(run){if(run&&run===context&&run.audioState&&bgm)run.audioState.position=Number.isFinite(bgm.currentTime)?bgm.currentTime:0;}
function resolve(ref){return ref==='@default'?track(project.audio?.bgm):track(project.events?.find(e=>e.id===ref)?.audio?.bgm);}
function setBgm(slot,ref,position=0){
 if(!slot){stopBgm();return;}
 if(bgm&&bgm.src===slot.src&&!bgm.ended){bgmRef=ref;bgm._volume=slot.volume;bgm.loop=slot.loop!==false;volume();return;}
 stopBgm();bgmRef=ref;bgm=create(slot,'BGM');const a=bgm;a.loop=slot.loop!==false;
 if(position>0)a.onloadedmetadata=()=>{if(a!==bgm)return;try{a.currentTime=Number.isFinite(a.duration)?Math.min(position,Math.max(0,a.duration-.01)):position;}catch(e){}};
 volume();if(enabled)safePlay(a,'BGM');
}
function releaseVoice(){if(!pendingVoice||!context||!enabled||suspended||document.hidden)return;const slot=pendingVoice;pendingVoice=null;voiceSlot=slot;voice=create(slot,'대사');const a=voice;a.onplaying=volume;a.onended=()=>{if(voice===a){voice=null;dispose(a);volume();}};volume();safePlay(a,'대사');}
function enterScene(scene,sceneKey,run,defer=false){
 configure(run.p,preferences);if(context===run&&key===sceneKey)return;
 capture(context);stopVoice();stopEffect();
 const mode=scene?.audio?.bgmMode||'keep';
 if(context!==run){stopBgm();context=run;run.audioState||={bgm:'@default',position:0};if(mode==='keep')setBgm(resolve(run.audioState.bgm),run.audioState.bgm,run.audioState.position);}
 key=sceneKey;const state=run.audioState;
 if(mode==='stop'){stopBgm();state.bgm='';state.position=0;}
 else if(mode==='play'&&track(scene.audio.bgm)){const ref=scene.id;if(state.bgm!==ref){state.bgm=ref;state.position=0;}setBgm(scene.audio.bgm,ref,state.position);}
 pendingVoice=track(scene?.audio?.dialogue);if(!defer)releaseVoice();
}
function playEffect(cue,custom){stopEffect();if(!enabled||suspended||document.hidden)return;prepareEffects();const slot=track(custom)||track(project.audio?.effects?.[cue]);effect=slot?create(slot,cues[cue]||'효과음'):defaults[cue];if(!effect)return;volume();try{effect.currentTime=0;}catch(e){}safePlay(effect,cues[cue]||'효과음');}
function previewSound(slot,fallback,button){
 const stopping=preview&&preview._button===button;stopPreview();if(stopping)return;
 const source=track(slot)||{src:'sfx/'+fallback+'.wav',volume:60};preview=create(source,'미리 듣기');const a=preview;a._button=button;a.volume=level(source.volume,60);a.loop=false;
 a.onended=()=>{if(preview===a)stopPreview();};if(button){button.textContent='■';button.setAttribute('aria-pressed','true');}safePlay(a,'미리 듣기');
}
// 연출 sounds (StageFX.onSound): ambience loops per stage element and overlapping one-shots, from the built-in sounds/ folder.
// A stage's loop list is applied a moment later, so a re-render (clear, then enter again) keeps a running loop instead of restarting it.
const stageWanted=new Map(),stagePlaying=new Map(),stageShots=new Set();let stageTimer=0;
const stageVolume=o=>level(o?.volume,70)*level(preferences.effectsVolume);
function stageSource(id){return 'sounds/'+id+'.ogg';}
function applyStage(){stageTimer=0;
 for(const [root,want] of stageWanted){const now=stagePlaying.get(root)||new Map();
  for(const [id,a] of now)if(!want.on||!want.ids.includes(id)){dispose(a);now.delete(id);}
  if(want.on)for(const id of want.ids){let a=now.get(id);if(!a){a=create({src:stageSource(id),volume:100},'연출 효과음');a.loop=true;now.set(id,a);}a.volume=stageVolume(want);if(enabled&&a.paused)safePlay(a,'연출 효과음');}
  if(now.size)stagePlaying.set(root,now);else stagePlaying.delete(root);if(!want.ids.length)stageWanted.delete(root);}}
function stageSound(kind,arg,root,options={}){
 const on=options.on!==false;
 if(kind==='loops'){stageWanted.set(root,{ids:Array.isArray(arg)?arg:[],on,volume:options.volume});if(!stageTimer)stageTimer=setTimeout(applyStage,0);return;}
 if(kind!=='once'||!on||!enabled||suspended||document.hidden)return;
 const a=create({src:stageSource(arg),volume:100},'연출 효과음');a.volume=stageVolume(options);stageShots.add(a);a.onended=()=>{stageShots.delete(a);dispose(a);};
 if(stageShots.size>6){const old=stageShots.values().next().value;stageShots.delete(old);dispose(old);}safePlay(a,'연출 효과음');}
function stopStage(){clearTimeout(stageTimer);stageTimer=0;stageWanted.clear();for(const m of stagePlaying.values())for(const a of m.values())dispose(a);stagePlaying.clear();for(const a of stageShots)dispose(a);stageShots.clear();}
function pauseStage(){for(const m of stagePlaying.values())for(const a of m.values())a.pause();for(const a of stageShots)dispose(a);stageShots.clear();}
function resumeStage(){if(!enabled||suspended||document.hidden)return;for(const m of stagePlaying.values())for(const a of m.values())if(a.paused)safePlay(a,'연출 효과음');}
function suspend(){capture(context);suspended=true;stopVoice();stopEffect();stopPreview();bgm?.pause();pauseStage();}
function resume(){suspended=false;if(context&&enabled&&!document.hidden&&bgm&&!bgm.ended)safePlay(bgm,'BGM');resumeStage();}
function unlock(){resumeStage();if(!context||!enabled||suspended)return;if(bgm&&bgm.paused&&!bgm.ended)safePlay(bgm,'BGM');if(voice&&voice.paused&&!voice.ended)safePlay(voice,'대사');}
document.addEventListener('pointerdown',unlock,true);
root.GameAudio={cues,prepareEffects,configure,setEnabled,enterScene,releaseVoice,stopVoice,skipVoice,stopEffect,playEffect,previewSound,stopPreview,stopAll,stageSound,stopStage,suspend,resume,capture,voiceActive:()=>!!voice&&!voice.paused,getState:()=>({voice,bgm,effect,preview,bgmRef,pending:!!pendingVoice,stageLoops:[...stagePlaying.values()].flatMap(m=>[...m.keys()]),stageShots:[...stageShots].map(a=>a.src.split('/').pop())})};
})(globalThis);
