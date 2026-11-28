import assert from 'node:assert/strict';
import { join } from 'node:path';

// Read only public named UI geometry and lifecycle counters. Drive the real
// controls; neither scripted dialogue text nor underlying save data is read.
export async function acceptNativeTravel(page,{out,stamp,check,runBattle=false,battleFinish='auto-after-manual',battleOrder}){
 const state=()=>page.evaluate(()=>{const d=document.querySelector('#game')?.dataset??{},host=globalThis.__jyNativeQa?.host,stats=host?.stats;return{scene:d.scene,mode:d.mode,phase:d.phase,opening:d.opening,page:d.talkPage,pages:d.talkPages,animationFrames:d.animationFrames,worldView:d.worldView,host:!!host,
  ...(stats&&{frames:{submitted:stats.submitted,retained:stats.retained,refused:stats.refused,retry:stats.retry,revision:stats.requestedRevision}})}});
 async function bounds(name){return page.evaluate(async label=>{
  const q=globalThis.__jyNativeQa;if(!q?.game||!q?.semantics)return null;q.semantics.publish();
  const {createUiTester}=await import('@egret/engine/ui/testing');const tester=createUiTester({semantics:q.semantics});
  const candidates=tester.findAll(label).filter(n=>n.role==='button'&&!n.disabled&&!n.inert&&!n.hidden&&n.bounds);
  const n=candidates[0];if(!n)return null;const b=n.bounds,r=q.game.canvas.getBoundingClientRect(),f=q.game.browser.frame;
  return {x:r.left+(b.x+b.width/2)*r.width/f.width,y:r.top+(b.y+b.height/2)*r.height/f.height,width:b.width*r.width/f.width,height:b.height*r.height/f.height};
 },name)}
 async function named(name,{timeout=15000}={}){const end=Date.now()+timeout;let at;while(Date.now()<end){try{at=await bounds(name)}catch{}if(at)break;await page.waitForTimeout(100)}assert(at,`Native control ${name} unavailable`);check(at.width>=43.5&&at.height>=43.5,`${name} usable touch target`,at);if(await page.evaluate(()=>navigator.maxTouchPoints>0))await page.touchscreen.tap(at.x,at.y);else await page.mouse.click(at.x,at.y);return at;}
 async function revealByScroll(name){
  // A fully clipped row is correctly absent from the semantic tree. Exercise
  // the actual scroll viewport first instead of asserting invisible controls.
  const scroller=await page.evaluate(()=>{const q=globalThis.__jyNativeQa,s=q?.semantics,c=q?.game?.canvas,f=q?.game?.browser.frame;s?.publish();const n=s?.snapshot.nodes.find(n=>n.name==='choice-list'&&!n.hidden&&!n.inert&&n.bounds);if(!n||!c||!f)return null;const b=n.bounds,r=c.getBoundingClientRect();return{x:r.left+(b.x+b.width/2)*r.width/f.width,y:r.top+(b.y+b.height/2)*r.height/f.height,height:b.height*r.height/f.height};});
  const at=scroller??await bounds('View inventory');assert(at,'Native menu scroll viewport unavailable');
  await page.mouse.move(at.x,at.y);
  for(let i=0;i<8;i++){
   const rect=await bounds(name).catch(()=>null);if(rect&&rect.height>=43.5&&rect.width>=43.5)return rect;
   await page.mouse.wheel(0,Math.max(60,Math.floor(at.height*.65)));await page.waitForTimeout(180);
  }
  return await bounds(name).catch(()=>null);
 }
 const activeModal=()=>page.evaluate(()=>{const s=globalThis.__jyNativeQa?.semantics;if(!s)return false;s.publish();return s.snapshot.nodes.some(n=>n.role==='dialog'&&n.modal&&!n.hidden&&!n.inert)});
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.opening==='talk'&&!!globalThis.__jyNativeQa?.host,null,{timeout:90000});
 const first=await state();stamp('native-dialogue-ready',first);
 await page.screenshot({path:join(out,'native-dialogue-first.png')});
 const historyRect=await named('Review dialogue');
 try{await page.waitForFunction(()=>{const s=globalThis.__jyNativeQa?.semantics;if(!s)return false;s.publish();return s.snapshot.nodes.some(n=>n.role==='dialog'&&!n.hidden&&!n.inert)},null,{timeout:15000});}
 catch(error){
  // Keep only presentation geometry and generic node counts in the receipt.
  const diagnostic=await page.evaluate(({x,y})=>{const q=globalThis.__jyNativeQa,s=q?.semantics,c=q?.game?.canvas,r=c?.getBoundingClientRect();s?.publish();const target=document.elementFromPoint(x,y);return {canvas:r&&{x:r.x,y:r.y,width:r.width,height:r.height},target:target?.tagName,targetIsGameCanvas:target===c,dialogs:s?.snapshot.nodes.filter(n=>n.role==='dialog'&&!n.hidden&&!n.inert).length}},historyRect);
  stamp('native-journal-activation-failed',{historyRect,...diagnostic});await page.screenshot({path:join(out,'native-dialogue-journal-failed.png')});throw error;
 }
 await page.screenshot({path:join(out,'native-dialogue-journal.png')});await named('Back');await page.waitForTimeout(250);
 let current=await state();check(first.page===current.page,'closing the journal preserves the active dialogue page',{before:first.page,after:current.page});
 await named('Continue');
 if(Number(first.pages)>Number(first.page)){
  // A native paragraph becomes actionable only after its render receipt;
  // a fixed sleep would confuse asynchronous raster cost with input loss.
  await page.waitForFunction(expected=>{const d=document.querySelector('#game')?.dataset;return d?.opening==='talk'&&Number(d.talkPage)===expected},Number(first.page)+1,{timeout:15000});
  current=await state();check(Number(current.page)===Number(first.page)+1,'one actual Continue advances exactly one page',{before:first.page,after:current.page});
 }else await page.waitForTimeout(200);
 await page.screenshot({path:join(out,'native-dialogue-after-continue.png')});
 // Software-rendered 3D and real animation waits are intentionally not
 // accelerated. Bound the whole route, and retain observed transitions rather
 // than treating a slow animation or resource preparation as a completed run.
 let steps=1,lastTransition='',lastReport=0;const began=Date.now(),end=began+240000;
 while(Date.now()<end){current=await state();if(current.phase==='failed'||current.opening==='error')throw Error('Game failed while playing opening');
  const transition=JSON.stringify([current.opening,current.page,current.pages,current.animationFrames]);if(transition!==lastTransition||Date.now()-lastReport>=5000){lastTransition=transition;lastReport=Date.now();stamp('native-opening-transition',{...current,steps,elapsed:Date.now()-began});}
  if(current.opening==='complete')break;
  const b=current.opening==='talk'?await bounds('Continue').catch(()=>null):null;if(b){await named('Continue',{timeout:2000});steps++;await page.waitForTimeout(150);}
  else if(await activeModal()){const y=await bounds('Yes').catch(()=>null);if(y){await named('Yes');await page.waitForTimeout(150);}else await page.waitForTimeout(350);}
  else await page.waitForTimeout(250);
 }
 current=await state();if(current.opening!=='complete')await page.screenshot({path:join(out,'native-opening-timeout.png')});
 assert(current.opening==='complete','Opening did not complete: '+JSON.stringify(current));stamp('native-opening-complete',{steps,scene:current.scene,elapsed:Date.now()-began});
 if(runBattle){
  const {acceptNativeBattle}=await import('./native-battle-browser.mjs');
  return await acceptNativeBattle(page,{out,stamp,check,finish:battleFinish,manualOrder:battleOrder});
 }
 // The normal opening offers a short-lived exit guide. Use it before the
 // inventory/menu checks, and require actual world entry rather than silently
 // skipping the verification when the guide expires.
 await named('Go to exit');await page.waitForFunction(()=>document.querySelector('#game')?.dataset.mode==='world'&&document.querySelector('#game')?.dataset.phase==='ready',null,{timeout:90000});
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 await page.screenshot({path:join(out,'native-world-map.png')});const world=await state();stamp('native-world-entry',world);
 check(world.worldView==='3d','selected 3D world view actually loaded',world);
 await named('Bag');await page.waitForTimeout(300);await page.screenshot({path:join(out,'native-inventory.png')});await named('Back');await page.waitForTimeout(250);
 await named('Menu');await page.waitForTimeout(300);await page.screenshot({path:join(out,'native-travel-menu.png')});check(Boolean(await bounds('Party and skills')),'world menu offers party and skills');
 const save=await revealByScroll('Save progress');check(Boolean(save&&save.height>=43.5&&save.width>=43.5),'world menu offers save after actual scrolling',save);
 await page.screenshot({path:join(out,'native-travel-menu-save.png')});await named('Back');await page.waitForTimeout(250);
 return state();
}
