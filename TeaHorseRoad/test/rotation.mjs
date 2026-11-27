// One software-browser page, real resize and pointer input; no engine or game-state substitutions.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { launch, openPage, serve } from '../../tools/lib/browser.mjs';
import { runJourney, checkpoint, waitFor } from './play.mjs';

const output=resolve(process.argv[2]??'qa-rotation');
await mkdir(output); // never overwrite evidence from an earlier scenario
const server=await serve(), browser=await launch();
const wide={width:852,height:393}, portrait={width:393,height:852};
const wideInsets={top:0,right:59,bottom:21,left:59}, portraitInsets={top:59,right:0,bottom:34,left:0};
const receipt={environment:'Headless Chromium / SwiftShader / simulated touch and safe-area insets',rotations:[],play:null,failures:[],browserDiagnostics:[]};
let page;
const write=()=>writeFile(join(output,'report.json'),JSON.stringify(receipt,null,2)+'\n');
try {
  page=await openPage(browser,server.url+'TeaHorseRoad/',{
    ...wide,touch:true,scale:1,before:async tab=>{
      // Chromium asks the static test server for its implicit browser-tab icon; it is not a game resource.
      // Only this exact implicit URL is a 204. Other 4xx/console errors remain failures.
      await tab.route(new URL('favicon.ico',server.url).href,route=>route.fulfill({status:204,body:''}));
      tab.on('console',message=>{
        if(message.type()==='error')receipt.browserDiagnostics.push({type:'console',text:message.text(),location:message.location()});
      });
      tab.on('response',response=>{
        if(response.status()>=400)receipt.browserDiagnostics.push({type:'http',status:response.status(),url:response.url()});
      });
      await tab.addInitScript(insets=>{window.__egretAgent={insets}},wideInsets);
    }
  });
  const player={
    page, read:(fn,arg)=>page.evaluate(fn,arg), wait:seconds=>page.waitForTimeout(seconds*1000),
    expect:(condition,description)=>assert.ok(condition,description),
    hold:key=>page.keyboard.down(key),letGo:key=>page.keyboard.up(key),
    picture:name=>page.screenshot({path:join(output,name+'.png')})
  };
  async function resize(viewport,insets) {
    const revision=await page.evaluate(()=>window.teaHorseRoad.ui.semantics.snapshot.revision);
    await page.evaluate(insets=>{window.__egretAgent.insets=insets},insets);
    await page.setViewportSize(viewport);
    await waitFor(player,({viewport,insets,revision})=>{
      const {ui}=window.teaHorseRoad, screen=ui.game.screen, rect=ui.overlay.canvas.getBoundingClientRect();
      const orientation=viewport.height>viewport.width?'portrait':'landscape';
      return ui.semantics.snapshot.revision>revision&&orientation===screen.orientation&&Math.abs(rect.width-viewport.width)<2&&Math.abs(rect.height-viewport.height)<2&&
        Math.abs(screen.safe.x*rect.width/screen.width-insets.left)<1.5&&
        Math.abs(screen.safe.y*rect.height/screen.height-insets.top)<1.5&&
        Math.abs((screen.width-screen.safe.x-screen.safe.width)*rect.width/screen.width-insets.right)<1.5&&
        Math.abs((screen.height-screen.safe.y-screen.safe.height)*rect.height/screen.height-insets.bottom)<1.5;
    },{viewport,insets,revision},'engine screen plan and rotated safe area');
    // The card geometry-only commit is asynchronous. Observe the game's own subsequent publication (do not call
    // publish or sync here, which would hide a missing production resize handler).
    await waitFor(player,()=>{
      const {ui}=window.teaHorseRoad,s=ui.game.screen,r=ui.overlay.canvas.getBoundingClientRect();
      const sx=r.width/s.width,sy=r.height/s.height;
      return ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&!n.disabled&&
        ['button','slider','switch','checkbox','radio','radiogroup','tab','option'].includes(n.role)).every(n=>{
        const b=n.bounds,p=ui.projection.elementOf(n.id)?.getBoundingClientRect();
        return p&&b.width*sx>=43.9&&b.height*sy>=43.9&&Math.abs(p.x-(r.x+b.x*sx))<1.25&&Math.abs(p.y-(r.y+b.y*sy))<1.25&&
          Math.abs(p.width-b.width*sx)<1.25&&Math.abs(p.height-b.height*sy)<1.25&&
          b.x>=s.safe.x-1/sx&&b.y>=s.safe.y-1/sy&&b.x+b.width<=s.safe.x+s.safe.width+1/sx&&b.y+b.height<=s.safe.y+s.safe.height+1/sy;
      });
    },undefined,'naturally republished layout and browser semantic projection',30000);
    await player.wait(.2);
  }
  async function preserve(label) {
    await page.evaluate(()=>{
      const g=window.teaHorseRoad, c=g.camps[1], k=g.ui.game.keyboard?.getSnapshot();
      const choices=()=>g.ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&['radio','radiogroup'].includes(n.role))
        .map(n=>[n.id,n.name,n.checked,n.selected]);
      window.__teaRotationTest={game:g.ui.game,overlay:g.ui.overlay,projection:g.ui.projection,hud:g.hud(),card:g.card,screen:g.screen,
        state:g.state,focus:k?.focusedId??null,choices:choices(),campSelected:c.selected,
        campMode:c.mode,parts:c.pieces.length,save:localStorage.getItem('tea-horse-road'),camp:JSON.stringify(c.serialize())};
    });
    const phases=[];
    for(const [name,viewport,insets] of [['portrait',portrait,portraitInsets],['landscape',wide,wideInsets]]) {
      await resize(viewport,insets);
      const result=await page.evaluate(()=>{
        const g=window.teaHorseRoad, ref=window.__teaRotationTest,c=g.camps[1];
        const choices=g.ui.semantics.snapshot.nodes.filter(n=>!n.hidden&&!n.inert&&['radio','radiogroup'].includes(n.role))
          .map(n=>[n.id,n.name,n.checked,n.selected]);
        return {orientation:g.ui.game.screen.orientation,screen:[g.ui.game.screen.width,g.ui.game.screen.height],
          sameGame:ref.game===g.ui.game,sameOverlay:ref.overlay===g.ui.overlay,sameProjection:ref.projection===g.ui.projection,
          projectionActive:g.ui.projection.state==='active',sameHud:ref.hud===g.hud(),sameCard:ref.card===g.card,sameScreen:ref.screen===g.screen,
          sameState:ref.state===g.state,sameFocus:ref.focus===(g.ui.game.keyboard?.getSnapshot().focusedId??null),
          sameChoices:JSON.stringify(ref.choices)===JSON.stringify(choices),
          campSelected:ref.campSelected===c.selected,campMode:ref.campMode===c.mode,campParts:ref.parts===c.pieces.length,
          campContent:ref.camp===JSON.stringify(c.serialize()),sameSave:ref.save===localStorage.getItem('tea-horse-road'),
          promptVisible:getComputedStyle(document.querySelector('#rotate')).display!=='none'};
      });
      for(const [key,value] of Object.entries(result)) {
        if(typeof value==='boolean'&&key!=='promptVisible') assert.equal(value,true,label+' '+name+' preserved '+key);
      }
      assert.equal(result.promptVisible,name==='portrait',label+' actual portrait phone prompt');
      if(result.promptVisible) {
        await player.picture(label+'-'+name+'-prompt');
        // Inspect the underlying screen too; production prompt itself remains unchanged.
        await player.read(()=>document.querySelector('#rotate').style.setProperty('display','none','important'));
      }
      let geometry;
      try {geometry=await checkpoint(player,label+'-'+name);}
      finally {if(result.promptVisible)await player.read(()=>document.querySelector('#rotate').style.removeProperty('display'));}
      phases.push({...result,geometry});
    }
    receipt.rotations.push({state:label,phases});
    await write();
  }
  async function campDrag() {
    // In landscape there is visible world beyond the camp card. The touch must travel through the engine overlay
    // into the scene and produce actual orbit camera movement, not merely a forwarded DOM pointer.
    const start=await page.evaluate(()=>{
      const g=window.teaHorseRoad,ui=g.ui,screen=ui.game.screen,r=ui.overlay.canvas.getBoundingClientRect();
      const dialog=ui.semantics.snapshot.nodes.find(n=>n.role==='dialog'&&!n.inert&&!n.hidden);
      const left=r.x+screen.safe.x*r.width/screen.width,right=left+screen.safe.width*r.width/screen.width;
      const top=r.y+screen.safe.y*r.height/screen.height,bottom=top+screen.safe.height*r.height/screen.height;
      const box={x:r.x+dialog.bounds.x*r.width/screen.width,y:r.y+dialog.bounds.y*r.height/screen.height,
        width:dialog.bounds.width*r.width/screen.width,height:dialog.bounds.height*r.height/screen.height};
      // The intended panel leaves world space on its right in landscape.
      const x=Math.max(box.x+box.width+22,(box.x+box.width+right)/2),y=(top+bottom)/2;
      if(x+30>right||x<left) throw Error('No empty world region beside the camp card');
      const world=document.querySelector('#world');
      window.__teaCampForwarded=0;
      world.addEventListener('pointerdown',()=>window.__teaCampForwarded++,{once:true});
      const camera=Array.from(g.camera.position);
      return {x,y,camera,worldBounds:[left,top,right,bottom],card:box};
    });
    const cdp=await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:0}]});
      for(let i=1;i<=6;i++){
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+i*5,y:start.y+i*2,id:0}]});
        await player.wait(.05);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    } finally {await cdp.detach();}
    await waitFor(player, before=>{
      const p=window.teaHorseRoad.camera.position;
      return window.__teaCampForwarded>0&&Math.hypot(...p.map((v,i)=>v-before[i]))>.05;
    },start.camera,'camp empty-area touch forwarded and camera orbited',30000);
    receipt.campDrag={start,forwarded:await page.evaluate(()=>window.__teaCampForwarded),after:await page.evaluate(()=>Array.from(window.teaHorseRoad.camera.position))};
    assert.equal(await page.evaluate(()=>window.teaHorseRoad.camps[1].pieces.length),1,'camp remains edited after empty drag');
  }
  receipt.play=await runJourney(player,{rotate:async label=>{
    if(label==='camp') await campDrag();
    await preserve(label);
  }});
  assert.equal(receipt.rotations.length,4);
  assert.deepEqual(page.problems,[],'no browser or HTTP errors');
  receipt.pass=true;
} catch(error) {
  receipt.pass=false;receipt.failures.push(String(error.stack??error));receipt.problems=page?.problems??[];
  console.error(error);
  process.exitCode=1;
} finally {
  await write();
  await browser.close();
  await server.close();
  console.log(JSON.stringify({pass:receipt.pass,rotations:receipt.rotations.map(r=>r.state),
    campDrag:receipt.campDrag?.forwarded??0,failures:receipt.failures,report:join(output,'report.json')},null,2));
}
