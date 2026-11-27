// The real initial backdrop and its assets stay identical; only the byte requests may overlap host setup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, mapById } from '../src/sim/maps.mjs';
import { createGame } from '../src/sim/rules.mjs';
import { BOARD_PROP_NAMES, figureModelNames, initialModelNames } from '../src/view/model-plan.mjs';
import { MAX_INITIAL_MODEL_PREFETCH, modelBytes, modelUrl, prefetchInitialModels } from '../src/view/model-bytes.mjs';
import { backdropSetup, prepareStartupHosts } from '../src/startup-models.mjs';
await import('../vendor/node-register.mjs');
const {loadModel,loadProblems}=await import('../src/view/assets.mjs');

const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const sample=()=>({ok:true,status:200,arrayBuffer:async()=>Uint8Array.from([1,2,3]).buffer});
const urlBase=new URL('https://example.invalid/StarBanner/assets/models/');
const fetchLog=(url,opts)=>{throw Error('Unexpected model fetch: '+url+' '+opts);};

test('the initial title planning uses the same props, buildings, commanders, units and cargo as battle loading',()=>{
  const fixtures={wheat:['pikeman','swordsman'],coves:['archer','swordsman'],spine:['hound','pikeman','swordsman']};
  for(const map of MAPS){
    const setup=backdropSetup(new URLSearchParams({map:map.id}),()=>{throw Error('Explicit map must not draw randomness');});
    const game=createGame(mapById(setup.map),setup.sides,setup.seed);
    const names=initialModelNames(game);
    assert.deepEqual(names,[...new Set([...BOARD_PROP_NAMES,...figureModelNames(game)])]);
    assert.deepEqual([...names].sort(),[...BOARD_PROP_NAMES,'stronghold','barracks','tower','port','village','seline','vireta',...fixtures[map.id]].sort());
  }
  const setup=backdropSetup(new URLSearchParams({map:'wheat'})),game=createGame(mapById(setup.map),setup.sides,setup.seed);
  game.units[0].cargo.push({type:'mage'});
  assert.ok(figureModelNames(game).includes('mage'));
});

test('the actual resolved world quality initiates exactly one title-map request list before the slower overlay completes',async()=>{
  const world=defer(),overlay=defer(),requests=[],startup={};let time=0,randomCalls=0;
  const task=prepareStartupHosts({params:new URLSearchParams(),startup,createWorld:()=>world.promise,createOverlay:()=>overlay.promise,
    now:()=>++time,random:()=>{randomCalls++;return .9;},fetcher:async url=>{requests.push(url.href);return sample();}});
  await flush();
  assert.equal(requests.length,0,'no tier is guessed before the native 3D stage is ready');
  world.resolve({quality:'medium'});
  await flush();
  assert.equal(randomCalls,1);
  assert.equal(requests.length,14);
  assert.ok(requests.every(url=>url.endsWith('-mid.glb')));
  assert.equal(startup.modelPrefetch.requested,14);
  assert.equal(startup.modelPrefetch.set,'mid');
  assert.equal(startup.modelPrefetch.downloaded,14);
  assert.ok(startup.modelsRequested>=startup.world&&startup.modelsDownloaded>=startup.modelsRequested);
  assert.equal(startup.overlay,undefined);
  overlay.resolve({});const found=await task;
  assert.ok(startup.modelsRequested<startup.overlay);
  assert.equal(found.initial.setup.map,'spine');
  const game=createGame(mapById(found.initial.setup.map),found.initial.setup.sides,found.initial.setup.seed);
  assert.deepEqual(new Set(startup.modelPrefetch.names),new Set(initialModelNames(game)));
  assert.deepEqual(new Set(requests),new Set(initialModelNames(game).map(name=>modelUrl(name,'mid').href)));
  found.initial.prefetch.cancel();
});

test('direct battle, early overlay and stage refusal have no initial-title downloads or random selection',async()=>{
  const noRandom=()=>{throw Error('No initial title should be selected');};
  let requests=0;
  const fetcher=(...args)=>{requests++;return fetchLog(...args);};
  const world=defer(),overlay=defer(),directStartup={};
  const directTask=prepareStartupHosts({params:new URLSearchParams({battle:'wheat'}),startup:directStartup,
    createWorld:()=>world.promise,createOverlay:()=>overlay.promise,random:noRandom,fetcher});
  world.resolve({quality:'high'});await flush();overlay.resolve({});
  assert.equal((await directTask).initial,null);
  assert.equal(directStartup.modelsRequested,undefined);
  const late=defer(),first=defer(),earlyStartup={};
  const earlyTask=prepareStartupHosts({params:new URLSearchParams(),startup:earlyStartup,createWorld:()=>late.promise,
    createOverlay:()=>first.promise,random:noRandom,fetcher});
  first.resolve({});await flush();late.resolve({quality:'low'});
  assert.equal((await earlyTask).initial,null);
  assert.equal(earlyStartup.modelsRequested,undefined);
  const invalid=new Error('WORLD3D_INPUT_INVALID quality');
  const refusal=prepareStartupHosts({params:new URLSearchParams({quality:'bogus'}),startup:{},createWorld:async()=>{throw invalid;},
    createOverlay:async()=>({}),random:noRandom,fetcher});
  await assert.rejects(refusal,error=>error===invalid);
  assert.equal(requests,0);
});

