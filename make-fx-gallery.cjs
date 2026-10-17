// Records every staging effect (stage-fx.js) as a short looping animated WebP for the download site's 연출 gallery.
// Time is driven frame by frame (fake clock for timers/particles, paused Web Animations, SVG warp clock), so every run gives the same frames.
// Usage: node make-fx-gallery.cjs <output dir> [category,…]   → <dir>/<category>-<id>.webp and <dir>/effects.json (only=some categories, no json)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),os=require('node:os');
const out=path.resolve(process.argv[2]||'fx-gallery');fs.mkdirSync(out,{recursive:true});
const src=fs.readFileSync(path.join(__dirname,'assets/stage-editor.js'),'utf8'),LABELS=eval('('+/const STAGE_LABELS=(\{[\s\S]*?\});\nconst STAGE_PRESETS/.exec(src)[1]+')');
const SIZE=240,FPS=12;
const CATEGORIES=[
 {id:'camera',title:'카메라',desc:'그림을 천천히 움직여 시선을 이끕니다. 속도 3단계.',items:Object.keys(LABELS.camera).filter(k=>k!=='none').map(k=>({id:k,name:LABELS.camera[k],run:[[0,{all:{camera:k,cameraSpeed:'fast'}}]],ms:3000,speed:2}))},
 {id:'mood',title:'분위기',desc:'색감과 빛으로 시간·감정을 바꿉니다. 처음은 원래 그림, 바뀐 뒤가 분위기입니다.',items:Object.keys(LABELS.mood).filter(k=>k!=='none').map(k=>({id:k,name:LABELS.mood[k],run:[[0,null],[800,{all:{mood:k,moodStrength:100}}]],ms:2600}))},
 {id:'weather',title:'날씨',desc:'그림 위에 입자를 흩뿌립니다. 양 3단계.',items:Object.keys(LABELS.weather).filter(k=>k!=='none').map(k=>({id:k,name:LABELS.weather[k],run:[[0,{all:{weather:k,weatherAmount:2,mood:k==='storm'||k==='fireflies'||k==='stars'?'night':'none',moodStrength:70}}]],ms:k==='storm'?6200:3000}))},
 {id:'warp',title:'일렁임',desc:'그림 자체를 물결·아지랑이처럼 일그러뜨립니다.',items:Object.keys(LABELS.warp).filter(k=>k!=='none').map(k=>({id:k,name:LABELS.warp[k],run:[[0,{all:{warp:k}}]],ms:3000,speed:k==='water'||k==='dream'?2.5:1}))},
 {id:'overlay',title:'겹침',desc:'그림 위에 막을 겹칩니다. 여러 개를 함께 켤 수 있어요.',items:Object.keys(LABELS.overlays).map(k=>({id:k,name:LABELS.overlays[k],run:[[0,null],[700,{all:{overlays:[k]}}]],ms:2600}))},
 {id:'transition',title:'전환',desc:'앞 사건에서 이 사건으로 넘어올 때 화면이 바뀌는 방식입니다.',items:Object.keys(LABELS.transition).map(k=>({id:k,name:LABELS.transition[k],run:[[0,'previous'],[700,{all:{transition:k}}]],ms:2400}))},
 {id:'beat',title:'순간 효과',desc:'사건 시작·선택 직후·얻었을 때·잃었을 때 한 번 일어납니다.',items:Object.keys(LABELS.fx).map(k=>({id:k,name:LABELS.fx[k],run:[[0,null],[500,'beat:'+k]],ms:k==='blackout'||k==='whiteFlash'?2200:1900}))},
 {id:'character',title:'인물',desc:'투명 PNG 인물을 그림 위에 겹칩니다. 등장 방식과 움직임을 고릅니다.',items:[
  ...Object.keys(LABELS.enter).filter(k=>k!=='none').map(k=>({id:'enter-'+k,name:'등장 · '+LABELS.enter[k],run:[[0,null],[500,{all:{},layers:{top:{x:62,y:100,scale:64,enter:k,motion:'none',flip:false}}}]],ms:2000})),
  ...Object.keys(LABELS.motion).filter(k=>k!=='none').map(k=>({id:'motion-'+k,name:'움직임 · '+LABELS.motion[k],run:[[0,{all:{},layers:{top:{x:62,y:100,scale:64,enter:'none',motion:k,flip:false}}}]],ms:k==='tremble'?1500:3000}))]}];

