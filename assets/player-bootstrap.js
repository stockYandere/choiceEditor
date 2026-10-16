'use strict';
// Only included in exported game APKs; the editor never executes this entry point.
window.StandaloneGame={ready:(async()=>{if(window.Android?.readGame)return Android.readGame();const response=await fetch('game.json');if(!response.ok)throw Error('게임 파일을 읽지 못했습니다.');return response.text();})()};
async function initStandalone(){
try{
 GameCore.allowPackedMedia(true);
 const incoming=GameVault.decode(await StandaloneGame.ready);if(incoming.games.length!==1||!incoming.games[0].published)throw Error('게임 구성 형식');delete incoming.exportIcon;const g=incoming.games[0];let old=null,badRaw='';
 try{const raw=await GameVault.read();if(raw){badRaw=raw;old=GameVault.decode(raw);}}catch(e){if(!badRaw&&e.raw)badRaw=e.raw;try{const backup=await GameVault.backup();if(backup)old=GameVault.decode(backup);}catch(x){}if(badRaw){await GameVault.archive(badRaw);} }
 const previous=old?.games.find(x=>x.id===g.id);if(previous){g.progress=previous.progress;if(previous.manualSlots)g.manualSlots=previous.manualSlots;incoming.preferences=old.preferences||{};}store=incoming;project=clone(g.published);history=null;selected=project.events[0].id;GameAudio.configure({},store.preferences);GameFeedback.prepare();document.title=project.title;document.body.classList.add('standalone');page='gameTitle';render();
}catch(e){document.body.classList.add('standalone');const wrap=document.createElement('div');wrap.className='homeContent';const text=document.createElement('p');text.textContent='게임을 불러오지 못했습니다. '+e.message;const retry=document.createElement('button');retry.textContent='다시 불러오기';retry.onclick=()=>location.reload();wrap.append(text,retry);document.body.replaceChildren(wrap);}
}
