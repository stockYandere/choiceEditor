const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('./assets/core.js');const ctx={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'assets/sample.js'),'utf8'),ctx);
const sample=()=>{const p=JSON.parse(JSON.stringify(ctx.SAMPLE));p.randomStart=0;return C.validate(p)};
for(const rng of [0,0.9]){const a=new C.Run(sample()),b=new C.Run(sample());a.choose('getcourage',()=>rng);b.choose('getbandage',()=>rng);assert.equal(a.current,b.current);assert.deepEqual(a.eligible().map(e=>e.id),b.eligible().map(e=>e.id));}
let r=new C.Run(sample());r.choose('getcourage',()=>0);assert.equal(r.current,'alley');assert(!r.blocked(r.p.events[1].choices[0]));r.choose('bold');assert.equal(r.current,'home');assert.equal(r.hp,3);assert.equal(r.trail.length,0);r.choose('ending');assert(r.ended);
r=new C.Run(sample());r.choose('getbandage',()=>0);assert.equal(r.blocked(r.p.events[1].choices[0]),'courage');assert(!r.choose('bold'));r.choose('run');assert.equal(r.hp,1);assert.equal(r.current,'rest');assert.equal(r.lastChange.before,3);assert.equal(r.lastChange.after,1);assert.equal(r.lastChange.hp,-2);assert.equal(r.trail.length,1);r.choose('heal');assert.equal(r.hp,3);assert.equal(r.bag.bandage,0);assert.equal(r.trail.length,0);assert.equal(r.current,'home');
r=new C.Run(sample());r.choose('getbandage',()=>0);r.choose('fight');assert(r.dead);assert.equal(r.hp,0);assert.equal(r.lastChange.hp,-3);
r=new C.Run(sample());r.choose('getcourage',()=>0);r.choose('run');assert.equal(r.current,'safe');assert.equal(r.hp,3);assert(r.lastChange.alternate);assert.equal(r.trail.length,1);r.choose('leavesafe');assert.equal(r.current,'home');assert.equal(r.trail.length,0);
r=new C.Run(sample());r.choose('getcourage',()=>0.9);r.choose('watchcat');assert.equal(r.bag.courage,2);assert.equal(r.recent[0],'courage');
r=new C.Run(sample());r.choose('getbandage',()=>0.9);r.choose('grabcat');assert.equal(r.bag.startled,1);assert.equal(r.recent[0],'startled');assert.equal(r.hp,2);
let p=sample();p.events[0].choices[0].next='sequence';r=new C.Run(p);r.choose('getcourage');assert.equal(r.current,'home');
p=sample();p.events[0].choices[1].gainCount=3;r=new C.Run(p);r.choose('getbandage',()=>0);assert.equal(r.bag.bandage,3);const runChoice=r.p.events[1].choices.find(c=>c.id==='run');runChoice.requires='bandage';runChoice.requiresCount=4;assert(!r.choose('run'));runChoice.requiresCount=3;r.choose('run');const heal=r.p.events.find(e=>e.id==='rest').choices[0];heal.loseCount=3;r.choose('heal');assert.equal(r.bag.bandage,0);
p=sample();p.hp=2;p.events[0].choices[0].hp=50;r=new C.Run(p);r.choose('getcourage',()=>0);assert.equal(r.lastChange.hp,1);assert.match(r.message,/2 → 3 \(\+1\)/);
p=sample();p.events[0].choices[0].branch={when:'courage',count:1,hp:-1,gain:'',lose:'bandage',next:'sequence'};r=new C.Run(p);r.bag.courage=1;assert.equal(r.blocked(p.events[0].choices[0]),'bandage');assert(!r.choose('getcourage'));assert.equal(r.hp,3);
p=sample();p.events[1].requires='courage';C.validate(p);assert(!('requires' in p.events[1]));
p=sample();p.events[0].choices[0].requiresCount=0;assert.throws(()=>C.validate(p));p=sample();p.events[1].choices[1].branch.next='invalid';assert.throws(()=>C.validate(p));
console.log('PASS: inventory-independent encounters, sequential resume, per-encounter history, conditional outcomes before gains, levels/counts, consumption, actual HP deltas, death, status/recent inventory, validation.');

p=sample();p.randomStart=2;r=new C.Run(p,()=>0);assert.equal(p.definitions.filter(d=>d.type==='ability'&&r.bag[d.id]>0).length,2);assert.equal(new Set(r.recent).size,2);
p=sample();p.events[0].choices[0].mental=-3;r=new C.Run(p);r.choose('getcourage',()=>0);assert(r.dead);assert.equal(r.deathReason,'멘탈');assert.equal(r.mental,0);assert.equal(r.lastChange.mental,-3);
p=sample();p.money=0;p.events[0].choices[0].money=-1;r=new C.Run(p);assert.equal(r.blocked(p.events[0].choices[0]),'@money');assert(!r.choose('getcourage'));assert(!r.dead);
p=sample();p.money=1;p.events[0].choices[0].money=3;p.events[0].choices[0].mental=-1;r=new C.Run(p);r.choose('getcourage',()=>0);assert.equal(r.money,3);assert.equal(r.lastChange.money,2);assert.equal(r.mental,2);
p=sample();p.events[0].choices[0].requires='@money';p.events[0].choices[0].requiresCount=3;C.validate(p);r=new C.Run(p);assert(!r.blocked(p.events[0].choices[0]));r.money=2;assert.equal(r.blocked(p.events[0].choices[0]),'@money');
console.log('PASS: random two distinct starting abilities, mental death, money gates and cap, resource selection requirements, HP defaults.');
