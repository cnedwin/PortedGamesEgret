// Native UI functional acceptance. All game progression here is driven by normal browser input.
import assert from 'node:assert/strict';
/** Read-only native engine semantic query mapped to the actual overlay CSS bounds. */
export function semanticTarget(query){
 const host=window.__snow?.ui;
 if(!host?.tester)return null;
 let match=[];try{match=host.tester.findAll(query);}catch{return null;}
 const node=match.find(n=>!n.inert&&!n.hidden&&!n.disabled&&n.bounds?.width>0&&n.bounds?.height>0);if(!node)return null;
 const rect=node.bounds,canvas=host.overlay.canvas.getBoundingClientRect(),f=host.game.frame;
 const box={x:canvas.x+rect.x*canvas.width/f.width,y:canvas.y+rect.y*canvas.height/f.height,width:rect.width*canvas.width/f.width,height:rect.height*canvas.height/f.height};
 return {id:node.id,name:node.name,role:node.role,box,x:box.x+box.width/2,y:box.y+box.height/2};
}
export function semanticReceipt(){
 const q=window.__snow,host=q.ui,c=host.overlay.canvas,b=c.getBoundingClientRect(),f=host.game.frame;
 const map=r=>({x:b.x+r.x*b.width/f.width,y:b.y+r.y*b.height/f.height,width:r.width*b.width/f.width,height:r.height*b.height/f.height});
 return {viewport:[innerWidth,innerHeight,devicePixelRatio],canvas:[c.width,c.height],logical:[f.width,f.height],screen:host.game.screen,
   nodes:host.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&n.bounds?.width>0&&n.bounds?.height>0).map(n=>({id:n.id,role:n.role,name:n.name,focused:n.focused,disabled:n.disabled,checked:n.checked,box:map(n.bounds)})),
   mode:q.game.mode,stage:q.game.stage,time:q.game.time,settingsOpen:q.hud.settingsOpen(),staged:q.hud.staged,overlay:host.game.loop.snapshot()};
}
export async function wait(page,condition,value,timeout=120000){await page.waitForFunction(condition,value,{timeout,polling:100});}
export async function ready(page,query){
 await wait(page,()=>window.__snow?.status.frames>0&&Boolean(window.__snow?.ui?.tester)||window.__snow?.status?.error||window.__snowLoading?.status?.error||document.querySelector('#error')?.hidden===false);
 const failure=await page.evaluate(()=>window.__snow?.status?.error?.message??window.__snowLoading?.status?.error?.message??(document.querySelector('#error')?.hidden===false?document.querySelector('#error')?.textContent:null));assert(!failure,failure);
 await page.evaluate(()=>window.__snow.ui.ready?.());
 if(query)await wait(page,q=>{try{const ui=__snow.ui;return ui.tester.findAll(q).some(n=>!n.inert&&!n.disabled&&n.bounds?.width>0);}catch{return false;}},query);
}
export async function target(page,query,device='mouse'){
 await ready(page);
 const find=name=>page.evaluate(semanticTarget,name),tap=async pt=>{if(device==='mouse')await page.mouse.click(pt.x,pt.y);else await page.touchscreen.tap(pt.x,pt.y);await page.evaluate(()=>__snow.ui.ready?.());};
 let point=await find(query);if(point)return point;
 const scrolling=await page.evaluate(()=>__snow.hud.settingsOpen());
 if(scrolling){
  const pageControl=async direction=>(await find('button:'+(direction<0?'上一页':'下一页')))??await find('button:'+(direction<0?'Previous page':'Next page'));
  for(const direction of [-1,1])for(let step=0;step<16;step++){
    const before=await page.evaluate(()=>__snow.hud.menuSnapshot().scroll),arrow=await pageControl(direction);if(!arrow)break;await tap(arrow);point=await find(query);if(point)return point;const after=await page.evaluate(()=>__snow.hud.menuSnapshot().scroll);if(after===before)break;
  }
 }
 await ready(page,query);return find(query);
}
export async function press(page,query,device='mouse'){
 const pt=await target(page,query,device);assert(pt,query);if(device==='mouse')await page.mouse.click(pt.x,pt.y);else await page.touchscreen.tap(pt.x,pt.y);
 await page.evaluate(()=>window.__snow.ui.ready?.());return pt;
}
export function nativeTouchGeometry(){
 const {ui,hud}=__snow,combat=hud.combat.snapshot(),c=ui.overlay.canvas.getBoundingClientRect(),f=ui.game.frame,
  rect=r=>({x:c.x+r.x*c.width/f.width,y:c.y+r.y*c.height/f.height,width:r.width*c.width/f.width,height:r.height*c.height/f.height});
 const stickBox=rect(combat.stick.box),stick={x:stickBox.x+stickBox.width*.5,y:stickBox.y+stickBox.height*.5};
 const pads=Object.fromEntries(Object.entries(combat.pads).map(([name,o])=>{const b=rect(o.box);return[name,{x:b.x+b.width/2,y:b.y+b.height/2,shown:o.available,width:b.width,height:b.height,label:o.label}];}));
 return {stick,stickBox,pads,width:innerWidth,height:innerHeight,radiusCss:combat.stick.radiusCss,hasStick:combat.stick.available,coarse:matchMedia('(pointer:coarse)').matches};
}

