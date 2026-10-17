// Slanted particles (rain, storm, petals, leaves) cover the whole width at every height, with no empty corner on the downwind side.
const assert=require('node:assert/strict'),F=require('./assets/stage-fx.js'),w=400,h=800;
for(const kind of ['rain','storm','petals','leaves','snow']){const cfg=F.PARTICLES[kind],bins=new Array(8).fill(0);
 // Where 4000 new particles cross three heights; each eighth of the width should get its share.
 for(let i=0;i<4000;i++){const p=F.spawn(cfg,w,h,false);for(const y of [h*.25,h*.6,h*.95]){const x=p.x+p.vx*(y-p.y)/p.vy;if(x>=0&&x<w)bins[Math.floor(x/w*8)]++;}}
 const avg=bins.reduce((a,b)=>a+b)/8;for(const [i,n] of bins.entries())assert.ok(n>avg*.75,`${kind}: column ${i+1}/8 gets ${n} of ~${avg.toFixed(0)}`);
 console.log('PASS',kind,bins.map(n=>(n/avg).toFixed(2)).join(' '));}
