// APK export media: WebP import, export-time recompression and WAV→Opus, media files in a real signed APK,
// theme-based font selection, and the exported player reading pictures and sounds from media/ files.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
const TOOLS=process.env.ANDROID_TOOLS,EDITOR_APK=path.join(__dirname,'v0.1.63-Event-Game-Editor.apk'),work=path.join(__dirname,'export-qa/media-work'),player=path.join(work,'player');
function wav(sec,channels,rate){const n=Math.round(sec*rate),b=Buffer.alloc(44+n*channels*2);b.write('RIFF',0);b.writeUInt32LE(36+n*channels*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*channels*2,40);
 for(let i=0;i<n;i++)for(let c=0;c<channels;c++)b.writeInt16LE(Math.round(Math.sin(i/rate*2*Math.PI*(220+c*110))*12000),44+(i*channels+c)*2);return 'data:audio/wav;base64,'+b.toString('base64');}
(async()=>{fs.rmSync(work,{recursive:true,force:true});fs.mkdirSync(path.join(work,'media'),{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const p=await b.newPage({viewport:{width:360,height:640}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.raw='';window.exports=[];window.staged={};window.clears=0;window.Android={readData:()=>raw,readBackup:()=>'',archiveCorrupt:()=>true,saveData:s=>{raw=s;return true;},
 clearExportMedia:()=>{clears++;staged={};return true;},stageExportMedia:(name,base64)=>{staged[name]=base64;return true;},exportGameApk:(data,id,title)=>{exports.push({data,id,title});return true;}};});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>!!project);
// A photo imported now is stored as WebP, at most 1080×1400.
await p.evaluate(async()=>{const g=C.fresh();g.randomStart=0;g.title='미디어 게임';const a=C.event(),z=C.event();a.id='start';a.text='첫 장면';a.choices[0].next=z.id;z.text='둘째 장면';z.choices[0].next='end';g.events=[a,z];await addGame(g);});
const night=await p.evaluate(async src=>MediaPack.importImage(src),'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'example-media/night.jpg')).toString('base64'));
assert.match(night,/^data:image\/webp;base64,/);assert.ok(night.length*0.75<400*1024,'imported photo stays small');
// An older game still holds a PNG picture and an uncompressed WAV BGM.
const legacy=await p.evaluate(async src=>{const img=new Image();await new Promise(r=>{img.onload=r;img.src=src;});const c=document.createElement('canvas');c.width=900;c.height=1350;c.getContext('2d').drawImage(img,0,0,900,1350);return c.toDataURL('image/png');},'data:image/jpeg;base64,'+fs.readFileSync(path.join(__dirname,'example-media/dawn.jpg')).toString('base64'));
const music=wav(4,2,44100);
await p.evaluate(({night,legacy,music})=>{project.events[0].top.image=night;project.events[1].top.image=legacy;project.events[0].audio={bgmMode:'play',bgm:{src:music,name:'theme.wav',volume:80}};persist();},{night,legacy,music});
await p.locator('#files').click();await p.locator('#exportApk').click();
const summary=await p.locator('#apkMediaSummary summary').innerText();assert.match(summary,/그림 2장/);assert.match(summary,/소리 1개/);
assert.match(await p.locator('#apkMediaSummary').textContent(),/WAV·FLAC 소리 1개는 Opus/);
await p.locator('#makeGameApk').click();await p.waitForFunction(()=>exports.length===1,null,{timeout:60000});
const message=await p.locator('#apkExportMessage').innerText();assert.match(message,/그림 2장 .*MB → .*MB/);assert.match(message,/소리 1개 .*MB → .*MB/);
const {captured,staged}=await p.evaluate(()=>({captured:exports[0],staged}));const file=JSON.parse(captured.data);
assert.equal(file.images.length,2);for(const v of file.images)assert.match(v,/^media\/[a-f0-9]{32}\.webp$/);
assert.equal(file.sounds.length,1);assert.match(file.sounds[0],/^media\/[a-f0-9]{32}\.ogg$/);
assert.deepEqual(file.exportFonts,['PretendardVariable.woff2','GowunBatang-Regular.woff2']);
assert.deepEqual(Object.keys(staged).sort(),[...file.images,...file.sounds].map(v=>v.slice(6)).sort());
assert.ok(captured.data.length<800000,'game.json keeps only names, not media');
// The app icon is a full-bleed 432px adaptive-icon layer.
const iconPng=Buffer.from(JSON.parse(file.body).exportIcon.slice(22),'base64');assert.equal(iconPng.readUInt32BE(16),432);assert.equal(iconPng.readUInt32BE(20),432);
const bytes=Object.fromEntries(Object.entries(staged).map(([k,v])=>[k,Buffer.from(v,'base64')]));
const pngSize=Math.floor((legacy.length-legacy.indexOf(',')-1)*0.75),webpSizes=file.images.map(v=>bytes[v.slice(6)].length);
assert.ok(Math.max(...webpSizes)<pngSize/5,'old PNG is recompressed to WebP');assert.ok(bytes[file.sounds[0].slice(6)].length<(music.length*0.75)/5,'WAV becomes Opus');
assert.equal(bytes[file.sounds[0].slice(6)].subarray(0,4).toString(),'OggS');
// Same pictures keep the same file names on the next export, so saved runs survive updates.
await p.evaluate(()=>{onApkExportResult(false,'APK 저장을 취소했습니다.');});await p.locator('#makeGameApk').click();await p.waitForFunction(()=>exports.length===2,null,{timeout:60000});
assert.deepEqual(JSON.parse(await p.evaluate(()=>exports[1].data)).images,file.images);
assert.ok(await p.evaluate(()=>clears)>=2);
// Creator backups accept a 4-character password, not 3.
assert.equal(await p.evaluate(async()=>{const raw=await CreatorBackup.encrypt({ok:1},'1234');return JSON.stringify(await CreatorBackup.decrypt(raw,'1234'));}),JSON.stringify({ok:1}));await assert.rejects(p.evaluate(()=>CreatorBackup.encrypt({ok:1},'123')));
assert.equal(await p.evaluate(()=>{onApkExportResult(false,'APK 저장을 취소했습니다.');Android.backupSigning=()=>'';creatorBackupForm(true);const n=document.getElementById('creatorPassword').minLength;delete Android.backupSigning;return n;}),4);await p.evaluate(()=>$('modal').close());assert.deepEqual(errors,[]);await p.close();
// A pixel theme also carries the pixel font.
assert.ok((await b.newPage().then(async q=>{await q.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await q.waitForFunction(()=>!!window.MediaPack);const f=await q.evaluate(()=>MediaPack.fonts('retro'));await q.close();return f;})).includes('Galmuri14.woff2'));

// Package with the real engine, then check signature, alignment and contents.
for(const [k,v]of Object.entries(bytes))fs.writeFileSync(path.join(work,'media',k),v);fs.writeFileSync(path.join(work,'game.json'),captured.data);fs.writeFileSync(path.join(work,'icon.png'),iconPng);
const classes=path.join(work,'classes'),cp=[path.join(__dirname,'classes'),path.join(__dirname,'vendor/apksig.jar')].join(path.delimiter),apk=path.join(work,'game.apk');
execFileSync('javac',['-nowarn','-cp',cp,'-d',classes,path.join(__dirname,'export-qa/NativeExportHost.java')],{stdio:'inherit'});
execFileSync('java',['-Deditor='+EDITOR_APK,'-cp',[classes,cp].join(path.delimiter),'com.example.splitstory.NativeExportHost',path.join(work,'game.json'),apk,captured.id,'미디어 게임','1',path.join(work,'icon.png'),path.join(work,'media'),file.exportFonts.join(','),'rain,thunder'],{cwd:__dirname,stdio:['ignore','ignore','inherit']});
if(TOOLS){execFileSync(path.join(TOOLS,'apksigner'),['verify',apk],{stdio:['ignore','ignore','inherit']});execFileSync(path.join(TOOLS,'zipalign'),['-c','-p','4',apk]);}
const listing=execFileSync('unzip',['-Zv',apk]).toString(),entries=execFileSync('unzip',['-Z1',apk]).toString().trim().split('\n');
for(const name of Object.keys(bytes)){assert.ok(entries.includes('assets/media/'+name),name);const block=listing.split('Central directory entry').find(x=>x.includes('assets/media/'+name+'\n'));assert.match(block,/compression method:\s+none \(stored\)/);}
assert.ok(entries.includes('assets/fonts/PretendardVariable.woff2'));assert.ok(Array.isArray(file.exportSounds),'the editor names the built-in sounds the game needs');assert.ok(entries.includes('assets/sounds/rain.ogg')&&entries.includes('assets/sounds/thunder.ogg'));assert.ok(!entries.includes('assets/sounds/fire.ogg'),'unused built-in sounds stay out');assert.ok(!entries.includes('assets/sound-library.js'));assert.ok(!entries.includes('assets/fonts/Galmuri14.woff2'),'unused pixel font left out');assert.ok(!entries.includes('assets/media-pack.js'));
assert.ok(execFileSync('unzip',['-p',apk,'res/drawable-nodpi-v4/icon_art.png']).equals(iconPng),'game picture replaces the adaptive icon layer');assert.ok(entries.includes('res/drawable/icon.xml'));
if(TOOLS)assert.match(execFileSync(path.join(TOOLS,'aapt'),['dump','xmltree',apk,'res/drawable/icon.xml']).toString(),/E: adaptive-icon/);
const apkSize=fs.statSync(apk).size;assert.ok(apkSize<6*1024*1024,'whole game APK '+apkSize);
fs.mkdirSync(player,{recursive:true});execFileSync('unzip',['-q','-o',apk,'assets/*','-d',work]);fs.renameSync(path.join(work,'assets'),player+'.tmp');fs.rmSync(player,{recursive:true,force:true});fs.renameSync(player+'.tmp',player);

// The exported player shows the media/ picture and plays and seeks the Opus BGM.
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.wav':'audio/wav','.webp':'image/webp','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.join(player,name==='/'?'index.html':name);if(!f.startsWith(player)||!fs.existsSync(f)){res.writeHead(404);res.end();return;}const body=fs.readFileSync(f),range=/bytes=(\d*)-(\d*)/.exec(req.headers.range||'');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');
 if(range){const start=range[1]?+range[1]:body.length-+range[2],end=range[1]&&range[2]?+range[2]:body.length-1;res.writeHead(206,{'Content-Range':'bytes '+start+'-'+end+'/'+body.length});res.end(body.subarray(start,end+1));return;}res.end(body);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const ctx=await b.newContext({viewport:{width:360,height:640},hasTouch:true,isMobile:true}),game=await ctx.newPage(),errs=[];game.on('pageerror',e=>errs.push(e.message));
await game.goto('http://127.0.0.1:'+server.address().port);await game.waitForFunction(()=>page==='gameTitle');await game.locator('#titleStart').tap();await game.waitForFunction(()=>playing);
await game.waitForFunction(()=>[...document.querySelectorAll('#stage img')].some(i=>/^media\/[a-f0-9]{32}\.webp$/.test(i.getAttribute('src'))&&i.complete&&i.naturalWidth>0),null,{timeout:10000});
const audio=await game.evaluate(async src=>{const a=new Audio(src);await new Promise((ok,bad)=>{a.onloadedmetadata=ok;a.onerror=()=>bad(Error('audio'));});a.currentTime=2.5;await new Promise(r=>{a.onseeked=r;});return {duration:a.duration,at:a.currentTime};},file.sounds[0]);
assert.ok(Math.abs(audio.duration-4)<0.05,'duration '+audio.duration);assert.ok(Math.abs(audio.at-2.5)<0.05);
await game.evaluate(()=>{finishDialogue(true);skipEffects();});await game.waitForFunction(()=>performance.now()>=choiceReadyAt);await game.locator('#answers button').first().tap();await game.evaluate(()=>appBack());await game.waitForFunction(()=>page==='gameTitle');
await game.reload();await game.waitForFunction(()=>page==='gameTitle');await game.locator('#titleStart').tap();assert.equal(await game.evaluate(()=>run.turn),1,'saved run with media paths resumes');
assert.deepEqual(errs,[]);await ctx.close();await b.close();await new Promise(r=>server.close(r));
console.log('PASS full-bleed 432px adaptive icon, 4-character backup password, WebP import, PNG→WebP and WAV→Opus on export, stable media names, staged media in a signed aligned APK ('+(apkSize/1048576).toFixed(1)+'MB), theme fonts only, player reads media/ files and resumes.');
})().catch(e=>{console.error(e);process.exit(1)});
