// Diagnostic-only low-overhead spans for Egret 94bd70fb. No runtime source is written.
import fs from 'node:fs';
import path from 'node:path';

const targets=[
  'vendor/engine/dist/web/BrowserFrameLoop.js','vendor/engine/dist/web/BrowserPlay.js',
  'vendor/engine/dist/web/BrowserSemantics.js','vendor/engine/dist/Engine.js',
  'vendor/engine/dist/web/WebGL2Host.js','src/main.mjs'
];
const helper="const __lpMeasure=(name,fn)=>{const p=globalThis.__lanternProfiler,t=p?.begin(name);try{return fn();}finally{if(t!==undefined)p?.end(t);}};\n";
function one(src,before,after){
  const i=src.indexOf(before);
  if(i<0||i!==src.lastIndexOf(before))throw Error('Expected exactly one anchor: '+before.slice(0,200));
  return src.slice(0,i)+after+src.slice(i+before.length);
}
function parts(name){
  const n=name.replaceAll('.','_');
  return [
    '\nconst __lpP_'+n+'=globalThis.__lanternProfiler,__lpT_'+n+'=__lpP_'+n+'?.begin('+JSON.stringify(name)+');',
    '\nif(__lpT_'+n+'!==undefined)__lpP_'+n+'?.end(__lpT_'+n+');\n'
  ];
}
function wrap(src,start,end,name){
  const [a,b]=parts(name);
  src=one(src,start,start+a+'\ntry{\n');
  return one(src,end,'\n}finally{'+b+'}\n'+end);
}
function section(src,start,end,name){
  // No extra lexical scope: subsequent scene phases still read original locals.
  const [a,b]=parts(name);
  src=one(src,start,a+'\n'+start);
  return one(src,end,b+end);
}
function expr(src,expression,name){return one(src,expression,'__lpMeasure('+JSON.stringify(name)+',()=>'+expression+')');}

