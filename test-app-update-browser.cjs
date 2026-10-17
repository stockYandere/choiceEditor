// Editor self-update status on the home screen (the Android side is AppUpdater.java): states, buttons and the toggle.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.calls=[];window.updateState={current:'0.1.32',currentCode:33,enabled:true,checking:false,installing:false,ready:false,readyName:'',canInstall:false,silent:false,lastCheck:0,error:''};
 window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true,updateStatus:()=>JSON.stringify(updateState),setAutoUpdate:v=>calls.push('auto:'+v),checkUpdate:()=>calls.push('check'),installUpdate:()=>calls.push('install'),openInstallSettings:()=>calls.push('settings')};});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>page==='home');
assert.equal(await p.locator('#appUpdate').isVisible(),true);assert.match(await p.locator('#appUpdateText').innerText(),/버전 0\.1\.32/);assert.equal(await p.locator('#appUpdateAuto').isChecked(),true);
await p.locator('#appUpdateCheck').click();await p.locator('#appUpdateAuto').uncheck();assert.deepEqual(await p.evaluate(()=>calls),['check','auto:false']);
// Ready but installing unknown apps is not allowed yet: the button opens the setting.
await p.evaluate(()=>onAppUpdate({...updateState,ready:true,readyName:'0.1.33'}));assert.match(await p.locator('#appUpdateText').innerText(),/0\.1\.33 준비됨.*알 수 없는 앱 설치/);assert.equal(await p.locator('#appUpdateAction').innerText(),'설치 허용하기');
await p.locator('#appUpdateAction').click();assert.equal(await p.evaluate(()=>calls.at(-1)),'settings');assert.match(await p.locator('#toast').innerText(),/0\.1\.33/);
// Allowed: first time asks once; after the first self-update it installs while the app is in the background.
await p.evaluate(()=>onAppUpdate({...updateState,ready:true,readyName:'0.1.33',canInstall:true}));assert.match(await p.locator('#appUpdateText').innerText(),/처음 한 번은 설치 확인/);await p.locator('#appUpdateAction').click();assert.equal(await p.evaluate(()=>calls.at(-1)),'install');
await p.evaluate(()=>onAppUpdate({...updateState,ready:true,readyName:'0.1.33',canInstall:true,silent:true}));assert.match(await p.locator('#appUpdateText').innerText(),/앱을 나가 있으면 자동으로 설치/);
await p.evaluate(()=>onAppUpdate({...updateState,checking:true}));assert.equal(await p.locator('#appUpdateCheck').isDisabled(),true);
await p.evaluate(()=>onAppUpdate({...updateState,lastCheck:1}));assert.match(await p.locator('#appUpdateText').innerText(),/최신 버전/);assert.equal(await p.locator('#appUpdateAction').isVisible(),false);
await p.evaluate(()=>onAppUpdate({...updateState,error:'업데이트 서버 응답 404'}));assert.match(await p.locator('#appUpdateText').innerText(),/404/);
assert.deepEqual(errors,[]);
// Without the Android bridge (desktop, exported game) the line stays hidden.
const q=await b.newPage();await q.addInitScript(()=>{window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true};});await q.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await q.waitForFunction(()=>page==='home');assert.equal(await q.locator('#appUpdate').isVisible(),false);
// The published feed matches the APK it names.
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,'release/update.json'),'utf8')),apk=fs.readFileSync(path.join(__dirname,'release',feed.apk));
assert.equal(apk.length,feed.size);assert.equal(require('node:crypto').createHash('sha256').update(apk).digest('hex'),feed.sha256);assert.match(fs.readFileSync(path.join(__dirname,'AndroidManifest.xml'),'utf8'),new RegExp('versionCode="'+feed.versionCode+'"'));
await b.close();console.log('PASS self-update status line, setting/install/check/toggle buttons, hidden without bridge, feed checksum and version.');
})().catch(e=>{console.error(e);process.exit(1)});
