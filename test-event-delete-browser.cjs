const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// 사건 찾기 list: ✕ deletes a scene there and the list comes back on the same search.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await browser.newPage({viewport:{width:360,height:740},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
await p.evaluate(()=>{for(const t of ['지울 사건 하나','지울 사건 둘']){const e=C.event();e.title=t;project.events.push(e);}const target=project.events.at(-1);project.events[0].choices[0].next=target.id;persist();});
const count=()=>p.evaluate(()=>project.events.length),start=await count();
await p.locator('#chooseEvent').click();await p.locator('#eventSearch').fill('지울 사건');assert.equal(await p.locator('[data-delete-event]').count(),2);
// Unlinked scene: confirm, gone, the list stays open on the same search.
p.once('dialog',d=>d.accept());await p.locator('[data-delete-event]').first().click();
assert.equal(await count(),start-1);assert.equal(await p.locator('#modal').getAttribute('open'),'');assert.equal(await p.locator('#eventSearch').inputValue(),'지울 사건');assert.equal(await p.locator('[data-delete-event]').count(),1);
// Cancelling keeps it.
p.once('dialog',d=>d.dismiss());
// Linked scene: asks where the link goes, then deletes and returns to the list.
await p.locator('[data-delete-event]').first().click();assert.match(await p.locator('#modal').innerText(),/연결된 결과가 1개/);
await p.locator('#replacement').selectOption('end');await p.locator('#confirmDelete').click();
assert.equal(await count(),start-2);assert.equal(await p.evaluate(()=>project.events[0].choices[0].next),'end');assert.equal(await p.locator('#eventSearch').inputValue(),'지울 사건');assert.match(await p.locator('#eventResults').innerText(),/일치하는 사건이 없습니다/);
// Rows still fit with the button.
await p.locator('#eventSearch').fill('');const fits=await p.evaluate(()=>{const m=document.getElementById('modalBody').getBoundingClientRect();return [...document.querySelectorAll('[data-delete-event]')].every(b=>b.getBoundingClientRect().right<=m.right+.5)&&document.getElementById('modalBody').scrollHeight<=document.getElementById('modalBody').clientHeight+1;});assert(fits,'rows fit without scrolling');
assert.deepEqual(errors,[]);await browser.close();console.log('PASS ✕ in 사건 찾기 deletes unlinked (confirm) and linked (relink) scenes and reopens the list on the same search; rows fit.');
})().catch(e=>{console.error(e);process.exit(1)});
