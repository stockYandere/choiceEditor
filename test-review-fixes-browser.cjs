const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// Review fixes seen from the app: ✓ on a 🎲 scene takes it out of its pool, a kept form draft does not undo a later
// change, 자동 플레이 shows emptied pools apart, 테스트 plays the tidied game, 서재 전체 백업 out and back in (adds, skips
// what is already there), the update line on a metered connection, and installs wait for the first screen or a list.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await browser.newContext({viewport:{width:360,height:740},hasTouch:true,acceptDownloads:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.__idle=[];window.__status={enabled:true,current:'0.1.73',currentCode:74,checking:false,installing:false,ready:false,readyName:'',pending:true,pendingName:'0.1.74',notes:'',canInstall:true,silent:true,lastCheck:1,error:''};window.__calls=[];
 if(location.search!=='?plain')window.Android={updateStatus:()=>JSON.stringify(window.__status),setAutoUpdate(){},checkUpdate(){window.__calls.push('check');},installUpdate(){window.__calls.push('install');},downloadUpdate(){window.__calls.push('download');},openInstallSettings(){},setUpdateIdle:v=>window.__idle.push(v),
  readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true,exportFile(){}};});
// --- with the Android bridge: update line and idle reports ---
await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
assert.match(await p.locator('#appUpdateText').innerText(),/새 버전 0\.1\.74가 있어요\. 모바일 데이터라 아직 받지 않았습니다/);assert.equal(await p.locator('#appUpdateAction').innerText(),'지금 받기');await p.locator('#appUpdateAction').click();assert.deepEqual(await p.evaluate(()=>__calls),['download']);
await p.evaluate(()=>{__status={...__status,pending:false,ready:true,readyName:'0.1.74'};onAppUpdate(__status);});assert.match(await p.locator('#appUpdateText').innerText(),/편집 · 플레이 중이 아닐 때 앱을 나가 있으면 자동으로 설치돼요/);await p.locator('#appUpdateAction').click();assert.deepEqual(await p.evaluate(()=>__calls),['download','install']);
assert.deepEqual(await p.evaluate(()=>__idle),[true],'the first screen may install');await p.locator('#openEditor').click();assert.deepEqual(await p.evaluate(()=>__idle),[true],'so may a game list');
await p.locator('[data-edit-game]').first().click();await p.waitForFunction(()=>page==='story');assert.equal(await p.evaluate(()=>__idle.at(-1)),false,'not while editing');await p.evaluate(()=>switchPage('test'));await p.waitForFunction(()=>!!run);assert.equal(await p.evaluate(()=>__idle.at(-1)),false,'nor while testing');
await p.evaluate(()=>showHome());await p.waitForFunction(()=>page==='home');assert.equal(await p.evaluate(()=>__idle.at(-1)),true);
// --- in the browser (own storage) ---
await p.goto(url+'?plain');await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('#newGame').click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.title='리뷰 게임';const mk=(t,kind)=>{const e=C.event();e.title=t;e.kind=kind;e.text=t;return e;};const hub=mk('거점','story'),a=mk('하나','encounter'),b=mk('둘','encounter'),c=mk('셋','branch');
 hub.choices=[{...C.choice(),text:'돌아다닌다',next:'random'},{...C.choice(),text:'셋으로',next:c.id}];for(const e of [a,b]){e.once=true;e.choices[0].next=hub.id;}c.choices[0].next='end';project.events=[hub,a,b,c];selected=hub.id;persist();renderEditor();window.__ev=t=>project.events.find(e=>e.title===t);});await p.evaluate(()=>flushEditor());
