// Diagnostic-only extension of the published dense-profile plugin.
// Never writes game or engine source. Deferred work retains only the latest
// semantic revision and a sink callback, NOT a prepared mesh candidate.
import fs from 'node:fs';
import path from 'node:path';
import {transformSource as baseTransform} from './engine-instrument.mjs';

const known=[
  'vendor/engine/dist/web/BrowserFrameLoop.js','vendor/engine/dist/web/BrowserPlay.js',
  'vendor/engine/dist/web/BrowserSemantics.js','vendor/engine/dist/Engine.js',
  'vendor/engine/dist/web/WebGL2Host.js','src/main.mjs',
  'vendor/spine/dist/instance.js','vendor/spine/dist/display.js'
];
function one(s,a,b) {
  const i=s.indexOf(a);if(i<0||i!==s.lastIndexOf(a))throw Error('Expected one anchor: '+a.slice(0,200));
  return s.slice(0,i)+b+s.slice(i+a.length);
}
const measure=(name,expr)=>'__spineTime('+JSON.stringify(name)+',()=>'+expr+')';
const timeHelper='const __spineTime=(name,fn)=>{const qa=globalThis.__lanternSpineQA;if(!qa?.current?.collect)return fn();const t=performance.now();try{return fn();}finally{qa.timing(name,performance.now()-t);}};\n';
const setup=String.raw`
const __lanternSpineQA=globalThis.__lanternSpineQA ??= (()=>{
  const queue=new Map();
  function hash(h,value){for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  const rounded=(key,v)=>typeof v==='number'&&Number.isFinite(v)?Math.round(v*1e6)/1e6:v;
  const qa={
    current:null,queue,
    begin(pendingBefore,limit){
      const profile=globalThis.__lanternDenseProfile;
      this.current={collect:Boolean(profile?.active),defer:profile?.mode==='defer-display'&&(Boolean(profile?.active)||profile?.fixedDt!==undefined),
        checkpoint:Boolean(profile?.checkpoint),pendingBefore,limit,skipReason:null,pendingStart:queue.size,pendingAfter:null,
        semanticDeliveries:0,events:0,eventDigest:2166136261,eventRoundedDigest:2166136261,semanticDigest:2166136261,semanticRoundedDigest:2166136261,semanticTickSum:0,semanticInstances:0,
        deferred:0,flushed:0,dropped:0,published:0,revisionChecks:0,revisionMismatch:0,
        latestRevisionSum:0,publishedRevisionSum:0,timings:{},timingCounts:{},renderBranch:false,rendered:false};
    },
    timing(name,ms){const f=this.current;if(!f?.collect)return;f.timings[name]=(f.timings[name]??0)+ms;f.timingCounts[name]=(f.timingCounts[name]??0)+1;},
    deliver(snapshot){
      const f=this.current;if(!f?.collect)return;
      f.semanticDeliveries++;f.latestRevisionSum+=snapshot.revision;f.events+=snapshot.events.length;
      for(const event of snapshot.events){f.eventDigest=hash(f.eventDigest,JSON.stringify(event));f.eventRoundedDigest=hash(f.eventRoundedDigest,JSON.stringify(event,rounded));}
      if(f.checkpoint){const t=performance.now();f.semanticDigest=hash(f.semanticDigest,JSON.stringify([snapshot.revision,snapshot.bones,snapshot.slots,snapshot.tracks]));f.semanticRoundedDigest=hash(f.semanticRoundedDigest,JSON.stringify([snapshot.revision,snapshot.bones,snapshot.slots,snapshot.tracks],rounded));f.semanticTickSum+=snapshot.tickId;f.semanticInstances++;this.timing('spine.checkpoint.digest',performance.now()-t);}
    },
    enqueue(key,revision,flush){queue.set(key,{revision,flush});if(this.current?.collect)this.current.deferred++;},
    drop(key){if(queue.delete(key)&&this.current?.collect)this.current.dropped++;},
    publish(key,actual,expected,flushed=false){
      queue.delete(key);
      if(this.current?.collect){const f=this.current;f.published++;f.publishedRevisionSum+=actual;f.revisionChecks++;if(flushed)f.flushed++;if(actual!==expected)f.revisionMismatch++;}
      if(actual!==expected)throw Error('Diagnostic Spine revision mismatch: '+actual+' != '+expected);
    },
    beforeRender(){
      const f=this.current;if(f)f.renderBranch=true;
      const t=performance.now();
      try{
        for(const [key,row] of queue){
          const result=row.flush(row.revision);
          if(result===null)this.drop(key);
          else if(queue.has(key))throw Error('Diagnostic deferred Spine row failed to publish');
        }
        if(queue.size!==0)throw Error('Diagnostic stale Spine rows before capture');
      }finally{if(f?.collect)this.timing('spine.display.flush',performance.now()-t);}
    },
    skipped(reason,pending){const f=this.current;if(f){f.skipReason=reason;f.pendingAfter=pending;}},
    submitted(){if(this.current)this.current.rendered=true;},
    end(){
      const f=this.current;this.current=null;
      if(!f)return;
      f.pendingEnd=queue.size;
      if(f.collect)globalThis.__lanternDenseProfile?.spine?.(f);
    }
  };return qa;
})();
`;

