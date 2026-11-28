import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, serve } from '../../tools/lib/browser.mjs';

const server=await serve(),browser=await launch();
try{
  const page=await browser.newPage({hasTouch:true,viewport:{width:873,height:325}}),cdp=await page.context().newCDPSession(page);
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),importMap=html.match(/<script type="importmap">[\s\S]*?<\/script>/)?.[0];
  const url=server.url+'FiveRegiments/touch-test.html';
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:`${importMap}
    <style>html,body,#frame{margin:0;width:100%;height:100%;overflow:hidden;touch-action:none} canvas{display:block;width:100%;height:100%}</style>
    <div id="frame"><canvas></canvas></div>
    <script type="module">
      import { play } from '@egret/engine/play';
      import { createInput } from './src/input.mjs';
      import { createTouchControls } from './src/hud.mjs';
      import { createFight, step, TICK } from './src/sim/fight.mjs';
      const game=await play({canvas:document.querySelector('canvas'),width:873,height:325,fit:'expand',audio:false,renderMode:'on-demand'});
      const input=createInput(game,{settings:{control:'directional'}});
      const touch=createTouchControls(game,input);touch.show(true);
      window.testTouch={game,input,touch,createFight,step,TICK,moves:[],moveSeq:0};
      window.addEventListener('pointermove',e=>{testTouch.moves.push({seq:++testTouch.moveSeq,x:e.clientX,y:e.clientY});if(testTouch.moves.length>30)testTouch.moves.shift();},true);
    </script>`}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  await page.waitForFunction(()=>window.testTouch);
  // CDP produces real browser pointer contacts, including native pointer capture. Synthetic
  // dispatchEvent does not have a native contact to capture, and tests a different failure path.
  const anchors=new Map(),points=new Map();
  const center=id=>page.evaluate(id=>{const {game,touch}=testTouch,n=touch.targets[id],b=n.hitArea,p=n.localToGlobal(b.width/2,b.height/2),r=game.canvas.getBoundingClientRect(),s=game.browser.screen.scale;return {x:r.left+p.x*s,y:r.top+p.y*s};},id);
  async function fire(button,type,id=1,x=60,y=80){
    if(type==='pointerdown'){
      const c=await center(button);anchors.set(id,[c.x-x,c.y-y]);
    }
    const a=anchors.get(id);if(!a)return;
    const point={id,x:x+a[0],y:y+a[1],radiusX:2,radiusY:2,force:1};
    if(type==='pointerdown'){points.set(id,point);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...points.values()]});}
    else if(type==='pointermove'){
      const before=await page.evaluate(()=>testTouch.moveSeq);points.set(id,point);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[...points.values()]});
      await page.waitForFunction(({before,x,y})=>testTouch.moves.some(m=>m.seq>before&&Math.abs(m.x-x)<1&&Math.abs(m.y-y)<1),{before,x:point.x,y:point.y},{timeout:3000});
    }
    else if(type==='pointercancel'){await cancelAll();}
    else if(type==='pointerup'){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});
      anchors.delete(id);points.delete(id);
    }
  }
  async function cancelAll(){if(points.size)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});points.clear();anchors.clear();}
  const sample=(threat='O')=>page.evaluate(threat=>testTouch.input.sample(1/60,{threat}),threat);
  const attack='attack',guard='guard',stick='stick',pause=ms=>page.waitForTimeout(ms);
  await fire(attack,'pointerdown');await fire(attack,'pointermove',1,96,80);await fire(attack,'pointercancel');
  const canceled=(await sample()).attack;await pause(70);await sample();
  await fire(attack,'pointerdown');await fire(attack,'pointermove',1,60,116);
  // A second real contact on the same control belongs to neither the first gesture nor its release.
  await fire(attack,'pointerdown',2);await fire(attack,'pointerup',2);
  const secondFinger=(await sample()).attack;await fire(attack,'pointerup');const swipe=await sample(),repeated=(await sample()).attack;
  await fire(guard,'pointerdown');await fire(guard,'pointerup');const tapGuard=await sample(),guardStuck=(await sample()).guard;
  async function overhead(){await fire(attack,'pointerdown');await fire(attack,'pointermove',1,60,41);await fire(attack,'pointerup',1,60,41);}
  await fire(guard,'pointerdown',2);await overhead();const overlap=await sample('R');await sample('R');
  await fire(guard,'pointerup',2);await overhead();const attackOnly=await sample('R');await sample('R');
  await fire(attack,'pointerdown');await fire(attack,'pointermove',1,60,116);await fire(attack,'pointerup',1,60,116);await sample();await sample();
  await fire(guard,'pointerdown',2);await fire(guard,'pointerup',2);await overhead();const fallback=await sample(null);
  await fire(attack,'pointerdown');await fire(guard,'pointerdown',2);await fire(stick,'pointerdown',3);await fire(stick,'pointermove',3,60,28);
  await page.evaluate(()=>{testTouch.touch.show(false);testTouch.input.clear();});await cancelAll();await pause(225);
  await page.evaluate(()=>testTouch.touch.show(true));const resumed=await sample();
  const yawBefore=await page.evaluate(()=>testTouch.input.state.yaw);
  await fire(stick,'pointerdown',3);await fire(stick,'pointermove',3,60,35);await fire('look','pointerdown',4);await fire('look','pointermove',4,105,90);await fire(guard,'pointerdown',5);
  const simultaneous=await sample('R'),yawAfter=await page.evaluate(()=>testTouch.input.state.yaw);
  const threeFinger=[Math.hypot(...simultaneous.move)>.8,yawAfter!==yawBefore,simultaneous.guard];await cancelAll();await sample();
  const reins=()=>page.evaluate(()=>{const x=testTouch.input.sample(1/60,{mounted:true});return [Number(x.reins?.throttle.toFixed(5)),Number(x.reins?.turn.toFixed(5)),x.sprint];});
  await page.evaluate(()=>testTouch.input.setYaw(Math.PI));
  await fire(stick,'pointerdown',3);await fire(stick,'pointermove',3,60,52);const canter=await reins();
  await fire(stick,'pointermove',3,60,25);const gallop=await reins(),onFoot=(await sample()).sprint;
  await fire(stick,'pointermove',3,60,135);const back=await reins();await fire(stick,'pointermove',3,115,80);const turn=await reins();
  await fire(stick,'pointercancel',3);const neutral=await reins();
  await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keydown',{code:'KeyS',bubbles:true})));const keyBack=await reins();await page.evaluate(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyS',bubbles:true})));

  const makeBattle=mounted=>page.evaluate(mounted=>{const {createFight}=testTouch;testTouch.battle=createFight({hero:{regiment:mounted?'plume':'tiger'},foes:[{regiment:mounted?'tiger':'yulin'}]});},mounted);
  const frameMany=(mounted,n)=>page.evaluate(({mounted,n})=>{const {step,input,battle,TICK}=testTouch;return Array.from({length:n},()=>step(battle,{hero:input.sample(TICK,{mounted})})).flat();},{mounted,n});
  const act=()=>page.evaluate(()=>testTouch.battle.hero.act);
  await makeBattle(false);await frameMany(false,1);await fire(attack,'pointerdown');await pause(230);await frameMany(false,1);
  const initial=(await act())?.line,aimLine=initial==='T'?'O':'T',aimY=aimLine==='T'?119:41;
  await fire(attack,'pointermove',1,60,aimY);const footHeld=await frameMany(false,135),load=await act();
  const lateHold=[!!initial,load?.line===aimLine,!!load?.awaitingRelease&&load.held>=.84];
  await fire(attack,'pointerup',1,60,aimY);const footLift=await frameMany(false,55);
  await makeBattle(true);await frameMany(true,1);await fire(attack,'pointerdown');await fire(attack,'pointermove',1,96,80);await pause(230);
  const held=await frameMany(true,135),mount=await act(),mountLoad=[mount?.line,mount?.awaitingRelease,mount?.held];
  await fire(attack,'pointerup',1,96,80);const lifted=await frameMany(true,45);
  await makeBattle(true);await fire(attack,'pointerdown');await pause(230);await frameMany(true,1);await fire(attack,'pointercancel');
  const aborted=await frameMany(true,45),mountedCanceled=!(await act())&&!aborted.some(e=>e.type==='swingRelease');
  await makeBattle(true);await fire(attack,'pointerdown');await pause(230);await frameMany(true,1);
  await page.evaluate(()=>dispatchEvent(new Event('blur')));const afterBlur=await frameMany(true,45);await fire(attack,'pointerup');afterBlur.push(...await frameMany(true,45));
  const visibleButtons=await page.evaluate(()=>{const {game,touch}=testTouch;return Object.entries(touch.targets).filter(([id,n])=>id!=='look'&&id!=='stick'&&n.visible).every(([,n])=>{
    const b=n.hitArea,p=n.localToGlobal(0,0),q=n.localToGlobal(b.width,b.height),r=game.browser.screen,s=r.scale;
    return (q.x-p.x)*s>=44&&(q.y-p.y)*s>=44&&p.x>=r.safe.x&&p.y>=r.safe.y&&q.x<=r.safe.x+r.safe.width+.01&&q.y<=r.safe.y+r.safe.height+.01;});});
  const actual={threeFinger,canceled,secondFinger,swipe:[swipe.attack,swipe.line],repeated,visibleButtons,
    lateFootAim:[...lateHold,footHeld.filter(e=>e.type==='swingRelease').length,footLift.filter(e=>e.type==='swingRelease'&&e.line===aimLine).length],
    guard:[tapGuard.guard,tapGuard.line],guardStuck,overlap:[overlap.attack,overlap.guard,overlap.line,overlap.guardLine],
    attackOnly:[attackOnly.attack,attackOnly.guard,attackOnly.line,attackOnly.guardLine],fallback:[fallback.attack,fallback.guard,fallback.line,fallback.guardLine],
    mounted:{canter,gallop,onFoot,back,turn,neutral,keyBack},mountedAttack:{line:mountLoad[0],waitingForRelease:mountLoad[1],fullyCharged:mountLoad[2]>=.84,
      releasesWhileHeld:held.filter(e=>e.type==='swingRelease').length,releasesAfterLift:lifted.filter(e=>e.type==='swingRelease'&&e.line==='R').length,
      canceled:mountedCanceled,blurred:!(await act())&&!afterBlur.some(e=>e.type==='swingRelease')},resumed:[resumed.attack,resumed.guard,Math.hypot(...resumed.move)]};
  assert.deepEqual(errors,[]);
  assert.deepEqual(actual,{
    threeFinger:[true,true,true],canceled:false,secondFinger:false,swipe:[true,'T'],repeated:false,visibleButtons:true,
    lateFootAim:[true,true,true,0,1],guard:[true,'O'],guardStuck:false,overlap:[true,true,'O','R'],
    attackOnly:[true,false,'O',undefined],fallback:[true,true,'O','T'],
    mounted:{canter:[.56,0,false],gallop:[1,0,true],onFoot:false,back:[-1,0,false],turn:[0,-1,false],neutral:[0,0,false],keyBack:[-1,0,false]},
    mountedAttack:{line:'R',waitingForRelease:true,fullyCharged:true,releasesWhileHeld:0,releasesAfterLift:1,canceled:true,blurred:true},
    resumed:[false,false,0]
  });
  console.log('Native routed touch: cancellation, 3 contacts, quick guard, pause/resume, mounted reins and charged release verified.');
}finally{await browser.close();await server.close();}

