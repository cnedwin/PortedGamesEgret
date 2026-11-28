// Native shell browser acceptance. This runs only on a fresh local test browser/origin.
// Rules, assets and save data are not altered or decoded by the test runner.
import assert from 'node:assert/strict';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

// Normal runs use the repository's Playwright dependency. A separately installed test toolchain may be explicit.
if (process.env.JY_ACCEPT_PLAYWRIGHT_MODULES) {
  const index = pathToFileURL(resolve(process.env.JY_ACCEPT_PLAYWRIGHT_MODULES, 'playwright/index.mjs')).href;
  registerHooks({ resolve(name, context, next) {
    return name === 'playwright' ? { url: index, shortCircuit: true } : next(name, context);
  } });
}
const { serve, launch, matchBaseline, report } = await import('../../tools/lib/browser.mjs');
const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i=args.indexOf(name); return i<0?undefined:args[i+1]; };
const captureOnly = args.includes('--capture');
const update = args.includes('--update');
const shellOnly = args.includes('--shell-only');
const useWebkit = args.includes('--webkit');
const nativeGpu = args.includes('--native-gpu');
const runBattle = args.includes('--battle');
const battleFinish = args.includes('--manual-battle') ? 'manual' : 'auto-after-manual';
const battleOrder = (option('--battle-order')??'item,rest,move,skill').split(',');
const testRecovery = !args.includes('--no-recovery');
assert(!(captureOnly && update));
assert(!useWebkit || captureOnly, 'Use --webkit --capture; the reviewed baselines are Chromium.');
assert(!nativeGpu || captureOnly&&!useWebkit, 'Use --native-gpu --capture; software-rendered baselines remain unchanged.');
assert(!runBattle || args.includes('--travel')&&!shellOnly, 'Use --battle with --travel.');
assert(battleFinish!=='manual'||runBattle, 'Use --manual-battle with --battle.');
const out = resolve(option('--out') ?? join(gameDir, 'test/baseline/diff', 'acceptance'));
const sizes = (option('--sizes') ?? '1280x800,390x844,844x390,768x1024').split(',').map(value => {
  const match = /^(\d+)x(\d+)$/.exec(value);
  assert(match, 'Invalid viewport: '+value);
  return { name:value, width:Number(match[1]), height:Number(match[2]) };
});
assert(sizes.length && sizes.every(size=>size.width>=300&&size.height>=300));
const driveSize = sizes.find(size=>size.width>size.height&&size.height<=450) ?? sizes[0];
await mkdir(out, {recursive:true});
const receipt = { sizes, screens:[], steps:[], checks:[], errors:[], warnings:[], plannedFaults:[], mode:useWebkit?'WebKit iPhone profile (not a physical device)':nativeGpu?'Chromium native-GPU requested (inspect renderer evidence)':'Chromium software WebGL2 (not a physical device)' };
let server, proxy, browser, context, page;
const check = (ok, words, detail) => {
  receipt.checks.push({ok:Boolean(ok),words,...(detail===undefined?{}:{detail})});
  if (!ok) console.log('not ok - '+words);
  return ok;
};
const stamp = (name, detail) => {
  receipt.steps.push({name, at:Date.now(), ...(detail===undefined?{}:{detail})});
  console.log(name, detail===undefined?'':JSON.stringify(detail));
};
const phase = value => page.waitForFunction(value => globalThis.__jyNativeQa?.preparation?.()?.phase === value, value, {timeout:value==='ready'?120000:15000});
const active = id => page.waitForFunction(id=>globalThis.__jyNativeQa?.front?.stack?.snapshot()?.active===id,id,{timeout:10000});
function expectedError(message) {
  // Only the deliberately injected manifest failure and the explicitly canceled fetch are not regressions.
  return receipt.plannedFaults.some(fault=>fault.kind==='http-503' && message.includes('loading failed 503 '+fault.url))
    || receipt.plannedFaults.some(fault=>fault.kind==='http-503' && message.includes('status of 503') && message.includes('full-game.json'))
    || receipt.plannedFaults.some(fault=>fault.kind==='abort' && message.includes('aborted '+fault.url));
}
async function installTester() {
  await page.waitForFunction(()=>Boolean(globalThis.__jyNativeQa?.game&&globalThis.__jyNativeQa?.front&&globalThis.__jyNativeQa?.semantics?.snapshot),null,{timeout:120000});
  await page.evaluate(async()=>{
    const qa=globalThis.__jyNativeQa;
    const {createUiTester}=await import('@egret/engine/ui/testing');
    const t=createUiTester({semantics:qa.semantics,screens:qa.front.stack});
    const mapped=(x,y)=>{
      const r=qa.game.canvas.getBoundingClientRect(), f=qa.game.browser.frame;
      return{x:r.left+x*r.width/f.width,y:r.top+y*r.height/f.height};
    };
    const bounds=node=>{
      const b=node.bounds, a=mapped(b.x,b.y),z=mapped(b.x+b.width,b.y+b.height);
      return{x:a.x,y:a.y,width:z.x-a.x,height:z.y-a.y};
    };
    const safe=()=>{
      const s=qa.game.safe,a=qa.game.toStage(s.x,s.y),z=qa.game.toStage(s.x+s.width,s.y+s.height);
      const from=mapped(a.x,a.y),to=mapped(z.x,z.y);
      return{x:from.x,y:from.y,width:to.x-from.x,height:to.y-from.y};
    };
    const projection=()=> {
      const owners=(qa.game.canvas.getAttribute('aria-owns')??'').split(/\s+/).filter(Boolean);
      const boxes=owners.map(id=>document.getElementById(id)).filter(Boolean);
      return{owners,labels:boxes.flatMap(box=>Array.from(box.querySelectorAll('[aria-label]')).map(node=>node.getAttribute('aria-label')))};
    };
    const activeControls=()=>{
      qa.semantics.publish();
      const nodes=qa.semantics.snapshot.nodes, ids=new Map(nodes.map(node=>[node.id,node]));
      const modal=[...nodes].reverse().find(node=>node.role==='dialog'&&node.modal);
      const inside=node=>{if(!modal)return true;for(let at=node;at;at=ids.get(at.parent)){if(at.id===modal.id)return true;}return false;};
      return nodes.filter(node=>inside(node)&&!node.disabled&&['button','switch','checkbox','radio','tab','menuitem'].includes(node.role))
        .map(node=>({name:node.name,role:node.role,...bounds(node)}));
    };
    globalThis.__jyAccept=Object.freeze({
      press:q=>t.press(q), focus:q=>t.focus(q), state:q=>t.state(q), exists:q=>t.exists(q),
      bounds:q=>bounds(t.find(q)), names:q=>t.findAll(q).map(node=>node.name), outline:()=>t.outline(),
      activeControls,safe,projection,
      info:()=>({language:qa.front.words.language,active:qa.front.stack.snapshot().active,
        screen:{width:qa.game.browser.frame.width,height:qa.game.browser.frame.height},
        viewport:[innerWidth,innerHeight],backing:[qa.game.canvas.width,qa.game.canvas.height],
        canvas:qa.game.canvas.getBoundingClientRect().toJSON(),preparation:qa.preparation?.()?.phase,
        view:qa.front.getView?.('title')?.variant??null,
        runtime:location.pathname.includes('/play/'),loop:qa.game.browser.loop.snapshot().state})
    });
  });
}
const invoke=(method,arg)=>page.evaluate(([method,arg])=>globalThis.__jyAccept[method](arg),[method,arg]);
async function waitNamed(name) {
  await page.waitForFunction(name=>{ try{return globalThis.__jyAccept?.exists(name);}catch{return false;} },name,{timeout:10000});
}
async function waitEnabled(name) {
  await waitNamed(name);
  await page.waitForFunction(name=>{try{return !globalThis.__jyAccept.state(name).disabled}catch{return false}},name,{timeout:10000});
}
async function press(name) {
  await waitEnabled(name);
  await invoke('press',name);
}
async function pointerPress(name) {
  await waitEnabled(name);
  const b=await invoke('bounds',name);
  assert(b.width>0&&b.height>0, 'Native semantic target is not shown: '+name);
  const x=b.x+b.width/2,y=b.y+b.height/2;
  // Use the actual named control's published geometry, never a fixed coordinate.
  const pointerDetail=await page.evaluate(({x,y})=>{
    globalThis.__jyAcceptPointerTrace=[];
    if(!globalThis.__jyAcceptPointerListener){
      globalThis.__jyAcceptPointerListener=event=>globalThis.__jyAcceptPointerTrace.push({type:event.type,x:event.clientX,y:event.clientY,pointerType:event.pointerType,target:event.target?.tagName});
      for(const type of ['pointerdown','pointerup','pointercancel','click'])addEventListener(type,globalThis.__jyAcceptPointerListener,true);
    }
    const element=document.elementFromPoint(x,y),qa=globalThis.__jyNativeQa;
    return{target:element?.tagName,canvas:element===qa?.game?.canvas,location:[x,y]};
  },{x,y});
  if (useWebkit || (await page.evaluate(()=>navigator.maxTouchPoints>0))) await page.touchscreen.tap(x,y);
  else await page.mouse.click(x,y);
  const detail=await page.evaluate(()=>({events:globalThis.__jyAcceptPointerTrace,
    phase:globalThis.__jyNativeQa?.preparation?.()?.phase,pointer:globalThis.__jyNativeQa?.game?.pointer?{x:globalThis.__jyNativeQa.game.pointer.x,y:globalThis.__jyNativeQa.game.pointer.y}:undefined})).catch(()=>({navigation:true}));
  receipt.pointerTaps??=[];receipt.pointerTaps.push({name,bounds:b,...pointerDetail,...detail});
}
async function resize(size) {
  // A primitive receipt in the page verifies identity without serializing engine objects.
  await page.evaluate(()=>{globalThis.__jyAcceptGameIdentity=globalThis.__jyNativeQa.game;});
  await page.setViewportSize({width:size.width,height:size.height});
  await page.waitForFunction(({width,height})=>{
    const r=globalThis.__jyNativeQa?.game?.canvas?.getBoundingClientRect();
    return r && Math.abs(r.width-width)<3 && Math.abs(r.height-height)<3;
  },size,{timeout:5000});
  await page.waitForTimeout(140);
  check(await page.evaluate(()=>globalThis.__jyAcceptGameIdentity===globalThis.__jyNativeQa.game), 'same engine Play instance after '+size.name);
}
async function pixelEvidence(shot, regions) {
  // A screenshot is validated as pixels, not by DOM/semantic state or by generating a new baseline.
  return page.evaluate(async ({image,regions})=>{
    const bitmap=new Image();
    bitmap.src='data:image/png;base64,'+image;
    await bitmap.decode();
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No browser screenshot decoder');
    ctx.drawImage(bitmap,0,0);
    const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
    const sx=canvas.width/innerWidth,sy=canvas.height/innerHeight;
    function measure(rect, inset=false) {
      const x0=Math.max(0,Math.floor((rect.x+(inset?rect.width*.12:0))*sx)),
        y0=Math.max(0,Math.floor((rect.y+(inset?rect.height*.18:0))*sy)),
        x1=Math.min(canvas.width,Math.ceil((rect.x+rect.width*(inset?.88:1))*sx)),
        y1=Math.min(canvas.height,Math.ceil((rect.y+rect.height*(inset?.82:1))*sy));
      const colors=new Set(), stride=Math.max(1,Math.floor(Math.min(x1-x0,y1-y0)/70));
      let min=255,max=0,opaque=0,nonDark=0,samples=0;
      for(let y=y0;y<y1;y+=stride)for(let x=x0;x<x1;x+=stride){
        const at=(y*canvas.width+x)*4,r=data[at],g=data[at+1],b=data[at+2],a=data[at+3],l=.2126*r+.7152*g+.0722*b;
        colors.add((r>>4)*256+(g>>4)*16+(b>>4));min=Math.min(min,l);max=Math.max(max,l);
        if(a>128)opaque++;if(Math.max(r,g,b)>20)nonDark++;samples++;
      }
      return{colors:colors.size,lumaRange:max-min,opaque:opaque/Math.max(1,samples),nonDark:nonDark/Math.max(1,samples),samples};
    }
    return{size:[canvas.width,canvas.height],whole:measure({x:0,y:0,width:innerWidth,height:innerHeight}),
      controls:regions.map(({name,...rect})=>({name,...measure(rect,true)}))};
  },{image:shot.toString('base64'),regions});
}
async function capture(name, buttonNames=[], {baseline=true,geometry=true}={}) {
  const info=await invoke('info'), safe=await invoke('safe'),controls=await invoke('activeControls');
  const regions=[];
  for(const name of buttonNames) {
    await waitNamed(name);
    regions.push({name,...await invoke('bounds',name)});
  }
  const projection=await invoke('projection');
  check(projection.owners.length>0 && projection.labels.length>0,name+' real BrowserSemantics projection');
  if(geometry){
    // Name-based UI tests are not sufficient: measure native projected physical hit rectangles.
    const visible=controls.filter(c=>c.width>1&&c.height>1);
    for(const c of visible) {
      const wholly=c.x>=safe.x-1&&c.y>=safe.y-1&&c.x+c.width<=safe.x+safe.width+1&&c.y+c.height<=safe.y+safe.height+1;
      check(wholly,name+' safe '+c.name,c);
      check(c.width>=43.95&&c.height>=43.95,name+' 44px '+c.name,c);
    }
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
      const a=visible[i],b=visible[j],w=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),
        h=Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y);
      check(!(w>1&&h>1),name+' non-overlap '+a.name+' / '+b.name);
    }
  }
  let shot, pixels;
  for(let attempt=0;attempt<12;attempt++){
    shot=await page.screenshot({animations:'disabled'});
    pixels=await pixelEvidence(shot,regions);
    if(pixels.whole.colors>=12&&pixels.whole.lumaRange>=30&&pixels.whole.nonDark>.25&&pixels.controls.every(c=>c.samples>0&&c.colors>=3&&c.lumaRange>=24))break;
    await page.waitForTimeout(150);
  }
  const pixelOkay=pixels.whole.colors>=12&&pixels.whole.lumaRange>=30&&pixels.whole.nonDark>.25&&pixels.controls.every(c=>c.samples>0&&c.colors>=3&&c.lumaRange>=24);
  check(pixelOkay,name+' actual screenshot includes visible controls',pixels);
  await writeFile(join(out,name+'.png'),shot);
  const item={name,info,safe,controls,pixels,projectionCount:projection.labels.length};
  receipt.screens.push(item);
  if(baseline&&!captureOnly){
    const file=join(gameDir,'test/baseline',name+'.png');
    const exists=await access(file).then(()=>true,()=>false);
    if(!exists&&!update){check(false,'missing reviewed screenshot baseline: '+name);return;}
    if(!pixelOkay){check(false,'do not update an invalid screenshot baseline: '+name);return;}
    item.baseline=await matchBaseline(page,gameDir,name,{update,tolerance:40,limit:.02});
    check(item.baseline.written||item.baseline.passed,name+' reviewed baseline',item.baseline);
  }
  console.log('capture',name,pixels.whole.colors,'colors');
}
try {
  // The standard isolated static runner: no real player origin, data migration, or browser-profile clearing.
  server=await serve();
  let networkMode='fail', holdResolve, held=0, real=0, manifest;
  // Some WebKit/service-worker paths bypass Playwright request routing. Inject the planned fault
  // at this test-only loopback HTTP origin; all unmodified bytes stream through the standard server.
  proxy=createServer((request,response)=>{
    if(new URL(request.url,'http://loopback').pathname==='/JY/data/full-game.json'&&request.method==='GET'){
      if(networkMode==='fail'){
        receipt.plannedFaults.push({kind:'http-503',url:manifest});
        response.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});
        response.end('Test-only unavailable manifest');return;
      }
      if(networkMode==='hold'){
        held++;receipt.plannedFaults.push({kind:'abort',url:manifest});
        holdResolve=()=>{if(!response.destroyed)response.destroy();};
        return;
      }
      real++;
    }
    const url=new URL(request.url,server.url);
    if(url.origin!==new URL(server.url).origin){response.writeHead(400).end();return;}
    const upstream=httpRequest(url,{method:request.method,headers:request.headers},source=>{
      response.writeHead(source.statusCode??500,source.headers);source.pipe(response);
    });
    upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end();});
    request.on('aborted',()=>upstream.destroy());response.on('close',()=>upstream.destroy());
    request.pipe(upstream);
  });
  await new Promise(done=>proxy.listen(0,'127.0.0.1',done));
  const base='http://127.0.0.1:'+proxy.address().port+'/JY/';manifest=new URL('data/full-game.json',base).href;
  const launchAt=performance.now();
  if(useWebkit){const {webkit}=await import('playwright');browser=await webkit.launch();}
  else if(nativeGpu){const {chromium}=await import('playwright');browser=await chromium.launch({
    ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
    args:['--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']});}
  else browser=await launch();
  receipt.browser=browser.version();
  receipt.browserLaunchMs=Math.round(performance.now()-launchAt);
  const {devices}=await import('playwright');
  context=await browser.newContext({
    ...(useWebkit?devices['iPhone 15 Pro']:{hasTouch:true,deviceScaleFactor:1}),
    viewport:{width:sizes[0].width,height:sizes[0].height},reducedMotion:'reduce',
    serviceWorkers:'allow'
  });
  page=await context.newPage();
  if(nativeGpu){
    // A requested GPU is not a measured one. Probe the actual selected adapter
    // on the blank page, dispose that tiny diagnostic context, then run normally.
    receipt.renderer=await page.evaluate(()=>{const c=document.createElement('canvas'),gl=c.getContext('webgl2');if(!gl)return null;
      const ext=gl.getExtension('WEBGL_debug_renderer_info'),vendor=ext&&gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer=ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      gl.getExtension('WEBGL_lose_context')?.loseContext();return {vendor,renderer};});
    console.log('selected Chromium WebGL2 adapter',receipt.renderer);
  }
  page.on('pageerror',e=>{receipt.errors.push('pageerror '+e.message);console.log('pageerror',e.message);});
  page.on('console',m=>{
    if(m.type()==='error')receipt.errors.push(m.text()+(m.location().url?' '+m.location().url:''));
    else if(m.type()==='warning'&&/webgl|gpu|world3d|texture|renderer|asset|context|model|3d|glb/i.test(m.text()))
      receipt.warnings.push(m.text()+(m.location().url?' '+m.location().url:''));
  });
  page.on('response',response=>{
    if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))
      receipt.errors.push('loading failed '+response.status()+' '+response.url());
  });
  page.on('requestfailed',request=>{
    const error=request.failure()?.errorText??'request failed';
    if(request.url()===manifest && (/abort|cancel/i.test(error)))receipt.errors.push('aborted '+request.url());
    else receipt.errors.push(error+' '+request.url());
  });

  const url=new URL(base);url.searchParams.set('qa','1');url.searchParams.set('seed','7');
  const rootAt=performance.now();
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await installTester();await active('front-title');
  await waitEnabled('設定');
  stamp('native-root-title-ready',{ms:Math.round(performance.now()-rootAt),info:await invoke('info')});
  await phase('error');
  await waitEnabled('重試');
  check((await invoke('state','開始新旅程')).disabled,'new journey disabled until data is ready');
  stamp('deliberate-data-503',{faults:receipt.plannedFaults.length});
  for(const size of sizes){
    await resize(size);await capture('root-title-zh-'+size.name,['設定','遊戲資料','重試']);
  }
  await invoke('focus','設定');await press('設定');await active('front-settings');
  await press('English');
  await press('套用');
  await active('front-title');await waitEnabled('Settings');
  check((await invoke('info')).language==='en','language applied to native root title');
  check((await invoke('state','Settings')).focused,'named opener focus restored after settings apply');
  stamp('language-english-native');
  await press('Settings');await active('front-settings');
  for(const size of sizes){
    await resize(size);await capture('root-settings-en-'+size.name,['Apply','Back','Music and effects']);
  }
  const originalSound=(await invoke('state','Music and effects')).checked;
  await press('Music and effects');
  check((await invoke('state','Music and effects')).checked===!originalSound,'native sound switch changes state');
  await press('Apply');await active('front-title');
  await press('Settings');await active('front-settings');
  check((await invoke('state','Music and effects')).checked===!originalSound,'sound preference survives reopening settings');
  // Keep the isolated test game's original sound setting.
  await press('Music and effects');await press('Apply');await active('front-title');
  await resize(driveSize);
  await press('Game data');await active('boot-data');await waitNamed('Choose data archive');
  await press('Back');await active('front-title');
  stamp('native-game-data-picker-menu');
  networkMode='hold';
  await press('Retry');
  await page.waitForFunction(()=>globalThis.__jyNativeQa.preparation().phase==='checking',null,{timeout:5000});
  for(let i=0;i<50&&!held;i++)await new Promise(resolve=>setTimeout(resolve,100));
  assert(held>0,'Retry must start an actual data request');
  await pointerPress('Cancel');
  await phase('cancelled').catch(async error=>{receipt.cancelFailure={info:await invoke('info').catch(()=>null),outline:await invoke('outline').catch(()=>null)};const shot=await page.screenshot();await writeFile(join(out,'cancel-failure.png'),shot);throw error;});
  holdResolve?.();holdResolve=undefined;
  await waitEnabled('Retry');
  check(real===0,'cancelled data job has not started a real pack download');
  stamp('native-cancel-retry',{held,phase:(await invoke('info')).preparation});
  if(!shellOnly){
    networkMode='real';const started=performance.now();
    await press('Retry');
    await press('Settings');await active('front-settings');
    await phase('ready');
    check(real>0,'retry prepared the real local hosted data');
    check((await invoke('info')).active==='front-settings','data completion does not dismiss active native settings');
    stamp('real-data-prepared',{ms:Math.round(performance.now()-started),state:await invoke('info')});
    const navigation=page.waitForURL(u=>u.pathname.endsWith('/play/'),{timeout:180000});
    await press('Back').catch(error=>{
      if(!/context was destroyed|navigation/i.test(error.message))throw error;
    });
    await navigation;
    const runtimeAt=performance.now();
    await installTester();await active('front-title');
    await waitEnabled('New journey');
    stamp('runtime-native-title-ready',{ms:Math.round(performance.now()-runtimeAt),info:await invoke('info')});
    check((await invoke('info')).language==='en','runtime title retained language through service worker navigation');
    for(const size of sizes){
      await resize(size);await capture('runtime-title-en-'+size.name,['New journey','Settings','Guide']);
    }
    await resize(driveSize);
    const start=performance.now();
    await pointerPress('New journey');
    // A returning-player confirmation may exist; the fresh origin must still take the ordinary named action.
    const confirmation=await invoke('exists','Begin journey').catch(()=>false);
    if(confirmation)await pointerPress('Begin journey');
    try{
      await page.waitForFunction(()=>{
        const d=document.querySelector('#game')?.dataset;
        return d?.phase==='failed'||(d?.phase==='ready'&&d?.scene==='70');
      },null,{timeout:nativeGpu?60000:180000});
    }catch(error){
      await page.screenshot({path:join(out,'runtime-landing-timeout.png')});
      stamp('runtime-landing-timeout',await page.evaluate(()=>{const d=document.querySelector('#game')?.dataset??{};return{phase:d.phase,scene:d.scene,opening:d.opening,host:Boolean(globalThis.__jyNativeQa?.host)}}));throw error;
    }
    const landed=await page.evaluate(()=> {
      const d=document.querySelector('#game').dataset;
      return{scene:d.scene,phase:d.phase,opening:d.opening,homeView:d.homeView};
    });
    if(landed.phase==='failed'){stamp('runtime-landing-failed',landed);await page.screenshot({path:join(out,'runtime-landing-failed.png')});throw Error('Native game reported startup failure');}
    // Do not read or record the original dialogue, game-state data or save contents.
    stamp('native-start-landed',{ms:Math.round(performance.now()-start),...landed});
    if(args.includes('--travel')){
      // The Play receipt is a submitted engine frame, not a browser compositor
      // fence. Require the actual connected native scene host and two animation
      // turns before taking the independent 3D pixel evidence.
      await page.waitForFunction(()=>{const q=globalThis.__jyNativeQa,c=q?.game?.canvas,r=c?.getBoundingClientRect();return q?.host&&c?.isConnected&&r?.width>0&&r?.height>0},null,{timeout:15000});
      await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
      stamp('native-scene-host-presentable',{ms:Math.round(performance.now()-start)});
    }
    // Scene evidence only, not a deterministic art or story baseline.
    await page.waitForTimeout(500);
    const shot=await page.screenshot({animations:'disabled'}),pixels=await pixelEvidence(shot,[]);
    check(pixels.whole.colors>=12&&pixels.whole.lumaRange>=30&&pixels.whole.nonDark>.25,'landing scene visibly presented',pixels.whole);
    await writeFile(join(out,'runtime-landed.png'),shot);
    receipt.screens.push({name:'runtime-landed',pixels,landed});
    if (args.includes('--travel')) {
      const {acceptNativeTravel}=await import('./native-travel-browser.mjs');
      await acceptNativeTravel(page,{out,stamp,check,runBattle,battleFinish,battleOrder});
    }
    if (testRecovery) {
      // Re-open the prepared test origin's title, then insert only a synthetic unreadable record.
      // Never choose or mutate a real player's browser/profile, and never retain game data in the receipt.
      await page.reload({waitUntil:'domcontentloaded'});await installTester();await active('front-title');
      await page.evaluate(async()=>{
        const response=await fetch('/api/start');
        if(!response.ok)throw Error('Cannot read test save identity');
        const {saveIdentity}=await response.json();
        if(typeof saveIdentity!=='string'||!saveIdentity)throw Error('Invalid test save identity');
        const key=saveIdentity+':11';
        sessionStorage.setItem('__jyAcceptBadSaveKey',key);
        const db=await new Promise((resolve,reject)=>{
          const request=indexedDB.open('kys-egret-port');
          request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
          request.onupgradeneeded=()=>request.transaction.abort();
        });
        try{
          await new Promise((resolve,reject)=>{
            const tx=db.transaction('saves','readwrite');
            tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error??Error('Synthetic write failed'));
            tx.objectStore('saves').put({format:999,revision:77,qaMarker:'synthetic-unreadable-record'},key);
          });
        } finally{db.close();}
      });
      async function badSaveSummary(){
        return page.evaluate(async()=>{
          const key=sessionStorage.getItem('__jyAcceptBadSaveKey');
          if(!key)throw Error('Missing isolated test save identifier');
          const db=await new Promise((resolve,reject)=>{
            const request=indexedDB.open('kys-egret-port');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
          });
          const result=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
          try{
            const first=db.transaction('saves').objectStore('saves');
            const [main,keys]=await Promise.all([result(first.get(key)),result(first.getAllKeys())]);
            const backupKeys=keys.filter(value=>typeof value==='string'&&value.startsWith(key+':unread:'));
            const second=db.transaction('saves').objectStore('saves');
            const backups=await Promise.all(backupKeys.map(value=>result(second.get(value))));
            return{format:main?.format,revision:main?.revision,synthetic:main?.qaMarker==='synthetic-unreadable-record',
              valid:Boolean(main?.format===1&&Number.isSafeInteger(main.revision)&&Array.isArray(main.inventory)
                &&Array.isArray(main.openingEvents)&&main.location),
              backupCount:backupKeys.length,matchingBackups:backups.filter(value=>value?.format===999&&value?.revision===77
                &&value?.qaMarker==='synthetic-unreadable-record').length};
          } finally{db.close();}
        });
      }
      await page.reload({waitUntil:'domcontentloaded'});await installTester();await active('front-title');
      await waitEnabled('New journey');
      check((await invoke('state','Continue journey')).disabled,'unreadable auto record does not enable Continue');
      const before=await badSaveSummary();
      check(before.synthetic&&before.format===999&&before.revision===77&&before.backupCount===0,'bad record untouched on title',before);
      await pointerPress('New journey');await waitEnabled('Begin journey');
      const pending=await badSaveSummary();
      check(pending.synthetic&&pending.format===999&&pending.revision===77&&pending.backupCount===0,'bad record untouched before explicit confirmation',pending);
      await capture('recovery-confirmation',['Begin journey','Back'],{baseline:false});
      await press('Back');await active('front-title');
      const cancelled=await badSaveSummary();
      check(cancelled.synthetic&&cancelled.backupCount===0,'cancelling recovery leaves the original synthetic record unchanged',cancelled);
      await pointerPress('New journey');await waitEnabled('Begin journey');
      await pointerPress('Begin journey');
      await page.waitForFunction(()=>{const d=document.querySelector('#game')?.dataset;return d?.phase==='ready'&&d?.scene==='70';},null,{timeout:180000});
      let restored;
      for(let attempt=0;attempt<20;attempt++){
        restored=await badSaveSummary();
        if(restored.valid&&restored.matchingBackups===1)break;
        await page.waitForTimeout(150);
      }
      check(restored.valid&&!restored.synthetic&&restored.revision>=1&&restored.backupCount===1&&restored.matchingBackups===1,
        'explicit recovery atomically retains unread record and installs compatible record',restored);
      receipt.recovery={before,pending,cancelled,restored};
      stamp('synthetic-bad-save-recovery',receipt.recovery);
    }

  }
} catch(error) {
  receipt.failure=error.stack??String(error);
  check(false,'acceptance route completed',receipt.failure);
} finally {
  await context?.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  if(proxy){proxy.closeAllConnections?.();await new Promise(done=>proxy.close(done));}
  await server?.close();
  const unexpected=receipt.errors.filter(message=>!expectedError(message));
  receipt.unexpected=unexpected;
  await writeFile(join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  report('JY native UI browser acceptance',receipt.checks.map(c=>[c.ok,c.words]),unexpected);
}