function deepLoop(s){
  s=one(s,"    if (state !== 'running')\n            return;\n        try {","    if (state !== 'running')\n            return;\n        __lanternSpineQA.begin(host===undefined?null:host.getStatus().pendingFrames,limit);\n        try {");
  s=one(s,'const __lpPending=host===undefined?undefined:host.getStatus().pendingFrames;','const __lpPending=host===undefined?undefined:host.getStatus().pendingFrames;\n                if(__lanternSpineQA.current)__lanternSpineQA.current.pendingAfter=__lpPending??null;');
  s=one(s,'globalThis.__lanternDenseProfile?.backpressure?.({pendingFrames:__lpPending,limit});','__lanternSpineQA.skipped("pending",__lpPending);\n                    globalThis.__lanternDenseProfile?.backpressure?.({pendingFrames:__lpPending,limit});');
  s=one(s,"__lpMeasure(\"engine.frame.render\",()=>engine.renderSharedFrame(typeof frame === 'function' ? frame() : frame));","__lanternSpineQA.beforeRender();\n                        __lpMeasure(\"engine.frame.render\",()=>engine.renderSharedFrame(typeof frame === 'function' ? frame() : frame));\n                        __lanternSpineQA.submitted();");
  s=one(s,'if (host !== undefined || !backpressure(error))\n                            throw error;\n                        skipped++;','if (host !== undefined || !backpressure(error))\n                            throw error;\n                        __lanternSpineQA.skipped("host-backpressure",null);\n                        skipped++;');
  s=one(s,'}finally{if(__lpT_engine_frame_cpu!==undefined)__lpP_engine_frame_cpu?.end(__lpT_engine_frame_cpu);}','}finally{__lanternSpineQA.end();if(__lpT_engine_frame_cpu!==undefined)__lpP_engine_frame_cpu?.end(__lpT_engine_frame_cpu);}');
  return setup+s;
}

function deepInstance(s){
  // One phase timer per Core call, not per bone or vertex. CPU sums instead
  // of nested trace object churn for each puppet.
  s=s.replace(/\banimation\.update\(([^;\n]*)\);/g,(_,arg)=>measure('spine.animation.update','animation.update('+arg+')')+';');
  s=s.replace(/\banimation\.apply\(current\);/g,()=>measure('spine.animation.apply','animation.apply(current)')+';');
  s=s.replace(/\bcurrent\.updateWorldTransform\(([^;\n]*)\);/g,(_,arg)=>measure('spine.physics.solve','current.updateWorldTransform('+arg+')')+';');
  s=one(s,'function publish() {','function publish() { return __spineTime("spine.semantic.publish",()=>{');
  s=one(s,'\n    }\n    let committed = publish();','\n    });}\n    let committed = publish();');
  s=one(s,'let drawSink;','let drawSink, __spinePublishedRevision=-1;');
  s=one(s,'const delivered = committed.events;','const delivered = committed.events;\n        globalThis.__lanternSpineQA?.deliver(committed);');
  const before='candidate = drawSink?.prepare(skeleton);\n            candidate?.commit();';
  const after=String.raw`const qa=globalThis.__lanternSpineQA;
            if(drawSink && qa?.current?.defer){
                const sink=drawSink, expected=revision;
                qa.enqueue(instance, expected, expectedRevision=>{
                    if(disposed||drawSink!==sink)return null;
                    if(revision!==expectedRevision)throw Error("Diagnostic Spine queued revision not latest");
                    let delayed;
                    try{
                        delayed=__spineTime("spine.display.prepare",()=>sink.prepare(skeleton));
                        __spineTime("spine.display.commit",()=>delayed.commit());
                        __spinePublishedRevision=revision;
                    }catch(cause){try{delayed?.abort();}catch{}throw cause;}
                    __spineTime("spine.display.retire",()=>delayed.retire?.());
                    qa.publish(instance,__spinePublishedRevision,expectedRevision,true);
                    return __spinePublishedRevision;
                });
            }else {
                candidate=drawSink?__spineTime("spine.display.prepare",()=>drawSink.prepare(skeleton)):undefined;
                if(candidate){
                    __spineTime("spine.display.commit",()=>candidate.commit());
                    __spinePublishedRevision=revision;
                    qa?.publish(instance,__spinePublishedRevision,revision);
                }
            }`;
  s=one(s,before,after);
  s=one(s,'candidate?.retire?.();','if(candidate)__spineTime("spine.display.retire",()=>candidate.retire?.());');
  s=one(s,'for (const event of delivered) {','__spineTime("spine.events.deliver",()=>{\n            for (const event of delivered) {');
  s=one(s,'\n            }\n        }\n        finally {\n            dispatching = false;','\n            }\n            });\n        }\n        finally {\n            dispatching = false;');
  s=one(s,'disposed = true;\n        commands.length = 0;','disposed = true;\n        globalThis.__lanternSpineQA?.drop(instance);\n        commands.length = 0;');
  s=one(s,'drawSink = sink;\n                candidate.retire?.();','drawSink = sink;\n                __spinePublishedRevision=revision;\n                candidate.retire?.();');
  s=one(s,'if (drawSink === sink)\n                    drawSink = undefined;','if (drawSink === sink) {\n                    globalThis.__lanternSpineQA?.drop(instance);\n                    drawSink = undefined;\n                }');
  return timeHelper+s;
}

