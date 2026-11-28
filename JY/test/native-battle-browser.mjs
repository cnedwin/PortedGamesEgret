// Native phase-4 browser route. It reads public presentation counters and
// presses rendered controls only; no scenario, inventory, participant or save
// data is changed by the harness. Run in the ordinary isolated acceptance origin.
import assert from 'node:assert/strict';
import { join } from 'node:path';

const details=['scene','mode','phase','opening','x','y','trainer','eventId','battleId','teamCount',
 'battleView','battleResult','battlePrompt','battleCommandMode','battlePreview','battleTick','battleRound','battleHp',
 'battleMaxHp','battleMp','battleAction','battleAuto','battleTurnSide','battleControlled','battleCue','battleCueCount','battleCastRole','battleItemCount','battleItemId','battleDartHit',
 'rewardItem','saveRevision','wins','losses'];
function finite(value){return Number.isFinite(Number(value))?Number(value):undefined;}
const sleep=(page,ms=100)=>page.waitForTimeout(ms);

export function createBattleAcceptanceProbe(page,{out,stamp,check}){
 const state=()=>page.evaluate(keys=>{const d=document.querySelector('#game')?.dataset??{},qa=globalThis.__jyNativeQa;
   return {...Object.fromEntries(keys.filter(key=>d[key]!==undefined).map(key=>[key,d[key]])),host:Boolean(qa?.host),nativeBattle:qa?.battleControls?.phase};},details);
 const shot=async name=>page.screenshot({path:join(out,name+'.png')});
 async function query(query){return page.evaluate(async name=>{
   const qa=globalThis.__jyNativeQa;if(!qa?.semantics||!qa?.game)return [];
   qa.semantics.publish();const {createUiTester}=await import('@egret/engine/ui/testing');const tester=createUiTester({semantics:qa.semantics});
   const nodes=tester.findAll(name).filter(n=>['button','switch','checkbox','option','radio'].includes(n.role)&&!n.disabled&&!n.inert&&!n.hidden&&n.bounds);
   const r=qa.game.canvas.getBoundingClientRect(),f=qa.game.browser.frame;
   // Opaque visible rows are returned as geometry only. No actual narrative,
   // participant or item names are retained in the test output.
   return nodes.map(n=>({x:r.left+(n.bounds.x+n.bounds.width/2)*r.width/f.width,y:r.top+(n.bounds.y+n.bounds.height/2)*r.height/f.height,
    width:n.bounds.width*r.width/f.width,height:n.bounds.height*r.height/f.height}));
 },query);}
 async function usable(name){return (await query(name).catch(()=>[])).find(n=>n.width>=43.5&&n.height>=43.5);}
 async function until(predicate,{timeout=15000,label='state transition',required=true,interval=120}={}){
   const deadline=Date.now()+timeout;let observed;
   while(Date.now()<deadline){observed=await state();if(observed.phase==='failed'||observed.trainer==='error')throw Error('Runtime failed during '+label);
     if(await predicate(observed))return observed;await sleep(page,interval);}
   if(required)throw Error(label+' did not reach the expected public state: '+JSON.stringify(observed));return undefined;
 }
 async function pressAt(point,name){
  check(point.width>=43.5&&point.height>=43.5,name+' usable target',point);
  const touch=await page.evaluate(()=>navigator.maxTouchPoints>0);
  if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  await sleep(page,100);return true;
 }
 async function named(name,{timeout=12000,required=true}={}){
   const deadline=Date.now()+timeout;let p;
   while(Date.now()<deadline){p=await usable(name);if(p)break;await sleep(page,100);}
   if(!p){if(required)throw Error('Native control unavailable: '+name);return false;}
   return pressAt(p,name);
 }
 async function firstVisibleRow(label){
   // Use the actual semantic choice-list container with a public role query,
   // not a game-data item ID or a hard-coded screen coordinate.
   const row=(await query('choice-list / button').catch(()=>[])).find(n=>n.width>=43.5&&n.height>=43.5);
   if(!row)return false;return pressAt(row,label);
 }
 async function ensureCommand(name){
   if(await usable(name))return true;
   if(await usable('More')){await named('More');if(await usable(name))return true;}
   if(await usable('Back to commands')){await named('Back to commands');if(await usable(name))return true;}
   return false;
 }
 async function chooseCursor(type){
   let s=await state();if(s.battleCommandMode!==type)return false;
   if(s.battlePreview===type&&await usable('Confirm preview'))return true;
   for(const direction of ['Cursor up','Cursor right','Cursor down','Cursor left']){
    if(await usable(direction)){await named(direction);s=await state();if(s.battlePreview===type&&await usable('Confirm preview'))return true;}
   }
   return false;
 }
 async function cancelSelection(){const s=await state();if(!s.battleCommandMode)return;
   if(await ensureCommand('Cancel'))await named('Cancel');else await page.keyboard.press('Escape');
   await sleep(page,100);
 }
 async function manualPreview(name,type,shotName){
   if(!await ensureCommand(name))return {status:'unavailable'};
   const before=await state();await named(name);
   const selected=await until(s=>s.battleCommandMode===type||Boolean(s.battleResult),{timeout:5000,required:false,label:name});
   if(!selected||selected.battleResult)return {status:'unavailable'};
   if(!await chooseCursor(type)){await cancelSelection();return {status:'no-valid-preview'};}
   await shot(shotName+'-preview');const preview=await state();await named('Confirm preview');
   const accepted=await until(s=>s.battleCommandMode!==type&&(finite(s.battleTick)>finite(preview.battleTick)||Boolean(s.battleResult)),
      {timeout:15000,required:false,label:name+' confirmation'});
   if(!accepted){await cancelSelection();return {status:'not-confirmed'};}
   await shot(shotName+'-confirmed');
      const observed=type==='magic'?await until(s=>s.battleCastRole===before.battleControlled&&((s.battleCue==='cast'&&(finite(s.battleCueCount)??0)>(finite(before.battleCueCount)??0))||s.battleCastRole!==before.battleCastRole),
     {timeout:12000,required:false,label:'skill cast cue'}):undefined;
   const cast=Boolean(observed);
   return {status:'confirmed',...(type==='magic'&&{castObserved:cast}),beforeTick:before.battleTick,afterTick:accepted.battleTick};
 }
 async function manualItem(){
   if(!await ensureCommand('Items and supplies'))return {status:'unavailable'};
   const before=await state();await named('Items and supplies');
   const opened=await until(s=>s.battlePrompt==='items',{timeout:5000,required:false,label:'native item choices'});
   if(!opened)return {status:'not-opened'};
   await shot('native-battle-items');
   if(!await firstVisibleRow('first available native item')){if(await usable('Back'))await named('Back');return {status:'no-visible-item'};}
   let current=await until(s=>s.battlePrompt!=='items'||s.battleCommandMode==='dart',
     {timeout:10000,required:false,label:'native item row accepted'});
   if(!current)return {status:'item-row-not-accepted'};
   if(current.battleCommandMode==='dart'){
     if(!await chooseCursor('dart')){await cancelSelection();return {status:'no-valid-item-target'};}
     await named('Confirm preview');
   }
   current=await until(s=>s.battlePrompt!=='items'&&((s.battleItemCount!==before.battleItemCount)||s.battleItemId!==before.battleItemId||s.battleDartHit!==before.battleDartHit),
      {timeout:15000,required:false,label:'item resolved'});
   return current? {status:'used',inventoryCounterChanged:current.battleItemCount!==before.battleItemCount,usageMarkerChanged:current.battleItemId!==before.battleItemId||current.battleDartHit!==before.battleDartHit}: {status:'not-confirmed'};
 }
 async function manualRest(){
   if(!await ensureCommand('Rest'))return {status:'unavailable'};
   const before=await state();await named('Rest');
   const after=await until(s=>s.battleAction!==before.battleAction||s.battleTurnSide!==before.battleTurnSide||s.battleRound!==before.battleRound||Boolean(s.battleResult),
    {timeout:12000,required:false,label:'Rest advances turn'});
   return after?{status:'rested',before:before.battleRound,after:after.battleRound}: {status:'not-confirmed'};
 }
 return {state,shot,query,usable,named,firstVisibleRow,until,ensureCommand,manualPreview,manualItem,manualRest,cancelSelection};
}