// 1. ✓ on a 🎲 scene in the 구조도: it becomes an ending and leaves the pool (as 진행 방식 → 엔딩 장면 does).
await p.evaluate(()=>openStoryMap('story'));await p.waitForFunction(()=>StoryMap.isOpen());await p.locator('[data-map-mode="draw"]').click();
await p.evaluate(async()=>{const fire=(type,x,y)=>document.getElementById('mapCanvas').dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,isPrimary:true}));const r=document.querySelector(`[data-map-event="${__ev('둘').id}"]`).getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,pts=[[x-12,y-10],[x-6,y-5],[x,y],[x+6,y-10],[x+12,y-20],[x+18,y-30]];fire('pointerdown',...pts[0]);for(const q of pts.slice(1))fire('pointermove',...q);fire('pointerup',...pts.at(-1));await new Promise(r=>setTimeout(r,0));while(StoryMap.busy())await new Promise(r=>setTimeout(r,10));});
await p.locator('[data-end="end"]').click();await p.waitForFunction(()=>__ev('둘').ending==='end');assert.equal(await p.evaluate(()=>__ev('둘').kind),'branch');assert.equal(await p.evaluate(()=>new C.Run(clone(project)).eligible('').map(e=>e.title).join()),'하나');
await p.evaluate(()=>{C.setEnding(__ev('둘'),'');__ev('둘').kind='encounter';persist();StoryMap.close({silent:true});renderEditor();});
// 2. 자동 플레이 counts runs that drew from an emptied pool apart, with the scene and an example path.
await p.evaluate(()=>{autoplaySheet();});await p.locator('.autoHead.loss').first().waitFor({timeout:60000});assert.match(await p.locator('#autoReport').innerText(),/🎲 묶음에 뽑을 사건이 없어 그대로 끝난 판/);
await p.locator('[data-auto-path^="dry:"]').click();assert.match(await p.locator('#modal').innerText(),/남은 사건이 없어 이야기가 그대로 끝난 판[\s\S]*뽑을 사건 없음/);await p.evaluate(()=>closeForm());
// 3. 테스트 plays the tidied game: a 시간 제한 whose choice is gone is not there, as in the published game.
await p.evaluate(()=>{__ev('셋').timer={seconds:5,choice:'gone'};persist();});await p.evaluate(()=>flushEditor());await p.evaluate(()=>switchPage('test'));await p.waitForFunction(()=>!!run);assert.equal(await p.evaluate(()=>run.p.events.find(e=>e.title==='셋').timer),undefined);await p.evaluate(()=>{switchPage('story');delete __ev('셋').timer;persist();});
// 4. A choice form left unfinished, then the choice changed elsewhere: the old draft is dropped, not put back.
const cid=await p.evaluate(()=>__ev('거점').choices[1].id);await p.evaluate(id=>{selected=__ev('거점').id;part='choices';renderEditor();choiceForm(__ev('거점').choices.find(c=>c.id===id));},cid);
await p.fill('#cText','');await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>Object.keys(store.formDrafts||{}).length),1,'unfinished input is kept');await p.evaluate(()=>closeForm());await p.waitForTimeout(200);// the dialog's close event settles before the form opens again

await p.evaluate(id=>{const c=__ev('거점').choices.find(c=>c.id===id);c.text='구조도에서 고친 문구';c.next='end';persist();},cid);await p.evaluate(id=>choiceForm(__ev('거점').choices.find(c=>c.id===id)),cid);
assert.equal(await p.inputValue('#cText'),'구조도에서 고친 문구');assert.equal(await p.evaluate(()=>Object.keys(store.formDrafts||{}).length),0);
// Typing something valid leaves no draft behind (the value is already in the game).
await p.fill('#cText','새 문구');await p.waitForTimeout(100);assert.equal(await p.evaluate(id=>__ev('거점').choices.find(c=>c.id===id).text,cid),'새 문구');assert.equal(await p.evaluate(()=>Object.keys(store.formDrafts||{}).length),0);await p.evaluate(()=>closeForm());
// 5. 서재 전체 백업: out, then in again — nothing doubles; after deleting a game, the backup gives it back.
await p.evaluate(()=>flushEditor());await p.locator('#files').click();await p.locator('[data-form-tab]',{hasText:'서재'}).click();
assert.equal(await p.evaluate(()=>{const m=document.getElementById('modalBody');return m.scrollHeight-m.clientHeight<=2;}),true,'the 서재 tab fits');
const [file]=await Promise.all([p.waitForEvent('download'),p.locator('#libraryExport').click()]);const text=fs.readFileSync(await file.path(),'utf8'),n=await p.evaluate(()=>store.games.length);assert.equal(JSON.parse(text).format,'event-vault-file');
await p.locator('#projectFile').setInputFiles({name:'library.json',mimeType:'application/json',buffer:Buffer.from(text)});await p.waitForFunction(()=>/이미 서재에 있는 게임뿐/.test(document.getElementById('toast').textContent));assert.equal(await p.evaluate(()=>store.games.length),n);
await p.evaluate(()=>{const g=store.games.find(g=>g.draft.title==='리뷰 게임');g.endings=['x'];});
await p.evaluate(async()=>{const other=store.games.find(g=>g.draft.title!=='리뷰 게임');await openGame(other.id);store.games=store.games.filter(g=>g.draft.title!=='리뷰 게임');await GameVault.write(store);});assert.equal(await p.evaluate(()=>store.games.length),n-1);
await p.evaluate(()=>{project.title='내가 고친 예제';persist();return flushEditor();});await p.locator('#files').click();await p.locator('#projectFile').setInputFiles({name:'library.json',mimeType:'application/json',buffer:Buffer.from(text)});
await p.waitForFunction(()=>/게임 2개를 서재에 추가했습니다/.test(document.getElementById('toast').textContent));const titles=await p.evaluate(()=>store.games.map(g=>g.draft.title));assert(titles.includes('리뷰 게임'),'the deleted game is back');assert(titles.includes('내가 고친 예제'),'my edited game is not replaced');assert(titles.some(t=>/ \(가져옴\)$/.test(t)),'its backup copy comes in beside it');assert.equal(new Set(await p.evaluate(()=>store.games.map(g=>g.id))).size,titles.length);
await p.reload();await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);assert.equal(await p.evaluate(()=>store.games.length),n+1);assert.equal(await p.evaluate(()=>store.quarantine),undefined);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS review fixes (browser): ✓ ending leaves its 🎲 pool, emptied pools in 자동 플레이, tidied 테스트, stale form draft dropped, 서재 전체 백업 round trip, metered update line, installs only when idle.');
})().catch(e=>{console.error(e);process.exit(1)});
