(function(root){'use strict';const Themes=typeof module!=='undefined'?require('./themes.js'):root.GameThemes;
const Variations=typeof module!=='undefined'?require('./variations.js'):root.GameVariations;const resources={'@hp':'체력','@mental':'멘탈','@money':'돈'};const uid=()=> 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);// An exported game APK keeps its pictures and sounds as files next to the page (media/<hash>.<ext>).
let packedMedia=false;const librarySound=/^sounds\/[a-z0-9-]{1,40}\.ogg$/,packedImage=/^media\/[a-f0-9]{32}\.(webp|png|jpg)$/,packedAudio=/^media\/[a-f0-9]{32}\.(ogg|mp3|wav|m4a|aac|flac|webm)$/;const allowPackedMedia=v=>{packedMedia=!!v;};
const mapPoint=m=>m===undefined||!!m&&typeof m==='object'&&!Array.isArray(m)&&Number.isFinite(m.x)&&Number.isFinite(m.y)&&Math.abs(m.x)<=100000&&Math.abs(m.y)<=100000;
// 랜덤 인카운터 묶음: 'random' rolls the 기본 묶음, 'random:<id>' a named one (p.randomGroups); a scene joins with e.randomGroup.
const randomGroupOf=n=>n==='random'?'':typeof n==='string'&&n.startsWith('random:')?n.slice(7):null;
// 조건·얻기·잃기 여러 개: the first keeps the old fields (requires/gain/lose, branch.when) and up to MORE more ride in *More lists.
const MORE=2;
const listOf=(id,count,not,more)=>id?[{id,count:count??1,not:!!not},...(more||[]).map(x=>({id:x.id,count:x.count??1,not:!!x.not}))]:[];
const needsOf=c=>listOf(c?.requires,c?.requiresCount,c?.requiresNot,c?.requiresMore);
const whensOf=b=>listOf(b?.when,b?.count,b?.whenNot,b?.whenMore);
const gainsOf=o=>listOf(o?.gain,o?.gainCount,false,o?.gainMore).map(({id,count})=>({id,count}));
const losesOf=o=>listOf(o?.lose,o?.loseCount,false,o?.loseMore).map(({id,count})=>({id,count}));
// Writes a list back into the old fields plus *More (dropping empty extras), so older readers still see the first one.
function setNeeds(c,list,any){const [a,...more]=list;c.requires=a?.id||'';c.requiresCount=a?.count??1;if(a?.not)c.requiresNot=true;else delete c.requiresNot;if(more.length)c.requiresMore=more.map(x=>x.not?{id:x.id,count:x.count,not:true}:{id:x.id,count:x.count});else delete c.requiresMore;if(any&&list.length>1)c.requiresAny=true;else delete c.requiresAny;}
function setWhens(b,list,any){const [a,...more]=list;b.when=a?.id||'';b.count=a?.count??1;if(a?.not)b.whenNot=true;else delete b.whenNot;if(more.length)b.whenMore=more.map(x=>x.not?{id:x.id,count:x.count,not:true}:{id:x.id,count:x.count});else delete b.whenMore;if(any&&list.length>1)b.whenAny=true;else delete b.whenAny;}
function setItems(o,key,list){const [a,...more]=list;o[key]=a?.id||'';o[key+'Count']=a?.count??1;if(more.length)o[key+'More']=more.map(x=>({id:x.id,count:x.count}));else delete o[key+'More'];}
const image=s=>typeof s==='string'&&(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)||packedMedia&&packedImage.test(s))?s:null;const audio=s=>typeof s==='string'&&s.length<=34000000&&(/^data:audio\/(mpeg|mp3|wav|wave|x-wav|ogg|mp4|x-m4a|aac|flac|webm);base64,[A-Za-z0-9+/=]+$/.test(s)||librarySound.test(s)||packedMedia&&packedAudio.test(s))?s:null;
// A built-in sound is a bundled file (sounds/<id>.ogg) or, for downloaded music, a data URL carrying its credit.
const creditText=v=>v===undefined||typeof v==='string'&&v.length<=300;
function soundSlot(s){if(s&&(s.lib!==undefined&&!(typeof s.lib==='string'&&/^[a-z0-9-]{1,40}$/.test(s.lib))||s.credit!==undefined&&(!s.credit||typeof s.credit!=='object'||Array.isArray(s.credit)||!['title','author','license','url'].every(k=>creditText(s.credit[k])))))throw Error('소리 출처 형식');if(!s||typeof s!=='object'||!audio(s.src)||typeof s.name!=='string'||s.name.length>200||s.volume!==undefined&&(!Number.isInteger(s.volume)||s.volume<0||s.volume>100)||s.loop!==undefined&&typeof s.loop!=='boolean'||s.kind!==undefined&&!['voice','effect'].includes(s.kind))throw Error('소리 파일 또는 음량 형식');}// Scene staging (연출): every option is code on top of the scene's own pictures, so it adds no media.
const STAGE={camera:['none','zoomIn','zoomOut','panLeft','panRight','panUp','panDown','drift','sway','breathe','tilt'],target:['both','top','bottom'],speed:['normal','slow','fast'],
 mood:['none','day','night','dusk','dawn','memory','danger','dream','cold','mono','faded','vivid','horror','neon'],
 weather:['none','rain','storm','snow','fog','dust','embers','petals','leaves','fireflies','stars','bubbles','ash','sparkles'],
 warp:['none','water','heat','dream','wobble'],
 overlays:['vignette','grain','scanlines','letterbox','lightRays','haze','glow','frame'],
 transition:['cut','fade','blackFade','whiteFade','wipeLeft','wipeRight','wipeDown','wipeUp','iris','blinds','slide','zoom','glitch','dissolve','flashCut'],
 when:['start','choice','gain','loss'],
 fx:['flash','whiteFlash','redFlash','blackout','shake','bigShake','pulse','glitch','zoomPunch','lightning','blur','tint'],
 enter:['none','fade','slideLeft','slideRight','rise','pop','drop'],
 motion:['none','breathe','bob','sway','float','tremble']};
