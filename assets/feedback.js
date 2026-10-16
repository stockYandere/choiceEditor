(function(root){'use strict';
const palettes={ability:'#efce91',item:'#92dae9',state:'#c5a2ec',money:'#f0cc83',important:'#ffd99b',recovery:'#9ce0c6',loss:'#f2a3aa',death:'#f2a3aa',mixed:'#f1c894'};
const paths={ability:'M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z',item:'M4 8L12 3L20 8V17L12 22L4 17ZM4 8L12 13L20 8M12 13V22',state:'M2 12Q12 1 22 12Q12 23 2 12ZM15 12A3 3 0 1 1 9 12A3 3 0 1 1 15 12',money:'M20 12A8 8 0 1 1 4 12A8 8 0 1 1 20 12M12 7V17M15 9H10V12H14V15H9',important:'M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z',recovery:'M9 3H15V9H21V15H15V21H9V15H3V9H9Z',loss:'M12 2L21 6V12Q20 18 12 22Q4 18 3 12V6ZM13 5L9 11L14 13L10 19',death:'M5 15V10A7 7 0 0 1 19 10V15L16 17V21H8V17ZM8 10V12M16 10V12M12 17V21',mixed:'M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z'};
let fxTimer;
function prepare(){GameAudio.prepareEffects();}
function stopSound(){GameAudio.stopEffect();}
function stop(){stopSound();clearTimeout(fxTimer);document.getElementById('rewardFx')?.replaceChildren();document.getElementById('rewardFx')?.removeAttribute('data-theme');}
function setEnabled(v){GameAudio.setEnabled(v);}
function play(cue,custom){GameAudio.playEffect(cue,custom);}
function icon(theme){const path=paths[theme]||paths.ability;return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';}
function present(feedback,hasArt){
 const animations=[],bar=document.getElementById('statusBar'),symbol=document.getElementById('statusSymbol'),fx=document.getElementById('rewardFx'),theme=feedback.theme||'ability';
 bar.dataset.theme=theme;bar.style.setProperty('--reward-color',palettes[theme]||palettes.ability);symbol.innerHTML=icon(theme);symbol.hidden=false;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return animations;
 animations.push(symbol.animate([{transform:'scale(.5) rotate(-15deg)',opacity:0},{transform:'scale(1.18) rotate(3deg)',opacity:1,offset:.65},{transform:'scale(1) rotate(0)',opacity:1}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'}));
 animations.push(document.getElementById('statusMessage').animate([{opacity:.25},{opacity:1}],{duration:200}));
 fx.dataset.theme=theme;fx.style.setProperty('--reward-color',palettes[theme]);fx.classList.toggle('has-art',!!hasArt);fx.classList.toggle('important',theme==='important');
 const edge=document.createElement('i');edge.className='feedbackEdge';fx.append(edge);
 animations.push(edge.animate([{opacity:0},{opacity:.8,offset:.25},{opacity:0}],{duration:theme==='important'?900:600,easing:'ease-out'}));
 if(!['loss','death'].includes(theme)){
  const shine=document.createElement('i');shine.className='feedbackShine';fx.append(shine);
  animations.push(shine.animate([{transform:'translateX(0) skewX(-18deg)',opacity:0},{opacity:hasArt?.38:.18,offset:.2},{transform:'translateX(600%) skewX(-18deg)',opacity:0}],{duration:theme==='important'?850:650,easing:'ease-out'}));
  for(let i=0;i<(theme==='important'?10:6);i++){const p=document.createElement('i');p.className='feedbackSpark';p.style.left=(8+i*83/(theme==='important'?9:5))+'%';p.style.top=(hasArt?12+(i%3)*30:4+(i%2)*7)+'%';fx.append(p);animations.push(p.animate([{opacity:0,transform:'translateY(8px) scale(.3) rotate(0deg)'},{opacity:1,transform:'translateY(0) scale(1) rotate(45deg)',offset:.4},{opacity:0,transform:'translateY(-20px) scale(.4) rotate(95deg)'}],{duration:650+i*25,delay:i*25,easing:'ease-out'}));}
 }
 clearTimeout(fxTimer);fxTimer=setTimeout(()=>{fx.replaceChildren();fx.removeAttribute('data-theme');},1250);return animations;
}
const api={prepare,setEnabled,stop,stopSound,play,present};if(typeof module!=='undefined')module.exports=api;else root.GameFeedback=api;
})(globalThis);
