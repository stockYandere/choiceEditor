const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 사망 장면: a scene of its own (text, art, cause) that a choice leads to, kept apart from the ordinary 체력·멘탈 0 death.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
// From a choice: 다음 → ＋ 새 사망 장면 만들기.
await p.locator('[data-part=choices]').click();await p.locator('[data-choice]').first().click();await p.locator('#modal [data-form-tab]',{hasText:'다음'}).click();
await p.locator('#cNext').selectOption('__newDeath__');assert.equal(await p.locator('#cNextInline').isVisible(),true);assert.match(await p.locator('#cNextName').getAttribute('placeholder'),/사망 장면/);
await p.locator('#cNextName').fill('기린 사망');await p.locator('#cNextCreate').click();
const death=await p.evaluate(()=>project.events.find(e=>e.title==='기린 사망'));assert.equal(death.ending,'death');assert.equal(death.kind,'branch');
assert.match(await p.locator('#cNext option:checked').innerText(),/☠ 기린 사망/);
await p.locator('#editChoiceNext').click();assert.equal(await p.evaluate(()=>current().title),'기린 사망');
// Its content tab asks for the cause where the choices link was; the choices tab explains there are none.
assert.equal(await p.locator('#eventKind').inputValue(),'death');assert.equal(await p.locator('#goChoices').count(),0);
await p.locator('#endLabel').fill('기린이라고 답함');await p.locator('#copy').fill('기린이라고? 죽어.');
assert.equal(await p.evaluate(()=>current().endLabel),'기린이라고 답함');
await p.locator('[data-part=choices]').click();assert.match(await p.locator('.endNotice').innerText(),/사망 장면[\s\S]*일반 사망과 따로/);
// Problems list does not ask for choices on an ending scene.
assert.equal(await p.evaluate(()=>C.inspect(project).filter(i=>i.event===current().id&&/선택지/.test(i.message)).length),0);
// Play it: the run ends on the scene's own words, marked as a special death with its cause.
await p.evaluate(()=>{run=null;switchPage('test');});await p.evaluate(()=>{finishDialogue?.(true);});await p.waitForFunction(()=>performance.now()>=choiceReadyAt);
await p.evaluate(()=>{const c=project.events[0].choices[0];run.choose(c.id);renderTest();finishDialogue?.(true);});
assert.equal(await p.evaluate(()=>[run.ended,run.dead,run.endNote].join()),'true,true,기린이라고 답함');
assert.equal(await p.locator('.endTag').innerText(),'☠ 사망 · 기린이라고 답함');assert.match(await p.locator('#transcript, #line, #box').first().innerText(),/기린이라고\? 죽어/);
assert.match(await p.locator('#answers').innerText(),/다시 테스트/);
// Back to a normal scene clears it.
await p.evaluate(()=>switchPage('story'));await p.evaluate(()=>{selected=project.events.find(e=>e.title==='기린 사망').id;part='content';renderEditor();});await p.locator('#eventKind').selectOption('branch');
assert.equal(await p.evaluate(()=>current().ending),undefined);assert.equal(await p.locator('#goChoices').count(),1);
// Ordinary death: 체력 0 keeps the game's 일반 사망 연출 and says so.
await p.evaluate(()=>{const c=project.events[0].choices[0];c.hp=-99;c.next='sequence';run=null;switchPage('test');});
await p.evaluate(()=>{run.choose(project.events[0].choices[0].id);renderTest();finishDialogue?.(true);});
assert.equal(await p.locator('.endTag').innerText(),'사망 · 체력 0');assert.equal(await p.evaluate(()=>run.endScene),'');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 새 사망 장면 from a choice, cause field, no-choices notice, special death in play with its own text, back to normal scene, ordinary 체력 0 death kept apart.');
})().catch(e=>{console.error(e);process.exit(1)});
