const assert=require('node:assert/strict');
const C=require('./assets/core.js'),V=require('./assets/vault.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const ev=(title,kind='story')=>{const e=C.event();e.title=title;e.text=title;e.kind=kind;return e;};
const game=()=>{const p=C.fresh();p.randomStart=0;return p;};
// An ending scene never comes out of a 🎲 pool, however it got its 끝 장면 mark.
{const p=game(),hub=ev('거점'),a=ev('만남','encounter'),fin=ev('끝','encounter');hub.choices[0].next='random';a.choices[0].next=hub.id;a.once=false;fin.ending='end';p.events=[hub,a,fin];
 const r=new C.Run(clone(p));assert.deepEqual(r.eligible('').map(e=>e.title),['만남']);
 const v=C.validate(clone(p));assert.equal(v.events[2].kind,'branch','loading tidies an ending left in a pool');
 const e=ev('풀 사건','encounter');e.randomGroup='gx';e.timer={seconds:5,choice:e.choices[0].id};C.setEnding(e,'death');assert.deepEqual([e.ending,e.kind,e.randomGroup,e.timer],['death','branch',undefined,undefined]);e.endLabel='추락';C.setEnding(e,'');assert.deepEqual([e.ending,e.endLabel,e.kind],[undefined,undefined,'branch']);}
// A copy has its own ids and its 시간 초과 choice follows.
{const e=ev('원본');e.choices.push(C.choice());e.timer={seconds:5,choice:e.choices[1].id};const c=C.copyEvent(e);assert.notEqual(c.id,e.id);assert.equal(new Set([...e.choices,...c.choices].map(x=>x.id)).size,4);assert.equal(c.timer.choice,c.choices[1].id);assert.equal(e.timer.choice,e.choices[1].id);}
// 자동 플레이: a choice that draws from an emptied 🎲 pool is its own result, not a normal 이야기 끝.
{const p=game(),hub=ev('거점'),a=ev('하나','encounter'),b=ev('둘','encounter'),fin=ev('진엔딩','branch');hub.choices[0].next='random';const out=C.choice();out.text='나간다';out.next=fin.id;hub.choices.push(out);for(const e of [a,b]){e.once=true;e.choices[0].next=hub.id;}fin.ending='end';p.events=[hub,a,b,fin];C.validate(p);
 const r=C.autoplayReport(p,{runs:400,seed:3});assert.equal(r.dry.length,1);assert.equal(r.dry[0].scene,hub.id);assert(r.dry[0].count>0);assert.equal(r.dry[0].path.at(-1).scene,hub.id);
 assert.equal(r.endings.find(x=>x.key==='@end')?.count||0,0,'not counted as 이야기 끝');assert.equal(r.endings.reduce((n,x)=>n+x.count,0)+r.dry[0].count+r.stuck.reduce((n,x)=>n+x.count,0)+r.loops.reduce((n,x)=>n+x.count,0),400,'every run is in one bucket');
 const one=C.autoplay(p,C.seeded(1));assert(['end','dry'].includes(one.result));}
// {~…} in a choice no longer moves in step with the line above it.
{const p=game(),e=ev('비');e.text='{~비|눈|바람}';e.choices[0].text='{~우산|장화|모자}';const c2=C.choice();c2.text='{~빨강|초록|파랑}';e.choices.push(c2);p.events=[e];const seen=new Set();
 for(let turn=0;turn<300;turn++){const r=new C.Run(clone(p));r.turn=turn;const x=r.p.events[0];seen.add([r.say(x.text,x),r.say(x.choices[0].text,x,x.choices[0].id),r.say(x.choices[1].text,x,x.choices[1].id)].join('/'));}
 assert(seen.size>9,'combinations vary independently: '+seen.size);
 const r=new C.Run(clone(p)),x=r.p.events[0];assert.equal(r.say(x.choices[0].text,x,x.choices[0].id),r.say(x.choices[0].text,x,x.choices[0].id),'still stable within a turn');}
// Built-in names that every object has are not resources.
{const p=game(),e=ev('문');e.choices[0].requires='constructor';p.events=[e];assert.throws(()=>C.validate(p),/선택 조건/);const q=game(),f=ev('문');f.choices[0].requires='@hp';q.events=[f];C.validate(q);}
// Same data whatever the key order; used for 반영됨 and for skipping games a backup already has.
{assert.equal(V.same({a:1,b:[1,{c:2}]},{b:[1,{c:2}],a:1}),true);assert.equal(V.same({a:1,b:undefined},{a:1}),true);assert.equal(V.same({a:1},{a:2}),false);assert.equal(V.same([1,2],[1,2,3]),false);assert.equal(V.same({a:null},{a:{}}),false);}
console.log('PASS review fixes: endings stay out of 🎲 pools, copies keep their timer, emptied pools counted apart, independent {~…}, own-name resources, order-free comparison.');