// One area's staging: the whole stage ('all') or one picture slot ('top'/'bottom').
function stageArea(s){if(!s||typeof s!=='object'||Array.isArray(s))throw Error('연출 형식');const pick=(v,list)=>list.includes(v)?v:list[0],num=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):d;};
 return {camera:pick(s.camera,STAGE.camera),cameraSpeed:pick(s.cameraSpeed,STAGE.speed),mood:pick(s.mood,STAGE.mood),moodStrength:num(s.moodStrength,20,100,100),weather:pick(s.weather,STAGE.weather),weatherAmount:num(s.weatherAmount,1,3,2),warp:pick(s.warp,STAGE.warp),overlays:Array.isArray(s.overlays)?STAGE.overlays.filter(o=>s.overlays.includes(o)):[],transition:pick(s.transition,STAGE.transition),sound:s.sound!==false,beats:(Array.isArray(s.beats)?s.beats:[]).filter(b=>b&&STAGE.when.includes(b.when)&&STAGE.fx.includes(b.fx)).slice(0,6).map(b=>({when:b.when,fx:b.fx}))};}
const stageAreaEmpty=a=>a.sound!==false&&a.camera==='none'&&a.mood==='none'&&a.weather==='none'&&a.warp==='none'&&!a.overlays.length&&a.transition==='cut'&&!a.beats.length;
// A scene's staging: {all, top?, bottom?, layers?}. An older flat setting means 'all' (a camera target moves that camera to its slot).
function stageSettings(s,withLayers=true){if(!s||typeof s!=='object'||Array.isArray(s))throw Error('연출 형식');let src=s;
 if(!('all' in s)&&!('top' in s)&&!('bottom' in s)){src={all:{...s}};const t=s.cameraTarget;if(t==='top'||t==='bottom'){src[t]={camera:s.camera,cameraSpeed:s.cameraSpeed};src.all.camera='none';}}
 const out={all:stageArea(src.all||{})};for(const k of ['top','bottom'])if(src[k]){const a=stageArea(src[k]);if(!stageAreaEmpty(a))out[k]=a;}
 if(withLayers&&s.layers!==undefined){if(!s.layers||typeof s.layers!=='object')throw Error('연출 인물 형식');const num=(v,min,max,d)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):d;},pick=(v,list)=>list.includes(v)?v:list[0];out.layers={};for(const k of ['top','bottom']){const l=s.layers[k];if(!l)continue;if(!image(l.image))throw Error('연출 인물 그림 형식');out.layers[k]={image:l.image,x:num(l.x,0,100,50),y:num(l.y,0,100,100),scale:num(l.scale,20,150,85),enter:pick(l.enter,STAGE.enter),motion:pick(l.motion,STAGE.motion),flip:l.flip===true};}if(!Object.keys(out.layers).length)delete out.layers;}
 return out;}
