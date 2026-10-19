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
function stageAreasFor(e){return [['all','전체'],...(e.mode==='bottom'?[]:[['top',e.mode==='full'?'그림':'위 그림']]),...(e.mode==='top'||e.mode==='full'?[]:[['bottom','아래 그림']])];}
const STAGE_AREA_HINT={all:'화면 전체에 걸립니다. 번쩍임은 대화창까지 덮습니다.',top:'이 그림 칸 안에서만 일어납니다.',bottom:'이 그림 칸 안에서만 일어납니다.'};
// Tools of the staging tab: each opens its own sheet; 'used' tells whether an area holds that tool's setting.
const STAGE_ICON=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const STAGE_TOOLS={
 camera:{label:'카메라',icon:'<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 10.5l6-3v9l-6-3z"/>',used:a=>a.camera!=='none'},
 mood:{label:'분위기',icon:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',used:a=>a.mood!=='none'},
 weather:{label:'날씨',icon:'<path d="M7 14.5a4 4 0 1 1 1.2-7.8A5 5 0 0 1 17.6 8.6 3 3 0 0 1 17 14.5z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>',used:a=>a.weather!=='none'},
 warp:{label:'일렁임',icon:'<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>',used:a=>a.warp!=='none'},
 overlays:{label:'겹침',icon:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>',used:a=>a.overlays.length>0},
 transition:{label:'전환',icon:'<rect x="3" y="5" width="9" height="14" rx="1"/><path d="M15 12h6M18 9l3 3-3 3"/>',used:a=>a.transition!=='cut'},
 beats:{label:'순간 효과',icon:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',used:a=>a.beats.length>0},
 character:{label:'인물',icon:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4.5-7 8-7s7 2 8 7"/>',slots:true}};
const STAGE_WHEN_SHORT={start:'시작 시',choice:'선택 후',gain:'얻을 때',loss:'잃을 때'};
function stageToolUsed(full,tool,area){if(tool==='character')return area!=='all'&&!!full.layers?.[area];const a=full[area];return !!a&&STAGE_TOOLS[tool].used(a);}
function stageToolAreas(e,tool){const list=stageAreasFor(e);return STAGE_TOOLS[tool].slots?list.filter(([k])=>k!=='all'):list;}
// One line that tells what this event's staging does, with the picture it applies to.
function stageSummary(e,full){const names=Object.fromEntries(stageAreasFor(e)),out=[];
 for(const k of ['all','top','bottom']){const a=full[k];if(!a)continue;const tag=k==='all'?'':'('+names[k]?.replace(' 그림','')+')',add=t=>out.push(esc(t)+tag);
  if(a.mood!=='none')add(STAGE_LABELS.mood[a.mood]);if(a.weather!=='none')add(STAGE_LABELS.weather[a.weather]);if(a.camera!=='none')add(STAGE_LABELS.camera[a.camera]);if(a.warp!=='none')add(STAGE_LABELS.warp[a.warp]);
  for(const o of a.overlays)add(STAGE_LABELS.overlays[o]);if(a.transition!=='cut')add('전환 '+STAGE_LABELS.transition[a.transition]);for(const b of a.beats)add(STAGE_WHEN_SHORT[b.when]+' '+STAGE_LABELS.fx[b.fx]);}
 for(const k of ['top','bottom'])if(full.layers?.[k])out.push('인물('+names[k]?.replace(' 그림','')+')');return out.join(' · ');}
// Writes one area (or the character layers) and drops whatever ends up empty.
function stageWrite(e,area,change,layers){const full=C.stageSettings(e.stage||{}),next={all:full.all,top:full.top,bottom:full.bottom};if(area)next[area]=C.stageArea({...(full[area]||{}),...change});const l=layers||full.layers;if(l&&Object.keys(l).length)next.layers=l;const v=C.stageSettings(next);if(stageEmpty(v))delete e.stage;else e.stage=v;persist();return v;}
const stageSoundName=id=>(window.SoundLibrary?.SOUNDS.find(x=>x.id===id)?.name)||id;
const stagePresetList=()=>[...STAGE_PRESETS.map(([name,stage],i)=>({id:'b'+i,name,stage})),...(project.stagePresets||[]).map((p,i)=>({id:'u'+i,name:p.name,stage:p.stage,mine:true}))];
// Preview opens in its own full-screen sheet instead of taking room in the tab.
function stagePreviewSheet(){let sheet=$('fxSheet');if(sheet)return sheet;sheet=document.createElement('dialog');sheet.id='fxSheet';sheet.setAttribute('aria-label','연출 미리보기');
 sheet.innerHTML='<div id="fxPreview" class="fxPreviewFrame"><div class="previewArt previewUpper" data-fx-slot="top"></div><div class="previewArt previewLower" data-fx-slot="bottom"></div><div class="previewBox" data-fx-front>대화창</div></div><div class="fxSheetControls"><button id="fxReplay">▶ 장면 시작</button><button id="fxReact">▶ 선택 반응</button><button id="fxSheetClose" class="quiet">닫기</button></div>';
 document.body.append(sheet);sheet.addEventListener('close',()=>StageFX.clear($('fxPreview')));$('fxSheetClose').onclick=closeStagePreview;return sheet;}
// Stop the preview's particles right away; the dialog's own close event arrives a moment later.
function closeStagePreview(){const sheet=$('fxSheet');if(!sheet?.open)return false;StageFX.clear($('fxPreview'));sheet.close();return true;}
function openStagePreview(e){const sheet=stagePreviewSheet(),frame=$('fxPreview');sheet.showModal();
 const paint=replay=>{GameThemes.apply(frame,project.theme,project.panelTransparency);frame.style.aspectRatio=innerWidth+'/'+innerHeight;frame.dataset.mode=e.mode;frame.querySelector('.previewBox').style.height=(Math.min(260,innerHeight*.34)/innerHeight*100)+'%';for(const k of ['top','bottom'])paintArt(frame.querySelector(k==='top'?'.previewUpper':'.previewLower'),project,e,k);if(replay)StageFX.replay(frame,e);};
 $('fxReplay').onclick=()=>paint(true);$('fxReact').onclick=()=>StageFX.react(frame,e,{hp:-1,mental:0,money:0,items:[{id:'x',delta:1}]},false);paint(true);}
// Preview without a button: holding any item previews the event's whole staging as it is now (tapping only picks or cancels).
function stageHold(el,fn){let timer=0,x=0,y=0;const stop=()=>clearTimeout(timer);
 el.addEventListener('pointerdown',ev=>{delete el.dataset.held;x=ev.clientX;y=ev.clientY;stop();timer=setTimeout(()=>{el.dataset.held='1';fn();},450);});
 el.addEventListener('pointermove',ev=>{if(Math.hypot(ev.clientX-x,ev.clientY-y)>10)stop();});
 for(const t of ['pointerup','pointercancel','pointerleave'])el.addEventListener(t,stop);
 el.addEventListener('contextmenu',ev=>ev.preventDefault());
 // The click that ends a hold must not also toggle or apply.
 el.addEventListener('click',ev=>{if(el.dataset.held){delete el.dataset.held;ev.stopImmediatePropagation();ev.preventDefault();}},true);}
// The preset page survives re-renders, so applying a preset on page 2 stays on page 2.
let stagePresetPage=null;
function renderStageEditor(e){
 const full=C.stageSettings(e.stage||{}),summary=stageSummary(e,full),pic=C.art(project,e,e.mode==='bottom'?'bottom':'top').image||C.art(project,e,'bottom').image||'';
 const list=stagePresetList(),now=JSON.stringify({...full.all,sound:true}),chosen=list.findIndex(p=>JSON.stringify(C.stageArea(p.stage))===now);
 const width=($('editor').clientWidth||360)-24,cols=Math.max(3,Math.floor((width+8)/68)),per=cols*2,pages=Math.max(1,Math.ceil(list.length/per));
 if(stagePresetPage===null)stagePresetPage=chosen>=0?Math.floor(chosen/per):0;stagePresetPage=Math.min(Math.max(0,stagePresetPage),pages-1);const page=stagePresetPage;
 const tile=(p,i)=>{const a=C.stageArea(p.stage),tint=StageFX.MOODS[a.mood]?.tint,on=i===chosen;return `<button class="fxPresetTile${on?' on':''}" data-preset="${p.id}" aria-pressed="${on}" aria-label="${esc(p.name)}${on?' (적용됨, 다시 누르면 취소)':''}"><span class="fxPresetPic${a.overlays.includes('vignette')?' fxVig':''}" style="filter:${StageFX.moodFilter(a.mood,a.moodStrength)||'none'}">${tint?`<i style="background:${tint};mix-blend-mode:${StageFX.MOODS[a.mood].blend}"></i>`:''}</span>${on?'<b class="fxPlayMark" aria-hidden="true">✓</b>':''}<span class="fxPresetName">${esc(p.name)}</span></button>`;};
 const pager=pages>1?`<div class="fxPager" aria-label="프리셋 쪽">${pages<=4?Array.from({length:pages},(_,i)=>`<button data-preset-page="${i}" class="${i===page?'active':''}" aria-label="${i+1}쪽"${i===page?' aria-current="page"':''}>${i+1}</button>`).join(''):`<span>${page+1}/${pages}</span>`}<button data-preset-step="-1" aria-label="이전 쪽"${page?'':' disabled'}>‹</button><button data-preset-step="1" aria-label="다음 쪽"${page<pages-1?'':' disabled'}>›</button></div>`:'';
 $('editor').innerHTML=`<div class="stageEditor">
 <div class="fxPresetHead"><b>프리셋</b>${pager}<button id="fxMore" class="quiet fxIcon" aria-label="연출 더 보기">⋯</button></div>
 <p class="fxCaption">누르면 화면 전체에 적용 · 다시 누르면 취소 · 꾹 누르면 미리보기</p>
 <div class="fxPresets" style="--fx-cols:${cols}">${list.slice(page*per,page*per+per).map((p,i)=>tile(p,page*per+i)).join('')}</div>
 <button id="fxSummary" class="${summary?'':'hint'}"${summary?'':' disabled'}>${summary?'<b>지금</b> '+summary+'<i class="fxPlayMark" aria-hidden="true">▶</i>':'아직 연출 없음 · 프리셋이나 도구를 골라 보세요'}</button>
 <div class="fxTools">${Object.entries(STAGE_TOOLS).filter(([k])=>stageToolAreas(e,k).length).map(([k,t])=>`<button data-fx-tool="${k}">${STAGE_ICON(t.icon)}<span>${t.label}</span>${stageToolAreas(e,k).some(([a])=>stageToolUsed(full,k,a))?'<i class="fxDot" aria-label="사용 중"></i>':''}</button>`).join('')}</div></div>`;
 const grid=$('editor').querySelector('.fxPresets');if(pic)grid.style.setProperty('--fx-pic','url("'+pic+'")');
 const turn=n=>{stagePresetPage=n;renderStageEditor(e);};
 $('editor').querySelectorAll('[data-preset-page]').forEach(b=>b.onclick=()=>turn(Number(b.dataset.presetPage)));
 $('editor').querySelectorAll('[data-preset-step]').forEach(b=>b.onclick=()=>turn(page+Number(b.dataset.presetStep)));
 // Swipe the grid sideways to turn the page.
 let sx=null,swiped=false;grid.addEventListener('pointerdown',ev=>{sx=ev.clientX;swiped=false;});grid.addEventListener('pointerup',ev=>{if(sx===null)return;const dx=ev.clientX-sx;sx=null;if(Math.abs(dx)>40&&pages>1){const n=page+(dx<0?1:-1);if(n>=0&&n<pages){swiped=true;turn(n);}}});
 grid.addEventListener('click',ev=>{if(swiped){swiped=false;ev.stopPropagation();ev.preventDefault();}},true);
 $('fxSummary').onclick=()=>openStagePreview(e);
 $('editor').querySelectorAll('[data-fx-tool]').forEach(b=>b.onclick=()=>openStageTool(e,b.dataset.fxTool));
 // A preset replaces the whole-screen staging (every field of it; picture-only settings and characters stay); ↶ undoes it.
 const apply=p=>{stageWrite(e,'all',{...C.stageArea(p.stage),sound:full.all.sound});renderStageEditor(e);};
 $('editor').querySelectorAll('[data-preset]').forEach(b=>{const p=list.find(x=>x.id===b.dataset.preset);if(!p)return;
  b.onclick=()=>{if(b.classList.contains('on')){stageWrite(e,'all',C.stageArea({}));renderStageEditor(e);return tell('「'+p.name+'」 적용을 취소했습니다.');}apply(p);tell('「'+p.name+'」'+josa(p.name,'을')+' 적용했습니다. 꾹 누르면 미리보기');};});
 // Holding anything in the tab previews what this event has now.
 $('editor').querySelectorAll('[data-preset],[data-fx-tool],#fxSummary').forEach(x=>stageHold(x,()=>openStagePreview(e)));
 $('fxMore').onclick=()=>openStageMore(e);
}
// A tool's sheet: where it applies (전체·위·아래), then that tool's options. Every tap is saved right away.
function openStageTool(e,tool,area){
 const areas=stageToolAreas(e,tool),full=C.stageSettings(e.stage||{});if(!areas.length)return;
 if(!areas.some(([k])=>k===area))area=(areas.find(([k])=>stageToolUsed(full,tool,k))||areas[0])[0];
 const s=full[area]||C.stageArea({}),layers=clone(full.layers||{}),t=STAGE_TOOLS[tool];
 const chips=(field,kind,value,labels=STAGE_LABELS[kind])=>`<div class="fxChips" role="group">${Object.entries(labels).map(([v,l])=>`<button class="chip${String(v)===String(value)?' on':''}" data-fx-set="${field}" data-value="${v}" aria-pressed="${String(v)===String(value)}">${esc(l)}</button>`).join('')}</div>`;
 const sub=(label,html)=>`<p class="fxSubLabel">${label}</p>${html}`;
 let body='';
 if(tool==='camera')body=chips('camera','camera',s.camera)+(s.camera!=='none'?sub('속도',chips('cameraSpeed','speed',s.cameraSpeed)):'');
 if(tool==='mood')body=chips('mood','mood',s.mood)+(s.mood!=='none'?`<label class="fxSlider">세기<input id="fxMoodStrength" type="range" min="20" max="100" step="10" value="${s.moodStrength}"><output id="fxMoodLevel">${s.moodStrength}%</output></label>`:'');
 if(tool==='weather')body=chips('weather','weather',s.weather)+(s.weather!=='none'?sub('양',chips('weatherAmount',null,s.weatherAmount,{1:'적게',2:'보통',3:'많이'})):'');
 if(tool==='warp')body=chips('warp','warp',s.warp);
 if(tool==='transition')body=`<p class="hint">이 사건으로 넘어올 때 화면이 바뀌는 방식입니다.</p>`+chips('transition','transition',s.transition);
 if(tool==='overlays')body=`<p class="hint">여러 개를 함께 켤 수 있어요.</p><div class="fxChips">${Object.entries(STAGE_LABELS.overlays).map(([v,l])=>`<button class="chip${s.overlays.includes(v)?' on':''}" data-overlay="${v}" aria-pressed="${s.overlays.includes(v)}">${esc(l)}</button>`).join('')}</div>`;
 if(tool==='beats')body=`<p class="hint">정한 때에 한 번 일어나는 효과입니다. 최대 6개.</p><div id="fxBeats">${s.beats.map((b,i)=>`<div class="fxBeat"><select data-beat-when="${i}" aria-label="언제">${stageOptions('when',b.when)}</select><select data-beat-fx="${i}" aria-label="효과">${stageOptions('fx',b.fx)}</select><button data-beat-remove="${i}" class="quiet fxIcon" aria-label="순간 효과 삭제">✕</button></div>`).join('')}</div><button id="fxAddBeat" class="fxWide"${s.beats.length>=6?' disabled':''}>＋ 순간 효과 추가</button>`;
 if(tool==='character'){const l=layers[area];body=l?`<div class="fxLayerHead"><img class="fxThumb" src="${l.image}" alt=""><button data-layer-pick="${area}">바꾸기</button><button data-layer-library="${area}">그림 모음</button><button data-layer-remove="${area}" class="quiet">빼기</button></div><label class="fxSlider">가로<input type="range" data-layer="${area}" data-key="x" min="0" max="100" value="${l.x}"></label><label class="fxSlider">발 높이<input type="range" data-layer="${area}" data-key="y" min="0" max="100" value="${l.y}"></label><label class="fxSlider">크기<input type="range" data-layer="${area}" data-key="scale" min="20" max="150" value="${l.scale}"></label>${sub('등장',chips('enter','enter',l.enter))}${sub('움직임',chips('motion','motion',l.motion))}<button class="chip${l.flip?' on':''}" data-layer-flip="${area}" aria-pressed="${l.flip}">좌우 뒤집기</button>`:`<p class="hint">배경이 투명한 PNG 인물 그림을 이 그림 칸 위에 겹칩니다. 그림 모음에는 남학생·여학생이 표정별로 있어요.</p><div class="row"><button data-layer-pick="${area}">인물 그림 고르기</button><button data-layer-library="${area}">그림 모음</button></div>`;}
 // Tools with sounds: one switch per place, and the names of the sounds that will play.
 if(['weather','beats','transition','character'].includes(tool)){const S=StageFX.SOUNDS,ids=tool==='weather'?[S.weather[s.weather],S.weatherOnce[s.weather],s.weather==='storm'&&S.bolt]:tool==='beats'?s.beats.map(b=>S.fx[b.fx]):tool==='transition'?[S.transition[s.transition]]:[S.enter[layers[area]?.enter]],names=[...new Set(ids.filter(Boolean).map(stageSoundName))],on=s.sound!==false;
  body+=`<div class="fxSoundRow"><button class="chip${on?' on':''}" data-fx-sound aria-pressed="${on}">${on?'효과음 켜짐':'효과음 꺼짐'}</button><small>${names.length?esc(names.join(' · ')):'이 효과에는 소리가 없습니다'}</small></div>`;}
 const where=areas.length>1||tool==='character'?`<div class="fxAreaTabs" role="tablist" aria-label="적용 위치">${areas.map(([k,lab])=>`<button role="tab" data-fx-area="${k}" aria-selected="${k===area}" class="${k===area?'active':''}">${esc(lab)}${stageToolUsed(full,tool,k)?'<i class="fxDot" aria-label="사용 중"></i>':''}</button>`).join('')}</div>`:'';
 const keep=$('modal').open&&$('modal').classList.contains('fxToolSheet')?$('modalBody').scrollTop:0;
 open(t.label,`${where}<p class="hint fxAreaHint">${STAGE_AREA_HINT[area]}<br><span class="fxTip">고른 것을 다시 누르면 취소 · 꾹 누르면 지금 연출 미리보기</span></p><div class="fxToolBody">${body}</div>`);
 const sheet=$('modal');sheet.classList.add('fxToolSheet');sheet.addEventListener('close',()=>sheet.classList.remove('fxToolSheet'),{once:true});$('modalBody').scrollTop=keep;
 const again=()=>{renderStageEditor(e);openStageTool(e,tool,area);},put=change=>{stageWrite(e,area,change);again();};
 const layerPut=(fn,rerender=true)=>{const now=clone(C.stageSettings(e.stage||{}).layers||{});fn(now);stageWrite(e,null,null,now);if(rerender)again();else renderStageEditor(e);};
 const preview=()=>openStagePreview(e);
 $('modalBody').querySelectorAll('[data-fx-area]').forEach(b=>b.onclick=()=>{if(b.dataset.fxArea!==area)openStageTool(e,tool,b.dataset.fxArea);});
 // Anything that can be pressed here previews the whole current staging on a hold, without changing it.
 $('modalBody').querySelectorAll('[data-fx-area],[data-fx-set],[data-overlay],.fxBeat,[data-layer-flip],[data-layer-pick],[data-layer-library],[data-fx-sound]').forEach(x=>stageHold(x,preview));
 // Tapping the chosen option again cancels it back to its default.
 const blank=C.stageArea({}),off={...blank,enter:'none',motion:'none'};
 $('modalBody').querySelectorAll('[data-fx-set]').forEach(b=>b.onclick=()=>{const f=b.dataset.fxSet,again=b.getAttribute('aria-pressed')==='true',v=again?off[f]:f==='weatherAmount'?Number(b.dataset.value):b.dataset.value;if(tool==='character')layerPut(l=>{l[area][f]=v;});else put({[f]:v});});
 if($('fxMoodStrength'))$('fxMoodStrength').oninput=()=>{$('fxMoodLevel').textContent=$('fxMoodStrength').value+'%';stageWrite(e,area,{moodStrength:Number($('fxMoodStrength').value)});renderStageEditor(e);};
 $('modalBody').querySelectorAll('[data-fx-sound]').forEach(x=>x.onclick=()=>put({sound:s.sound===false}));
 $('modalBody').querySelectorAll('[data-overlay]').forEach(x=>x.onclick=()=>{const on=new Set(s.overlays);if(on.has(x.dataset.overlay))on.delete(x.dataset.overlay);else on.add(x.dataset.overlay);put({overlays:[...on]});});
 const beats=s.beats.map(b=>({...b}));
 if($('fxAddBeat'))$('fxAddBeat').onclick=()=>{if(beats.length>=6)return;beats.push({when:'start',fx:'flash'});put({beats});};
 $('modalBody').querySelectorAll('[data-beat-when]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatWhen)].when=x.value;put({beats});});
 $('modalBody').querySelectorAll('[data-beat-fx]').forEach(x=>x.onchange=()=>{beats[Number(x.dataset.beatFx)].fx=x.value;put({beats});});
 $('modalBody').querySelectorAll('[data-beat-remove]').forEach(x=>x.onclick=()=>{beats.splice(Number(x.dataset.beatRemove),1);put({beats});});
 $('modalBody').querySelectorAll('[data-layer-pick]').forEach(b=>b.onclick=()=>{const k=b.dataset.layerPick,owner=e.id;imageCallback=data=>{if(selected!==owner||part!=='fx')return;layerPut(l=>{l[k]={...(l[k]||{x:50,y:100,scale:85,enter:'fade',motion:'none',flip:false}),image:data};});};$('imageFile').click();});
 // A built-in character starts sized so its face clears the dialogue box: tall in the upper (or full) picture, low in the lower one.
 $('modalBody').querySelectorAll('[data-layer-library]').forEach(b=>b.onclick=()=>{const k=b.dataset.layerLibrary,owner=e.id;ArtPicker.open('person',data=>{if(selected!==owner||part!=='fx')return;layerPut(l=>{l[k]={...(l[k]||{x:50,y:100,scale:k==='bottom'?60:98,enter:'fade',motion:'none',flip:false}),image:data};});});});
 $('modalBody').querySelectorAll('[data-layer-remove]').forEach(b=>b.onclick=()=>{layerPut(l=>{delete l[b.dataset.layerRemove];});tell('인물 그림을 뺐습니다. ↶ 되돌리기로 복구할 수 있어요.');});
 $('modalBody').querySelectorAll('input[data-layer]').forEach(x=>x.oninput=()=>layerPut(l=>{l[x.dataset.layer][x.dataset.key]=Number(x.value);},false));
 $('modalBody').querySelectorAll('[data-layer-flip]').forEach(x=>x.onclick=()=>layerPut(l=>{l[x.dataset.layerFlip].flip=!l[x.dataset.layerFlip].flip;}));
}
// Less frequent actions live in one sheet.
function openStageMore(e){const full=C.stageSettings(e.stage||{}),mine=project.stagePresets||[],previous=project.events[project.events.indexOf(e)-1],names=Object.fromEntries(stageAreasFor(e)),usedAreas=['all','top','bottom'].filter(k=>k==='all'?!C.stageAreaEmpty(full.all):!!full[k]);
 open('연출 더 보기',`<label class="fxGameSound"><input id="fxGameSound" type="checkbox"${project.audio?.stageSound===false?'':' checked'}> 연출 효과음 (이 게임 전체)</label><label>지금 전체 연출을 프리셋으로 저장<div class="row"><input id="fxPresetName" maxlength="40" placeholder="프리셋 이름"><button id="fxSavePreset">저장</button></div></label>${mine.length?`<p class="hint">내 프리셋</p>${mine.map((p,i)=>`<div class="row fxPresetRow"><span>${esc(p.name)}</span><button data-delete-preset="${i}" class="quiet">삭제</button></div>`).join('')}`:''}<div class="fxMoreActions">${previous?'<button id="fxCopyPrevious" class="full">이전 사건 연출 복사</button>':''}${usedAreas.length>1?usedAreas.map(k=>`<button data-clear-area="${k}" class="full quiet">${esc(names[k]||k)} 연출 지우기</button>`).join(''):''}<button id="fxClear" class="full quiet danger">연출 모두 지우기</button></div>`);
 const done=(message,next)=>{$('modal').close();if(next!==undefined){if(next&&!stageEmpty(next))e.stage=next;else delete e.stage;persist();}renderStageEditor(e);if(message)tell(message);};
 $('fxGameSound').onchange=()=>{project.audio||={};if($('fxGameSound').checked)delete project.audio.stageSound;else project.audio.stageSound=false;persist();tell($('fxGameSound').checked?'연출 효과음을 켰습니다.':'연출 효과음을 껐습니다. 소리 탭에서도 바꿀 수 있어요.');};
 $('fxSavePreset').onclick=()=>{const name=$('fxPresetName').value.trim();if(!name)return formError('프리셋 이름을 입력하세요.','fxPresetName');if(C.stageAreaEmpty(full.all))return formError('전체 연출이 비어 있습니다. 도구에서 위치를 ‘전체’로 두고 먼저 꾸며 보세요.');project.stagePresets||=[];const at=project.stagePresets.findIndex(p=>p.name===name);if(at<0&&project.stagePresets.length>=30)return formError('프리셋은 30개까지 저장할 수 있습니다.');if(at>=0&&!confirm('같은 이름의 프리셋을 덮어쓸까요?'))return;const stage=clone(full.all);if(at>=0)project.stagePresets[at].stage=stage;else project.stagePresets.push({name,stage});persist();done('「'+name+'」 프리셋을 저장했습니다. 다른 사건에서도 쓸 수 있어요.');};
 $('modalBody').querySelectorAll('[data-delete-preset]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deletePreset),p=project.stagePresets[i];if(!confirm('「'+p.name+'」 프리셋을 삭제할까요?'))return;project.stagePresets.splice(i,1);if(!project.stagePresets.length)delete project.stagePresets;persist();done('프리셋을 삭제했습니다.');});
 if(previous)$('fxCopyPrevious').onclick=()=>previous.stage?done('이전 사건 연출을 복사했습니다.',clone(previous.stage)):formError('이전 사건에 연출이 없습니다.');
 $('modalBody').querySelectorAll('[data-clear-area]').forEach(b=>b.onclick=()=>{const k=b.dataset.clearArea,next={...full};if(k==='all')next.all=C.stageArea({});else delete next[k];done(names[k]+' 연출을 지웠습니다. ↶ 되돌리기로 복구할 수 있어요.',C.stageSettings(next));});
 $('fxClear').onclick=()=>done('연출을 모두 지웠습니다. ↶ 되돌리기로 복구할 수 있어요.',null);}