import {BOONS} from '../src/rules/boons.mjs';
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
/** Observation only: preserving the normal world-update and render call. */
export function attachChapterObserver(){
 if(window.__snowTestEvents)return;
 const list=window.__snowTestEvents=[];
 const view=window.__snow.view,original=view.update;
 view.update=function(game,events,...args){
   for(const event of events)list.push({type:event.type,t:game.time,stage:game.stage,phase:game.boss.phase,party:game.party,id:event.id,kind:event.kind});
   return Reflect.apply(original,this,[game,events,...args]);
 };
}
export function readChapterState(cursor){
 const {game,hud,view,status}=window.__snow;
 const {hero,foes,shots,drops,stage,time,party,cine,checkpoint,boss}=game;
 const place=actor=>({x:actor.x,z:actor.z}),aim=actor=>view.screen(actor.x,.9,actor.z).slice(0,2);
 return {stage,time,party,cine,checkpoint,phase:boss.phase,hp:boss.hp,staged:hud.staged,statusError:status.error?.message,mode:game.mode,tier:game.tier,wave:game.wave,choice:game.choice?.options,boons:game.boons,
  hero:{...place(hero),screen:aim(hero),face:hero.face,hp:hero.hp,stamina:hero.stamina,will:hero.will,gourd:hero.gourd,state:hero.state,t:hero.t,queued:hero.queued,freeze:hero.freeze,safe:hero.safe,counter:hero.counter,starsWait:hero.starsWait},
  foes:foes.map(foe=>({...place(foe),id:foe.id,kind:foe.kind,state:foe.state,move:foe.move,t:foe.t,hp:foe.hp,aim:foe.aim,struck:foe.struck,screen:aim(foe)})),
  shots:shots.map(shot=>({...place(shot),face:shot.face,speed:shot.speed,from:shot.from,owner:shot.owner?{...place(shot.owner),screen:aim(shot.owner)}:null})),
  drops:drops.map(drop=>({...place(drop),kind:drop.kind,landed:drop.landed,taken:drop.taken})),events:window.__snowTestEvents.slice(cursor)};
}
const available = new Set(['free', 'guard', 'glide']);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const towards = (from,to) => ({ x: to.x-from.x, z: to.z-from.z });
const stop = { x: 0, z: 0 };

