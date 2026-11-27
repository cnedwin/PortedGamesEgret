// Real World3D overlay controls + deterministic game-rule fixture for screen verification.
// This module runs under the engine's --screens --play driver, or the ordinary browser acceptance.
// It never fabricates a native control receipt or edits hit points, elapsed time, XP or kills.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SEED = 7;
const normalize = n => n.replace(/\s+/g, ' ').trim();
export async function wait(player, predicate, arg, label, timeout = 90000) {
  try { await player.page.waitForFunction(predicate, arg, { timeout, polling: 100 }); }
  catch (error) {
    const seen = await player.read(() => {
      const s = window.__jellyPandas, g = s?.game;
      return { mode:s?.mode, frames:s?.frames, menu:s?.ui?.menus?.kind, error:s?.error, t:g?.t,
        nodes:s?.ui?.semantics?.snapshot?.nodes?.map(n => [n.id,n.role,n.name,n.disabled,n.inert,n.focused]) };
    });
    throw new Error('Timed out waiting for ' + label + ': ' + JSON.stringify(seen), { cause:error });
  }
}
export async function ready(player) {
  await wait(player, () => {
    const s=window.__jellyPandas; return s?.frames>1 && s.ui?.tester && !s.error;
  }, undefined, 'the actual engine UI and first World3D frames');
}
export async function names(player) {
  return player.read(() => {
    const {ui}=window.__jellyPandas; ui.flush?.();
    return ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert).map(n=>({
      id:n.id,role:n.role,name:n.name,disabled:!!n.disabled,focused:!!n.focused,selected:!!n.selected,checked:n.checked,
      actions:n.actions,bounds:n.bounds
    }));
  });
}
export async function control(player, { role, name, prefix, id }={}, { enabled=true }={}) {
  const q={role,name,prefix,id,enabled};
  await wait(player, q => window.__jellyPandas?.ui?.semantics?.snapshot?.nodes?.some(n =>
    !n.hidden&&!n.inert&&(!q.enabled||!n.disabled)&&(!q.role||n.role===q.role)&&
    (!q.name||n.name===q.name)&&(!q.prefix||n.name.startsWith(q.prefix))&&(!q.id||n.id===q.id)),
  q, 'control '+JSON.stringify(q));
  const all=await names(player);
  const n=all.find(n=>(!enabled||!n.disabled)&&(!role||n.role===role)&&(!name||n.name===name)&&
    (!prefix||n.name.startsWith(prefix))&&(!id||n.id===id));
  if(!n) throw new Error('Active control disappeared: '+JSON.stringify(q));
  return n;
}
export async function press(player, spec) {
  const n=typeof spec==='string'?await control(player,{role:'button',name:spec}):await control(player,spec);
  await player.read(n=>{
    const {tester}=window.__jellyPandas.ui;
    const query=n.role+':'+n.name, found=tester.findAll(query);
    const index=found.findIndex(candidate=>candidate.id===n.id);
    if(index<0) throw new Error('Native semantic control disappeared: '+query);
    tester.press(query+(found.length>1?'#'+index:''));
  },n);
  return n;
}
export async function point(player,spec) {
  const node=typeof spec==='string'?await control(player,{name:spec}):await control(player,spec);
  return player.read(node=>{
    const {game,overlay}=window.__jellyPandas.ui,r=overlay.canvas.getBoundingClientRect(),s=game.screen,b=node.bounds,
      x=r.x+b.x*r.width/s.width,y=r.y+b.y*r.height/s.height,w=b.width*r.width/s.width,h=b.height*r.height/s.height;
    return {x:x+w/2,y:y+h/2,w,h,id:node.id,name:node.name};
  },node);
}
export async function tap(player,spec) {
  const p=await point(player,spec);
  if(await player.read(()=>navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches))await player.page.touchscreen.tap(p.x,p.y);
  else await player.page.mouse.click(p.x,p.y);
}
export async function state(player) {
  return player.read(()=>{
    const s=window.__jellyPandas,g=s.game,p=g?.pandas[0];
    return {mode:s.mode,menu:s.ui.menus.kind,frames:s.frames,t:g?.t,state:g?.state,
      level:g?.level,kills:g?.kills,enemies:g?.aliveCount,boss:g?.boss?.def.key,bossHp:g?.boss?.hp,choice:g?.waitingForChoice(),
      skin:p?.skin,party:g?.pandas.length,hp:p?.hp,x:p?.x,z:p?.z,y:p?.y,rolling:p?.rolling,slamming:p?.slamming,
      rerolls:p?.rerolls,pending:p?.pendingPicks,tricks:p?.tricks};
  });
}
export async function waitFrames(player,n=3) {
  const before=await player.read(()=>window.__jellyPandas.frames);
  await wait(player,before=>window.__jellyPandas.frames>=before, before+n, n+' new world frames');
}
export async function checkpoint(player,label) {
  // Semantic and native receipts are independent: read genuine renderer-published hit boxes, never synthesize them.
  await waitFrames(player,2);
  const observed=await player.read(()=>{
    const {ui}=window.__jellyPandas;ui.flush?.();const s=ui.game.screen,r=ui.overlay.canvas.getBoundingClientRect(),
      kx=r.width/s.width,ky=r.height/s.height;
    const nativeRoles=['button','slider','switch','checkbox','radio','tab','option','scrollbar'];
    const controls=ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&!n.disabled&&nativeRoles.includes(n.role)).map(n=>{
      const b=n.bounds, p=ui.projection?.elementOf(n.id)?.getBoundingClientRect();
      return {id:n.id,name:n.name,role:n.role,x:r.x+b.x*kx,y:r.y+b.y*ky,width:b.width*kx,height:b.height*ky,
        projected:p?{x:p.x,y:p.y,width:p.width,height:p.height}:null};
    });
    return {screen:{width:s.width,height:s.height,orientation:s.orientation,scale:s.scale,
      safe:{x:r.x+s.safe.x*kx,y:r.y+s.safe.y*ky,width:s.safe.width*kx,height:s.safe.height*ky}},controls,
      touch:navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches,
      mode:window.__jellyPandas.mode,menu:ui.menus.kind,
      readable:ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&['progressbar','status','text'].includes(n.role)).map(n=>[n.role,n.name])};
  });
  const {safe}=observed.screen, inside=(a,b,e=.8)=>a.x>=b.x-e&&a.y>=b.y-e&&a.x+a.width<=b.x+b.width+e&&a.y+a.height<=b.y+b.height+e;
  const unsafe=observed.controls.filter(a=>!inside(a,safe)),small=observed.touch?observed.controls.filter(a=>a.width<43.9||a.height<43.9):[];
  const readOnlyHud=!observed.touch&&observed.mode==='play'&&!observed.menu&&observed.readable.length>0;
  player.expect(observed.controls.length>0||readOnlyHud,label+' native semantic controls or read-only desktop HUD present');
  player.expect(!unsafe.length,label+' safe area '+JSON.stringify(unsafe));
  player.expect(!small.length,label+' 44 CSS px '+JSON.stringify(small));
  if(player.checkpoint) {
    const native=await player.checkpoint(label);
    observed.native=native;
    player.expect(typeof native?.controls==='number'&&(native.controls>0||readOnlyHud),label+' genuine native hit rectangle receipt');
    player.expect(native.controlReceipt?.fresh===true,label+' receipt refreshed');
    player.expect(!native.findings?.some(f=>['inSafeArea','touchTarget','apart'].includes(f.check)),
      label+' native hit geometry '+JSON.stringify(native.findings));
    const receipt=await player.read(()=>({controls:window.__egretScreens?.controls??[],sequence:window.__egretScreens?.receipts??0}));
    observed.nativeHitTargets=receipt.controls;
    player.expect(receipt.sequence>=native.controlReceipt.after,label+' no stale geometry');
    // Non-semantic native controls may also be registered (e.g. camera or joystick bindings);
    // every actual semantic action must be represented, and additional hit targets are still checked by the engine.
    const actual=new Set(receipt.controls.map(c=>normalize(c.name??'')));
    const missing=observed.controls.filter(n=>!actual.has(normalize(n.name)));
    player.expect(!missing.length,label+' semantic targets match genuine native receipt '+JSON.stringify(missing));
  } else await player.picture?.(label);
  return observed;
}
const SIM_ADVANCE=(opts)=>{
  const {to,bot,untilChoice,stopBoss,sea,fresh}=opts;
  const s=window.__jellyPandas;
  if(fresh) {
    const {tester}=s.ui;
    tester.press('button:'+fresh);
    if(s.game.t!==0)throw new Error('Fresh activation did not start at t=0');
  }
  const g=s.game,p=g.pandas[0],was=p.human,value=()=>({t:g.t,state:g.state,level:g.level,kills:g.kills,enemies:g.aliveCount,boss:g.boss?.def.key,bossHp:g.boss?.hp,hp:p.hp,choice:g.waitingForChoice(),skin:p.skin,toys:p.toys.map(t=>[t.id,t.level,t.evo]),charms:[...p.charms]});
  const start=value(),input={moveX:0,moveZ:0,jump:false,slam:false,roll:false};
  let steps=0;const mark=performance.now();
  if(bot)p.human=false;
  while(g.state==='play'&&g.t<to&&(!untilChoice||!g.waitingForChoice())&&(!stopBoss||!g.boss)){
    if(sea){
      // Deliberately run into the edge for the real defeat path. The island's sea damage takes health normally.
      const r=Math.hypot(p.x,p.z)||1;input.moveX=p.x/r||1;input.moveZ=p.z/r;input.roll=true;
      while(p.offer)g.choose(p.index,0);
    } else if(!bot){
      let nearest,distance=Infinity;for(const gem of g.gems){const d=Math.hypot(gem.x-p.x,gem.z-p.z);if(d<distance){distance=d;nearest=gem;}}
      const dx=nearest?nearest.x-p.x:Math.cos(g.t)*8-p.x,dz=nearest?nearest.z-p.z:Math.sin(g.t)*8-p.z,l=Math.hypot(dx,dz)||1;
      input.moveX=dx/l;input.moveZ=dz/l;input.jump=g.t%5<.3;input.slam=g.t%5>1&&g.t%5<1.05;input.roll=g.t%8>5&&g.t%8<5.5;
    }
    g.update(1/60,input);steps++;
    if(g.t<to-1/60&&(!untilChoice||!g.waitingForChoice())&&(!stopBoss||!g.boss)&&g.state==='play')g.events.length=0;
  }
  p.human=was;
  return {start,end:value(),steps,elapsedMs:performance.now()-mark,fixture:sea?'natural sea damage via movement':bot?'existing AI through unmodified game.update':'normal human rule inputs (gem-seeking)'};
};
export function advance(player,to,opts={}){return player.read(SIM_ADVANCE,{to,...opts});}
async function accessibleOffer(player){
  await wait(player,()=>{
    const nodes=window.__jellyPandas.ui.semantics.snapshot.nodes;
    return [1,2,3].every(i=>nodes.some(n=>n.id==='menu-cards-offer-'+i+'-detail'&&n.role==='text'&&!n.inert&&!n.hidden&&n.name.length>12))&&
      nodes.some(n=>n.id==='menu-offer-status'&&n.role==='status'&&n.name.length>20);
  },undefined,'native localized effects and polite upgrade announcement');
  return player.read(()=>{
    const {ui}=window.__jellyPandas;ui.flush?.();const nodes=ui.semantics.snapshot.nodes,details=[1,2,3].map(i=>nodes.find(n=>n.id==='menu-cards-offer-'+i+'-detail')),
      status=nodes.find(n=>n.id==='menu-offer-status'),projected=ui.projection.elementOf(status.id);
    return {details:details.map(n=>n.name),status:status.name,role:projected?.getAttribute('role'),live:projected?.getAttribute('aria-live')};
  });
}
async function setEnglish(player){
  const zh=await player.read(()=>document.documentElement.lang.startsWith('zh'));
  await tap(player,zh?'设置':'Settings');
  // Language button has a language-specific native name; use the actual active control.
  if(zh){await press(player,{prefix:'语言'});await wait(player,()=>document.documentElement.lang==='en',undefined,'English language');}
  return zh;
}
async function closeSettings(player){await press(player,'Close');}
async function pauseControl(player){
  const touch=await player.read(()=>navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches);
  if(touch)await tap(player,{name:'Pause'});else await player.page.keyboard.press('KeyP');
  await wait(player,()=>window.__jellyPandas.mode==='paused',undefined,'pause');
}
export async function runRoute(player,{rotate,includeEnd=true,includeLanguages=true,includeInput=true,allParties=false}={}){
  const viewport=player.page.viewportSize(),results={observations:{},steps:[]},record=(name,data)=>{results.steps.push({name,data});};
  const isTouch=await player.read(()=>navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches);
  try {
    const url=new URL(player.page.url());
    if(url.searchParams.get('seed')!==String(SEED)){url.searchParams.set('seed',String(SEED)); url.searchParams.set('lang','zh');await player.page.goto(url.href,{waitUntil:'domcontentloaded'});}
    await ready(player);
    const zh=await player.read(()=>document.documentElement.lang.startsWith('zh'));
    if(zh)results.observations.titleZh=await checkpoint(player,'title-zh');
    await setEnglish(player);
    results.observations.settings=await checkpoint(player,'settings-en');
    // Real native setting selection, semantic activation and persisted old flat format.
    const sound=await control(player,{name:'Sound'}),oldSettings=await player.read(()=>JSON.parse(localStorage.getItem('jelly-pandas')??'{}'));
    if(!oldSettings.muted)await press(player,{id:sound.id});
    for(let i=0;i<3 && await player.read(()=>JSON.parse(localStorage.getItem('jelly-pandas')??'{}').quality??'high')!=='medium';i++)
      await press(player,{prefix:'Quality:'});
    const settings=await player.read(()=>JSON.parse(localStorage.getItem('jelly-pandas')??'{}'));
    player.expect(settings.muted===true&&settings.quality==='medium','native settings saved (mute and medium quality)');
    record('settings',settings);await closeSettings(player);
    if(includeLanguages)results.observations.titleEn=await checkpoint(player,'title-en');
    await tap(player,'How to play');
    const helpGoal=await control(player,{id:'menu-help-goal',role:'text'}),helpMoves=await control(player,{id:'menu-help-moves',role:'text'});
    player.expect(helpGoal.name.length>20&&helpMoves.name.length>25,'native help content exposes goal and full device guide to semantics');
    results.observations.help=await checkpoint(player,'help');await press(player,'Close');
    // Select all original party sizes through the actual controls, ending on solo for deterministic replay.
    if(allParties){for(const [i,label] of ['Solo','+1 friend','+2 friends','+3 friends'].entries()){
      await press(player,{role:'radio',name:label});await wait(player,n=>window.__jellyPandas.game.pandas.length===n,i+1,'party preview '+(i+1));
    }}
    // Four-player HUD is the most crowded real layout. Visit it before the solo replay on every screen.
    await press(player,{role:'radio',name:'+3 friends'});
    await tap(player,{role:'radio',name:'Mint · Belly Drum'});
    await tap(player,'Play');
    await wait(player,()=>window.__jellyPandas.mode==='play'&&window.__jellyPandas.game.pandas.length===4,undefined,'four-panda run starts');
    results.observations.party4=await checkpoint(player,'hud-party-four');
    record('four-panda battle layout',await state(player));
    await pauseControl(player);
    await press(player,'Title');await wait(player,()=>window.__jellyPandas.mode==='title',undefined,'quit party preview run');
    await press(player,{role:'radio',name:'Solo'});
    await tap(player,{role:'radio',name:'Mint · Belly Drum'});
    await wait(player,()=>window.__jellyPandas.game.pandas[0].skin===7&&window.__jellyPandas.game.pandas.length===1,undefined,'selected panda preview and solo');
    // Let the newly selected 3D preview compose, not just the immediately rebuilt menu.
    await waitFrames(player,8);
    results.observations.selected=await checkpoint(player,'title-selected');
    await tap(player,'Play');
    await wait(player,()=>window.__jellyPandas.mode==='play',undefined,'new game starts');
    results.observations.hud=await checkpoint(player,'hud');
    if(includeInput){
      const before=await state(player);
      if(isTouch){
        const joystick=await point(player,{name:'Move joystick'}),cdp=await player.page.context().newCDPSession(player.page);
        const origin={x:joystick.x,y:joystick.y,id:11},outside={x:Math.min(viewport.width-2,joystick.x+joystick.w*.9),y:Math.max(1,joystick.y-joystick.h*.75),id:11};
        try{
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[outside]});
          await wait(player,b=>Math.hypot(window.__jellyPandas.game.pandas[0].x-b.x,window.__jellyPandas.game.pandas[0].z-b.z)>.1,before,'joystick moves even outside its hit box');
        }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
        player.expect(await player.read(()=>scrollX===0&&scrollY===0),'dragging the action game does not scroll the page');
      }else{
        await player.page.keyboard.down('KeyW');
        try{await wait(player,b=>Math.hypot(window.__jellyPandas.game.pandas[0].x-b.x,window.__jellyPandas.game.pandas[0].z-b.z)>.15,before,'real W advances panda');}
        finally{await player.page.keyboard.up('KeyW');}
      }
      record('actual movement',{before,after:await state(player),touch:isTouch});
    }
    if(rotate)await rotate('hud');
    await pauseControl(player);const paused=await state(player);await waitFrames(player,3);
    player.expect((await state(player)).t===paused.t,'pause freezes rules while frames still render');
    results.observations.pause=await checkpoint(player,'pause');if(rotate)await rotate('pause');
    await press(player,'Resume');await wait(player,()=>window.__jellyPandas.mode==='play',undefined,'resume');
    if(!isTouch&&allParties){
      // Resume from a semantic action may not carry browser user activation. The original blank-scene
      // recapture behavior remains available and must use an actual browser mouse gesture.
      await player.page.mouse.click(viewport.width*.62,viewport.height*.67);
      await wait(player,()=>document.pointerLockElement===document.querySelector('#stage'),undefined,'real blank scene click recaptures mouse');
      player.expect(true,'blank world click restores native desktop pointer lock');
    }
    const first=await advance(player,120,{untilChoice:true});record('first level fixture',first);
    player.expect(first.end.choice,'first upgrade reached under normal rule inputs');
    await control(player,{role:'button',prefix:'1.'});
    const firstOffer=await accessibleOffer(player);
    player.expect(firstOffer.details.every(n=>n.length>12)&&firstOffer.role==='status'&&(!firstOffer.live||firstOffer.live==='polite'),'localized upgrade effects and projected polite status are accessible');
    record('accessible first offer',firstOffer);
    results.observations.cards=await checkpoint(player,'cards');if(rotate)await rotate('cards');
    const rerolls=(await state(player)).rerolls;
    await tap(player,{role:'button',prefix:'Reroll'});
    await wait(player,r=>window.__jellyPandas.game.pandas[0].rerolls===r-1,rerolls,'reroll consumed');
    await wait(player,before=>window.__jellyPandas.ui.semantics.snapshot.nodes.some(n=>n.id==='menu-offer-status'&&n.name&&n.name!==before),firstOffer.status,'updated polite reroll status');
    const secondOffer=await accessibleOffer(player);
    player.expect(secondOffer.status!==firstOffer.status&&secondOffer.role==='status'&&(!secondOffer.live||secondOffer.live==='polite'),'reroll updates the existing polite announcement');
    record('accessible rerolled offer',secondOffer);
    let priorOffer=secondOffer;
    while((await state(player)).rerolls>0){
      const left=(await state(player)).rerolls,reroll=await control(player,{id:'menu-cards-reroll'});
      if(!isTouch&&left===1){
        // Focus through native semantics, then perform the final activation with an actual keyboard Enter.
        await player.read(n=>window.__jellyPandas.ui.tester.focus(n.role+':'+n.name),reroll);
        await player.page.keyboard.press('Enter');
      }else await tap(player,{id:'menu-cards-reroll'});
      await wait(player,n=>window.__jellyPandas.game.pandas[0].rerolls===n-1,left,'remaining native reroll');
      await wait(player,before=>window.__jellyPandas.ui.semantics.snapshot.nodes.some(n=>n.id==='menu-offer-status'&&n.name&&n.name!==before),priorOffer.status,'remaining reroll updates announcement');
      priorOffer=await accessibleOffer(player);
    }
    const disabled=await control(player,{id:'menu-cards-reroll'},{enabled:false});
    player.expect(disabled.disabled&&!disabled.focused,'exhausted reroll is disabled and cannot retain focus');
    if(!isTouch)player.expect((await names(player)).some(n=>n.focused&&!n.disabled&&n.id.startsWith('menu-cards-offer-')),'final keyboard reroll moves focus to a valid upgrade');
    // An attempted disabled activation cannot spend currency or change the announced offer.
    if(isTouch){
      const p=await player.read(n=>{const {game,overlay}=window.__jellyPandas.ui,b=n.bounds,r=overlay.canvas.getBoundingClientRect(),s=game.screen;
        return {x:r.x+(b.x+b.width/2)*r.width/s.width,y:r.y+(b.y+b.height/2)*r.height/s.height};},disabled);
      await player.page.touchscreen.tap(p.x,p.y);
    }else await player.page.keyboard.press('KeyR');
    await waitFrames(player,2);
    player.expect((await state(player)).rerolls===0&&(await accessibleOffer(player)).status===priorOffer.status,'disabled reroll leaves offer and announcement unchanged');
    results.observations.exhausted=await checkpoint(player,'cards-reroll-exhausted');
    record('exhausted reroll',priorOffer);
    const pending=(await state(player)).pending;
    if(isTouch)await tap(player,{role:'button',prefix:'1.'});else await player.page.keyboard.press('Digit1');
    await wait(player,n=>window.__jellyPandas.game.pandas[0].pendingPicks<n,pending,'upgrade consumed');
    record('actual reroll and pick',await state(player));
    // The fresh seeded restart and 1/60s simulation steps give identical dense state on every profile.
    await pauseControl(player);await control(player,{name:'Restart',role:'button'});
    const boss=await advance(player,300.1,{bot:true,stopBoss:true,fresh:'Restart'});record('first boss fixture',boss);
    player.expect(boss.start.t===0&&boss.end.boss==='pudding'&&boss.end.bossHp===1500,'first boss created by real spawner at 300 s');
    await waitFrames(player,5);results.observations.boss=await checkpoint(player,'boss');
    const fight=await advance(player,380,{bot:true});record('boss fight',fight);
    player.expect(!fight.end.boss&&fight.end.kills>boss.end.kills,'first boss defeated (normal bot rules)');
    if(includeEnd) {
      // At very slow headless software renderers the engine deliberately discards long RAF gaps. Use a small
      // temporary viewport solely to let the natural result animation finish, then restore the original screen.
      await pauseControl(player);
      await player.page.setViewportSize({width:320,height:180});
      await control(player,{name:'Restart',role:'button'});
      const end=await advance(player,780,{sea:true,fresh:'Restart'});record('defeat by actual sea damage',end);
      player.expect(end.start.t===0&&end.end.state==='lost','fresh deterministic actual loss, not direct result injection');
      await wait(player,()=>window.__jellyPandas.mode==='over',undefined,'native result screen',120000);
      await waitFrames(player,12);
      await player.page.setViewportSize(viewport);
      await control(player,{role:'button',name:'Play again'});
      results.observations.end=await checkpoint(player,'end');if(rotate)await rotate('end');
      const previous=await player.read(()=>{window.__jellyEndSimulation=window.__jellyPandas.game;return window.__jellyPandas.game.t;});
      await tap(player,'Play again');
      await wait(player,()=>window.__jellyPandas.mode==='play'&&window.__jellyPandas.game!==window.__jellyEndSimulation,undefined,'result replay starts a fresh simulation');
      player.expect((await state(player)).t<previous,'result restart clears previous run');
      await player.read(()=>delete window.__jellyEndSimulation);
      await pauseControl(player);await press(player,'Title');await wait(player,()=>window.__jellyPandas.mode==='title',undefined,'return to title');
    }
    return results;
  }finally{
    if(viewport)await player.page.setViewportSize(viewport);
    if(process.env.JELLY_SCREEN_PLAY_REPORT&&viewport){
      const out=process.env.JELLY_SCREEN_PLAY_REPORT;await mkdir(out,{recursive:true});
      await writeFile(join(out,'play-'+viewport.width+'-'+viewport.height+'.json'),JSON.stringify({viewport,...results},null,2)+'\n');
    }
  }
}
export default runRoute;
