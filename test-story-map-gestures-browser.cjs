const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 구조도 손그림 2: 지그재그로 긁으면 지우기(연결·선택지·메모·사건), ✓ 는 끝 장면(엔딩/사망, 다시 그리면 일반 사건),
// 크게 둘러싸면 여러 개 고르기(🎲 묶음·진행 방식·함께 옮기기·지우기), 🧽 지우개(톡 = 지우기, 문지르기 = 지나간 것 지우기), 간격 줄이기.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:360,height:740},{width:320,height:568}]){
const p=await browser.newPage({viewport,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
// 시작(스토리) ─둘─▶ 왼쪽 · 오른쪽(분기) ─▶ 합류(스토리) ─▶ 끝 ; 외톨이(아무 데서도 안 옴) ; 메모 하나.
await p.evaluate(()=>{const mk=(t,kind)=>{const e=C.event();e.title=t;e.kind=kind;e.text=t+' 이야기';return e;};
 const a=mk('시작','story'),l=mk('왼쪽','branch'),r=mk('오른쪽','branch'),m=mk('합류','story'),z=mk('마지막','story'),lone=mk('외톨이','branch');
 a.choices=[{...C.choice(),text:'왼쪽으로',next:l.id},{...C.choice(),text:'오른쪽으로',next:r.id}];l.choices[0].next=m.id;r.choices[0].next=m.id;m.choices=[{...C.choice(),text:'간다',next:z.id},{...C.choice(),text:'쉰다',next:z.id}];
 lone.map={x:420,y:0};project.events=[a,l,r,m,z,lone];project.mapNotes=[{id:'n1',x:-330,y:20,text:'계획 메모'}];selected=a.id;persist();renderEditor();});
await p.evaluate(()=>flushEditor());
await p.evaluate(()=>openStoryMap('story'));await p.waitForFunction(()=>StoryMap.isOpen());
await p.evaluate(()=>{const fire=(type,id,x,y)=>document.getElementById('mapCanvas').dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===1}));
 const settle=async()=>{await new Promise(r=>setTimeout(r,0));while(StoryMap.busy())await new Promise(r=>setTimeout(r,10));};
 window.__stroke=async pts=>{fire('pointerdown',1,pts[0][0],pts[0][1]);for(const [x,y]of pts.slice(1))fire('pointermove',1,x,y);const l=pts[pts.length-1];fire('pointerup',1,l[0],l[1]);await settle();};
 window.__c=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};
 window.__ev=t=>project.events.find(e=>e.title===t);});
