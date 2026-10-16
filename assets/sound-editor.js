'use strict';
let audioPick=null;
function audioControl(prefix,label,{loop=false,kind=false}={}){
 return `<div class="audioControl"><b>${label}</b><input id="${prefix}Src" type="hidden"><input id="${prefix}Name" type="hidden"><small id="${prefix}Label" class="audioFileName">선택한 소리 없음</small><div class="row audioButtons"><button id="${prefix}Pick">소리 선택</button><button id="${prefix}Preview" data-audio-preview aria-label="${label} 미리 듣기" aria-pressed="false">▶</button><button id="${prefix}Remove" class="quiet" hidden>제거</button></div><div id="${prefix}Options" hidden><label class="audioVolume">음량 <output id="${prefix}Level">60%</output><input id="${prefix}Volume" type="range" min="0" max="100" value="60"></label>${loop?`<label><input id="${prefix}Loop" type="checkbox" checked> 반복 재생</label>`:''}${kind?`<label>소리 종류<select id="${prefix}Kind"><option value="voice">음성 · 대사를 넘기면 멈춤</option><option value="effect">효과음 · 끝까지 재생</option></select></label>`:''}</div></div>`;
}
function fillAudioControl(prefix,slot,volume=60){$(prefix+'Src').value=slot?.src||'';$(prefix+'Name').value=slot?.name||'';$(prefix+'Volume').value=slot?.volume??volume;if($(prefix+'Loop'))$(prefix+'Loop').checked=slot?.loop!==false;if($(prefix+'Kind'))$(prefix+'Kind').value=slot?.kind==='effect'?'effect':'voice';}
function readAudioControl(prefix){const src=C.audio($(prefix+'Src')?.value);if(!src)return null;const slot={src,name:$(prefix+'Name').value,volume:Number($(prefix+'Volume').value)};if($(prefix+'Loop'))slot.loop=$(prefix+'Loop').checked;if($(prefix+'Kind')?.value==='effect')slot.kind='effect';return slot;}
function refreshAudioControl(prefix,fallback=''){
 if(!$(prefix+'Src'))return;const slot=readAudioControl(prefix);$(prefix+'Label').textContent=slot?slot.name:fallback?'기본 효과음':'선택한 소리 없음';$(prefix+'Preview').disabled=!slot&&!fallback;$(prefix+'Remove').hidden=!slot;$(prefix+'Options').hidden=!slot;$(prefix+'Level').textContent=$(prefix+'Volume').value+'%';
}
// File names that sound like ambience or an effect start as 효과음; everything else as 음성.
function guessEffect(name){return /rain|thunder|storm|wind|door|step|static|noise|sfx|amb|effect|bell|knock|빗|비\s?소리|천둥|바람|문\s?소리|발소리|효과|잡음|종소리/i.test(name||'')&&!/voice|음성|대사|목소리/i.test(name||'');}
function bindAudioControl(prefix,save,{fallback='',maxMB=12,defaultVolume=60,guard=()=>!!$(prefix+'Src')}={}){
 const changed=()=>{refreshAudioControl(prefix,fallback);save(readAudioControl(prefix));};
 $(prefix+'Pick').onclick=()=>{GameAudio.stopPreview();audioPick={maxMB,apply:slot=>{if(!guard())return;fillAudioControl(prefix,{...slot,volume:defaultVolume,kind:$(prefix+'Kind')&&guessEffect(slot.name)?'effect':undefined});changed();}};$('audioFile').click();};
 $(prefix+'Remove').onclick=()=>{GameAudio.stopPreview();$(prefix+'Src').value='';$(prefix+'Name').value='';changed();};
 $(prefix+'Preview').onclick=()=>GameAudio.previewSound(readAudioControl(prefix),fallback,$(prefix+'Preview'));
 $(prefix+'Volume').oninput=changed;if($(prefix+'Loop'))$(prefix+'Loop').onchange=changed;if($(prefix+'Kind'))$(prefix+'Kind').onchange=changed;refreshAudioControl(prefix,fallback);
}
async function importAudio(file,pick){
 if(!file||!pick)return;if(file.size>pick.maxMB*1024*1024)throw Error(pick.maxMB+'MB 이하의 소리를 선택하세요.');
 const mime={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg',aac:'audio/aac',flac:'audio/flac',webm:'audio/webm'}[file.name.split('.').pop().toLowerCase()];if(!mime)throw Error('MP3 · WAV · M4A · OGG · AAC · FLAC · WEBM 파일을 선택하세요.');
 const raw=await new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>bad(Error('소리를 읽지 못했습니다.'));r.readAsDataURL(file);}),src='data:'+mime+';base64,'+String(raw).split(',')[1];if(!C.audio(src))throw Error('소리 파일 형식을 확인하세요.');
 await new Promise((ok,bad)=>{const a=new Audio(),timer=setTimeout(()=>done(Error('소리 파일을 확인하지 못했습니다.')),15000);let ended=false;function done(error){if(ended)return;ended=true;clearTimeout(timer);a.onloadedmetadata=a.onerror=null;a.removeAttribute('src');a.load();error?bad(error):ok();}a.onloadedmetadata=()=>done();a.onerror=()=>done(Error('이 기기에서 재생할 수 없는 소리입니다.'));a.src=src;a.load();});
 // Include the current unsaved editor; the vault shares identical sound bytes.
 const candidate={...store,games:store.games.map(g=>g.id===store.active?{...g,draft:project}:g)};
 if(GameVault.encode(candidate).length+src.length>100000000)throw Error('앱 저장 공간이 부족합니다. 사용하지 않는 소리를 제거하세요.');
 pick.apply({src,name:file.name.slice(0,200),volume:60});
}
document.getElementById('audioFile').onchange=async e=>{const pick=audioPick;audioPick=null;const file=e.target.files[0];e.target.value='';try{await importAudio(file,pick);}catch(error){tell(error.message);}};
function renderAudioEditor(e){
 GameAudio.stopPreview();$('editor').innerHTML=`<div class="soundCard">${audioControl('sceneVoice','대사 음성 · 장면 효과음',{kind:true})}<p class="hint">장면 시작 때 한 번 재생합니다. 음성은 플레이어가 대사를 넘기면 멈추고, 효과음은 끝까지 재생합니다.</p></div><div class="soundCard"><label>BGM<select id="sceneBgmMode"><option value="keep">이전 곡 유지</option><option value="play">새 곡 재생</option><option value="stop">끄기</option></select></label><div id="sceneBgmControl">${audioControl('sceneBgm','이 사건의 BGM',{loop:true})}</div></div><details id="audioDefaultsDetails"><summary>게임 공통 소리</summary>${audioControl('defaultBgm','게임 기본 BGM',{loop:true})}<label>바꿀 기본 효과음<select id="effectKind">${Object.entries(GameAudio.cues).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><div id="effectControl"></div></details><p class="hint">소리와 설정은 자동 저장됩니다. 짧은 소리는 12MB, BGM은 24MB까지 넣을 수 있습니다.</p>`;
 const scene=()=>{e.audio||={};return e.audio;},shared=()=>{project.audio||={};return project.audio;},guard=()=>current()===e&&part==='sound'&&page==='story';
 fillAudioControl('sceneVoice',e.audio?.dialogue,100);bindAudioControl('sceneVoice',slot=>{if(slot)scene().dialogue=slot;else delete scene().dialogue;persist();},{guard,defaultVolume:100});
 const mode=$('sceneBgmMode');mode.value=e.audio?.bgmMode||'keep';const showBgm=()=>{$('sceneBgmControl').hidden=mode.value!=='play';};mode.onchange=()=>{scene().bgmMode=mode.value;GameAudio.stopPreview();showBgm();persist();};showBgm();
 fillAudioControl('sceneBgm',e.audio?.bgm,30);bindAudioControl('sceneBgm',slot=>{if(slot){scene().bgm={...slot,volume:slot.volume};scene().bgmMode='play';mode.value='play';}else{delete scene().bgm;scene().bgmMode='keep';mode.value='keep';}showBgm();persist();},{guard,maxMB:24,defaultVolume:30});
 fillAudioControl('defaultBgm',project.audio?.bgm,30);bindAudioControl('defaultBgm',slot=>{if(slot)shared().bgm=slot;else delete shared().bgm;persist();},{guard,maxMB:24,defaultVolume:30});
 const drawEffect=()=>{GameAudio.stopPreview();const cue=$('effectKind').value;$('effectControl').innerHTML=audioControl('commonEffect',GameAudio.cues[cue]);fillAudioControl('commonEffect',project.audio?.effects?.[cue],60);bindAudioControl('commonEffect',slot=>{shared().effects||={};if(slot)shared().effects[cue]=slot;else delete shared().effects[cue];persist();},{fallback:cue,guard:()=>guard()&&$('effectKind').value===cue});};$('effectKind').onchange=drawEffect;drawEffect();
}
