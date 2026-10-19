const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 대사 변주 typing help: '{' → '{|}', typing over | and }, 다음 칸 / 괄호 밖 buttons, tidy on leaving the field.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();await p.waitForFunction(()=>page==='story');
const copy=p.locator('#copy'),val=()=>copy.inputValue();
await copy.fill('');await copy.focus();
// '{' brings its | and }, caret in the first part; the in-brace buttons replace 방문마다/무작위.
await p.keyboard.type('비가 온다. {');assert.equal(await val(),'비가 온다. {|}');assert.equal(await p.evaluate(()=>document.getElementById('copy').selectionStart),8);
assert.equal(await p.locator('#braceNext').isVisible(),true);assert.equal(await p.locator('#varVisits').isVisible(),false);
await p.keyboard.type('우산? 폈다');assert.equal(await val(),'비가 온다. {우산? 폈다|}');
// 다음 칸 › moves past | without the symbol keys and keeps focus; 괄호 밖 » leaves the group.
await p.locator('#braceNext').tap();assert.equal(await p.evaluate(()=>document.activeElement.id),'copy');await p.keyboard.type('맞았다');assert.equal(await val(),'비가 온다. {우산? 폈다|맞았다}');
await p.locator('#braceOut').tap();await p.keyboard.type(' 끝.');assert.equal(await val(),'비가 온다. {우산? 폈다|맞았다} 끝.');assert.equal(await p.locator('#braceNext').isVisible(),false);
// Typing | or } yourself steps over the one already there.
await p.keyboard.type(' {처음|또}');assert.equal(await val(),'비가 온다. {우산? 폈다|맞았다} 끝. {처음|또}');
// 다음 칸 in the last part adds a part.
await p.keyboard.press('ArrowLeft');await p.locator('#braceNext').tap();await p.keyboard.type('계속');assert.equal(await val(),'비가 온다. {우산? 폈다|맞았다} 끝. {처음|또|계속}');
// Unused empty last part is dropped on leaving the field where it changes nothing.
await p.keyboard.press('End');await p.keyboard.type(' {=돈');await p.locator('#eventTitle').click();
assert.equal(await val(),'비가 온다. {우산? 폈다|맞았다} 끝. {처음|또|계속} {=돈}');assert.equal(await p.evaluate(()=>current().text),await val());
// The same help in the choice text.
await p.locator('[data-part=choices]').click();await p.locator('[data-choice]').first().click();await p.locator('#cText').fill('');await p.locator('#cText').focus();await p.keyboard.type('{우산? 펴고 간다');await p.locator('#modal [data-form-tab]').first().click();
assert.equal(await p.locator('#cText').inputValue(),'{우산? 펴고 간다}');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS { → {|}, step over | and }, 다음 칸 (adds a part at the end) and 괄호 밖 keep the keyboard, tidy on leaving, choice text too.');
})().catch(e=>{console.error(e);process.exit(1)});
