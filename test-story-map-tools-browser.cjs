const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 구조도 도구: 개요/상세, 카드 미리보기·점검 표시, 멀리 가는 연결의 「→」 꼬리표, 🎲 줄 정리, 빈 곳까지 그은 선으로 새 사건,
// 뼈대 5종, 꾹 메뉴(다음 사건·복제·진행 방식·첫 사건·삭제), 메모, 미니맵, 찾기, 뒤로 가기 순서.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:360,height:740},{width:320,height:568}]){
const p=await browser.newPage({viewport,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
// Story: 시작 → 🎲(두 선택지가 같은 묶음) → 중간(스토리) → 갈림 분기 → 끝(엔딩). 고립은 아무 데서도 오지 않고, 되돌아감은 시작으로 올라간다.
await p.evaluate(()=>{const mk=(t,kind,text)=>{const e=C.event();e.title=t;e.kind=kind;e.text=text||'';return e;};
 const a=mk('시작','story','{용기? 문을 연다|망설인다}\n둘째 줄'),m1=mk('만남1','encounter','첫 만남'),m2=mk('만남2','encounter','둘째 만남'),mid=mk('중간','story','중간 이야기'),fork=mk('갈림','branch','갈림길'),back=mk('되돌아감','branch','처음으로'),end=mk('끝','branch','끝났다'),lone=mk('고립','branch','아무도 안 옴');
 end.ending='end';end.endLabel='끝';end.choices[0].next='end';
 a.choices=[{...C.choice(),text:'굴린다',next:'random'},{...C.choice(),text:'또 굴린다',next:'random'}];
 mid.choices=[{...C.choice(),text:'갈림으로',next:fork.id},{...C.choice(),text:'돌아간다',next:back.id}];fork.choices[0].next=end.id;back.choices[0].next=a.id;
 project.events=[a,m1,m2,mid,fork,back,end,lone];selected=a.id;persist();renderEditor();});
await p.evaluate(()=>flushEditor());
const helpers=()=>{const fire=(type,id,x,y)=>document.getElementById('mapCanvas').dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===1}));
 const settle=async()=>{await new Promise(r=>setTimeout(r,0));while(StoryMap.busy())await new Promise(r=>setTimeout(r,10));};
 window.__stroke=async pts=>{fire('pointerdown',1,pts[0][0],pts[0][1]);for(const [x,y]of pts.slice(1))fire('pointermove',1,x,y);const l=pts[pts.length-1];fire('pointerup',1,l[0],l[1]);await settle();};
 window.__hold=async(x,y)=>{fire('pointerdown',1,x,y);await new Promise(r=>setTimeout(r,650));fire('pointerup',1,x,y);await settle();};
 window.__center=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};
 window.__ev=t=>project.events.find(e=>e.title===t);};