async function verifyBattleViewport(page,p,{out,stamp,check},sizes,{prefix='battle-selection',selection,buttonNames=[]}={}){
 if(typeof page.viewportSize!=='function'||typeof page.setViewportSize!=='function'||typeof page.evaluateHandle!=='function'){
  // A physical-device adapter may own orientation externally. Do not count
  // an unavailable simulated resize or object-identity probe as a pass.
  stamp('native-'+prefix+'-viewport-not-run',{reason:'Adapter does not expose controlled viewport resizing and host identity handles; verify device orientation separately'});
  return;
 }
 const original=page.viewportSize();
 const owner=await page.evaluateHandle(()=>globalThis.__jyNativeQa?.host);
 const canvas=await page.evaluateHandle(()=>globalThis.__jyNativeQa?.game?.canvas);
 try{
   for(const size of sizes){
     await page.setViewportSize(size);
     await page.waitForFunction(({width,height})=>{const r=globalThis.__jyNativeQa?.game?.canvas?.getBoundingClientRect();return r&&Math.abs(r.width-width)<3&&Math.abs(r.height-height)<3},size,{timeout:15000});
     await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
     const same=await page.evaluate(([owner,canvas])=>globalThis.__jyNativeQa?.host===owner&&globalThis.__jyNativeQa?.game?.canvas===canvas,[owner,canvas]);
     const geometry=await page.evaluate(()=>{
       const q=globalThis.__jyNativeQa,g=q.game;q.semantics.publish();
       const r=g.canvas.getBoundingClientRect(),f=g.browser.frame,s=g.safe,a=g.toStage(s.x,s.y),b=g.toStage(s.x+s.width,s.y+s.height);
       const map=box=>({x:r.left+box.x*r.width/f.width,y:r.top+box.y*r.height/f.height,width:box.width*r.width/f.width,height:box.height*r.height/f.height});
       const rects=q.semantics.snapshot.nodes.filter(n=>['button','switch','checkbox','option','radio'].includes(n.role)&&!n.hidden&&!n.inert&&n.bounds)
         .map(n=>({name:n.name,disabled:n.disabled,...map(n.bounds)}));
       return {safe:map({x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}),rects};
     });
     const tag=prefix+'-'+size.width+'x'+size.height,state=await p.state();
     check(same,tag+' retains identical native host and canvas');
     if(selection)check(state.battleCommandMode===selection,tag+' preserves existing selection',{expected:selection,actual:state.battleCommandMode});
     for(const name of buttonNames)check(geometry.rects.some(r=>r.name===name||r.name.startsWith(name+' · ')),tag+' exposes '+name);
     check(geometry.rects.length>0,tag+' exposes rendered controls');
     const {safe,rects}=geometry;
     for(const r of rects){
       check(r.width>=43.5&&r.height>=43.5,tag+' target '+r.name,r);
       check(r.x>=safe.x-1&&r.y>=safe.y-1&&r.x+r.width<=safe.x+safe.width+1&&r.y+r.height<=safe.y+safe.height+1,tag+' safe '+r.name,r);
     }
     for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
       const a=rects[i],b=rects[j];check(a.x+a.width<=b.x+1||b.x+b.width<=a.x+1||a.y+a.height<=b.y+1||b.y+b.height<=a.y+1,tag+' controls do not overlap: '+a.name+' / '+b.name);
     }
     await p.shot('native-'+tag);stamp('native-'+tag,{same,geometry,selection:state.battleCommandMode});
   }
 }finally{if(original)await page.setViewportSize(original);await owner.dispose();await canvas.dispose();}
}

