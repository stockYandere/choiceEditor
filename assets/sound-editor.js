'use strict';
let audioPick=null;
function audioControl(prefix,label,{loop=false,kind=false}={}){
 return `<div class="audioControl"><b>${label}</b><input id="${prefix}Src" type="hidden"><input id="${prefix}Name" type="hidden"><input id="${prefix}Meta" type="hidden"><small id="${prefix}Label" class="audioFileName">선택한 소리 없음</small><small id="${prefix}Credit" class="audioCredit" hidden></small><div class="row audioButtons"><button id="${prefix}Library">기본 소리</button><button id="${prefix}Pick">내 파일</button><button id="${prefix}Preview" data-audio-preview aria-label="${label} 미리 듣기" aria-pressed="false">▶</button><button id="${prefix}Remove" class="quiet" hidden>제거</button></div><div id="${prefix}Options" hidden><label class="audioVolume">음량 <output id="${prefix}Level">60%</output><input id="${prefix}Volume" type="range" min="0" max="100" value="60"></label>${loop?`<label><input id="${prefix}Loop" type="checkbox" checked> 반복 재생</label>`:''}${kind?`<label>소리 종류<select id="${prefix}Kind"><option value="voice">음성 · 대사를 넘기면 멈춤</option><option value="effect">효과음 · 끝까지 재생</option></select></label>`:''}</div></div>`;
}
function fillAudioControl(prefix,slot,volume=60){$(prefix+'Src').value=slot?.src||'';$(prefix+'Name').value=slot?.name||'';$(prefix+'Meta').value=slot&&(slot.lib||slot.credit)?JSON.stringify({lib:slot.lib,credit:slot.credit}):'';$(prefix+'Volume').value=slot?.volume??volume;if($(prefix+'Loop'))$(prefix+'Loop').checked=slot?.loop!==false;if($(prefix+'Kind'))$(prefix+'Kind').value=slot?.kind==='effect'?'effect':'voice';}
function readAudioControl(prefix){const src=C.audio($(prefix+'Src')?.value);if(!src)return null;const slot={src,name:$(prefix+'Name').value,volume:Number($(prefix+'Volume').value)};if($(prefix+'Loop'))slot.loop=$(prefix+'Loop').checked;if($(prefix+'Kind')?.value==='effect')slot.kind='effect';const meta=$(prefix+'Meta')?.value?JSON.parse($(prefix+'Meta').value):null;if(meta?.lib)slot.lib=meta.lib;if(meta?.credit)slot.credit=meta.credit;return slot;}
function refreshAudioControl(prefix,fallback=''){
 if(!$(prefix+'Src'))return;const slot=readAudioControl(prefix);$(prefix+'Label').textContent=slot?slot.name:fallback?'기본 효과음':'선택한 소리 없음';const credit=slot?.credit&&slot.credit.license!=='CC0'?GameTitle.creditLine(slot.credit):'';$(prefix+'Credit').hidden=!credit;$(prefix+'Credit').textContent=credit?'크레딧 · '+credit+' — 게임 크레딧에 자동으로 들어갑니다':'';$(prefix+'Preview').disabled=!slot&&!fallback;$(prefix+'Remove').hidden=!slot;$(prefix+'Options').hidden=!slot;$(prefix+'Level').textContent=$(prefix+'Volume').value+'%';
}
// File names that sound like ambience or an effect start as 효과음; everything else as 음성.
function guessEffect(name){return /rain|thunder|storm|wind|door|step|static|noise|sfx|amb|effect|bell|knock|빗|비\s?소리|천둥|바람|문\s?소리|발소리|효과|잡음|종소리/i.test(name||'')&&!/voice|음성|대사|목소리/i.test(name||'');}
function bindAudioControl(prefix,save,{fallback='',maxMB=12,defaultVolume=60,guard=()=>!!$(prefix+'Src')}={}){
 const changed=()=>{refreshAudioControl(prefix,fallback);save(readAudioControl(prefix));};
 $(prefix+'Pick').onclick=()=>{GameAudio.stopPreview();audioPick={maxMB,apply:slot=>{if(!guard())return;$(prefix+'Meta').value='';fillAudioControl(prefix,{...slot,volume:defaultVolume,kind:$(prefix+'Kind')&&guessEffect(slot.name)?'effect':undefined});changed();}};$('audioFile').click();};
 $(prefix+'Library').onclick=()=>{GameAudio.stopPreview();openSoundLibrary({group:/Bgm$/.test(prefix)?'bgm':'effect',loopDefault:!!$(prefix+'Loop'),apply:slot=>{if(!guard())return;fillAudioControl(prefix,{...slot,volume:defaultVolume,kind:$(prefix+'Kind')?'effect':undefined});changed();}});};
 $(prefix+'Remove').onclick=()=>{GameAudio.stopPreview();$(prefix+'Src').value='';$(prefix+'Name').value='';$(prefix+'Meta').value='';changed();};
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
// ---- Built-in sounds (sound-library.js). Effects and ambience ship with the editor as sounds/<id>.ogg; music is downloaded once
// from the repository and kept in the game like an imported file, together with its credit.
const SOUND_LIBRARY_URL='https://raw.githubusercontent.com/stockYandere/choiceEditor/HEAD/sound-library/';
const SOUND_GROUPS=[['effect','효과음'],['ambient','환경음'],['bgm','배경음악']];
function soundLength(sec){return sec>=60?Math.floor(sec/60)+':'+String(Math.round(sec%60)).padStart(2,'0'):sec.toFixed(1)+'초';}
// The picker opens on the control's own kind and remembers the page of each kind.
const libraryPages={};let libraryGroup='effect',libraryPreview=null;
function stopLibraryPreview(){if(libraryPreview){libraryPreview.pause();libraryPreview.removeAttribute('src');libraryPreview.load();libraryPreview=null;}document.querySelectorAll('[data-lib-play]').forEach(b=>{b.textContent='▶';b.setAttribute('aria-pressed','false');});}
async function libraryData(item){
 const response=await fetch(SOUND_LIBRARY_URL+item.id+'.ogg',{cache:'force-cache'}).catch(()=>null);if(!response?.ok)throw Error('음악을 받지 못했습니다. 인터넷 연결을 확인하세요.');
 const blob=await response.blob(),raw=await new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>bad(Error('음악을 읽지 못했습니다.'));r.readAsDataURL(blob);});
 const src='data:audio/ogg;base64,'+String(raw).split(',')[1];if(!C.audio(src))throw Error('받은 음악 형식을 확인하지 못했습니다.');return src;}
