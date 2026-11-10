const assert=require('node:assert/strict');
const C=require('./assets/core.js'),V=require('./assets/vault.js');
const clone=x=>JSON.parse(JSON.stringify(x));
// One unreadable game does not take the library with it: it is held apart, retried, and the rest opens.
const base=()=>{const p=C.fresh();p.randomStart=0;p.events.push(C.event());return p;};
const lib=()=>{const s=V.create(base(),true);for(const t of ['둘','셋']){const p=base();p.title=t;s.games.push(V.game(p,true));}return s;};
{const s=lib();s.games[1].draft.events[0].choices[0].requiresCount=0;// a quantity no version accepts
 const r=V.validate(clone(s));assert.deepEqual(r.games.map(g=>g.draft.title),['새 이야기','셋']);assert.equal(r.quarantine.length,1);assert.equal(r.quarantine[0].error,'요구·획득·소모 수량');assert.equal(V.titleOf(r.quarantine[0].game),'둘');assert.equal(r.notices.length,1);
 // A second read (the save is validated twice on the way in) keeps it held without another notice.
 const again=V.validate(clone(r));assert.equal(again.quarantine.length,1);assert.equal(again.notices.length,1);assert.equal(again.games.length,2);
 // Once readable (a fixed version), it returns by itself.
 again.quarantine[0].game.draft.events[0].choices[0].requiresCount=1;const back=V.validate(clone(again));assert.deepEqual(back.games.map(g=>g.draft.title),['새 이야기','셋','둘']);assert.equal(back.quarantine,undefined);assert.match(back.notices.at(-1),/돌려놓았습니다/);}
{// The active game being the broken one moves the pointer to a game that opens.
 const s=lib();s.active=s.games[0].id;s.games[0].draft.title=7;const r=V.validate(clone(s));assert.equal(r.active,r.games[0].id);assert.equal(r.games.length,2);}
{// A damaged autosave, save slot or ending list is dropped alone.
 const s=lib(),g=s.games[0];g.progress={savedAt:1,project:clone(g.published),state:{current:'nowhere'}};g.endings=[1,2];g.manualSlots=[null,{savedAt:'x'},null];
 const r=V.validate(clone(s));assert.equal(r.games.length,3);assert.equal(r.games[0].progress,null);assert.equal(r.games[0].endings,undefined);assert.deepEqual(r.games[0].manualSlots,[null,null,null]);assert.equal(r.quarantine,undefined);assert.match(r.notices[0],/엔딩 모음·이어하기·수동 저장 2번/);}
{// A broken deleted game is held too, and duplicate ids no longer block the rest.
 const s=lib();s.trash=[{deletedAt:5,game:V.game(base()),formDrafts:{k:{values:{text:'쓰던 것'}}}},{deletedAt:6,game:{id:'x',draft:null}},null];s.games[2].id=s.games[0].id;
 const r=V.validate(clone(s));assert.equal(r.games.length,2);assert.equal(r.trash.length,1);assert.equal(r.trash[0].formDrafts.k.values.text,'쓰던 것','a deleted game keeps its form drafts');assert.equal(r.quarantine.length,2);assert.equal(r.quarantine.find(q=>q.deletedAt).deletedAt,6);}
// The list itself being unusable still stops the load (the caller keeps the original).
assert.throws(()=>V.validate({format:'event-vault',version:1,games:'no'}));assert.throws(()=>V.validate(null));
// The whole file round-trips with held games inside.
{const s=lib();s.games[1].draft.title=7;const file=V.encode(V.validate(clone(s)));const r=V.decode(file);assert.equal(r.games.length,2);assert.equal(r.quarantine.length,1);}
// merge: same content is skipped, same id with other content arrives as a copy, held games come along, the 100 limit holds.
{const a=lib(),b=clone(a);b.games[1].draft.title='둘 고침';const extra=V.game(base());extra.draft.title='넷';b.games.push(extra);b.quarantine=[{at:1,error:'x',game:{id:'q',draft:null}}];
 const out=V.merge(a,b,'복구');assert.deepEqual(out,{added:2,same:2,full:0,held:1});assert.deepEqual(a.games.map(g=>g.draft.title),['새 이야기','둘','셋','둘 고침 (복구)','넷']);assert.equal(new Set(a.games.map(g=>g.id)).size,5);assert.equal(a.quarantine.length,1);V.validate(clone(a));
 while(a.games.length<100)a.games.push(V.game(base()));const one=V.create(base());one.games[0].draft.title='하나 더';assert.equal(V.merge(a,one).full,1);assert.equal(a.games.length,100);}
// A game name must be text; a missing one gets the default and a long one is cut (stored games are not rejected for it).
{const p=base();p.title=12345;assert.throws(()=>C.validate(p),/게임 이름/);const q=base();delete q.title;assert.equal(C.validate(q).title,'새 이야기');const l=base();l.title='가'.repeat(150);assert.equal(C.validate(l).title.length,100);}
console.log('PASS library safety: a broken game is held apart and retried, damaged saves are dropped alone, merge adds without replacing, game names are checked.');
