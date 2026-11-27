// The engine's --screens --play scenario. Every screen uses its real canvas geometry and pointer coordinates.
// A short near-station fixture uses the game's existing developer hook to avoid replaying over a kilometre on SwiftShader;
// arrival, camp edits and persistence still go through the normal gameplay and UI paths.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function waitFor(player, predicate, argument, description, timeout = 120000) {
  try {
    await player.page.waitForFunction(predicate, argument, { timeout, polling: 120 });
  } catch (error) {
    throw new Error('Timed out waiting for ' + description + ': ' + await player.read(() => JSON.stringify({
      state: window.teaHorseRoad?.state, loading: !document.querySelector('#loading')?.classList.contains('gone'),
      names: window.teaHorseRoad?.ui.semantics.snapshot.nodes.map(n=>[n.role,n.name,n.id,n.inert,n.hidden])
    })), { cause: error });
  }
}

export async function point(player, query) {
  return player.read(query => {
    const { ui } = window.teaHorseRoad;
    const nodes = ui.semantics.snapshot.nodes;
    const node = nodes.find(n => !n.hidden && !n.inert && !n.disabled &&
      (query.id ? n.id === query.id : n.name === query.name) &&
      (!query.role || n.role === query.role));
    if (!node) throw new Error('No active control ' + JSON.stringify(query) + ': ' +
      JSON.stringify(nodes.map(n => [n.id,n.name,n.role,n.inert,n.hidden,n.disabled])));
    const b = node.bounds, r = ui.overlay.canvas.getBoundingClientRect(), s = ui.game.screen;
    if (b.width <= 0 || b.height <= 0) throw new Error('No drawable hit area: ' + node.name);
    return {
      x: r.x + (b.x + b.width * (query.share ?? 0.5)) * r.width / s.width,
      y: r.y + (b.y + b.height / 2) * r.height / s.height,
      w: b.width * r.width / s.width, h: b.height * r.height / s.height, id: node.id
    };
  }, query);
}

async function waitControl(player, query) {
  await waitFor(player, q => window.teaHorseRoad?.ui.semantics.snapshot.nodes.some(n =>
    !n.hidden && !n.inert && !n.disabled &&
    (q.id ? n.id === q.id : n.name === q.name) && (!q.role || n.role === q.role)
  ), query, 'the control ' + (query.name ?? query.id));
}

async function touchScreen(player) {
  return player.read(() => navigator.maxTouchPoints > 0 || matchMedia('(pointer:coarse)').matches);
}

export async function tapAt(player, p) {
  if (await touchScreen(player)) await player.page.touchscreen.tap(p.x, p.y);
  else await player.page.mouse.click(p.x, p.y);
}

export async function tapControl(player, nameOrQuery) {
  const q=typeof nameOrQuery === 'string' ? {name:nameOrQuery,role:'button'} : nameOrQuery;
  await waitControl(player,q);
  await tapAt(player, await point(player,q));
}

