// Real Chromium CDP touch events on a mobile-emulated viewport; not a physical handset test.
import assert from 'node:assert/strict';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, openPage, serve, report } from '../../tools/lib/browser.mjs';
import { ready, press, focus, boardTap, awaitMode, state, nodes } from './ui-actions.mjs';
const GAME=resolve(dirname(fileURLToPath(import.meta.url)),'..'),path=relative(ROOT,GAME).split('\\').join('/');
const server=await serve(),browser=await launch(),checks=[];
const check=(ok,word)=>{checks.push([Boolean(ok),word]);assert.ok(ok,word)};
let page;
try{
  page=await openPage(browser,`${server.url}${path}/?seed=3&lang=zh&quality=low&map=wheat`,{width:411,height:813,touch:true,scale:2.625});
  await ready(page,'button:遭遇战');await press(page,'button:遭遇战','touch');await ready(page,'radio:麦浪渡口');
  check((await state(page,'radio:麦浪渡口')).checked===true,'portrait touch reaches the actual map selection');
  await press(page,'button:出阵','touch');await awaitMode(page,'idle',240);
  const sw=await page.evaluate(()=>window.egretGame.battle.game.units.find(u=>u.owner===0&&u.type==='swordsman'));
  await boardTap(page,sw,'touch');await awaitMode(page,'move');
  check(true,'one actual touchscreen tap selects the projected 3D unit');
  const to={x:sw.x,y:sw.y-2};
  await boardTap(page,to,'touch');await page.waitForTimeout(400);
  check(await page.evaluate(()=>window.egretGame.battle.mode==='move'),'first destination touch previews the legal path rather than committing');
  await boardTap(page,to,'touch');await awaitMode(page,'act');await ready(page,'button:待命');
  await press(page,'button:待命','touch');await awaitMode(page,'idle');
  check(await page.evaluate(({id,y})=>{const u=window.egretGame.battle.game.units.find(u=>u.id===id);return u.done&&u.y===y-2},{id:sw.id,y:sw.y}),
    'second destination tap and native Wait complete the move');

  const cdp=await page.context().newCDPSession(page),camera=()=>page.evaluate(()=>({...window.egretGame.stage.rig.view}));
  const centre=await page.evaluate(()=>{
    const host=window.egretGame.ui, r=host.overlay.canvas.getBoundingClientRect(),f=host.game.frame;
    // The middle of the board is intentionally free of native controls. Search real hit-test geometry, not UI CSS.
    for(const [u,v] of [[.5,.46],[.45,.43],[.55,.5],[.4,.48]]){
      const x=f.width*u,y=f.height*v;
      if(host.game.stage.hitTest(x,y)===undefined)return{x:r.x+r.width*u,y:r.y+r.height*v};
    }
    return null;
  });
  check(Boolean(centre),'there is a real pass-through board area for touch gestures');
  const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:3,radiusY:3,force:.7}))});
  const before=await camera();
  await send('touchStart',[{id:1,x:centre.x,y:centre.y}]);
  await send('touchMove',[{id:1,x:centre.x+30,y:centre.y+18}]);
  await send('touchMove',[{id:1,x:centre.x+58,y:centre.y+35}]);
  await send('touchEnd',[]);await page.waitForTimeout(450);
  const pan=await camera();
  check(Math.abs(pan.tx-before.tx)+Math.abs(pan.tz-before.tz)>.1,'one-finger CDP drag pans the real World3D camera');
  await send('touchStart',[{id:1,x:centre.x-20,y:centre.y},{id:2,x:centre.x+20,y:centre.y}]);
  await send('touchMove',[{id:1,x:centre.x-38,y:centre.y},{id:2,x:centre.x+38,y:centre.y}]);
  await send('touchEnd',[]);await page.waitForTimeout(450);
  const pinch=await camera();
  check(pinch.td<pan.td,'two actual CDP touch contacts pinch-zoom through the native overlay');
  await send('touchStart',[{id:3,x:centre.x,y:centre.y}]);await send('touchCancel',[]);
  check(await page.evaluate(()=>window.egretGame.battle.mode==='idle'),'drag, pinch and touch cancellation did not introduce a latent tile selection');

  // Orientation changes keep the loaded World3D game, engine overlay, semantic tree and open dialog.
  await press(page,'button:菜单','touch');await ready(page,'button:设置');await press(page,'button:设置','touch');await ready(page,'dialog:设置');
  await focus(page,'switch:音乐');
  await page.evaluate(()=>{const g=window.egretGame;window.__beforeRotate={battle:g.battle,host:g.ui,overlay:g.ui.overlay.game,semantics:g.ui.semantics,focused:g.ui.keyboard?.getSnapshot().focusedId};});
  await page.setViewportSize({width:813,height:411});await page.waitForTimeout(450);await ready(page,'dialog:设置');
  const rotation=await page.evaluate(()=>{const g=window.egretGame,b=window.__beforeRotate;return{
    battle:g.battle===b.battle,host:g.ui===b.host,overlay:g.ui.overlay.game===b.overlay,semantics:g.ui.semantics===b.semantics,
    focused:b.focused===g.ui.keyboard?.getSnapshot().focusedId
  }});
  check(rotation.battle&&rotation.host&&rotation.overlay&&rotation.semantics,'live rotation preserves battle, host, overlay and semantic tree objects');
  check(rotation.focused,'the settings focus survives rotation');
  await press(page,'switch:音乐','touch');
  check((await page.evaluate(()=>JSON.parse(localStorage.getItem('star-banner')).data.settings.music))===false,
    'the rotated settings toggle still responds to touch and persists');
  await press(page,'button:好','touch');await awaitMode(page,'idle');
  check((await nodes(page)).some(n=>n.name==='结束回合'&&!n.disabled),'return to battle keeps actionable native controls');
}catch(error){checks.push([false,'touch route stopped: '+error.message.split('\n')[0]]);}
finally{const p=page?.problems??[];await browser.close();await server.close();report('StarBanner Chromium touchscreen acceptance (simulated viewport)',checks,p);}