await p.evaluate(()=>openStoryMap('story'));await p.waitForFunction(()=>StoryMap.isOpen());await p.evaluate(helpers);
const center=sel=>p.evaluate(s=>__center(s),sel),ev=t=>`[data-map-event="${t}"]`,idOf=t=>p.evaluate(t=>__ev(t).id,t);
// Cards: first line with variations read as text, kind stripe, 점검 경고, unreachable marked ⛔.
const startId=await idOf('시작'),loneId=await idOf('고립');
assert.equal(await p.locator(ev(startId)+' .mapLine').textContent(),'문을 연다');assert.equal(await p.locator(ev(startId)+'.k-story').count(),1);
assert.equal(await p.locator(ev(loneId)+'.orphan').count(),1);assert.match(await p.locator(ev(loneId)+' .mapWarn').textContent(),/⛔/);
// 🎲 줄 정리: two choices of 시작 roll the same 묶음 → one arrow from the box and a 🎲 under each; its two scenes hang from one bar.
assert.equal(await p.locator('.mapLink.random.merged').count(),1);assert.equal(await p.locator('.mapLink.random.bus').count(),2);
// 멀리·위로 가는 연결은 「→」 꼬리표: 되돌아감 → 시작. Tapping it brings 시작 to the middle.
const jump=p.locator(`[data-map-jump="${startId}"]`);assert.equal(await jump.count(),1);assert.match(await jump.textContent(),/→ 1·시작/);
await p.locator('#mapFit').click();const jc=await center(`[data-map-jump="${startId}"]`);await p.evaluate(([x,y])=>__stroke([[x,y]]),jc);
const canvas=await p.locator('#mapCanvas').boundingBox(),sc=await center(ev(startId));assert(Math.abs(sc[0]-(canvas.x+canvas.width/2))<3&&Math.abs(sc[1]-(canvas.y+canvas.height/2))<3,'tag centers its target');
// 개요: stories, 🎲 and endings only; 분기 folds into its story; a tap opens 상세 on that block.
await p.locator('#mapLevel').click();assert.equal(await p.evaluate(()=>StoryMap.level()),'overview');
assert.equal(await p.locator('[data-map-event]').count(),3,'시작 · 중간 · 끝');assert.equal(await p.locator('[data-map-hub]').count(),1);assert.match(await p.locator('[data-map-hub]').textContent(),/2개/);
const midId=await idOf('중간');assert.match(await p.locator(ev(midId)+' .mapNum').textContent(),/\+2 분기/);assert.equal(await p.locator('[data-map-choice]').count(),0);
await p.evaluate(([x,y])=>__stroke([[x,y]]),await center(ev(midId)));assert.equal(await p.evaluate(()=>StoryMap.level()),'detail');assert.equal(await p.locator('#mapLevel').textContent(),'개요');
// 찾기: type, tap a result, it is centred.
await p.locator('#mapFind').click();await p.locator('#mapFindText').fill('갈림');assert.equal(await p.locator('[data-find]').count(),1);await p.locator('[data-find]').click();
const forkId=await idOf('갈림'),fc=await center(ev(forkId));assert(Math.abs(fc[1]-(canvas.y+canvas.height/2))<3,'found scene centred');
// 미니맵: it shows the blocks and a touch moves the view.
assert(await p.locator('#mapMini .miniBox').count()>=8);const v0=await p.evaluate(()=>StoryMap._view());const mm=await p.locator('#mapMini').boundingBox();
await p.evaluate(([x,y])=>{const m=document.getElementById('mapMini');m.dispatchEvent(new PointerEvent('pointerdown',{pointerId:5,clientX:x,clientY:y,bubbles:true}));m.dispatchEvent(new PointerEvent('pointerup',{pointerId:5,clientX:x,clientY:y,bubbles:true}));},[mm.x+4,mm.y+4]);
assert.notDeepEqual(await p.evaluate(()=>StoryMap._view()),v0,'minimap moves the view');await p.locator('#mapFit').click();
// 그리기: a line from a choice / a scene / the 🎲 into empty space makes a new scene there, linked.
await p.locator('[data-map-mode=draw]').click();
const count=()=>p.evaluate(()=>project.events.length),n0=await count();
const choiceC=await center(`[data-map-choice="${await p.evaluate(()=>__ev('중간').choices[1].id)}"]`);
// An empty spot on screen (no block, tag, 🎲 or control under it).
const emptySpot=()=>p.evaluate(()=>{const r=document.getElementById('mapCanvas').getBoundingClientRect();for(let y=r.y+30;y<r.bottom-110;y+=24)for(let x=r.x+20;x<r.right-20;x+=24){const pt=StoryMap._view(),hitEl=document.elementFromPoint(x,y);if(hitEl&&hitEl.id==='mapCanvas'&&![...document.querySelectorAll('[data-map-event],[data-map-choice],[data-map-hub],[data-map-jump],[data-map-note]')].some(n=>{const b=n.getBoundingClientRect();return x>b.left-30&&x<b.right+30&&y>b.top-30&&y<b.bottom+30;}))return [x,y];}return null;});
const lineTo=(a,b)=>p.evaluate(([a,b])=>__stroke(Array.from({length:16},(_,i)=>[a[0]+(b[0]-a[0])*i/15,a[1]+(b[1]-a[1])*i/15])),[a,b]);
await lineTo(choiceC,await emptySpot());
assert.equal(await count(),n0+1);assert.equal(await p.evaluate(()=>__ev('중간').choices[1].next),await p.evaluate(()=>project.events.at(-1).id));assert.equal(await p.evaluate(()=>project.events.at(-1).kind),'branch');
await lineTo(await center('[data-map-hub] circle'),await emptySpot());
assert.equal(await count(),n0+2);assert.equal(await p.evaluate(()=>project.events.at(-1).kind),'encounter');
await p.evaluate(()=>C.validate(structuredClone(project)));
// 꾹 메뉴 (이동 모드): 다음 사건, 복제, 진행 방식, 첫 사건으로, 삭제; Back closes the menu before the map.
await p.locator('[data-map-mode=move]').click();await p.locator('#mapFit').click();
const hold=async sel=>p.evaluate(([x,y])=>__hold(x,y),await center(sel));
await hold(ev(forkId));assert.equal(await p.locator('#mapSheet').isVisible(),true);assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert.equal(await p.locator('#mapSheet').isVisible(),false);assert.equal(await p.evaluate(()=>StoryMap.isOpen()),true);
await hold(ev(forkId));await p.locator('[data-m=next]').click();await p.waitForFunction(()=>!StoryMap.busy());assert.equal(await p.evaluate(()=>{const f=__ev('갈림');return f.choices.some(c=>c.next===project.events.at(-1).id);}),true,'다음 사건 linked');
await hold(ev(forkId));await p.locator('[data-m=dup]').click();await p.waitForFunction(()=>!!__ev('갈림 복사'));
await hold(ev(forkId));await p.locator('[data-kind=story]').click();await p.waitForFunction(()=>__ev('갈림').kind==='story');
await hold(ev(forkId));await p.locator('[data-m=first]').click();await p.waitForFunction(()=>project.events[0].title==='갈림');
const dupId=await idOf('갈림 복사');await hold(ev(dupId));await p.locator('[data-m=del]').click();await p.waitForFunction(()=>!__ev('갈림 복사'));
// 메모: hold empty space → 메모 → write → save; drag it; tap opens it; delete.
await p.locator('#mapFit').click();
const spot=await emptySpot();
await p.evaluate(([x,y])=>__hold(x,y),spot);await p.locator('[data-m=note]').click();await p.locator('#mapNoteText').fill('3장은 배신 엔딩');await p.locator('#mapSheet [data-m=save]').click();await p.waitForFunction(()=>(project.mapNotes||[]).length===1&&!StoryMap.busy());
assert.equal(await p.locator('[data-map-note]').count(),1);assert.match(await p.locator('[data-map-note]').textContent(),/3장은 배신/);await p.evaluate(()=>C.validate(structuredClone(project)));
const nb=await center('[data-map-note] rect'),noteBefore=await p.evaluate(()=>({...project.mapNotes[0]}));await p.evaluate(([x,y])=>__stroke(Array.from({length:10},(_,i)=>[x+i*5,y])),nb);
assert.equal(await p.evaluate(()=>project.mapNotes[0].x)-noteBefore.x,Math.round(45/await p.evaluate(()=>StoryMap._view().s)),'note dragged');
await p.evaluate(([x,y])=>__stroke([[x,y]]),await center('[data-map-note] rect'));assert.equal(await p.locator('#mapNoteText').inputValue(),'3장은 배신 엔딩');await p.locator('#mapSheet [data-m=del]').click();await p.waitForFunction(()=>!(project.mapNotes||[]).length);
// 뼈대: each shape adds its connected scenes, attached to the selected scene when asked; everything still validates.
const shapes={merge:5,random:5,gauntlet:3,endings:4,loop:3};
for(const [k,n]of Object.entries(shapes)){const before=await count();await p.locator('#mapTemplates').click();if(k==='merge')assert.equal(await p.locator('#mapAttach').isChecked(),true);else await p.locator('#mapAttach').uncheck();await p.locator(`[data-template=${k}]`).click();await p.waitForFunction(b=>project.events.length>b&&!StoryMap.busy(),before);assert.equal(await count(),before+n,k);}
const t=await p.evaluate(()=>{const sel=project.events.find(e=>e.id===selected),entry=__ev('갈림길');return {attached:sel.choices.some(c=>c.next===entry.id),merge:project.events.filter(e=>['A 쪽','B 쪽','C 쪽'].includes(e.title)).every(e=>e.choices[0].next===__ev('다시 만나는 곳').id),group:project.randomGroups.some(g=>/묶음/.test(g.name)),rolls:__ev('🎲 묶음 시작').choices[0].next.startsWith('random:'),death:__ev('실패').ending,endings:['엔딩 A','엔딩 B','배드 엔딩'].map(t=>__ev(t).ending).join(),loop:__ev('둘러보기').choices[0].next===__ev('거점').id};});
assert.deepEqual(t,{attached:true,merge:true,group:true,rolls:true,death:'death',endings:'end,end,death',loop:true});await p.evaluate(()=>C.validate(structuredClone(project)));
// The bar fits and every map control is on screen.
assert(await p.evaluate(()=>[...document.querySelectorAll('.mapBar button')].every(b=>{const r=b.getBoundingClientRect();return r.right<=innerWidth+.5&&r.left>=0;})),'map bar fits');
// Back: sheet first, then the map.
await p.locator('#mapFind').click();assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert.equal(await p.evaluate(()=>[StoryMap.isOpen(),document.getElementById('mapSheet').hidden].join()),'true,true');
assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert.equal(await p.evaluate(()=>StoryMap.isOpen()),false);
assert.deepEqual(errors,[]);await p.close();}
await browser.close();console.log('PASS 구조도 도구: 개요/상세(분기 접기, 눌러서 펼치기), 카드 첫 줄·종류 색·점검·도달 못 함, 「→」 꼬리표로 이동, 🎲 한 줄·막대, 빈 곳까지 그은 선으로 새 사건(선택지·🎲), 찾기, 미니맵, 꾹 메뉴(다음 사건·복제·진행 방식·첫 사건·삭제), 메모(쓰기·옮기기·지우기), 뼈대 5종(이어 붙이기), 뒤로 가기 순서, 360·320px.');
})().catch(e=>{console.error(e);process.exit(1)});
