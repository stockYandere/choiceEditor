'use strict';
// 그림 모음: the built-in pictures (art-library.js, files in art/) — backgrounds by place and time of day, and two characters
// with expressions. A pick becomes an ordinary image (data URL) in the game, so playing and exporting need nothing new.
(function(root){
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
let tab='place',time='day',person='boy',framing='bust',apply=null,busy=false;
const lib=()=>root.ArtLibrary;
const src=name=>'art/'+name+'.webp';
async function dataUrl(name){
 if(root.Android?.readArt){const b64=Android.readArt(name);if(b64)return 'data:image/webp;base64,'+b64;}
 const response=await fetch(src(name)).catch(()=>null);if(!response?.ok)throw Error('그림을 읽지 못했습니다.');
 const blob=await response.blob();return await new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).replace(/^data:[^;,]*/,'data:image/webp'));r.onerror=()=>bad(Error('그림을 읽지 못했습니다.'));r.readAsDataURL(blob);});}
// 상반신: the top of the standing figure (head to waist), so a character fills its picture slot like a visual novel portrait.
const BUST=600/1216;
async function bust(data){const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=Math.round(img.naturalHeight*BUST);c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/webp',.92);}
function chips(list,current,key){return `<div class="fxChips artChips">${list.map(x=>`<button class="chip${x.id===current?' on':''}" data-${key}="${x.id}" aria-pressed="${x.id===current}">${esc(x.name)}</button>`).join('')}</div>`;}
function draw(){
 const L=lib(),body=$('artBody');
 const tabs=`<div class="fxAreaTabs" role="tablist" aria-label="그림 종류">${[['place','배경'],['person','인물']].map(([k,l])=>`<button role="tab" data-art-tab="${k}" aria-selected="${k===tab}" class="${k===tab?'active':''}">${l}</button>`).join('')}</div>`;
 let grid;
 if(tab==='place')grid=chips(L.times,time,'art-time')+`<div class="artGrid">${L.places.map(p=>{const name=p.id+'-'+time,label=p.name+' · '+L.times.find(t=>t.id===time).name;return `<button class="artCard" data-art-pick="${name}" data-art-label="${esc(label)}"><img src="${src(name)}" alt="" loading="lazy" decoding="async"><span>${esc(p.name)}</span></button>`;}).join('')}</div>`;
 else grid=`<div class="artChipRow">${chips(L.people,person,'art-person')}${chips([{id:'bust',name:'상반신'},{id:'full',name:'전신'}],framing,'art-framing')}</div>`+`<div class="artGrid people ${framing}">${L.expressions.map(x=>{const name=person+'-'+x.id,label=L.people.find(p=>p.id===person).name+' · '+x.name;return `<button class="artCard" data-art-pick="${name}" data-art-label="${esc(label)}"><img src="${src(name)}" alt="" loading="lazy" decoding="async"><span>${esc(x.name)}</span></button>`;}).join('')}</div>`;
 body.innerHTML=tabs+grid+`<p class="hint artHint">${tab==='place'?'모든 그림이 같은 그림체라 한 게임에 섞어 써도 어울립니다.':'배경이 투명해서 연출 → 인물로 배경 위에 세울 수 있어요. 상반신은 그림 칸 아래에 붙어 대화 장면에 알맞습니다.'} 에디터용으로 직접 그린 그림이라 크레딧 없이 쓸 수 있습니다.</p>`;
 body.querySelectorAll('[data-art-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.artTab;draw();});
 body.querySelectorAll('[data-art-time]').forEach(b=>b.onclick=()=>{time=b.dataset.artTime;draw();});
 body.querySelectorAll('[data-art-person]').forEach(b=>b.onclick=()=>{person=b.dataset.artPerson;draw();});
 body.querySelectorAll('[data-art-framing]').forEach(b=>b.onclick=()=>{framing=b.dataset.artFraming;draw();});
 body.querySelectorAll('[data-art-pick]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;b.classList.add('loading');
  try{let data=await dataUrl(b.dataset.artPick);if(tab==='person'&&framing==='bust')data=await bust(data);const done=apply;close();done?.(data,b.dataset.artLabel);}catch(error){root.tell?.(error.message);}finally{busy=false;b.classList.remove('loading');}});
}
// kind: 'place' opens on backgrounds, 'person' on characters; onPick(dataUrl,label).
function open(kind,onPick){if(!lib())return root.tell?.('그림 모음을 불러오지 못했습니다.');tab=kind==='person'?'person':'place';apply=onPick;draw();const d=$('artSheet');if(!d.open)d.showModal();}
function close(){apply=null;const d=$('artSheet');if(d.open)d.close();}
document.addEventListener('DOMContentLoaded',()=>{$('closeArt').onclick=close;$('artSheet').addEventListener('cancel',e=>{e.preventDefault();close();});});
root.ArtPicker={open,close,isOpen:()=>!!$('artSheet')?.open};
})(globalThis);