export function chooseCommand(state, history) {
  const { hero, foes, shots, stage } = state;
  const input = { move: stop, aim: null, guard: false, pulse: null };
  if (state.cine > 0 || state.staged || hero.state === 'dead' || stage === 'done') return input;
  const living = foes.filter(foe => !['wait', 'dead'].includes(foe.state)).sort((a,b) => distance(hero,a)-distance(hero,b));
  const target = living[0];
  if (!target) {
    let waypoint = { x: 0, z: 3 };
    if (stage === 'gate') {
      if (state.checkpoint !== 'rest') waypoint = { x: -2.35, z: -6.55 };
      else if (Math.abs(hero.x) > 0.55 && hero.z > -11) waypoint = { x: 0, z: hero.z };
      else waypoint = { x: 0, z: -27 };
    } else if (stage === 'yard') {
      const drop = state.drops.filter(entry => entry.landed && !entry.taken).sort((a,b) => distance(hero,a)-distance(hero,b))[0];
      if (drop) waypoint = drop;
    }
    const goal = towards(hero,waypoint);
    if (Math.abs(goal.x) > 0.18 || Math.abs(goal.z) > 0.18) input.move = goal;
    return input;
  }
  const gap = distance(hero,target);
  input.aim = target;
  const threats = living.flatMap(foe => {
    const {move} = foe;
    if (!move || !['windup','strike'].includes(foe.state) || (foe.state === 'strike' && foe.struck) || (foe.kind === 'bow' && !move.unblockable)) return [];
    const remaining = (foe.state === 'windup' ? move.windup-foe.t : -foe.t)+move.active/2;
    const risk = move.shape === 'disc' ? distance(hero,foe.aim) <= move.range+0.9 : distance(hero,foe) <= move.range + (move.lunge ?? 0) + 0.6;
    return risk ? [{ foe, move, remaining }] : [];
  }).sort((a,b) => a.remaining-b.remaining);
  const threat = threats[0];
  const projectile = shots.flatMap(shot => {
    if (shot.from !== 'foe') return [];
    const dx=hero.x-shot.x, dz=hero.z-shot.z, along=dx*Math.sin(shot.face)+dz*Math.cos(shot.face);
    const across=Math.abs(dx*Math.cos(shot.face)-dz*Math.sin(shot.face));
    return along >= -0.2 && along < shot.speed*0.18 && across<0.75 ? [shot] : [];
  })[0];
  if (hero.counter > 0 && available.has(hero.state) && hero.freeze <= 0) {
    input.pulse = 'attack';
    return input;
  }
  if (hero.safe <= 0 && projectile && (!threat || threat.remaining > 0.1) && available.has(hero.state)) {
    input.aim = projectile.owner ?? projectile;
    input.guard = true;
    return input;
  }
  if (hero.safe <= 0 && threat) {
    const { foe, move, remaining } = threat;
    const dodge = move.unblockable || move.shape === 'line' || move.shape === 'lines';
    if (dodge && remaining <= 0.20 && hero.stamina >= 11 && !['dodge','hurt','rain','riposte'].includes(hero.state)) {
      const away = towards(foe,hero);
      if (move.shape === 'line' || move.shape === 'lines') {
        input.move = {x: -away.z || 0.5, z: away.x};
        if (Math.abs(hero.x) > 6 && Math.sign(input.move.x) === Math.sign(hero.x)) input.move = {x:-input.move.x,z:-input.move.z};
      } else input.move = away;
      input.pulse = 'dodge';
    } else if (!dodge && remaining <= (history.touch ? 0.215 : 0.19)) {
      input.aim = foe;
      input.guard = true;
    }
    return input;
  }
  if (hero.hp < 70 && hero.gourd > 0 && available.has(hero.state)) {
    input.pulse = 'drink';
    return input;
  }
  if (stage === 'yard' && !history.riposte && target.kind !== 'bow' && gap <= 2.65) return input;
  if (hero.will >= 100 && gap < 7.7 && available.has(hero.state)) input.pulse = 'rain';
  else if (hero.starsWait <= 0 && gap < 11 && gap > 2.4 && available.has(hero.state)) input.pulse = 'stars';
  else if (gap > (target.kind === 'lu' ? 2.75 : 2.65)) input.move = towards(hero,target);
  else if (available.has(hero.state) || (hero.state === 'cut' && hero.t > 0.065 && hero.t < 0.42 && !hero.queued && target.kind === 'shield')) input.pulse = 'attack';
  return input;
}

