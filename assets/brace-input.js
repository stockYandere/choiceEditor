(function(root){'use strict';
// Typing help for 대사 변주 on phone keyboards, where every { } | is a trip to the symbol keys:
// '{' becomes '{|}' with the caret in the first part, typing '|' or '}' just before the same symbol steps over it,
// and on leaving the field an unused empty last part is dropped where it changes nothing ({우산? 폈다|} → {우산? 폈다}, {=돈|} → {=돈}).

// The innermost {…} around a caret position: [open, close] indexes, or null.
function groupAt(text,pos){
 let depth=0,open=-1;
 for(let i=pos-1;i>=0;i--){const ch=text[i];if(ch==='}')depth++;else if(ch==='{'){if(!depth){open=i;break;}depth--;}}
 if(open<0)return null;
 depth=0;
 for(let i=pos;i<text.length;i++){const ch=text[i];if(ch==='{')depth++;else if(ch==='}'){if(!depth)return [open,i];depth--;}}
 return null;
}
// Positions of this group's own '|' separators (not those of groups nested inside it).
function separators(text,[open,close]){const out=[];let depth=0;for(let i=open+1;i<close;i++){const ch=text[i];if(ch==='{')depth++;else if(ch==='}')depth--;else if(ch==='|'&&!depth)out.push(i);}return out;}
function hasTop(s,mark){let depth=0;for(const ch of s){if(ch==='{')depth++;else if(ch==='}')depth--;else if(ch===mark&&!depth)return true;}return false;}
// Drop an empty last part only where it means the same without it: a condition ({…? A|}) or a shown value ({=돈|}).
function tidy(text){
 for(let i=0;i<text.length-1;i++){
  if(text[i]!=='|'||text[i+1]!=='}')continue;
  const g=groupAt(text,i);if(!g||g[1]!==i+1)continue;
  const inner=text.slice(g[0]+1,i);
  if(hasTop(inner,'?')&&separators(text,g).length===1||inner.trim().startsWith('='))return tidy(text.slice(0,i)+text.slice(i+1));
 }
 return text;
}
// Caret to the start of the next part (adding a part when it is already in the last one), or just past the group.
function nextPart(el){const v=el.value,pos=el.selectionStart,g=groupAt(v,pos);if(!g)return false;
 const next=separators(v,g).find(i=>i>=pos);
 if(next!==undefined)el.setSelectionRange(next+1,next+1);else{el.setRangeText('|',g[1],g[1],'end');el.dispatchEvent(new Event('input',{bubbles:true}));}
 return true;}
function leave(el){const v=el.value,g=groupAt(v,el.selectionStart);if(!g)return false;el.setSelectionRange(g[1]+1,g[1]+1);return true;}
function attach(el,onCaret){
 if(!el||el.dataset.braces)return;el.dataset.braces='1';
 let before=el.value;
 // The move buttons are for a bare caret inside braces; with text selected the wrap buttons stay (wrapping is the intent).
 const caret=()=>onCaret?.(document.activeElement===el&&el.selectionStart===el.selectionEnd&&!!groupAt(el.value,el.selectionStart));
 el.addEventListener('input',ev=>{
  const now=el.value,pos=el.selectionStart;
  // Only a single typed character (not composing Hangul, not paste or our own edits) is helped.
  if(!ev.isComposing&&ev.inputType&&now.length===before.length+1&&now.slice(0,pos-1)+now.slice(pos)===before){
   const ch=now[pos-1];
   if(ch==='{'){el.setRangeText('|}',pos,pos,'start');el.dispatchEvent(new Event('input',{bubbles:true}));}
   else if((ch==='|'||ch==='}')&&now[pos]===ch&&groupAt(before,pos-1)){el.setRangeText('',pos,pos+1,'start');el.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  before=el.value;caret();
 });
 el.addEventListener('change',()=>{const t=tidy(el.value);if(t!==el.value){el.value=t;before=t;el.dispatchEvent(new Event('input',{bubbles:true}));}});
 for(const type of ['keyup','click','focus'])el.addEventListener(type,caret);
 el._braceCaret=caret;
 el.addEventListener('blur',()=>onCaret?.(false));
}
// One listener for every helped field: caret moves (taps, arrow keys, code) update the in-brace buttons.
if(typeof document!=='undefined')document.addEventListener('selectionchange',()=>document.activeElement?._braceCaret?.());
const api={attach,tidy,groupAt,nextPart,leave};
if(typeof module!=='undefined')module.exports=api;else root.BraceInput=api;
})(globalThis);