export function transformSource(relative,original,{compact=false,backpressure=true}={}){
  if(compact)throw Error('Low overhead tail probe requires original expanded stage/backing');
  const src=original.replace(/\r\n/g,'\n');
  if(src.includes('__lpMeasure'))throw Error('Already instrumented '+relative);
  let s=src;
  switch(relative){
    case targets[0]: {
      s=wrap(s,'const tick = (milliseconds) => {','\n    };\n    const stop = () => {','engine.frame.cpu');
      s=one(s,'const gap = last === undefined ? 0 : Math.max(0, (milliseconds - last) / 1000);',
        'const gap = globalThis.__lanternDenseProfile?.fixedDt ?? (last === undefined ? 0 : Math.max(0, (milliseconds - last) / 1000));');
      s=expr(s,'engine.advanceTime(seconds)','engine.clock');
      s=expr(s,'update?.(delta)','engine.frame.update');
      s=expr(s,'beforeRender?.()','engine.frame.beforeRender');
      s=expr(s,'engine.renderSharedFrame(optionsForFrame)','engine.frame.render');
      s=one(s,'if (pending !== undefined && pending >= limit)\n                    skipped++;\n                else {',
        'globalThis.__lanternDenseProfile?.admission?.({pendingFrames:pending??null,limit,accepted:pending===undefined||pending<limit});\n                if (pending !== undefined && pending >= limit) {\n                    skipped++;\n                    globalThis.__lanternDenseProfile?.backpressure?.({pendingFrames:pending,limit});\n                }\n                else {');
      s=one(s,'consecutiveRenderFailures = attempt;\n                            recoveredRenderFailures++;',
        'consecutiveRenderFailures = attempt;\n                            recoveredRenderFailures++;\n                            globalThis.__lanternDenseProfile?.retry?.({attempt,code:error?.code??null});');
      break;
    }
    case targets[1]: {
      s=one(s,'views.tick(seconds);\n            syncLabelVisibility();', '__lpMeasure("engine.ui.views",()=>views.tick(seconds));\n            __lpMeasure("engine.ui.labels",()=>syncLabelVisibility());');
      s=expr(s,'options.semantics.publish()','engine.ui.semantics.publish');
      break;
    }
    case targets[2]: {
      s=wrap(s,'function apply(snapshot) {','\n    }\n    /** The node an event of the page is about:','engine.ui.semantics.projection');
      break;
    }
    case targets[3]: {
      // Same capture scope and frame assignment as the earlier diagnostic.
      const [a,b]=parts('engine.frame.capture');
      s=one(s,'const content = prepared === undefined ? collectSharedFrameContent(this.stage) : prepared.captureContent(this.stage);',
        'let frame;'+a+'\ntry{\nconst content = prepared === undefined ? collectSharedFrameContent(this.stage) : prepared.captureContent(this.stage);');
      s=one(s,'const frame = freezeSharedFrame({','frame = freezeSharedFrame({');
      s=one(s,'this.nextFrameId++;','this.nextFrameId++;\n}finally{'+b+'}');
      break;
    }
    case targets[4]: {
      const [a,b]=parts('engine.webgl2.prepare');
      s=one(s,'let admitted;\n            try {','let admitted;'+a+'\ntry{\n            try {');
      s=one(s,'return staging ? this.admitUpload(admitted, staging) : this.submit(admitted);',
        '\n}finally{'+b+'}\nreturn staging ? this.admitUpload(admitted, staging) : this.submit(admitted);');
      for(const [x,n] of [
        ['prepareSharedDraws2D(frame, width, height, options, layerWrite ? undefined : this.retention)','geometry'],
        ['packSharedDraws2D(prepared)','pack'],
        ['materializeSharedPages2D(storage, cold, this.snapshot(), this.resourceCpu)','texture'],
        ['prepareSharedBatches2D(packed, options.maxUploadBytes, this.scratch, staging ? undefined : prepared.retention)','batch']
      ])s=expr(s,x,'engine.webgl2.prepare.'+n);
      s=wrap(s,'submit(p) {','\n    }\n    prepareSurface(record)','engine.webgl2.submit');
      s=section(s,'for (let index = 0; index < p.projections.length; index++) {','this.drawRecord(record, layout, p.arena);','engine.webgl2.upload');
      s=one(s,'this.drawRecord(record, layout, p.arena);',
        '__lpMeasure("engine.webgl2.draw",()=>this.drawRecord(record, layout, p.arena));\n            globalThis.__lanternDenseProfile?.render?.({drawCalls:this.frameDrawCalls,batchRanges:p.arena.sharedRanges?.length,width,height,commands:p.storage.prepared.frame?.commands?.length});');
      break;
    }
    case targets[5]: {
      // Match the previous exact fixed-clock fixture. This changes only diagnostic
      // time input; no game rules, effects, RNG or output work are skipped.
      s=one(s,'const burst = (made, x, y, count) => {','let __lpBursts=0,__lpParticlesRequested=0;\nconst burst = (made, x, y, count) => {');
      s=one(s,'if (count <= 0) return;\n  made.x = x;','if (count <= 0) return;\n  if(globalThis.__lanternDenseProfile?.active){++__lpBursts;__lpParticlesRequested+=count;}\n  made.x = x;');
      s=wrap(s,'function update(seconds) {','\n}\n\n// How fast the stage','demo.frame.update');
      s=one(s,'const dt = Math.min(tick?.deltaSeconds ?? seconds, 0.1) * PACE;','__lpBursts=0;__lpParticlesRequested=0;\n  const dt = (globalThis.__lanternDenseProfile?.fixedDt ?? Math.min(tick?.deltaSeconds ?? seconds, 0.1)) * PACE;');
      const [ra,rb]=parts('demo.rules.total');
      s=one(s,'while (carry >= STEP && freeze <= 0) {',ra+'\nwhile (carry >= STEP && freeze <= 0) {');
      s=one(s,'happen(stepAct(act, asked, STEP));\n      }',
        'const __lpEvents=__lpMeasure("demo.rules.step",()=>stepAct(act,asked,STEP));\n        __lpMeasure("demo.events",()=>happen(__lpEvents));\n      }'+rb);
      s=section(s,'const still = paused || freeze > 0,','const before = performance.now();','demo.actor.present');
      s=one(s,'let shown = 0;','let shown = 0, posedClones = 0;');
      s=one(s,'if (inView(clone.x, centre)) moving.push(puppet);','if (inView(clone.x, centre)) { moving.push(puppet); posedClones++; }');
      s=one(s,'for (const puppet of moving) puppet.advance(tick);',
        'const __lpFixed=globalThis.__lanternDenseProfile?.fixedDt;\n    const __lpSpineTick=__lpFixed===undefined?tick:{tickId:tick.tickId,elapsedSeconds:tick.elapsedSeconds,deltaSeconds:__lpFixed};\n    __lpMeasure("demo.spine.advance",()=>{ for(const puppet of moving) puppet.advance(__lpSpineTick); });');
      s=section(s,"// The palace's fires.","for (const made of [sparks, straw, dust, flames]) made.update(still ? 0 : dt);","demo.fx.scene");
      s=section(s,'for (const made of [sparks, straw, dust, flames]) made.update(still ? 0 : dt);','lead += (hero.facing * 90 - lead)','demo.fx.update');
      s=section(s,'lead += (hero.facing * 90 - lead)','if(state.notice && clock>noticeUntil)','demo.camera.visual');
      s=one(s,'state.stickAxis=input.stickState().shift; state.heldActions=input.heldActions(); ui.refresh();',
        'state.stickAxis=input.stickState().shift; state.heldActions=input.heldActions(); __lpMeasure("demo.ui.refresh",()=>ui.refresh());\n  globalThis.__lanternDenseProfile?.frame?.({shown,posedClones,moving:moving.length,bones:moving.reduce((sum,puppet)=>sum+puppet.bones,0),actTime:act.time,stage:onStage,playing,paused,bursts:__lpBursts,particlesRequested:__lpParticlesRequested,particlesAlive:[sparks.alive,straw.alive,dust.alive,flames.alive],crowdText:state.crowd,notice:state.notice,combo:state.combo});');
      break;
    }
  }
  return s===src?original:helper+s;
}
export function instrumentEnginePlugin({root,compact=false,backpressure=true}){
  const exact=path.resolve(root);
  return {name:'lantern-94bd-tail-probe',setup(build){
    build.onLoad({filter:/\.(mjs|js)$/},args=>{
      const rel=path.relative(exact,args.path).replaceAll('\\','/');
      if(!targets.includes(rel))return;
      return {contents:transformSource(rel,fs.readFileSync(args.path,'utf8'),{compact,backpressure}),loader:'js',resolveDir:path.dirname(args.path)};
    });
  }};
}
