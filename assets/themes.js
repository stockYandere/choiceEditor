(function(root){'use strict';
// Palette order: paper, ink, muted, edge, accent, choice, history, gain, gainBg, loss, lossBg, empty, coin.
const rows=[
['cream','코지 크림','카페 영수증 · 얇은 점선과 따뜻한 종이','soft',12,['#fff3df','#3d2a1f','#76543d','#ac805c','#8a4d21','#edddc4','#f5e5c9','#246144','#ddecdf','#a43b38','#f6dedc','#b9a58d','#84601d']],
['romance','소프트 로맨스','러브레터 · 하트와 둥근 선택 행','romance',18,['#ffeaf3','#43233b','#77536b','#cf7da3','#94355e','#f8cede','#fff1f7','#246144','#e0eee7','#a43945','#f6dee5','#c4aabc','#80601e']],
['notebook','탐험 수첩','야장 수첩 · 녹색 제본선과 번호','paper',2,['#e8ebda','#26342a','#53614e','#70876a','#31533a','#d6dec5','#e0e6d1','#256344','#dce9d7','#9e3934','#eedbd1','#aaa58d','#766023']],
['noir','네온 누아르','SF 콘솔 · 청록 네온과 꺾인 모서리','neon',3,['#071e29','#dffbff','#a0c7cc','#2e8898','#66edff','#113545','#061721','#a5e5c6','#24392e','#ffafb6','#412833','#82718b','#f2d893']],
['ocean','바다 유리','수면 유리 · 파란 곡선과 물결','glass',14,['#dff6ff','#133e61','#375f7c','#4b99bf','#14577f','#c2e8f8','#edfaff','#205d49','#d5eee4','#9d3539','#f7dddd','#9baeb7','#776021']],
['forest','숲의 숨결','숲의 책 · 이끼빛 장식과 잎사귀','leaf',20,['#243315','#f0f4d7','#c2cba2','#879057','#d2e59b','#3c4e22','#1a280f','#bcf0cf','#254334','#ffbbb2','#49312e','#789281','#efd39b']],
['starlight','별빛 판타지','마법 서책 · 금빛 이중선과 별','star',8,['#251854','#fff2d1','#d5c8e8','#b99d54','#f6d67a','#3b286d','#1a103c','#b5edcb','#294635','#ffc3b9','#493039','#78859f','#f1d28d']],
['gothic','붉은 서약','공포 · 검은 기록지와 붉은 긁힘','gothic',0,['#130e0e','#efdfd0','#c5b4a7','#a14e43','#eaa08d','#2d1715','#0d0a0a','#bde9d1','#294137','#ffc0bc','#4c282c','#8f707a','#f0d09b']],
['mist','기밀 사건철','스릴러 · 흑백 문서와 경고 띠','mist',4,['#e3e5e4','#191e20','#4b5357','#61696d','#303b41','#cdd2d3','#f1f2ef','#22533c','#d5e7d8','#942f32','#f0d9d8','#8a9599','#6e581c']],
['retro','레트로 게임','게임기 화면 · 픽셀 모서리와 커서','pixel',0,['#dbeaaf','#233515','#4b5b37','#465638','#314822','#b9cb8b','#e4efc7','#205c43','#d5e8d9','#a12f3e','#f3d7dc','#a7a1a5','#775915']]
];
const keys=['surface','ink','muted','edge','accent','choice','history','gain','gain-bg','loss','loss-bg','empty','coin'];
const catalog=rows.map(([id,name,description,variant,radius,colors])=>({id,name,description,variant,radius,colors:Object.fromEntries(keys.map((k,i)=>[k,colors[i]]))}));
function get(id){return catalog.find(t=>t.id===id)||catalog[0];}
function apply(el,id,transparency=0){if(!el)return;const t=get(id);el.dataset.gameTheme=t.id;el.dataset.themeStyle=t.variant;for(const [k,v]of Object.entries(t.colors))el.style.setProperty('--t-'+k,v);el.style.setProperty('--t-radius',t.radius+'px');const alpha=1-Math.max(0,Math.min(100,Number(transparency)||0))/100;const rgba=hex=>'rgba('+hex.slice(1).match(/../g).map(x=>parseInt(x,16)).join(',')+','+alpha+')';el.style.setProperty('--t-panel',rgba(t.colors.surface));el.style.setProperty('--t-choice-panel',rgba(t.colors.choice));el.style.setProperty('--t-panel-alpha',String(alpha));el.dataset.transparentPanel=String(alpha===0);}
const ready=()=>typeof document==='undefined'||!document.fonts?Promise.resolve():Promise.all([document.fonts.load('16px StorySerif','한글'),document.fonts.load('600 15px ActionSans','한글'),document.fonts.load('15px StoryPixel','한글')]).catch(()=>{});
const api={catalog,get,apply,ready,valid:id=>catalog.some(t=>t.id===id)};if(typeof module!=='undefined')module.exports=api;else root.GameThemes=api;
})(globalThis);
