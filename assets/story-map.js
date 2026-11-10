(function(root){'use strict';
// 구조도: the whole story as boxes (사건) and circles (선택지), drawn by hand with one finger; two fingers zoom and move.
// 개요 shows only the big flow (스토리 · 🎲 묶음 · 엔딩); 상세 shows every scene and choice.
const BOX={w:132,h:60},R=19,HUB=17,LAYER=236,GAP=34,STEP=64,OV=150,FAR=2.6*LAYER,NOTE={w:150,line:15};

// ---- Stroke recognition (pure: also used by the tests) ----
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function pathLength(pts){let n=0;for(let i=1;i<pts.length;i++)n+=dist(pts[i-1],pts[i]);return n;}
function bounds(pts){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of pts){x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);}return {x0,y0,x1,y1,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2};}
function hull(pts){const p=[...pts].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lo=[],up=[];
 for(const q of p){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
 for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cross(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}
 return lo.slice(0,-1).concat(up.slice(0,-1));}
function area(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a)/2;}
// Smallest rotated rectangle around the points (a tilted box is still a box).
function minRect(pts){let best=Infinity;for(let d=0;d<90;d+=3){const t=d*Math.PI/180,c=Math.cos(t),s=Math.sin(t);let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const p of pts){const x=p.x*c-p.y*s,y=p.x*s+p.y*c;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}best=Math.min(best,(x1-x0)*(y1-y0));}return best;}
// Points every `step` along the stroke, so corners are measured the same however fast the finger moved.
function resample(pts,step){const out=[{...pts[0]}];let prev=pts[0],carry=0;for(let i=1;i<pts.length;i++){let a=prev,b=pts[i],d=dist(a,b);while(d>0&&carry+d>=step){const t=(step-carry)/d,q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};out.push(q);a=q;d=dist(a,b);carry=0;}carry+=d;prev=b;}if(dist(out[out.length-1],pts[pts.length-1])>step/3)out.push({...pts[pts.length-1]});return out;}
// How sharply the stroke turns at each point (degrees between the chords k points before and after), and its clear corners.
function turnAngles(r,k=3){const out=[];for(let i=k;i<r.length-k;i++){const u={x:r[i].x-r[i-k].x,y:r[i].y-r[i-k].y},v={x:r[i+k].x-r[i].x,y:r[i+k].y-r[i].y},nu=Math.hypot(u.x,u.y),nv=Math.hypot(v.x,v.y);if(!nu||!nv)continue;out.push({i,p:r[i],a:Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(nu*nv))))*180/Math.PI});}return out;}
function corners(list,min,sep=3){const res=[];for(const t of list){if(t.a<min)continue;const last=res[res.length-1];if(last&&t.i-last.i<=sep){if(t.a>last.a)res[res.length-1]=t;}else res.push(t);}return res;}
// tap · scratch (back and forth: erase) · box (closed, square-ish corners) · circle (closed, round) · check ✓ · line (open),
// in the stroke's own (screen) coordinates.
function classify(pts){
 if(!pts||!pts.length)return {type:'none'};
 const b=bounds(pts),diag=Math.hypot(b.w,b.h),len=pathLength(pts);
 if(diag<14&&len<28)return {type:'tap',x:pts[0].x,y:pts[0].y};
 const r=resample(pts,Math.max(5,diag/28)),turns=turnAngles(r);
 // 지그재그: three or more U-turns over a small area (a box's corners are 90°, a circle never turns sharply).
 if(corners(turns,115).length>=3&&len>=2.2*diag&&diag>=24)return {type:'scratch',x:b.cx,y:b.cy,w:b.w,h:b.h};
 const gap=dist(pts[0],pts[pts.length-1]);
 if(gap<=Math.max(22,.32*diag)&&len>1.5*diag&&Math.max(b.w,b.h)>=16){
  const h=hull(pts),fill=area(h)/Math.max(1,minRect(h));
  return {type:fill>=.87?'box':'circle',x:b.cx,y:b.cy,w:b.w,h:b.h,fill};
 }
 // ✓: one clear corner at the bottom, a short straight stroke down to it and a longer one up and to the right.
 if(diag>=20&&diag<=260){const c=corners(turns,50);if(c.length===1){const v=c[0].p,first=r.slice(0,c[0].i+1),second=r.slice(c[0].i),straight=s=>dist(s[0],s[s.length-1])/Math.max(1,pathLength(s)),a=pts[0],z=pts[pts.length-1],l1=pathLength(first),l2=pathLength(second);
  if(straight(first)>.85&&straight(second)>.85&&l1>=8&&l2>=1.15*l1&&v.y>=Math.max(a.y,z.y)-.12*diag&&z.y<v.y-.25*l2&&a.x<v.x&&z.x>v.x)return {type:'check',x:v.x,y:v.y,from:a,to:z};}}
 return {type:'line',from:pts[0],to:pts[pts.length-1]};
}

// ---- Layout: drawn positions (e.map / c.map) win; the rest stack in layers from the first scene ----
function storyNext(p,e){if(e.kind!=='story')return null;const i=p.events.indexOf(e);return p.events.find((x,j)=>j>i&&x.kind==='story')||null;}
// Which 🎲 묶음 a next value rolls ('' = 기본), or null when it is not a random roll (same rule as GameCore).
const groupOf=n=>n==='random'?'':typeof n==='string'&&n.startsWith('random:')?n.slice(7):null;
function outcomes(c){return [c,...(c.branch?[c.branch]:[])];}
function showsCircles(e){return e.choices.length>1||e.choices.some(c=>c.map);}
const groupsOf=p=>{const named=p.randomGroups||[];return [{id:'',name:named.length?'기본':'랜덤',map:p.hubMap},...named];};
function layout(p){
 // A scene's "다음 스토리" is the story after the last story played on the way there (as in GameCore), kept in ctx.
 const byId=new Map(p.events.map(e=>[e.id,e])),depth=new Map(),ctx=new Map(),queue=[];
 if(p.events[0]){depth.set(p.events[0].id,0);ctx.set(p.events[0].id,p.events[0].kind==='story'?p.events[0]:null);queue.push(p.events[0]);}
 const encounters=p.events.filter(e=>e.kind==='encounter');
 while(queue.length){const e=queue.shift(),story=e.kind==='story'?e:ctx.get(e.id);if(e.ending)continue;for(const c of e.choices)for(const o of outcomes(c)){const g=groupOf(o.next),ts=o.next==='sequence'?[story&&storyNext(p,story)]:g!==null?encounters.filter(x=>(x.randomGroup||'')===g):[byId.get(o.next)];for(const t of ts)if(t&&!depth.has(t.id)){depth.set(t.id,depth.get(e.id)+1);ctx.set(t.id,t.kind==='story'?t:story);queue.push(t);}}}
 let deepest=0;for(const d of depth.values())deepest=Math.max(deepest,d);
 const layers=new Map();for(const e of p.events){const d=depth.has(e.id)?depth.get(e.id):deepest+1;if(!layers.has(d))layers.set(d,[]);layers.get(d).push(e);}
 const boxes=new Map();
 // Each scene takes the width of its box or of its row of choice circles, so neighbours' circles never overlap.
 const width=e=>Math.max(BOX.w,showsCircles(e)&&!e.ending?e.choices.length*STEP:0)+GAP;
 for(const [d,list]of layers){const auto=list.filter(e=>!e.map),total=auto.reduce((n,e)=>n+width(e),0);let x=-total/2;for(const e of auto){boxes.set(e.id,{x:x+width(e)/2,y:d*LAYER});x+=width(e);}}
 p.events.forEach((e,i)=>{const at=e.map?{x:e.map.x,y:e.map.y}:boxes.get(e.id);boxes.set(e.id,{...at,e,i});});
 // 랜덤 인카운터 is picked when played, so each 🎲 묶음 is one hub: its rolls point in, and it fans out to its scenes.
 const hubs=[];let spare=0;const maxX=Math.max(0,...[...boxes.values()].map(b=>b.x));
 for(const g of groupsOf(p)){const members=encounters.filter(e=>(e.randomGroup||'')===g.id),rolls=p.events.filter(e=>!e.ending&&e.choices.some(c=>outcomes(c).some(o=>groupOf(o.next)===g.id)));
  if(!g.id&&!members.length&&!rolls.length)continue;const mb=members.map(e=>boxes.get(e.id));let at;
  if(g.map)at={x:g.map.x,y:g.map.y};else if(mb.length)at={x:mb.reduce((n,b)=>n+b.x,0)/mb.length,y:Math.min(...mb.map(b=>b.y))-84};else if(rolls.length){const b=boxes.get(rolls[0].id);at={x:b.x+BOX.w/2+70,y:b.y+150};}else at={x:maxX+BOX.w+70,y:(spare++)*110};
  if(!g.map)while(hubs.some(h=>Math.hypot(h.x-at.x,h.y-at.y)<60))at={x:at.x+110,y:at.y};
  hubs.push({...at,gid:g.id,name:g.name,group:g,members,rolls});}
 const circles=[];
 for(const e of p.events){if(e.ending||!showsCircles(e))continue;const b=boxes.get(e.id),n=e.choices.length;e.choices.forEach((c,k)=>circles.push({e,c,k,x:c.map?c.map.x:b.x+(k-(n-1)/2)*STEP,y:c.map?c.map.y:b.y+92}));}
 return {boxes,circles,hubs,encounters,depth};
}
// 개요: stories top to bottom, each 🎲 묶음 beside the first story that rolls it, endings at the bottom. Scenes reached
// only through choices (분기) fold into the story they hang from; links follow them through to where the story goes next.
function overview(p){
 const byId=new Map(p.events.map(e=>[e.id,e])),stories=p.events.filter(e=>e.kind==='story'&&!e.ending),ends=p.events.filter(e=>e.ending),boxes=new Map();
 stories.forEach((e,k)=>boxes.set(e.id,{x:0,y:k*OV,e,i:p.events.indexOf(e)}));
 const endY=stories.length*OV+30;ends.forEach((e,k)=>boxes.set(e.id,{x:(k-(ends.length-1)/2)*(BOX.w+24),y:endY,e,i:p.events.indexOf(e)}));
 function walk(start,ctx){const targets=new Map(),seen=new Set([start.id]),queue=[start];let branches=0;
  while(queue.length){const x=queue.shift();if(x.ending&&x!==start)continue;for(const c of x.choices)for(const o of outcomes(c)){const g=groupOf(o.next);
   if(o.next==='sequence'){const n=ctx&&storyNext(p,ctx);targets.set(n?'e:'+n.id:'fin',n?{id:n.id}:{fin:true});}
   else if(o.next==='end')targets.set('fin',{fin:true});
   else if(g!==null)targets.set('h:'+g,{gid:g});
   else{const t=byId.get(o.next);if(!t)continue;if(t.ending||t.kind==='story')targets.set('e:'+t.id,{id:t.id});else if(t.kind==='encounter')targets.set('h:'+(t.randomGroup||''),{gid:t.randomGroup||''});else if(!seen.has(t.id)){seen.add(t.id);branches++;queue.push(t);}}}}
  return {targets,branches};}
 const links=[],from=new Map(),rollers=new Map();
 for(const s of stories){const w=walk(s,s);from.set(s.id,w);for(const [k,t]of w.targets){links.push({a:s.id,t});if(t.gid!==undefined){if(!rollers.has(t.gid))rollers.set(t.gid,[]);rollers.get(t.gid).push(s);}}}
 const hubs=[];let spare=0;
 for(const g of groupsOf(p)){const members=p.events.filter(e=>e.kind==='encounter'&&(e.randomGroup||'')===g.id),by=rollers.get(g.id)||[];if(!members.length&&!by.length)continue;
  const at=by.length?{x:BOX.w/2+130,y:boxes.get(by[0].id).y+OV/2}:{x:BOX.w/2+130,y:endY+90+(spare++)*80};while(hubs.some(h=>Math.abs(h.y-at.y)<48))at.y+=50;
  const out=new Map();let branches=0;for(const m of members){const w=walk(m,by[0]);branches+=w.branches;for(const [k,t]of w.targets)if(k!=='h:'+g.id)out.set(k,t);}
  hubs.push({...at,gid:g.id,name:g.name,group:g,members,rolls:by,branches});for(const t of out.values())links.push({hub:g.id,t});}
 return {boxes,circles:[],hubs,links,from,stories,ends};
}

