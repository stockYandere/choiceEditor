const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
// The dialogue box never runs over the variation tools: with the keyboard up (window shrinks) or with the 조건 picker open.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const vp of [{width:369,height:752},{width:320,height:568}]){const p=await browser.newPage({viewport:vp,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
 await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();await p.waitForFunction(()=>page==='story');
 await p.locator('#copy').fill('새학기가 시작됐다. {방문>=2? 또 왔다|처음이다}');
 const gap=()=>p.evaluate(()=>{const t=document.getElementById('copy').getBoundingClientRect(),c=document.querySelector('.varTools').getBoundingClientRect();return Math.round(c.top-t.bottom);});
 // 조건 picker open: still no overlap.
 await p.evaluate(()=>{document.getElementById('varPick').hidden=false;});assert(await gap()>=0,vp.width+' picker overlap');await p.evaluate(()=>{document.getElementById('varPick').hidden=true;});
 // Keyboard up while writing: only the text and its tools stay, no overlap.
 await p.locator('#copy').focus();await p.setViewportSize({width:vp.width,height:Math.round(vp.height*.64)});await p.waitForFunction(()=>document.body.classList.contains('keyboardOpen'));
 assert.equal(await p.evaluate(()=>[...document.querySelectorAll('#varPreview,#goChoices,.sceneBar')].every(e=>!e.offsetParent)),true,'extras hidden while typing');
 assert(await gap()>=0,vp.width+' keyboard overlap');assert(await p.evaluate(()=>document.getElementById('copy').getBoundingClientRect().height)>=52);
 // Keyboard closed again: everything is back.
 await p.locator('#eventTitle').focus();await p.evaluate(()=>document.activeElement.blur());await p.setViewportSize(vp);await p.waitForFunction(()=>!document.body.classList.contains('keyboardOpen'));
 assert.equal(await p.locator('#goChoices').isVisible(),true);assert(await gap()>=0);
 assert.deepEqual(errors,[]);await p.close();}
await browser.close();console.log('PASS dialogue box and variation tools never overlap: 조건 picker open, keyboard up (extras hidden while typing), keyboard closed.');
})().catch(e=>{console.error(e);process.exit(1)});
