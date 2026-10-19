(function(root){'use strict';
// 구조도: the whole story as boxes (사건) and circles (선택지), drawn by hand with one finger; two fingers zoom and move.
const BOX={w:132,h:50},R=19,HUB=17,LAYER=236,GAP=34,STEP=64;

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
// tap · box (closed, square-ish corners) · circle (closed, round) · line (open), in the stroke's own coordinates.
function classify(pts){
 if(!pts||!pts.length)return {type:'none'};
 const b=bounds(pts),diag=Math.hypot(b.w,b.h),len=pathLength(pts);
 if(diag<14&&len<28)return {type:'tap',x:pts[0].x,y:pts[0].y};
 const gap=dist(pts[0],pts[pts.length-1]);
 if(gap<=Math.max(22,.32*diag)&&len>1.5*diag&&Math.max(b.w,b.h)>=16){
  const h=hull(pts),fill=area(h)/Math.max(1,minRect(h));
  return {type:fill>=.87?'box':'circle',x:b.cx,y:b.cy,w:b.w,h:b.h,fill};
 }
 return {type:'line',from:pts[0],to:pts[pts.length-1]};
}

// ---- Layout: drawn positions (e.map / c.map) win; the rest stack in layers from the first scene ----
function storyNext(p,e){if(e.kind!=='story')return null;const i=p.events.indexOf(e);return p.events.find((x,j)=>j>i&&x.kind==='story')||null;}
function outcomes(c){return [c,...(c.branch?[c.branch]:[])];}
function showsCircles(e){return e.choices.length>1||e.choices.some(c=>c.map);}
function layout(p){
 const byId=new Map(p.events.map(e=>[e.id,e])),depth=new Map(),queue=[];
 if(p.events[0]){depth.set(p.events[0].id,0);queue.push(p.events[0]);}
 const encounters=p.events.filter(e=>e.kind==='encounter');
 while(queue.length){const e=queue.shift();if(e.ending)continue;for(const c of e.choices)for(const o of outcomes(c)){const ts=o.next==='sequence'?[storyNext(p,e)]:o.next==='random'?encounters:[byId.get(o.next)];for(const t of ts)if(t&&!depth.has(t.id)){depth.set(t.id,depth.get(e.id)+1);queue.push(t);}}}
 let deepest=0;for(const d of depth.values())deepest=Math.max(deepest,d);
 const layers=new Map();for(const e of p.events){const d=depth.has(e.id)?depth.get(e.id):deepest+1;if(!layers.has(d))layers.set(d,[]);layers.get(d).push(e);}
 const boxes=new Map();
 // Each scene takes the width of its box or of its row of choice circles, so neighbours' circles never overlap.
 const width=e=>Math.max(BOX.w,showsCircles(e)&&!e.ending?e.choices.length*STEP:0)+GAP;
 for(const [d,list]of layers){const auto=list.filter(e=>!e.map),total=auto.reduce((n,e)=>n+width(e),0);let x=-total/2;for(const e of auto){boxes.set(e.id,{x:x+width(e)/2,y:d*LAYER});x+=width(e);}}
 p.events.forEach((e,i)=>{const at=e.map?{x:e.map.x,y:e.map.y}:boxes.get(e.id);boxes.set(e.id,{...at,e,i});});
 // 랜덤 인카운터 is picked when played, so its choices meet at one 🎲 hub that fans out to every encounter scene.
 let hub=null;const pool=encounters.map(e=>boxes.get(e.id)).filter(Boolean);
 if(pool.length&&p.events.some(e=>!e.ending&&e.choices.some(c=>outcomes(c).some(o=>o.next==='random'))))hub={x:pool.reduce((n,b)=>n+b.x,0)/pool.length,y:Math.min(...pool.map(b=>b.y))-84};
 const circles=[];
 for(const e of p.events){if(e.ending||!showsCircles(e))continue;const b=boxes.get(e.id),n=e.choices.length;e.choices.forEach((c,k)=>circles.push({e,c,k,x:c.map?c.map.x:b.x+(k-(n-1)/2)*STEP,y:c.map?c.map.y:b.y+92}));}
 return {boxes,circles,hub,encounters};
}

// ---- View ----
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},parent)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.append(n);return n;};
const short=(s,n)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
let host=null,wrap=null,svg=null,world=null,ink=null,view={s:1,x:0,y:0},nodes=null,toastTimer=0,fitted=false;
const pointers=new Map();let stroke=null,pinch=null,pan=null,drag=null,frame=0,locked=false,busy=0,mode='move';

