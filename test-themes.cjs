const assert=require('node:assert/strict'),T=require('./assets/themes.js'),C=require('./assets/core.js'),V=require('./assets/vault.js'),H=require('./assets/history.js');
assert.equal(T.catalog.length,10);assert.equal(new Set(T.catalog.map(t=>t.id)).size,10);
const p=C.fresh();p.events=[C.event()];delete p.theme;C.validate(p);assert.equal(T.get(p.theme).id,'cream');assert.equal(p.theme,undefined);
const h=new H(p);p.theme='forest';h.record(p);const undone=h.undo(p);assert.equal(undone.theme,undefined);assert.equal(h.redo(undone).theme,'forest');
for(const t of T.catalog){p.theme=t.id;C.validate(p);const store=V.create(p,true),back=V.decode(V.encode(store));assert.equal(back.games[0].draft.theme,t.id);assert.equal(back.games[0].published.theme,t.id);}
for(const bad of ['missing','',0,{},null]){p.theme=bad;assert.throws(()=>C.validate(p),/테마/);}
function lum(hex){const a=hex.slice(1).match(/../g).map(s=>{const x=parseInt(s,16)/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2];}
function contrast(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const t of T.catalog){for(const [a,b]of [['ink','surface'],['muted','surface'],['accent','surface'],['ink','history'],['muted','history'],['gain','gain-bg'],['loss','loss-bg'],['gain','surface'],['loss','surface']])assert(contrast(t.colors[a],t.colors[b])>=4.5,`${t.id} ${a}/${b} contrast ${contrast(t.colors[a],t.colors[b])}`);}
console.log('PASS 10 presets, legacy fallback, validation, undo/redo, vault/release round trip and primary/notification text contrast.');

p.theme='gothic';for(const n of [0,50,100]){p.panelTransparency=n;const store=V.create(C.validate(p),true);assert.equal(V.decode(V.encode(store)).games[0].published.panelTransparency,n);}for(const n of [-1,101,1.5,'50',null]){p.panelTransparency=n;assert.throws(()=>C.validate(p),/투명도/);}console.log('PASS transparency range validation and portable project persistence.');
