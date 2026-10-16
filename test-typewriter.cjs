const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const url=require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href;
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:412,height:850},{width:360,height:640},{width:320,height:568}]){
 const p=await browser.newPage({viewport,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openPlayer').disabled);
 if(process.env.QA_FONT)await p.addStyleTag({content:'@font-face{font-family:QA;src:url(data:font/ttf;base64,'+fs.readFileSync(process.env.QA_FONT).toString('base64')+')} :root{font-family:QA,sans-serif}'});
 await p.evaluate(()=>{store.games[0].published.randomStart=0;store.games[0].published.events[0].text='비를 피하던 고양이가 다가왔어.\n잠깐 같이 있어 줄까?';Math.random=()=>0;return playGame(store.games[0].id)});
 assert.equal(await p.evaluate(()=>dialogueTyping),true);
 const original=await p.evaluate(()=>dialogueFull),turn=await p.evaluate(()=>run.turn);
 const before=await p.evaluate(()=>({box:document.getElementById('box').getBoundingClientRect().toJSON(),height:document.getElementById('box').scrollHeight,scroll:document.getElementById('box').scrollTop,answer:document.getElementById('answers').getBoundingClientRect().toJSON()}));
 await p.waitForTimeout(180);
 const partial=await p.locator('.dialogueTyping').textContent();assert(partial.length>0&&partial.length<original.length);assert(original.startsWith(partial));
 assert.equal(await p.locator('#answers button').first().isVisible(),false);
 if(viewport.width===412)await p.screenshot({path:path.join(__dirname,'preview-typing.png')});
 // A tap where the first choice will appear skips only; rapid taps cannot choose.
 const r=await p.locator('#answers').boundingBox();await p.touchscreen.tap(r.x+20,r.y+15);
 assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.locator('#dialogue').textContent(),original);
 await p.evaluate(()=>document.querySelector('#answers button').click());assert.equal(await p.evaluate(()=>run.turn),turn);
 const after=await p.evaluate(()=>({box:document.getElementById('box').getBoundingClientRect().toJSON(),height:document.getElementById('box').scrollHeight,scroll:document.getElementById('box').scrollTop,answer:document.getElementById('answers').getBoundingClientRect().toJSON()}));assert.deepEqual(after,before);
 await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').nth(1).tap();
 assert.equal(await p.evaluate(()=>run.current),'alley');assert.equal(await p.evaluate(()=>dialogueTyping),true);assert.match(await p.locator('#statusText').textContent(),/붕대 \+1/);
 // Same-page updates and the inventory never restart an in-flight reveal.
 const started=await p.evaluate(()=>dialogueKey);await p.evaluate(()=>{renderTest();showStatusNotice('알림 확인','info',60);});assert.equal(await p.evaluate(()=>dialogueKey),started);
 await p.locator('#statusMessage').waitFor({state:'hidden'});await p.locator('#bag').tap();await p.evaluate(()=>appBack());assert.equal(await p.evaluate(()=>playing),true);
 await p.waitForFunction(()=>!dialogueTyping);const readable=await p.locator('#dialogue').textContent();await p.evaluate(()=>renderTest());assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.locator('#dialogue').textContent(),readable);
 // Long pages reserve complete scroll height even before the first glyph.
 await p.evaluate(()=>{run.p.events.find(e=>e.id===run.current).text='긴 글을 내부에서 스크롤합니다.\n'.repeat(70);renderTest();});
 const longBefore=await p.locator('#box').evaluate(x=>({height:x.clientHeight,content:x.scrollHeight,scroll:x.scrollTop}));assert(longBefore.content>longBefore.height);
 await p.locator('#box').evaluate(x=>x.scrollTop+=100);const scrolled=await p.locator('#box').evaluate(x=>x.scrollTop);await p.waitForTimeout(70);assert.equal(await p.locator('#box').evaluate(x=>x.scrollTop),scrolled);
 await p.locator('#box').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.locator('#box').evaluate(x=>x.scrollHeight),longBefore.content);assert.equal(await p.locator('#box').evaluate(x=>x.scrollTop),scrolled);
 // Reveal complete composed characters, not UTF-16 halves or emoji fragments.
 await p.evaluate(()=>{run.p.events.find(e=>e.id===run.current).text='👩🏽‍🚀가\u0301🇰🇷안녕하세요🙂👨‍👩‍👧‍👦반가워요';renderTest();});
 const prefixes=await p.evaluate(()=>{let s='';return Array.from(new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(dialogueFull),x=>s+=x.segment);});
 for(let i=0;i<3;i++){await p.waitForTimeout(55);const s=await p.locator('.dialogueTyping').textContent();assert(s===''||prefixes.includes(s));}
 await p.waitForFunction(()=>!dialogueTyping);assert.equal(await p.locator('#dialogue').textContent(),prefixes.at(-1));
 await p.evaluate(()=>{run.p.events.find(e=>e.id===run.current).text='';renderTest();});assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.locator('#answers button').first().isVisible(),true);
 // Back saves/exits during animation rather than requiring an extra skip tap.
 await p.evaluate(()=>{run.p.events.find(e=>e.id===run.current).text='뒤로가기 저장 검사 '.repeat(30);renderTest();});assert.equal(await p.evaluate(()=>dialogueTyping),true);
 await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');assert.equal(await p.evaluate(()=>dialogueFrame),0);assert.equal(await p.evaluate(()=>store.games[0].progress.state.current),'alley');
 await p.locator('[data-play-game]').first().tap();await p.waitForFunction(()=>playing);assert.equal(await p.evaluate(()=>run.current),'alley');assert.equal(await p.evaluate(()=>run.bag.bandage),1);
 await p.evaluate(()=>appBack());await p.waitForFunction(()=>page==='gameList');await p.evaluate(()=>{playing=false;startTest();});assert.equal(await p.evaluate(()=>dialogueTyping),true);
 await p.locator('#who').tap();await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').nth(1).tap();await p.locator('#statusMessage').waitFor({state:'hidden'});await p.locator('#bag').tap();await p.locator('#undoTest').tap();assert.equal(await p.evaluate(()=>run.current),'start');assert.equal(await p.evaluate(()=>dialogueTyping),true);await p.locator('#closeState').tap();
 await p.evaluate(()=>switchPage('story'));assert.equal(await p.evaluate(()=>dialogueFrame),0);await p.evaluate(()=>switchPage('test'));assert.equal(await p.evaluate(()=>dialogueTyping),false);
 await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>startTest());assert.equal(await p.evaluate(()=>dialogueTyping),false);assert.equal(await p.locator('#answers button').first().isVisible(),true);
 assert.deepEqual(errors,[]);await p.close();console.log('PASS',viewport,'typing, graphemes, skip/rapid tap protection, stable scroll geometry, natural completion, inventory, undo, preview tabs, back-save/resume and reduced motion.');
}
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
