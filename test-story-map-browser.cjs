const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 구조도: open from 사건 찾기, draw a box / circles / lines with one finger, pinch with two, tap to open, undo, back.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
// A small known story: 1 → 2 → 3.
await p.evaluate(()=>{const ev=[1,2,3].map(n=>{const e=C.event();e.title='장면'+n;return e;});ev[0].choices[0].next=ev[1].id;ev[1].choices[0].next=ev[2].id;project.events=ev;selected=ev[0].id;persist();renderEditor();});
await p.evaluate(()=>flushEditor());
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();assert.equal(await p.locator('#storyMap').isVisible(),true);
assert.equal(await p.locator('[data-map-event]').count(),3);assert.equal(await p.locator('.mapLink').count(),2);
// Touch helpers in screen coordinates.
await p.evaluate(()=>{const c=document.getElementById('mapCanvas');const fire=(type,id,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:id===1}));
 window.__stroke=async pts=>{fire('pointerdown',1,pts[0][0],pts[0][1]);for(const [x,y]of pts.slice(1))fire('pointermove',1,x,y);const l=pts[pts.length-1];fire('pointerup',1,l[0],l[1]);await new Promise(r=>setTimeout(r,0));while(StoryMap.busy())await new Promise(r=>setTimeout(r,10));};
 window.__pinch=(cx,cy,d0,d1)=>{fire('pointerdown',1,cx-d0/2,cy);fire('pointerdown',2,cx+d0/2,cy);for(let i=1;i<=10;i++){const d=d0+(d1-d0)*i/10;fire('pointermove',1,cx-d/2,cy);fire('pointermove',2,cx+d/2,cy);}fire('pointerup',1,cx-d1/2,cy);fire('pointerup',2,cx+d1/2,cy);};
 window.__center=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];};});