// ---- View ----
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.append(n);return n;};
const short=(s,n)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
const escHtml=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
// First line of a scene for its card: variation braces read as their first part, so the line stays readable.
const preview=t=>String(t||'').split('\n').find(x=>x.trim())?.replace(/\{[^{}?]*\?\s*([^{}|]*)\|?[^{}]*\}/g,'$1').replace(/\{[~&=@!]?([^{}|]*)[^{}]*\}/g,'$1').trim()||'';
let host=null,wrap=null,svg=null,world=null,ink=null,mini=null,view={s:1,x:0,y:0},nodes=null,toastTimer=0,fitted=false,level='detail',issues=new Map(),flashId='';
const selection=new Set();
const pointers=new Map();let stroke=null,pinch=null,pan=null,drag=null,frame=0,locked=false,busy=0,mode='move';

function build(){
 wrap=document.createElement('div');wrap.id='storyMap';wrap.className='storyMap';wrap.hidden=true;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','구조도');
 wrap.innerHTML='<div class="mapBar"><b>구조도</b><button id="mapLevel" class="quiet" aria-pressed="false">개요</button><button id="mapTemplates" class="quiet">뼈대</button><button id="mapFind" class="quiet" aria-label="사건 찾기">🔍</button><button id="mapUndo" class="quiet" aria-label="되돌리기">↶</button><button id="mapFit" class="quiet">전체</button><button id="mapCompact" class="quiet" aria-label="간격 줄이기">간격</button><button id="mapClose">닫기</button></div><p class="mapHint" id="mapHint"></p><div class="mapModes" role="group" aria-label="손가락 모드"><button data-map-mode="move">✋ 이동</button><button data-map-mode="draw">✏ 그리기</button><button data-map-mode="erase">🧽 지우개</button></div><svg id="mapMini" class="mapMini" aria-label="미니맵 · 눌러서 이동"></svg><div id="mapSheet" class="mapSheet" hidden></div><div id="mapToast" class="mapToast" role="status" aria-live="polite"></div>';
 svg=el('svg',{id:'mapCanvas',class:'mapCanvas'});const defs=el('defs',{},svg);const m=el('marker',{id:'mapArrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M0 0L10 5L0 10z',class:'mapArrowHead'},m);
 world=el('g',{id:'mapWorld'},svg);wrap.insertBefore(svg,wrap.querySelector('.mapModes'));document.body.append(wrap);mini=wrap.querySelector('#mapMini');
 wrap.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mapMode));
 wrap.querySelector('#mapClose').onclick=close;wrap.querySelector('#mapFit').onclick=()=>{fit();apply();};
 wrap.querySelector('#mapUndo').onclick=async()=>{if(await host.undo())render();};
 wrap.querySelector('#mapLevel').onclick=()=>setLevel(level==='overview'?'detail':'overview');
 wrap.querySelector('#mapTemplates').onclick=templateSheet;wrap.querySelector('#mapCompact').onclick=compactMap;wrap.querySelector('#mapFind').onclick=findSheet;
 svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',cancel);
 svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,view.s*Math.exp(-e.deltaY/300));},{passive:false});
 // 미니맵: touch or drag a spot to bring it to the middle of the screen.
 const miniGo=ev=>{ev.preventDefault();ev.stopPropagation();const w=mini._toWorld?.(ev);if(!w)return;const r=rect();view={...view,x:r.width/2-w.x*view.s,y:r.height/2-w.y*view.s};apply();};
 mini.addEventListener('pointerdown',ev=>{try{mini.setPointerCapture(ev.pointerId);}catch(e){}mini._down=true;miniGo(ev);});mini.addEventListener('pointermove',ev=>{if(mini._down)miniGo(ev);});
 for(const t of ['pointerup','pointercancel'])mini.addEventListener(t,()=>{mini._down=false;});
}
// 이동: one finger drags the map. 그리기: one finger draws. Two fingers always zoom and move; a tap opens in both.
function setMode(m){mode=m==='draw'||m==='erase'?m:'move';wrap.dataset.mode=mode;wrap.querySelectorAll('[data-map-mode]').forEach(b=>{const on=b.dataset.mapMode===mode;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});hint();}
function hint(){wrap.querySelector('#mapHint').innerHTML=level==='overview'?'개요 — 스토리 · 🎲 묶음 · 엔딩만 보여요. 블록을 누르면 상세로 펼쳐요.<br>분기 사건은 그 스토리에 접혀 「+N 분기」로 표시돼요.'
 :mode==='draw'?'그리기 — ▭ 사건 · ◯ 선택지 · ─ 연결(빈 곳까지면 새 사건) · ✓ 끝 장면 · 지그재그 지우기 · 크게 둘러싸면 여러 개 고르기<br>두 손가락: 벌리고 좁혀 확대·축소, 끌어서 이동'
 :mode==='erase'?'지우개 — 톡 누르면 그것을 지워요(사건·선택지·연결·메모) · 문지르면 지나간 연결·선택지·메모를 지워요<br>두 손가락: 확대·축소, 끌어서 이동 · ↶ 되돌리기'
 :'이동 — 빈 곳을 끌면 화면 이동, 네모·동그라미·메모를 끌면 옮기기 · 톡 누르면 열기 · 꾹 누르면 메뉴<br>두 손가락: 벌리고 좁혀 확대·축소 · 그리려면 ✏ 그리기';}
