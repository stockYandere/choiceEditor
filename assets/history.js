(function(root){'use strict';
class History {
constructor(p,limit=20){this.limit=limit;this.assets=new Map();this.lookup=new Map();this.serial=0;this.past=[];this.future=[];this.latest=this.encode(p);}
encode(p){return JSON.stringify(p,(k,v)=>{if(((k==='image'||k==='sampleImage')&&typeof v==='string'&&v.startsWith('data:image/'))||(k==='src'&&typeof v==='string'&&v.startsWith('data:audio/'))){let key=this.lookup.get(v);if(!key){key='@asset:'+ ++this.serial;this.lookup.set(v,key);this.assets.set(key,v);}return key;}return v;});}
decode(s){return JSON.parse(s,(k,v)=>(k==='image'||k==='sampleImage'||k==='src')&&this.assets.has(v)?this.assets.get(v):v);}
changed(p){return this.encode(p)!==this.latest;}
record(p){const s=this.encode(p);if(s===this.latest)return false;this.past.push(this.latest);if(this.past.length>this.limit)this.past.shift();this.latest=s;this.future=[];this.gc();return true;}
gc(){const keep=new Set();for(const s of [this.latest,...this.past,...this.future])for(const m of s.matchAll(/"(@asset:\d+)"/g))keep.add(m[1]);for(const [k,v]of this.assets)if(!keep.has(k)){this.assets.delete(k);this.lookup.delete(v);}}
undo(p){this.record(p);if(!this.past.length)return null;this.future.push(this.latest);this.latest=this.past.pop();return this.decode(this.latest);}
redo(p){this.record(p);if(!this.future.length)return null;this.past.push(this.latest);this.latest=this.future.pop();return this.decode(this.latest);}
}
if(typeof module!=='undefined')module.exports=History;else root.EditorHistory=History;
})(globalThis);