function soundSettings(s){if(!s||typeof s!=='object')throw Error('소리 설정 형식');if(s.stageSound!==undefined&&typeof s.stageSound!=='boolean')throw Error('연출 효과음 설정');for(const k of ['voiceVolume','effectsVolume','stageVolume'])if(s[k]!==undefined&&(!Number.isInteger(s[k])||s[k]<0||s[k]>100))throw Error('소리 음량 형식');for(const k of ['bgm','dialogue'])if(s[k])soundSlot(s[k]);if(s.bgmMode!==undefined&&!['keep','play','stop'].includes(s.bgmMode))throw Error('BGM 진행 설정');if(s.effects){if(typeof s.effects!=='object'||Array.isArray(s.effects))throw Error('효과음 설정');for(const [k,v]of Object.entries(s.effects)){if(!['ability','item','state','money','important','recovery','loss','death','mixed'].includes(k))throw Error('효과음 종류');soundSlot(v);}}}const imageOffset=n=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;const effectKinds={hpLoss:'체력 소모 감소',mentalLoss:'멘탈 소모 감소',moneyLoss:'돈 소모 감소',hpGain:'체력 회복 증가',mentalGain:'멘탈 회복 증가',moneyGain:'돈 획득 증가'};
// Up to MORE extra conditions/items after the first; no extras without a first, no repeats.
function validateMore(o,key,known,withNot=false,moreKey=key+'More'){const more=o[moreKey];if(more===undefined)return;if(!Array.isArray(more)||more.length>MORE||more.length&&!o[key])throw Error('여러 조건·항목 형식');const seen=new Set([o[key]]);for(const x of more){if(!x||typeof x!=='object'||!known(x.id)||seen.has(x.id)||!Number.isInteger(x.count)||x.count<1||x.count>99||x.not!==undefined&&(!withNot||typeof x.not!=='boolean'))throw Error('여러 조건·항목 형식');seen.add(x.id);}}
function validateRogue(p){
const ids=new Set(p.definitions.map(d=>d.id));
for(const d of p.definitions)if(d.effects!==undefined){if(!Array.isArray(d.effects)||d.effects.length>2)throw Error('보유 효과는 기본·조합 각 하나까지입니다.');const slots=new Set();for(const f of d.effects){const slot=f.with?'combo':'base';if(slots.has(slot)||!Object.hasOwn(effectKinds,f.kind)||!Number.isInteger(f.amount)||f.amount<1||f.amount>99||f.with!==undefined&&(typeof f.with!=='string'||f.with&&(!ids.has(f.with)||f.with===d.id)))throw Error('보유 효과와 조합 항목을 확인하세요.');slots.add(slot);}}
for(const e of p.events)for(const c of e.choices){if(c.ignoreEffects!==undefined&&typeof c.ignoreEffects!=='boolean')throw Error('보유 효과 적용 설정');if(c.reward!==undefined){const r=c.reward;if(!r||!Array.isArray(r.pool)||r.pool.length>300||new Set(r.pool).size!==r.pool.length||r.pool.some(id=>!ids.has(id))||!Number.isInteger(r.count)||r.count<1||r.count>99)throw Error('랜덤 보상 후보와 수량을 확인하세요.');}}
}
function artDefault(p,k){const configured=p.defaultArt?.[k];return configured?{image:image(configured.image),text:configured.text||''}:{image:image(p.sampleImage),text:k==='top'?'위 그림':'아래 그림'};}
function art(p,e,k){const slot=e[k]||{},fallback=artDefault(p,k),inactive=e.mode==='top'&&k==='bottom'||e.mode==='bottom'&&k==='top'||e.mode==='full'&&k==='bottom';if(inactive)return {image:null,text:'',y:35,fit:'cover'};const own=image(slot.image);if(!own&&slot.empty)return {image:null,text:'',y:35,fit:'cover'};return {image:own||fallback.image,text:fallback.text,y:slot.y??35,fit:slot.fit==='contain'?'contain':'cover'};}
function validateDefaultArt(p){if(p.defaultArt!==undefined){if(!p.defaultArt||typeof p.defaultArt!=='object'||Array.isArray(p.defaultArt))throw Error('기본 그림 설정 형식');for(const [k,s]of Object.entries(p.defaultArt)){if(!['top','bottom'].includes(k)||!s||typeof s!=='object'||Array.isArray(s)||s.image&&!image(s.image)||s.text!==undefined&&(typeof s.text!=='string'||s.text.length>300))throw Error('기본 그림·대체 문구를 확인하세요.');}}}
function fresh(){return {format:'event-vn',version:1,title:'새 이야기',theme:'cream',panelTransparency:0,manualSaves:true,hp:3,maxHp:3,mental:3,money:3,randomStart:2,defaultArt:{top:{text:''},bottom:{text:''}},definitions:[],events:[]}}function event(){return {id:uid(),title:'새 사건',speaker:'',text:'',kind:'story',once:true,mode:'both',top:{},bottom:{},choices:[choice()]}}function choice(){return{id:uid(),text:'계속',hp:0,mental:0,money:0,gain:'',lose:'',requires:'',requiresCount:1,gainCount:1,loseCount:1,next:'sequence'}}function validate(p){if(!p||p.format!=='event-vn'||p.version!==1||!Array.isArray(p.events)||!p.events.length||p.events.length>1000||!Array.isArray(p.definitions)||p.definitions.length>300)throw Error('프로젝트 형식을 확인하세요.');if(!Number.isInteger(p.maxHp)||p.maxHp<1||p.maxHp>99||!Number.isInteger(p.hp)||p.hp<1||p.hp>p.maxHp)throw Error('시작 체력과 최대 체력을 확인하세요.');if(p.manualSaves!==undefined&&typeof p.manualSaves!=='boolean')throw Error('수동 저장 설정을 확인하세요.');p.mental??=3;p.money??=3;p.randomStart??=0;if(!Number.isInteger(p.mental)||p.mental<1||p.mental>3||!Number.isInteger(p.money)||p.money<0||p.money>3||![0,2].includes(p.randomStart))throw Error('시작 멘탈·돈·능력');if(p.panelTransparency!==undefined&&(!Number.isInteger(p.panelTransparency)||p.panelTransparency<0||p.panelTransparency>100))throw Error('창 투명도를 확인하세요.');if(p.stagePresets!==undefined){if(!Array.isArray(p.stagePresets)||p.stagePresets.length>30)throw Error('연출 프리셋 형식');p.stagePresets=p.stagePresets.map(x=>{if(!x||typeof x.name!=='string'||!x.name.trim()||x.name.length>40)throw Error('연출 프리셋 이름');return {name:x.name.trim(),stage:stageArea(x.stage?.all||x.stage||{})};});}if(!mapPoint(p.hubMap))throw Error('구조도 위치 형식');if(p.landing!==undefined){const l=p.landing;if(!l||typeof l!=='object'||Array.isArray(l)||l.image&&!image(l.image)||['intro','author','credits'].some(k=>l[k]!==undefined&&(typeof l[k]!=='string'||l[k].length>({intro:160,author:80,credits:4000}[k]))))throw Error('메인 화면·크레딧 형식을 확인하세요.');}if(p.finish!==undefined){const f=p.finish;if(!f||typeof f!=='object'||Array.isArray(f)||f.deathText!==undefined&&(typeof f.deathText!=='string'||f.deathText.length>1000)||f.death!==undefined&&(!f.death||typeof f.death!=='object'||Array.isArray(f.death))||f.death?.image&&!image(f.death.image))throw Error('사망 연출 설정');}if(p.landing){for(const k of ['cover','icon']){const v=p.landing[k];if(v!==undefined){if(!v||typeof v!=='object'||Array.isArray(v)||v.image&&!image(v.image)||['x','y'].some(a=>v[a]!==undefined&&(!Number.isFinite(v[a])||v[a]<0||v[a]>100))||v.zoom!==undefined&&(!Number.isFinite(v.zoom)||v.zoom<1||v.zoom>4))throw Error('메인 그림·아이콘 구도 설정');}}}if(p.theme!==undefined&&!Themes.valid(p.theme))throw Error('화면 테마를 확인하세요.');if(p.audio)soundSettings(p.audio);if(p.sampleImage&&!image(p.sampleImage))throw Error('예제 이미지 형식');const ids=new Set();function id(v){if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(v)||ids.has(v))throw Error('중복된 항목');ids.add(v)}for(const d of p.definitions){id(d.id);if(typeof d.name!=='string'||!d.name.trim()||d.name.length>80||!['item','ability','state','memory'].includes(d.type)||!Number.isInteger(d.initial)||d.initial<0||d.initial>99)throw Error('능력·아이템 형식');if(d.sound)soundSlot(d.sound);if(d.image&&!image(d.image))throw Error('획득 연출 이미지 형식');if(d.highlight!==undefined&&typeof d.highlight!=='boolean')throw Error('획득 강조 형식');for(const k of ['imageX','imageY'])if(d[k]!==undefined)d[k]=imageOffset(d[k])}const defs=new Set(p.definitions.map(d=>d.id)),evs=new Set(p.events.map(e=>e.id));if(p.randomGroups!==undefined){if(!Array.isArray(p.randomGroups)||p.randomGroups.length>20)throw Error('랜덤 묶음 형식');const seenG=new Set(),seenN=new Set();for(const g of p.randomGroups){if(!g||typeof g!=='object'||typeof g.id!=='string'||!/^g[a-z0-9]{1,24}$/.test(g.id)||seenG.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>30||seenN.has(g.name.trim())||!mapPoint(g.map))throw Error('랜덤 묶음 형식');g.name=g.name.trim();seenG.add(g.id);seenN.add(g.name);}}
const groupIds=new Set((p.randomGroups||[]).map(g=>g.id)),groupOk=n=>{const g=randomGroupOf(n);return g!==null&&(g===''||groupIds.has(g));};
for(const e of p.events){if(e.randomGroup!==undefined&&!groupIds.has(e.randomGroup))throw Error('랜덤 묶음 연결');}
for(const e of p.events){id(e.id);if(typeof e.title!=='string'||typeof e.text!=='string'||e.text.length>10000||typeof e.speaker!=='string'||!Array.isArray(e.choices)||e.choices.length<1||e.choices.length>6)throw Error('사건 형식');if(e.audio)soundSettings(e.audio);if(e.stage!==undefined)e.stage=stageSettings(e.stage);delete e.requires;if(!['story','encounter','branch'].includes(e.kind))e.kind='story';if(e.ending!==undefined&&!['end','death'].includes(e.ending))throw Error('끝 장면 형식');if(e.endLabel!==undefined&&(typeof e.endLabel!=='string'||e.endLabel.length>100))throw Error('사망 사유·엔딩 이름');if(!mapPoint(e.map)||e.choices.some(c=>!mapPoint(c.map)))throw Error('구조도 위치 형식');for(const k of ['top','bottom']){e[k]||={};if(e[k].image&&!image(e[k].image))throw Error('이미지 형식');e[k].y=Math.max(0,Math.min(100,Number(e[k].y??35)));e[k].fit=e[k].fit==='contain'?'contain':'cover'}if(!['both','top','bottom','full'].includes(e.mode))e.mode='both';for(const c of e.choices){id(c.id);if(typeof c.text!=='string'||!Number.isInteger(c.hp)||Math.abs(c.hp)>99)throw Error('선택 결과');for(const k of ['gain','lose','requires','remember'])if(c[k]&&!defs.has(c[k])&&!(k==='requires'&&resources[c[k]]))throw Error('선택 조건');
for(const k of ['requiresNot','hideLocked','requiresAny'])if(c[k]!==undefined&&typeof c[k]!=='boolean')throw Error('선택 조건 표시 설정');validateMore(c,'requires',x=>defs.has(x)||!!resources[x],true);validateMore(c,'gain',x=>defs.has(x));validateMore(c,'lose',x=>defs.has(x));for(const k of ['mental','money']){c[k]??=0;if(!Number.isInteger(c[k])||Math.abs(c[k])>3)throw Error('멘탈·돈 변화');}for(const k of ['requiresCount','gainCount','loseCount']){c[k]??=1;if(!Number.isInteger(c[k])||c[k]<1||c[k]>99)throw Error('요구·획득·소모 수량');}if(!['sequence','end'].includes(c.next)&&!evs.has(c.next)&&!groupOk(c.next))throw Error('다음 사건 연결');if(c.branch){const b=c.branch;for(const k of ['gainCount','loseCount']){b[k]??=1;if(!Number.isInteger(b[k])||b[k]<1||b[k]>99)throw Error('보유 조건 결과 수량');}if((!defs.has(b.when)&&!resources[b.when])||!Number.isInteger(b.count)||b.count<1||b.count>99||!Number.isInteger(b.hp)||Math.abs(b.hp)>99)throw Error('추가 분기 조건');for(const k of ['mental','money']){b[k]??=0;if(!Number.isInteger(b[k])||Math.abs(b[k])>3)throw Error('추가 분기 멘탈·돈');}for(const k of ['gain','lose'])if(b[k]&&!defs.has(b[k]))throw Error('추가 분기 결과');for(const k of ['whenNot','whenAny'])if(b[k]!==undefined&&typeof b[k]!=='boolean')throw Error('추가 분기 조건');validateMore(b,'when',x=>defs.has(x)||!!resources[x],true,'whenMore');validateMore(b,'gain',x=>defs.has(x));validateMore(b,'lose',x=>defs.has(x));if(!['sequence','end'].includes(b.next)&&!evs.has(b.next)&&!groupOk(b.next))throw Error('추가 분기 연결');}}}validateDefaultArt(p);validateRogue(p);return p}
class Run {
constructor(p,rng=Math.random){this.p=p;this.audioState={bgm:'@default',position:0};this.hp=p.hp;this.mental=p.mental??3;this.money=p.money??3;this.bag=Object.fromEntries(p.definitions.map(d=>[d.id,d.initial]));this.recent=p.definitions.filter(d=>d.initial>0).map(d=>d.id).reverse();this.visited=new Set();this.current=p.events[0]?.id;
this.visits=this.current?{[this.current]:1}:{};this.storyIndex=p.events[0]?.kind==='story'?0:-1;this.ended=!this.current;this.dead=false;this.message='';this.lastChange=null;this.trail=[];this.dialogueHistory=[];this.dialogueHistoryOmitted=0;this.log=[];this.turn=0;this.deathReason='';this.endScene='';this.endNote='';this.pendingReward=null;if(p.randomStart===2){const pool=p.definitions.filter(d=>d.type==='ability'&&!this.bag[d.id]);for(let i=0;i<2&&pool.length;i++){const [d]=pool.splice(Math.floor(rng()*pool.length),1);this.bag[d.id]=1;this.recent=[d.id,...this.recent];}}this.enterEnding(p.events[0]);}
// Only authored encounter membership and repetition control the random pool.
eligible(group=''){return this.p.events.filter(e=>e.kind==='encounter'&&(e.randomGroup||'')===group&&(!e.once||!this.visited.has(e.id)));}
value(id){return id==='@hp'?this.hp:id==='@mental'?this.mental:id==='@money'?this.money:(this.bag[id]||0);}
// One condition holds when the amount reaches its count (or, for '없을 때', does not); a list needs all, or any with *Any.
holds(x){return (this.value(x.id)>=x.count)!==x.not;}
met(list,any){return !list.length||(any?list.some(x=>this.holds(x)):list.every(x=>this.holds(x)));}
outcome(c){const whens=whensOf(c.branch);return whens.length&&this.met(whens,c.branch.whenAny)?c.branch:c;}
resolved(c){const base=this.outcome(c),out={...base,effectNotes:[]};if(c.ignoreEffects)return out;for(const key of ['hp','mental','money']){const original=base[key]||0;if(!original)continue;const kind=key+(original<0?'Loss':'Gain'),matches=[];for(const d of this.p.definitions){if(!this.bag[d.id])continue;for(const f of d.effects||[])if(f.kind===kind&&(!f.with||this.bag[f.with]>0))matches.push({d,f});}let remaining=original<0?Math.abs(original):Math.max(0,(key==='hp'?this.p.maxHp:3)-this[key]-original);for(const {d,f}of matches){const n=Math.min(remaining,f.amount);if(!n)continue;remaining-=n;out[key]=(out[key]||0)+n;out.effectNotes.push({name:d.name+(f.with?' + '+this.name(f.with):''),key,from:original,to:out[key],amount:n});}}
return out;}
blocked(c){if(this.pendingReward)return '@reward';if(c.reward&&!c.reward.pool.length)return '@reward';const needs=needsOf(c);if(!this.met(needs,c.requiresAny))return (needs.find(x=>!this.holds(x))||needs[0]).id;const out=this.resolved(c);if(out.money<0&&this.money<Math.abs(out.money))return '@money';for(const x of losesOf(out))if((this.bag[x.id]||0)<x.count)return x.id;return '';}
choose(id,rng=Math.random){
if(this.ended||this.pendingReward)return false;
const e=this.p.events.find(e=>e.id===this.current),c=e?.choices.find(c=>c.id===id);
if(!c||this.blocked(c))return false;
const alternate=this.outcome(c)!==c,out=this.resolved(c),before=this.hp,mentalBefore=this.mental,moneyBefore=this.money;
// Record the words the player actually read, before this choice changes any quality.
const saidSpeaker=this.say(e.speaker,e),saidText=this.say(e.text,e),saidChoice=this.say(c.text,e);this.turn++;
if(e.kind==='story')this.storyIndex=this.p.events.indexOf(e);
this.visited.add(e.id);this.hp=Math.max(0,Math.min(this.p.maxHp,this.hp+out.hp));
this.mental=Math.max(0,Math.min(3,this.mental+(out.mental??0)));this.money=Math.max(0,Math.min(3,this.money+(out.money??0)));const changes=[],items=[],delta=this.hp-before,mentalDelta=this.mental-mentalBefore,moneyDelta=this.money-moneyBefore;
if(delta)changes.push('체력 '+before+' → '+this.hp+' ('+(delta>0?'+':'')+delta+')');
for(const [label,from,to]of[['멘탈',mentalBefore,this.mental],['돈',moneyBefore,this.money]])if(to!==from)changes.push(label+' '+from+' → '+to+' ('+(to>from?'+':'')+(to-from)+')');
for(const {id,count:n}of losesOf(out)){this.bag[id]-=n;if(!this.isMemory(id)){items.push({id,delta:-n});changes.push(this.name(id)+' −'+n);}}
for(const {id,count:n}of gainsOf(out)){this.bag[id]=(this.bag[id]||0)+n;if(!this.isMemory(id)){items.push({id,delta:n});changes.push(this.name(id)+' +'+n);this.recent=[id,...this.recent.filter(x=>x!==id)];}}
// A remembered choice is a quiet mark: later lines and conditions can read it.
if(c.remember)this.bag[c.remember]=Math.max(1,this.bag[c.remember]||0);
this.lastChange={before,after:this.hp,hp:delta,mental:mentalDelta,mentalBefore,mentalAfter:this.mental,money:moneyDelta,moneyBefore,moneyAfter:this.money,items,alternate,effects:out.effectNotes,choice:saidChoice};
this.message=changes.join(' · ')||'변화 없음';
const entry={speaker:saidSpeaker,text:saidText,choice:saidChoice,result:this.message};this.trail.push(entry);this.dialogueHistory.push({...entry});if(this.dialogueHistory.length>1000){this.dialogueHistory.shift();this.dialogueHistoryOmitted++;}
if(changes.length)this.log.push({turn:this.turn,choice:saidChoice,result:this.message});if(this.log.length>30)this.log.shift();
if(this.hp<=0||this.mental<=0){this.dead=true;this.ended=true;this.deathReason=this.hp<=0?'체력':'멘탈';this.message+=' · '+this.deathReason+' 0 · 사망';return true;}
if(c.reward){const pool=[...c.reward.pool],offers=[];while(pool.length&&offers.length<3){offers.push(pool.splice(Math.min(pool.length-1,Math.max(0,Math.floor(rng()*pool.length))),1)[0]);}this.pendingReward={choice:c.id,offers,count:c.reward.count,next:out.next};return true;}
return this.advance(out.next,rng);
}
chooseReward(id,rng=Math.random){const pending=this.pendingReward;if(this.ended||!pending||!pending.offers.includes(id))return false;const n=pending.count;this.bag[id]=(this.bag[id]||0)+n;this.recent=[id,...this.recent.filter(x=>x!==id)];this.lastChange={before:this.hp,after:this.hp,hp:0,mental:0,money:0,items:[{id,delta:n}],alternate:false,choice:'보상 선택'};this.message=this.name(id)+' +'+n;this.log.push({turn:this.turn,choice:'보상 선택',result:this.message});if(this.log.length>30)this.log.shift();const last=this.trail[this.trail.length-1];if(last)last.result+=' · '+this.message;const historyLast=this.dialogueHistory[this.dialogueHistory.length-1];if(historyLast)historyLast.result+=' · '+this.message;this.pendingReward=null;return this.advance(pending.next,rng);}
advance(next,rng=Math.random){
if(next==='end'){this.ended=true;return true;}
let target;
const group=randomGroupOf(next);
if(group!==null){
const pool=this.eligible(group);
if(!pool.length){this.ended=true;this.message+=' · 남은 랜덤 인카운터가 없습니다.';}
else target=pool[Math.floor(rng()*pool.length)];
}else if(next==='sequence'){
target=this.p.events.find((x,i)=>i>this.storyIndex&&x.kind==='story');
if(!target)this.ended=true;
}else target=this.p.events.find(x=>x.id===next);
if(target){this.current=target.id;this.visits[target.id]=(this.visits[target.id]||0)+1;if(target.kind==='story')this.storyIndex=this.p.events.indexOf(target);if(target.kind!=='branch')this.trail=[];this.enterEnding(target);}
return true;
}
// An ending scene (엔딩 장면 / 사망 장면) ends the run on its own text and picture; a 사망 장면 is a special death, apart from 체력·멘탈 0.
enterEnding(e){if(!e?.ending)return;this.ended=true;this.dead=e.ending==='death';this.endScene=e.id;this.endNote=(e.endLabel||'').trim()||e.title.trim();}
name(id){return resources[id]||this.p.definitions.find(d=>d.id===id)?.name||'';}
isMemory(id){return this.p.definitions.find(d=>d.id===id)?.type==='memory';}
// Values a line of text can read: 체력/멘탈/돈, 방문, item names and @scene titles.
textValue(name,e){if(name==='체력')return this.hp;if(name==='멘탈')return this.mental;if(name==='돈')return this.money;if(name==='방문')return this.visits?.[e?.id]||(e?.id===this.current?1:0);
if(name.startsWith('@')){const scene=this.p.events.find(x=>x.title.trim()===name.slice(1).trim());return scene?(this.visits?.[scene.id]||(this.visited.has(scene.id)?1:0)):undefined;}
const d=this.p.definitions.find(d=>d.name===name);return d?(this.bag[d.id]||0):undefined;}
say(text,e=this.p.events.find(x=>x.id===this.current)){return Variations.render(text||'',{value:n=>this.textValue(n,e),visits:this.visits?.[e?.id]||1,seed:(e?.id||'')+':'+this.turn});}
// Choices whose author asked to hide them while they cannot be taken.
visibleChoices(e){return (e?.choices||[]).filter(c=>!(c.hideLocked&&this.blocked(c)));}
}

