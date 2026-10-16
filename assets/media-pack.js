(function(root){'use strict';
// Editor-only: shrinks pictures and sounds, and splits them out of the game file for APK export.
const MAX_W=1080,MAX_H=1400,LOSSLESS_AUDIO=/^data:audio\/(wav|wave|x-wav|flac);base64,/;
const EXT={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/wave':'wav','audio/x-wav':'wav','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/aac':'aac','audio/flac':'flac','audio/webm':'webm'};
const FONTS={base:['PretendardVariable.woff2','GowunBatang-Regular.woff2'],pixel:'Galmuri14.woff2'};
const mimeOf=uri=>/^data:([^;,]+)/.exec(uri)?.[1]||'';
function bytesOf(uri){const i=uri.indexOf(','),n=uri.length-i-1;return Math.max(0,Math.floor(n*3/4)-(uri.endsWith('==')?2:uri.endsWith('=')?1:0));}
function loadImage(src){return new Promise((ok,bad)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=()=>bad(Error('그림을 읽지 못했습니다.'));img.src=src;});}
// Drawings and pixel art (few colours) stay sharp; photos and paintings use lossy WebP.
function fewColors(ctx,w,h,limit=256){const d=ctx.getImageData(0,0,w,h).data,seen=new Set();for(let i=0;i<d.length;i+=4){seen.add(((d[i]<<24)|(d[i+1]<<16)|(d[i+2]<<8)|d[i+3])>>>0);if(seen.size>limit)return false;}return true;}
function encodeCanvas(canvas){const graphic=fewColors(canvas.getContext('2d'),canvas.width,canvas.height),options=[canvas.toDataURL('image/png')],webp=canvas.toDataURL('image/webp',graphic?1:0.85);if(webp.startsWith('data:image/webp'))options.push(webp);return options.reduce((a,b)=>b.length<a.length?b:a);}
function scaled(img){const scale=Math.min(1,MAX_W/img.naturalWidth,MAX_H/img.naturalHeight),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c;}
async function importImage(src){return encodeCanvas(scaled(await loadImage(src)));}
// Never returns a bigger picture than the one the editor holds.
async function compressImage(src){if(!/^data:image\/(png|jpeg);/.test(src))return src;try{const out=encodeCanvas(scaled(await loadImage(src)));return out.length<src.length?out:src;}catch(e){return src;}}

const CRC=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let r=i<<24;for(let j=0;j<8;j++)r=r&0x80000000?(r<<1)^0x04c11db7:r<<1;t[i]=r>>>0;}return t;})();
function crc(b){let c=0;for(let i=0;i<b.length;i++)c=((c<<8)^CRC[((c>>>24)^b[i])&255])>>>0;return c;}
function oggPage(packets,granule,serial,seq,flags){const lacing=[];let size=0;for(const p of packets){let n=p.length;size+=n;while(n>=255){lacing.push(255);n-=255;}lacing.push(n);}
 const b=new Uint8Array(27+lacing.length+size),v=new DataView(b.buffer);b.set([79,103,103,83]);b[5]=flags;v.setUint32(6,granule%4294967296,true);v.setUint32(10,Math.floor(granule/4294967296),true);v.setUint32(14,serial,true);v.setUint32(18,seq,true);b[26]=lacing.length;b.set(lacing,27);let o=27+lacing.length;for(const p of packets){b.set(p,o);o+=p.length;}v.setUint32(22,crc(b),true);return b;}
function oggOpus(packets,channels,preSkip,samples){const serial=0x45564e31,pages=[],head=new Uint8Array(19),hv=new DataView(head.buffer),vendor=new TextEncoder().encode('event-editor'),tags=new Uint8Array(16+vendor.length),tv=new DataView(tags.buffer);
 head.set(new TextEncoder().encode('OpusHead'));head[8]=1;head[9]=channels;hv.setUint16(10,preSkip,true);hv.setUint32(12,48000,true);
 tags.set(new TextEncoder().encode('OpusTags'));tv.setUint32(8,vendor.length,true);tags.set(vendor,12);
 pages.push(oggPage([head],0,serial,0,2),oggPage([tags],0,serial,1,0));let seq=2,pos=0,group=[],lace=0;
 const end=preSkip+samples;
 packets.forEach((p,i)=>{const need=Math.floor(p.data.length/255)+1;if(group.length&&(lace+need>255||group.length>=50)){pages.push(oggPage(group,Math.min(pos,end),serial,seq++,0));group=[];lace=0;}group.push(p.data);lace+=need;pos+=p.samples;if(i===packets.length-1)pages.push(oggPage(group,end,serial,seq++,4));});
 return new Blob(pages,{type:'audio/ogg'});}