/** Call at the end of the actual completed opening, BEFORE the travel helper
 * presses Go to exit. The route does not assume a chosen encounter ID,
 * participant name, item ID, health or reward amount. */
export async function acceptNativeBattle(page,{out,stamp,check,finish='auto-after-manual',manualRounds=8,
 manualOrder=['item','rest','move','skill']}={}){
 assert(['auto-after-manual','manual'].includes(finish),'Explicit battle finish policy required');
 assert(manualOrder.length===4&&new Set(manualOrder).size===4&&manualOrder.every(name=>['item','rest','move','skill'].includes(name)),
  'Manual order must contain item, rest, move and skill exactly once');
 const p=createBattleAcceptanceProbe(page,{out,stamp,check});
 let s=await p.state();assert(s.mode==='submap'&&s.phase==='ready'&&s.opening==='complete','Run complete native opening first');
 const beforeMove=s,saveBefore=finite(s.saveRevision)??0;
 if(s.x==='19'&&s.y==='19')stamp('native-battle-route-at-trainer',{x:s.x,y:s.y,approach:'already present in saved play'});
 else{
  if(!await p.named('Move up',{timeout:3000,required:false}))await page.keyboard.press('ArrowUp');
  s=await p.until(value=>value.x!==beforeMove.x||value.y!==beforeMove.y,{label:'one real exploration move'});
  stamp('native-battle-route-move',{before:[beforeMove.x,beforeMove.y],after:[s.x,s.y]});
 }
 if(!await p.named('Talk',{timeout:3000,required:false}))await page.keyboard.press('Enter');
 // Existing event interpreter owns dialogue and selection; the browser only
 // presses named generic affordances until the real team/arena transition.
 const enterDeadline=Date.now()+90000;let teamSelected=false,openingPages=0;
 while(Date.now()<enterDeadline){
   s=await p.state();if(s.trainer==='error'||s.phase==='failed')throw Error('Encounter entry failed');
   if(s.trainer==='battle')break;
   if(await p.usable('Confirm team')||await p.usable('Toggle all')){
     await p.shot('native-battle-team');
     if(await p.usable('Toggle all')){
       await p.named('Toggle all');
       if(!await p.usable('Confirm team'))await p.named('Toggle all');
     }else if(!await p.usable('Confirm team'))await p.firstVisibleRow('first available team choice');
     await p.named('Confirm team');teamSelected=true;
   }else if(await p.usable('Continue')){await p.named('Continue');openingPages++;}
   else if(await p.usable('Yes'))await p.named('Yes');
   else await sleep(page,200);
 }
 s=await p.until(value=>value.trainer==='battle'&&value.battleId!==undefined,{timeout:90000,label:'real encounter starts'});
 check(teamSelected,'native team selection exercised');stamp('native-battle-entered',{battleId:s.battleId,eventId:s.eventId,teamSelected,openingPages,view:s.battleView,teamCount:s.teamCount});
 await p.shot('native-battle-initial');
 // Hold a real, uncommitted movement selection during viewport changes. The
 // same host and canvas must survive, and no viewport mutation may execute it.
 await p.until(async q=>Boolean(q.battleResult)||Boolean(await p.usable('Choose movement')),{timeout:30000,label:'initial native movement selection'});
 await p.named('Choose movement');await p.until(q=>q.battleCommandMode==='move',{label:'movement selection for rotation'});
 await verifyBattleViewport(page,p,{out,stamp,check},[
  {width:873,height:325},{width:393,height:852},{width:768,height:1024},{width:1280,height:800},{width:844,height:390}
 ],{selection:'move',buttonNames:['Choose movement','Choose skill','Items and supplies','More']});
 await p.cancelSelection();await p.until(q=>q.battleCommandMode!=='move',{label:'ordinary selection cancel after rotation'});
 // Cover all four manual UI command families before any optional auto-play.
 // A command that is genuinely unavailable is reported as such; no injected
 // item, movement range, energy, health or timeline is ever used.
 const coverage={move:{status:'unattempted'},skill:{status:'unattempted'},item:{status:'unattempted'},rest:{status:'unattempted'}};
 for(let i=0;i<manualRounds;i++){
   s=await p.until(async q=>Boolean(q.battleResult)||Boolean(await p.usable('Choose movement')||await p.usable('Choose skill')||await p.usable('Rest')||await p.usable('Items and supplies')),
      {timeout:30000,label:'manual player turn',required:false});
   if(!s||s.battleResult)break;
   // Test-only ordering of ordinary user controls. Short random encounters can
   // finish before every command is offered; prefer actual item/rest early.
   for(const family of manualOrder){
    if((await p.state()).battleResult)break;
    if(family==='item'&&coverage.item.status!=='used')coverage.item=await p.manualItem();
    if(family==='move'&&coverage.move.status!=='confirmed')coverage.move=await p.manualPreview('Choose movement','move','native-battle-manual-move');
    if(family==='skill'&&(coverage.skill.status!=='confirmed'||!coverage.skill.castObserved))coverage.skill=await p.manualPreview('Choose skill','magic','native-battle-manual-skill');
    if(family==='rest'&&coverage.rest.status!=='rested')coverage.rest=await p.manualRest();
   }
   stamp('native-battle-manual-attempt',{attempt:i+1,coverage:structuredClone(coverage)});
   if(coverage.move.status==='confirmed'&&coverage.skill.status==='confirmed'&&coverage.skill.castObserved&&coverage.item.status==='used'&&coverage.rest.status==='rested')break;
   // Yield a real turn if no other manual action was possible.
   if(await p.ensureCommand('Rest'))await p.manualRest();
 }
 const manualComplete=coverage.move.status==='confirmed'&&coverage.skill.status==='confirmed'&&coverage.skill.castObserved&&coverage.item.status==='used'&&coverage.rest.status==='rested';
 check(coverage.move.status==='confirmed','actual manual move preview confirmed',coverage.move);
 check(coverage.skill.status==='confirmed'&&coverage.skill.castObserved,'actual manual skill preview and cast observed',coverage.skill);
 check(coverage.item.status==='used','actual manual item used',coverage.item);
 check(coverage.rest.status==='rested','actual manual Rest advanced turn',coverage.rest);
 s=await p.state();let autoEnabled=false;
 if(!s.battleResult&&finish==='auto-after-manual'){
   // Rest can leave the expanded command rail visible. Restore the ordinary
   // command rail through its real Back to commands control before waiting.
   await p.ensureCommand('Automatic play');
   const auto=await p.until(async q=>Boolean(q.battleResult)||Boolean(await p.usable('Automatic play')),
     {timeout:30000,required:false,label:'automatic finish control'});
   if(auto&&!auto.battleResult&&await p.ensureCommand('Automatic play')){
      await p.named('Automatic play');
      await p.until(q=>q.battleAuto==='true'||Boolean(q.battleResult),{label:'explicit auto finish'});autoEnabled=true;
   }
   if(!autoEnabled&&!(await p.state()).battleResult)throw Error('Explicit automatic finish control unavailable after manual checks');
 }else if(!s.battleResult&&finish==='manual'){
   // Every attempt is a rendered command. This is a manual regression path,
   // not a guarantee of a winning strategy.
   for(let i=0;i<80;i++){
      s=await p.until(async q=>Boolean(q.battleResult)||Boolean(await p.usable('Choose skill')||await p.usable('Choose movement')||await p.usable('Rest')),
        {timeout:30000,required:false,label:'manual finish player turn'});if(!s||s.battleResult)break;
      const skill=await p.manualPreview('Choose skill','magic','native-battle-manual-finish');
      if(skill.status!=='confirmed')await p.manualRest();await sleep(page,180);
   }
 }
 stamp('native-battle-finish-policy',{finish,manualOrder,manualComplete,autoEnabled,coverage});
 s=await p.until(q=>q.trainer==='result'&&['win','loss'].includes(q.battleResult),{timeout:240000,label:'real encounter settlement'});
 await p.shot('native-battle-result');const won=s.battleResult==='win',settled={result:s.battleResult,ticks:s.battleTick,round:s.battleRound,autoEnabled};
 await verifyBattleViewport(page,p,{out,stamp,check},[{width:393,height:852},{width:844,height:390}],{prefix:'battle-result',buttonNames:['Continue']});
 await p.named('Continue');
 const finishDeadline=Date.now()+90000;
 while(Date.now()<finishDeadline){
   s=await p.state();if(finite(s.saveRevision)>saveBefore&&s.trainer==='saved'&&!await p.usable('Continue'))break;
   if(await p.usable('Continue'))await p.named('Continue');else await sleep(page,200);
 }
 s=await p.state();check((finite(s.saveRevision)??0)>saveBefore,'post-battle actual automatic save revision advances',{before:saveBefore,after:s.saveRevision});
 stamp('native-battle-settled',{...settled,saveRevision:s.saveRevision,rewardShown:won&&s.rewardItem!==undefined,wins:s.wins,losses:s.losses});
 // A defeat has no promised reward: never report a reward as tested when
 // this actual outcome was defeat. The chosen outcome is always explicit.
 if(won){check(s.rewardItem!==undefined,'winning route exposed reward indicator');await p.shot('native-battle-after-reward');}
 const savedRevision=finite(s.saveRevision)??0;
 await page.reload({waitUntil:'domcontentloaded'});
 let reloadMode;
 const reloadDeadline=Date.now()+120000;
 while(Date.now()<reloadDeadline){
   const current=await p.state();if(current.phase==='ready'&&current.host&&current.opening==='complete'){reloadMode='direct-resume';break;}
   const english=await p.usable('Continue journey'),chinese=await p.usable('繼續旅程');
   if(english||chinese){await p.shot('native-battle-reload-title');await p.named(english?'Continue journey':'繼續旅程');reloadMode='native-title-continue';break;}
   await sleep(page,180);
 }
 if(!reloadMode){await p.shot('native-battle-reload-stalled');stamp('native-battle-reload-stalled',{url:page.url(),state:await p.state()});throw Error('Reload did not resume and no enabled native Continue is present');}
 const reloaded=await p.until(q=>q.phase==='ready'&&q.host&&q.opening==='complete',{timeout:120000,label:'actual reload Continue returns saved play'});
 check((finite(reloaded.saveRevision)??0)>=savedRevision,'actual reload retains committed save revision',{savedRevision,reloaded:reloaded.saveRevision});
 await p.shot('native-battle-reloaded');stamp('native-battle-reload',{mode:reloadMode,scene:reloaded.scene,saveRevision:reloaded.saveRevision});
 return {manualComplete,coverage,autoEnabled,won,settled,reloaded};
}
