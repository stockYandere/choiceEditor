const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
// 그림 모음: built-in backgrounds (place × time) go into a picture slot, built-in characters (bust or full figure) into 연출 인물,
// both as ordinary data URLs; the sheet fits without scrolling and Back closes it.
const root=path.join(__dirname,'assets'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.ogg':'audio/ogg','.png':'image/png'};
const server=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const url=`http://127.0.0.1:${server.address().port}/index.html`;
require(path.join(root,'art-library.js'));const lib=globalThis.ArtLibrary;
for(const p of lib.places)for(const t of lib.times)assert(fs.existsSync(path.join(root,'art',p.id+'-'+t.id+'.webp')),p.id+'-'+t.id);
for(const p of lib.people)for(const x of lib.expressions)assert(fs.existsSync(path.join(root,'art',p.id+'-'+x.id+'.webp')),p.id+'-'+x.id);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
for(const viewport of [{width:360,height:740},{width:320,height:568}]){
const p=await browser.newPage({viewport,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>!document.getElementById('openEditor').disabled);
await p.locator('#openEditor').click();await p.locator('[data-edit-game]').first().click();
await p.evaluate(()=>{switchPage('story');part='art';renderEditor();});
const fits=()=>p.evaluate(()=>{const d=document.getElementById('artSheet');return d.scrollHeight<=d.clientHeight+1;});
const loaded=()=>p.waitForFunction(()=>[...document.querySelectorAll('#artBody img')].every(i=>i.complete&&i.naturalWidth>0));
// Background: pick the time, then the place.
await p.locator('[data-art-library=top]').click();assert.equal(await p.locator('#artSheet').getAttribute('open'),'');
assert.equal(await p.locator('[data-art-pick]').count(),lib.places.length);await p.locator('[data-art-time=evening]').click();await loaded();assert(await fits(),'background sheet fits');
await p.locator('[data-art-pick=classroom-evening]').click();await p.waitForFunction(()=>!document.getElementById('artSheet').open);
const top=await p.evaluate(()=>{const i=current().top.image;return {ok:!!C.image(i),webp:i.startsWith('data:image/webp;base64,'),shown:!!document.querySelector('.previewUpper img')};});
assert.deepEqual(top,{ok:true,webp:true,shown:true});
// Characters: bust by default (head to waist), full figure on request.
await p.evaluate(()=>{part='fx';renderEditor();});await p.locator('[data-fx-tool=character]').click();await p.locator('[data-layer-library]').first().click();
assert.equal(await p.locator('[data-art-tab=person][aria-selected=true]').count(),1);assert.equal(await p.locator('[data-art-framing=bust][aria-pressed=true]').count(),1);
await p.locator('[data-art-person=girl]').click();await loaded();assert(await fits(),'character sheet fits');
const size=src=>p.evaluate(async s=>{const i=new Image();i.src=s;await i.decode();return [i.naturalWidth,i.naturalHeight];},src);
await p.locator('[data-art-pick=girl-smile]').click();await p.waitForFunction(()=>!document.getElementById('artSheet').open);
const findLayer=()=>p.evaluate(()=>JSON.stringify(current().stage).match(/"image":"(data:image\/webp[^"]+)"/)?.[1]);
let img=await findLayer();assert(img,'layer image set');assert.deepEqual(await size(img),[288,600]);
await p.locator('[data-layer-library]').first().click();await p.locator('[data-art-framing=full]').click();await p.locator('[data-art-person=boy]').click();await p.locator('[data-art-pick=boy-neutral]').click();await p.waitForFunction(()=>!document.getElementById('artSheet').open);
img=await findLayer();assert.deepEqual(await size(img),[288,1216]);assert(await p.evaluate(()=>!!document.querySelector('.fxThumb')),'thumbnail of the new character');
// Back closes the sheet and leaves the stage tool open.
await p.locator('[data-layer-library]').first().click();assert.equal(await p.evaluate(()=>appBack()),'HANDLED');assert.equal(await p.locator('#artSheet').getAttribute('open'),null);assert.equal(await p.locator('#modal').getAttribute('open'),'');
// 기본 그림 form can use it too.
await p.evaluate(()=>{closeForm();part='art';renderEditor();});await p.locator('#artDefaults').click();await p.locator('[data-default-library=top]').click();await p.locator('[data-art-time=night]').click();await p.locator('[data-art-pick=street-night]').click();
await p.waitForFunction(()=>!!C.artDefault(project,'top').image);
assert.deepEqual(errors,[]);await p.close();}
await browser.close();server.close();console.log('PASS 그림 모음: background by place/time into a slot, bust/full characters into 연출 인물, 기본 그림, sheet fits at 360/320 px, Back closes it.');
})().catch(e=>{console.error(e);process.exit(1)});
