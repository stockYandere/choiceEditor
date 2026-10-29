const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 엔딩 모음: endings reached in real play are kept per game (not in 테스트), the play list shows 엔딩 n/m and its sheet
// (??? for unseen), the next play reads them ({#진엔딩? …}), and 기록 지우기 empties it.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openPlayer').disabled);
const id=await p.evaluate(async()=>{const q=C.fresh();q.randomStart=0;q.title='엔딩 시험';const a=C.event(),good=C.event(),bad=C.event();a.title='갈림길';a.text='{#진엔딩? 또 왔네.|처음이네.}';a.choices[0].text='웃는다';a.choices[0].next=good.id;const b=C.choice();b.text='뛰어내린다';b.next=bad.id;a.choices.push(b);good.title='해피';good.text='끝.';good.ending='end';good.endLabel='진엔딩';bad.title='낙하';bad.text='으악.';bad.ending='death';q.events=[a,good,bad];const g=GameVault.game(q,true);store.games.push(g);await persist();return g.id;});
const reach=async n=>{await p.evaluate(()=>finishDialogue(true));await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').nth(n).click();await p.waitForFunction(()=>run.ended);};
await p.locator('#openPlayer').click();const card=p.locator('.gameCard').filter({hasText:'엔딩 시험'});assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 0/4');
await card.locator('[data-play-game]').click();await p.waitForFunction(()=>playing);await p.evaluate(()=>finishDialogue(true));assert.equal(await p.locator('#dialogue').innerText(),'처음이네.');
await reach(0);assert.deepEqual(await p.evaluate(gid=>store.games.find(g=>g.id===gid).endings,id),[await p.evaluate(gid=>store.games.find(g=>g.id===gid).published.events[1].id,id)]);
await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 1/4');
await card.locator('[data-endings-game]').click();assert.equal(await p.locator('.endingCount b').innerText(),'1 / 4');assert.deepEqual(await p.locator('.endingRow b').allInnerTexts(),['진엔딩','???','???','???']);
assert.equal(await p.evaluate(()=>{const m=document.getElementById('modalBody');return m.scrollHeight-m.clientHeight<=2;}),true);await p.locator('#closeModal').click();
// The next play reads it.
await card.locator('[data-play-game]').click();await p.waitForFunction(()=>playing);await p.evaluate(()=>finishDialogue(true));assert.equal(await p.locator('#dialogue').innerText(),'끝.','an ended run reopens on its ending');
await p.evaluate(gid=>playGame(gid,true),id);await p.waitForFunction(()=>playing&&run.turn===0);await p.evaluate(()=>finishDialogue(true));assert.equal(await p.locator('#dialogue').innerText(),'또 왔네.');
await reach(1);await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 2/4');
// The record survives a reload.
await p.reload();await p.waitForFunction(()=>!document.getElementById('openPlayer').disabled);await p.locator('#openPlayer').click();assert.equal(await card.locator('[data-endings-game]').innerText(),'엔딩 2/4');
// 테스트 in the editor does not record.
await p.evaluate(gid=>openGame(gid),id);await p.waitForFunction(()=>page==='story');await p.evaluate(()=>switchPage('test'));await p.waitForFunction(()=>!!run);
await p.evaluate(()=>finishDialogue(true));assert.equal(await p.locator('#dialogue').innerText(),'또 왔네.','테스트 reads the record too');await p.evaluate(()=>restartRun());await p.waitForFunction(()=>run.turn===0);
const before=await p.evaluate(gid=>store.games.find(g=>g.id===gid).endings.length,id);await p.evaluate(()=>{run.choose(run.p.events[0].choices[0].id);renderTest();});assert.equal(await p.evaluate(gid=>store.games.find(g=>g.id===gid).endings.length,id),before);
// 기록 지우기.
await p.evaluate(()=>{switchPage('story');showList('player');});await p.waitForFunction(()=>page==='gameList');p.once('dialog',d=>d.accept());await card.locator('[data-endings-game]').click();await p.locator('#endingReset').click();
assert.equal(await p.evaluate(gid=>store.games.find(g=>g.id===gid).endings,id),undefined);assert.equal(await p.locator('.endingCount b').innerText(),'0 / 4');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 엔딩 모음: play records (테스트 does not), list 엔딩 n/m and ??? sheet, 2회차 line, survives reload, reset.');
})().catch(e=>{console.error(e);process.exit(1)});
