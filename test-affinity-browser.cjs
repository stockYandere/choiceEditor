const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 호감도 from the editor to the player: made in the 변화 tab, moved by ±, conditions switch to 이상/이하, the bag's 호감 tab and the notice.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:320,height:568},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.getByText(/새 게임/).first().click();await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{project.randomStart=0;project.definitions=[{id:'key',name:'열쇠',type:'item',initial:1}];const a=C.event(),z=C.event();a.title='골목';a.text='민준이 있다.';a.choices[0].text='말을 건다';a.choices[0].next=z.id;z.title='끝';z.text='{민준>=2? 민준이 웃는다.|민준은 조용하다.}';z.choices[0].next='end';project.events=[a,z];selected=a.id;part='choices';persist();renderEditor();choiceForm(a.choices[0]);});
const tab=name=>p.locator('#modal [data-form-tab]',{hasText:name}).click();
// 변화 tab: 호감도 row, make 민준 on the spot, then -1 with ± and back to +2.
assert.equal(await p.locator('#cAff').isVisible(),true);assert.equal(await p.locator('#cAffCountRow').isVisible(),false);
await p.locator('#cAff').selectOption('__new__');assert.equal(await p.locator('#cAffType').isVisible(),false,'the kind is fixed to 호감도');await p.locator('#cAffName').fill('민준');await p.locator('#cAffCreate').click();
assert.equal(await p.evaluate(()=>project.definitions.find(d=>d.name==='민준')?.type),'affinity');assert.equal(await p.locator('#cAff').inputValue(),await p.evaluate(()=>project.definitions.find(d=>d.name==='민준').id));
assert.equal(await p.locator('#cAffCountRow').isVisible(),true);await p.locator('#cAffCount').fill('1');await p.locator('[data-sign=cAffCount]').click();assert.equal(await p.locator('#cAffCount').inputValue(),'-1');await p.locator('#cAffCount').fill('2');
// 호감도 does not appear among items to gain; it does among conditions (with ♥).
await tab('얻기·잃기');assert.equal(await p.locator('#cGain option',{hasText:'민준'}).count(),0);
await tab('조건');assert.equal(await p.locator('#cRequires option',{hasText:'민준 ♥'}).count(),1);
await p.locator('#cRequires').selectOption({label:'민준 ♥'});assert.deepEqual(await p.locator('#cRequiresMode option').allInnerTexts(),['이상','이하']);
assert.equal(await p.locator('#cRequiresCount').getAttribute('min'),'-5');await p.locator('#cRequiresCount').fill('0');await p.locator('#cRequiresMode').selectOption('le');
await p.locator('#cRequires').selectOption('key');assert.deepEqual(await p.locator('#cRequiresMode option').allInnerTexts(),['있을 때','없을 때'],'back to item modes');await p.locator('#cRequires').selectOption({label:'민준 ♥'});await p.locator('#cRequiresMode').selectOption('le');await p.locator('#cRequiresCount').fill('0');
await p.locator('#saveChoice').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
const c=await p.evaluate(()=>project.events[0].choices[0]);const mj=await p.evaluate(()=>project.definitions.find(d=>d.name==='민준').id);
assert.deepEqual(c.affinity,[{id:mj,delta:2}]);assert.equal(c.requires,mj);assert.equal(c.requiresCount,0);assert.equal(c.requiresLe,true);
assert.match(await p.locator('.sceneChoice small').first().innerText(),/조건: 민준 0 이하.*호감도: 민준 \+2/);
// An item used for gains cannot turn into 호감도; 민준 cannot turn into an item while choices move it.
await p.evaluate(()=>{project.events[0].choices[0].gain='key';persist();switchPage('inventory');definitionForm(project.definitions.find(d=>d.id==='key'));});
await p.locator('#dType').selectOption('affinity');await p.locator('#saveDef').click();assert.match(await p.locator('#formError').innerText(),/호감도로 바꿀 수 없어요/);assert.equal(await p.evaluate(()=>project.definitions.find(d=>d.id==='key').type),'item');
await p.locator('#closeModal').click();await p.waitForTimeout(100);await p.evaluate(id=>definitionForm(project.definitions.find(d=>d.id===id)),mj);
assert.equal(await p.locator('#dAffinityHint').isVisible(),true);assert.equal(await p.locator('#dInitial').getAttribute('min'),'-5');assert.equal(await p.locator('[data-form-tab]').evaluateAll(xs=>xs.filter(x=>!x.hidden).length),1,'only 기본 for 호감도');
await p.locator('#dType').selectOption('item');await p.locator('#saveDef').click();assert.match(await p.locator('#formError').innerText(),/다른 종류로 바꿀 수 없어요/);await p.locator('#dType').selectOption('affinity');
await p.locator('#dInitial').fill('6');await p.locator('#saveDef').click();assert.match(await p.locator('#formError').innerText(),/-5~5/);await p.locator('#dInitial').fill('0');await p.locator('#saveDef').click();await p.waitForFunction(()=>!document.getElementById('modal').open);
await p.locator('[data-def-filter=affinity]').click();assert.deepEqual(await p.locator('#definitions [data-edit-def]').allInnerTexts().then(x=>x.map(t=>t.includes('민준'))),[true]);
// Player: the notice shows 민준 ♥ +2, the bag's 호감 tab shows the bar, the next line reads it.
await p.evaluate(()=>{project.events[0].choices[0].gain='';C.setNeeds(project.events[0].choices[0],[],false);persist();switchPage('test');});await p.waitForFunction(()=>!!run);
await p.evaluate(()=>finishDialogue(true));await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();
await p.waitForFunction(()=>!document.getElementById('statusMessage').hidden);assert.match(await p.locator('#statusText').innerText(),/민준 ♥ \+2/);
await p.locator('#bag').click();assert.equal(await p.locator('#affinityTab').isVisible(),true);await p.locator('#affinityTab').click();
assert.match(await p.locator('.affinityItem').innerText(),/민준[\s\S]*♥ \+2/);assert.equal(await p.locator('.affinityItem .affinityBar i.on').count(),2);
const tabs=await p.locator('#stateTabs button:not([hidden])').evaluateAll(xs=>xs.every(x=>x.scrollWidth<=x.clientWidth+1&&x.getBoundingClientRect().height<50));assert(tabs,'tabs stay on one line at 320px');
await p.locator('#closeState').click();await p.evaluate(()=>finishDialogue(true));assert.equal(await p.locator('#dialogue').innerText(),'민준이 웃는다.');
// Hidden: no tab, no notice text.
await p.evaluate(id=>{project.definitions.find(d=>d.id===id).hidden=true;persist();switchPage('story');switchPage('test');},mj);await p.waitForFunction(()=>!!run&&run.turn===0);await p.evaluate(()=>finishDialogue(true));await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();
assert.equal(await p.evaluate(()=>run.message),'변화 없음');await p.locator('#bag').click();assert.equal(await p.locator('#affinityTab').isVisible(),false);await p.locator('#closeState').click();
// Deleting 민준 takes it out of the choice.
await p.evaluate(id=>{deleteDefinition(id);},mj);assert.equal(await p.evaluate(()=>project.events[0].choices[0].affinity),undefined);await p.evaluate(()=>C.validate(JSON.parse(JSON.stringify(project))));
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 호감도 editor→player: made in 변화 tab (kind fixed), ±, 이상/이하 conditions, kept out of item lists, type clashes refused, -5~5, filter tab, notice, 호감 bag tab with bar at 320px, hidden quiet, delete cleans.');
})().catch(e=>{console.error(e);process.exit(1)});
