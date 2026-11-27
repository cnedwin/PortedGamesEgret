// Same normal-pace first two-tile move as the frozen pre-migration sample. Run the desktop and phone-small
// profiles in isolation, not concurrent with other browser work; rAF intervals are software-browser intervals.
import fs from 'node:fs';
import path from 'node:path';
import { ready, press, cursor, awaitMode } from './ui-actions.mjs';
export default async function(player){
  const p=player.page,u=new URL(p.url());
  for(const [k,v] of Object.entries({seed:'3',lang:'zh',quality:'low',map:'wheat'}))u.searchParams.set(k,v);
  await p.emulateMedia({reducedMotion:'reduce'});await p.goto(u.href);await ready(p,'dialog:星旗战记');
  await press(p,'button:遭遇战');await ready(p,'dialog:遭遇战');
  await press(p,'button:对手');await ready(p,'radio:维蕾塔');await press(p,'radio:维蕾塔');
  await press(p,'button:战场');await ready(p,'radio:麦浪渡口');
  await press(p,'button:出阵');await awaitMode(p,'idle',240);await ready(p,'button:结束回合');
  const sw=await player.read(()=>window.egretGame.battle.game.units.find(u=>u.owner===0&&u.type==='swordsman'));
  await cursor(p,sw);await p.keyboard.press('Enter');await awaitMode(p,'move');
  await player.read(()=>{
    const probe=window.__starPerf={frames:[],started:performance.now(),stop:false};let last=performance.now();
    const tick=now=>{probe.frames.push(now-last);last=now;if(!probe.stop&&probe.frames.length<120)requestAnimationFrame(tick)};
    requestAnimationFrame(tick);
  });
  const begin=Date.now();
  await cursor(p,{x:sw.x,y:sw.y-2});await p.keyboard.press('Enter');await awaitMode(p,'act');await ready(p,'button:待命');
  await p.waitForTimeout(1500);
  const sample=await player.read(()=>{
    const probe=window.__starPerf;probe.stop=true;
    const host=window.egretGame.ui,world=window.egretGame.stage.canvas;
    return {frames:probe.frames,elapsedMs:performance.now()-probe.started,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,
      world:[world.width,world.height],overlay:[host.overlay.canvas.width,host.overlay.canvas.height]};
  });
  const values=sample.frames.slice(1).sort((a,b)=>a-b),n=values.length;
  const record={...sample,label:'first move to action menu: swordsman two tiles up',samples:n,actionElapsedMs:Date.now()-begin,
    p95Ms:values[Math.ceil(n*.95)-1]??null,maxMs:values.at(-1)??null,over50:values.filter(x=>x>50).length};
  const shot=await player.checkpoint('action');
  // Observe the natural idle menu with both loops running. UI frame admissions and native host serials
  // must stop advancing when the projected panel has settled; 3D frames and UI steps must continue.
  // Do not suspend the loop or snap the camera merely to make the measurement pass.
  const idleSample=()=>player.read(async()=>{
    const eg=window.egretGame,game=eg.ui.game,begin=performance.now(),worldStart=eg.status.frames,
      start=game.loop.snapshot(),serial=game.host.getStatus().lastSerial,frames=[];
    let last;
    await new Promise(resolve=>{
      const tick=now=>{if(last!==undefined)frames.push(now-last);last=now;if(now-begin>=2500)resolve();else requestAnimationFrame(tick)};
      requestAnimationFrame(tick);
    });
    const v=[...frames].sort((a,b)=>a-b);
    const end=game.loop.snapshot();
    return {seconds:(performance.now()-begin)/1000,samples:frames.length,p95Ms:v[Math.ceil(v.length*.95)-1],
      maxMs:v.at(-1),over50:v.filter(x=>x>50).length,worldFrames:eg.status.frames-worldStart,
      overlaySteps:end.steps-start.steps,overlayDraws:end.frames-start.frames,hostSerialDelta:game.host.getStatus().lastSerial-serial,
      loopState:end.state,frames};
  });
  record.idleSamples=[];
  for(let attempt=0;attempt<5;attempt++){
    const idle=await idleSample();record.idleSamples.push(idle);
    if(idle.overlayDraws===0&&idle.hostSerialDelta===0)break;
  }
  const idle=record.idleSamples.at(-1);
  player.expect(idle.loopState==='running'&&idle.overlaySteps>0&&idle.worldFrames>0&&idle.overlayDraws===0&&idle.hostSerialDelta===0,
    'natural static UI submits no frames while World3D and the overlay update loop continue');
  const before=await player.read(()=>{const g=window.egretGame.ui.game;return {frames:g.loop.snapshot().frames,serial:g.host.getStatus().lastSerial};});
  await press(p,'button:待命');await awaitMode(p,'idle');await ready(p,'button:结束回合');
  await p.waitForFunction(({frames,serial})=>{const g=window.egretGame.ui.game;
    return g.loop.snapshot().frames>frames&&g.host.getStatus().lastSerial>serial;},before,{timeout:15000,polling:100});
  record.afterWait=await player.read(start=>{const g=window.egretGame.ui.game;return {overlayDraws:g.loop.snapshot().frames-start.frames,
    hostSerialDelta:g.host.getStatus().lastSerial-start.serial};},before);
  record.startup=await player.read(()=>window.egretGame.ui.overlay.getStartupTiming());
  await player.checkpoint('post-wait');
  if(shot?.picture)fs.writeFileSync(path.join(path.dirname(shot.picture),'performance.json'),JSON.stringify(record,null,2)+'\n');
  player.expect(n>0,'browser produced animation frame observations');
  player.expect(record.afterWait.overlayDraws>0&&record.afterWait.hostSerialDelta>0,
    'committing Wait invalidates and submits the native interface normally');
}
