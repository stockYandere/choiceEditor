// No screen scrolls: every editor tab, sheet and form tab (and the play screen and bag) fits a 360×740 and a 320×568 phone
// with the large example game loaded. Long lists page instead of scrolling.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),path=require('path'),assert=require('node:assert/strict');const failures=[];
const measure=()=>{const out=[];const els=[document.scrollingElement,...document.querySelectorAll('#editor,.scroll,#modalBody,#gameCards,#definitions,#stateItems,.homeContent')];for(const el of els){if(!el||!el.getClientRects().length)continue;const over=el.scrollHeight-el.clientHeight;if(over>2)out.push((el.id||el.className||el.tagName)+':+'+over+'px/'+el.clientHeight);}return out.join(' ')||'no scroll';};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
for(const vp of [{width:360,height:740},{width:320,height:568}]){const p=await b.newPage({viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:1});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true};});
await p.goto('file://'+path.join(__dirname,'assets/index.html'));await p.waitForFunction(()=>!!project);
const shot=async name=>{await p.waitForTimeout(150);const m=await p.evaluate(measure);if(m!=='no scroll')failures.push(vp.width+' '+name+' '+m);const tabs=await p.locator('#modal[open] [data-form-tab]').count();for(let i=1;i<tabs;i++){await p.locator('#modal[open] [data-form-tab]').nth(i).click();await p.waitForTimeout(80);{const m=await p.evaluate(measure);if(m!=='no scroll')failures.push(vp.width+' '+name+'#'+i+' '+m);}}};
await shot('home');
await p.evaluate(async()=>{const g=JSON.parse(JSON.stringify(ADVANCED_SAMPLE));g.title='점검용 예제';await addGame(g);});
await p.evaluate(()=>showList('editor'));await shot('gamelist');await p.evaluate(()=>openGame(store.active));
await p.evaluate(()=>{const e=project.events.reduce((a,b)=>(b.choices.length>a.choices.length?b:a));selected=e.id;page='story';part='content';render();});
for(const part of ['content','choices','art','fx','sound']){await p.evaluate(x=>{part=x;render();},part);await shot('tab-'+part);}
await p.evaluate(()=>{part='choices';render();});const row=p.locator('#editor [data-choice]').first();if(await row.count()){await row.click();await shot('modal-choice');await p.evaluate(()=>closeForm());}
await p.evaluate(()=>switchPage('inventory'));await shot('inventory');
const def=p.locator('#definitions [data-edit-def]').first();if(await def.count()){await def.click();await shot('modal-def');await p.evaluate(()=>closeForm());}
await p.evaluate(()=>switchPage('story'));await p.locator('#files').click();await shot('modal-manage');
await p.evaluate(()=>{if($('modal').open)closeForm();showChecks();});await shot('modal-checks');for(const [id,name] of [['exportApk','modal-apk']]){await p.evaluate(()=>{if($('modal').open)closeForm();});const btn=p.locator('#'+id);if(await btn.count()&&await btn.isVisible()){await btn.click();await shot(name);}else{await p.locator('#files').click();const b2=p.locator('#modalBody #'+id);if(await b2.count()){await b2.click();await shot(name);}}}
await p.evaluate(()=>{if($('modal').open)closeForm();switchPage('story');part='sound';renderEditor();});for(const k of ['bgm','common']){await p.locator('[data-sound-panel='+k+']').click();if(k==='bgm')await p.locator('#sceneBgmMode').selectOption('play');await shot('sound-'+k);}
await p.evaluate(()=>{project.events.find(e=>e.id===selected).audio.bgmMode='keep';part='content';renderEditor();});
await p.locator('#chooseEvent').click();await shot('event-picker');await p.evaluate(()=>closeForm());
for(const id of ['themeMenu','finishSettings','artDefaultsMenu','creatorBackupButton']){await p.locator('#files').click();if(id==='creatorBackupButton')await p.locator('[data-form-tab="1"]').click();await p.locator('#'+id).click();await shot('menu-'+id);await p.evaluate(()=>{if($('modal').open)closeForm();});}
await p.evaluate(()=>{part='fx';renderEditor();});for(const t of ['camera','mood','weather','overlays','transition','beats','character']){if(!await p.locator('[data-fx-tool='+t+']').count())continue;await p.locator('[data-fx-tool='+t+']').click();await shot('fx-'+t);await p.evaluate(()=>closeForm());}
await p.locator('#fxMore').click();await shot('fx-more');await p.evaluate(()=>closeForm());
await p.evaluate(()=>{if($('modal').open)closeForm();switchPage('test');});await p.waitForTimeout(400);await shot('test');
await p.evaluate(()=>{$('bag')?.click();});await p.waitForTimeout(200);await shot('state-sheet');
assert.deepEqual(errs,[]);await p.close();}
await b.close();assert.deepEqual(failures,[],'screens that scroll');console.log('PASS no scrolling on any editor screen, form tab, sheet, play screen or bag at 360×740 and 320×568.');})().catch(e=>{console.error(e);process.exit(1);});
