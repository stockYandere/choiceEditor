const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// Phone number pads without a minus key: the ± button beside 체력/멘탈/돈 makes a change negative.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();await p.locator('[data-part=choices]').click();await p.locator('[data-choice]').first().click();await p.locator('#modal [data-form-tab]',{hasText:'변화'}).click();
const hp=p.locator('#cHp'),sign=p.locator('[data-sign=cHp]');
// Typed number, then ± flips it both ways and keeps the field focused (the keypad stays open).
await hp.fill('3');await hp.focus();await sign.tap();assert.equal(await hp.inputValue(),'-3');assert.equal(await p.evaluate(()=>document.activeElement.id),'cHp');await sign.tap();assert.equal(await hp.inputValue(),'3');
// ± first on an empty field: the next number typed comes out negative.
await hp.fill('');await sign.tap();assert.equal(await sign.innerText(),'−');await hp.pressSequentially('12');assert.equal(await hp.inputValue(),'-12');assert.equal(await sign.innerText(),'±');
// The same for 멘탈, then save and read the stored choice.
await p.locator('#cMental').fill('0');await p.locator('[data-sign=cMental]').tap();await p.locator('#cMental').pressSequentially('2');assert.equal(await p.locator('#cMental').inputValue(),'-2');
await p.locator('#saveChoice').click();const c=await p.evaluate(()=>current().choices[0]);assert.equal(c.hp,-12);assert.equal(c.mental,-2);
// The three fields with their buttons still fit the narrow modal.
await p.locator('[data-choice]').first().click();await p.locator('#modal [data-form-tab]',{hasText:'변화'}).click();const box=await p.evaluate(()=>{const m=document.getElementById('modalBody').getBoundingClientRect();return [...document.querySelectorAll("[data-sign]")].filter(b=>b.offsetParent).every(b=>{const r=b.getBoundingClientRect();return r.right<=m.right+0.5&&r.width>=36;});});assert(box,'± buttons fit');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS ± button flips 체력/멘탈/돈, makes the next typed number negative, keeps focus, saves, fits.');
})().catch(e=>{console.error(e);process.exit(1)});
