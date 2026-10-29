const assert=require('node:assert/strict'),C=require('./assets/core.js'),V=require('./assets/vault.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// 호감도: -5~5, moved by choices (never locking them), read by 이상/이하 conditions, 등장 조건 and lines; hidden ones change quietly.
function project(){const p=C.fresh();p.randomStart=0;p.definitions=[{id:'mj',name:'민준',type:'affinity',initial:0},{id:'sy',name:'서연',type:'affinity',initial:-4,hidden:true},{id:'key',name:'열쇠',type:'item',initial:0}];
 const a=C.event(),b=C.event();a.id='start';b.id='next';a.choices[0].id='go';a.choices[0].next='start';b.choices[0].next='end';p.events=[a,b];return p;}
const go=p=>p.events[0].choices[0];
let p=project();go(p).affinity=[{id:'mj',delta:3},{id:'sy',delta:-3}];C.validate(p);let r=new C.Run(p);
assert.equal(r.value('sy'),-4);assert.equal(r.blocked(go(p)),'','lowering 호감도 never locks');
r.choose('go');assert.equal(r.value('mj'),3);assert.equal(r.value('sy'),-5,'clamped at -5');
assert.deepEqual(r.lastChange.affinity,[{id:'mj',delta:3,value:3,hidden:false},{id:'sy',delta:-1,value:-5,hidden:true}]);
assert.equal(r.message,'민준 ♥ +3','hidden 호감도 stays out of the message');
r.choose('go');assert.equal(r.value('mj'),5,'clamped at 5');assert.deepEqual(r.lastChange.affinity,[{id:'mj',delta:2,value:5,hidden:false}],'no change, no entry');
// 이상 / 이하 conditions, also negative.
p=project();C.setNeeds(go(p),[{id:'mj',count:2}],false);C.validate(p);r=new C.Run(p);assert.equal(r.blocked(go(p)),'mj');r.bag.mj=2;assert.equal(r.blocked(go(p)),'');
C.setNeeds(go(p),[{id:'sy',count:-3,le:true}],false);assert.equal(go(p).requiresLe,true);C.validate(p);r=new C.Run(p);assert.equal(r.blocked(go(p)),'','-4 ≤ -3');r.bag.sy=-2;assert.equal(r.blocked(go(p)),'sy');
// In extras, 다른 결과 and 등장 조건.
p=project();go(p).branch={hp:0,mental:0,money:0,next:'next'};C.setWhens(go(p).branch,[{id:'key',count:1},{id:'mj',count:0,le:true}],false);go(p).branch.affinity=[{id:'mj',delta:-1}];p.events[1].kind='encounter';p.events[1].appear=[{id:'mj',count:-1,le:true}];C.validate(p);
r=new C.Run(p);r.bag.key=1;assert.equal(r.outcome(go(p)),go(p).branch);r.choose('go');assert.equal(r.value('mj'),-1);assert.deepEqual(r.eligible().map(e=>e.id),['next']);
// Lines read it, negative comparisons included.
p=project();p.events[0].text='{민준>=2? 반갑다.|어색하다.}{서연<=-3? 서연이 외면한다.}';r=new C.Run(p);assert.equal(r.say(p.events[0].text),'어색하다.서연이 외면한다.');r.bag.mj=2;r.bag.sy=0;assert.equal(r.say(p.events[0].text),'반갑다.');
// Saved progress keeps negative values.
p=project();go(p).affinity=[{id:'mj',delta:-2}];r=new C.Run(p);r.choose('go');const g=V.game(p,true);g.progress={project:p,state:r.snapshot(),savedAt:g.savedAt};const back=V.resume(V.decode(V.encode({...V.create(p),games:[g],active:g.id})).games[0]);assert.equal(back.value('mj'),-2);assert.equal(back.value('sy'),-4);
// 호감도 cannot be gained, lost, remembered, rewarded or used as a combo; counts stay in range; no 없을 때 for it; items no 이하.
for(const mutate of [p=>go(p).gain='mj',p=>go(p).lose='mj',p=>go(p).remember='mj',p=>go(p).reward={pool:['mj'],count:1},p=>go(p).affinity=[{id:'key',delta:1}],p=>go(p).affinity=[{id:'mj',delta:0}],p=>go(p).affinity=[{id:'mj',delta:11}],p=>go(p).affinity=[{id:'mj',delta:1},{id:'mj',delta:2}],
 p=>{go(p).requires='mj';go(p).requiresCount=6;},p=>{go(p).requires='mj';go(p).requiresCount=1;go(p).requiresNot=true;},p=>{go(p).requires='key';go(p).requiresCount=1;go(p).requiresLe=true;},p=>p.definitions[0].initial=6,p=>p.definitions[0].initial=-6,p=>p.definitions[2].hidden=true,p=>p.definitions[0].effects=[{kind:'hpLoss',amount:1}],p=>p.events[1].appear=[{id:'mj',count:7}]]){
 const q=project();mutate(q);assert.throws(()=>C.validate(clone(q)),undefined,String(mutate));}
// 이야기 점검: read but never moved; hidden and moved but never read.
p=project();C.setNeeds(go(p),[{id:'mj',count:2}],false);assert(C.inspect(p).some(x=>x.message.includes('민준')&&x.message.includes('바꾸는 선택지가 없어')));
p=project();go(p).affinity=[{id:'sy',delta:1}];assert(C.inspect(p).some(x=>x.message.includes('서연')&&x.message.includes('아무 효과가 없습니다')));
p=project();go(p).affinity=[{id:'mj',delta:1}];p.events[1].text='{민준>=1? 안녕}';assert(!C.inspect(p).some(x=>x.message.includes('민준')),C.inspect(p).map(x=>x.message).join('\n'));
console.log('PASS 호감도: -5~5 clamp, never locks, hidden changes quiet, 이상/이하 (negative), extras/다른 결과/등장 조건, lines, saves, misuse refused, 점검.');