function inspect(p){
const issues=[],events=p.events||[],live=events.filter(e=>!e.ending),defs=p.definitions||[],ids=new Set(events.map(e=>e.id)),pool=events.filter(e=>e.kind==='encounter'),poolOf=g=>pool.filter(e=>(e.randomGroup||'')===g),groupName=g=>g?(p.randomGroups||[]).find(x=>x.id===g)?.name||'묶음':'기본';
const add=(e,message,level='warning',choice='')=>issues.push({event:e?.id||'',choice,message,level});
const edges=new Map(events.map(e=>[e.id,new Set()]));edges.set('@storyHub',new Set(events.filter(e=>e.kind==='story').map(e=>e.id)));for(const g of ['',...(p.randomGroups||[]).map(x=>x.id)])edges.set('@encounterHub:'+g,new Set(poolOf(g).map(e=>e.id)));const nameCounts=new Map();for(const e of events)nameCounts.set(e.title.trim(),(nameCounts.get(e.title.trim())||0)+1);
for(const e of events){
const index=events.indexOf(e);
if(e.audio?.bgmMode==='play'&&!e.audio.bgm)add(e,'재생할 BGM 파일을 선택하세요.','error');
if(!e.title.trim())add(e,'사건 이름을 입력하세요.');
if(!e.text.trim())add(e,'대사·상황 설명이 비어 있습니다.');
if(nameCounts.get(e.title.trim())>1)add(e,'같은 이름의 사건이 있어 연결할 때 헷갈릴 수 있습니다.');
if(e.ending)continue;
if(!e.choices.length)add(e,'선택지가 없어 진행할 수 없습니다.','error');
if(e.choices.length&&e.choices.every(c=>c.requires||c.lose||c.money<0||c.branch?.lose||c.branch?.money<0))add(e,'모든 선택에 보유 조건·소모가 있습니다. 보유량에 따라 길이 막힐 수 있어요.');
for(const c of e.choices){
if(!c.text.trim())add(e,'선택지 문구가 비어 있습니다.','error',c.id);
for(const out of [c,...(c.branch?[c.branch]:[])]){
const n=out.next;
if(randomGroupOf(n)!==null){const g=randomGroupOf(n),gp=poolOf(g);if(!gp.length)add(e,g?'랜덤 묶음 「'+groupName(g)+'」에 사건이 하나도 없습니다.':'랜덤 인카운터가 하나도 등록되지 않았습니다.','error',c.id);edges.get(e.id).add('@encounterHub:'+g);if(gp.length===1&&gp[0].id===e.id&&e.once)add(e,'이 사건이 이 묶음의 유일한 인카운터라, 한 번 완료하면 다음 랜덤 사건이 없습니다.','warning',c.id);}
else if(n==='sequence'){if(e.kind==='story'){const next=events.find((x,i)=>i>index&&x.kind==='story');if(next)edges.get(e.id).add(next.id);else add(e,'다음 스토리가 없어 여기서 이야기가 끝납니다. 의도한 끝인지 확인하세요.','warning',c.id);}else edges.get(e.id).add('@storyHub');}
else if(n!=='end'){if(!ids.has(n))add(e,'다음 사건 연결이 끊겨 있습니다.','error',c.id);else edges.get(e.id).add(n);if(n===e.id)add(e,'이 선택은 같은 사건으로 돌아옵니다. 반복이 의도한 것인지 확인하세요.','warning',c.id);}
}
}
}
const reachable=new Set(),todo=events[0]?[events[0].id]:[];while(todo.length){const id=todo.pop();if(reachable.has(id))continue;reachable.add(id);for(const n of edges.get(id)||[])todo.push(n);}
for(const e of events)if(!reachable.has(e.id))add(e,'첫 사건에서 이 사건으로 오는 경로가 없습니다.');
// Conservative path analysis: warns only when no structural route can supply a used item.
const allOutcomes=live.flatMap(e=>e.choices.flatMap(c=>[c,...(c.branch?[c.branch]:[])]));
// Text variations: report broken braces and unknown names, and count names used in lines.
const titles=new Set(events.map(e=>'@'+e.title.trim())),defNames=new Set(defs.map(d=>d.name)),textUses=new Set();
const knownName=n=>Variations.builtinNames().includes(n)||defNames.has(n)||titles.has(n);
for(const e of events){const reported=new Set();for(const [text,choice]of[[e.text,''],[e.speaker,''],...e.choices.map(c=>[c.text,c.id])]){const info=Variations.inspect(text,knownName);for(const n of info.names)textUses.add(n);
for(const m of info.errors)if(!reported.has(m)){reported.add(m);add(e,'대사 변주 · '+m,'warning',choice);}
for(const n of info.misread||[]){const m='대사 변주 · \''+n+'\' 항목이 없어 조건이 아니라 방문마다 바뀌는 문장으로 읽힙니다. 조건이라면 이름을 확인하세요.';if(!reported.has(m)){reported.add(m);add(e,m,'warning',choice);}}
for(const n of info.unknown){const m='대사 변주 · \''+n+'\' 항목을 찾지 못해 글자 그대로 보입니다. 이름을 확인하세요.';if(!reported.has(m)){reported.add(m);add(e,m,'warning',choice);}}}}
for(const e of live)for(const c of e.choices)if(c.reward&&!c.reward.pool.length)add(e,'랜덤 보상의 후보가 비어 있습니다.','error',c.id);
const has=(list,id)=>list.some(x=>x.id===id);
for(const d of defs){const sources=[],uses=[];for(const e of live)for(const c of e.choices){if(c.reward?.pool.includes(d.id)||has(gainsOf(c),d.id)||has(gainsOf(c.branch),d.id)||c.remember===d.id)sources.push(e);if(has(needsOf(c),d.id)||has(losesOf(c),d.id)||has(whensOf(c.branch),d.id)||has(losesOf(c.branch),d.id))uses.push({e,c});}
const passive=(d.effects||[]).some(f=>allOutcomes.some(o=>{const key=f.kind.replace(/Loss|Gain/,'');return f.kind.endsWith('Loss')?o[key]<0:o[key]>0;}));
const partnerUse=defs.some(x=>(x.effects||[]).some(f=>f.with===d.id));
if((sources.length||d.initial||p.randomStart===2&&d.type==='ability')&&!uses.length&&!passive&&!partnerUse&&!textUses.has(d.name))add(null,d.name+'을 얻지만 조건·소모·보유 효과·대사 변주의 사용처가 없습니다.');
if(d.type==='memory'&&!sources.length&&!d.initial&&(uses.length||textUses.has(d.name)))add(null,'기억 \''+d.name+'\'을 남기는 선택이 없습니다. 선택 결과에서 \'이 선택을 기억\'을 켜세요.');
if(d.effects?.length&&!passive)add(null,d.name+'의 보유 효과가 적용될 자원 변화가 없습니다.');
if(!d.initial&&!(p.randomStart===2&&d.type==='ability')&&uses.length){const supplied=new Set(),queue=sources.filter(e=>reachable.has(e.id)).map(e=>e.id);while(queue.length){const id=queue.pop();if(supplied.has(id))continue;supplied.add(id);for(const next of edges.get(id)||[])queue.push(next);}for(const {e,c}of uses)if(reachable.has(e.id)&&!supplied.has(e.id))add(e,d.name+'을 얻은 뒤 이 선택에 도달할 경로가 없습니다. 시작 보유량·획득 위치를 확인하세요.','warning',c.id);}
for(const f of d.effects||[])if(f.with){const partner=defs.find(x=>x.id===f.with);if(partner&&!partner.initial&&!(p.randomStart===2&&partner.type==='ability')&&!events.some(e=>e.choices.some(c=>has(gainsOf(c),partner.id)||has(gainsOf(c.branch),partner.id)||c.reward?.pool.includes(partner.id))))add(null,d.name+'의 조합 항목 '+partner.name+'을 얻는 곳이 없습니다.');}
}
// A brand-new game has no abilities yet; only warn once some exist.
if(p.randomStart===2&&defs.some(d=>d.type==='ability')&&defs.filter(d=>d.type==='ability'&&!d.initial).length<2)add(null,'시작 때 무작위로 배정할 능력이 2종보다 적습니다.');
return issues;
}
Run.prototype.snapshot=function(){const out={};for(const k of ['visits','pendingReward','audioState','hp','mental','money','bag','recent','current','storyIndex','ended','dead','deathReason','endScene','endNote','message','lastChange','trail','dialogueHistory','dialogueHistoryOmitted','log','turn'])out[k]=this[k];out.visited=[...this.visited];return JSON.parse(JSON.stringify(out));};
Run.prototype.restore=function(state){const copy=JSON.parse(JSON.stringify(state));copy.visited=new Set(copy.visited);Object.assign(this,copy);this.dialogueHistory=Array.isArray(copy.dialogueHistory)?copy.dialogueHistory:(copy.trail||[]).map(t=>({...t}));this.dialogueHistoryOmitted=copy.dialogueHistoryOmitted??Math.max(0,copy.turn-this.dialogueHistory.length);this.pendingReward=copy.pendingReward||null;this.endScene=copy.endScene||'';this.endNote=copy.endNote||'';
if(!copy.visits||typeof copy.visits!=='object'){this.visits={};for(const id of this.visited)this.visits[id]=1;if(this.current)this.visits[this.current]=Math.max(1,this.visits[this.current]||0);}this.audioState=copy.audioState||{bgm:'@default',position:0};this.log=Array.isArray(copy.log)?copy.log:[];};

const api={MORE,needsOf,whensOf,gainsOf,losesOf,setNeeds,setWhens,setItems,randomGroupOf,art,artDefault,effectKinds,inspect,resources,uid,image,audio,allowPackedMedia,STAGE,stageSettings,stageArea,stageAreaEmpty,imageOffset,fresh,event,choice,validate,Run};if(typeof module!=='undefined')module.exports=api;else root.GameCore=api})(globalThis);