export async function checkpoint(player,name) {
  // Check the actual active hit rectangles after the layout has painted. The verifier supplies an independent native
  // control receipt and safe-zone tint; a standalone rotation runner also uses this semantic rectangle inspection.
  const observation = await player.read(() => {
    const { ui } = window.teaHorseRoad, s = ui.game.screen, r = ui.overlay.canvas.getBoundingClientRect();
    const scaleX=r.width/s.width, scaleY=r.height/s.height;
    const nodes=ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&!n.disabled);
    const controls=nodes.filter(n=>['button','slider','switch','checkbox','radio','radiogroup','tab','option'].includes(n.role) &&
      // A radiogroup wraps the separate radio hit targets; it is not also a pointer hit target.
      (n.role!=='radiogroup'||!nodes.some(child=>child.parent===n.id&&child.role==='radio')))
      .map(n=>{
        const b=ui.projection.elementOf(n.id)?.getBoundingClientRect();
        return {id:n.id,name:n.name,role:n.role,x:r.x+n.bounds.x*scaleX,y:r.y+n.bounds.y*scaleY,
          width:n.bounds.width*scaleX,height:n.bounds.height*scaleY,
          projected:b?{x:b.x,y:b.y,width:b.width,height:b.height}:null};
      });
    const safe={x:r.x+s.safe.x*scaleX,y:r.y+s.safe.y*scaleY,width:s.safe.width*scaleX,height:s.safe.height*scaleY};
    return {screen:{orientation:s.orientation,width:s.width,height:s.height,scale:s.scale,safe},controls,
      touch:navigator.maxTouchPoints>0 || matchMedia('(pointer:coarse)').matches};
  });
  player.expect(observation.controls.length > 0, name+' has active controls');
  const {safe}=observation.screen;
  const inside=(a,b,slack=.75)=>a.x>=b.x-slack&&a.y>=b.y-slack&&
    a.x+a.width<=b.x+b.width+slack&&a.y+a.height<=b.y+b.height+slack;
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  const unsafe=observation.controls.filter(a=>!inside(a,safe));
  const small=observation.touch?observation.controls.filter(a=>a.width<43.9||a.height<43.9):[];
  const wrongProjection=observation.controls.filter(a=>!a.projected||['x','y','width','height'].some(k=>Math.abs(a[k]-a.projected[k])>1.25));
  const overlaps=[];
  for(const [i,a] of observation.controls.entries()) for(const b of observation.controls.slice(i+1)) {
    if(!inside(a,b,.5)&&!inside(b,a,.5)&&overlap(a,b)>1) overlaps.push([a.name,b.name]);
  }
  if (player.checkpoint) {
    const native = await player.checkpoint(name);
    // The official screen verifier must receive native hit bounds; semantic bounds are independent evidence.
    observation.nativeControlReceipt=native?.controls??null;
    player.expect(typeof native?.controls === 'number' && native.controls>0, name+' fresh native hit rectangles available');
    player.expect(native.controlReceipt?.fresh === true, name+' native receipt is fresh');
    player.expect(!native.findings?.some(f=>['inSafeArea','touchTarget','apart'].includes(f.check)),
      name+' native rectangle findings: '+JSON.stringify(native.findings));
    const receipt=await player.read(()=>({controls:globalThis.__egretScreens?.controls??[],sequence:globalThis.__egretScreens?.receipts??0}));
    const names=controls=>controls.map(c=>c.name).sort();
    observation.nativeHitTargets=receipt.controls;
    player.expect(receipt.sequence>=native.controlReceipt.after,name+' native observer did not regress to an older receipt');
    player.expect(native.controls===receipt.controls.length && JSON.stringify(names(receipt.controls))===JSON.stringify(names(observation.controls)),
      name+' semantic controls have exact native hit receipts: '+JSON.stringify({semantic:names(observation.controls),native:names(receipt.controls)}));
  } else await player.picture?.(name);
  player.expect(unsafe.length===0,name+' safe area: '+JSON.stringify(unsafe));
  player.expect(small.length===0,name+' 44 CSS px: '+JSON.stringify(small));
  player.expect(wrongProjection.length===0,name+' projected bounds: '+JSON.stringify(wrongProjection));
  player.expect(overlaps.length===0,name+' overlapping controls: '+JSON.stringify(overlaps));
  return observation;
}

async function holdThrottle(player) {
  const before = await player.read(() => {
    const {convoy}=window.teaHorseRoad;
    return {s:convoy.lead.s,p:Array.from(convoy.lead.chassis.position)};
  });
  const touch=await touchScreen(player);
  let cdp;
  try {
    if(touch) {
      const p=await point(player,{id:'hud-throttle'});
      cdp=await player.page.context().newCDPSession(player.page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:0}]});
    } else await player.hold('w');
    await waitFor(player,before=>{
      const l=window.teaHorseRoad.convoy.lead;
      return l.s>before.s+.2 || Math.hypot(l.chassis.position[0]-before.p[0],l.chassis.position[2]-before.p[2])>.3;
    },before,'real throttle input advances vehicle',45000);
  } finally {
    if(cdp) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await cdp.detach();
    } else if(!touch) await player.letGo('w');
  }
}

async function exerciseTouchDriving(player) {
  const session=await player.page.context().newCDPSession(player.page);
  try {
    const wheel=await point(player,{id:'hud-steer',share:.25});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:wheel.x,y:wheel.y,id:0}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:wheel.x-wheel.w*.12,y:wheel.y,id:0}]});
    await waitFor(player,()=>Math.abs(window.teaHorseRoad.convoy.lead.vehicle.steering)>.25,
      undefined,'steering drag reaches vehicle',30000);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await waitFor(player,()=>Math.abs(window.teaHorseRoad.convoy.lead.vehicle.steering)<.02,
      undefined,'steering release centres vehicle',30000);
    const brake=await point(player,{id:'hud-brake'});
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:brake.x,y:brake.y,id:0}]});
    await waitFor(player,()=>{
      const v=window.teaHorseRoad.convoy.lead.vehicle;
      return v.brake>.1||v.throttle<-.05;
    },undefined,'brake/reverse reaches vehicle',30000);
  } finally {
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});
    await session.detach();
  }
}

