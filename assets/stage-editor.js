'use strict';
// Editor tab "연출": scene staging made of code effects over the scene's own pictures.
const STAGE_LABELS={
 camera:{none:'고정',zoomIn:'천천히 다가가기',zoomOut:'천천히 물러나기',panLeft:'왼쪽으로 훑기',panRight:'오른쪽으로 훑기',panUp:'위로 훑기',panDown:'아래로 훑기',drift:'떠다니기',sway:'좌우로 기울기',breathe:'숨쉬기',tilt:'기울어진 화면'},
 target:{both:'위·아래 모두',top:'위 그림',bottom:'아래 그림'},
 speed:{normal:'보통',slow:'느리게',fast:'빠르게'},
 mood:{none:'그대로',day:'맑은 낮',night:'밤',dusk:'노을',dawn:'새벽',memory:'회상 (세피아)',danger:'위기 (붉게)',dream:'꿈',cold:'차가움',mono:'흑백',faded:'바랜 사진',vivid:'선명하게',horror:'공포',neon:'네온'},
 weather:{none:'없음',rain:'비',storm:'폭풍우 (번개)',snow:'눈',fog:'안개',dust:'먼지',embers:'불씨',petals:'꽃잎',leaves:'낙엽',fireflies:'반딧불',stars:'반짝이는 별',bubbles:'물방울',ash:'재',sparkles:'반짝임'},
 warp:{none:'없음',water:'물결',heat:'아지랑이',dream:'꿈결',wobble:'일그러짐'},
 overlays:{vignette:'가장자리 어둡게',grain:'필름 입자',scanlines:'주사선',letterbox:'위아래 검은 띠',lightRays:'빛줄기',haze:'뿌연 빛',glow:'은은한 빛',frame:'사진 테두리'},
 transition:{cut:'바로 전환',fade:'서서히',blackFade:'검게 열기',whiteFade:'하얗게 열기',wipeLeft:'왼쪽으로 닦기',wipeRight:'오른쪽으로 닦기',wipeDown:'아래로 닦기',wipeUp:'위로 닦기',iris:'동그랗게 열기',blinds:'블라인드',slide:'밀어 넣기',zoom:'확대하며 등장',glitch:'지직거림',dissolve:'흐릿하게 번지기',flashCut:'번쩍 전환'},
 when:{start:'장면 시작',choice:'선택 직후',gain:'얻었을 때',loss:'잃었을 때'},
 fx:{flash:'번쩍',whiteFlash:'하얗게 번쩍',redFlash:'붉게 번쩍',blackout:'암전',shake:'흔들림',bigShake:'크게 흔들림',pulse:'두근',glitch:'지직',zoomPunch:'확 다가감',lightning:'번개',blur:'흐려졌다 돌아옴',tint:'차갑게 물듦'},
 enter:{none:'그대로',fade:'서서히',slideLeft:'왼쪽에서',slideRight:'오른쪽에서',rise:'아래에서',pop:'톡 튀어나옴',drop:'위에서'},
 motion:{none:'없음',breathe:'숨쉬기',bob:'들썩임',sway:'흔들흔들',float:'둥실',tremble:'떨림'}};
const STAGE_PRESETS=[
 ['충격',{beats:[{when:'start',fx:'redFlash'},{when:'start',fx:'bigShake'}],transition:'flashCut',overlays:['vignette']}],
 ['회상',{mood:'memory',overlays:['vignette','grain'],transition:'whiteFade',camera:'drift',cameraSpeed:'slow'}],
 ['긴장',{mood:'danger',moodStrength:60,camera:'zoomIn',cameraSpeed:'slow',overlays:['vignette','letterbox'],beats:[{when:'loss',fx:'shake'}]}],
 ['꿈',{mood:'dream',warp:'dream',weather:'sparkles',weatherAmount:1,overlays:['glow','haze'],transition:'dissolve'}],
 ['폭풍우',{mood:'night',weather:'storm',weatherAmount:3,camera:'sway',overlays:['vignette'],beats:[{when:'start',fx:'lightning'}]}],
 ['설렘',{mood:'dawn',weather:'petals',weatherAmount:2,overlays:['glow'],camera:'breathe',transition:'fade',beats:[{when:'gain',fx:'pulse'}]}],
 ['공포',{mood:'horror',warp:'wobble',overlays:['grain','vignette','scanlines'],camera:'tilt',transition:'glitch',beats:[{when:'start',fx:'glitch'}]}],
 ['비 오는 밤거리',{mood:'neon',weather:'rain',weatherAmount:1,overlays:['vignette'],camera:'panRight',cameraSpeed:'slow'}],
 ['눈 오는 밤',{mood:'cold',weather:'snow',weatherAmount:2,camera:'drift',overlays:['vignette']}],
 ['모닥불',{mood:'dusk',weather:'embers',overlays:['vignette','glow'],camera:'breathe'}],
 ['레트로 화면',{mood:'faded',overlays:['scanlines','grain','frame'],transition:'blinds'}],
 ['물속',{mood:'cold',warp:'water',weather:'bubbles',overlays:['haze']}],
 ['한여름 낮',{mood:'day',warp:'heat',overlays:['lightRays'],camera:'breathe'}],
 ['폐허',{mood:'faded',weather:'ash',overlays:['grain','vignette'],camera:'panLeft',cameraSpeed:'slow'}]];
