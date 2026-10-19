const assert=require('node:assert/strict');const M=require('./assets/story-map.js'),C=require('./assets/core.js');
// Hand-drawn strokes: wobble, tilt, overshoot or a small gap at the join, rounded corners.
let seed=7;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647)-.5;
const wob=(pts,a)=>pts.map(p=>({x:p.x+rnd()*a,y:p.y+rnd()*a}));
const rot=(pts,deg,cx=0,cy=0)=>{const t=deg*Math.PI/180;return pts.map(p=>({x:cx+(p.x-cx)*Math.cos(t)-(p.y-cy)*Math.sin(t),y:cy+(p.x-cx)*Math.sin(t)+(p.y-cy)*Math.cos(t)}));};
function rect(w,h,{round=0,gap=0,over=0}={}){const pts=[],per=2*(w+h),n=120;for(let i=0;i<=n;i++){let d=(i/n)*(per-gap+over);d%=per;let x,y;if(d<w){x=d;y=0}else if(d<w+h){x=w;y=d-w}else if(d<2*w+h){x=w-(d-w-h);y=h}else{x=0;y=h-(d-2*w-h)}
 if(round){x=Math.min(Math.max(x,round*.3),w-round*.3);y=Math.min(Math.max(y,round*.3),h-round*.3);}pts.push({x,y});}return pts;}
function ellipse(rx,ry,{gap=0,over=0,start=0}={}){const pts=[],n=90,sweep=2*Math.PI*(1-gap)+over;for(let i=0;i<=n;i++){const t=start+sweep*i/n;pts.push({x:rx*Math.cos(t),y:ry*Math.sin(t)});}return pts;}
const kind=pts=>M.classify(pts).type;
for(const [w,h]of[[160,80],[120,70],[200,90],[90,90]])for(const deg of [0,8,-12,20])for(const opt of [{},{gap:14},{over:20},{round:14}])assert.equal(kind(wob(rot(rect(w,h,opt),deg),5)),'box',`box ${w}x${h} ${deg}° ${JSON.stringify(opt)}`);
for(const [rx,ry]of[[30,30],[40,32],[26,22],[60,50]])for(const opt of [{},{gap:.06},{over:.4},{start:1.2}])for(const deg of [0,25])assert.equal(kind(wob(rot(ellipse(rx,ry,opt),deg),3)),'circle',`circle ${rx}x${ry} ${JSON.stringify(opt)}`);
// Lines: straight, curved, wiggly; taps.
assert.equal(kind(wob(Array.from({length:40},(_,i)=>({x:i*6,y:i*9})),3)),'line');
assert.equal(kind(Array.from({length:40},(_,i)=>({x:i*7,y:Math.sin(i/12)*80}))),'line');
assert.equal(kind(Array.from({length:30},(_,i)=>({x:Math.sin(i/9)*90,y:i*8}))),'line');
assert.equal(kind([{x:5,y:5},{x:7,y:6}]),'tap');assert.equal(kind([{x:5,y:5}]),'tap');
// Layout: first scene on top, choices as circles under a scene with two of them, drawn positions kept.
const p=C.fresh(),a=C.event(),b=C.event(),c=C.event();a.title='A';b.title='B';c.title='C';a.choices.push({...C.choice(),text:'둘'});a.choices[0].next=b.id;a.choices[1].next=c.id;c.map={x:900,y:-40};p.events=[a,b,c];C.validate(p);
const L=M.layout(p);assert(L.boxes.get(b.id).y>L.boxes.get(a.id).y);assert.equal(L.circles.length,2);assert.deepEqual([L.boxes.get(c.id).x,L.boxes.get(c.id).y],[900,-40]);
// Bad positions are rejected by validation.
const bad=structuredClone(p);bad.events[0].map={x:'1',y:0};assert.throws(()=>C.validate(bad),/구조도/);
console.log('PASS story map: boxes (tilted, rounded, gaps, overshoot), circles/ellipses, straight/curved lines, taps, layered layout with drawn positions, position validation.');
