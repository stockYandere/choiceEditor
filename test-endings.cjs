const assert=require('node:assert/strict'),C=require('./assets/core.js'),V=require('./assets/vault.js');
// 엔딩 모음: the slots of a game, the key a finished run lands on, and 2회차 lines ({#엔딩 이름? …}, {#엔딩>=n? …}).
function project(){const p=C.fresh();p.randomStart=0;const a=C.event(),good=C.event(),bad=C.event();a.id='start';a.title='갈림길';a.choices[0].id='toGood';a.choices[0].next='good';const b=C.choice();b.id='toBad';b.next='bad';const q=C.choice();q.id='quit';q.next='end';const hurt=C.choice();hurt.id='hurt';hurt.hp=-9;hurt.next='start';a.choices.push(b,q,hurt);
 good.id='good';good.title='해피';good.ending='end';good.endLabel='진엔딩';bad.id='bad';bad.title='낙하';bad.ending='death';p.events=[a,good,bad];return p;}
let p=project();C.validate(p);
assert.deepEqual(C.endingSlots(p).map(x=>[x.key,x.name,x.kind]),[['good','진엔딩','end'],['bad','낙하','death'],['@end','이야기 끝','end'],['@hp','체력 0','death'],['@mental','멘탈 0','death']]);
for(const [choice,key]of[['toGood','good'],['toBad','bad'],['quit','@end'],['hurt','@hp']]){const r=new C.Run(p);assert.equal(C.endingKey(r),'');r.choose(choice);assert.equal(C.endingKey(r),key,choice);}
const r=new C.Run(p);r.mental=0;r.dead=true;r.ended=true;r.deathReason='멘탈';assert.equal(C.endingKey(r),'@mental');
// No direct 끝: no 이야기 끝 slot.
const q=project();q.events[0].choices=q.events[0].choices.filter(c=>c.id!=='quit');assert(!C.endingSlots(q).some(x=>x.key==='@end'));
// 2회차 lines.
p.events[0].text='{#엔딩>=2? 세 번째구나.|{#진엔딩? 또 왔네.|처음이네.}}';const fresh=new C.Run(p);assert.equal(fresh.say(p.events[0].text),'처음이네.');
fresh.seen=new Set(['good']);assert.equal(fresh.say(p.events[0].text),'또 왔네.');fresh.seen=new Set(['good','@hp']);assert.equal(fresh.say(p.events[0].text),'세 번째구나.');
assert(!C.inspect(p).some(x=>x.message.includes('대사 변주')),C.inspect(p).map(x=>x.message).join('\n'));
p.events[0].text='{#없는 엔딩? 음}';assert(C.inspect(p).some(x=>x.message.includes("'#없는 엔딩'")),'unknown ending name is reported');
// Stored per game: a list of keys.
const s=V.create(project(),true);s.games[0].endings=['good','@hp'];assert.deepEqual(V.decode(V.encode(s)).games[0].endings,['good','@hp']);
for(const bad of [['good','good'],'good',[1],['x'.repeat(200)]]){const t=V.create(project(),true);t.games[0].endings=bad;assert.throws(()=>V.decode(V.encode(t)),undefined,JSON.stringify(bad));}
console.log('PASS 엔딩 모음: slots (scenes, 이야기 끝, 체력·멘탈 0), run keys, 2회차 lines, 점검 names, stored list validated.');