function setLevel(l,focusId){level=l==='overview'?'overview':'detail';const b=wrap.querySelector('#mapLevel');b.textContent=level==='overview'?'상세':'개요';b.setAttribute('aria-pressed',String(level==='overview'));wrap.dataset.level=level;closeSheet();fitted=!!focusId;hint();render();if(focusId)focus(focusId);}
function apply(){world.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.s})`);miniView();}
function rect(){return svg.getBoundingClientRect();}
function toWorld(cx,cy){const r=rect();return {x:(cx-r.left-view.x)/view.s,y:(cy-r.top-view.y)/view.s};}
function zoomAt(cx,cy,s){s=Math.max(.2,Math.min(3,s));const r=rect(),px=cx-r.left,py=cy-r.top,wx=(px-view.x)/view.s,wy=(py-view.y)/view.s;view={s,x:px-wx*s,y:py-wy*s};apply();}
function allPoints(){if(!nodes)return [];return [...nodes.boxes.values()].flatMap(b=>[{x:b.x-BOX.w/2,y:b.y-BOX.h/2},{x:b.x+BOX.w/2,y:b.y+BOX.h/2}]).concat(nodes.circles.map(c=>({x:c.x,y:c.y+R+16})),nodes.hubs.flatMap(h=>[{x:h.x-HUB,y:h.y-HUB},{x:h.x+HUB+90,y:h.y+HUB}]),(nodes.notes||[]).flatMap(n=>[{x:n.x,y:n.y},{x:n.x+n.w,y:n.y+n.h}]));}
function fit(){const r=rect();if(!nodes||!r.width)return;const pts=allPoints();if(!pts.length){view={s:1,x:r.width/2,y:80};return;}const b=bounds(pts),pad=24,whole=Math.min((r.width-pad*2)/Math.max(1,b.w),(r.height-pad*2)/Math.max(1,b.h)),s=Math.max(.6,Math.min(1.2,whole));if(s<=whole+1e-6){view={s,x:r.width/2-b.cx*s,y:r.height/2-b.cy*s};return;}const first=nodes.boxes.get(host.project().events[0]?.id)||{x:b.cx,y:b.y0};view={s,x:r.width/2-first.x*s,y:pad+BOX.h/2*s-first.y*s+8};}
// Bring a scene (or a 🎲 묶음 'hub:<gid>') to the middle and make it blink once.
function focus(id){if(!nodes)return false;const hub=id.startsWith('hub:')?nodes.hubs.find(h=>'hub:'+h.gid===id):null,b=hub||nodes.boxes.get(id);if(!b)return false;const r=rect(),s=Math.max(view.s,.8);view={s,x:r.width/2-b.x*s,y:r.height/2-b.y*s};apply();
 flashId=id;const n=world.querySelector(hub?`[data-map-hub="${hub.gid}"]`:`[data-map-event="${id}"]`);if(n){n.classList.remove('flash');void n.getBBox?.();n.classList.add('flash');}setTimeout(()=>{if(flashId===id){flashId='';world.querySelectorAll('.flash').forEach(x=>x.classList.remove('flash'));}},1600);return true;}
function toast(text){const t=wrap.querySelector('#mapToast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}
// Where a straight line from `from` toward a box's center crosses its edge.
function boxEdge(b,from){const dx=from.x-b.x,dy=from.y-b.y;if(!dx&&!dy)return {x:b.x,y:b.y};const t=Math.min(BOX.w/2/Math.abs(dx||1e-9),BOX.h/2/Math.abs(dy||1e-9));return {x:b.x+dx*t,y:b.y+dy*t};}
function circleEdge(c,to,r=R){const d=Math.hypot(to.x-c.x,to.y-c.y)||1;return {x:c.x+(to.x-c.x)/d*r,y:c.y+(to.y-c.y)/d*r};}
// 이야기 점검 per scene (the warnings, not notes), and scenes no path reaches from the first one.
function checkIssues(p){issues=new Map();try{for(const x of root.GameCore?.inspect(p)||[])if(x.event&&x.level!=='info'){if(!issues.has(x.event))issues.set(x.event,[]);issues.get(x.event).push(x.message);}}catch(e){}}
function sceneMeta(e){const p=host.project(),out=[];if(e.kind==='encounter'&&!e.ending){const W=root.GameCore,pool=p.events.filter(x=>x.kind==='encounter'&&(x.randomGroup||'')===(e.randomGroup||'')),w=x=>W?W.weightOf(x):5,total=pool.reduce((n,x)=>n+w(x),0);if(total)out.push(Math.round(w(e)/total*100)+'%'+(e.appear?.length?'*':''));}if(e.timer&&!e.ending)out.push('⏱'+e.timer.seconds);return out.join(' ');}
// 🔒 the choice has conditions, ♥ it moves or reads 호감도 (its 다른 결과 included).
function choiceMeta(p,c){const W=root.GameCore;if(!W)return '';const aff=new Set(p.definitions.filter(d=>d.type==='affinity').map(d=>d.id)),outs=[c,c.branch].filter(Boolean),conds=[...W.needsOf(c),...W.whensOf(c.branch)];
 return (W.needsOf(c).length?'🔒':'')+(outs.some(o=>W.affinityOf(o).length)||conds.some(x=>aff.has(x.id))?'♥':'');}
function sceneBox(parent,b,id,opts={}){const e=b.e,kind=e.ending==='death'?'death':e.ending?'ending':e.kind;
 const g=el('g',{class:'mapBox k-'+kind+(opts.sel?' sel':'')+(id===host.selected()?' current':'')+(issues.has(id)?' warn':'')+(opts.orphan?' orphan':'')+(flashId===id?' flash':''),'data-map-event':id},parent);
 el('rect',{x:b.x-BOX.w/2,y:b.y-BOX.h/2,width:BOX.w,height:BOX.h,rx:9},g);el('rect',{x:b.x-BOX.w/2,y:b.y-BOX.h/2+6,width:4,height:BOX.h-12,rx:2,class:'mapKind'},g);
 const n=el('text',{x:b.x-BOX.w/2+9,y:b.y-BOX.h/2+14,class:'mapNum'},g);n.textContent=(b.i+1)+(e.ending==='death'?' ☠':e.ending==='end'?' 🏁':'')+(e.kind==='encounter'?' 🎲'+(e.once?' 1회':''):'')+(opts.badge||'');
 if(issues.has(id)||opts.orphan){const w=el('text',{x:b.x+BOX.w/2-8,y:b.y-BOX.h/2+14,class:'mapWarn','text-anchor':'end'},g);w.textContent=opts.orphan?'⛔':'!';}
 // 🎲 chance in its 묶음 (* = 등장 조건) and ⏱ seconds, at the top right beside the warning mark.
 const meta=sceneMeta(e);if(meta){const m=el('text',{x:b.x+BOX.w/2-(issues.has(id)||opts.orphan?24:8),y:b.y-BOX.h/2+14,class:'mapMeta','text-anchor':'end'},g);m.textContent=meta;}
 const t=el('text',{x:b.x,y:b.y+3,class:'mapTitle','text-anchor':'middle'},g);t.textContent=short(e.title||'제목 없음',9);
 const l=el('text',{x:b.x,y:b.y+20,class:'mapLine','text-anchor':'middle'},g);l.textContent=short(preview(e.text)||(e.ending?'끝 장면':'대사 없음'),13);}
function render(){if(level==='overview')return renderOverview();renderDetail();}
function renderDetail(){
 const p=host.project();nodes=layout(p);nodes.jumps=[];nodes.notes=[];nodes.links=[];if(!drag)checkIssues(p);if(selection.size){for(const id of [...selection])if(!nodes.boxes.has(id))selection.delete(id);}world.replaceChildren();
 const notesG=el('g',{},world),links=el('g',{class:'mapLinks'},world),boxes=el('g',{},world),circles=el('g',{},world),stubs=el('g',{},world);ink=el('path',{class:'mapInk'},world);
 const circleOf=new Map(nodes.circles.map(n=>[n.c.id,n])),hubOf=new Map(nodes.hubs.map(h=>[h.gid,h]));
 // Every drawn link remembers how to cut it (지우기); the plain 다음 스토리 arrow has nothing to cut.
 const arrow=(a,b,cls,cut)=>{el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls,'marker-end':'url(#mapArrow)'},links);nodes.links.push({a,b,cut});};
 const badge=(at,text)=>{const t=el('text',{x:at.x,y:at.y,class:'mapBadge','text-anchor':'middle'},links);t.textContent=text;};
 // A link that would cross the whole map (or climb back up) becomes a small 「→ 사건」 tag; tapping it goes there.
 const jump=(at,target,stack,cut)=>{const label='→ '+(target.i+1)+'·'+short(target.e.title||'사건',7),w=label.length*7.2+14,x=at.x-w/2,y=at.y+stack*22;
  const g=el('g',{class:'mapJump','data-map-jump':target.e.id},stubs);el('rect',{x,y,width:w,height:18,rx:9},g);const t=el('text',{x:at.x,y:y+13,'text-anchor':'middle'},g);t.textContent=label;nodes.jumps.push({id:target.e.id,x,y,w,h:18,cut});};
 for(const n of p.mapNotes||[]){const lines=[];let s=String(n.text||'메모');while(s.length&&lines.length<4){lines.push(s.slice(0,11));s=s.slice(11);}if(s.length)lines[3]=lines[3].slice(0,10)+'…';const h=lines.length*NOTE.line+14;
  const g=el('g',{class:'mapNote','data-map-note':n.id},notesG);el('rect',{x:n.x,y:n.y,width:NOTE.w,height:h,rx:4},g);lines.forEach((x,k)=>{const t=el('text',{x:n.x+8,y:n.y+18+k*NOTE.line},g);t.textContent=x;});nodes.notes.push({n,x:n.x,y:n.y,w:NOTE.w,h});}
 for(const e of p.events){if(e.ending)continue;const box=nodes.boxes.get(e.id);let stack=0;
  // Several choices of one scene rolling the same 🎲: one arrow from the scene, a 🎲 under each of those choices.
  const rolls=new Map();for(const c of e.choices)if(circleOf.has(c.id))for(const o of outcomes(c)){const g=groupOf(o.next);if(g!==null&&hubOf.has(g))rolls.set(g,(rolls.get(g)||0)+1);}
  for(const [g,n]of rolls)if(n>1){const h=hubOf.get(g),a=boxEdge(box,h);arrow(a,circleEdge(h,a,HUB),'mapLink random merged',()=>{for(const c of e.choices)for(const o of outcomes(c))if(groupOf(o.next)===g)o.next='sequence';});}
  for(const c of e.choices){const circ=circleOf.get(c.id);
   if(circ){const a=boxEdge(box,circ),b=circleEdge(circ,box);el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'mapStem'},links);}
   for(const o of outcomes(c)){const branch=o!==c,from=circ||box,target=o.next==='sequence'?storyNext(p,e):p.events.find(x=>x.id===o.next),cls='mapLink'+(o.next==='sequence'?' sequence':'')+(branch?' branch':''),under={x:from.x+(circ?0:BOX.w/2+12),y:from.y+(circ?R+30:4)};
    if(target){const tb=nodes.boxes.get(target.id),start=circ?circleEdge(circ,tb):boxEdge(box,tb),far=Math.hypot(tb.x-from.x,tb.y-from.y)>FAR||tb.y<from.y-LAYER*.6;
     const cut=o.next==='sequence'?null:()=>{o.next='sequence';};if(far&&target.id!==e.id)jump(circ?{x:circ.x,y:circ.y+R+22}:{x:box.x,y:box.y+BOX.h/2+6},tb,stack++,cut);else arrow(start,boxEdge(tb,start),cls,cut);}
    else if(o.next==='sequence')badge(under,'⏭');
    else if(groupOf(o.next)!==null&&hubOf.has(groupOf(o.next))){const g=groupOf(o.next);if(circ&&rolls.get(g)>1)badge({x:circ.x,y:circ.y+R+30},'🎲');else{const h=hubOf.get(g),start=circ?circleEdge(circ,h):boxEdge(box,h);arrow(start,circleEdge(h,start,HUB),'mapLink random'+(branch?' branch':''),()=>{o.next='sequence';});}}
    else if(groupOf(o.next)!==null)badge(under,'🎲');
    else if(o.next==='end')badge(under,'🏁');}}}
 for(const h of nodes.hubs){const mb=h.members.map(e=>nodes.boxes.get(e.id)),below=mb.length>1&&mb.every(b=>b.y-BOX.h/2>h.y+HUB+30);
  // Two or more scenes in a 🎲 hang from one bar under it instead of a fan of crossing lines.
  if(below){const busY=Math.min(...mb.map(b=>b.y-BOX.h/2))-22,xs=mb.map(b=>b.x);el('line',{x1:h.x,y1:h.y+HUB,x2:h.x,y2:busY,class:'mapLink random bus'},links);el('line',{x1:Math.min(h.x,...xs),y1:busY,x2:Math.max(h.x,...xs),y2:busY,class:'mapLink random bus'},links);mb.forEach((b,k)=>arrow({x:b.x,y:busY},{x:b.x,y:b.y-BOX.h/2},'mapLink random',()=>leaveGroup(h.members[k])));}
  else for(const e of h.members){const tb=nodes.boxes.get(e.id),start=circleEdge(h,tb,HUB);arrow(start,boxEdge(tb,start),'mapLink random',()=>leaveGroup(e));}
  hubNode(circles,h,short(h.name,10)+' '+(h.members.length?h.members.length+'개 · 눌러서 목록':'· 비어 있음 (눌러서 추가)'));}
 for(const [id,b]of nodes.boxes)sceneBox(boxes,b,id,{orphan:!nodes.depth.has(id)&&b.i>0,sel:selection.has(id)});
 for(const n of nodes.circles){const g=el('g',{class:'mapChoice','data-map-choice':n.c.id},circles);el('circle',{cx:n.x,cy:n.y,r:R},g);
  const k=el('text',{x:n.x,y:n.y+5,class:'mapChoiceNum','text-anchor':'middle'},g);k.textContent=n.k+1;
  const mark=choiceMeta(p,n.c);if(mark){const m=el('text',{x:n.x+R-2,y:n.y-R+4,class:'mapChoiceMeta','text-anchor':'start'},g);m.textContent=mark;}
  const l=el('text',{x:n.x,y:n.y+R+14,class:'mapChoiceText','text-anchor':'middle'},g);l.textContent=short(n.c.text||'문구 없음',6);}
 if(!fitted){fit();fitted=true;}apply();renderMini();
}
function hubNode(parent,h,label){const g=el('g',{class:'mapHub'+(flashId==='hub:'+h.gid?' flash':''),'data-map-hub':h.gid},parent);el('circle',{cx:h.x,cy:h.y,r:HUB},g);const t=el('text',{x:h.x,y:h.y+6,'text-anchor':'middle',class:'mapHubIcon'},g);t.textContent='🎲';
 const l=el('text',{x:h.x+HUB+6,y:h.y+4,class:'mapChoiceText'},g);l.textContent=label;}
function renderOverview(){
 const p=host.project();nodes=overview(p);nodes.jumps=[];nodes.notes=[];checkIssues(p);world.replaceChildren();
 const links=el('g',{class:'mapLinks'},world),boxes=el('g',{},world),hubs=el('g',{},world);ink=el('path',{class:'mapInk'},world);
 const hubOf=new Map(nodes.hubs.map(h=>[h.gid,h])),order=new Map(nodes.stories.map((e,k)=>[e.id,k]));
 const curve=(a,b,side,bend,cls)=>{const dx=side*bend;el('path',{d:`M${a.x} ${a.y}C${a.x+dx} ${a.y},${b.x+dx} ${b.y},${b.x} ${b.y}`,class:cls,'marker-end':'url(#mapArrow)'},links);};
 const toTarget=(from,fromBox,t,isHub)=>{
  if(t.fin){const t2=el('text',{x:from.x+(isHub?HUB+8:BOX.w/2+12),y:from.y+(isHub?20:4),class:'mapBadge'},links);t2.textContent='🏁';return;}
  if(t.gid!==undefined){const h=hubOf.get(t.gid);if(!h)return;const a=fromBox?{x:from.x+BOX.w/2,y:from.y}:from;el('line',{x1:a.x,y1:a.y,x2:h.x-HUB,y2:h.y,class:'mapLink random','marker-end':'url(#mapArrow)'},links);return;}
  const tb=nodes.boxes.get(t.id);if(!tb)return;
  if(!fromBox){el('line',{x1:from.x-HUB*.7,y1:from.y+HUB*.7,x2:tb.x+BOX.w/2,y2:tb.y-BOX.h/4,class:'mapLink random','marker-end':'url(#mapArrow)'},links);return;}
  const ka=order.get(fromBox.e.id),kb=order.get(t.id);
  if(kb!==undefined&&kb===ka+1)el('line',{x1:from.x,y1:from.y+BOX.h/2,x2:tb.x,y2:tb.y-BOX.h/2,class:'mapLink','marker-end':'url(#mapArrow)'},links);
  else if(kb!==undefined){const up=kb<ka,side=up?1:-1;curve({x:from.x+side*BOX.w/2,y:from.y},{x:tb.x+side*BOX.w/2,y:tb.y},side,60+14*Math.min(6,Math.abs(kb-ka)),'mapLink skip'+(up?' back':''));}
  // Endings sit in the bottom row: their links leave the story's left side and drop onto the ending from above.
  else{const a={x:from.x-BOX.w/2,y:from.y},b={x:tb.x,y:tb.y-BOX.h/2};el('path',{d:`M${a.x} ${a.y}C${a.x-90} ${a.y},${b.x} ${b.y-90},${b.x} ${b.y}`,class:'mapLink ending','marker-end':'url(#mapArrow)'},links);}};
 for(const l of nodes.links){if(l.a){const b=nodes.boxes.get(l.a);toTarget({x:b.x,y:b.y},b,l.t);}else{const h=hubOf.get(l.hub);toTarget({x:h.x,y:h.y},null,l.t,true);}}
 for(const [id,b]of nodes.boxes){const w=nodes.from.get(id);sceneBox(boxes,b,id,{badge:w?.branches?' +'+w.branches+' 분기':''});}
 for(const h of nodes.hubs)hubNode(hubs,h,'🎲 '+short(h.name,8)+' · '+h.members.length+'개'+(h.branches?' +'+h.branches+' 분기':''));
 if(!fitted){fit();fitted=true;}apply();renderMini();
}
// 미니맵: every block as a dot-sized rectangle, and a frame for what the screen shows now.
function renderMini(){if(!mini||!nodes)return;mini.replaceChildren();const pts=allPoints();if(!pts.length){mini.hidden=true;return;}mini.hidden=false;
 const b=bounds(pts),W=104,Hm=76,pad=6,k=Math.min((W-pad*2)/Math.max(1,b.w),(Hm-pad*2)/Math.max(1,b.h)),ox=pad+(W-pad*2-b.w*k)/2-b.x0*k,oy=pad+(Hm-pad*2-b.h*k)/2-b.y0*k;
 mini.setAttribute('viewBox',`0 0 ${W} ${Hm}`);mini._map={k,ox,oy,W,Hm};
 for(const [,x]of nodes.boxes)el('rect',{x:ox+(x.x-BOX.w/2)*k,y:oy+(x.y-BOX.h/2)*k,width:Math.max(2,BOX.w*k),height:Math.max(1.5,BOX.h*k),class:'miniBox'+(x.e.ending?' end':'')},mini);
 for(const h of nodes.hubs)el('circle',{cx:ox+h.x*k,cy:oy+h.y*k,r:Math.max(1.5,HUB*k),class:'miniHub'},mini);
 el('rect',{id:'miniView',class:'miniView'},mini);
 mini._toWorld=ev=>{const r=mini.getBoundingClientRect(),m=mini._map;if(!m)return null;const sx=(ev.clientX-r.left)/r.width*m.W,sy=(ev.clientY-r.top)/r.height*m.Hm;return {x:(sx-m.ox)/m.k,y:(sy-m.oy)/m.k};};miniView();}
function miniView(){const v=mini?.querySelector('#miniView'),m=mini?._map;if(!v||!m)return;const r=rect(),a=toWorld(r.left,r.top),z=toWorld(r.right,r.bottom);
 v.setAttribute('x',m.ox+a.x*m.k);v.setAttribute('y',m.oy+a.y*m.k);v.setAttribute('width',Math.max(2,(z.x-a.x)*m.k));v.setAttribute('height',Math.max(2,(z.y-a.y)*m.k));}
// The node under a world point: 「→」 tags, then circles (they sit on lines), boxes, and memos last.
function hit(pt,slack=0){let best=null,d=Infinity;
 for(const j of nodes.jumps||[])if(pt.x>=j.x-slack&&pt.x<=j.x+j.w+slack&&pt.y>=j.y-slack&&pt.y<=j.y+j.h+slack)return {kind:'jump',id:j.id};
 for(const h of nodes.hubs)if(Math.hypot(pt.x-h.x,pt.y-h.y)<=HUB+slack)return {kind:'hub',h};for(const n of nodes.circles){const k=Math.hypot(pt.x-n.x,pt.y-n.y);if(k<=R+slack&&k<d){d=k;best={kind:'circle',n};}}if(best)return best;for(const [id,b]of nodes.boxes)if(Math.abs(pt.x-b.x)<=BOX.w/2+slack&&Math.abs(pt.y-b.y)<=BOX.h/2+slack){const k=Math.hypot(pt.x-b.x,pt.y-b.y);if(k<d){d=k;best={kind:'box',id,b};}}if(best)return best;
 for(const n of nodes.notes||[])if(pt.x>=n.x&&pt.x<=n.x+n.w&&pt.y>=n.y&&pt.y<=n.y+n.h)return {kind:'note',note:n.n,box:n};return null;}

// ---- Gestures: one pointer draws, a second one turns it into pinch zoom + move; holding still opens a menu ----
function down(ev){ev.preventDefault();try{svg.setPointerCapture(ev.pointerId);}catch(e){}pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(pointers.size===1&&!locked){if((mode==='draw'||mode==='erase')&&level==='detail'){stroke={id:ev.pointerId,pts:[toWorld(ev.clientX,ev.clientY)]};ink.setAttribute('d','');}else{const at=toWorld(ev.clientX,ev.clientY),h=hit(at,6/view.s);
  pan={id:ev.pointerId,x:ev.clientX,y:ev.clientY,view:{...view},moved:0,grab:level==='detail'&&h&&['box','circle','hub','note'].includes(h.kind)?h:null,at,target:h};
  pan.timer=setTimeout(()=>{if(pan&&pan.moved<8&&!drag&&pointers.size===1){pan.long=true;menuAt(pan.at,pan.target);}},520);}}
 else if(pointers.size===2){stroke=null;if(drag)undrag();if(pan)clearTimeout(pan.timer);pan=null;ink.setAttribute('d','');locked=true;const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,view:{...view}};}}
function move(ev){if(!pointers.has(ev.pointerId))return;pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,r=rect(),s=Math.max(.2,Math.min(3,pinch.view.s*d/pinch.d)),wx=(pinch.mx-r.left-pinch.view.x)/pinch.view.s,wy=(pinch.my-r.top-pinch.view.y)/pinch.view.s;view={s,x:mx-r.left-wx*s,y:my-r.top-wy*s};apply();return;}
 if(pan&&pan.id===ev.pointerId){const dx=ev.clientX-pan.x,dy=ev.clientY-pan.y;pan.moved=Math.max(pan.moved,Math.hypot(dx,dy));if(pan.moved>=8)clearTimeout(pan.timer);if(pan.long)return;if(pan.grab){if(pan.moved>=8){if(!drag)startDrag(pan.grab);dragTo(dx/view.s,dy/view.s);}return;}view={...pan.view,x:pan.view.x+dx,y:pan.view.y+dy};apply();return;}
 if(stroke&&stroke.id===ev.pointerId){const p=toWorld(ev.clientX,ev.clientY),last=stroke.pts[stroke.pts.length-1];if(dist(p,last)*view.s<2)return;stroke.pts.push(p);ink.setAttribute('d','M'+stroke.pts.map(q=>q.x.toFixed(1)+' '+q.y.toFixed(1)).join('L'));ink.style.strokeWidth=3/view.s;}}
function up(ev){if(!pointers.has(ev.pointerId))return;pointers.delete(ev.pointerId);
 if(pointers.size<2)pinch=null;if(!pointers.size)locked=false;
 if(pan&&pan.id===ev.pointerId){const was=pan;pan=null;clearTimeout(was.timer);if(was.long)return;if(drag){endDrag();return;}if(was.moved<8)tapAt(toWorld(ev.clientX,ev.clientY));return;}
 if(stroke&&stroke.id===ev.pointerId){const s=stroke;stroke=null;finish(s.pts);}}
function cancel(ev){pointers.delete(ev.pointerId);stroke=null;pinch=null;if(pan)clearTimeout(pan.timer);pan=null;if(drag)undrag();if(!pointers.size)locked=false;if(ink)ink.setAttribute('d','');}

// ---- Editing helpers ----
const pristine=c=>c.text==='계속'&&c.next==='sequence'&&!c.hp&&!c.mental&&!c.money&&!c.gain&&!c.lose&&!c.requires&&!c.branch&&!c.reward&&!c.map;
const round=v=>Math.round(v);
async function done(msg){if(ink)ink.setAttribute('d','');if(msg)toast(msg);busy++;try{await host.commit();render();}finally{busy--;}}
function newScene(at,kind='branch',title){const p=host.project();if(p.events.length>=1000){toast('사건은 최대 1000개까지 만들 수 있습니다.');return null;}const e=host.newEvent();e.title=title||'사건 '+(p.events.length+1);e.kind=kind;delete e.randomGroup;e.map={x:round(at.x),y:round(at.y)};p.events.push(e);return e;}
// A scene goes on to `next`: its lone untouched 계속 is reused, otherwise a new 선택지 is added (max 6).
function linkScene(A,next){if(A.ending){toast('끝 장면에서는 선을 이을 수 없어요.');return null;}
 if(A.choices.length===1&&!A.choices[0].map&&(A.choices[0].next==='sequence'||A.choices[0].next===next||groupOf(A.choices[0].next)!==null&&groupOf(next)!==null)){A.choices[0].next=next;return A.choices[0];}
 if(A.choices.length>=6){toast('선택지는 사건마다 6개까지예요.');return null;}
 if(A.choices.length===1&&A.choices[0].text==='계속')A.choices[0].text='선택지 1';
 const c=host.newChoice();c.text='선택지 '+(A.choices.length+1);c.next=next;A.choices.push(c);return c;}
const rollOf=gid=>gid?'random:'+gid:'random';
// Moving a box (its circles come along), a circle, a 🎲 or a memo. The first move pins every box where it is shown,
// so the rest of the row does not re-centre under the finger. One undo step per move.
function startDrag(h){const p=host.project(),before=p.events.map(e=>[e,e.map,e.choices.map(c=>[c,c.map])]),hubBefore=[p.hubMap,...(p.randomGroups||[]).map(g=>g.map)],noteBefore=(p.mapNotes||[]).map(n=>[n,n.x,n.y]);
 for(const [id,b]of nodes.boxes)if(!b.e.map)b.e.map={x:Math.round(b.x),y:Math.round(b.y)};
 if(h.kind==='note'){drag={before,hubBefore,noteBefore,note:h.note,from:{x:h.note.x,y:h.note.y},circles:[]};return;}
 if(h.kind==='hub'){const [obj,key]=h.h.gid?[h.h.group,'map']:[p,'hubMap'];obj[key]={x:Math.round(h.h.x),y:Math.round(h.h.y)};drag={before,hubBefore,noteBefore,hub:[obj,key],from:{...obj[key]},circles:[]};return;}
 if(h.kind==='box'&&selection.has(h.id)&&selection.size>1){const group=[...selection].map(id=>nodes.boxes.get(id)?.e).filter(Boolean);drag={before,hubBefore,noteBefore,group:group.map(e=>[e,{...e.map}]),circles:group.flatMap(e=>e.choices.filter(c=>c.map).map(c=>[c,{...c.map}]))};return;}
 if(h.kind==='box'){const e=h.b.e;drag={before,hubBefore,noteBefore,box:e,from:{...e.map},circles:e.choices.filter(c=>c.map).map(c=>[c,{...c.map}])};}
 else{const c=h.n.c;if(!c.map)c.map={x:Math.round(h.n.x),y:Math.round(h.n.y)};drag={before,hubBefore,noteBefore,circles:[[c,{...c.map}]]};}}
function dragTo(dx,dy){if(!drag)return;const to=f=>({x:Math.round(f.x+dx),y:Math.round(f.y+dy)});if(drag.note)Object.assign(drag.note,to(drag.from));if(drag.hub)drag.hub[0][drag.hub[1]]=to(drag.from);if(drag.box)drag.box.map=to(drag.from);for(const [e,from]of drag.group||[])e.map=to(from);for(const [c,from]of drag.circles)c.map=to(from);if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});}
async function endDrag(){drag=null;busy++;try{await host.commit();render();}finally{busy--;}}
function undrag(){const p=host.project(),[base,...gm]=drag.hubBefore;if(base)p.hubMap=base;else delete p.hubMap;(p.randomGroups||[]).forEach((g,i)=>{if(gm[i])g.map=gm[i];else delete g.map;});for(const [n,x,y]of drag.noteBefore)Object.assign(n,{x,y});for(const [e,map,cs]of drag.before){if(map)e.map=map;else delete e.map;for(const [c,m]of cs){if(m)c.map=m;else delete c.map;}}drag=null;render();}
function tapAt(pt){const h=hit(pt,8/view.s);
 if(level==='overview'){if(h?.kind==='box')setLevel('detail',h.id);else if(h?.kind==='hub')setLevel('detail','hub:'+h.h.gid);return;}
 if(!h&&selection.size){selection.clear();closeSheet();render();return;}
 if(h?.kind==='jump'){focus(h.id);return;}if(h?.kind==='hub'){host.openPool?.(h.h.gid);return;}if(h?.kind==='note'){noteSheet(h.note);return;}if(h?.kind==='box')host.openEvent(h.id,'content');else if(h?.kind==='circle')host.openEvent(h.n.e.id,'choices');}

// ---- Turning a stroke into scenes, choices and links ----
async function finish(pts){
 const shape=classify(pts.map(p=>({x:p.x*view.s,y:p.y*view.s}))),p=host.project(),W=v=>v/view.s,slack=18/view.s,clear=msg=>{ink.setAttribute('d','');if(msg)toast(msg);};
 if(mode==='erase'){ink.setAttribute('d','');return shape.type==='tap'?eraseAt(pts[0],12/view.s,true):eraseAlong(pts);}
 if(shape.type==='tap'){ink.setAttribute('d','');tapAt(pts[0]);return;}
 if(shape.type==='scratch'){ink.setAttribute('d','');return eraseAt({x:W(shape.x),y:W(shape.y)},Math.max(14/view.s,W(Math.min(shape.w,shape.h))/2),true);}
 if(shape.type==='check'){const v={x:W(shape.x),y:W(shape.y)},on=[v,pts[0],pts[pts.length-1]].map(q=>hit(q,slack)).find(h=>h?.kind==='box');ink.setAttribute('d','');if(!on)return toast('✓ 는 끝낼 사건 네모 위에 그려 주세요.');return endSheet(on.b.e);}
 // 크게 둘러싸기: a closed stroke around two or more scenes picks them up instead of drawing a scene or a choice.
 if(shape.type==='box'||shape.type==='circle'){const inside=[...nodes.boxes].filter(([,b])=>inPolygon(b,pts)).map(([id])=>id);if(inside.length>=2){ink.setAttribute('d','');selection.clear();inside.forEach(id=>selection.add(id));render();return selectionSheet();}}
 if(shape.type==='box'){const e=newScene({x:W(shape.x),y:W(shape.y)},'story');if(!e)return clear();return done('▭ 사건 '+p.events.length+' 만들었어요.');}
 if(shape.type==='circle'){const at={x:W(shape.x),y:W(shape.y)};let best=null,score=Infinity;
  for(const [,b]of nodes.boxes){if(b.e.ending)continue;const d=Math.hypot(at.x-b.x,at.y-b.y)+(b.y>at.y?140:0);if(d<score){score=d;best=b;}}
  if(!best||score>360)return clear('◯ 선택지는 사건 네모 가까이에 그려 주세요.');
  const e=best.e;if(e.choices.length>=6&&!(e.choices.length===1&&pristine(e.choices[0])))return clear('선택지는 사건마다 6개까지예요.');
  let c=e.choices.length===1&&pristine(e.choices[0])?e.choices[0]:null;if(!c){c=host.newChoice();e.choices.push(c);}
  c.text='선택지 '+(e.choices.indexOf(c)+1);c.map={x:round(at.x),y:round(at.y)};return done('◯ 「'+(e.title||'사건')+'」의 '+c.text);}
 if(shape.type==='line'){const a=hit(pts[0],slack),b=hit(pts[pts.length-1],slack),end=pts[pts.length-1];
  // From a scene, a choice or a 🎲 into empty space: a new scene there, already linked.
  if(a&&!b&&['box','circle','hub'].includes(a.kind)){
   if(a.kind==='box'&&a.b.e.ending)return clear('끝 장면에서는 선을 이을 수 없어요.');
   const E=newScene(end,a.kind==='hub'?'encounter':'branch');if(!E)return clear();
   if(a.kind==='hub'){if(a.h.gid)E.randomGroup=a.h.gid;return done('🎲 '+a.h.name+'에 「'+E.title+'」 만들었어요.');}
   if(a.kind==='circle'){a.n.c.next=E.id;return done(a.n.c.text+' → 새 「'+E.title+'」');}
   if(!linkScene(a.b.e,E.id)){p.events.pop();return clear();}return done('「'+a.b.e.title+'」 → 새 「'+E.title+'」');}
  if(!a||!b)return clear('선의 양 끝을 사건 네모나 선택지 동그라미에 대 주세요.');
  if(a.kind==='box'&&b.kind==='box'){if(a.id===b.id)return clear();const A=a.b.e,B=b.b.e,before=A.choices.length;const c=linkScene(A,B.id);if(!c)return clear();return done('「'+A.title+'」 '+(A.choices.length>before?c.text+' ':'')+'→ 「'+B.title+'」');}
  if(a.kind==='box'&&b.kind==='circle'){const A=a.b.e,X=b.n.e,c=b.n.c;if(X===A)return clear();if(A.ending||A.choices.length>=6)return clear(A.ending?'끝 장면에는 선택지를 달 수 없어요.':'선택지는 사건마다 6개까지예요.');
   X.choices.splice(X.choices.indexOf(c),1);if(!X.choices.length)X.choices.push(host.newChoice());
   if(A.choices.length===1&&pristine(A.choices[0]))A.choices.splice(0,1);A.choices.push(c);return done('◯ '+c.text+'을 「'+A.title+'」로 옮겼어요.');}
  if(a.kind==='circle'&&b.kind==='box'){a.n.c.next=b.id;return done(a.n.c.text+' → 「'+b.b.e.title+'」');}
  // 🎲 → 네모 puts the scene in the random pool; 동그라미/네모 → 🎲 makes that choice roll a random encounter.
  if(a.kind==='hub'&&b.kind==='box'){const E=b.b.e;if(E.ending)return clear('끝 장면은 랜덤 인카운터에 넣을 수 없어요.');const H=a.h;if(E.kind==='encounter'&&(E.randomGroup||'')===H.gid)return clear('「'+E.title+'」은 이미 🎲 '+H.name+'에 있어요.');const moved=E.kind==='encounter';E.kind='encounter';if(H.gid)E.randomGroup=H.gid;else delete E.randomGroup;return done('🎲 「'+E.title+'」을 '+H.name+(moved?'으로 옮겼어요.':'에 넣었어요.'));}
  if(a.kind==='circle'&&b.kind==='hub'){a.n.c.next=rollOf(b.h.gid);return done(a.n.c.text+' → 🎲 '+b.h.name);}
  if(a.kind==='box'&&b.kind==='hub'){const A=a.b.e,before=A.choices.length,c=linkScene(A,rollOf(b.h.gid));if(!c)return clear();return done('「'+A.title+'」 '+(A.choices.length>before?c.text+' ':'')+'→ 🎲 '+b.h.name);}
  return clear(a.kind==='circle'?'선택지 동그라미는 사건 네모로 이어 주세요.':'');}
 ink.setAttribute('d','');
}

// ---- 지우기: a scratch, a tap with the 지우개, or rubbing along links ----
function inPolygon(pt,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/((b.y-a.y)||1e-9)+a.x)inside=!inside;}return inside;}
function segDist(pt,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((pt.x-a.x)*dx+(pt.y-a.y)*dy)/((dx*dx+dy*dy)||1)));return Math.hypot(pt.x-a.x-t*dx,pt.y-a.y-t*dy);}
function leaveGroup(e){e.kind=host.project().events[0]===e?'story':'branch';delete e.randomGroup;}
function removeChoice(e,c){if(e.choices.length>1){if(e.timer?.choice===c.id)delete e.timer;e.choices.splice(e.choices.indexOf(c),1);}else{const fresh=host.newChoice();fresh.id=c.id;e.choices[0]=fresh;}}
// The nearest thing under `pt` within `r`: a scene (only when `scenes`), a choice, a memo, a 「→」 tag, then a link.
function eraseTarget(pt,r,scenes){const h=hit(pt,r);if(h?.kind==='box')return scenes?h:null;if(h&&h.kind!=='hub')return h;
 let best=null,d=Infinity;for(const l of nodes.links||[]){const k=segDist(pt,l.a,l.b);if(k<=r+6/view.s&&k<d){d=k;best={kind:'link',l};}}return best;}
async function eraseAt(pt,r,scenes){const p=host.project(),t=eraseTarget(pt,r,scenes);
 if(!t)return toast('지울 것을 찾지 못했어요. 사건 · 선택지 · 연결 · 메모 위에서 해 보세요.');
 if(t.kind==='box'){host.deleteEvent?.(t.id);return;}
 if(t.kind==='circle'){removeChoice(t.n.e,t.n.c);return done('◯ 「'+(t.n.e.title||'사건')+'」의 '+(t.n.c.text||'선택지')+' 지웠어요.');}
 if(t.kind==='note'){p.mapNotes=(p.mapNotes||[]).filter(x=>x!==t.note);return done('📝 메모를 지웠어요.');}
 const cut=t.kind==='jump'?nodes.jumps.find(j=>j.id===t.id)?.cut:t.l?.cut;
 if(!cut)return toast('「다음 스토리」로 가는 기본 연결이에요. 선택지를 지우거나 다른 곳으로 이어 주세요.');
 cut();return done('✂ 연결을 끊었어요 · 이제 「다음 스토리」로 가요.');}
// Rubbing with the 지우개: every link, choice and memo the finger passes over (scenes only by a tap, so none goes by accident).
async function eraseAlong(pts){const p=host.project(),r=10/view.s,cuts=new Set(),choices=new Map(),notes=new Set();
 for(const q of pts){const h=hit(q,r);if(h?.kind==='circle')choices.set(h.n.c,h.n.e);else if(h?.kind==='note')notes.add(h.note);else if(h?.kind==='jump'){const c=nodes.jumps.find(j=>j.id===h.id)?.cut;if(c)cuts.add(c);}else if(!h)for(const l of nodes.links)if(l.cut&&segDist(q,l.a,l.b)<=r)cuts.add(l.cut);}
 if(!cuts.size&&!choices.size&&!notes.size)return toast('지나간 곳에 지울 연결 · 선택지 · 메모가 없어요.');
 cuts.forEach(c=>c());for(const [c,e]of choices)removeChoice(e,c);if(notes.size)p.mapNotes=(p.mapNotes||[]).filter(n=>!notes.has(n));
 return done('🧽 '+[cuts.size&&'연결 '+cuts.size,choices.size&&'선택지 '+choices.size,notes.size&&'메모 '+notes.size].filter(Boolean).join(' · ')+'개를 지웠어요.');}
// ✓ 끝 장면: 엔딩 or 사망 장면 (or back to an ordinary scene).
function endSheet(e){sheet('✓ 「'+short(e.title||'사건',14)+'」 끝 장면으로',`<p class="hint">끝 장면에서는 이야기가 멈추고 ‘처음부터 다시’가 나와요. 선택지는 쓰이지 않아요.</p><div class="mapMenu"><button data-end="end" class="${e.ending==='end'?'on':''}">🏁 엔딩</button><button data-end="death" class="${e.ending==='death'?'on':''}">☠ 사망 장면</button>${e.ending?'<button data-end="">일반 사건으로</button>':''}</div>`,s=>{
 s.querySelectorAll('[data-end]').forEach(b=>b.onclick=()=>{const k=b.dataset.end;closeSheet();if(k){root.GameCore.setEnding(e,k);if(!e.endLabel)e.endLabel=(e.title||'').trim().slice(0,100)||(k==='death'?'사망':'엔딩');}else root.GameCore.setEnding(e,'');done(k?(k==='death'?'☠ 「':'🏁 「')+e.title+'」은 이제 '+(k==='death'?'사망 장면':'엔딩')+'이에요.':'「'+e.title+'」을 일반 사건으로 되돌렸어요.');});});}
// 여러 개 고르기: what can be done to all of them at once. Dragging one of them (이동) moves them together.
function selectionSheet(){const p=host.project(),ids=[...selection],list=ids.map(id=>p.events.find(e=>e.id===id)).filter(Boolean);
 sheet(list.length+'개 고름',`<p class="hint">이동 모드에서 고른 사건 하나를 끌면 함께 옮겨져요. 빈 곳을 톡 누르면 고르기를 풀어요.</p><div class="mapKinds" role="group" aria-label="진행 방식 한꺼번에"><button data-sel-kind="story">스토리로</button><button data-sel-kind="branch">분기로</button></div>
  <p class="mapSub">🎲 묶음에 넣기</p><div class="mapKinds">${groupsOf(p).map(g=>`<button data-sel-group="${escHtml(g.id)}">🎲 ${escHtml(short(g.name,8))}</button>`).join('')}</div>
  <div class="mapMenu"><button data-m="note">📝 메모 달기</button><button data-m="del" class="danger">지우기</button><button data-m="off">고르기 풀기</button></div>`,s=>{
  s.querySelectorAll('[data-sel-kind]').forEach(b=>b.onclick=()=>{const k=b.dataset.selKind;for(const e of list){if(e.ending)continue;e.kind=k;delete e.randomGroup;}done(list.length+'개를 '+(k==='story'?'스토리':'분기')+'로 바꿨어요.');selectionSheet();});
  s.querySelectorAll('[data-sel-group]').forEach(b=>b.onclick=()=>{const g=b.dataset.selGroup;let n=0;for(const e of list){if(e.ending)continue;e.kind='encounter';if(g)e.randomGroup=g;else delete e.randomGroup;n++;}done(n+'개를 🎲 '+b.textContent.replace('🎲 ','')+'에 넣었어요.');selectionSheet();});
  s.querySelector('[data-m=note]').onclick=()=>{closeSheet();const bs=list.map(e=>nodes.boxes.get(e.id)).filter(Boolean);addNote({x:Math.min(...bs.map(b=>b.x))-BOX.w/2,y:Math.min(...bs.map(b=>b.y))-BOX.h/2-70});};
  s.querySelector('[data-m=off]').onclick=()=>{selection.clear();closeSheet();render();};
  s.querySelector('[data-m=del]').onclick=()=>{if(list.length>=p.events.length)return toast('사건은 하나 이상 있어야 해요.');if(!globalThis.confirm||globalThis.confirm(list.length+'개 사건을 지울까요? 이 사건들로 오던 연결은 「다음 스토리」로 바뀌어요. ↶ 되돌리기로 복구할 수 있어요.')){const gone=new Set(list.map(e=>e.id));host.removeEvents?.(gone);selection.clear();closeSheet();done(gone.size+'개 사건을 지웠어요.');}};});}
// ---- 간격 줄이기: keep each row and the left-to-right order, close the gaps, and stack rows as tightly as their choices allow ----
function compactPositions(p){const L=layout(p),items=p.events.map(e=>({e,x:L.boxes.get(e.id).x,y:L.boxes.get(e.id).y})).sort((a,b)=>a.y-b.y),rows=[];
 for(const it of items){const r=rows[rows.length-1];if(r&&it.y-r.y0<=48)r.items.push(it);else rows.push({y0:it.y,items:[it]});}
 const wide=e=>!e.ending&&e.choices.length>1,W=e=>Math.max(BOX.w,wide(e)?e.choices.length*STEP:0),shifts=[];let y=null,below=0;
 for(const r of rows){const oldY=r.items.reduce((n,it)=>n+it.y,0)/r.items.length,above=r.items.some(it=>it.e.kind==='encounter')?84+HUB+8:BOX.h/2,ny=y===null?oldY:y+below+38+above;
  r.items.sort((a,b)=>a.x-b.x);const total=r.items.reduce((n,it)=>n+W(it.e),0)+GAP*(r.items.length-1),cx=r.items.reduce((n,it)=>n+it.x,0)/r.items.length;let x=cx-total/2;
  for(const it of r.items){it.nx=Math.round(x+W(it.e)/2);it.ny=Math.round(ny);x+=W(it.e)+GAP;}
  shifts.push([oldY,ny]);y=ny;below=Math.max(...r.items.map(it=>wide(it.e)?92+R:BOX.h/2));}
 return {items,shifts};}
function compactMap(){if(level==='overview')setLevel('detail');const p=host.project(),{items,shifts}=compactPositions(p);
 for(const it of items){it.e.map={x:it.nx,y:it.ny};for(const c of it.e.choices)delete c.map;}
 delete p.hubMap;for(const g of p.randomGroups||[])delete g.map;
 for(const n of p.mapNotes||[]){let best=shifts[0],d=Infinity;for(const s of shifts){const k=Math.abs(s[0]-(n.y+40));if(k<d){d=k;best=s;}}if(best)n.y=Math.round(n.y+best[1]-best[0]);}
 fitted=false;done('간격을 줄였어요 · ↶ 되돌리기로 원래대로');}

// ---- Sheets: 꾹 메뉴, 뼈대, 찾기, 메모 (inside the map, above the canvas) ----
function sheet(title,html,bind){const s=wrap.querySelector('#mapSheet');s.innerHTML=`<div class="mapSheetTop"><b>${escHtml(title)}</b><button data-sheet-close class="quiet">닫기</button></div><div class="mapSheetBody">${html}</div>`;s.hidden=false;s.querySelector('[data-sheet-close]').onclick=closeSheet;bind?.(s);return s;}
function closeSheet(){const s=wrap?.querySelector('#mapSheet');if(!s||s.hidden)return false;s.hidden=true;s.innerHTML='';return true;}
// Where a scene sits in 상세, even while 개요 is shown.
const placeOf=id=>(level==='detail'?nodes:layout(host.project())).boxes.get(id)||{x:0,y:0};
const KINDS=[['story','스토리'],['encounter','🎲 랜덤'],['branch','분기']];
function menuAt(at,h){const p=host.project();
 if(!h&&level==='overview')return;
 if(!h)return sheet('여기에 추가',`<div class="mapMenu"><button data-m="scene">▭ 새 사건</button><button data-m="note">📝 메모</button></div>`,s=>{
  s.querySelector('[data-m=scene]').onclick=()=>{closeSheet();const e=newScene({x:at.x,y:at.y},'story');if(e)done('▭ 「'+e.title+'」 만들었어요.');};
  s.querySelector('[data-m=note]').onclick=()=>{closeSheet();addNote(at);};});
 if(h.kind==='note')return noteSheet(h.note);
 if(h.kind==='hub')return host.openPool?.(h.h.gid);
 if(h.kind==='jump')return focus(h.id);
 const e=h.kind==='box'?h.b.e:h.n.e,i=p.events.indexOf(e),why=[...(issues.get(e.id)||[])];if(i>0&&!layout(p).depth.has(e.id))why.unshift('첫 사건에서 이 사건으로 오는 길이 없어요.');
 sheet((i+1)+' · '+short(e.title||'제목 없음',16),`${why.length?`<p class="mapWhy">${why.slice(0,3).map(escHtml).join('<br>')}</p>`:''}<div class="mapMenu">
  <button data-m="open">열기</button><button data-m="next"${e.ending?' disabled':''}>＋ 다음 사건</button><button data-m="dup">복제</button>${i>0?'<button data-m="first">첫 사건으로</button>':''}<button data-m="del" class="danger">삭제</button></div>
  ${e.ending?'':`<div class="mapKinds" role="group" aria-label="진행 방식">${KINDS.map(([k,l])=>`<button data-kind="${k}" class="${e.kind===k?'on':''}" aria-pressed="${e.kind===k}">${l}</button>`).join('')}</div>`}`,s=>{
  s.querySelector('[data-m=open]').onclick=()=>{closeSheet();host.openEvent(e.id,h.kind==='circle'?'choices':'content');};
  s.querySelector('[data-m=next]').onclick=()=>{closeSheet();const b=placeOf(e.id),E=newScene({x:b.x,y:b.y+LAYER},'branch');if(!E)return;if(!linkScene(e,E.id)){p.events.pop();return;}done('「'+e.title+'」 → 새 「'+E.title+'」');};
  s.querySelector('[data-m=dup]').onclick=()=>{closeSheet();if(p.events.length>=1000)return toast('사건은 최대 1000개까지 만들 수 있습니다.');const b=placeOf(e.id),copy=root.GameCore.copyEvent(e);copy.title=(e.title||'사건')+' 복사';copy.choices.forEach(c=>{delete c.map;});copy.map={x:round(b.x+40),y:round(b.y+40)};p.events.splice(i+1,0,copy);done('「'+copy.title+'」 만들었어요.');};
  s.querySelector('[data-m=first]')?.addEventListener('click',()=>{closeSheet();p.events.splice(i,1);p.events.unshift(e);done('「'+e.title+'」이 첫 사건이에요.');});
  s.querySelector('[data-m=del]').onclick=()=>{closeSheet();host.deleteEvent?.(e.id);};
  s.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const k=b.dataset.kind;if(k===e.kind)return;e.kind=k;if(k==='encounter'){const g=(p.randomGroups||[])[0];if(g&&!e.randomGroup)e.randomGroup=g.id;}else delete e.randomGroup;closeSheet();done('「'+e.title+'」 · '+KINDS.find(x=>x[0]===k)[1]);});});}
// ---- 메모: notes to plan with, stored in project.mapNotes ----
function addNote(at){const p=host.project();p.mapNotes||=[];if(p.mapNotes.length>=100)return toast('메모는 100개까지예요.');const n={id:'n'+host.newChoice().id.replace(/[^a-z0-9]/gi,'').slice(-12),x:round(at.x),y:round(at.y),text:''};p.mapNotes.push(n);render();noteSheet(n,true);}
function noteSheet(n,fresh){sheet(fresh?'새 메모':'메모',`<textarea id="mapNoteText" maxlength="200" rows="3" placeholder="예: 3장은 배신 엔딩으로 갈라짐">${escHtml(n.text)}</textarea><div class="mapMenu"><button data-m="save">저장</button><button data-m="del" class="danger">메모 삭제</button></div>`,s=>{
 const t=s.querySelector('#mapNoteText');setTimeout(()=>t.focus(),0);
 s.querySelector('[data-m=save]').onclick=()=>{const p=host.project();n.text=t.value.trim().slice(0,200);if(!n.text)p.mapNotes=(p.mapNotes||[]).filter(x=>x!==n);closeSheet();done(n.text?'📝 메모를 저장했어요.':'빈 메모는 지웠어요.');};
 s.querySelector('[data-m=del]').onclick=()=>{const p=host.project();p.mapNotes=(p.mapNotes||[]).filter(x=>x!==n);closeSheet();done('메모를 지웠어요.');};});}
// ---- 찾기 ----
function findSheet(){sheet('사건 찾기',`<input id="mapFindText" placeholder="사건 이름·대사" autocomplete="off"><div id="mapFindList" class="mapFindList"></div>`,s=>{const input=s.querySelector('#mapFindText'),list=s.querySelector('#mapFindList');
 const show=()=>{const q=input.value.trim().toLowerCase(),p=host.project(),found=p.events.map((e,i)=>({e,i})).filter(({e})=>!q||(e.title+' '+e.text).toLowerCase().includes(q)).slice(0,6);
  list.innerHTML=found.map(({e,i})=>`<button data-find="${e.id}"><b>${i+1} · ${escHtml(short(e.title||'제목 없음',18))}</b><small>${escHtml(short(preview(e.text),26))}</small></button>`).join('')||'<p class="hint">찾는 사건이 없어요.</p>';
  list.querySelectorAll('[data-find]').forEach(b=>b.onclick=()=>{const id=b.dataset.find;closeSheet();if(!nodes.boxes.has(id))setLevel('detail',id);else focus(id);});};
 input.oninput=show;show();setTimeout(()=>input.focus(),0);});}
// ---- 뼈대: ready-made shapes of branching stories, placed under everything and filled with placeholder scenes ----
const TEMPLATES=[
 ['merge','가지 → 합류','선택이 2~3갈래로 갈렸다가 다음 장면에서 다시 만나요.'],
 ['random','🎲 랜덤 묶음','새 묶음과 랜덤 사건 3개, 묶음이 끝나면 이어질 스토리.'],
 ['gauntlet','관문','통과하면 계속, 실패하면 사망 장면으로 끝나요.'],
 ['endings','여러 엔딩','마지막 선택에서 엔딩 둘과 배드 엔딩으로 갈라져요.'],
 ['loop','반복하며 성장','거점에서 둘러보기를 몇 번이고 하다가 떠나요.']];
function templateSheet(){const p=host.project(),sel=p.events.find(e=>e.id===host.selected()),can=sel&&!sel.ending;
 sheet('뼈대 넣기',`<p class="hint">빈 사건들이 연결된 채로 맨 아래에 생겨요. 이름과 대사만 바꿔 쓰세요.</p>${can?`<label class="mapCheck"><input type="checkbox" id="mapAttach" checked> 지금 사건 「${escHtml(short(sel.title,12))}」에서 이어지게</label>`:''}<div class="mapTemplates">${TEMPLATES.map(([k,t,d])=>`<button data-template="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`,s=>{
  s.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{const attach=can&&s.querySelector('#mapAttach')?.checked;closeSheet();insertTemplate(b.dataset.template,attach?sel:null);});});}
