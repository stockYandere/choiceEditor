(function(root){'use strict';
// Scene staging drawn entirely in code over the scene's own pictures: camera moves, mood grading,
// particles, overlays, picture warps, beats, transitions and character layers. No media of its own.
const state=new WeakMap();
const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);

// ---- Mood grading: CSS filter functions scaled by strength, plus a tint layer.
const MOODS={
 day:{f:[['brightness',1.06,1],['saturate',1.15,1],['contrast',1.03,1]],tint:'linear-gradient(180deg,rgba(255,240,200,.18),transparent 60%)',blend:'soft-light'},
 night:{f:[['brightness',.62,1],['saturate',.7,1],['contrast',1.08,1]],tint:'linear-gradient(180deg,rgba(20,40,110,.55),rgba(10,20,60,.45))',blend:'multiply'},
 dusk:{f:[['brightness',.93,1],['saturate',1.2,1],['sepia',.2,0]],tint:'linear-gradient(180deg,rgba(255,140,60,.45),rgba(120,40,120,.4))',blend:'soft-light'},
 dawn:{f:[['brightness',1.05,1],['saturate',.9,1]],tint:'linear-gradient(180deg,rgba(255,180,200,.35),rgba(160,200,255,.3))',blend:'soft-light'},
 memory:{f:[['sepia',.7,0],['contrast',.9,1],['brightness',1.03,1],['blur',.4,0,'px']],tint:'radial-gradient(ellipse at center,transparent 50%,rgba(60,40,20,.45))',blend:'multiply'},
 danger:{f:[['saturate',1.25,1],['contrast',1.12,1]],tint:'radial-gradient(ellipse at center,rgba(255,40,40,.12),rgba(140,0,0,.55))',blend:'multiply',pulse:true},
 dream:{f:[['blur',.7,0,'px'],['brightness',1.08,1],['saturate',1.25,1]],tint:'linear-gradient(135deg,rgba(255,170,230,.35),rgba(150,200,255,.35))',blend:'screen'},
 cold:{f:[['saturate',.7,1],['brightness',.97,1]],tint:'linear-gradient(180deg,rgba(120,200,255,.35),rgba(60,110,180,.3))',blend:'soft-light'},
 mono:{f:[['grayscale',1,0],['contrast',1.1,1]]},
 faded:{f:[['saturate',.55,1],['contrast',.85,1],['brightness',1.08,1]],tint:'linear-gradient(180deg,rgba(255,250,235,.18),rgba(255,250,235,.12))',blend:'screen'},
 vivid:{f:[['saturate',1.5,1],['contrast',1.08,1]]},
 horror:{f:[['grayscale',.6,0],['contrast',1.35,1],['brightness',.72,1]],tint:'radial-gradient(ellipse at center,rgba(80,0,0,.1),rgba(40,0,0,.6))',blend:'multiply'},
 neon:{f:[['saturate',1.6,1],['contrast',1.15,1],['hue-rotate',-12,0,'deg']],tint:'linear-gradient(135deg,rgba(255,40,200,.3),rgba(40,220,255,.3))',blend:'screen'}};
function moodFilter(mood,strength){const m=MOODS[mood];if(!m)return '';const k=strength/100;return m.f.map(([fn,v,id,unit=''])=>fn+'('+(id+(v-id)*k).toFixed(3)+unit+')').join(' ');}

// ---- Picture warps: SVG turbulence displacement, defined once per document.
const WARPS={water:{bf:'0.010 0.045',to:'0.014 0.06',scale:14,dur:'7s'},heat:{bf:'0.02 0.16',to:'0.025 0.22',scale:6,dur:'1.6s'},dream:{bf:'0.006 0.009',to:'0.009 0.012',scale:20,dur:'9s'},wobble:{bf:'0.03 0.03',to:'0.04 0.035',scale:5,dur:'2.4s'}};
function ensureWarps(){if(typeof document==='undefined'||document.getElementById('fxWarpDefs'))return;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.id='fxWarpDefs';svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');svg.style.position='absolute';
 svg.innerHTML=Object.entries(WARPS).map(([id,w])=>`<filter id="fx-${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${w.bf}" numOctaves="2" seed="3"><animate class="fxWarpAnim" attributeName="baseFrequency" values="${w.bf};${w.to};${w.bf}" dur="${w.dur}" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" scale="${w.scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('');document.body.append(svg);}

// ---- Camera moves on a wrapper around the picture and its character layer.
const SPEED={slow:24000,normal:14000,fast:7000};
const CAMERA={
 zoomIn:{k:[{transform:'scale(1)'},{transform:'scale(1.18)'}],once:true},
 zoomOut:{k:[{transform:'scale(1.18)'},{transform:'scale(1)'}],once:true},
 panLeft:{k:[{transform:'scale(1.16) translateX(6%)'},{transform:'scale(1.16) translateX(-6%)'}],once:true},
 panRight:{k:[{transform:'scale(1.16) translateX(-6%)'},{transform:'scale(1.16) translateX(6%)'}],once:true},
 panUp:{k:[{transform:'scale(1.16) translateY(6%)'},{transform:'scale(1.16) translateY(-6%)'}],once:true},
 panDown:{k:[{transform:'scale(1.16) translateY(-6%)'},{transform:'scale(1.16) translateY(6%)'}],once:true},
 drift:{k:[{transform:'scale(1.1) translate(-2.5%,-1.5%)'},{transform:'scale(1.1) translate(2.5%,1.5%)'}]},
 sway:{k:[{transform:'scale(1.08) rotate(-1.2deg)'},{transform:'scale(1.08) rotate(1.2deg)'}],rate:.35},
 breathe:{k:[{transform:'scale(1.02)'},{transform:'scale(1.06)'}],rate:.3},
 tilt:{k:[{transform:'scale(1.14) rotate(-3deg)'},{transform:'scale(1.14) rotate(-2deg)'}],rate:.5}};

// ---- Character layers.
const ENTER={fade:[{opacity:0},{opacity:1}],slideLeft:[{opacity:0,translate:'-40% 0'},{opacity:1,translate:'0 0'}],slideRight:[{opacity:0,translate:'40% 0'},{opacity:1,translate:'0 0'}],rise:[{opacity:0,translate:'0 18%'},{opacity:1,translate:'0 0'}],pop:[{opacity:0,scale:'.6'},{opacity:1,scale:'1.06',offset:.7},{opacity:1,scale:'1'}],drop:[{opacity:0,translate:'0 -30%'},{opacity:1,translate:'0 2%',offset:.75},{opacity:1,translate:'0 0'}]};
const MOTION={breathe:{k:[{scale:'1 1'},{scale:'1 1.015'}],d:2600},bob:{k:[{translate:'0 0'},{translate:'0 -1.6%'}],d:900},sway:{k:[{rotate:'-1.2deg'},{rotate:'1.2deg'}],d:2400},float:{k:[{translate:'0 1.5%'},{translate:'0 -2.5%'}],d:3200},tremble:{k:[{translate:'-0.4% 0'},{translate:'0.4% 0'}],d:90}};

// ---- Particles: one engine, many looks.
const PARTICLES={
 rain:{n:110,shape:'line',vy:[900,1300],vx:[-140,-80],size:[14,26],w:1.1,color:'205,222,255',a:[.3,.6]},
 storm:{n:190,shape:'line',vy:[1300,1800],vx:[-320,-200],size:[18,32],w:1.3,color:'210,225,255',a:[.35,.7],lightning:true},
 snow:{n:80,shape:'dot',vy:[28,80],vx:[-18,18],size:[1.2,3.4],sway:[.6,1.6],color:'255,255,255',a:[.6,.95]},
 fog:{n:14,shape:'blob',vy:[-4,4],vx:[10,26],size:[.35,.7],color:'225,230,240',a:[.14,.28]},
 dust:{n:55,shape:'dot',vy:[-10,10],vx:[-12,12],size:[.9,2.2],color:'255,240,210',a:[.3,.7],twinkle:true},
 embers:{n:50,shape:'spark',vy:[-95,-40],vx:[-24,24],size:[1,2.6],sway:[.8,2],color:'255,150,60',a:[.5,1],glow:true,fade:true},
 petals:{n:30,shape:'petal',vy:[40,85],vx:[18,50],size:[3,6],sway:[.8,2],color:'255,192,212',a:[.7,.95],spin:true},
 leaves:{n:22,shape:'petal',vy:[45,90],vx:[20,60],size:[4,8],sway:[.6,1.6],color:'205,140,60',a:[.75,.95],spin:true},
 fireflies:{n:26,shape:'spark',vy:[-14,14],vx:[-16,16],size:[1.4,2.6],sway:[.5,1.2],color:'215,255,140',a:[.3,1],glow:true,twinkle:true},
 stars:{n:70,shape:'dot',vy:[0,0],vx:[0,0],size:[.6,1.8],color:'255,255,240',a:[.2,1],twinkle:true,top:.55},
 bubbles:{n:28,shape:'ring',vy:[-70,-25],vx:[-8,8],size:[2,6],sway:[.6,1.4],color:'210,240,255',a:[.4,.8]},
 ash:{n:65,shape:'dot',vy:[18,50],vx:[-16,16],size:[1.1,2.6],sway:[.4,1],color:'190,185,180',a:[.4,.8]},
 sparkles:{n:34,shape:'star',vy:[-6,6],vx:[-6,6],size:[1.5,3.5],color:'255,250,220',a:[0,1],twinkle:true,glow:true}};
const AMOUNT={1:.5,2:1,3:1.7};
function spawn(cfg,w,h,initial){const up=cfg.vy[1]<0,down=cfg.vy[0]>0;const p={x:rand(0,w),y:initial||(!up&&!down)?rand(0,h*(cfg.top||1)):up?h+20:-20,vx:rand(...cfg.vx),vy:rand(...cfg.vy),s:rand(...cfg.size),a:rand(...cfg.a),ph:rand(0,6.28),sw:cfg.sway?rand(...cfg.sway):0,rot:rand(0,6.28),life:rand(.6,1)};if(cfg.shape==='blob')p.s*=w;if(cfg.shape==='blob'&&!initial)p.x=-p.s;return p;}
function drawParticle(ctx,cfg,p,t){let a=p.a;if(cfg.twinkle)a*=.45+.55*Math.abs(Math.sin(t*1.7+p.ph));if(cfg.fade)a*=p.life;if(a<=0.01)return;const c='rgba('+cfg.color+','+a.toFixed(3)+')';
 switch(cfg.shape){case 'line':ctx.strokeStyle=c;ctx.lineWidth=cfg.w;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*p.s/p.vy,p.y-p.s);ctx.stroke();break;
 case 'blob':{const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s);g.addColorStop(0,c);g.addColorStop(1,'rgba('+cfg.color+',0)');ctx.fillStyle=g;ctx.fillRect(p.x-p.s,p.y-p.s,p.s*2,p.s*2);break;}
 case 'ring':ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,6.283);ctx.stroke();break;
 case 'petal':ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,p.s,p.s*.5,0,0,6.283);ctx.fill();ctx.restore();break;
 case 'star':ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<8;i++){const r=i%2?p.s*.35:p.s*1.6,ang=i*Math.PI/4+p.rot;ctx.lineTo(p.x+Math.cos(ang)*r,p.y+Math.sin(ang)*r);}ctx.fill();break;
 default:ctx.fillStyle=c;ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,6.283);ctx.fill();}}
function startParticles(st,area,kind,amount,reduced){const cfg=PARTICLES[kind],place=host(st,area);if(!cfg||!place)return null;const canvas=document.createElement('canvas');canvas.className='fxParticles';canvas.setAttribute('aria-hidden','true');place.parent.insertBefore(canvas,place.before);const handle={canvas,ro:null,raf:0};
 const ctx=canvas.getContext('2d'),dpr=Math.min(2,root.devicePixelRatio||1);let w=0,h=0,list=[],last=performance.now(),nextBolt=performance.now()+rand(2500,6000);const speed=reduced?.55:1;
 function size(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;w=r.width;h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const n=Math.round(cfg.n*(AMOUNT[amount]||1)*(reduced?.5:1)*Math.min(1.4,Math.max(.6,w*h/(360*640))));while(list.length<n)list.push(spawn(cfg,w,h,true));list.length=n;}
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(size):null;ro?.observe(canvas);
 function frame(now){if(!canvas.isConnected){stopParticles(handle);return;}handle.raf=requestAnimationFrame(frame);if(document.hidden){last=now;return;}if(!w)size();const dt=Math.min(.05,(now-last)/1000)*speed,t=now/1000;last=now;ctx.clearRect(0,0,w,h);
  if(cfg.glow){ctx.globalCompositeOperation='lighter';}
  for(let i=0;i<list.length;i++){const p=list[i];p.x+=(p.vx+(p.sw?Math.sin(t*p.sw+p.ph)*18:0))*dt;p.y+=p.vy*dt;if(cfg.spin)p.rot+=dt*p.sw;if(cfg.fade)p.life-=dt*.25;
   const out=p.y>h+40||p.y<-40||p.x<-p.s-60||p.x>w+p.s+60||(cfg.fade&&p.life<=0);if(out)list[i]=spawn(cfg,w,h,false);drawParticle(ctx,cfg,p,t);}
  ctx.globalCompositeOperation='source-over';
  if(cfg.lightning&&!reduced&&now>nextBolt){nextBolt=now+rand(4000,9000);flashLayer(st,area,'rgba(235,240,255,1)',[0,.85,.1,.6,0],650);}}
 handle.ro=ro;handle.raf=requestAnimationFrame(frame);size();return handle;}
function stopParticles(p){if(!p)return;cancelAnimationFrame(p.raf);p.ro?.disconnect();p.canvas.remove();}

// ---- Overlays.
let grainTile='';
function grain(){if(grainTile)return grainTile;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),d=x.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}x.putImageData(d,0,0);grainTile=c.toDataURL();return grainTile;}
const OVERLAYS={vignette:{css:'background:radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.7) 100%)'},
 grain:{css:()=>'background-image:url('+grain()+');opacity:.13;mix-blend-mode:overlay',anim:[[{backgroundPosition:'0 0'},{backgroundPosition:'-64px 40px'},{backgroundPosition:'30px -50px'},{backgroundPosition:'-20px 10px'}],{duration:400,iterations:Infinity,easing:'steps(4)'}]},
 scanlines:{css:'background:repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px)'},
 letterbox:{html:'<i class="fxBar fxBarTop"></i><i class="fxBar fxBarBottom"></i>'},
 lightRays:{css:'background:repeating-linear-gradient(115deg,rgba(255,250,220,0) 0 7%,rgba(255,250,220,.16) 9%,rgba(255,250,220,0) 13%);mix-blend-mode:screen',anim:[[{opacity:.5},{opacity:1}],{duration:3800,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}]},
 haze:{css:'background:linear-gradient(0deg,rgba(255,255,255,.22),rgba(255,255,255,0) 62%);mix-blend-mode:screen'},
 glow:{css:'background:radial-gradient(ellipse at 50% 40%,rgba(255,245,225,.32),rgba(255,245,225,0) 70%);mix-blend-mode:screen'},
 frame:{css:'box-shadow:inset 0 0 0 6px rgba(0,0,0,.55),inset 0 0 0 8px rgba(255,255,255,.45)'}};

// Where an area draws: 'all' = the whole stage under the dialogue; 'top'/'bottom' = inside that picture slot only.
function slots(rootEl,area='all'){return ['top','bottom'].filter(k=>area==='all'||area===k).map(k=>rootEl.querySelector('[data-fx-slot='+k+']')).filter(Boolean);}
function host(st,area){if(area==='all')return {parent:st.front.parentNode,before:st.front};const slot=slots(st.root,area)[0];return slot?{parent:slot,before:null}:null;}
function layer(st,area,cls,css){const h=host(st,area);if(!h)return null;const el=document.createElement('div');el.className='fxLayerFill '+cls;el.setAttribute('aria-hidden','true');if(css)el.style.cssText=css;h.parent.insertBefore(el,h.before);st.extra.push(el);return el;}
// over=true covers the dialogue too (only for 'all' beats); otherwise it stays under the dialogue / inside the slot.
function flashLayer(st,area,color,opacities,duration,over=true){if(!st.root.isConnected)return;const h=host(st,area);if(!h)return;const el=document.createElement('div');el.className='fxFlash';el.setAttribute('aria-hidden','true');el.style.background=color;if(area==='all'&&over)st.root.append(el);else{el.classList.add('fxUnder');h.parent.insertBefore(el,h.before);}const a=el.animate(opacities.map(o=>({opacity:o*(st.reduced?.5:1)})),{duration,easing:'ease-out'});a.onfinish=a.oncancel=()=>el.remove();return a;}
function ensureCam(slot){let cam=slot.querySelector(':scope>.fxCam');if(!cam){cam=document.createElement('div');cam.className='fxCam';cam.append(...slot.childNodes);slot.append(cam);}return cam;}

// Old saves kept one flat setting; it means the whole stage (a camera target becomes that slot's area).
const AREAS=['all','top','bottom'];
function areas(stage){if(!stage)return {};if(stage.all||stage.top||stage.bottom)return stage;const flat={...stage};delete flat.layers;const t=flat.cameraTarget;delete flat.cameraTarget;if(t==='top'||t==='bottom'){const cam={camera:flat.camera,cameraSpeed:flat.cameraSpeed};flat.camera='none';return {all:flat,[t]:cam,layers:stage.layers};}return {all:flat,layers:stage.layers};}

function clear(rootEl){const st=state.get(rootEl);if(!st)return;for(const p of st.particles)stopParticles(p);st.particles=[];for(const a of st.anims)a.cancel();st.anims=[];for(const el of st.extra)el.remove();st.extra=[];for(const s of slots(rootEl)){s.style.filter='';s.classList.remove('fxSlot');s.querySelectorAll(':scope>.fxCam').forEach(c=>{c.getAnimations?.().forEach(a=>a.cancel());});s.querySelectorAll('.fxCharacter').forEach(x=>x.remove());}rootEl.removeAttribute('data-fx');}

// Apply a scene's staging to rootEl. Same key = same visit (re-render): continue motions, no transition or start beats.
function enter(rootEl,{scene,key='',transition=true,front}={}){if(!rootEl)return;ensureWarps();const old=state.get(rootEl),now=performance.now(),same=!!old&&old.key===key;
 clear(rootEl);const stage=areas(scene?.stage),st={root:rootEl,key,started:same?old.started:now,anims:[],extra:[],particles:[],reduced:reducedMotion(),front:front||rootEl.querySelector('[data-fx-front]')||rootEl.lastElementChild};state.set(rootEl,st);
 if(!scene?.stage)return st;rootEl.setAttribute('data-fx','');const elapsed=now-st.started,reduced=st.reduced;
 // Pictures: mood and warp filters add up (whole stage first, then the slot's own); the slot's camera wins over the whole-stage camera.
 for(const s of slots(rootEl)){const k=s.dataset.fxSlot,cam=ensureCam(s),own=stage[k],all=stage.all;s.classList.add('fxSlot');
  s.style.filter=[all,own].filter(Boolean).map(a=>[a.warp&&a.warp!=='none'?'url(#fx-'+a.warp+')':'',moodFilter(a.mood,a.moodStrength??100)].filter(Boolean).join(' ')).filter(Boolean).join(' ');
  const pick=own&&own.camera&&own.camera!=='none'?own:all,cfg=CAMERA[pick?.camera];
  if(cfg&&!reduced){const d=(SPEED[pick.cameraSpeed]||SPEED.normal)*(cfg.rate||1);const a=cam.animate(cfg.k,cfg.once?{duration:d,fill:'forwards',easing:'ease-in-out'}:{duration:d,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});a.currentTime=elapsed;st.anims.push(a);}
  const l=stage.layers?.[k];if(l){const img=new Image();img.className='fxCharacter';img.alt='';img.src=l.image;img.style.cssText=`left:${l.x}%;bottom:${100-l.y}%;height:${l.scale}%;transform:translateX(-50%)${l.flip?' scaleX(-1)':''}`;cam.append(img);
   if(!same&&l.enter!=='none'&&ENTER[l.enter]){const a=img.animate(ENTER[l.enter],{duration:reduced?200:650,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});st.anims.push(a);}
   const m=MOTION[l.motion];if(m&&!reduced){const a=img.animate(m.k,{duration:m.d,iterations:Infinity,direction:'alternate',easing:'ease-in-out',composite:'add'});a.currentTime=elapsed;st.anims.push(a);}}}
 for(const area of AREAS){const a=stage[area];if(!a||!host(st,area))continue;
  const mood=MOODS[a.mood],k=(a.moodStrength??100)/100;if(mood?.tint){const t=layer(st,area,'fxTint','background:'+mood.tint+';mix-blend-mode:'+mood.blend+';opacity:'+k);if(mood.pulse&&!reduced){const an=t.animate([{opacity:k*.7},{opacity:k}],{duration:1800,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});an.currentTime=elapsed;st.anims.push(an);}}
  for(const o of a.overlays||[]){const def=OVERLAYS[o];if(!def)continue;const el=layer(st,area,'fxOverlay fx-'+o,typeof def.css==='function'?def.css():def.css||'');if(def.html)el.innerHTML=def.html;if(def.anim&&!reduced){const an=el.animate(...def.anim);an.currentTime=elapsed;st.anims.push(an);}if(o==='letterbox'&&!same)el.querySelectorAll('.fxBar').forEach(b=>st.anims.push(b.animate([{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration:500,easing:'ease-out'})));}
  if(a.weather&&a.weather!=='none'){const p=startParticles(st,area,a.weather,a.weatherAmount||2,reduced);if(p)st.particles.push(p);}
  if(!same&&transition&&a.transition&&a.transition!=='cut')runTransition(st,area,a.transition);}
 if(!same)beat(rootEl,scene,'start');
 return st;}

function slotAnim(st,area,keyframes,options){for(const s of slots(st.root,area)){const a=s.animate(keyframes,options);st.anims.push(a);}}
function camAnim(st,area,keyframes,options){for(const s of slots(st.root,area)){const cam=s.querySelector(':scope>.fxCam');if(cam)cam.animate(keyframes,{...options,composite:'add'});}}
function glitchFrames(){const f=[];for(let i=0;i<8;i++){const top=Math.round(rand(0,80)),h=Math.round(rand(6,24));f.push({clipPath:`inset(${top}% 0 ${Math.max(0,100-top-h)}% 0)`,transform:`translateX(${rand(-6,6).toFixed(1)}%)`});f.push({clipPath:'inset(0 0 0 0)',transform:`translateX(${rand(-1.5,1.5).toFixed(1)}%)`});}f.push({clipPath:'inset(0 0 0 0)',transform:'none'});return f;}
function runTransition(st,area,kind){const r=st.reduced,d=r?300:650,ease='cubic-bezier(.3,.7,.2,1)';if(r&&['slide','zoom','glitch','blinds','dissolve'].includes(kind))kind='fade';const sa=(k,o)=>slotAnim(st,area,k,o);
 switch(kind){case 'fade':sa([{opacity:0},{opacity:1}],{duration:d,easing:ease});break;
 case 'blackFade':flashLayer(st,area,'#000',[1,1,0],d+250,false);break;
 case 'whiteFade':flashLayer(st,area,'#fff',[1,1,0],d+250,false);break;
 case 'flashCut':flashLayer(st,area,'#fff',[1,0],280,false);break;
 case 'wipeLeft':sa([{clipPath:'inset(0 0 0 100%)'},{clipPath:'inset(0 0 0 0)'}],{duration:d,easing:ease});break;
 case 'wipeRight':sa([{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:d,easing:ease});break;
 case 'wipeDown':sa([{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:d,easing:ease});break;
 case 'wipeUp':sa([{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0 0 0 0)'}],{duration:d,easing:ease});break;
 case 'iris':sa([{clipPath:'circle(0% at 50% 50%)'},{clipPath:'circle(75% at 50% 50%)'}],{duration:d+150,easing:ease});break;
 case 'slide':sa([{transform:'translateX(100%)'},{transform:'translateX(0)'}],{duration:d,easing:ease});break;
 case 'zoom':sa([{opacity:0,transform:'scale(1.25)'},{opacity:1,transform:'scale(1)'}],{duration:d+100,easing:ease});break;
 case 'glitch':sa(glitchFrames(),{duration:520,easing:'steps(17)'});break;
 case 'dissolve':sa([{opacity:0,filter:'blur(10px)'},{opacity:1,filter:'blur(0)'}],{duration:d+300,easing:'steps(8)'});break;
 case 'blinds':{const el=layer(st,area,'fxBlinds','');if(!el)break;for(let i=0;i<8;i++){const b=document.createElement('i');b.style.top=(i*12.5)+'%';el.append(b);b.animate([{transform:'scaleY(1)'},{transform:'scaleY(0)'}],{duration:d,delay:i*40,easing:ease,fill:'forwards'});}setTimeout(()=>el.remove(),d+400);break;}}}

// One beat effect in an area, e.g. for the editor's test buttons. 'all' beats may cover the dialogue; slot beats stay in the slot.
function runBeat(rootEl,fx,area='all'){const st=state.get(rootEl)||{root:rootEl,anims:[],extra:[],particles:[],reduced:reducedMotion(),front:rootEl.querySelector('[data-fx-front]')||rootEl.lastElementChild};const r=st.reduced;
 const shake=(amp,dur,rot=0)=>{const k=[];for(let i=0;i<10;i++)k.push({transform:`translate(${rand(-amp,amp).toFixed(1)}px,${rand(-amp,amp).toFixed(1)}px) rotate(${rand(-rot,rot).toFixed(2)}deg)`});k.push({transform:'none'});if(area==='all')rootEl.animate(k,{duration:dur,easing:'linear'});else camAnim(st,area,k,{duration:dur,easing:'linear'});};
 const fl=(c,o,d,over=true)=>flashLayer(st,area,c,o,d,over);
 switch(fx){case 'flash':fl('#fff',[.85,0],380);break;case 'whiteFlash':fl('#fff',[1,.9,0],1000);break;case 'redFlash':fl('rgb(200,0,20)',[.6,0],600);break;
 case 'blackout':fl('#000',[0,1,1,0],1000);break;case 'shake':shake(r?2:7,380);break;case 'bigShake':shake(r?4:15,720,r?0:1.2);break;
 case 'pulse':camAnim(st,area,[{transform:'scale(1)'},{transform:'scale(1.05)'},{transform:'scale(1)'}],{duration:420,easing:'ease-out'});break;
 case 'glitch':if(r){fl('#fff',[.4,0],200);break;}for(const s of slots(rootEl,area))s.animate(glitchFrames(),{duration:380,easing:'steps(17)'});break;
 case 'zoomPunch':camAnim(st,area,[{transform:'scale(1)'},{transform:`scale(${r?1.03:1.14})`,offset:.25},{transform:'scale(1)'}],{duration:620,easing:'ease-out'});break;
 case 'lightning':fl('rgba(235,240,255,1)',[0,.9,.1,.7,0],650);break;
 case 'blur':camAnim(st,area,[{filter:'blur(8px)'},{filter:'blur(0)'}],{duration:700,easing:'ease-out'});break;
 case 'tint':fl('rgba(70,130,220,.9)',[0,.45,0],1300,false);break;}}
function beat(rootEl,scene,when){const stage=areas(scene?.stage);for(const area of AREAS)for(const b of stage[area]?.beats||[])if(b.when===when)runBeat(rootEl,b.fx,area);}
// After a choice in `scene`: its choice beats, then gain/loss beats for what changed.
function react(rootEl,scene,change,dead){if(!scene?.stage)return;beat(rootEl,scene,'choice');const items=change?.items||[],gain=change&&(change.hp>0||change.mental>0||change.money>0||items.some(i=>i.delta>0)),loss=dead||change&&(change.hp<0||change.mental<0||change.money<0||items.some(i=>i.delta<0));if(gain)beat(rootEl,scene,'gain');if(loss)beat(rootEl,scene,'loss');}
// Editor: play the scene's entrance again.
function replay(rootEl,scene){const st=state.get(rootEl);if(st)st.key='';enter(rootEl,{scene,key:'replay:'+performance.now()});}

const api={enter,clear,beat,react,runBeat,replay,areas,AREAS,MOODS,PARTICLES,moodFilter};
root.StageFX=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
