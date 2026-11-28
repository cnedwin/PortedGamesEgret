import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const {createAudio}=await import('../src/audio.mjs');

class Param {
  constructor(value=0){this.value=value;this.events=[];}
  cancelScheduledValues(t){this.events.push(['cancel',t]);}
  setValueAtTime(v,t){this.events.push(['set',v,t]);this.value=v;}
  linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);this.value=v;}
  exponentialRampToValueAtTime(v,t){this.events.push(['exp',v,t]);this.value=v;}
  setTargetAtTime(v,t,constant){this.events.push(['target',v,t,constant]);this.value=v;}
}
class Node {
  constructor(kind){this.kind=kind;this.connections=[];this.starts=0;}
  connect(n){this.connections.push(n);return n;}
  disconnect(){this.connections.length=0;}
  start(){this.starts++;}
  stop(){}
}
class BrowserTarget extends EventTarget {
  constructor(){super();this.listeners=new Map();this.visibilityState='visible';}
  addEventListener(type,fn,opts){super.addEventListener(type,fn,opts);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn,opts){super.removeEventListener(type,fn,opts);this.listeners.get(type)?.delete(fn);}
}
class FakeContext extends BrowserTarget {
  static instances=[];
  static resumeRefusals=0;
  constructor(){super();this.state='suspended';this.currentTime=1.25;this.sampleRate=100;this.nodes=[];this.destination=new Node('out');this.resumeCalls=0;this.closeCalls=0;FakeContext.instances.push(this);}
  node(kind,props={}){const node=Object.assign(new Node(kind),props);this.nodes.push(node);return node;}
  createGain(){return this.node('gain',{gain:new Param(1)});}
  createDynamicsCompressor(){return this.node('compressor',{threshold:new Param(-24),knee:new Param(30),ratio:new Param(12),attack:new Param(.003),release:new Param(.25)});}
  createBuffer(channels,length){const data=Array.from({length:channels},()=>new Float32Array(length));return {getChannelData:i=>data[i]};}
  createConvolver(){return this.node('convolver');}
  createDelay(){return this.node('delay',{delayTime:new Param()});}
  createBufferSource(){return this.node('buffer',{playbackRate:new Param(1)});}
  createBiquadFilter(){return this.node('filter',{frequency:new Param(),Q:new Param()});}
  createOscillator(){return this.node('oscillator',{frequency:new Param(),detune:new Param()});}
  createStereoPanner(){return this.node('panner',{pan:new Param()});}
  async resume(){this.resumeCalls++;if(FakeContext.resumeRefusals>0){FakeContext.resumeRefusals--;throw Error('gesture required');}if(this.state==='suspended'){this.state='running';this.dispatchEvent(new Event('statechange'));}}
  async suspend(){this.state='suspended';this.dispatchEvent(new Event('statechange'));}
  async close(){this.closeCalls++;this.state='closed';}
}
const withContext=async fn=>{
 const yourContext=globalThis.AudioContext,yourDocument=globalThis.document;
 FakeContext.instances=[];FakeContext.resumeRefusals=0;
 globalThis.AudioContext=FakeContext;globalThis.document=new BrowserTarget();
 try{await fn(globalThis.document)}finally{if(yourContext===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=yourContext;if(yourDocument===undefined)delete globalThis.document;else globalThis.document=yourDocument;}
};
test('native host retains one lazy context, existing compressor and routed live graph',()=>withContext(async doc=>{
 const audio=createAudio();audio.setVolume(.65);
 assert.equal(FakeContext.instances.length,0);assert.equal(audio.ready,false);
 audio.resume();await Promise.resolve();await Promise.resolve();
 assert.equal(FakeContext.instances.length,1);assert.equal(audio.ready,true);
 const c=FakeContext.instances[0],compressors=c.nodes.filter(n=>n.kind==='compressor');
 assert.equal(compressors.length,1);
 const squash=compressors[0];assert.deepEqual([squash.threshold.value,squash.knee.value,squash.ratio.value,squash.attack.value,squash.release.value],[-14,30,5,.003,.25]);
 assert.equal(squash.connections[0],c.destination);
 const master=c.nodes.find(n=>n.kind==='gain'&&n.connections.includes(squash));
 assert(master);assert.equal(master.gain.value,.65);
 // The existing procedural sources and echo graph feed the native master, rather than bypassing it.
 const gains=c.nodes.filter(n=>n.kind==='gain'&&n.connections.includes(master));
 assert(gains.length>=4);assert(c.nodes.some(n=>n.kind==='delay'));assert(c.nodes.some(n=>n.kind==='convolver'));
 assert(c.nodes.filter(n=>['oscillator','buffer'].includes(n.kind)).some(n=>n.starts>0));
 audio.setVolume(.35);assert.deepEqual(master.gain.events.at(-1),['linear',.35,1.255]);
 // In-game pause preserves its previous ambience-only duck, not a context suspend.
 audio.setPaused(true);
 assert(gains.some(n=>n.gain.events.some(e=>e[0]==='target'&&e[1]===.25&&e[3]===.2)));
 assert.equal(c.state,'running');assert.equal(doc.listeners.get('visibilitychange')?.size??0,0);
 await audio.dispose();assert.equal(c.closeCalls,1);assert.equal(audio.ready,false);
 audio.resume();await audio.dispose();assert.equal(c.closeCalls,1);assert.equal(FakeContext.instances.length,1);
 assert.equal(squash.connections.length,0);assert.equal(master.connections.length,0);
 assert.equal(c.listeners.get('statechange')?.size??0,0);
}));


test('a refused first resume can retry with the existing native gesture listener, without a second context',()=>withContext(async doc=>{
 FakeContext.resumeRefusals=1;
 const audio=createAudio();audio.resume();await Promise.resolve();await Promise.resolve();
 const c=FakeContext.instances[0];assert.equal(c.state,'suspended');
 assert((doc.listeners.get('pointerdown')?.size??0)>0);
 doc.dispatchEvent(new Event('pointerdown'));await Promise.resolve();await Promise.resolve();
 assert.equal(c.state,'running');assert.equal(FakeContext.instances.length,1);
 assert.equal(doc.listeners.get('pointerdown')?.size??0,0);
 await audio.dispose();assert.equal(c.closeCalls,1);
}));
test('disposing before any gesture prevents unnecessary context creation',()=>withContext(async()=>{
 const audio=createAudio(); const first=audio.dispose(), second=audio.dispose();
 assert.equal(first,second);await first;audio.resume();assert.equal(FakeContext.instances.length,0);
}));
