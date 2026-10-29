const assert=require('node:assert/strict'),C=require('./assets/core.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// 조건 여러 개 (모두 만족 / 하나라도, 있을 때·없을 때 섞기), 다른 결과의 여러 조건, 한 선택지로 여러 개 얻기·잃기.
function project(){const p=C.fresh();p.randomStart=0;p.definitions=[{id:'key',name:'열쇠',type:'item',initial:1},{id:'map',name:'지도',type:'item',initial:0},{id:'torch',name:'횃불',type:'item',initial:2},{id:'brave',name:'용기',type:'ability',initial:0},{id:'met',name:'만남',type:'memory',initial:0}];
 const a=C.event(),b=C.event();a.id='start';b.id='next';a.choices[0].id='go';a.choices[0].next='next';b.choices[0].id='stay';b.choices[0].next='end';p.events=[a,b];return p;}
const go=p=>p.events[0].choices[0];
// 모두 만족: every condition must hold; the first failing one is the reason.
let p=project();C.setNeeds(go(p),[{id:'key',count:1},{id:'map',count:1}],false);C.validate(p);let r=new C.Run(p);
assert.equal(r.blocked(go(p)),'map');r.bag.map=1;assert.equal(r.blocked(go(p)),'');
// 없을 때 mixes in: needs the key but no 용기.
p=project();C.setNeeds(go(p),[{id:'key',count:1},{id:'brave',count:1,not:true}],false);r=new C.Run(p);assert.equal(r.blocked(go(p)),'');r.bag.brave=1;assert.equal(r.blocked(go(p)),'brave');
// 하나라도: any one condition is enough.
p=project();C.setNeeds(go(p),[{id:'map',count:1},{id:'@money',count:3}],true);C.validate(p);r=new C.Run(p);assert.equal(r.blocked(go(p)),'');r.money=1;assert.equal(r.blocked(go(p)),'map');r.bag.map=1;assert.equal(r.blocked(go(p)),'');
// Three conditions round-trip through the old fields plus requiresMore.
p=project();C.setNeeds(go(p),[{id:'key',count:1},{id:'torch',count:2},{id:'met',count:1,not:true}],false);assert.equal(go(p).requires,'key');assert.deepEqual(go(p).requiresMore,[{id:'torch',count:2},{id:'met',count:1,not:true}]);assert.deepEqual(C.needsOf(go(p)).map(x=>x.id),['key','torch','met']);
C.setNeeds(go(p),[],false);assert.equal(go(p).requires,'');assert.equal(go(p).requiresMore,undefined);assert.equal(go(p).requiresAny,undefined);
// Several gains and losses in one choice; losing too little of any one locks the choice.
p=project();C.setItems(go(p),'gain',[{id:'map',count:1},{id:'brave',count:1},{id:'met',count:1}]);C.setItems(go(p),'lose',[{id:'key',count:1},{id:'torch',count:2}]);C.validate(p);r=new C.Run(p);
assert(r.choose('go'));assert.deepEqual([r.bag.map,r.bag.brave,r.bag.met,r.bag.key,r.bag.torch],[1,1,1,0,0]);
assert.deepEqual(r.lastChange.items,[{id:'key',delta:-1},{id:'torch',delta:-2},{id:'map',delta:1},{id:'brave',delta:1}],'memories stay quiet');assert.match(r.message,/열쇠 −1 · 횃불 −2 · 지도 \+1 · 용기 \+1/);
p=project();C.setItems(go(p),'lose',[{id:'key',count:1},{id:'torch',count:3}]);r=new C.Run(p);assert.equal(r.blocked(go(p)),'torch');
// 다른 결과 with several conditions (모두 / 하나라도) and its own several items.
p=project();go(p).branch={hp:0,mental:0,money:0,next:'end'};C.setWhens(go(p).branch,[{id:'key',count:1},{id:'map',count:1}],false);C.setItems(go(p).branch,'gain',[{id:'brave',count:1},{id:'met',count:1}]);C.setItems(go(p).branch,'lose',[{id:'key',count:1}]);C.validate(p);
r=new C.Run(p);assert.equal(r.outcome(go(p)),go(p),'needs both');r.bag.map=1;assert.equal(r.outcome(go(p)),go(p).branch);r.choose('go');assert(r.ended);assert.deepEqual([r.bag.brave,r.bag.met,r.bag.key],[1,1,0]);
p.events[0].choices[0].branch.whenAny=true;r=new C.Run(p);assert.equal(r.outcome(go(p)),go(p).branch,'any one');
p=project();go(p).branch={hp:0,mental:0,money:0,next:'end'};C.setWhens(go(p).branch,[{id:'brave',count:1,not:true}],false);C.validate(p);r=new C.Run(p);assert.equal(r.outcome(go(p)),go(p).branch,'없을 때 as the only branch condition');r.bag.brave=1;assert.equal(r.outcome(go(p)),go(p));
// Older projects (one condition, one item) read and play exactly as before.
p=project();Object.assign(go(p),{requires:'key',requiresCount:1,gain:'map',gainCount:2,lose:'torch',loseCount:1});C.validate(p);r=new C.Run(p);r.choose('go');assert.deepEqual([r.bag.map,r.bag.torch],[2,1]);
// Malformed extras are refused: too many, unknown, repeated, extras without a first, bad counts, 없을 때 on items.
for(const mutate of [c=>c.requiresMore=[{id:'map',count:1},{id:'torch',count:1},{id:'brave',count:1}],c=>c.requiresMore=[{id:'nope',count:1}],c=>c.requiresMore=[{id:'key',count:1}],c=>{c.requires='';c.requiresMore=[{id:'map',count:1}];},c=>c.requiresMore=[{id:'map',count:0}],c=>c.gainMore=[{id:'map',count:1,not:true}],c=>c.loseMore=[{id:'@hp',count:1}],c=>c.requiresAny='yes',c=>{c.branch={when:'key',count:1,hp:0,mental:0,money:0,next:'end',whenMore:[{id:'key',count:1}]};}]){
 const q=project();Object.assign(go(q),{requires:'key',requiresCount:1});go(q).gain='map';mutate(go(q));assert.throws(()=>C.validate(clone(q)),undefined,String(mutate));}
// 이야기 점검 counts extras as sources and uses.
p=project();p.definitions.push({id:'gem',name:'보석',type:'item',initial:0},{id:'coin',name:'동전',type:'item',initial:0});C.setItems(go(p),'gain',[{id:'map',count:1},{id:'gem',count:1}]);C.setNeeds(p.events[1].choices[0],[{id:'key',count:1},{id:'gem',count:1}],false);
let issues=C.inspect(p).map(x=>x.message).join('\n');assert(!issues.includes('보석을 얻지만'),issues);
C.setItems(p.events[1].choices[0],'lose',[{id:'torch',count:1},{id:'coin',count:1}]);issues=C.inspect(p).map(x=>x.message).join('\n');assert(issues.includes('동전을 얻은 뒤'),issues);
console.log('PASS multiple conditions (all/any, has/not), several gains and losses, multi-condition 다른 결과, old single-field projects, malformed extras refused, inspect sees extras.');