async function pause(player) {
  await tapControl(player, '暂停 Pause');
  await waitControl(player,{name:'继续',role:'button'});
  await waitFor(player,()=>window.teaHorseRoad?.paused===true,undefined,'paused drive state');
}

async function resume(player) {
  await tapControl(player,'继续');
  await waitControl(player,{name:'暂停 Pause',role:'button'});
  await waitFor(player,()=>window.teaHorseRoad?.paused===false,undefined,'resumed drive state');
}

async function reachFirstStation(player) {
  // The normal initial driving and pause/resume have run. Pause a second time so tiles can stream before the short
  // pre-station route fixture is released. No journey, cargo or save fields are injected, and arrive() is not called.
  await pause(player);
  const target=await player.read(async()=>{
    const {STATIONS}=await import(new URL('./src/world/route.mjs',location.href).href);
    const {pointAt}=await import(new URL('./src/world/route.mjs',location.href).href);
    const s=STATIONS[1].s-35,p=pointAt(s);
    window.teaHorseRoad.place(s);
    return {s,x:p[0],z:p[2]};
  });
  await waitFor(player, p=>{
    const g=window.teaHorseRoad;
    g.land.update(p.x,p.z);
    return g.land.readyAround(p.x,p.z,100);
  },target,'the pre-station terrain fixture',120000);
  await player.read(p=>window.teaHorseRoad.place(p.s),target);
  await resume(player);
  // A short normal physics/rules traversal using the existing test hook and the convoy's own road-following steer.
  // The station trigger runs in tick, not in a UI fixture or direct state mutation. Batches keep the browser responsive.
  for(let i=0;i<50;i++) {
    const state=await player.read(()=>{
      const g=window.teaHorseRoad;
      if(g.state==='drive') g.sim(.5,{throttle:1},true);
      return g.state;
    });
    if(state==='station') break;
    await player.wait(.05);
  }
  await waitFor(player,()=>window.teaHorseRoad?.state==='station' &&
    window.teaHorseRoad?.save.data.journey?.station===1,undefined,'normal arrival and station autosave');
  await waitControl(player,{name:'扎营布置',role:'button'});
}

async function chooseCampOption(player, kind, option, fraction) {
  const q=await player.read(({kind,option})=>{
    const nodes=window.teaHorseRoad.ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&!n.disabled);
    const specific=nodes.find(n=>n.role==='radio'&&n.name?.includes(option));
    if(specific)return {id:specific.id};
    const group=nodes.find(n=>n.role==='radiogroup'&&n.name?.includes(kind));
    return group?{id:group.id}:null;
  },{kind,option});
  player.expect(q!==null,'camp choice exists: '+kind);
  // Legacy selection group reports the entire row; newer individual radio semantics can be tapped by name.
  const isGroup=await player.read(id=>window.teaHorseRoad.ui.semantics.snapshot.nodes.find(n=>n.id===id).role==='radiogroup',q.id);
  await tapControl(player,{...q,...(isGroup?{share:fraction}:{})});
}

