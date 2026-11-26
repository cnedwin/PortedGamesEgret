// QA-only esbuild plugin; modifies loaded strings, never writes game or vendor source.
import fs from 'node:fs';
import path from 'node:path';




const targets=[
  'vendor/engine/dist/web/BrowserFrameLoop.js','vendor/engine/dist/web/BrowserPlay.js',
  'vendor/engine/dist/web/BrowserSemantics.js','vendor/engine/dist/Engine.js',
  'vendor/engine/dist/web/WebGL2Host.js','src/main.mjs'
];
const helper='const __lpMeasure=(name,fn)=>{const p=globalThis.__lanternProfiler,t=p?.begin(name);try{return fn();}finally{if(t!==undefined)p?.end(t);}};\n';
function one(src,before,after) {
  const where=src.indexOf(before);
  if(where<0 || where!==src.lastIndexOf(before)) throw new Error('Expected exactly one anchor: '+before.slice(0,200));
  return src.slice(0,where)+after+src.slice(where+before.length);
}
function prefix(name) { const n=name.replaceAll('.','_'); return '\nconst __lpP_'+n+'=globalThis.__lanternProfiler,__lpT_'+n+'=__lpP_'+n+'?.begin('+JSON.stringify(name)+');try{\n'; }
function suffix(name) { const n=name.replaceAll('.','_'); return '\n}finally{if(__lpT_'+n+'!==undefined)__lpP_'+n+'?.end(__lpT_'+n+');}\n'; }
function wrap(src,start,end,name) {
  src=one(src,start,start+prefix(name));
  return one(src,end,suffix(name)+end);
}
function expression(src,expr,name) {return one(src,expr,'__lpMeasure('+JSON.stringify(name)+',()=>'+expr+')');}