const ev=t=>p.evaluate(t=>{const e=__ev(t);return e&&JSON.parse(JSON.stringify(e));},t),box=async t=>p.evaluate(t=>__c(`[data-map-event="${__ev(t).id}"]`),t);
const stroke=pts=>p.evaluate(pts=>__stroke(pts),pts.map(([x,y])=>[Math.round(x),Math.round(y)]));
const scratch=([x,y],w=34,h=16)=>stroke(Array.from({length:7},(_,i)=>[x+(i%2?w/2:-w/2),y-h/2+i*h/6]));
const check=([x,y],s=1)=>stroke([[x-12*s,y-10*s],[x-6*s,y-5*s],[x,y],[x+6*s,y-10*s],[x+12*s,y-20*s],[x+18*s,y-30*s]]);
const ring=([x,y],rx,ry)=>stroke(Array.from({length:41},(_,i)=>[x+rx*Math.cos(i/40*2*Math.PI),y+ry*Math.sin(i/40*2*Math.PI)]));
const sheetTitle=()=>p.locator('.mapSheet b, .mapSheet h3').first().textContent();
// Modes: 이동 · 그리기 · 🧽 지우개, all on one row clear of the minimap.
assert.equal(await p.locator('[data-map-mode]').count(),3);
const modes=await p.locator('.mapModes').boundingBox(),mini=await p.locator('.mapMini').boundingBox();assert(modes.x+modes.width<=mini.x+1||modes.y>=mini.y+mini.height-1,`modes overlap minimap`);assert(modes.x+modes.width<=viewport.width,'modes fit');
await p.locator('[data-map-mode="draw"]').click();assert.match(await p.locator('.mapHint').textContent(),/✓ 끝 장면.*지그재그 지우기.*둘러싸면/);
// ✓ on 마지막 → 끝 장면 sheet → ☠ 사망 장면; ✓ again → 일반 사건으로.
await check(await box('마지막'));await p.locator('[data-end="death"]').waitFor();await p.locator('[data-end="death"]').click();
await p.waitForFunction(()=>__ev('마지막').ending==='death');assert.equal((await ev('마지막')).endLabel,'마지막');
await check(await box('마지막'),1.3);await p.locator('[data-end=""]').click();await p.waitForFunction(()=>!__ev('마지막').ending);
await check(await box('마지막'));await p.locator('[data-end="end"]').click();await p.waitForFunction(()=>__ev('마지막').ending==='end');
// ✓ on empty space: nothing changes, a hint.
await check([20,viewport.height-160]);assert.match(await p.locator('.mapToast').textContent(),/사건 네모 위/);
// 지그재그 over the 왼쪽 → 합류 link cuts it (→ 다음 스토리).
const [lx,ly]=await box('왼쪽'),[mx,my]=await box('합류');await scratch([(lx+mx)/2,(ly+my)/2]);
await p.waitForFunction(()=>__ev('왼쪽').choices[0].next==='sequence');assert.match(await p.locator('.mapToast').textContent(),/연결을 끊었/);
// … over one of 합류's choice circles removes that choice.
const mid=await p.evaluate(()=>__ev('합류').id),circle=await p.evaluate(id=>__c(`[data-map-choice^="${id}"]`),mid).catch(()=>null);
const cpos=circle||await p.evaluate(id=>{const n=[...document.querySelectorAll('.mapChoice')].find(g=>g.closest('[data-map-event]')?.dataset.mapEvent===id)||document.querySelectorAll('.mapChoice')[2];const r=n.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];},mid);
await scratch(cpos,26,12);await p.waitForFunction(()=>__ev('합류').choices.length===1);
// … over the memo removes it; over 외톨이 deletes the scene (confirm).
await scratch(await p.evaluate(()=>__c('[data-map-note="n1"]')),40,18);await p.waitForFunction(()=>!(project.mapNotes||[]).length);
await scratch(await box('외톨이'));await p.waitForFunction(()=>!__ev('외톨이'));
// ↶ brings the scene back.
await p.locator('#mapUndo').click();await p.waitForFunction(()=>!!__ev('외톨이'));
// 크게 둘러싸기 around 왼쪽 and 오른쪽 → 2개 고름.
const [rx,ry]=await box('오른쪽');await ring([(lx+rx)/2,(ly+ry)/2],Math.abs(rx-lx)/2+70,48);
await p.locator('[data-sel-kind]').first().waitFor();assert.deepEqual((await p.evaluate(()=>StoryMap.selection().map(id=>project.events.find(e=>e.id===id).title))).sort(),['오른쪽','왼쪽']);
assert.equal(await p.locator('.mapBox.sel').count(),2);
await p.locator('[data-sel-group=""]').click();await p.waitForFunction(()=>__ev('왼쪽').kind==='encounter'&&__ev('오른쪽').kind==='encounter');
await p.locator('[data-sel-kind="story"]').click();await p.waitForFunction(()=>__ev('왼쪽').kind==='story'&&__ev('오른쪽').kind==='story');
// 이동 모드: dragging one picked scene moves both.
await p.evaluate(()=>StoryMap.closeSheet());await p.locator('[data-map-mode="move"]').click();
const before=await p.evaluate(()=>[__ev('왼쪽').map,__ev('오른쪽').map].map(m=>m&&{...m}));
const [bx,by]=await box('왼쪽');await p.evaluate(async([x,y])=>{const fire=(t,x,y)=>document.getElementById('mapCanvas').dispatchEvent(new PointerEvent(t,{pointerId:1,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:true}));
 fire('pointerdown',x,y);for(let k=1;k<=6;k++)fire('pointermove',x,y+k*8);fire('pointerup',x,y+48);await new Promise(r=>setTimeout(r,0));while(StoryMap.busy())await new Promise(r=>setTimeout(r,10));},[bx,by]);