export function bindKeyboardMouse(page){
 const held=new Set();let guard=false,aim=null;
 const pulseKeys={dodge:'Space',stars:'f',rain:'q',drink:'e',glide:'Shift'};
 return {async send(command){const next=new Set(),{x,z}=command.move;const size=page.viewportSize();if(Math.abs(x)>.19&&Math.abs(x)>Math.abs(z)*.415)next.add(x>0?'d':'a');if(Math.abs(z)>.19&&Math.abs(z)>Math.abs(x)*.415)next.add(z>0?'s':'w');
  for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}
  if(command.aim?.screen&&(command.guard||command.pulse==='attack'||command.pulse==='stars')){const a=command.aim.screen;const point=[Math.min(size.width-20,Math.max(20,a[0]*size.width)),Math.min(size.height-80,Math.max(38,a[1]*size.height))];if(!aim||Math.hypot(point[0]-aim[0],point[1]-aim[1])>2){await page.mouse.move(...point);aim=point;}}
  if(guard!==command.guard){if(command.guard)await page.mouse.down({button:'right'});else await page.mouse.up({button:'right'});guard=command.guard;}
  if(command.pulse==='attack'&&aim)await page.mouse.click(...aim);else if(pulseKeys[command.pulse])await page.keyboard.press(pulseKeys[command.pulse]);
 },async clear(){for(const key of held)await page.keyboard.up(key);held.clear();if(guard)await page.mouse.up({button:'right'});guard=false;}};
}
export async function selectLesson(page,state,index=0,device='mouse'){
 const id=state.choice[index],name=BOONS[id]?.name;assert(name,'Unknown lesson '+id);
 await ready(page);const paused=await page.evaluate(()=>__snow.game.time);await page.waitForTimeout(470);assert.equal(await page.evaluate(()=>__snow.game.time),paused,'The actual manual page must pause the game');const {nodes}=await page.evaluate(semanticReceipt);const button=nodes.find(n=>['button','radio'].includes(n.role)&&n.name.includes(name)&&!n.disabled);
 assert(button,JSON.stringify({id,name,nodes}));if(device==='keyboard')await page.keyboard.press(String(index+1));else await press(page,button.role+':'+button.name,device);
 await wait(page,selected=>!__snow.game.choice&&__snow.game.boons.includes(selected),id,15000);return {id,name,control:button.name};
}
export async function driveChapter(page,input,{checkpoint=async()=>{},onStage=async()=>{},onState=async()=>{},deadlineMs=365000,firstLessonKeyboard=false}={}){
 const seen=new Set(),milestones={},history={riposte:false,touch:false},lessons=[],lastPulse={};let cursor=0,state,lastRecord=-10;
 const deadline=Date.now()+deadlineMs;while(Date.now()<deadline){state=await page.evaluate(readChapterState,cursor);cursor+=state.events.length;
   assert(!state.statusError,state.statusError);
   for(const event of state.events){const key=event.type==='stage'?(event.stage==='done'?'win':'stage-'+event.stage):event.type==='party'?'yard-second-party':event.type==='cine'?'cine-'+event.id:event.type;if(!milestones[key])milestones[key]=event;if(event.type==='riposteHit')history.riposte=true;}
   if(state.phase===2&&!milestones['boss-phase-2'])milestones['boss-phase-2']={t:state.time,hp:state.hp};
   if(state.stage==='done'){await input.clear();break;}
   if(state.hero.state==='dead')throw Error('Chapter hero defeated before requested completion');
   if(state.choice?.length){await input.clear();if(!lessons.length)await checkpoint('lesson',state);const device=!lessons.length&&firstLessonKeyboard?'keyboard':'mouse';const choice=await selectLesson(page,state,lessons.length?1:0,device);lessons.push({time:state.time,stage:state.stage,device,...choice});continue;}
   const phase=state.cine>0?state.stage+'-cine':state.stage==='boss'?'boss-'+state.phase:state.stage;
   if(!seen.has(phase)){seen.add(phase);await onStage(phase,state);}
   await onState(state,input);
   if(state.time>=lastRecord+5){lastRecord=state.time;console.log(JSON.stringify({time:state.time,stage:state.stage,party:state.party,phase:state.phase,hp:state.hero.hp,enemyHP:state.hp,x:state.hero.x,z:state.hero.z}));}
   const command=chooseCommand(state,history);if(command.pulse){if(state.time-(lastPulse[command.pulse]??-99)<.10)command.pulse=null;else lastPulse[command.pulse]=state.time;}
   await input.send(command);await sleep(16);
 }
 assert.equal(state?.stage,'done','Actual chapter exceeded time budget');
 return{state,milestones,lessons};
}