export function transformSource(relative,original,{compact=false,backpressure=false}={}) {
  const src=original.replace(/\r\n/g,'\n');
  if(src.includes('const __lpMeasure=') || src.includes('__lpT_engine')) throw new Error('Already instrumented: '+relative);
  let s=src;
  switch(relative) {
    case targets[0]: {
      s=wrap(s,'const tick = (milliseconds) => {','\n    };\n    const stop = () => {','engine.frame.cpu');
      s=one(s,'const gap = last === undefined ? 0 : Math.max(0, (milliseconds - last) / 1000);','const gap = globalThis.__lanternDenseProfile?.fixedDt ?? (last === undefined ? 0 : Math.max(0, (milliseconds - last) / 1000));');
      s=expression(s,'engine.advanceTime(seconds)','engine.clock');
      s=expression(s,'update?.(delta)','engine.frame.update');
      s=expression(s,"engine.renderSharedFrame(typeof frame === 'function' ? frame() : frame)",'engine.frame.render');
      if(backpressure) s=one(s,'if (host !== undefined && host.getStatus().pendingFrames >= limit)\n                    skipped++;\n                else {','const __lpPending=host===undefined?undefined:host.getStatus().pendingFrames;\n                if (__lpPending !== undefined && __lpPending >= limit) {\n                    skipped++;\n                    globalThis.__lanternDenseProfile?.backpressure?.({pendingFrames:__lpPending,limit});\n                }\n                else {');
      break;
    }
    case targets[1]: {
      s=one(s,'views.tick(seconds);\n            syncLabelVisibility();\n            if (options.semantics !== undefined)',"const __lpSkip=globalThis.__lanternDenseProfile?.active && ['native-static','native-off'].includes(globalThis.__lanternDenseProfile?.mode);\n            if(!__lpSkip) __lpMeasure('engine.ui.views',()=>views.tick(seconds));\n            __lpMeasure('engine.ui.labels',()=>syncLabelVisibility());\n            if (options.semantics !== undefined && !__lpSkip)");
      s=expression(s,'options.semantics.publish()','engine.ui.semantics.publish');
      break;
    }
    case targets[2]: {
      s=wrap(s,'function apply(snapshot) {','\n    }\n    /** The node an event of the page is about:','engine.ui.semantics.projection');
      break;
    }
    case targets[3]: {
      s=one(s,'const content = prepared === undefined ? collectSharedFrameContent(this.stage) : prepared.captureContent(this.stage);','let frame;'+prefix('engine.frame.capture')+'const content = prepared === undefined ? collectSharedFrameContent(this.stage) : prepared.captureContent(this.stage);');
      s=one(s,'const frame = freezeSharedFrame({','frame = freezeSharedFrame({');
      s=one(s,'this.nextFrameId++;','this.nextFrameId++;'+suffix('engine.frame.capture'));
      break;
    }
    case targets[4]: {
      s=one(s,'let admitted;\n            try {','let admitted;\n'+prefix('engine.webgl2.prepare')+'\n            try {');
      s=one(s,'return staging ? this.admitUpload(admitted, staging) : this.submit(admitted);',suffix('engine.webgl2.prepare')+'return staging ? this.admitUpload(admitted, staging) : this.submit(admitted);');
      for (const [expr,name] of [
        ['prepareSharedDraws2D(frame, width, height, options, layerWrite ? undefined : this.retention)','geometry'],
        ['packSharedDraws2D(prepared)','pack'],
        ['materializeSharedPages2D(storage, cold, this.snapshot(), this.resourceCpu)','texture'],
        ['prepareSharedBatches2D(packed, options.maxUploadBytes, this.scratch, staging ? undefined : prepared.retention)','batch']
      ]) s=expression(s,expr,'engine.webgl2.prepare.'+name);
      s=wrap(s,'submit(p) {','\n    }\n    prepareSurface(record)','engine.webgl2.submit');
      s=one(s,'for (let index = 0; index < p.projections.length; index++) {',prefix('engine.webgl2.upload')+'for (let index = 0; index < p.projections.length; index++) {');
      s=one(s,'this.drawRecord(record, layout, p.arena);',suffix('engine.webgl2.upload')+"__lpMeasure('engine.webgl2.draw',()=>this.drawRecord(record, layout, p.arena));\n            globalThis.__lanternDenseProfile?.render?.({drawCalls:this.frameDrawCalls,batchRanges:p.arena.sharedRanges?.length,width,height,commands:p.storage.prepared.frame?.commands?.length});");
      break;
    }
    case targets[5]: {
      s=wrap(s,'function update(seconds) {','\n}\n\n// How fast the stage','demo.frame.update');
      s=one(s,'while (carry >= STEP && freeze <= 0) {',prefix('demo.rules')+'while (carry >= STEP && freeze <= 0) {');
      s=one(s,'happen(stepAct(act, asked, STEP));\n      }','happen(stepAct(act, asked, STEP));\n      }'+suffix('demo.rules'));
      s=one(s,'let shown = 0;','let shown = 0, posedClones = 0;');
      s=one(s,'if (inView(clone.x, centre)) moving.push(puppet);','if (inView(clone.x, centre)) { moving.push(puppet); posedClones++; }');
      s=one(s,'for (const puppet of moving) puppet.advance(tick);',"__lpMeasure('demo.spine.advance',()=>{ for (const puppet of moving) puppet.advance(tick); });");
      s=one(s,'measure(shown, moving, performance.now() - before);','measure(shown, moving, performance.now() - before);\n  globalThis.__lanternDenseProfile?.frame?.({shown,posedClones,moving:moving.length,bones:moving.reduce((sum,puppet)=>sum+puppet.bones,0),actTime:act.time,stage:onStage,playing,paused});');
      if(s.includes('ui.refresh()')) {
        s=s.replace(/\bui(?:\?\.|\.)refresh\(\)/g,()=> "__lpMeasure('demo.ui.refresh',()=>ui?.refresh())");
        s=one(s,"state.stickAxis=input.stickState().shift; state.heldActions=input.heldActions(); __lpMeasure('demo.ui.refresh',()=>ui?.refresh());","state.stickAxis=input.stickState().shift; state.heldActions=input.heldActions(); __lpMeasure('demo.ui.refresh',()=>ui?.refresh());\n  if (globalThis.__lanternDenseProfile?.mode==='native-off' && playing) { for(const view of Object.values(ui.views)) if(view?.visible) view.hide(); }");
        s=one(s,"backend:query.get('backend')==='webgpu' && navigator.gpu?'webgpu':'webgl2',","backend:query.get('backend')==='webgpu' && navigator.gpu?'webgpu':'webgl2',\n    blendSpace: globalThis.__lanternProfileBlend==='linear' || query.get('profileBlend')==='linear'?'linear':'srgb',");
      }
      if(compact) {
        if(s.includes("fit:'expand'")) {
          s=one(s,"fit:'expand'","fit:'contain'");
          s=one(s,'pixelRatio:initialPixelRatio(),','pixelRatio:1.58, /* QA matched 16:9 backing */');
        } else {
          s=one(s,'pixelRatio: Math.min(2, Math.max(1, (devicePixelRatio || 1) * 0.75)),','pixelRatio: 1.58, /* QA matched 16:9 backing */');
        }
      }
      break;
    }
  }
  if(s===src) return original;
  return helper+s;
}

export function instrumentEnginePlugin({root,compact=false,backpressure=false}) {
  const absolute=path.resolve(root);
  return {name:'lantern-isolated-qa-profiler',setup(build){
    build.onLoad({filter:/\.(mjs|js)$/},args=>{
      const rel=path.relative(absolute,args.path).replaceAll('\\','/');
      if(!targets.includes(rel)) return;
      return {contents:transformSource(rel,fs.readFileSync(args.path,'utf8'),{compact,backpressure}),loader:'js',resolveDir:path.dirname(args.path)};
    });
  }};
}