function stageEmpty(s){return !s||C.stageAreaEmpty(s.all)&&!s.top&&!s.bottom&&!s.layers;}
function stageOptions(kind,value){return Object.entries(STAGE_LABELS[kind]).map(([v,l])=>`<option value="${v}"${v===value?' selected':''}>${esc(l)}</option>`).join('');}
// The area being edited survives re-renders (adding a beat, picking a character picture).
let stageEditArea='all';
function stageAreasFor(e){return [['all','전체'],...(e.mode==='bottom'?[]:[['top',e.mode==='full'?'전체 화면 그림':'위 그림']]),...(e.mode==='top'||e.mode==='full'?[]:[['bottom','아래 그림']])];}
const STAGE_AREA_HINT={all:'화면 전체에 걸립니다. 흔들림은 화면 전체, 번쩍임은 대화창까지 덮습니다.',top:'이 그림 칸 안에서만 일어납니다.',bottom:'이 그림 칸 안에서만 일어납니다.'};
// Preview opens in its own full-screen sheet instead of taking room in the tab.
function stagePreviewSheet(){let sheet=$('fxSheet');if(sheet)return sheet;sheet=document.createElement('dialog');sheet.id='fxSheet';sheet.setAttribute('aria-label','연출 미리보기');
 sheet.innerHTML='<div id="fxPreview" class="fxPreviewFrame"><div class="previewArt previewUpper" data-fx-slot="top"></div><div class="previewArt previewLower" data-fx-slot="bottom"></div><div class="previewBox" data-fx-front>대화창</div></div><div class="fxSheetControls"><button id="fxReplay">▶ 장면 시작</button><button id="fxReact">▶ 선택 반응</button><button id="fxSheetClose" class="quiet">닫기</button></div>';
 document.body.append(sheet);sheet.addEventListener('close',()=>StageFX.clear($('fxPreview')));$('fxSheetClose').onclick=closeStagePreview;return sheet;}
// Stop the preview's particles right away; the dialog's own close event arrives a moment later.
function closeStagePreview(){const sheet=$('fxSheet');if(!sheet?.open)return false;StageFX.clear($('fxPreview'));sheet.close();return true;}
function openStagePreview(e){const sheet=stagePreviewSheet(),frame=$('fxPreview');sheet.showModal();
 const paint=replay=>{GameThemes.apply(frame,project.theme,project.panelTransparency);frame.style.aspectRatio=innerWidth+'/'+innerHeight;frame.dataset.mode=e.mode;frame.querySelector('.previewBox').style.height=(Math.min(260,innerHeight*.34)/innerHeight*100)+'%';for(const k of ['top','bottom'])paintArt(frame.querySelector(k==='top'?'.previewUpper':'.previewLower'),project,e,k);if(replay)StageFX.replay(frame,e);};
 $('fxReplay').onclick=()=>paint(true);$('fxReact').onclick=()=>StageFX.react(frame,e,{hp:-1,mental:0,money:0,items:[{id:'x',delta:1}]},false);paint(true);}
