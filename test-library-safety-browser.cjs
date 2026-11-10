const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// Paths that used to lose the library: an item turned into 호감도 while a 없을 때 condition used it, a draft the app
// cannot read back, one broken game at load, leaving play when saving fails, a file with a bad name, 등장 조건 이하.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await browser.newContext({viewport:{width:360,height:640},hasTouch:true,acceptDownloads:true}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>!document.getElementById('openEditor').disabled);await p.goto(url);await ready();
const valid=()=>p.evaluate(()=>{try{C.validate(clone(project));return 'ok';}catch(e){return e.message;}});
await p.locator('#openEditor').click();await p.locator('#newGame').click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.title='내 소중한 게임';project.definitions=[{id:'key',name:'열쇠',type:'item',initial:0},{id:'mj',name:'민준',type:'affinity',initial:0}];const a=project.events[0],b=C.event();a.title='골목';a.text='x';a.choices[0].text='문을 연다';a.choices[0].requires='key';a.choices[0].requiresNot=true;a.choices[0].next='random';b.title='밤';b.text='t';b.kind='encounter';b.choices[0].next='end';project.events=[a,b];persist();});
assert.equal(await p.evaluate(()=>flushEditor()),true);
// 1. 아이템 → 호감도 is refused while a 없을 때 condition uses it.
await p.locator('[data-page=inventory]').click();await p.locator('[data-edit-def=key]').click();await p.selectOption('#dType','affinity');await p.locator('#saveDef').click();await p.waitForTimeout(300);
assert.equal(await p.evaluate(()=>project.definitions[0].type),'item');assert.match(await p.locator('#modal').innerText(),/호감도로 바꿀 수 없어요/);assert.equal(await valid(),'ok');
await p.evaluate(()=>{closeForm();});await p.waitForTimeout(200);
assert.equal(await p.evaluate(()=>{project.events[0].choices[0].requiresNot=false;project.events[0].choices[0].requiresCount=6;return typeClash('key','affinity')!=='';}),true,'6 이상 also blocks');
assert.equal(await p.evaluate(()=>{project.events[1].appear=[{id:'key',count:1,not:true}];const m=typeClash('key','affinity');delete project.events[1].appear;project.events[0].choices[0].requiresCount=1;return /랜덤 등장/.test(m)||/조건에서/.test(m);}),true);
// 2. A draft that could not be read back is not written; the last good save stays and the header says so.
await p.evaluate(()=>{persist();return flushEditor();});const good=await p.evaluate(()=>JSON.stringify(store.games.find(g=>g.id===store.active).draft));
await p.evaluate(()=>{project.events[0].choices[0].requiresCount=0;persist();});assert.equal(await p.evaluate(()=>flushEditor()),false);
assert.equal(await p.locator('#saveStatus').innerText(),'저장 보류');assert.equal(await p.evaluate(()=>JSON.stringify(store.games.find(g=>g.id===store.active).draft)),good);assert.match(await p.locator('#toast').innerText(),/저장할 수 없어요 \(요구·획득·소모 수량\)/);
await p.evaluate(()=>{project.events[0].choices[0].requiresCount=1;persist();});assert.equal(await p.evaluate(()=>flushEditor()),true);assert.equal(await p.locator('#saveStatus').innerText(),'편집 저장됨');
// 3. 등장 조건 「이하」 is kept.
await p.evaluate(()=>{switchPage('story');appearForm(project.events[1]);});await p.selectOption('#aWhen','mj');await p.selectOption('#aWhenMode','le');await p.fill('#aWhenCount','-2');await p.locator('#saveAppear').click();await p.waitForTimeout(200);
assert.deepEqual(await p.evaluate(()=>project.events[1].appear),[{id:'mj',count:-2,le:true}]);assert.equal(await valid(),'ok');assert.equal(await p.evaluate(()=>new C.Run(clone(project)).eligible('').length),0,'민준 0 is not ≤ -2');
await p.evaluate(()=>{closeForm();appearForm(project.events[1]);});assert.equal(await p.inputValue('#aWhenMode'),'le');await p.evaluate(()=>closeForm());
// 4. One broken game in the save: the others open, it waits in 보관, can be saved to a file and removed.
const before=await p.evaluate(async()=>{await flushEditor();const g=GameVault.game(clone(project));g.draft.title='깨진 게임';g.draft.events[0].choices[0].requiresCount=0;store.games.push(g);await GameVault.write(store);return store.games.length;});
await p.reload();await ready();assert.equal(await p.evaluate(()=>saveBlocked),false);assert.equal(await p.evaluate(()=>store.games.length),before-1);assert.equal(await p.evaluate(()=>store.quarantine.length),1);
assert.match(await p.locator('#homeMessage').innerText(),/읽지 못한 게임 1개/);assert.match(await p.locator('#toast').innerText(),/「깨진 게임」을 읽지 못해 따로 보관했습니다/);assert.equal(await p.evaluate(()=>store.notices),undefined);
await p.locator('#openEditor').click();assert.match(await p.locator('#listHeld').innerText(),/1개/);assert.equal(await p.evaluate(()=>{const b=document.getElementById('gameCards');return b.scrollHeight-b.clientHeight<=2;}),true,'the list still fits');
await p.locator('#listHeld').click();assert.equal(await p.locator('.heldRow').count(),1);assert.match(await p.locator('.heldRow').innerText(),/깨진 게임[\s\S]*요구·획득·소모 수량/);
const [file]=await Promise.all([p.waitForEvent('download'),p.locator('[data-held-save]').click()]);const saved=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(saved.format,'event-vault-file');assert.match(saved.body,/깨진 게임/);
p.once('dialog',d=>d.accept());await p.locator('[data-held-drop]').click();await p.waitForFunction(()=>!store.quarantine);assert.equal(await p.locator('.heldRow').count(),0);await p.evaluate(()=>closeForm());assert.equal(await p.locator('#listHeld').count(),0);
await p.reload();await ready();assert.equal(await p.evaluate(()=>store.quarantine),undefined);assert.match(await p.locator('#homeMessage').innerText(),/앱 안에 저장됩니다/);
// 5. A saved-aside original gives its games back (added, never replacing).
await p.evaluate(async()=>{const other=clone(store);other.games=[GameVault.game(clone(store.games.at(-1).draft))];other.games[0].draft.title='옛 원본의 게임';await GameVault.archive(GameVault.encode(other));});
await p.reload();await ready();await p.locator('#openEditor').click();const n=await p.evaluate(()=>store.games.length);await p.locator('#listHeld').click();await p.locator('[data-archive-open]').click();await p.waitForFunction(n=>store.games.length===n+1,n);
assert.equal(await p.evaluate(()=>store.games.at(-1).draft.title),'옛 원본의 게임');p.once('dialog',d=>d.accept());await p.locator('[data-archive-drop]').click();await p.waitForFunction(()=>!heldArchives.length);await p.evaluate(()=>closeForm());assert.equal(await p.locator('#listHeld').count(),0);
// 6. Leaving play when the save cannot be written: asked once, and the player can go.
await p.evaluate(()=>{const g=store.games.find(g=>g.published);return playGame(g.id,true);});await p.waitForFunction(()=>playing);await p.evaluate(()=>{saveBlocked=true;});
await p.evaluate(()=>appBack());await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>playing),true,'cancel stays');
p.once('dialog',d=>{assert.match(d.message(),/저장하지 않고 나갈까요/);d.accept();});await p.evaluate(()=>appBack());await p.waitForFunction(()=>!playing&&page==='gameList');await p.evaluate(()=>{saveBlocked=false;});
// 7. A file whose game name is not text is refused and nothing is added.
await p.evaluate(()=>showList('editor'));await p.evaluate(()=>openGame(store.games.at(-1).id));await p.waitForFunction(()=>page==='story');const count=await p.evaluate(()=>store.games.length),active=await p.evaluate(()=>store.active);
const bad=await p.evaluate(()=>{const q=clone(project);q.title=12345;return JSON.stringify(q);});await p.locator('#projectFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(bad)});await p.waitForTimeout(400);
assert.equal(await p.evaluate(()=>store.games.length),count);assert.equal(await p.evaluate(()=>store.active),active);assert.match(await p.locator('#toast').innerText(),/가져올 파일을 확인하세요/);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS library safety (browser): type change refused, unreadable draft not saved, 이하 kept, a broken game held apart and exported, original recovered, play can be left, bad file refused.');
})().catch(e=>{console.error(e);process.exit(1)});