const rectPts=(x,y,w,h)=>{const pts=[];for(let i=0;i<=40;i++){const d=i/40*2*(w+h);pts.push(d<w?[x+d,y]:d<w+h?[x+w,y+d-w]:d<2*w+h?[x+w-(d-w-h),y+h]:[x,y+h-(d-2*w-h)]);}return pts;};
const circlePts=(x,y,r)=>Array.from({length:37},(_,i)=>[x+r*Math.cos(i/36*2*Math.PI),y+r*Math.sin(i/36*2*Math.PI)]);
const linePts=(a,b)=>Array.from({length:16},(_,i)=>[a[0]+(b[0]-a[0])*i/15,a[1]+(b[1]-a[1])*i/15]);
const events=()=>p.evaluate(()=>project.events.map(e=>({t:e.title,c:e.choices.map(c=>[c.text,c.next])})));
// Pinch out: zoom in around the center; pinch in: back out. Nothing is drawn.
const s0=await p.evaluate(()=>StoryMap._view().s);await p.evaluate(()=>__pinch(180,400,80,200));const s1=await p.evaluate(()=>StoryMap._view().s);assert(s1>Math.min(3,s0*2)-.01,"pinch out zooms in "+s0+" "+s1);
await p.evaluate(()=>__pinch(180,400,200,80));assert(Math.abs(await p.evaluate(()=>StoryMap._view().s)-s0)<.02,'pinch in zooms back');assert.equal((await events()).length,3);
// 이동 mode (default): one finger drags the map, nothing is drawn.
assert.equal(await p.evaluate(()=>StoryMap.mode()),'move');assert.equal(await p.locator('[data-map-mode=move]').getAttribute('aria-pressed'),'true');
const v0=await p.evaluate(()=>StoryMap._view());await p.evaluate(()=>{const r=document.getElementById('mapCanvas').getBoundingClientRect();return __stroke(Array.from({length:12},(_,i)=>[r.x+8+i*10,r.y+12]));});const v1=await p.evaluate(()=>StoryMap._view());
assert(Math.abs(v1.x-v0.x-110)<1&&Math.abs(v1.y-v0.y)<1,'one finger pans in 이동');assert.equal((await events()).length,3);
// 이동 mode: dragging a box moves it (and pins the others where they were); undo puts it back.
await p.locator('#mapFit').click();
const box3=`[data-map-event="${await p.evaluate(()=>project.events[2].id)}"]`,before3=await p.evaluate(s=>__center(s),box3),other=await p.evaluate(()=>__center(`[data-map-event="${project.events[1].id}"]`));
await p.evaluate(([x,y])=>__stroke(Array.from({length:12},(_,i)=>[x,y-i*8])),before3);
const after3=await p.evaluate(s=>__center(s),box3);assert(Math.abs(after3[1]-(before3[1]-88))<2&&Math.abs(after3[0]-before3[0])<2,'box follows the finger');
assert.deepEqual(await p.evaluate(()=>__center(`[data-map-event="${project.events[1].id}"]`)),other,'other boxes stay put');assert.equal(await p.evaluate(()=>project.events.every(e=>e.map)),true);assert.equal((await events()).length,3);
await p.locator('#mapUndo').click();await p.waitForFunction(()=>!project.events.some(e=>e.map));
await p.locator('#mapFit').click();await p.locator('[data-map-mode=draw]').click();assert.match(await p.locator('#mapHint').innerText(),/그리기/);await p.evaluate(()=>__pinch(180,400,200,100));
// Draw a box in empty space at the bottom → 사건 4.
const canvas=await p.locator('#mapCanvas').boundingBox();
await p.evaluate(pts=>__stroke(pts),rectPts(canvas.x+canvas.width-115,canvas.y+canvas.height/2-25,100,50));
let ev=await events();assert.equal(ev.length,4);assert.equal(ev[3].t,'사건 4');assert.equal(await p.locator('[data-map-event]').count(),4);assert.match(await p.locator('#mapToast').innerText(),/사건 4/);
// Circles under 장면3 become its 선택지 1 and 2.
const s3=await p.evaluate(()=>__center(`[data-map-event="${project.events[2].id}"]`));
await p.evaluate(([x,y])=>__stroke(Array.from({length:37},(_,i)=>[x-40+18*Math.cos(i/36*2*Math.PI),y+60+18*Math.sin(i/36*2*Math.PI)])),s3);
await p.evaluate(([x,y])=>__stroke(Array.from({length:37},(_,i)=>[x+40+18*Math.cos(i/36*2*Math.PI),y+60+18*Math.sin(i/36*2*Math.PI)])),s3);
ev=await events();assert.deepEqual(ev[2].c.map(c=>c[0]),['선택지 1','선택지 2']);assert.equal(await p.locator('[data-map-choice]').count(),2);
// Line from 선택지 2 to 사건 4 links it.
const c2=await p.evaluate(()=>__center(`[data-map-choice="${project.events[2].choices[1].id}"]`)),b4=await p.evaluate(()=>__center(`[data-map-event="${project.events[3].id}"]`));
await p.evaluate(pts=>__stroke(pts),linePts(c2,b4));ev=await events();assert.equal(ev[2].c[1][1],await p.evaluate(()=>project.events[3].id));
// Line box → box: 장면1 already goes to 장면2, so a second line makes 선택지 1 / 선택지 2.
const b1=await p.evaluate(()=>__center(`[data-map-event="${project.events[0].id}"]`));
await p.evaluate(pts=>__stroke(pts),linePts(b1,b4));ev=await events();assert.deepEqual(ev[0].c.map(c=>c[0]),['선택지 1','선택지 2']);
// Undo takes back the last stroke only.
await p.locator('#mapUndo').click();await p.waitForFunction(()=>project.events[0].choices.length===1);assert.equal((await events()).length,4);
// A line that ends in empty space explains itself and changes nothing.
await p.evaluate(([x,y])=>__stroke(Array.from({length:16},(_,i)=>[x,y+i*2])),[canvas.x+canvas.width-20,canvas.y+40]);assert.match(await p.locator('#mapToast').innerText(),/양 끝/);
// Everything still validates, and the drawing survives a reload.
await p.evaluate(()=>C.validate(structuredClone(project)));await p.evaluate(()=>flushEditor());
// Tap a box → that scene opens in the editor.
await p.locator('[data-map-mode=move]').click();const tapAt=await p.evaluate(()=>__center(`[data-map-event="${project.events[3].id}"]`));await p.evaluate(([x,y])=>__stroke([[x,y]]),tapAt);
assert.equal(await p.locator('#storyMap').isVisible(),false);assert.equal(await p.evaluate(()=>current().title),'사건 4');
// Back button closes the map.
await p.locator('#chooseEvent').click();await p.locator('#openStoryMap').click();assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert.equal(await p.locator('#storyMap').isVisible(),false);assert.equal(await p.evaluate(()=>document.getElementById('modal').open),true,'back from the map returns to 사건 찾기');
await p.evaluate(async()=>{document.getElementById('modal').close();await flushEditor();await GameVault.flush();});await p.reload();await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
assert.equal(await p.evaluate(()=>project.events.length),4);assert.equal(await p.evaluate(()=>project.events[2].choices.filter(c=>c.map).length),2);
// 랜덤 인카운터: random choices meet at one 🎲 hub with a line to every encounter scene.
await p.evaluate(()=>{const a=C.event(),b=C.event(),c=C.event();a.title='시작';a.choices[0].next='random';b.title='만남1';b.kind='encounter';c.title='만남2';c.kind='encounter';project.events=[a,b,c];selected=a.id;persist();});
try{await p.waitForFunction(()=>page==='story'&&!document.getElementById('modal').open&&!StoryMap.isOpen(),null,{timeout:5000});await p.locator('#chooseEvent').click({timeout:5000});}catch(e){console.log(await p.evaluate(()=>({page,modal:document.getElementById('modal').open,title:document.getElementById('modal').querySelector('h2,b')?.textContent,map:StoryMap.isOpen(),ce:!!document.getElementById('chooseEvent'),vis:document.getElementById('chooseEvent')?.offsetParent!==null})));await p.screenshot({path:'/tmp/claude-0/-home-user/4bf91c89-c710-513d-8903-2e8117ef1458/scratchpad/fail.png'});throw e;}await p.locator('#openStoryMap').click();assert.equal(await p.locator('[data-map-hub]').count(),1);assert.equal(await p.locator('.mapLink.random').count(),3);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 구조도: 이동 mode pans with one finger and drags boxes (others pinned, undo), 그리기 mode draws, opens from 사건 찾기, 🎲 hub to encounters, pinch zoom in/out without drawing, box → new numbered scene, circles → 선택지 1/2, circle→box and box→box links, one-stroke undo, empty-end line hint, tap opens scene, back closes, survives reload.');
})().catch(e=>{console.error(e);process.exit(1)});