function renderStageEditor(e){
 const full=C.stageSettings(e.stage||{}),layers=clone(full.layers||{}),index=project.events.indexOf(e),previous=project.events[index-1],areaList=stageAreasFor(e);
 if(!areaList.some(([k])=>k===stageEditArea))stageEditArea='all';const area=stageEditArea,s=full[area]||C.stageArea({});let beats=s.beats.map(b=>({...b}));
 const used=k=>k==='all'?!C.stageAreaEmpty(full.all):!!full[k];
 const presetOptions='<option value="">프리셋 적용…</option><optgroup label="기본">'+STAGE_PRESETS.map(([n],i)=>`<option value="b${i}">${esc(n)}</option>`).join('')+'</optgroup>'+((project.stagePresets||[]).length?'<optgroup label="내 프리셋">'+project.stagePresets.map((p,i)=>`<option value="u${i}">${esc(p.name)}</option>`).join('')+'</optgroup>':'');
 const row=(label,controls,extra='')=>`<div class="fxRow${extra}"><span class="fxLabel">${label}</span><div class="fxControls">${controls}</div></div>`;
 const select=(id,kind,value,aria)=>`<select id="${id}" aria-label="${aria}">${stageOptions(kind,value)}</select>`;
 const beatRow=(b,i)=>`<div class="fxBeat"><select data-beat-when="${i}" aria-label="언제">${stageOptions('when',b.when)}</select><select data-beat-fx="${i}" aria-label="효과">${stageOptions('fx',b.fx)}</select><button data-beat-remove="${i}" class="quiet fxIcon" aria-label="순간 효과 삭제">✕</button></div>`;
 const slot=area==='all'?null:area,l=slot?layers[slot]:null;
 const character=!slot?'':row('인물',l?`<img class="fxThumb" src="${l.image}" alt=""><button data-layer-pick="${slot}">바꾸기</button><button data-layer-remove="${slot}" class="quiet">빼기</button>`:`<button data-layer-pick="${slot}" class="fxWide">투명 PNG 인물 겹치기</button>`)+(l?`<div class="fxSub"><label class="fxSlider">가로<input type="range" data-layer="${slot}" data-key="x" min="0" max="100" value="${l.x}"></label><label class="fxSlider">발 높이<input type="range" data-layer="${slot}" data-key="y" min="0" max="100" value="${l.y}"></label><label class="fxSlider">크기<input type="range" data-layer="${slot}" data-key="scale" min="20" max="150" value="${l.scale}"></label><div class="fxPair"><select data-layer="${slot}" data-key="enter" aria-label="등장">${stageOptions('enter',l.enter)}</select><select data-layer="${slot}" data-key="motion" aria-label="움직임">${stageOptions('motion',l.motion)}</select></div><button class="chip${l.flip?' on':''}" data-layer-flip="${slot}" aria-pressed="${l.flip}">좌우 뒤집기</button></div>`:'');
 $('editor').innerHTML=`<div class="stageEditor"><div class="fxAreaTabs" role="tablist" aria-label="연출 적용 위치">${areaList.map(([k,lab])=>`<button role="tab" data-fx-area="${k}" aria-selected="${k===area}" class="${k===area?'active':''}">${esc(lab)}${used(k)?'<i class="fxDot" aria-label="연출 있음"></i>':''}</button>`).join('')}</div>
 <p class="hint fxAreaHint">${STAGE_AREA_HINT[area]}</p>
 <div class="fxToolbar"><button id="fxOpenPreview">▶ 미리보기</button><select id="fxPreset" aria-label="프리셋 적용">${presetOptions}</select><button id="fxMore" class="quiet fxIcon" aria-label="연출 더 보기">⋯</button></div>
 <div class="fxCard">
 ${row('카메라',select('fxCamera','camera',s.camera,'카메라 움직임')+select('fxCameraSpeed','speed',s.cameraSpeed,'카메라 속도'),' fxTwo')}
 ${row('분위기',select('fxMood','mood',s.mood,'분위기'))}
 ${s.mood!=='none'?row('세기',`<input id="fxMoodStrength" type="range" min="20" max="100" step="10" value="${s.moodStrength}" aria-label="분위기 세기"><output id="fxMoodLevel">${s.moodStrength}%</output>`,' fxSubRow'):''}
 ${row('날씨',select('fxWeather','weather',s.weather,'날씨·입자')+`<select id="fxWeatherAmount" aria-label="양"><option value="1"${s.weatherAmount===1?' selected':''}>적게</option><option value="2"${s.weatherAmount===2?' selected':''}>보통</option><option value="3"${s.weatherAmount===3?' selected':''}>많이</option></select>`,' fxTwo')}
 ${row('일렁임',select('fxWarp','warp',s.warp,'그림 일렁임'))}
 ${row('전환',select('fxTransition','transition',s.transition,'장면 전환'))}
 ${row('겹침',`<div class="fxChips">${Object.entries(STAGE_LABELS.overlays).map(([v,lab])=>`<button class="chip${s.overlays.includes(v)?' on':''}" data-overlay="${v}" aria-pressed="${s.overlays.includes(v)}">${esc(lab)}</button>`).join('')}</div>`,' fxTall')}
 ${row('순간 효과',`<div id="fxBeats">${beats.map(beatRow).join('')}</div><button id="fxAddBeat" class="quiet fxWide"${beats.length>=6?' disabled':''}>＋ 추가</button>`,' fxTall')}
 ${character}</div></div>`;
 const overlays=()=>[...$('editor').querySelectorAll('[data-overlay].on')].map(x=>x.dataset.overlay);
 function collectArea(){return C.stageArea({camera:$('fxCamera').value,cameraSpeed:$('fxCameraSpeed').value,mood:$('fxMood').value,moodStrength:Number($('fxMoodStrength')?.value??s.moodStrength),weather:$('fxWeather').value,weatherAmount:Number($('fxWeatherAmount').value),warp:$('fxWarp').value,overlays:overlays(),transition:$('fxTransition').value,beats});}
 function collect(){const out={all:full.all,top:full.top,bottom:full.bottom};out[area]=collectArea();if(Object.keys(layers).length)out.layers=layers;return C.stageSettings(out);}
 function commitStage(next,rerender=false){if(stageEmpty(next))delete e.stage;else e.stage=next;persist();if(rerender)return renderStageEditor(e);$('editor').querySelectorAll('[data-fx-area]').forEach(b=>{const k=b.dataset.fxArea,on=k==='all'?!C.stageAreaEmpty(next.all):!!next[k];b.querySelector('.fxDot')?.remove();if(on)b.insertAdjacentHTML('beforeend','<i class="fxDot" aria-label="연출 있음"></i>');});}
 const save=(rerender=false)=>commitStage(collect(),rerender);
 $('editor').querySelectorAll('[data-fx-area]').forEach(b=>b.onclick=()=>{stageEditArea=b.dataset.fxArea;renderStageEditor(e);});
 $('fxOpenPreview').onclick=()=>openStagePreview(e);
 for(const id of ['fxCamera','fxCameraSpeed','fxWeather','fxWeatherAmount','fxWarp','fxTransition'])$(id).onchange=()=>save();
 $('fxMood').onchange=()=>save(($('fxMood').value==='none')!==(s.mood==='none'));
 if($('fxMoodStrength'))$('fxMoodStrength').oninput=()=>{$('fxMoodLevel').textContent=$('fxMoodStrength').value+'%';save();};
 $('editor').querySelectorAll('[data-overlay]').forEach(x=>x.onclick=()=>{const on=!x.classList.contains('on');x.classList.toggle('on',on);x.setAttribute('aria-pressed',on);save();});
 $('fxAddBeat').onclick=()=>{if(beats.length>=6)return;beats.push({when:'start',fx:'flash'});save(true);};
 $('editor').querySelectorAll('[data-beat-when]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatWhen)].when=x.value;save();});
 $('editor').querySelectorAll('[data-beat-fx]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatFx)].fx=x.value;save();});
 $('editor').querySelectorAll('[data-beat-remove]').forEach(x=>x.onclick=()=>{beats.splice(Number(x.dataset.beatRemove),1);save(true);});
 // Character on this picture slot.
 $('editor').querySelectorAll('[data-layer-pick]').forEach(b=>b.onclick=()=>{const k=b.dataset.layerPick,owner=e.id;imageCallback=data=>{if(selected!==owner||part!=='fx')return;layers[k]={...(layers[k]||{x:50,y:100,scale:85,enter:'fade',motion:'none',flip:false}),image:data};save(true);};$('imageFile').click();});
 $('editor').querySelectorAll('[data-layer-remove]').forEach(b=>b.onclick=()=>{delete layers[b.dataset.layerRemove];save(true);tell('인물 그림을 뺐습니다. ↶ 되돌리기로 복구할 수 있어요.');});
 $('editor').querySelectorAll('[data-layer]').forEach(x=>{const update=()=>{layers[x.dataset.layer][x.dataset.key]=x.tagName==='SELECT'?x.value:Number(x.value);save();};x.oninput=x.type==='range'?update:null;x.onchange=update;});
 $('editor').querySelectorAll('[data-layer-flip]').forEach(x=>x.onclick=()=>{const l=layers[x.dataset.layerFlip];l.flip=!l.flip;x.classList.toggle('on',l.flip);x.setAttribute('aria-pressed',l.flip);save();});
 // A preset applies to the area being edited as soon as it is picked; ↶ undoes it.
 $('fxPreset').onchange=()=>{const v=$('fxPreset').value,p=v[0]==='b'?STAGE_PRESETS[Number(v.slice(1))]?.[1]:v[0]==='u'?project.stagePresets?.[Number(v.slice(1))]?.stage:null;if(!p)return;const name=$('fxPreset').selectedOptions[0].textContent,next={all:full.all,top:full.top,bottom:full.bottom};next[area]=C.stageArea({...p});if(Object.keys(layers).length)next.layers=layers;commitStage(C.stageSettings(next),true);tell('「'+name+'」'+josa(name,'을')+' 적용했습니다. ↶ 되돌리기로 취소할 수 있어요.');};
 // Less frequent actions live in one sheet.
 $('fxMore').onclick=()=>{const mine=project.stagePresets||[];open('연출 더 보기',`<label>지금 연출을 프리셋으로 저장<div class="row"><input id="fxPresetName" maxlength="40" placeholder="프리셋 이름"><button id="fxSavePreset">저장</button></div></label>${mine.length?`<p class="hint">내 프리셋</p>${mine.map((p,i)=>`<div class="row fxPresetRow"><span>${esc(p.name)}</span><button data-delete-preset="${i}" class="quiet">삭제</button></div>`).join('')}`:''}<div class="fxMoreActions">${previous?'<button id="fxCopyPrevious" class="full">이전 사건 연출 복사</button>':''}<button id="fxClearArea" class="full quiet">이 위치 연출 지우기</button><button id="fxClear" class="full quiet danger">연출 모두 지우기</button></div>`);
  const done=(message,next)=>{$('modal').close();if(next!==undefined){if(next)e.stage=next;else delete e.stage;persist();}renderStageEditor(e);if(message)tell(message);};
  $('fxSavePreset').onclick=()=>{const name=$('fxPresetName').value.trim();if(!name)return formError('프리셋 이름을 입력하세요.','fxPresetName');project.stagePresets||=[];const at=project.stagePresets.findIndex(p=>p.name===name);if(at<0&&project.stagePresets.length>=30)return formError('프리셋은 30개까지 저장할 수 있습니다.');if(at>=0&&!confirm('같은 이름의 프리셋을 덮어쓸까요?'))return;const stage=collectArea();if(at>=0)project.stagePresets[at].stage=stage;else project.stagePresets.push({name,stage});persist();done('「'+name+'」 프리셋을 저장했습니다. 다른 사건에서도 쓸 수 있어요.');};
  $('modalBody').querySelectorAll('[data-delete-preset]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deletePreset),p=project.stagePresets[i];if(!confirm('「'+p.name+'」 프리셋을 삭제할까요?'))return;project.stagePresets.splice(i,1);if(!project.stagePresets.length)delete project.stagePresets;persist();done('프리셋을 삭제했습니다.');});
  if(previous)$('fxCopyPrevious').onclick=()=>previous.stage?done('이전 사건 연출을 복사했습니다.',clone(previous.stage)):formError('이전 사건에 연출이 없습니다.');
  $('fxClearArea').onclick=()=>{const next={all:full.all,top:full.top,bottom:full.bottom,layers:Object.keys(layers).length?layers:undefined};if(area==='all')next.all=C.stageArea({});else delete next[area];const v=C.stageSettings(next);done('이 위치의 연출을 지웠습니다. ↶ 되돌리기로 복구할 수 있어요.',stageEmpty(v)?null:v);};
  $('fxClear').onclick=()=>done('연출을 모두 지웠습니다. ↶ 되돌리기로 복구할 수 있어요.',null);};
}