const page=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${path.join(__dirname,'assets/style.css')}"><style>
html,body{margin:0;background:#0b0d12;height:auto;overflow:hidden}body{max-width:none}#demo{width:${SIZE}px;height:${SIZE}px;border:0;font-family:sans-serif}
#demo .previewUpper img:not(.fxCharacter){width:100%;height:100%;object-fit:cover}#demo .previewBox{top:auto;bottom:5%;left:8%;width:84%;height:14%;background:#101b2fcc;transform:none;font-size:11px;letter-spacing:2px;color:#d7e4f5}
</style><div id="demo" class="fxPreviewFrame" data-mode="full"><div class="previewArt previewUpper" data-fx-slot="top"></div><div class="previewBox" data-fx-front>· · ·</div></div>
<script src="${path.join(__dirname,'assets/stage-fx.js')}"></script>`;

(async()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fxg-')),html=path.join(tmp,'demo.html');fs.writeFileSync(html,page);
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}),p=await b.newPage({viewport:{width:SIZE,height:SIZE},deviceScaleFactor:1});
p.on('pageerror',e=>console.error('page error:',e.message));
// Same random numbers every run (particles, glitch slices, lightning timing).
await p.addInitScript(()=>{let s=20261017;Math.random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};});
await p.clock.install({time:0});await p.goto('file://'+html);
await p.evaluate(()=>{
 // Pictures drawn in code: a dusk lake with a house (the scene) and a blue city at night (the previous scene for transitions).
 const pic=(w,h,draw)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c.toDataURL('image/png');};
 window.SCENE=pic(480,480,(x,w,h)=>{let g=x.createLinearGradient(0,0,0,h*.62);g.addColorStop(0,'#3b5b9a');g.addColorStop(.55,'#e39a6f');g.addColorStop(1,'#f6d38f');x.fillStyle=g;x.fillRect(0,0,w,h);
  x.fillStyle='#fff3c4';x.beginPath();x.arc(330,215,34,0,7);x.fill();x.fillStyle='#5b4d7a';x.beginPath();x.moveTo(0,280);x.lineTo(90,190);x.lineTo(170,260);x.lineTo(260,170);x.lineTo(380,265);x.lineTo(480,205);x.lineTo(480,300);x.lineTo(0,300);x.fill();
  x.fillStyle='#3d3557';x.beginPath();x.moveTo(0,300);x.lineTo(120,240);x.lineTo(230,300);x.lineTo(360,250);x.lineTo(480,295);x.lineTo(480,310);x.lineTo(0,310);x.fill();
  g=x.createLinearGradient(0,300,0,h);g.addColorStop(0,'#c98a72');g.addColorStop(1,'#2c3557');x.fillStyle=g;x.fillRect(0,300,w,h-300);x.fillStyle='rgba(255,243,196,.5)';for(let i=0;i<7;i++)x.fillRect(300+Math.sin(i)*14,312+i*14,60-i*7,3);
  x.fillStyle='#24203a';x.fillRect(40,250,120,70);x.beginPath();x.moveTo(30,252);x.lineTo(100,205);x.lineTo(170,252);x.fill();x.fillStyle='#ffd27a';x.fillRect(70,272,22,20);x.fillRect(112,272,22,20);
  x.fillStyle='#1d1a30';for(const [tx,th] of [[200,70],[222,95],[440,80],[462,60]]){x.beginPath();x.moveTo(tx,318);x.lineTo(tx-16,318);x.lineTo(tx-8,318-th);x.fill();}
  x.fillStyle='#1a1a2a';x.fillRect(0,318,w,4);});
 window.PREVIOUS=pic(480,480,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0c1430');g.addColorStop(1,'#1d2d5c');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='#e8eefc';x.beginPath();x.arc(110,100,26,0,7);x.fill();
  for(let i=0;i<9;i++){const bw=36+((i*37)%30),bh=120+((i*53)%150),bx=i*56-10;x.fillStyle='#0a1024';x.fillRect(bx,h-bh,bw,bh);x.fillStyle='#ffe08a';for(let r=0;r<bh/22-1;r++)for(let c=0;c<bw/14-1;c++)if((i+r*3+c)%4===0)x.fillRect(bx+6+c*14,h-bh+10+r*22,6,9);}});
 window.PERSON=pic(240,480,(x)=>{x.fillStyle='#2b2238';x.beginPath();x.ellipse(120,470,70,10,0,0,7);x.fill();x.fillStyle='#f1d3c2';x.beginPath();x.arc(120,120,46,0,7);x.fill();x.fillStyle='#3a2a2f';x.beginPath();x.arc(120,108,50,Math.PI,0);x.fill();x.fillRect(70,108,18,80);x.fillRect(152,108,18,80);
  x.fillStyle='#e2635b';x.beginPath();x.moveTo(78,175);x.lineTo(162,175);x.lineTo(196,470);x.lineTo(44,470);x.fill();x.fillStyle='#f1d3c2';x.fillRect(96,160,48,20);x.fillStyle='#2b2238';x.beginPath();x.arc(104,124,5,0,7);x.arc(136,124,5,0,7);x.fill();});
 const frame=document.getElementById('demo'),slot=frame.querySelector('.previewUpper');let n=0;
 window.show=(img,stage)=>{StageFX.clear(frame);slot.replaceChildren();const el=new Image();el.src=img;slot.append(el);if(stage)StageFX.enter(frame,{scene:{mode:'full',stage},key:'k'+(n++),transition:true});};
 window.reset=()=>{for(const a of document.getAnimations())a.cancel();StageFX.clear(frame);frame.getAnimations().forEach(a=>a.cancel());document.querySelectorAll('.fxFlash').forEach(x=>x.remove());const svg=document.getElementById('fxWarpDefs');if(svg)svg.setCurrentTime(0);};
 // Advance everything that moves by ms: Web Animations are paused and stepped by hand, SVG warps by their own clock.
 window.advance=ms=>{for(const a of document.getAnimations()){if(a.playState==='idle')continue;if(!a.__held){a.pause();a.__held=true;}a.currentTime=(a.currentTime||0)+ms;}const svg=document.getElementById('fxWarpDefs');if(svg){svg.pauseAnimations();svg.setCurrentTime(svg.getCurrentTime()+ms/1000);}};});
await p.evaluate(()=>new Promise(r=>{const imgs=[SCENE,PREVIOUS,PERSON].map(s=>{const i=new Image();i.src=s;return i.decode();});Promise.all(imgs).then(r);}));
const gallery=[];let total=0;
const only=process.argv[3]?process.argv[3].split(','):null;
for(const cat of CATEGORIES){if(only&&!only.includes(cat.id))continue;const items=[];
 for(const it of cat.items){await p.evaluate(()=>reset());const frames=[],dir=fs.mkdtempSync(path.join(tmp,'f-')),count=Math.round(it.ms/1000*FPS),step=1000/FPS*(it.speed||1);let next=0;
  for(let i=0;i<count;i++){const t=i*1000/FPS;
   while(next<it.run.length&&it.run[next][0]<=t){const [,what]=it.run[next++];
    await p.evaluate(({what,person})=>{if(what==='previous')return show(PREVIOUS,null);if(typeof what==='string'&&what.startsWith('beat:'))return StageFX.runBeat(document.getElementById('demo'),what.slice(5),'all');if(what&&what.layers)for(const l of Object.values(what.layers))l.image=PERSON;show(SCENE,what||{all:{}});},{what});
    await p.evaluate(()=>new Promise(r=>{const i=document.querySelector('.previewUpper img');(i?.decode?.()||Promise.resolve()).then(r,r);}));}
   const file=path.join(dir,String(i).padStart(4,'0')+'.png');await p.screenshot({path:file,clip:{x:0,y:0,width:SIZE,height:SIZE}});frames.push(file);
   await p.evaluate(ms=>advance(ms),step);await p.clock.runFor(Math.round(step));}
  const name=cat.id+'-'+it.id+'.webp',r=spawnSync('python3',['-I','-c',ENCODE,dir,path.join(out,name),String(Math.round(1000/FPS))],{encoding:'utf8'});if(r.status)throw Error(r.stderr);
  const size=fs.statSync(path.join(out,name)).size;total+=size;console.log(name,frames.length+'f',(size/1024).toFixed(0)+'KB');items.push({name:it.name,file:name});fs.rmSync(dir,{recursive:true});}
 gallery.push({id:cat.id,title:cat.title,desc:cat.desc,items});}
if(!only)fs.writeFileSync(path.join(out,'effects.json'),JSON.stringify(gallery,null,1)+'\n');console.log('total',(total/1048576).toFixed(2)+'MB',gallery.reduce((n,c)=>n+c.items.length,0),'effects');
await b.close();fs.rmSync(tmp,{recursive:true});})().catch(e=>{console.error(e);process.exit(1);});

// Frames (page clip, so a shaking frame shows its movement) → looping animated WebP; identical neighbouring frames are merged into one longer frame.
const ENCODE=`
import sys,glob
from PIL import Image,ImageChops
src,dst,ms=sys.argv[1],sys.argv[2],int(sys.argv[3])
frames,durations=[],[]
for f in sorted(glob.glob(src+'/*.png')):
  im=Image.open(f).convert('RGB')
  if frames and ImageChops.difference(im,frames[-1]).getbbox() is None: durations[-1]+=ms;continue
  frames.append(im);durations.append(ms)
frames[0].save(dst,save_all=True,append_images=frames[1:],duration=durations,loop=0,quality=70,method=6)
`;
