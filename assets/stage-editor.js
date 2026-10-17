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
function stageEmpty(s){return !s||s.camera==='none'&&s.mood==='none'&&s.weather==='none'&&s.warp==='none'&&!s.overlays.length&&s.transition==='cut'&&!s.beats.length&&!s.layers;}
function stageOptions(kind,value){return Object.entries(STAGE_LABELS[kind]).map(([v,l])=>`<option value="${v}"${v===value?' selected':''}>${esc(l)}</option>`).join('');}
// Which sections are open survives re-renders (adding a beat, picking a layer picture).
let stageDetailsOpen=null;
function renderStageEditor(e){
 const s=C.stageSettings(e.stage||{}),layers=clone(s.layers||{}),index=project.events.indexOf(e),previous=project.events[index-1];
 const presetOptions='<optgroup label="기본 프리셋">'+STAGE_PRESETS.map(([n],i)=>`<option value="b${i}">${esc(n)}</option>`).join('')+'</optgroup>'+((project.stagePresets||[]).length?'<optgroup label="내 프리셋">'+project.stagePresets.map((p,i)=>`<option value="u${i}">${esc(p.name)}</option>`).join('')+'</optgroup>':'');
 const layerControls=k=>{const l=layers[k];return `<div class="fxLayerSlot" data-layer-slot="${k}"><b>${k==='top'?'위':'아래'} 그림 위 인물</b><div class="row"><button data-layer-pick="${k}">${l?'그림 바꾸기':'인물 그림 선택'}</button><button data-layer-remove="${k}" class="quiet"${l?'':' hidden'}>제거</button></div>${l?`<label>가로 위치<input type="range" data-layer="${k}" data-key="x" min="0" max="100" value="${l.x}"></label><label>세로 위치 (발 기준)<input type="range" data-layer="${k}" data-key="y" min="0" max="100" value="${l.y}"></label><label>크기<input type="range" data-layer="${k}" data-key="scale" min="20" max="150" value="${l.scale}"></label><label>등장<select data-layer="${k}" data-key="enter">${stageOptions('enter',l.enter)}</select></label><label>움직임<select data-layer="${k}" data-key="motion">${stageOptions('motion',l.motion)}</select></label><label><input type="checkbox" data-layer="${k}" data-key="flip"${l.flip?' checked':''}> 좌우 뒤집기</label>`:'<p class="hint">배경이 투명한 PNG 인물 그림을 그림 위에 겹쳐 놓습니다.</p>'}</div>`;};
 const beatRow=(b,i)=>`<div class="fxBeat row" data-beat="${i}"><select data-beat-when="${i}" aria-label="언제">${stageOptions('when',b.when)}</select><select data-beat-fx="${i}" aria-label="효과">${stageOptions('fx',b.fx)}</select><button data-beat-test="${i}" class="quiet" aria-label="효과 미리 보기">▶</button><button data-beat-remove="${i}" class="quiet" aria-label="효과 삭제">✕</button></div>`;
 $('editor').innerHTML=`<div class="stageEditor"><div id="fxPreview" class="fxPreviewFrame" aria-label="연출 미리보기"><div class="previewArt previewUpper" data-fx-slot="top"></div><div class="previewArt previewLower" data-fx-slot="bottom"></div><div class="previewBox" data-fx-front>대화창</div></div>
 <div class="row"><button id="fxReplay">▶ 장면 시작 다시 보기</button><button id="fxReact" class="quiet">▶ 선택 반응 보기</button></div>
 <p class="hint">연출은 사건 그림 위에 코드로 그립니다. 그림 파일을 늘리지 않아 APK 용량이 거의 늘지 않습니다.</p>
 <details open><summary>프리셋</summary><label>프리셋<select id="fxPreset"><option value="">고르세요</option>${presetOptions}</select></label><div class="row"><button id="fxApplyPreset" disabled>적용</button><button id="fxDeletePreset" class="quiet" hidden>내 프리셋 삭제</button></div><div class="row"><input id="fxPresetName" maxlength="40" placeholder="지금 연출을 프리셋으로 저장" aria-label="새 프리셋 이름"><button id="fxSavePreset">저장</button></div><div class="row">${previous?'<button id="fxCopyPrevious" class="quiet">이전 사건 연출 복사</button>':''}<button id="fxClear" class="quiet">연출 모두 지우기</button></div></details>
 <details open><summary>카메라</summary><label>움직임<select id="fxCamera">${stageOptions('camera',s.camera)}</select></label><div class="row"><label>대상<select id="fxCameraTarget">${stageOptions('target',s.cameraTarget)}</select></label><label>속도<select id="fxCameraSpeed">${stageOptions('speed',s.cameraSpeed)}</select></label></div></details>
 <details open><summary>분위기</summary><label>색감<select id="fxMood">${stageOptions('mood',s.mood)}</select></label><label>세기 <output id="fxMoodLevel">${s.moodStrength}%</output><input id="fxMoodStrength" type="range" min="20" max="100" step="10" value="${s.moodStrength}"></label></details>
 <details open><summary>날씨·입자</summary><label>종류<select id="fxWeather">${stageOptions('weather',s.weather)}</select></label><label>양<select id="fxWeatherAmount"><option value="1"${s.weatherAmount===1?' selected':''}>적게</option><option value="2"${s.weatherAmount===2?' selected':''}>보통</option><option value="3"${s.weatherAmount===3?' selected':''}>많이</option></select></label></details>
 <details><summary>겹침 효과</summary>${Object.entries(STAGE_LABELS.overlays).map(([v,l])=>`<label><input type="checkbox" data-overlay="${v}"${s.overlays.includes(v)?' checked':''}> ${esc(l)}</label>`).join('')}</details>
 <details><summary>그림 일렁임</summary><label>효과<select id="fxWarp">${stageOptions('warp',s.warp)}</select></label></details>
 <details><summary>장면 전환</summary><label>이 사건이 나타날 때<select id="fxTransition">${stageOptions('transition',s.transition)}</select></label></details>
 <details><summary>순간 효과 ${s.beats.length?'· '+s.beats.length:''}</summary><div id="fxBeats">${s.beats.map(beatRow).join('')}</div><button id="fxAddBeat" class="quiet full"${s.beats.length>=6?' disabled':''}>＋ 순간 효과 추가</button><p class="hint">얻었을 때·잃었을 때는 이 사건의 선택으로 보유·자원이 바뀐 순간입니다.</p></details>
 <details><summary>인물 겹치기</summary>${e.mode==='bottom'?'':layerControls('top')}${e.mode==='top'||e.mode==='full'?'':layerControls('bottom')}</details></div>`;
 const sections=[...$('editor').querySelectorAll('.stageEditor details')];sections.forEach((d,i)=>{if(stageDetailsOpen&&stageDetailsOpen[i]!==undefined)d.open=stageDetailsOpen[i];d.addEventListener('toggle',()=>{stageDetailsOpen=sections.map(x=>x.open);});});
 const frame=$('fxPreview');let beats=s.beats.map(b=>({...b}));
 function collect(){const out={camera:$('fxCamera').value,cameraTarget:$('fxCameraTarget').value,cameraSpeed:$('fxCameraSpeed').value,mood:$('fxMood').value,moodStrength:Number($('fxMoodStrength').value),weather:$('fxWeather').value,weatherAmount:Number($('fxWeatherAmount').value),warp:$('fxWarp').value,overlays:[...$('editor').querySelectorAll('[data-overlay]:checked')].map(x=>x.dataset.overlay),transition:$('fxTransition').value,beats};if(Object.keys(layers).length)out.layers=layers;return C.stageSettings(out);}
 function paint(replay=false){GameThemes.apply(frame,project.theme,project.panelTransparency);frame.style.aspectRatio=innerWidth+'/'+innerHeight;frame.dataset.mode=e.mode;frame.querySelector('.previewBox').style.height=(Math.min(260,innerHeight*.34)/innerHeight*100)+'%';for(const k of ['top','bottom'])paintArt(frame.querySelector(k==='top'?'.previewUpper':'.previewLower'),project,e,k);if(replay)StageFX.replay(frame,e);else StageFX.enter(frame,{scene:e,key:'edit:'+e.id});}
 function save({rerender=false,replay=false}={}){const next=collect();if(stageEmpty(next))delete e.stage;else e.stage=next;persist();if(rerender)return renderStageEditor(e);paint(replay);}
 for(const id of ['fxCamera','fxCameraTarget','fxCameraSpeed','fxMood','fxWeather','fxWeatherAmount','fxWarp'])$(id).onchange=()=>save();
 $('fxTransition').onchange=()=>save({replay:true});
 $('fxMoodStrength').oninput=()=>{$('fxMoodLevel').textContent=$('fxMoodStrength').value+'%';save();};
 $('editor').querySelectorAll('[data-overlay]').forEach(x=>x.onchange=()=>save());
 $('fxReplay').onclick=()=>paint(true);
 $('fxReact').onclick=()=>StageFX.react(frame,{stage:collect()},{hp:-1,mental:0,money:0,items:[{id:'x',delta:1}]},false);
 // Beats.
 $('fxAddBeat').onclick=()=>{if(beats.length>=6)return;beats.push({when:'start',fx:'flash'});save({rerender:true});};
 $('editor').querySelectorAll('[data-beat-when]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatWhen)].when=x.value;save();});
 $('editor').querySelectorAll('[data-beat-fx]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatFx)].fx=x.value;save();StageFX.runBeat(frame,x.value);});
 $('editor').querySelectorAll('[data-beat-test]').forEach(x=>x.onclick=()=>StageFX.runBeat(frame,beats[Number(x.dataset.beatTest)].fx));
 $('editor').querySelectorAll('[data-beat-remove]').forEach(x=>x.onclick=()=>{beats.splice(Number(x.dataset.beatRemove),1);save({rerender:true});});
 // Character layers.
 $('editor').querySelectorAll('[data-layer-pick]').forEach(b=>b.onclick=()=>{const k=b.dataset.layerPick,owner=e.id;imageCallback=data=>{if(selected!==owner||part!=='fx')return;layers[k]={...(layers[k]||{x:50,y:100,scale:85,enter:'fade',motion:'none',flip:false}),image:data};save({rerender:true});};$('imageFile').click();});
 $('editor').querySelectorAll('[data-layer-remove]').forEach(b=>b.onclick=()=>{delete layers[b.dataset.layerRemove];save({rerender:true});tell('인물 그림을 뺐습니다. ↶ 되돌리기로 복구할 수 있어요.');});
 $('editor').querySelectorAll('[data-layer]').forEach(x=>{const update=()=>{const l=layers[x.dataset.layer];l[x.dataset.key]=x.type==='checkbox'?x.checked:x.tagName==='SELECT'?x.value:Number(x.value);save();};x.oninput=x.type==='range'?update:null;x.onchange=update;});
 // Presets.
 const presetValue=()=>{const v=$('fxPreset').value;return v[0]==='b'?STAGE_PRESETS[Number(v.slice(1))]?.[1]:v[0]==='u'?project.stagePresets?.[Number(v.slice(1))]?.stage:null;};
 $('fxPreset').onchange=()=>{$('fxApplyPreset').disabled=!$('fxPreset').value;$('fxDeletePreset').hidden=$('fxPreset').value[0]!=='u';};
 $('fxApplyPreset').onclick=()=>{const p=presetValue();if(!p)return;const next=C.stageSettings({...p});if(Object.keys(layers).length)next.layers=layers;e.stage=next;persist();renderStageEditor(e);StageFX.replay($('fxPreview'),e);tell('프리셋을 적용했습니다. 인물 그림은 그대로 둡니다.');};
 $('fxDeletePreset').onclick=()=>{const i=Number($('fxPreset').value.slice(1)),p=project.stagePresets?.[i];if(!p||!confirm('「'+p.name+'」 프리셋을 삭제할까요?'))return;project.stagePresets.splice(i,1);if(!project.stagePresets.length)delete project.stagePresets;persist();renderStageEditor(e);};
 $('fxSavePreset').onclick=()=>{const name=$('fxPresetName').value.trim();if(!name){tell('프리셋 이름을 입력하세요.');$('fxPresetName').focus();return;}project.stagePresets||=[];if(project.stagePresets.length>=30)return tell('프리셋은 30개까지 저장할 수 있습니다.');const at=project.stagePresets.findIndex(p=>p.name===name);const stage=C.stageSettings(collect(),false);if(at>=0){if(!confirm('같은 이름의 프리셋을 덮어쓸까요?'))return;project.stagePresets[at].stage=stage;}else project.stagePresets.push({name,stage});persist();renderStageEditor(e);tell('「'+name+'」 프리셋을 저장했습니다. 다른 사건에서도 쓸 수 있어요.');};
 if(previous)$('fxCopyPrevious').onclick=()=>{if(!previous.stage)return tell('이전 사건에 연출이 없습니다.');e.stage=clone(previous.stage);persist();renderStageEditor(e);StageFX.replay($('fxPreview'),e);};
 $('fxClear').onclick=()=>{if(!e.stage)return;delete e.stage;persist();renderStageEditor(e);tell('연출을 지웠습니다. ↶ 되돌리기로 복구할 수 있어요.');};
 paint(true);
}
