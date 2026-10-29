const assert=require('node:assert/strict'),C=require('./assets/core.js');
// 자동 플레이 점검: random whole runs; endings with shares and their shortest path, stuck runs, endless runs, scenes never reached.
function project(){const p=C.fresh();p.randomStart=0;p.definitions=[{id:'key',name:'열쇠',type:'item',initial:0}];const ev=(id,title,more={})=>Object.assign(C.event(),{id,title},more);
 const start=ev('start','갈림길'),good=ev('good','해피',{ending:'end',endLabel:'진엔딩'}),bad=ev('bad','낙하',{ending:'death'}),hall=ev('hall','복도'),island=ev('island','외딴 방');
 start.choices=[Object.assign(C.choice(),{id:'toGood',text:'웃는다',next:'good'}),Object.assign(C.choice(),{id:'toBad',text:'뛰어내린다',next:'bad'}),Object.assign(C.choice(),{id:'toHall',text:'복도로',next:'hall'})];
 hall.choices=[Object.assign(C.choice(),{id:'locked',text:'문을 연다',requires:'key',next:'end'})];island.choices[0].next='end';p.events=[start,good,bad,hall,island];return p;}
let p=project();C.validate(p);let r=C.autoplayReport(p,{runs:3000,seed:5});
assert.equal(r.runs,3000);const share=k=>r.endings.find(x=>x.key===k).count/r.runs;
assert(Math.abs(share('good')-1/3)<.03&&Math.abs(share('bad')-1/3)<.03,JSON.stringify(r.endings.map(x=>[x.key,x.count])));
assert.equal(r.stuck.length,1);assert.equal(r.stuck[0].scene,'hall');assert(Math.abs(r.stuck[0].count/r.runs-1/3)<.03);assert.deepEqual(r.stuck[0].path,[{scene:'start',choice:'복도로'}]);
assert.deepEqual(r.endings.find(x=>x.key==='good').path,[{scene:'start',choice:'웃는다'}]);assert.equal(r.shortest,1);
assert.deepEqual(r.unvisited,['island'],'never reached');assert.equal(r.endings.find(x=>x.key==='@hp').count,0,'slots never reached stay at 0');
// The same seed gives the same report.
assert.deepEqual(C.autoplayReport(p,{runs:200,seed:9}),C.autoplayReport(p,{runs:200,seed:9}));
// A scene that only loops back is reported as endless at maxSteps.
p=project();p.events[3].choices=[Object.assign(C.choice(),{id:'again',text:'다시',next:'hall'})];r=C.autoplayReport(p,{runs:300,seed:2,maxSteps:50});assert.equal(r.loops[0].scene,'hall');assert(r.loops[0].path.length<=60);
// Rewards are picked; timers and weights need nothing special (open choices are picked, encounters drawn by weight).
p=project();p.events[0].choices[0].reward={pool:['key'],count:1};r=C.autoplayReport(p,{runs:100,seed:3});assert(r.endings.find(x=>x.key==='good').path.some(s=>s.choice==='보상: 열쇠'));
console.log('PASS 자동 플레이: shares, shortest paths, stuck, unvisited, deterministic seed, endless loops, rewards.');