export async function runJourney(player,{rotate}={}) {
  const observations = {};
  await waitFor(player,()=>Boolean(window.teaHorseRoad?.ui.game?.screen&&
    document.querySelector('#loading')?.classList.contains('gone')&&window.teaHorseRoad.state==='title'),
    undefined,'title with completed loading',180000);
  const phonePortrait=await player.read(()=>{
    const {screen:s}=window.teaHorseRoad.ui.game;
    return navigator.maxTouchPoints>0&&s.orientation==='portrait'&&Math.min(innerWidth,innerHeight)<600;
  });
  const promptVisible=await player.read(()=>getComputedStyle(document.querySelector('#rotate')).display!=='none');
  const savedViewport=player.page.viewportSize();
  player.expect(promptVisible===phonePortrait,'rotation prompt is only for portrait phones');
  if(promptVisible) {
    // Real production prompt is visible in this capture. It intentionally covers the landscape game. Only this isolated
    // test page removes its blocking cover afterwards, to inspect the same portrait safe geometry and underlying route.
    const button = await player.read(()=>{
      const b=document.querySelector('#rotate-button'),style=getComputedStyle(b),r=b.getBoundingClientRect();
      return {visible:!b.hidden&&style.display!=='none',w:r.width,h:r.height};
    });
    if(button.visible) player.expect(button.w>=44&&button.h>=44,'landscape fullscreen target>=44 CSS px');
    if(player.checkpoint) await player.checkpoint('portrait-rotate-prompt');
    else await player.picture?.('portrait-rotate-prompt');
    await player.read(()=>document.querySelector('#rotate').style.setProperty('display','none','important'));
  }
  try {
    await waitControl(player,{name:'出发 新的旅程',role:'button'});
    observations.title=await checkpoint(player,'title');
    await tapControl(player,'设置');
    await waitControl(player,{name:'好',role:'button'});
    observations.settings=await checkpoint(player,'settings');
    await tapControl(player,'好');
    await waitControl(player,{name:'出发 新的旅程',role:'button'});
    await tapControl(player,'出发 新的旅程');
    await waitFor(player,()=>['opening','drive'].includes(window.teaHorseRoad?.state),undefined,'journey begins');
    if(await player.read(()=>window.teaHorseRoad.state==='opening')) await tapControl(player,'跳过开场');
    await waitControl(player,{name:'暂停 Pause',role:'button'});
    await holdThrottle(player);
    if(rotate&&await touchScreen(player))await exerciseTouchDriving(player);
    observations.hud=await checkpoint(player,'driving-hud');
    if(rotate) await rotate('driving',observations.hud);
    await pause(player);
    observations.pause=await checkpoint(player,'pause');
    if(rotate) await rotate('pause',observations.pause);
    await resume(player);
    await reachFirstStation(player);
    observations.station=await checkpoint(player,'first-station');
    if(rotate) await rotate('station',observations.station);
    await tapControl(player,'扎营布置');
    await waitFor(player,()=>window.teaHorseRoad?.state==='camp',undefined,'camp editor');
    await waitControl(player,{name:'放下一件',role:'button'});
    // Exercise a non-default selection. Rotation must preserve the selected piece and transform mode.
    await chooseCampOption(player,'物件','篝火',.25);
    await tapControl(player,'放下一件');
    await waitFor(player,()=>window.teaHorseRoad.camps[1].pieces.length===1 &&
      window.teaHorseRoad.camps[1].selected?.name==='fire',undefined,'one selected camp fire');
    await chooseCampOption(player,'手柄','旋转',.75);
    await waitFor(player,()=>window.teaHorseRoad.camps[1].mode==='rotate',undefined,'camp rotate mode');
    observations.camp=await checkpoint(player,'camp');
    if(rotate)await rotate('camp',observations.camp);
    await tapControl(player,'保存营地');
    await waitFor(player,()=>window.teaHorseRoad?.state==='station' &&
      !!window.teaHorseRoad?.save.data.camps.creek,undefined,'camp saved through the real control');
    await waitControl(player,{name:'扎营布置',role:'button'});
    const stored=await player.read(()=>{
      const g=window.teaHorseRoad,raw=localStorage.getItem('tea-horse-road');
      return {station:g.save.data.journey.station,camp:!!g.save.data.camps.creek,pieces:g.camps[1].pieces.length,
        durable:!!raw&&raw.includes('"creek"')};
    });
    player.expect(stored.station===1&&stored.camp&&stored.pieces===1&&stored.durable,
      'normal station and one camp piece stored: '+JSON.stringify(stored));
    observations.saved=stored;
    observations.savedCard=await checkpoint(player,'camp-saved');
    return observations;
  } finally {
    // Restore the real phone instruction, even on test failure. The other viewport classes never hide it.
    if(promptVisible)await player.read(()=>document.querySelector('#rotate').style.removeProperty('display'));
    const out=process.env.TEA_SCREEN_PLAY_REPORT;
    if(out&&savedViewport) {
      await mkdir(out,{recursive:true});
      await writeFile(join(out,'play-'+savedViewport.width+'-'+savedViewport.height+'.json'),JSON.stringify({
        viewport:savedViewport,portraitPrompt:promptVisible,fixture:'Near-station via existing place hook, then simulation ticks and ordinary arrival; actual taps for all menu/camp operations.',observations
      },null,2)+'\n');
    }
  }
}

export default runJourney;