function build(){
 wrap=document.createElement('div');wrap.id='storyMap';wrap.className='storyMap';wrap.hidden=true;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label','구조도');
 wrap.innerHTML='<div class="mapBar"><b>구조도</b><button id="mapUndo" class="quiet">되돌리기</button><button id="mapFit" class="quiet">전체</button><button id="mapClose">닫기</button></div><p class="mapHint" id="mapHint"></p><div class="mapModes" role="group" aria-label="손가락 모드"><button data-map-mode="move">✋ 이동</button><button data-map-mode="draw">✏ 그리기</button></div><div id="mapToast" class="mapToast" role="status" aria-live="polite"></div>';
 svg=el('svg',{id:'mapCanvas',class:'mapCanvas'});const defs=el('defs',{},svg);const m=el('marker',{id:'mapArrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M0 0L10 5L0 10z',class:'mapArrowHead'},m);
 world=el('g',{id:'mapWorld'},svg);wrap.insertBefore(svg,wrap.querySelector('#mapToast'));document.body.append(wrap);
 wrap.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mapMode));
 wrap.querySelector('#mapClose').onclick=close;wrap.querySelector('#mapFit').onclick=()=>{fit();apply();};
 wrap.querySelector('#mapUndo').onclick=async()=>{if(await host.undo())render();};
 svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',cancel);
 svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,view.s*Math.exp(-e.deltaY/300));},{passive:false});
}
// 이동: one finger drags the map. 그리기: one finger draws. Two fingers always zoom and move; a tap opens in both.
function setMode(m){mode=m==='draw'?'draw':'move';wrap.dataset.mode=mode;wrap.querySelectorAll('[data-map-mode]').forEach(b=>{const on=b.dataset.mapMode===mode;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
 wrap.querySelector('#mapHint').innerHTML=mode==='draw'?'그리기 — ▭ 사건 · ◯ 선택지 · ─ 연결 · 톡 누르면 열기<br>두 손가락: 벌리고 좁혀 확대·축소, 끌어서 이동':'이동 — 빈 곳을 끌면 화면 이동, 네모·동그라미를 끌면 옮기기 · 톡 누르면 열기<br>두 손가락: 벌리고 좁혀 확대·축소 · 그리려면 ✏ 그리기';}
function apply(){world.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.s})`);}
function rect(){return svg.getBoundingClientRect();}
function toWorld(cx,cy){const r=rect();return {x:(cx-r.left-view.x)/view.s,y:(cy-r.top-view.y)/view.s};}
function zoomAt(cx,cy,s){s=Math.max(.2,Math.min(3,s));const r=rect(),px=cx-r.left,py=cy-r.top,wx=(px-view.x)/view.s,wy=(py-view.y)/view.s;view={s,x:px-wx*s,y:py-wy*s};apply();}
function fit(){const r=rect();if(!nodes||!r.width)return;const pts=[...nodes.boxes.values()].flatMap(b=>[{x:b.x-BOX.w/2,y:b.y-BOX.h/2},{x:b.x+BOX.w/2,y:b.y+BOX.h/2}]).concat(nodes.circles.map(c=>({x:c.x,y:c.y+R+16})));if(!pts.length){view={s:1,x:r.width/2,y:80};return;}const b=bounds(pts),pad=24,whole=Math.min((r.width-pad*2)/Math.max(1,b.w),(r.height-pad*2)/Math.max(1,b.h)),s=Math.max(.6,Math.min(1.2,whole));if(s<=whole+1e-6){view={s,x:r.width/2-b.cx*s,y:r.height/2-b.cy*s};return;}const first=nodes.boxes.get(host.project().events[0]?.id)||{x:b.cx,y:b.y0};view={s,x:r.width/2-first.x*s,y:pad+BOX.h/2*s-first.y*s+8};}
function toast(text){const t=wrap.querySelector('#mapToast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}
// Where a straight line from `from` toward a box's center crosses its edge.
function boxEdge(b,from){const dx=from.x-b.x,dy=from.y-b.y;if(!dx&&!dy)return {x:b.x,y:b.y};const t=Math.min(BOX.w/2/Math.abs(dx||1e-9),BOX.h/2/Math.abs(dy||1e-9));return {x:b.x+dx*t,y:b.y+dy*t};}
function circleEdge(c,to,r=R){const d=Math.hypot(to.x-c.x,to.y-c.y)||1;return {x:c.x+(to.x-c.x)/d*r,y:c.y+(to.y-c.y)/d*r};}
function render(){
 const p=host.project();nodes=layout(p);world.replaceChildren();
 const links=el('g',{class:'mapLinks'},world),boxes=el('g',{},world),circles=el('g',{},world);ink=el('path',{class:'mapInk'},world);
 const circleOf=new Map(nodes.circles.map(n=>[n.c.id,n]));
 const arrow=(a,b,cls)=>el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:cls,'marker-end':'url(#mapArrow)'},links);
 const badge=(at,text)=>{const t=el('text',{x:at.x,y:at.y,class:'mapBadge','text-anchor':'middle'},links);t.textContent=text;};
 for(const e of p.events){if(e.ending)continue;const box=nodes.boxes.get(e.id);
  for(const c of e.choices){const circ=circleOf.get(c.id);
   if(circ){const a=boxEdge(box,circ),b=circleEdge(circ,box);el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'mapStem'},links);}
   for(const o of outcomes(c)){const branch=o!==c,from=circ||box,target=o.next==='sequence'?storyNext(p,e):p.events.find(x=>x.id===o.next),cls='mapLink'+(o.next==='sequence'?' sequence':'')+(branch?' branch':'');
    if(target){const tb=nodes.boxes.get(target.id),start=circ?circleEdge(circ,tb):boxEdge(box,tb);arrow(start,boxEdge(tb,start),cls);}
    else if(o.next==='sequence')badge({x:from.x+(circ?0:BOX.w/2+12),y:from.y+(circ?R+30:4)},'⏭');
    else if(o.next==='random'&&nodes.hub){const start=circ?circleEdge(circ,nodes.hub):boxEdge(box,nodes.hub);arrow(start,circleEdge({x:nodes.hub.x,y:nodes.hub.y},start,HUB),'mapLink random'+(branch?' branch':''));}
    else if(o.next==='random')badge({x:from.x+(circ?0:BOX.w/2+12),y:from.y+(circ?R+30:4)},'🎲');
    else if(o.next==='end')badge({x:from.x+(circ?0:BOX.w/2+12),y:from.y+(circ?R+30:4)},'🏁');}}}
 if(nodes.hub){const h=nodes.hub;for(const e of nodes.encounters){const tb=nodes.boxes.get(e.id),start=circleEdge(h,tb,HUB);arrow(start,boxEdge(tb,start),'mapLink random');}
  const g=el('g',{class:'mapHub','data-map-hub':''},circles);el('circle',{cx:h.x,cy:h.y,r:HUB},g);const t=el('text',{x:h.x,y:h.y+6,'text-anchor':'middle',class:'mapHubIcon'},g);t.textContent='🎲';const l=el('text',{x:h.x+HUB+6,y:h.y+4,class:'mapChoiceText'},g);l.textContent='랜덤 인카운터';}
 for(const [id,b]of nodes.boxes){const e=b.e,g=el('g',{class:'mapBox'+(e.ending==='death'?' death':e.ending==='end'?' ending':'')+(id===host.selected()?' current':''),'data-map-event':id},boxes);
  el('rect',{x:b.x-BOX.w/2,y:b.y-BOX.h/2,width:BOX.w,height:BOX.h,rx:9},g);
  const n=el('text',{x:b.x-BOX.w/2+8,y:b.y-BOX.h/2+15,class:'mapNum'},g);n.textContent=(b.i+1)+(e.ending==='death'?' ☠':e.ending==='end'?' 🏁':'');
  const t=el('text',{x:b.x,y:b.y+11,class:'mapTitle','text-anchor':'middle'},g);t.textContent=short(e.title||'제목 없음',9);}
 for(const n of nodes.circles){const g=el('g',{class:'mapChoice','data-map-choice':n.c.id},circles);el('circle',{cx:n.x,cy:n.y,r:R},g);
  const k=el('text',{x:n.x,y:n.y+5,class:'mapChoiceNum','text-anchor':'middle'},g);k.textContent=n.k+1;
  const l=el('text',{x:n.x,y:n.y+R+14,class:'mapChoiceText','text-anchor':'middle'},g);l.textContent=short(n.c.text||'문구 없음',6);}
 if(!fitted){fit();fitted=true;}apply();
}
// The node under a world point: circles first (they sit on lines), then boxes.
function hit(pt,slack=0){let best=null,d=Infinity;for(const n of nodes.circles){const k=Math.hypot(pt.x-n.x,pt.y-n.y);if(k<=R+slack&&k<d){d=k;best={kind:'circle',n};}}if(best)return best;for(const [id,b]of nodes.boxes)if(Math.abs(pt.x-b.x)<=BOX.w/2+slack&&Math.abs(pt.y-b.y)<=BOX.h/2+slack){const k=Math.hypot(pt.x-b.x,pt.y-b.y);if(k<d){d=k;best={kind:'box',id,b};}}return best;}

// ---- Gestures: one pointer draws, a second one turns it into pinch zoom + move ----
function down(ev){ev.preventDefault();try{svg.setPointerCapture(ev.pointerId);}catch(e){}pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(pointers.size===1&&!locked){if(mode==='draw'){stroke={id:ev.pointerId,pts:[toWorld(ev.clientX,ev.clientY)]};ink.setAttribute('d','');}else{const at=toWorld(ev.clientX,ev.clientY),h=hit(at,6/view.s);pan={id:ev.pointerId,x:ev.clientX,y:ev.clientY,view:{...view},moved:0,grab:h&&(h.kind==='box'||h.kind==='circle')?h:null,at};}}
 else if(pointers.size===2){stroke=null;if(drag)undrag();pan=null;ink.setAttribute('d','');locked=true;const [a,b]=[...pointers.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,view:{...view}};}}
function move(ev){if(!pointers.has(ev.pointerId))return;pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
 if(pinch&&pointers.size>=2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2,r=rect(),s=Math.max(.2,Math.min(3,pinch.view.s*d/pinch.d)),wx=(pinch.mx-r.left-pinch.view.x)/pinch.view.s,wy=(pinch.my-r.top-pinch.view.y)/pinch.view.s;view={s,x:mx-r.left-wx*s,y:my-r.top-wy*s};apply();return;}
 if(pan&&pan.id===ev.pointerId){const dx=ev.clientX-pan.x,dy=ev.clientY-pan.y;pan.moved=Math.max(pan.moved,Math.hypot(dx,dy));if(pan.grab){if(pan.moved>=8){if(!drag)startDrag(pan.grab);dragTo(dx/view.s,dy/view.s);}return;}view={...pan.view,x:pan.view.x+dx,y:pan.view.y+dy};apply();return;}
 if(stroke&&stroke.id===ev.pointerId){const p=toWorld(ev.clientX,ev.clientY),last=stroke.pts[stroke.pts.length-1];if(dist(p,last)*view.s<2)return;stroke.pts.push(p);ink.setAttribute('d','M'+stroke.pts.map(q=>q.x.toFixed(1)+' '+q.y.toFixed(1)).join('L'));ink.style.strokeWidth=3/view.s;}}
function up(ev){if(!pointers.has(ev.pointerId))return;pointers.delete(ev.pointerId);
 if(pointers.size<2)pinch=null;if(!pointers.size)locked=false;
 if(pan&&pan.id===ev.pointerId){const was=pan;pan=null;if(drag){endDrag();return;}if(was.moved<8)tapAt(toWorld(ev.clientX,ev.clientY));return;}
 if(stroke&&stroke.id===ev.pointerId){const s=stroke;stroke=null;finish(s.pts);}}
function cancel(ev){pointers.delete(ev.pointerId);stroke=null;pinch=null;pan=null;if(drag)undrag();if(!pointers.size)locked=false;if(ink)ink.setAttribute('d','');}

// ---- Turning a stroke into scenes, choices and links ----
const pristine=c=>c.text==='계속'&&c.next==='sequence'&&!c.hp&&!c.mental&&!c.money&&!c.gain&&!c.lose&&!c.requires&&!c.branch&&!c.reward&&!c.map;
const round=v=>Math.round(v);
// Moving a box (its circles come along) or a single circle. The first move pins every box where it is shown,
// so the rest of the row does not re-centre under the finger. One undo step per move.
function startDrag(h){const p=host.project(),before=p.events.map(e=>[e,e.map,e.choices.map(c=>[c,c.map])]);
 for(const [id,b]of nodes.boxes)if(!b.e.map)b.e.map={x:Math.round(b.x),y:Math.round(b.y)};
 if(h.kind==='box'){const e=h.b.e;drag={before,box:e,from:{...e.map},circles:e.choices.filter(c=>c.map).map(c=>[c,{...c.map}])};}
 else{const c=h.n.c;if(!c.map)c.map={x:Math.round(h.n.x),y:Math.round(h.n.y)};drag={before,circles:[[c,{...c.map}]]};}}
function dragTo(dx,dy){if(!drag)return;if(drag.box)drag.box.map={x:Math.round(drag.from.x+dx),y:Math.round(drag.from.y+dy)};for(const [c,from]of drag.circles)c.map={x:Math.round(from.x+dx),y:Math.round(from.y+dy)};if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();});}
async function endDrag(){drag=null;busy++;try{await host.commit();render();}finally{busy--;}}
function undrag(){for(const [e,map,cs]of drag.before){if(map)e.map=map;else delete e.map;for(const [c,m]of cs){if(m)c.map=m;else delete c.map;}}drag=null;render();}
function tapAt(pt){const h=hit(pt,8/view.s);if(h?.kind==='box')host.openEvent(h.id,'content');else if(h?.kind==='circle')host.openEvent(h.n.e.id,'choices');}
async function finish(pts){
 const shape=classify(pts.map(p=>({x:p.x*view.s,y:p.y*view.s}))),p=host.project(),W=v=>v/view.s,slack=18/view.s;
 const done=async(msg)=>{ink.setAttribute('d','');if(msg)toast(msg);busy++;try{await host.commit();render();}finally{busy--;}};
 if(shape.type==='tap'){ink.setAttribute('d','');tapAt(pts[0]);return;}
 if(shape.type==='box'){if(p.events.length>=1000){ink.setAttribute('d','');return toast('사건은 최대 1000개까지 만들 수 있습니다.');}
  const e=host.newEvent();e.title='사건 '+(p.events.length+1);e.map={x:round(W(shape.x)),y:round(W(shape.y))};p.events.push(e);return done('▭ 사건 '+p.events.length+' 만들었어요.');}
 if(shape.type==='circle'){const at={x:W(shape.x),y:W(shape.y)};let best=null,score=Infinity;
  for(const [,b]of nodes.boxes){if(b.e.ending)continue;const d=Math.hypot(at.x-b.x,at.y-b.y)+(b.y>at.y?140:0);if(d<score){score=d;best=b;}}
  if(!best||score>360){ink.setAttribute('d','');return toast('◯ 선택지는 사건 네모 가까이에 그려 주세요.');}
  const e=best.e;if(e.choices.length>=6&&!(e.choices.length===1&&pristine(e.choices[0]))){ink.setAttribute('d','');return toast('선택지는 사건마다 6개까지예요.');}
  let c=e.choices.length===1&&pristine(e.choices[0])?e.choices[0]:null;if(!c){c=host.newChoice();e.choices.push(c);}
  c.text='선택지 '+(e.choices.indexOf(c)+1);c.map={x:round(at.x),y:round(at.y)};return done('◯ 「'+(e.title||'사건')+'」의 '+c.text);}
 if(shape.type==='line'){const a=hit(pts[0],slack),b=hit(pts[pts.length-1],slack);
  if(!a||!b){ink.setAttribute('d','');return toast('선의 양 끝을 사건 네모나 선택지 동그라미에 대 주세요.');}
  if(a.kind==='box'&&b.kind==='box'){if(a.id===b.id){ink.setAttribute('d','');return;}const A=a.b.e,B=b.b.e;if(A.ending){ink.setAttribute('d','');return toast('끝 장면에서는 선을 이을 수 없어요.');}
   if(A.choices.length===1&&!A.choices[0].map&&(A.choices[0].next==='sequence'||A.choices[0].next===B.id)){A.choices[0].next=B.id;return done('「'+A.title+'」 → 「'+B.title+'」');}
   if(A.choices.length>=6){ink.setAttribute('d','');return toast('선택지는 사건마다 6개까지예요.');}
   if(A.choices.length===1&&A.choices[0].text==='계속')A.choices[0].text='선택지 1';
   const c=host.newChoice();c.text='선택지 '+(A.choices.length+1);c.next=B.id;A.choices.push(c);return done('「'+A.title+'」 '+c.text+' → 「'+B.title+'」');}
  if(a.kind==='box'&&b.kind==='circle'){const A=a.b.e,X=b.n.e,c=b.n.c;if(X===A){ink.setAttribute('d','');return;}if(A.ending||A.choices.length>=6){ink.setAttribute('d','');return toast(A.ending?'끝 장면에는 선택지를 달 수 없어요.':'선택지는 사건마다 6개까지예요.');}
   X.choices.splice(X.choices.indexOf(c),1);if(!X.choices.length)X.choices.push(host.newChoice());
   if(A.choices.length===1&&pristine(A.choices[0]))A.choices.splice(0,1);A.choices.push(c);return done('◯ '+c.text+'을 「'+A.title+'」로 옮겼어요.');}
  if(a.kind==='circle'&&b.kind==='box'){a.n.c.next=b.id;return done(a.n.c.text+' → 「'+b.b.e.title+'」');}
  ink.setAttribute('d','');return toast(a.kind==='circle'?'선택지 동그라미는 사건 네모로 이어 주세요.':'');}
 ink.setAttribute('d','');
}

function open(h){host=h;if(!wrap)build();setMode(mode);wrap.hidden=false;fitted=false;pointers.clear();stroke=pinch=null;locked=false;render();}
function close(){if(!wrap||wrap.hidden)return false;wrap.hidden=true;pointers.clear();stroke=pinch=null;host?.closed?.();return true;}
function isOpen(){return !!wrap&&!wrap.hidden;}
const api={open,close,isOpen,setMode,mode:()=>mode,busy:()=>busy>0,render:()=>isOpen()&&render(),classify,layout,_view:()=>view};
if(typeof module!=='undefined')module.exports=api;else root.StoryMap=api;
})(globalThis);
