const assert=require('node:assert/strict'),C=require('./assets/core.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// 랜덤 등장: scenes are drawn by weight (1~10, 5 when unset) and only while their 등장 조건 hold.
function project(){const p=C.fresh();p.randomStart=0;p.definitions=[{id:'key',name:'열쇠',type:'item',initial:0},{id:'brave',name:'용기',type:'ability',initial:0}];
 const hub=C.event();hub.id='hub';hub.choices[0].id='roll';hub.choices[0].next='random';p.events=[hub];
 for(const id of ['a','b','c']){const e=C.event();e.id=id;e.title=id;e.kind='encounter';e.once=false;e.choices[0].next='end';p.events.push(e);}return p;}
const ev=(p,id)=>p.events.find(e=>e.id===id);
// Equal weights keep the old uniform draw: the same rng picks the same scene as before.
let p=project();C.validate(p);for(const [x,want]of[[0,'a'],[.34,'b'],[.99,'c']]){const r=new C.Run(p);r.choose('roll',()=>x);assert.equal(r.current,want);}
// Weights shift the chances: a=1, b=5, c=10 over 16000 draws ≈ 1/16, 5/16, 10/16.
p=project();ev(p,'a').weight=1;ev(p,'c').weight=10;C.validate(p);const counts={a:0,b:0,c:0};let seed=7;const rng=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let i=0;i<16000;i++){const r=new C.Run(p);r.choose('roll',rng);counts[r.current]++;}
assert(Math.abs(counts.a/16000-1/16)<.01&&Math.abs(counts.b/16000-5/16)<.015&&Math.abs(counts.c/16000-10/16)<.015,JSON.stringify(counts));
// 등장 조건: only drawn while they hold (all / any, 있을 때 / 없을 때, resources too).
p=project();ev(p,'a').appear=[{id:'key',count:1}];ev(p,'b').appear=[{id:'brave',count:1,not:true},{id:'@money',count:3}];C.validate(p);
let r=new C.Run(p);assert.deepEqual(r.eligible().map(e=>e.id),['b','c']);r.bag.key=1;r.bag.brave=1;assert.deepEqual(r.eligible().map(e=>e.id),['a','c']);
ev(p,'b').appearAny=true;assert.deepEqual(r.eligible().map(e=>e.id),['a','b','c'],'하나라도: 돈 3 is enough');
// When no scene's conditions hold, the roll ends the story as before (남은 랜덤 인카운터가 없습니다).
p=project();for(const id of ['a','b','c'])ev(p,id).appear=[{id:'key',count:1}];C.validate(p);r=new C.Run(p);r.choose('roll',()=>0);assert(r.ended);assert.match(r.message,/남은 랜덤/);
assert(C.inspect(p).some(x=>x.message.includes('모두 등장 조건')),'점검 warns when every scene of a group is conditional');
// 열쇠 used only as an 등장 조건 still counts as used.
p=project();ev(p,'a').appear=[{id:'key',count:1}];ev(p,'hub').choices[0].gain='key';assert(!C.inspect(p).some(x=>x.message.includes('열쇠을 얻지만')&&x.message.includes('사용처')),'appear counts as a use');
// Malformed weights and conditions are refused.
for(const mutate of [e=>e.weight=0,e=>e.weight=11,e=>e.weight=2.5,e=>e.appear=[{id:'nope',count:1}],e=>e.appear=[{id:'key',count:1},{id:'key',count:2}],e=>e.appear=[{id:'key',count:0}],e=>e.appear=[1,2,3,4],e=>e.appearAny='y',e=>e.appear={id:'key'}]){const q=project();mutate(ev(q,'a'));assert.throws(()=>C.validate(clone(q)),undefined,String(mutate));}
console.log('PASS 랜덤 등장: equal weights draw as before, weights shift chances, 등장 조건 (all/any, has/not, resources), empty pool ends, 점검 warns, appear counts as use, malformed refused.');