function deepDisplay(s){
  s=one(s,'const next = copySpineDraws(renderer.render(skeleton, false, undefined, 2), port.asset, limits, materials);',
    'const extracted=__spineTime("spine.display.extract",()=>renderer.render(skeleton, false, undefined, 2));\n            const next=__spineTime("spine.display.copy",()=>copySpineDraws(extracted, port.asset, limits, materials));');
  s=one(s,'const prepared = reuse ? next.map((row, i) => bindings[i].prepare(row.lease, row.geometry)) : [];',
    'const prepared = reuse ? __spineTime("spine.mesh.prepare",()=>next.map((row, i) => bindings[i].prepare(row.lease, row.geometry))) : [];');
  s=one(s,'for (const row of next) {\n                        const binding',
    '__spineTime("spine.mesh.create",()=>{\n                    for (const row of next) {\n                        const binding');
  s=one(s,'\n                    Object.freeze(staged);','\n                    });\n                    Object.freeze(staged);');
  s=one(s,'for (const item of prepared)\n                            item.commit();','__spineTime("spine.mesh.commit",()=>{for (const item of prepared) item.commit();});');
  return timeHelper+s;
}

export function transformSource(relative,input,{compact=false}={}){
  let s=baseTransform(relative,input,{compact,backpressure:true});
  if(relative===known[0])s=deepLoop(s);
  else if(relative===known[5]){
    // The engine clock subtracts adjacent accumulated seconds; startup-dependent
    // rounding around 1/60 can alter the fixed-step/Spine segment count. Keep
    // admitted clock identity, but give the test fixture one exact delta.
    s=one(s,'const dt = Math.min(tick?.deltaSeconds ?? seconds, 0.1) * PACE;',
      'const dt = (globalThis.__lanternDenseProfile?.fixedDt ?? Math.min(tick?.deltaSeconds ?? seconds, 0.1)) * PACE;');
    s=one(s,"__lpMeasure('demo.spine.advance',()=>{ for (const puppet of moving) puppet.advance(tick); });",
      "const __lpFixed=globalThis.__lanternDenseProfile?.fixedDt;\n    const __lpSpineTick=__lpFixed===undefined?tick:{tickId:tick.tickId,elapsedSeconds:tick.elapsedSeconds,deltaSeconds:__lpFixed};\n    __lpMeasure('demo.spine.advance',()=>{ for (const puppet of moving) puppet.advance(__lpSpineTick); });");
  }
  else if(relative===known[6])s=deepInstance(s.replace(/\r\n/g,'\n'));
  else if(relative===known[7])s=deepDisplay(s.replace(/\r\n/g,'\n'));
  return s;
}
export function instrumentEnginePlugin({root,compact=false}){
  const absolute=path.resolve(root);
  return {name:'lantern-isolated-spine-backpressure-profiler',setup(build){
    build.onLoad({filter:/\.(js|mjs)$/},args=>{
      const rel=path.relative(absolute,args.path).replaceAll('\\','/');
      if(!known.includes(rel))return;
      return {contents:transformSource(rel,fs.readFileSync(args.path,'utf8'),{compact}),loader:'js',resolveDir:path.dirname(args.path)};
    });
  }};
}
export {known};
