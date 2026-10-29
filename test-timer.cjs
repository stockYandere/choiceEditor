const assert=require('node:assert/strict'),C=require('./assets/core.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// 시간 제한: 3~30 seconds and a 시간 초과 choice; when that choice is locked or hidden the first open one is taken.
function project(){const p=C.fresh();p.randomStart=0;p.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const a=C.event(),b=C.event();a.id='door';b.id='in';a.choices[0].id='run';a.choices[0].next='in';const wait=C.choice();wait.id='wait';wait.text='머뭇거린다';wait.next='end';a.choices.push(wait);a.timer={seconds:5,choice:'wait'};b.choices[0].next='end';p.events=[a,b];return p;}
let p=project();C.validate(p);let r=new C.Run(p);assert.equal(r.timeoutChoice(p.events[0]).id,'wait');assert.equal(r.timeoutChoice(p.events[1]),null,'no timer, no timeout choice');
C.setNeeds(p.events[0].choices[1],[{id:'key',count:1}],false);r=new C.Run(p);assert.equal(r.timeoutChoice(p.events[0]).id,'run','locked → first open choice');
p.events[0].choices[1].hideLocked=true;assert.equal(r.timeoutChoice(p.events[0]).id,'run','hidden → first open choice');
C.setNeeds(p.events[0].choices[0],[{id:'key',count:1}],false);assert.equal(r.timeoutChoice(p.events[0]),null,'nothing open');
assert(C.inspect(p).some(x=>x.message.includes('시간 초과 선택지에 조건')));
// A timer whose choice is gone, or on an ending scene, is dropped instead of breaking the project.
p=project();p.events[0].timer.choice='gone';C.validate(p);assert.equal(p.events[0].timer,undefined);
p=project();p.events[0].ending='end';C.validate(p);assert.equal(p.events[0].timer,undefined);
for(const mutate of [t=>t.seconds=2,t=>t.seconds=31,t=>t.seconds=4.5,t=>t.choice=3,t=>delete t.seconds]){const q=project();mutate(q.events[0].timer);assert.throws(()=>C.validate(clone(q)),undefined,String(mutate));}
console.log('PASS 시간 제한: timeout choice, locked/hidden fallback, nothing open, 점검 warning, stale/ending timers dropped, 3~30 seconds.');
