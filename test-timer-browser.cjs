const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// ⏱ 시간 제한: set on the 선택지 tab; in play the bar waits for the line, holds while the bag is open or 테스트 is paused,
// then takes the 시간 초과 choice. Deleting that choice turns the timer off; a copied scene keeps its own.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;const a=C.event(),z=C.event(),y=C.event();a.title='문';a.text='문이 닫히고 있다! '.repeat(8);a.choices[0].text='뛰어든다';a.choices[0].next=z.id;const c2=C.choice();c2.text='머뭇거린다';c2.next=y.id;a.choices.push(c2);z.title='안';z.text='안에 들어왔다.';y.title='밖';y.text='문이 닫혔다.';z.choices[0].next='end';y.choices[0].next='end';project.events=[a,z,y];selected=a.id;part='choices';persist();renderEditor();});
assert.equal(await p.locator('#timerButton').innerText(),'⏱ 시간 제한');
await p.locator('#timerButton').click();await p.locator('#timerOn').check();await p.locator('#timerSeconds').fill('31');await p.locator('#saveTimer').click();assert.match(await p.locator('#formError').innerText(),/3~30/);
await p.locator('#timerSeconds').fill('5');await p.locator('#timerChoice').selectOption({index:1});await p.locator('#saveTimer').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
const timer=await p.evaluate(()=>project.events[0].timer);assert.deepEqual(timer,{seconds:5,choice:await p.evaluate(()=>project.events[0].choices[1].id)});
assert.equal(await p.locator('#timerButton').innerText(),'⏱ 5초');assert.match(await p.locator('.sceneChoice small').nth(1).innerText(),/⏱ 시간 초과 시/);
// Play: no time passes while the line is still typing.
await p.evaluate(()=>switchPage('test'));await p.waitForFunction(()=>!!run&&!!document.getElementById('choiceTimer'));
await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>dialogueTyping),true);assert.equal(await p.evaluate(()=>choiceTimer.left),5000,'waits for the line');
await p.evaluate(()=>finishDialogue(true));await p.waitForTimeout(700);const after=await p.evaluate(()=>choiceTimer.left);assert(after<4800&&after>3500,'runs once the choices are ready: '+after);
// Holds while the bag is open.
await p.locator('#bag').click();const held=await p.evaluate(()=>choiceTimer.left);await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>choiceTimer.left),held);await p.locator('#closeState').click();
// 테스트 ⏸ pauses; ▶ resumes.
await p.locator('#timerPause').click();const paused=await p.evaluate(()=>choiceTimer.left);await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>choiceTimer.left),paused);assert.equal(await p.locator('#timerPause').innerText(),'▶');await p.locator('#timerPause').click();
// Time runs out → 머뭇거린다.
await p.evaluate(()=>{choiceTimer.left=150;});await p.waitForFunction(()=>run.turn===1,null,{timeout:3000});assert.equal(await p.evaluate(()=>project.events.find(e=>e.id===run.current).title),'밖');
assert.equal(await p.locator('#choiceTimer').count(),0,'no bar on a scene without a timer');assert.match(await p.locator('#statusText').innerText(),/시간 초과/);
// When 머뭇거린다 is locked, the first open choice is taken.
await p.evaluate(()=>{const c=project.events[0].choices[1];C.setNeeds(c,[{id:'@money',count:3,not:true}],false);persist();restartRun();});await p.waitForFunction(()=>run.turn===0&&!!document.getElementById('choiceTimer'));await p.evaluate(()=>finishDialogue(true));await p.waitForTimeout(300);
await p.evaluate(()=>{choiceTimer.left=100;});await p.waitForFunction(()=>run.turn===1,null,{timeout:3000});assert.equal(await p.evaluate(()=>project.events.find(e=>e.id===run.current).title),'안');
// A copied scene keeps a timer on its own copy of the choice; deleting the 시간 초과 choice turns the timer off.
await p.evaluate(()=>{switchPage('story');selected=project.events[0].id;part='content';renderEditor();eventToolsSheet(project.events[0]);});await p.locator('#duplicate').click();
const copy=await p.evaluate(()=>{const c=project.events[1];return {timer:c.timer,ids:c.choices.map(x=>x.id)};});assert.equal(copy.timer.choice,copy.ids[1]);
await p.evaluate(()=>{selected=project.events[0].id;part='choices';renderEditor();choiceForm(project.events[0].choices[1]);});await p.locator('#removeChoice').click();
assert.equal(await p.evaluate(()=>project.events[0].timer),undefined);await p.waitForFunction(()=>/시간 제한도 껐어요/.test(document.getElementById('toast').textContent));
assert.deepEqual(errors,[]);await browser.close();console.log('PASS ⏱ 시간 제한: form (3~30, choice), list marks, waits for the line, holds with bag open, test pause, timeout picks its choice or the first open one, copy remaps, delete turns off.');
})().catch(e=>{console.error(e);process.exit(1)});