function insertTemplate(kind,from){const p=host.project(),need={merge:5,random:5,gauntlet:3,endings:4,loop:3}[kind];if(p.events.length+need>1000)return toast('사건은 최대 1000개까지 만들 수 있습니다.');
 if(level==='overview')setLevel('detail');const L=nodes&&nodes.boxes.size?bounds(allPoints()):{x0:0,y1:-LAYER,cx:0},x0=round(L.cx),y0=round(L.y1+LAYER*.7),made=[];
 const scene=(title,kind2,dx,dy,text='')=>{const e=newScene({x:x0+dx,y:y0+dy},kind2,title);e.text=text;e.choices=[];made.push(e);return e;},
  choice=(e,text,next)=>{const c=host.newChoice();c.text=text;c.next=next;e.choices.push(c);return c;};
 let entry,label;
 if(kind==='merge'){entry=scene('갈림길','story',0,0,'어느 쪽으로 갈까?');const merge=scene('다시 만나는 곳','story',0,LAYER*2,'갈라졌던 길이 여기서 만난다.');
  ['A','B','C'].forEach((k,n)=>{const b=scene(k+' 쪽','branch',(n-1)*200,LAYER,k+' 쪽으로 왔다.');choice(entry,k+' 쪽으로',b.id);choice(b,'계속',merge.id);});choice(merge,'계속','sequence');label='가지 → 합류';}
 if(kind==='random'){const groups=p.randomGroups||(p.randomGroups=[]);let gid='';if(groups.length<20){let n=groups.length+1;while(groups.some(g=>g.name==='묶음 '+n))n++;gid='g'+Date.now().toString(36).slice(-6)+n;groups.push({id:gid,name:'묶음 '+n,map:{x:x0,y:y0+150}});}
  entry=scene('🎲 묶음 시작','story',0,0,'무슨 일이 생길까?');choice(entry,'둘러본다',rollOf(gid));
  for(let n=0;n<3;n++){const e=scene('만남 '+(n+1),'encounter',(n-1)*200,LAYER+60,'랜덤으로 나오는 사건 '+(n+1)+'.');if(gid)e.randomGroup=gid;choice(e,'계속','sequence');}
  const after=scene('묶음 다음','story',0,LAYER*2+60,'묶음이 끝나고 이어지는 이야기.');choice(after,'계속','sequence');label='🎲 랜덤 묶음';}
 if(kind==='gauntlet'){entry=scene('시험','story',0,0,'통과할 수 있을까?');const pass=scene('통과 후','story',-120,LAYER,'무사히 통과했다.'),fail=scene('실패','branch',120,LAYER,'시험에 실패했다.');
  fail.ending='death';fail.endLabel='시험 실패';choice(entry,'통과한다',pass.id);choice(entry,'실패한다',fail.id);choice(pass,'계속','sequence');choice(fail,'처음부터','end');label='관문';}
 if(kind==='endings'){entry=scene('마지막 선택','story',0,0,'어떤 결말을 맞을까?');[['엔딩 A','end',-200],['엔딩 B','end',0],['배드 엔딩','death',200]].forEach(([t,k,dx])=>{const e=scene(t,'branch',dx,LAYER,t+' 장면.');e.ending=k;e.endLabel=t;choice(entry,t+'으로',e.id);choice(e,'처음부터','end');});label='여러 엔딩';}
 if(kind==='loop'){entry=scene('거점','story',0,0,'{처음 온 거점이다.|다시 거점이다.|익숙한 거점이다.}');const look=scene('둘러보기','branch',-120,LAYER,'{~새로운 걸 발견했다|별일 없었다}.'),leave=scene('거점 다음','story',120,LAYER,'거점을 떠났다.');
  look.once=false;choice(entry,'둘러본다',look.id);choice(entry,'떠난다',leave.id);choice(look,'돌아간다',entry.id);choice(leave,'계속','sequence');label='반복하며 성장';}
 if(from&&!linkScene(from,entry.id))toast('지금 사건에 선택지를 더 달 수 없어 연결은 하지 않았어요.');
 fitted=true;done('뼈대 「'+label+'」 · 사건 '+made.length+'개를 넣었어요.').then(()=>focus(entry.id));}

