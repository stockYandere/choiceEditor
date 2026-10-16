(function(root){'use strict';
const V=typeof module!=='undefined'?require('./vault.js'):root.GameVault;
const copy=x=>JSON.parse(JSON.stringify(x));
function allowed(g){return !!g?.published&&g.published.manualSaves!==false;}
function checkpoint(run,version,now=Date.now()){return {project:run.p,state:run.snapshot(),savedAt:version,updatedAt:now};}
function slot(g,index){if(!Number.isInteger(index)||index<0||index>2)throw Error('저장 칸을 확인하세요.');return g.manualSlots?.[index]||null;}
async function save(store,g,index,progress){if(!allowed(g))throw Error('이 게임은 수동 저장을 허용하지 않습니다.');slot(g,index);V.resume({progress});const before=g.manualSlots;g.manualSlots=[...(before||[null,null,null])];g.manualSlots[index]={...progress,state:copy(progress.state)};try{await V.write(store);}catch(e){if(before===undefined)delete g.manualSlots;else g.manualSlots=before;throw e;}}
async function load(store,g,index){if(!allowed(g))throw Error('이 게임은 수동 저장을 허용하지 않습니다.');const saved=slot(g,index);if(!saved)throw Error('비어 있는 저장 칸입니다.');const next=V.resume({progress:saved}),before=g.progress;g.progress={...saved,state:next.snapshot(),updatedAt:Date.now()};try{await V.write(store);}catch(e){g.progress=before;throw e;}return {run:next,version:saved.savedAt};}
const api={allowed,checkpoint,slot,save,load};if(typeof module!=='undefined')module.exports=api;else root.GameSaves=api;
})(globalThis);