function openSoundLibrary({group='effect',apply,loopDefault=false}){
 const all=window.SoundLibrary?.SOUNDS||[];if(!all.length)return tell('기본 소리를 불러오지 못했습니다.');
 libraryGroup=group;
 const draw=()=>{stopLibraryPreview();const g=libraryGroup,items=all.filter(x=>x.group===g),per=innerHeight<680?5:7,pages=Math.max(1,Math.ceil(items.length/per)),page=libraryPages[g]=Math.min(libraryPages[g]||0,pages-1);
  open('기본 소리',`<div class="fxAreaTabs" role="tablist" aria-label="소리 종류">${SOUND_GROUPS.map(([k,l])=>`<button role="tab" data-lib-group="${k}" aria-selected="${k===g}" class="${k===g?'active':''}">${l} <small>${all.filter(x=>x.group===k).length}</small></button>`).join('')}</div>
  <p class="hint libHint">${g==='bgm'?'고르면 인터넷으로 한 번 받아 게임에 담습니다. 작곡가 크레딧은 게임 크레딧에 자동으로 들어갑니다.':g==='ambient'?'끊김 없이 반복되는 배경 소리입니다. 무료(CC0)라 크레딧이 필요 없습니다.':'짧은 효과음입니다. 무료(CC0)라 크레딧이 필요 없습니다.'}</p>
  <div class="libList">${items.slice(page*per,page*per+per).map(x=>`<div class="libRow"><button class="quiet libPlay" data-lib-play="${x.id}" aria-label="${esc(x.name)} 미리 듣기" aria-pressed="false">▶</button><span><b>${esc(x.name)}</b><small>${soundLength(x.duration)}${x.loop?' · 반복':''}${g==='bgm'?' · '+(x.size/1048576).toFixed(1)+'MB':''}</small></span><button data-lib-pick="${x.id}">고르기</button></div>`).join('')}</div>
  ${pages>1?`<div class="libPager"><button data-lib-page="${page-1}" aria-label="이전 쪽"${page?'':' disabled'}>‹</button>${pages<=5?Array.from({length:pages},(_,i)=>`<button data-lib-page="${i}" class="${i===page?'active':''}"${i===page?' aria-current="page"':''}>${i+1}</button>`).join(''):`<span class="libCount">${page+1} / ${pages}</span>`}<button data-lib-page="${page+1}" aria-label="다음 쪽"${page<pages-1?'':' disabled'}>›</button></div>`:''}`);
  $('modal').addEventListener('close',stopLibraryPreview,{once:true});
  $('modalBody').querySelectorAll('[data-lib-group]').forEach(b=>b.onclick=()=>{libraryGroup=b.dataset.libGroup;draw();});
  $('modalBody').querySelectorAll('[data-lib-page]').forEach(b=>b.onclick=()=>{libraryPages[g]=Number(b.dataset.libPage);draw();});
  $('modalBody').querySelectorAll('[data-lib-play]').forEach(b=>b.onclick=()=>{const was=b.getAttribute('aria-pressed')==='true';stopLibraryPreview();if(was)return;const x=all.find(i=>i.id===b.dataset.libPlay);GameAudio.stopPreview();libraryPreview=new Audio(x.group==='bgm'?SOUND_LIBRARY_URL+x.id+'.ogg':'sounds/'+x.id+'.ogg');libraryPreview.volume=.8;libraryPreview.onended=stopLibraryPreview;libraryPreview.onerror=()=>{stopLibraryPreview();tell(x.group==='bgm'?'미리 듣기에는 인터넷 연결이 필요합니다.':'소리를 재생하지 못했습니다.');};b.textContent='■';b.setAttribute('aria-pressed','true');libraryPreview.play().catch(()=>{});});
  $('modalBody').querySelectorAll('[data-lib-pick]').forEach(b=>b.onclick=async()=>{const x=all.find(i=>i.id===b.dataset.libPick);stopLibraryPreview();
   const slot={name:x.name+' (기본 소리)',volume:60,lib:x.id};if(x.credit?.license&&x.credit.license!=='CC0')slot.credit={title:x.credit.title,author:x.credit.author,license:x.credit.license,url:x.credit.url};if(loopDefault)slot.loop=x.group!=='effect';
   if(x.group==='bgm'){$('modalBody').querySelectorAll('button').forEach(y=>y.disabled=true);b.textContent='받는 중…';try{slot.src=await libraryData(x);}catch(error){$('modalBody').querySelectorAll('button').forEach(y=>y.disabled=false);b.textContent='고르기';return formError(error.message);}}else slot.src='sounds/'+x.id+'.ogg';
   $('modal').close();apply(slot);tell('「'+x.name+'」'+josa(x.name,'을')+' 넣었습니다.');});};
 draw();}