// The map reopens where it was left for the same game (back from a scene, or opened again); another game starts on the whole map.
let lastView=null;
function open(h){host=h;if(!wrap)build();setMode(mode);setLevelSilently(level);wrap.hidden=false;const key=h.key?.();if(key&&lastView?.key===key){view={...lastView.view};fitted=true;}else fitted=false;pointers.clear();stroke=pinch=null;locked=false;closeSheet();render();}
function setLevelSilently(l){const b=wrap.querySelector('#mapLevel');b.textContent=l==='overview'?'상세':'개요';b.setAttribute('aria-pressed',String(l==='overview'));wrap.dataset.level=l;hint();}
function close(o){if(!wrap||wrap.hidden)return false;const key=host?.key?.();if(key)lastView={key,view:{...view}};closeSheet();selection.clear();wrap.hidden=true;pointers.clear();stroke=pinch=pan=null;if(!o?.silent)host?.closed?.();return true;}
function isOpen(){return !!wrap&&!wrap.hidden;}
// Back closes an open sheet first (closeSheet() is true), then the app closes the map.
const api={open,close,isOpen,setMode,setLevel,selection:()=>[...selection],compactPositions,level:()=>level,focus,closeSheet,mode:()=>mode,busy:()=>busy>0,render:()=>isOpen()&&render(),classify,layout,overview,preview,_view:()=>view};
if(typeof module!=='undefined')module.exports=api;else root.StoryMap=api;
})(globalThis);