const readAsDataURL=blob=>new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(String(r.result));r.onerror=()=>bad(r.error);r.readAsDataURL(blob);});
const decode=async bytes=>new OfflineAudioContext(1,1,48000).decodeAudioData(bytes);
// Uncompressed sounds (WAV, FLAC) become Ogg Opus; anything else, or any failure, keeps the original.
async function transcodeAudio(src){if(!LOSSLESS_AUDIO.test(src)||typeof AudioEncoder==='undefined'||typeof OfflineAudioContext==='undefined')return src;
 try{const buffer=await decode(await (await fetch(src)).arrayBuffer()),channels=Math.min(2,buffer.numberOfChannels),config={codec:'opus',sampleRate:48000,numberOfChannels:channels,bitrate:channels===1?64000:128000};
  if(!buffer.length||!(await AudioEncoder.isConfigSupported(config)).supported)return src;
  const packets=[];let description=null,failure=null;const encoder=new AudioEncoder({output:(chunk,meta)=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);packets.push({data,samples:chunk.duration?Math.round(chunk.duration*0.048):960});if(!description&&meta?.decoderConfig?.description)description=new Uint8Array(meta.decoderConfig.description.buffer||meta.decoderConfig.description);},error:e=>{failure=e;}});
  encoder.configure(config);const step=48000;
  for(let pos=0;pos<buffer.length;pos+=step){const n=Math.min(step,buffer.length-pos),data=new Float32Array(n*channels);for(let c=0;c<channels;c++)data.set(buffer.getChannelData(c).subarray(pos,pos+n),c*n);const frame=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:n,numberOfChannels:channels,timestamp:Math.round(pos/0.048),data});encoder.encode(frame);frame.close();}
  await encoder.flush();encoder.close();if(failure||!packets.length)return src;
  const preSkip=description&&description.length>=12&&new TextDecoder().decode(description.subarray(0,8))==='OpusHead'?description[10]|(description[11]<<8):312;
  const blob=oggOpus(packets,channels,preSkip,buffer.length);if(blob.size>=bytesOf(src))return src;
  // Keep the result only if the device plays it back at the same length.
  const check=await decode(await blob.arrayBuffer());if(Math.abs(check.duration-buffer.duration)>0.1)return src;
  return await readAsDataURL(blob);
 }catch(e){return src;}}

function fonts(theme){const variant=root.GameThemes?.get(theme)?.variant;return variant==='pixel'?[...FONTS.base,FONTS.pixel]:[...FONTS.base];}
// Every distinct picture and sound in a game, largest first, with where it is used.
function inventory(project){const seen=new Map(),places={landing:'메인 화면',defaultArt:'기본 그림',finish:'결말 화면'};
 (function walk(v,label,key){if(typeof v==='string'){const kind=/^data:image\//.test(v)?'image':/^data:audio\//.test(v)?'sound':'';if(kind&&!seen.has(v))seen.set(v,{kind,bytes:bytesOf(v),mime:mimeOf(v),label});return;}
  if(Array.isArray(v))return v.forEach(x=>walk(x,label,key));if(!v||typeof v!=='object')return;const here=v===project?label:(typeof v.title==='string'&&v.title.trim()?v.title.trim():typeof v.name==='string'&&v.name.trim()?v.name.trim():label);
  for(const [k,x]of Object.entries(v))walk(x,v===project?(places[k]||label):here,k);})(project,'게임',null);
 return [...seen.values()].sort((a,b)=>b.bytes-a.bytes);}
const mb=n=>(n/1048576).toFixed(n>=10485760?0:1)+'MB';
function summary(items){const images=items.filter(i=>i.kind==='image'),sounds=items.filter(i=>i.kind==='sound'),sum=a=>a.reduce((s,i)=>s+i.bytes,0),raw=sounds.filter(i=>LOSSLESS_AUDIO.test('data:'+i.mime+';base64,'));
 return {images:images.length,imageBytes:sum(images),sounds:sounds.length,soundBytes:sum(sounds),uncompressed:raw.length};}

async function prepare(encoded,{hash,stage,onProgress}={}){const file=JSON.parse(encoded),report={images:{count:0,before:0,after:0},sounds:{count:0,before:0,after:0,converted:0}};file.sounds=file.sounds||[];
 const total=file.images.length+file.sounds.length;let done=0;
 for(const kind of ['images','sounds'])for(let i=0;i<file[kind].length;i++){const original=file[kind][i];onProgress?.(++done,total,kind);
  const out=kind==='images'?await compressImage(original):await transcodeAudio(original),ext=EXT[mimeOf(out)];if(!ext)throw Error(kind==='images'?'그림 형식을 확인하세요.':'소리 형식을 확인하세요.');
  const name=(await hash(original)).slice(0,32)+'.'+ext;if(!stage(name,out.slice(out.indexOf(',')+1)))throw Error('그림·소리를 APK에 담지 못했습니다. 다시 시도하세요.');
  const r=report[kind];r.count++;r.before+=bytesOf(original);r.after+=bytesOf(out);if(kind==='sounds'&&out!==original)r.converted++;file[kind][i]='media/'+name;}
 return {data:JSON.stringify(file),report};}
function describe(report){const parts=[];const {images:i,sounds:s}=report;if(i.count)parts.push('그림 '+i.count+'장 '+(i.after<i.before?mb(i.before)+' → ':'')+mb(i.after));if(s.count)parts.push('소리 '+s.count+'개 '+(s.after<s.before?mb(s.before)+' → ':'')+mb(s.after));return parts.join(' · ');}

const api={importImage,compressImage,transcodeAudio,oggOpus,prepare,inventory,summary,describe,fonts,bytesOf,mb,EXT};
if(typeof module!=='undefined')module.exports=api;else root.MediaPack=api;
})(globalThis);
