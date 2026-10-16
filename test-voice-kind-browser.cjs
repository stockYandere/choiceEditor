// Scene sounds: a tap or skip stops a voice line but lets a sound effect play on; the editor stores the kind.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path');
function wav(sec){const rate=8000,n=sec*rate,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/8)*8000),44+i*2);return 'data:audio/wav;base64,'+b.toString('base64');}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:360,height:740},isMobile:true,hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.Android={readData:()=>'',readBackup:()=>'',archiveCorrupt:()=>true,saveData:()=>true};});
await p.goto(require('node:url').pathToFileURL(path.join(__dirname,'assets/index.html')).href);await p.waitForFunction(()=>!!project);
const src=wav(6);
await p.evaluate(async src=>{const g=C.fresh();g.randomStart=0;const a=C.event(),z=C.event();a.text='첫 대사';a.choices[0].next=z.id;z.text='둘째';z.choices[0].next='end';a.audio={bgmMode:'keep',dialogue:{src,name:'rain.mp3',volume:60}};g.events=[a,z];await addGame(g);selected=a.id;part='sound';page='story';render();},src);
// Editor: the kind select exists, defaults to voice for an existing slot, and saves effect.
assert.equal(await p.locator('#sceneVoiceKind').inputValue(),'voice');await p.locator('#sceneVoiceKind').selectOption('effect');assert.equal(await p.evaluate(()=>project.events[0].audio.dialogue.kind),'effect');
assert.equal(await p.evaluate(()=>guessEffect('rain-loop.mp3')&&guessEffect('빗소리.wav')&&!guessEffect('voice-rain.mp3')&&!guessEffect('유나 대사.mp3')),true);
const play=async kind=>{await p.evaluate(kind=>{project.events[0].audio.dialogue.kind=kind;if(!kind)delete project.events[0].audio.dialogue.kind;persist();startTest(project.events[0].id);},kind);
 await p.waitForFunction(()=>!!GameAudio.getState().voice,null,{timeout:5000});await p.evaluate(()=>finishDialogue(true));const afterSkip=await p.evaluate(()=>!!GameAudio.getState().voice);
 await p.evaluate(()=>{if(GameAudio.getState().voice)$('dialogue').click();});return {afterSkip,afterTap:await p.evaluate(()=>!!GameAudio.getState().voice)};};
assert.deepEqual(await play('effect'),{afterSkip:true,afterTap:true},'an effect keeps playing through skip and taps');
assert.deepEqual(await play(undefined),{afterSkip:false,afterTap:false},'a voice stops when the line is skipped');
// Moving to the next scene still stops an effect.
await play('effect');await p.waitForFunction(()=>performance.now()>=choiceReadyAt);await p.locator('#answers button').first().click();assert.equal(await p.evaluate(()=>!!GameAudio.getState().voice&&GameAudio.getState().voice.src.startsWith('data:audio/wav')&&run.current===project.events[0].id),false);
assert.throws(()=>require('./assets/core.js').validate({...require('./assets/core.js').fresh(),events:[{...require('./assets/core.js').event(),audio:{dialogue:{src,name:'x',kind:'loud'}}}]}));
assert.deepEqual(errors,[]);await b.close();console.log('PASS scene sound kind: effect plays through skip/tap, voice stops, editor select and file-name guess, invalid kind rejected.');
})().catch(e=>{console.error(e);process.exit(1)});