const after=await p.evaluate(()=>[__ev('왼쪽').map,__ev('오른쪽').map]);
assert(after[0].y>(before[0]?.y??-1e9)&&after[1].y-after[0].y===(before[0]&&before[1]?before[1].y-before[0].y:after[1].y-after[0].y),'moved together');
const dy0=after[0].y-(before[0]?before[0].y:after[0].y-1),dy1=after[1].y-(before[1]?before[1].y:after[1].y-1);assert.equal(dy0,dy1,'same distance');
// Tapping empty space lets go; lasso again and 지우기 removes both, links to them become 다음 스토리.
await stroke([[16,viewport.height-170],[17,viewport.height-170]]);assert.equal((await p.evaluate(()=>StoryMap.selection())).length,0);
await p.locator('[data-map-mode="draw"]').click();const [lx2,ly2]=await box('왼쪽'),[rx2,ry2]=await box('오른쪽');await ring([(lx2+rx2)/2,(ly2+ry2)/2],Math.abs(rx2-lx2)/2+70,48);
await p.locator('[data-m="del"]').click();await p.waitForFunction(()=>!__ev('왼쪽')&&!__ev('오른쪽'));assert.deepEqual((await ev('시작')).choices.map(c=>c.next),['sequence','sequence']);
await p.locator('#mapUndo').click();await p.waitForFunction(()=>!!__ev('왼쪽')&&!!__ev('오른쪽'));
// 🧽 지우개: a tap on the 시작 → 오른쪽 link cuts it; rubbing across 시작's circles removes them.
await p.locator('[data-map-mode="erase"]').click();assert.match(await p.locator('.mapHint').textContent(),/지우개/);
const [ax,ay]=await box('시작'),[ox,oy]=await box('오른쪽'),choicesNow=await p.evaluate(()=>__ev('시작').choices.length);
const links=await p.evaluate(()=>[...document.querySelectorAll('line.mapLink')].map(l=>{const r=l.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));assert(links.length>0);
// rub: a stroke through every 시작 choice circle
const circles=await p.evaluate(()=>[...document.querySelectorAll('.mapChoice')].map(n=>{const r=n.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];}));
const top=circles.filter(([,y])=>Math.abs(y-circles[0][1])<4);await stroke([[top[0][0]-30,top[0][1]],...top,[top[top.length-1][0]+30,top[top.length-1][1]]]);
await p.waitForFunction(n=>__ev('시작').choices.length<n,choicesNow);assert.match(await p.locator('.mapToast').textContent(),/🧽 선택지/);
await p.locator('#mapUndo').click();await p.waitForFunction(n=>__ev('시작').choices.length===n,choicesNow);
// tap the 시작 box → it is deleted only after confirm; we accept, then undo.
await stroke([[ax,ay],[ax+1,ay]]);await p.waitForFunction(()=>!__ev('시작'));await p.locator('#mapUndo').click();await p.waitForFunction(()=>!!__ev('시작'));
// 간격 줄이기: spread everything out first, then compact; nothing overlaps, the map gets smaller, ↶ undoes it.
await p.evaluate(()=>{project.events.forEach((e,i)=>e.map={x:(i%3)*420,y:Math.floor(i/3)*520+(i%3)*40});persist();StoryMap.render();});
const span=()=>p.evaluate(()=>{const L=StoryMap.layout(project),b=[...L.boxes.values()];return [Math.max(...b.map(v=>v.x))-Math.min(...b.map(v=>v.x)),Math.max(...b.map(v=>v.y))-Math.min(...b.map(v=>v.y))];});
const wide=await span();await p.locator('#mapCompact').click();await p.waitForFunction(()=>!StoryMap.busy());await p.waitForTimeout(30);
const tight=await span();assert(tight[0]<wide[0]&&tight[1]<wide[1],`compact ${wide} → ${tight}`);
const ok=await p.evaluate(()=>{const L=StoryMap.layout(project),b=[...L.boxes.values()];for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++)if(Math.abs(b[i].x-b[j].x)<132&&Math.abs(b[i].y-b[j].y)<60)return false;for(const c of L.circles)for(const x of b)if(Math.abs(c.x-x.x)<85&&Math.abs(c.y-x.y)<49)return false;return true;});assert(ok,'no overlaps after compacting');
assert.match(await p.locator('.mapToast').textContent(),/간격을 줄였/);
await p.locator('#mapUndo').click();await p.waitForTimeout(60);assert.deepEqual(await span(),wide);
assert.deepEqual(errors,[]);await p.close();}
await browser.close();console.log('PASS 구조도 손그림 2: ✓ 끝 장면(엔딩·사망·되돌리기), 지그재그 지우기(연결·선택지·메모·사건), 올가미 고르기(🎲·진행 방식·함께 옮기기·지우기), 🧽 지우개(톡·문지르기), 간격 줄이기 + ↶, 360/320px.');
})().catch(e=>{console.error(e);process.exit(1)});
