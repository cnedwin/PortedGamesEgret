// Real browser input supplements the engine's single-state screen verifier with gameplay states.
// Run from the game: node test/screens.mjs --out <new folder> [--mode rounds|perf|baselines|menus]
// --game and --verify allow a frozen prior game to be measured by the same new verifier.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const game = resolve(args.get('--game') ?? dirname(fileURLToPath(new URL('../index.html', import.meta.url))));
const output = resolve(args.get('--out') ?? join(game, 'test', 'screens-output', String(Date.now())));
const verifier = resolve(args.get('--verify') ?? join(game, 'vendor/egret/tools/verify-screens.mjs'));
const { SCREENS, controlFindings } = await import(pathToFileURL(verifier));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)) : 'playwright');
const { PNG } = createRequire(import.meta.url)(join(game, 'vendor/egret/third-party/pngjs/lib/png.js'));
const modes = new Set(['screens', 'rounds','perf','baselines','menus']);
const mode = args.get('--mode') ?? 'screens';
assert(modes.has(mode), 'Unknown test mode');
await mkdir(dirname(output), { recursive: true });
await mkdir(output, { recursive: false });
const mime = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.woff2':'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const file = join(game, pathname === '/' ? 'index.html' : pathname);
    const from = relative(game, file);
    if (isAbsolute(from) || from.startsWith('..') || !(await stat(file)).isFile()) throw Error('outside');
    response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control':'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/`;
const hardware=process.env.MAHJONG_HARDWARE==='1';
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  headless: !hardware,
  args:[...(hardware?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']),'--autoplay-policy=no-user-gesture-required'] });
const pending = [];
const profiles = Object.entries(SCREENS);
const report = { browser:browser.version(), rendering:hardware?'foreground hardware candidate':'headless SwiftShader', mode, game, screens:[], rounds:[] };
if(hardware){const cdp=await browser.newBrowserCDPSession();try{report.gpu=(await cdp.send('SystemInfo.getInfo')).gpu;}catch{}finally{await cdp.detach();}}

const wait = (page, test, value, timeout = 30000) => page.waitForFunction(test, value, { timeout, polling: 30 });
const snapshot = page => page.evaluate(() => {
  const { app, game, screen, ui, semantics } = window.mahjong;
  const hand = app.match?.hand;
  return { screen, ready:window.mahjong.ready, human:app.human?.options, selected:app.selected,
    count:hand?.events.length, events:hand?.events.slice(-25), scores:app.match?.scores, result:hand?.result,
    focus:ui?.focused, semanticFocus:semantics?.publish()?.focused, paused:game?.paused,
    autoplay:app.autoplay, backend:game?.browser?.backend };
});
async function open(screen, seed, reduce = true) {
  const context = await browser.newContext({ viewport:{ width:screen.width, height:screen.height },
    deviceScaleFactor:screen.scale, isMobile:screen.touch, hasTouch:screen.touch,
    reducedMotion:reduce ? 'reduce' : 'no-preference' });
  pending.push(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', problem => errors.push('pageerror: ' + problem.message));
  page.on('console', message => {
    if (message.type() === 'error' && !/GPU stall due to ReadPixels|GL Driver Message|favicon\.ico/.test(message.text())) errors.push('console: ' + message.text().slice(0,400));
  });
  page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) errors.push('http: ' + response.status() + ' ' + response.url()); });
  await page.addInitScript(insets => {
    const seen = { warnings:[], controls:undefined, screen:undefined };
    globalThis.__mahjongScreenCheck = seen;
    globalThis.__egretAgent = {
      insets, warning: warning => seen.warnings.push({code:warning.code,message:warning.message}),
      controls: (controls, screen) => { seen.controls = controls; seen.screen = screen; }
    };
    // Observe the real packaged voice and score elements without replacing the decoder or media clock.
    const media = new Set();
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) { media.add(this); return Reflect.apply(originalPlay, this, args); };
    window.__mahjongMediaForTest = media;
  }, screen.insets);
  await page.goto(url + '?seed=' + seed + '&lang=' + (args.get('--lang') ?? 'zh'));
  try { await wait(page, () => window.mahjong?.ready && window.mahjong.screen === 'title'); }
  catch (error) {
    const loading=await page.evaluate(()=>({text:document.querySelector('#loading')?.textContent,screen:window.mahjong?.screen,ready:window.mahjong?.ready})).catch(()=>null);
    await context.close();
    throw Error('Opening title failed: '+error.message+'; '+JSON.stringify({loading,errors}));
  }
  return { page, context, errors, screen };
}
async function click(run, name) {
  const { page, screen } = run;
  await wait(page, name => Boolean(window.mahjong.ui.point(name)), name);
  const point = await page.evaluate(name => window.mahjong.ui.point(name), name);
  assert(point.x >= 0 && point.y >= 0 && point.x < page.viewportSize().width && point.y < page.viewportSize().height,
    `Control ${name} outside viewport: ${JSON.stringify(point)}`);
  await (screen.touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
}
const frames = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const pace = page => page.evaluate(() => { window.mahjong.app.speed = 16; window.mahjong.game.timeScale = 16; });
const waitHuman = page => wait(page, () => !!window.mahjong.app.human || window.mahjong.screen === 'result');
async function start(run) {
  await pace(run.page);
  await click(run, 'startButton');
  await wait(run.page, () => window.mahjong.screen === 'play');
  await waitHuman(run.page);
}
async function play(run, action) {
  const before = await snapshot(run.page);
  assert(before.human, 'The player must have a legal choice');
  if (action.type === 'discard') {
    assert(before.human.discard.includes(action.id), 'Discard is offered by the rule engine');
    if (before.selected !== action.id) {
      await click(run, 'tile-' + action.id);
      await wait(run.page, id => window.mahjong.app.selected === id, action.id);
    }
    await click(run, 'tile-' + action.id);
  } else {
    const id = action.type === 'kong' && before.human.type === 'act' && before.human.kongs?.length > 1
      && before.human.kongs[0].kind !== action.kind ? 'action-kong-' + action.kind : 'action-' + action.type;
    await click(run, id);
    if (action.type === 'chow' && before.human.chows?.length > 1) {
      const which = before.human.chows.findIndex(row => row.every(id => action.ids.includes(id)));
      assert(which >= 0, 'Chosen Chow is offered by the rules');
      await click(run, 'chow-choice-' + which);
    }
  }
  if (action.type !== 'pass') {
    await wait(run.page, ({count, action}) => window.mahjong.app.match.hand.events.slice(count).some(event =>
      event.seat === 0 && event.type === action.type && (action.id === undefined || action.id === event.id) &&
      (!action.ids || action.ids.every(id => event.tiles?.includes(id)))), { count:before.count, action });
  } else {
    await wait(run.page, count => window.mahjong.screen === 'result' || !window.mahjong.app.human || window.mahjong.app.match.hand.events.length !== count, before.count);
  }
  return before;
}
const selfDraw = [{ type:'discard', id:113 }, { type:'pong' }, { type:'discard', id:126 },
  { type:'discard', id:78 }, { type:'discard', id:85 }, { type:'kong' }, { type:'discard', id:57 }, { type:'win' }];

function overlay(png, insets, scale) {
  const {width, height, data} = png;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (y >= insets.top * scale && y < height - insets.bottom * scale && x >= insets.left * scale && x < width - insets.right * scale) continue;
    const index = (y * width + x) * 4;
    data[index] = Math.round(data[index] / 2 + 127.5);
    data[index+1] = Math.round(data[index+1] / 2);
    data[index+2] = Math.round(data[index+2] / 2);
  }
  return PNG.sync.write(png);
}
async function capture(run, device, state) {
  const {page, screen, errors} = run;
  await frames(page);
  // The native verifier samples controls up to four times a second. Let that sample reflect this state.
  await page.waitForTimeout(350);
  const observed = await page.evaluate(() => {
    const {app, game, ui, semantics} = window.mahjong;
    const seen = globalThis.__mahjongScreenCheck;
    const box = game.canvas.getBoundingClientRect();
    const surface=game.browser.frame ?? game;
    const css = r => ({x:box.x+r.x*box.width/surface.width,y:box.y+r.y*box.height/surface.height,
      width:r.width*box.width/surface.width,height:r.height*box.height/surface.height});
    const isControl = n => ['button','radio','tab','switch','checkbox','slider'].includes(n.role) && !n.inert && !n.disabled && !n.hidden;
    const tree = semantics.publish();
    const semantic = tree.nodes.filter(isControl).filter(n => n.bounds?.width > 0 && n.bounds.height > 0).map(n => ({name:n.id,...css(n.bounds)}));
    const hand = semantic.filter(n => /:tile-\d+$/.test(n.name));
    const cards = [...document.querySelectorAll('.plate[data-seat]')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden')
      .map(node => { const b = node.getBoundingClientRect(); return {name:'seat-'+node.dataset.seat,x:b.x,y:b.y,width:b.width,height:b.height}; });
    // The upgraded HUD exposes informational native bounds for every formerly DOM seat plate.
    for(const node of tree.nodes.filter(n=>n.id.startsWith('mahjong-hud:seat-')&&!n.hidden&&n.bounds?.width>0&&n.bounds.height>0)) cards.push({name:node.id,...css(node.bounds)});
    return { agent:seen, semantic, hand, cards, game:{width:game.width,height:game.height,canvas:[game.canvas.width,game.canvas.height],backend:game.browser.backend},
      scrolls:document.scrollingElement.scrollWidth>innerWidth+1 || document.scrollingElement.scrollHeight>innerHeight+1,
      canvases:[...document.querySelectorAll('canvas')].map(c => {const b=c.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}),
      focus:ui.focused, semanticFocus:tree.focused, phase:app.human?.options.type, tableau:window.mahjong.screen, board:app.board };
  });
  const safe = {x:screen.insets.left,y:screen.insets.top,width:screen.width-screen.insets.left-screen.insets.right,
    height:screen.height-screen.insets.top-screen.insets.bottom};
  const controls = observed.agent.controls ?? observed.semantic;
  const findings = controlFindings(controls, safe, screen.touch);
  for (const card of observed.cards) findings.push(...controlFindings([card], safe, false));
  if (observed.scrolls) findings.push({check:'noScroll',severity:'error'});
  if (errors.length) findings.push({check:'noErrors',severity:'error',errors:[...errors]});
  const area = c => Math.max(0,Math.min(c.x+c.width,screen.width)-Math.max(c.x,0))*Math.max(0,Math.min(c.y+c.height,screen.height)-Math.max(c.y,0));
  const shown = Math.max(0,...observed.canvases.map(area))/(screen.width*screen.height);
  if (shown < .75) findings.push({check:'fills',severity:'warning',shown});
  const png = PNG.sync.read(await page.screenshot());
  const picture = join(output, device+'-'+state+'.png');
  await writeFile(picture,overlay(png,screen.insets,screen.scale));
  const result = {device,state,size:[screen.width,screen.height],profile:screen,safe,controlSource:observed.agent.controls===undefined?'semantics supplement':'native agent',
    controlCount:controls.length,handCount:observed.hand.length,handMinCss:observed.hand.length?[Math.min(...observed.hand.map(n=>n.width)),Math.min(...observed.hand.map(n=>n.height))]:null,
    errorCount:findings.filter(f=>f.severity==='error').length,warningCount:findings.filter(f=>f.severity==='warning').length,
    findings,engineWarnings:observed.agent.warnings,shown,game:observed.game,focus:observed.focus,semanticFocus:observed.semanticFocus,phase:observed.phase, board:observed.board,picture};
  report.screens.push(result);
  console.log(device,state,`${result.errorCount} errors / ${result.warningCount} warnings`,result.controlSource,'hand CSS',result.handMinCss);
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  return result;
}

async function screenWalk(name, screen) {
  let run;
  try {
    run = await open(screen,16);
    await capture(run,name,'title');
    await click(run,'rulesButton');
    await wait(run.page, () => !!window.mahjong.ui.point('rulesClose'));
    await capture(run,name,'rules');
    await click(run,'rulesClose');
    await start(run);
    let claim = await snapshot(run.page);
    assert(claim.human?.chows?.length >= 2,'Seed 16 offers two legal Chow choices');
    await capture(run,name,'play');
    await click(run,'action-chow');
    await wait(run.page, () => !!window.mahjong.ui.point('chow-choice-1'));
    await capture(run,name,'chow');
    await click(run,'chow-choice-1');
    await wait(run.page, () => window.mahjong.app.human?.options.type === 'act');
    await capture(run,name,'play-act');
  } finally { await run?.context.close(); }
  try {
    run = await open(screen,79);
    await start(run);
    if((await snapshot(run.page)).human?.type==='act') await capture(run,name,'play-full');
    for (const action of selfDraw) { await waitHuman(run.page); await play(run,action); }
    await wait(run.page, () => window.mahjong.screen === 'result');
    await capture(run,name,'result');
  } finally { await run?.context.close(); }
}

// Seed 288 naturally offers Pong, added Kong, two Chow choices and a self-draw, in one hand.
// Every event must be produced by the ordinary rules and actual browser pointer events.
// The nine choices were enumerated against the unchanged rules, with computer seats answering first.
const completeHand = [
  [10, {type:'pong'}], [11, {type:'discard',id:44}], [25, {type:'discard',id:32}],
  [34, {type:'kong',kind:33}], [39, {type:'discard',id:67}], [46, {type:'chow',ids:[26,34]}],
  [47, {type:'discard',id:28}], [55, {type:'discard',id:105}], [63, {type:'win'}]
];
const sizes = [[873,325],[852,393],[411,813],[768,1024],[1024,768],[1920,1080]];

async function rotate(run, size, settled = 220) {
  const page = run.page;
  const insets = run.screen.width === 852
    ? size.width===852?SCREENS['phone-notch-wide'].insets:SCREENS['phone-notch'].insets
    : run.screen.insets;
  await page.evaluate(insets=>{ window.__egretAgent.insets=insets; },insets);
  await page.setViewportSize(size);
  await frames(page);
  if(settled) await page.waitForTimeout(settled);
}
const voice = page => page.evaluate(() => {
  const voices = [...window.__mahjongMediaForTest].filter(m=>m.src.startsWith('blob:'));
  return voices.map((m,i)=>({id:i,src:m.src,time:m.currentTime,duration:m.duration,ready:m.readyState,paused:m.paused})).at(-1) ?? null;
});
async function identity(page) {
  return page.evaluate(() => {
    const {game,app,semantics,ui}=window.mahjong;
    const old = window.__mahjongRetainedTestRefs;
    const now = {game,match:app.match,semantics,ui,view:app.view};
    window.__mahjongRetainedTestRefs ??= now;
    return old ? Object.fromEntries(Object.keys(now).map(key=>[key,now[key]===old[key]])) : null;
  });
}
async function checkRetained(page) {
  const kept = await identity(page);
  assert(kept && Object.values(kept).every(Boolean),'Rotation must retain engine, match, UI, scene and semantic tree: '+JSON.stringify(kept));
  return kept;
}
async function frameIntervals(page, count=90) {
  return page.evaluate(count=>new Promise(done=>{
    const times=[]; let previous;
    function next(now){if(previous!==undefined)times.push(now-previous);previous=now;
      if(times.length<count)requestAnimationFrame(next);else{
        const sorted=[...times].sort((a,b)=>a-b), avg=times.reduce((a,b)=>a+b,0)/times.length;
        done({samples:times.length,meanMs:avg,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),over50:times.filter(t=>t>50).length});
      }}
    requestAnimationFrame(next);
  }),count);
}

async function completeWalk(width,height) {
  const screen = {width,height,scale:hardware||width>=1920?1:width>=600&&height>=600?2:3,touch:!hardware&&width<1920,
    insets:width===852?SCREENS['phone-notch-wide'].insets:{top:0,right:0,bottom:0,left:0}};
  const name = `${width}x${height}`;
  const run = await open(screen,288,false), page=run.page;
  const result={device:name,seed:288,checks:[],actions:[],errors:run.errors};
  report.rounds.push(result);
  const check=(ok,label,data)=>{ result.checks.push({ok:Boolean(ok),label,data});assert(ok,label); };
  const original={width,height}, turned={width:height,height:width};
  try {
    await click(run,'startButton');
    await wait(page,()=>window.mahjong.screen==='play');
    await identity(page);
    // Pause a real playing voice; rotate with its original media object retained and resume the same clip.
    let speaking;
    try {
      await wait(page,()=>[...window.__mahjongMediaForTest].some(m=>m.src.startsWith('blob:')&&!m.paused&&m.currentTime>.08&&m.duration-m.currentTime>.4),null,6500);
      speaking=await voice(page);
    } catch { result.voiceLimitation='No voice clip with enough remaining duration was observed before the first player choice.'; }
    // Also rotate while the clip is actually audible, before the pause test.
    let pausedInTurned=false;
    if(speaking){
      await rotate(run,turned,0);await checkRetained(page);pausedInTurned=true;
      const live=await voice(page);
      if(live?.src===speaking.src&&live.time>=speaking.time&&!live.paused){
        result.activeVoice={sameClip:true,before:speaking.time,after:live.time};speaking=live;
      }else result.activeVoiceLimitation='The opening clip ended or changed naturally before the post-resize sample.';
    }
    await click(run,'pauseButton');
    await wait(page,()=>window.mahjong.game.paused&&!!window.mahjong.ui.point('resumeButton'));
    const paused=await snapshot(page), pausedVoice=await voice(page);
    await rotate(run,pausedInTurned?original:turned);
    const kept=await checkRetained(page), held=await snapshot(page), heldVoice=await voice(page);
    check(held.paused&&held.count===paused.count&&held.focus===paused.focus&&held.semanticFocus===paused.semanticFocus,
      'Pause, event stream and focus survive rotation', {before:paused.focus,after:held.focus,kept});
    // The fixed table must match the native stage projection while the simulation clock is stopped, not only after resume.
    const projection=await page.evaluate(()=>{
      const {app,game}=window.mahjong,root=app.view.root,b=app.board;
      const points=[[0,0],[1280,0],[0,720],[1280,720]].map(([x,y])=>{
        const actual=root.localToGlobal(x,y),expected=game.toStage(b.x+(b.rotation?-y:x)*b.scale,b.y+(b.rotation?x:y)*b.scale);
        return Math.hypot(actual.x-expected.x,actual.y-expected.y);
      });
      return {nativeUiParent:root.parent===game.ui,maxDrift:Math.max(...points),board:b};
    });
    check(projection.nativeUiParent&&projection.maxDrift<.1,'Fixed table and drawn felt are aligned immediately while paused',projection);
    await page.screenshot({path:join(output,name+'-paused-rotated.png')});
    if(speaking&&pausedVoice&&pausedVoice.src===speaking.src&&heldVoice?.src===pausedVoice.src){
      check(heldVoice.paused&&Math.abs(heldVoice.time-pausedVoice.time)<.035,'Same paused voice clock is held during rotation',{before:pausedVoice.time,after:heldVoice.time});
    }
    await click(run,'resumeButton');
    await wait(page,()=>!window.mahjong.game.paused);
    if(speaking&&heldVoice?.src===speaking.src&&heldVoice.time<heldVoice.duration-.12){
      await wait(page,({src,time})=>[...window.__mahjongMediaForTest].some(m=>m.src===src&&m.currentTime>time+.05),heldVoice,3500);
      result.voiceResumed={sameClip:true,elapsedAfter:(await voice(page))?.time};
    }
    if(!pausedInTurned)await rotate(run,original);
    await checkRetained(page);
    await waitHuman(page);
    if(!hardware) await pace(page);
    for(const [eventIndex,action] of completeHand){
      await waitHuman(page);
      const before=await snapshot(page);
      assert.equal(before.count,eventIndex,`Seed 288 diverged before ${action.type}`);
      assert.equal(before.autoplay,false,'No autoplay is used');
      if(eventIndex===11){
        // Keep a selected tile and the native focus while rotating the live table in place.
        await click(run,'tile-'+action.id);
        await wait(page,id=>window.mahjong.app.selected===id,action.id);
        const selected=await snapshot(page);
        await capture(run,name,'round-selected');
        result.frames=await frameIntervals(page);
        await rotate(run,turned);
        await checkRetained(page);
        const after=await snapshot(page);
        check(after.count===selected.count&&after.selected===action.id&&after.focus===selected.focus&&after.semanticFocus===selected.semanticFocus,
          'Selected hand tile, focus and semantic focus survive rotation',{before:selected.focus,after:after.focus,selected:after.selected});
        await rotate(run,original);
        await checkRetained(page);
        const unchanged=await snapshot(page);
        check(unchanged.selected===action.id&&unchanged.count===eventIndex,'The selected tile remains the same when returning');
        // Normal animation speed, except the high-resolution software viewport uses observation slow motion
        // so its resize callback runs before a 240 ms tile flight finishes. The rule/event timing is unchanged.
        const animationScale=!hardware && width>=1024 ? .25 : 1;
        await page.evaluate(scale=>{window.mahjong.app.speed=1;window.mahjong.game.timeScale=scale;},animationScale);
        await page.evaluate(id=>{
          const seen=[],record=source=>seen.push({source,hidden:window.mahjong.app.hidden.has(id),at:performance.now()});
          window.__mahjongMotionEvents=seen;
          new ResizeObserver(()=>record('canvas')).observe(window.mahjong.game.canvas);
          window.addEventListener('resize',()=>record('window'));
        },action.id);
        await click(run,'tile-'+action.id);
        await wait(page,id=>window.mahjong.app.hidden.has(id),action.id,10000);
        await rotate(run,turned,0);await checkRetained(page);
        await wait(page,id=>!window.mahjong.app.hidden.has(id),action.id);
        const motion=await page.evaluate(id=>({events:window.__mahjongMotionEvents,
          discards:window.mahjong.app.match.hand.events.filter(e=>e.type==='discard'&&e.seat===0&&e.id===id).length}),action.id);
        check(motion.events.some(e=>e.hidden)&&motion.discards===1,'A real flying tile survives viewport rotation and lands once',{...motion,animationScale});
        await rotate(run,original);await checkRetained(page);
        if(!hardware)await pace(page);
        result.actions.push({eventIndex,action});
        continue;
      }
      if(action.type==='chow'){
        assert.equal(before.human.chows.length,2,'Two choices are naturally offered');
        await click(run,'action-chow');
        await wait(page,()=>!!window.mahjong.ui.point('chow-choice-0')&&!!window.mahjong.ui.point('chow-choice-1'));
        await capture(run,name,'round-chow');
        await click(run,'chow-back');
        await wait(page,()=>!window.mahjong.ui.point('chow-choice-0'));
        const restored=await snapshot(page);
        check(restored.count===eventIndex&&restored.focus==='action-chow','Back keeps both choices and restores the Chow opener',restored.focus);
      }
      await play(run,action);
      result.actions.push({eventIndex,action});
    }
    await wait(page,()=>window.mahjong.screen==='result');
    const ending=await snapshot(page);
    check(ending.result?.kind==='win'&&ending.result?.seat===0&&ending.result?.from===null&&ending.scores.reduce((a,b)=>a+b,0)===0,
      'Legal self-draw reaches a zero-sum settlement', ending.result);
    await capture(run,name,'round-result');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('taiwan-mahjong')).data.record);
    check(saved.hands===1,'The one finished hand is saved',saved);
    await page.reload();
    await wait(page,()=>window.mahjong.ready&&window.mahjong.screen==='title');
    const loaded=await page.evaluate(()=>window.mahjong.app.save.data.record);
    check(JSON.stringify(loaded)===JSON.stringify(saved),'Refresh loads the completed hand record',loaded);
    check(run.errors.length===0,'No browser errors',run.errors);
    result.passed=true;
    console.log(name,'legal single-hand Pong/Kong/two Chow/Tsumo/rotation/pause/save COMPLETE');
  } catch(error) { result.passed=false;result.error=error.stack;console.error(name,error.message); }
  finally { await run.context.close(); await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n'); }
}

async function timeWalk(width,height) {
  const screen={width,height,scale:width===1280?1:2.625,touch:width!==1280,insets:{top:0,right:0,bottom:0,left:0}};
  const name=`${width}x${height}`,run=await open(screen,79,false),page=run.page;
  const sample={device:name,seed:79,route:'first normal-pace discard, tile 113',errors:run.errors};
  try {
    await click(run,'startButton');
    await wait(page,()=>window.mahjong.screen==='play');
    await waitHuman(page);
    const before=await snapshot(page);
    assert(before.human.type==='act'&&before.human.discard.includes(113),'Same natural first discard is available');
    await click(run,'tile-113');
    await wait(page,()=>window.mahjong.app.selected===113);
    sample.surface=await page.evaluate(()=>{
      const {game,app}=window.mahjong,box=game.canvas.getBoundingClientRect(),frame=game.browser.frame??game;
      return {backend:game.browser.backend,design:[game.width,game.height],surface:[frame.width,frame.height],
        backing:[game.canvas.width,game.canvas.height],density:game.canvas.width/frame.width,css:[box.width,box.height],board:app.board,dpr:devicePixelRatio};
    });
    const timing=frameIntervals(page,120);
    await click(run,'tile-113');
    await wait(page,count=>window.mahjong.app.match.hand.events.slice(count).some(e=>e.type==='discard'&&e.seat===0&&e.id===113),before.count);
    sample.frames=await timing;
    sample.passed=run.errors.length===0;
    console.log(name,JSON.stringify(sample));
  }catch(error){sample.passed=false;sample.error=error.message;console.error(name,error.message);}
  finally{report.rounds.push(sample);await run.context.close();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');}
}

// Capture deterministic new gameplay references separately from the red-inset acceptance images.
// The desktop captures replicate the existing accept.mjs title/rules walk but never replace them automatically.
async function newBaselines() {
  const desktop={width:1280,height:720,scale:1,touch:false,insets:{top:0,right:0,bottom:0,left:0}};
  let run=await open(desktop,11);const page=run.page;
  try {
    await page.waitForTimeout(500);await page.screenshot({path:join(output,'title.png')});
    await click(run,'rounds-4');await click(run,'level-hard');await click(run,'rounds-1');
    await click(run,'settingsButton');await click(run,'setting-sound');await click(run,'settingsClose');
    await click(run,'rulesButton');await wait(page,()=>!!window.mahjong.ui.point('rulesClose'));await frames(page);
    await page.screenshot({path:join(output,'rules.png')});
  }finally{await run.context.close();}
  for(const [width,height,label] of [[873,325,'play-phone-landscape'],[411,813,'play-phone-portrait'],[768,1024,'play-tablet-portrait']]){
    const screen={width,height,scale:1,touch:true,insets:{top:0,right:0,bottom:0,left:0}};
    run=await open(screen,79);
    try{
      await click(run,'settingsButton');await click(run,'setting-voice');await click(run,'settingsClose');
      await start(run);await wait(run.page,()=>window.mahjong.app.human?.options.type==='act');
      await frames(run.page);await run.page.waitForTimeout(350);
      await run.page.screenshot({path:join(output,label+'.png')});
      const measured=await capture(run,`${width}x${height}`,'reference-hand');
      if(args.get('--compare')==='yes'){
        const a=PNG.sync.read(await readFile(join(game,'test/baseline',label+'.png'))), b=PNG.sync.read(await readFile(join(output,label+'.png')));
        let differs=0;const same=a.width===b.width&&a.height===b.height;
        if(same)for(let i=0;i<a.data.length;i+=4)if(Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]))>40)differs++;
        const share=same?differs/(a.width*a.height):1;
        measured.baseline={name:label,share,passed:share<=.02};if(share>.02)measured.errorCount++;
        console.log(label,'baseline difference',(share*100).toFixed(2)+'%');
      }
      console.log(label,'reviewed reference candidate');
    }finally{await run.context.close();}
  }
}

async function menuWalk(name,screen){
  const run=await open(screen,16);
  try{
    await capture(run,name,'title');
    await click(run,'rulesButton');await wait(run.page,()=>!!window.mahjong.ui.point('rulesClose'));
    await capture(run,name,'rules');
    await click(run,'rulesClose');await click(run,'settingsButton');
    await wait(run.page,()=>!!window.mahjong.ui.point('settingsClose'));
    await capture(run,name,'settings');
  }finally{await run.context.close();}
}

try {
  if (mode === 'screens') {
    const only = args.get('--only')?.split(',');
    for (const [name,screen] of profiles) if (!only || only.includes(name)) {
      try { await screenWalk(name,screen); }
      catch(error) { report.screens.push({device:name,state:'walk',errorCount:1,warningCount:0,findings:[{check:'walk',severity:'error',message:error.message}]}); console.error(name,error.message); }
    }
  } else if(mode==='rounds') {
    const selected=args.get('--only')?.split(',').map(s=>s.split('x').map(Number)) ?? sizes;
    for(const [width,height] of selected) await completeWalk(width,height);
  } else if(mode==='perf') {
    const only=args.get('--only')?.split(',');
    for(const [width,height] of [[1280,720],[873,325],[411,813]]) if(!only||only.includes(`${width}x${height}`)) await timeWalk(width,height);
  } else if(mode==='baselines') {
    await newBaselines();
  }else if(mode==='menus'){
    const only=args.get('--only')?.split(',');
    for(const [name,screen] of profiles)if(!only||only.includes(name))await menuWalk(name,screen);
  }
} finally {
  for (const context of pending) await context.close().catch(()=>{});
  await browser.close();
  await new Promise(done=>server.close(done));
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  if (report.screens.some(s=>s.errorCount)||report.rounds.some(r=>!r.passed)) process.exitCode=1;
}