let soundPanel='voice';
function renderAudioEditor(e){
 GameAudio.stopPreview();$('editor').innerHTML=`<div class="soundCard">${audioControl('sceneVoice','대사 음성 · 장면 효과음',{kind:true})}<p class="hint">사건 시작 때 한 번 재생 · 음성은 대사를 넘기면 멈춥니다.</p></div><div class="soundCard"><label>BGM<select id="sceneBgmMode"><option value="keep">이전 곡 유지</option><option value="play">새 곡 재생</option><option value="stop">끄기</option></select></label><div id="sceneBgmControl">${audioControl('sceneBgm','이 사건의 BGM',{loop:true})}</div></div><div class="soundCard" id="audioDefaultsDetails">${audioControl('defaultBgm','게임 기본 BGM',{loop:true})}<p class="hint">첫 사건부터 흐르는 곡입니다. 사건마다 BGM 탭에서 바꿀 수 있어요.</p></div><div class="soundCard" id="soundEffectsCard"><label>바꿀 기본 효과음<select id="effectKind">${Object.entries(GameAudio.cues).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><div id="effectControl"></div><div class="stageSoundSettings"><label><input id="stageSoundOn" type="checkbox"> 연출 효과음 — 날씨·순간 효과·전환·인물 등장에 어울리는 소리</label><label class="audioVolume">연출 효과음 크기 <output id="stageVolumeLevel">70%</output><input id="stageVolume" type="range" min="0" max="100" value="70"></label></div></div><p class="hint">소리와 설정은 자동 저장됩니다. 짧은 소리는 12MB, BGM은 24MB까지 넣을 수 있습니다.</p>`;
 // One group at a time: this scene's line sound, this scene's BGM, or the game-wide sounds.
 const body=$('editor'),cards=body.querySelectorAll(':scope>.soundCard'),groups=[['voice','대사',cards[0]],['bgm','BGM',cards[1]],['common','게임 BGM',$('audioDefaultsDetails')],['effects','효과음',$('soundEffectsCard')]];
 body.insertAdjacentHTML('afterbegin',`<div class="fxAreaTabs soundTabs" role="tablist" aria-label="소리 종류">${groups.map(([k,l])=>`<button role="tab" data-sound-panel="${k}" class="${k===soundPanel?'active':''}" aria-selected="${k===soundPanel}">${l}</button>`).join('')}</div>`);
 for(const [k,,x] of groups){x.dataset.panel=k;x.hidden=k!==soundPanel;}body.querySelector(':scope>p.hint').remove();
 body.querySelectorAll('[data-sound-panel]').forEach(b=>b.onclick=()=>{soundPanel=b.dataset.soundPanel;GameAudio.stopPreview();body.querySelectorAll('[data-sound-panel]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',x===b);});body.querySelectorAll('[data-panel]').forEach(x=>x.hidden=x.dataset.panel!==soundPanel);});
 const scene=()=>{e.audio||={};return e.audio;},shared=()=>{project.audio||={};return project.audio;},guard=()=>current()===e&&part==='sound'&&page==='story';
 fillAudioControl('sceneVoice',e.audio?.dialogue,100);bindAudioControl('sceneVoice',slot=>{if(slot)scene().dialogue=slot;else delete scene().dialogue;persist();},{guard,defaultVolume:100});
 const mode=$('sceneBgmMode');mode.value=e.audio?.bgmMode||'keep';const showBgm=()=>{$('sceneBgmControl').hidden=mode.value!=='play';};mode.onchange=()=>{scene().bgmMode=mode.value;GameAudio.stopPreview();showBgm();persist();};showBgm();
 fillAudioControl('sceneBgm',e.audio?.bgm,30);bindAudioControl('sceneBgm',slot=>{if(slot){scene().bgm={...slot,volume:slot.volume};scene().bgmMode='play';mode.value='play';}else{delete scene().bgm;scene().bgmMode='keep';mode.value='keep';}showBgm();persist();},{guard,maxMB:24,defaultVolume:30});
 fillAudioControl('defaultBgm',project.audio?.bgm,30);bindAudioControl('defaultBgm',slot=>{if(slot)shared().bgm=slot;else delete shared().bgm;persist();},{guard,maxMB:24,defaultVolume:30});
 $('stageSoundOn').checked=project.audio?.stageSound!==false;$('stageVolume').value=project.audio?.stageVolume??70;$('stageVolumeLevel').textContent=$('stageVolume').value+'%';
 $('stageSoundOn').onchange=()=>{if($('stageSoundOn').checked)delete shared().stageSound;else shared().stageSound=false;persist();};
 $('stageVolume').oninput=()=>{$('stageVolumeLevel').textContent=$('stageVolume').value+'%';shared().stageVolume=Number($('stageVolume').value);persist();};
 const drawEffect=()=>{GameAudio.stopPreview();const cue=$('effectKind').value;$('effectControl').innerHTML=audioControl('commonEffect',GameAudio.cues[cue]);fillAudioControl('commonEffect',project.audio?.effects?.[cue],60);bindAudioControl('commonEffect',slot=>{shared().effects||={};if(slot)shared().effects[cue]=slot;else delete shared().effects[cue];persist();},{fallback:cue,guard:()=>guard()&&$('effectKind').value===cue});};$('effectKind').onchange=drawEffect;drawEffect();
}
