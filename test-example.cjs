const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('./assets/core.js'),V=require('./assets/vault.js');
const context={GameCore:C,GameVault:V};
for(const f of ['advanced-sample.js','examples.js'])vm.runInNewContext(fs.readFileSync(__dirname+'/assets/'+f,'utf8'),context);
const p=C.validate(context.ADVANCED_SAMPLE),clone=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(C.inspect(p),[]);
const seed=C.fresh();seed.randomStart=0;seed.events=[C.event()];seed.events[0].choices[0].next='end';
const store=V.create(seed,true);store.preferences={soundEnabled:false,bgmVolume:25};
const active=store.active,before=JSON.stringify(store.games[0]);context.ExampleGames.install(store);
assert.equal(store.games.length,2);assert.equal(store.active,active);assert.equal(JSON.stringify(store.games[0]),before);assert.equal(store.preferences.soundEnabled,false);
context.ExampleGames.install(store);assert.equal(store.games.length,2);
let copy=V.decode(V.encode(store));context.ExampleGames.install(copy);assert.equal(copy.games.length,2);
copy.games.pop();context.ExampleGames.install(copy);assert.equal(copy.games.length,1);
const encoded=V.encode(store);assert(encoded.length<5000000);assert.equal(JSON.parse(encoded).images.length,4);
assert.equal(p.events.length,37);assert.equal(p.events.filter(e=>e.kind==='encounter').length,7);

// Seeded complete playthroughs interleave every starting ability pair and
// prioritize uncovered choices/outcomes. Coverage assertions below require
// every authored case; this does not claim exhaustive choice permutations.
const abilities=p.definitions.filter(d=>d.type==='ability'),pairs=[];
for(let i=0;i<abilities.length;i++)for(let j=i+1;j<abilities.length;j++)pairs.push([abilities[i].id,abilities[j].id]);
const scenes=new Set(),choices=new Set(),branches=new Set(),blocked=new Set(),terminal=new Set(),seen=new Set(),counts=new Map();
let randomState=2033;
const rng=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
for(let trial=0;trial<6000;trial++){
 const r=new C.Run(p,rng);for(const d of abilities)r.bag[d.id]=0;for(const id of pairs[trial%pairs.length])r.bag[id]=1;
 for(let step=0;step<50&&!r.ended;step++){
  if(r.pendingReward){assert(r.chooseReward(r.pendingReward.offers[Math.floor(rng()*r.pendingReward.offers.length)],rng));continue;}
  scenes.add(r.current);const e=p.events.find(e=>e.id===r.current);
  seen.add(JSON.stringify([r.current,r.storyIndex,r.hp,r.mental,r.money,r.bag,[...r.visited].sort()]));
  const legal=e.choices.filter(c=>{if(r.blocked(c)){blocked.add(c.id);return false;}return true;});assert(legal.length,'scene has no available choice');
  const weights=legal.map(c=>{const tag=c.id+(c.branch?':'+(r.outcome(c)===c?'base':'alternate'):'');return 1/Math.sqrt(1+(counts.get(tag)||0))+(choices.has(c.id)?0:5)+(c.branch&&!branches.has(tag)?5:0);});
  let pick=rng()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<weights.length-1&&pick>=weights[index];index++)pick-=weights[index];
  const c=legal[index],tag=c.id+(c.branch?':'+(r.outcome(c)===c?'base':'alternate'):'');counts.set(tag,(counts.get(tag)||0)+1);choices.add(c.id);if(c.branch)branches.add(tag);
  assert(r.choose(c.id,rng));
 }
 assert(r.ended,'sample path should terminate within 50 choices');terminal.add(r.dead?r.deathReason:r.current);
}
for(const e of p.events)assert(scenes.has(e.id),'unreachable scene '+e.id);
for(const e of p.events)for(const c of e.choices){assert(choices.has(c.id),'unusable choice '+c.id);if(c.branch)for(const mode of ['base','alternate'])assert(branches.has(c.id+':'+mode),'unreachable conditional outcome '+c.id+':'+mode);}
for(const ending of p.events.filter(e=>e.id.startsWith('ending_')))assert(terminal.has(ending.id),'unreachable ending '+ending.id);
assert(terminal.has('체력'));assert(terminal.has('멘탈'));
assert(blocked.size>5);
for(const d of p.definitions)assert(d.effects?.length||p.definitions.some(x=>x.effects?.some(f=>f.with===d.id))||p.events.some(e=>e.choices.some(c=>c.requires===d.id||c.lose===d.id||c.branch?.when===d.id||c.branch?.lose===d.id)), 'unused definition '+d.id);
// Every inventory/resource condition leaves encounter membership unchanged.
const a=new C.Run(p,()=>0),b=new C.Run(p,()=>.99);for(const d of p.definitions)b.bag[d.id]=10;b.hp=1;b.mental=1;b.money=0;
assert.deepEqual(a.eligible().map(e=>e.id),b.eligible().map(e=>e.id));
const repeat=p.events.find(e=>e.kind==='encounter'&&!e.once);a.visited.add(repeat.id);assert(a.eligible().includes(repeat));
console.log('PASS:',seen.size,'distinct states in 6000 seeded full playthroughs (coverage, not every permutation);',scenes.size,'scenes,',choices.size,'choices,',branches.size,'conditional outcomes, six endings, both deaths, no locked scene in searched states, all definitions used, independent/repeatable encounters, deduplicated media and migration preserving edits/progress/preferences.');