test('model prefetch consumes exact URLs once, without a second transport or retained raw-byte cache',async()=>{
  const requests=[];
  const fetcher=async(url)=>{requests.push(url.href);return sample();};
  const prefetched=prefetchInitialModels(['oak','oak','pine'],'low',{base:urlBase,fetcher});
  assert.deepEqual(prefetched.names,['oak','pine']);
  assert.deepEqual(await prefetched.done,{requested:2,downloaded:2,failed:0});
  assert.equal(prefetched.remaining,2);
  assert.deepEqual(await modelBytes('oak','low',{base:urlBase,prefetch:prefetched,fetcher}),Uint8Array.from([1,2,3]));
  assert.equal(requests.length,2);
  assert.equal(prefetched.remaining,1);
  await modelBytes('pine','mid',{base:urlBase,prefetch:prefetched,fetcher});
  await modelBytes('pine','low',{base:new URL('https://example.invalid/other/'),prefetch:prefetched,fetcher});
  assert.equal(requests.length,4,'different tier and base never steal the original low-tier promise');
  await modelBytes('pine','low',{base:urlBase,prefetch:prefetched,fetcher});
  assert.equal(requests.length,4);
  assert.equal(prefetched.remaining,0);
  prefetched.cancel();
});

test('a failed early download is consumed by the original loadModel failure path, without an extra transport or premature error count',async()=>{
  let requests=0;
  const fetcher=async()=>{requests++;return {ok:false,status:404};};
  const before=loadProblems.count, prefetched=prefetchInitialModels(['oak'],'low',{base:urlBase,fetcher});
  assert.deepEqual(await prefetched.done,{requested:1,downloaded:0,failed:1});
  assert.equal(loadProblems.count,before);
  const warnings=[],warn=console.warn;console.warn=(...args)=>warnings.push(args);
  try{assert.equal(await loadModel('oak','low',urlBase,prefetched),null);}
  finally{console.warn=warn;}
  assert.equal(requests,1);
  assert.equal(loadProblems.count,before+1);
  assert.ok(warnings.some(args=>args.join(' ').includes('oak: HTTP 404')));
  assert.equal(prefetched.remaining,0);
});

test('startup failure cancels early byte requests, and a late world cannot create a ticket after overlay rejection',async()=>{
  const world=defer(),overlay=defer(),requests=[],startup={},failure=new Error('overlay failed');
  const fetcher=(url,{signal})=>{
    requests.push({url:url.href,signal});
    return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
  };
  const task=prepareStartupHosts({params:new URLSearchParams({map:'wheat'}),startup,createWorld:()=>world.promise,
    createOverlay:()=>overlay.promise,fetcher});
  const rejected=assert.rejects(task,err=>err===failure);
  world.resolve({quality:'low'});await flush();assert.equal(requests.length,13);
  overlay.reject(failure);await rejected;await flush();
  assert.ok(requests.every(r=>r.signal.aborted));
  assert.equal(startup.modelPrefetch.failed,13);
  const late=defer(),alreadyFailed=defer(),second={};
  const next=prepareStartupHosts({params:new URLSearchParams(),startup:second,createWorld:()=>late.promise,createOverlay:()=>alreadyFailed.promise,
    random:()=>{throw Error('No title after failed host');},fetcher:fetchLog});
  const nextRejected=assert.rejects(next,err=>err===failure);
  alreadyFailed.reject(failure);await nextRejected;late.resolve({quality:'high'});await flush();
  assert.equal(second.modelsRequested,undefined);
});

test('startup prefetch has a fixed bound even if a future model list grows',async()=>{
  const requests=[],names=Array.from({length:MAX_INITIAL_MODEL_PREFETCH+4},(_,i)=>'model'+i);
  const prefetched=prefetchInitialModels([...names,names[0]],'high',{fetcher:async url=>{requests.push(url.href);return sample();}});
  assert.equal(requests.length,MAX_INITIAL_MODEL_PREFETCH);
  assert.equal(prefetched.names.length,MAX_INITIAL_MODEL_PREFETCH);
  await prefetched.done;prefetched.cancel();
  assert.equal(prefetched.remaining,0);
});
