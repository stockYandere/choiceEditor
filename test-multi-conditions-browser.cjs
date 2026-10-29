const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// The choice form adds up to three conditions / gains / losses with ＋, saves them, the player shows one badge per condition
// (one joined badge for 하나라도), and deleting an item takes it out of every list.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:640},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.definitions=[{id:'key',name:'열쇠',type:'item',initial:1},{id:'map',name:'지도',type:'item',initial:0},{id:'torch',name:'횃불',type:'item',initial:2},{id:'brave',name:'용기',type:'ability',initial:0}];const a=C.event(),z=C.event();a.title='문 앞';a.text='잠긴 문.';a.choices[0].text='계속';a.choices[0].next=z.id;z.title='방';z.text='방 안.';z.choices[0].next='end';project.events=[a,z];selected=a.id;part='choices';persist();renderEditor();choiceForm(a.choices[0]);});
const tab=name=>p.locator('#modal [data-form-tab]',{hasText:name}).click();
// 조건: one row, ＋ shows after it is filled, then a second row and the 여러 조건 choice.
await tab('조건');assert.equal(await p.locator('#cRequiresAdd').isVisible(),false);assert.equal(await p.locator('#cRequires2Line').isVisible(),false);
await p.locator('#cRequires').selectOption('key');assert.equal(await p.locator('#cRequiresAdd').isVisible(),true);assert.equal(await p.locator('#cRequiresAnyRow').isVisible(),false);
await p.locator('#cRequiresAdd').click();assert.equal(await p.locator('#cRequires2Line').isVisible(),true);assert.equal(await p.locator('#cRequiresAdd').isVisible(),false,'no ＋ until the new row is filled');
await p.locator('#cRequires2').selectOption('brave');await p.locator('#cRequires2Mode').selectOption('not');assert.equal(await p.locator('#cRequiresAnyRow').isVisible(),true);
await p.locator('#cRequiresAdd').click();await p.locator('#cRequires3').selectOption('map');assert.equal(await p.locator('#cRequiresAdd').isVisible(),false,'three is the most');
await p.locator('#cRequiresAny').selectOption('any');
// A repeated item is refused with a message.
await p.locator('#cRequires3').selectOption('key');await p.locator('#saveChoice').click();assert.match(await p.locator('#formError').innerText(),/같은 항목을 두 번/);await p.locator('#cRequires3').selectOption('map');
// 얻기·잃기: two gains, two losses.
await tab('얻기·잃기');await p.locator('#cGain').selectOption('map');await p.locator('#cGainAdd').click();await p.locator('#cGain2').selectOption('brave');
await p.locator('#cLose').selectOption('key');await p.locator('#cLoseAdd').click();await p.locator('#cLose2').selectOption('torch');await p.locator('#cLose2Count').fill('2');
await p.locator('#saveChoice').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
const c=await p.evaluate(()=>project.events[0].choices[0]);
assert.deepEqual(await p.evaluate(()=>C.needsOf(project.events[0].choices[0])),[{id:'key',count:1,not:false},{id:'brave',count:1,not:true},{id:'map',count:1,not:false}]);
assert.equal(c.requiresAny,true);assert.deepEqual(await p.evaluate(()=>C.gainsOf(project.events[0].choices[0])),[{id:'map',count:1},{id:'brave',count:1}]);assert.deepEqual(await p.evaluate(()=>C.losesOf(project.events[0].choices[0])),[{id:'key',count:1},{id:'torch',count:2}]);
assert.match(await p.locator('.sceneChoice small').first().innerText(),/하나라도: 열쇠 1 또는 용기 없을 때 또는 지도 1.*획득: 지도 1, 용기 1.*소모: 열쇠 1, 횃불 2/);
// Reopening shows the saved rows.
await p.evaluate(()=>choiceForm(project.events[0].choices[0]));await tab('조건');assert.equal(await p.locator('#cRequires3Line').isVisible(),true);assert.equal(await p.locator('#cRequires2Mode').inputValue(),'not');assert.equal(await p.locator('#cRequiresAny').inputValue(),'any');await p.locator('#closeModal').click();await p.waitForFunction(()=>!document.getElementById('modal').open&&!activeForm);await p.waitForTimeout(100);// the dialog's close event comes a moment later
// 다른 결과: two conditions, all needed.
await p.evaluate(()=>choiceForm(project.events[0].choices[0]));await tab('다른 결과');await p.locator('#bWhen').selectOption('key');await p.locator('#bWhenAdd').click();await p.locator('#bWhen2').selectOption('@money');await p.locator('#bWhen2Count').fill('2');assert.equal(await p.locator('#bWhenAnyRow').isVisible(),true);
await p.locator('#bNext').selectOption('end');await p.locator('#saveChoice').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
assert.deepEqual(await p.evaluate(()=>C.whensOf(project.events[0].choices[0].branch)),[{id:'key',count:1,not:false},{id:'@money',count:2,not:false}]);
// Player: 하나라도 is one badge; the losses are one badge each.
await p.evaluate(()=>switchPage('test'));await p.waitForFunction(()=>!!run);await p.evaluate(()=>{run.money=1;renderTest();finishDialogue(true);});// 돈 1: the base result, with its two losses
const badges=await p.locator('#answers button').first().evaluate(b=>b.innerText.replace(/\s+/g,' '));assert.match(badges,/열쇠 또는 용기 없을 때만 또는 지도 필요/);assert.match(badges,/열쇠 1개 사용/);assert.match(badges,/횃불 2개 사용/);
await p.evaluate(()=>{run.money=3;renderTest();finishDialogue(true);});await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();
assert.equal(await p.evaluate(()=>run.ended),true,'both branch conditions held → 다른 결과 ends');
// Deleting 지도 removes it from conditions and gains; deleting 열쇠 drops the first condition and the branch keeps 돈.
await p.evaluate(()=>{deleteDefinition('map');deleteDefinition('key');});
const after=await p.evaluate(()=>{const c=project.events[0].choices[0];return {needs:C.needsOf(c),gains:C.gainsOf(c),loses:C.losesOf(c),whens:C.whensOf(c.branch)};});
assert.deepEqual(after,{needs:[{id:'brave',count:1,not:true}],gains:[{id:'brave',count:1}],loses:[{id:'torch',count:2}],whens:[{id:'@money',count:2,not:false}]});
await p.evaluate(()=>C.validate(JSON.parse(JSON.stringify(project))));
assert.deepEqual(errors,[]);await browser.close();console.log('PASS choice form: ＋ rows for 조건 (있을/없을 · 모두/하나라도), 얻기, 잃기, 다른 결과; repeat refused; summary; player badges; deleting items cleans every list.');
})().catch(e=>{console.error(e);process.exit(1)});
