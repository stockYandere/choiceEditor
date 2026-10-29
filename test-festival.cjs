const assert=require('node:assert/strict'),C=require('./assets/core.js');
require('./assets/festival-sample.js');
// 축제 전날 밤 예제: the v0.1.57~v0.1.63 features are really in the data, 이야기 점검 finds nothing, and random play
// reaches every ending (진엔딩 included) without getting stuck, looping or leaving a scene unseen.
const p=C.validate(JSON.parse(JSON.stringify(FESTIVAL_SAMPLE))),ev=p.events,ch=ev.flatMap(e=>e.choices),outs=ch.flatMap(c=>[c,...(c.branch?[c.branch]:[])]),texts=ev.flatMap(e=>[e.text,e.speaker,...e.choices.map(c=>c.text)]).join(' ');
assert(ev.length>=30&&ev.length<=40,'30~40 scenes: '+ev.length);
const aff=p.definitions.filter(d=>d.type==='affinity');assert.equal(aff.filter(d=>!d.hidden).length,2);assert.equal(aff.filter(d=>d.hidden).length,1,'a hidden 호감도');
assert(ch.some(c=>(c.affinity||[]).length>=2&&c.affinity.some(x=>x.delta>0)&&c.affinity.some(x=>x.delta<0)),'one choice moves two people, up and down');
assert(ch.some(c=>c.branch?.affinity?.length),'다른 결과 moves 호감도');
// 조건: three in one choice with 없을 때, 하나라도, 호감도 이상/이하, several in 다른 결과 (모두 · 하나라도).
assert(ch.some(c=>C.needsOf(c).length===3&&C.needsOf(c).some(x=>x.not)));assert(ch.some(c=>c.requiresAny),'a choice with 하나라도');assert(ev.some(e=>e.appearAny),'등장 조건 하나라도');
const affIds=new Set(aff.map(d=>d.id)),conds=[...ch.flatMap(c=>[...C.needsOf(c),...C.whensOf(c.branch)]),...ev.flatMap(e=>C.appearOf(e))];
assert(conds.some(x=>affIds.has(x.id)&&!x.le)&&conds.some(x=>affIds.has(x.id)&&x.le),'호감도 이상 and 이하');
assert(ch.some(c=>C.whensOf(c.branch).length>=3),'다른 결과 with three conditions');assert(ch.some(c=>c.branch?.whenAny),'다른 결과 하나라도');
// 여러 개 얻기·잃기.
assert(outs.some(o=>C.gainsOf(o).length===3));assert(outs.some(o=>C.losesOf(o).length===2));
// 🎲 무게와 등장 조건.
const enc=ev.filter(e=>e.kind==='encounter');assert.equal(p.randomGroups.length,2);
assert(enc.some(e=>C.weightOf(e)===1)&&enc.some(e=>C.weightOf(e)===8),'rare and common weights');
const appear=enc.flatMap(e=>C.appearOf(e));assert(appear.some(x=>x.id==='@money')&&appear.some(x=>affIds.has(x.id))&&appear.some(x=>p.definitions.find(d=>d.id===x.id)?.type==='state'),'등장 조건 on 돈, 호감도 and a state');
// ⏱ and 엔딩 모음.
assert.equal(ev.filter(e=>e.timer).length,2);
const slots=C.endingSlots(p);assert(slots.filter(x=>x.key[0]!=='@').length>=7,'six endings and a 사망 장면');assert(ev.some(e=>e.ending==='death'));
assert(texts.includes('{#셋이 함께 본 등불?')&&texts.includes('{#엔딩>=2?'),'2회차 lines');assert(/\{서연<=-1\?/.test(texts),'negative 호감도 in a line');assert(/\{의심>=2\?/.test(texts),'hidden 호감도 read in a line');
// 이야기 점검: nothing to fix or check.
assert.deepEqual(C.inspect(p).map(i=>i.message),[]);
// 자동 플레이: every slot reached, nothing stuck, endless or unseen.
const r=C.autoplayReport(p,{runs:20000,seed:3});
for(const x of r.endings)if(x.key!=='@end')assert(x.count>0,x.name+' never reached');
assert.deepEqual(r.unvisited,[]);assert.deepEqual(r.stuck,[]);assert.deepEqual(r.loops,[]);
const trio=r.endings.find(x=>x.name==='셋이 함께 본 등불');assert(trio.count/r.runs<.05,'진엔딩 stays rare for random play');
// 2회차: the first scene reads the collection.
const run=new C.Run(p);assert(!run.say(ev[0].text).includes('본 적 있는'));run.seen=new Set([trio.key,'@hp']);assert(run.say(ev[0].text).includes('본 적 있는')&&run.say(ev[0].text).includes('몇 번째'));
console.log('PASS 축제 전날 밤: '+ev.length+' scenes, 호감도 (hidden too), 3 conditions/하나라도/이상·이하, several items, weights + 등장 조건, 2 timers, '+slots.length+' ending slots all reached ('+r.endings.map(x=>x.name+' '+(x.count/r.runs*100).toFixed(1)+'%').join(', ')+'), 점검 clean.');
