// Browser regression for the engine's native overlay scale, image admission, responsive root and attachment hooks.
// 实际 Chromium 触屏模拟、真实图片传输及游戏操作；不是手机真机性能数据。
import assert from 'node:assert/strict';
import { launch, openPage, serve, report } from '../../tools/lib/browser.mjs';
import { ready, press, focus, state, awaitMode, cursor, target } from './ui-actions.mjs';

const server=await serve(), browser=await launch(), checks=[];
const check=(ok,name)=>{checks.push([Boolean(ok),name]);assert.ok(ok,name);};
let page;
try {
  page=await openPage(browser,server.url+'StarBanner/?quality=low&lang=zh&seed=3&map=wheat',{
    width:873,height:325,touch:true,scale:2,reducedMotion:true
  });
  await ready(page,'button:遭遇战');
  const metric=await page.evaluate(()=>{const m=window.egretGame.ui.metrics();return {scale:m.scale,unit:m.unit,tap:m.tap};});
  check(Math.abs(metric.scale-44/48)<1e-5&&metric.unit===1&&metric.tap===48,'short widescreen uses the engine scale minimum and standard 48-unit targets');

  // Fetch eight distinct, existing game portraits through the native image queue, with a duplicate in the same batch.
  let active=0, peak=0, transports=0;
  await page.route(url=>url.searchParams.has('native-queue-test'),async route=>{
    ++active;++transports;peak=Math.max(active,peak);
    try { await new Promise(resolve=>setTimeout(resolve,120));await route.continue(); }
    finally { --active; }
  });
  const images=await page.evaluate(async ids=>{
    const game=window.egretGame.ui.game;
    const urls=ids.map(id=>new URL('assets/portraits/'+id+'.webp?native-queue-test=1',location.href).href);
    const leases=await Promise.all([...urls,urls[0]].map(url=>game.loadTexture(url)));
    try {return {count:leases.length,same:leases[0].value===leases.at(-1).value,
      sizes:leases.map(l=>[l.value.width,l.value.height])};}
    finally {leases.forEach(l=>l.release());}
  },['swordsman','pikeman','archer','knight','ballista','mage','vireta','garron']);
  check(images.count===9&&images.same&&images.sizes.every(([w,h])=>w>0&&h>0)&&transports===8&&peak===4,
    'eight valid portraits decode, duplicate shares a texture, native transport peak stays four');

  await focus(page,'button:设置');
  const identity=await page.evaluateHandle(()=>{const g=window.egretGame;return {overlay:g.ui.overlay,semantics:g.ui.semantics,
    scene:g.stage,focus:g.ui.keyboard.getSnapshot().focusedId};});
  const landscape=await target(page,'button:设置');
  await page.setViewportSize({width:393,height:852});
  await page.waitForFunction(()=>window.egretGame.ui.metrics().portrait);
  await ready(page,'button:设置');
  const portrait=await target(page,'button:设置');
  check(portrait.id===landscape.id&&Math.abs(portrait.y-landscape.y)>50,'native title controls retain their names and IDs while the title reflows');
  check(await page.evaluate(before=>{const g=window.egretGame;return g.ui.overlay===before.overlay&&g.ui.semantics===before.semantics&&
    g.stage===before.scene&&g.ui.keyboard.getSnapshot().focusedId===before.focus;},identity),'turning the title preserves overlay, semantics, scene and focus');
  await identity.dispose();
  await press(page,'button:设置','touch');await ready(page,'dialog:设置');await focus(page,'switch:音乐');
  const modal=await page.evaluateHandle(()=>{const g=window.egretGame;return {overlay:g.ui.overlay,
    focus:g.ui.keyboard.getSnapshot().focusedId,screen:g.app.screens.snapshot().stack.active};});
  const musicBefore=(await state(page,'switch:音乐')).checked;
  await page.setViewportSize({width:873,height:325});
  await page.waitForFunction(()=>!window.egretGame.ui.metrics().portrait);
  await ready(page,'dialog:设置');
  check(await page.evaluate(before=>{const g=window.egretGame;return g.ui.overlay===before.overlay&&
    g.ui.keyboard.getSnapshot().focusedId===before.focus&&g.app.screens.snapshot().stack.active===before.screen;},modal),
    'turning the settings modal preserves native stack, overlay and focused switch');
  await modal.dispose();
  await press(page,'switch:音乐','touch');
  check((await state(page,'switch:音乐')).checked!==musicBefore&&
    await page.evaluate(expected=>JSON.parse(localStorage.getItem('star-banner')).data.settings.music===expected,!musicBefore),
    'the post-attachment switch responds to touch and persists');
  await press(page,'button:好','touch');await ready(page,'button:遭遇战');
  await press(page,'button:遭遇战','touch');await ready(page,'radio:麦浪渡口');
  check((await state(page,'radio:麦浪渡口')).checked===true,'setup remains accessible after title and modal rotation');
  await press(page,'button:出阵','touch');await awaitMode(page,'idle');
  const unit=await page.evaluate(()=>window.egretGame.battle.game.units.find(u=>u.owner===0&&u.type==='swordsman'));
  await cursor(page,unit);await page.keyboard.press('Enter');await awaitMode(page,'move');
  await cursor(page,{x:unit.x,y:unit.y-2});await page.keyboard.press('Enter');await awaitMode(page,'act');
  await ready(page,'button:待命');await press(page,'button:待命','touch');await awaitMode(page,'idle');
  check(await page.evaluate(({id,y})=>{const u=window.egretGame.battle.game.units.find(u=>u.id===id);return u.done&&u.y===y-2;},
    {id:unit.id,y:unit.y}),'legal two-tile movement and Wait still follow native action controls');
  const barracks=await page.evaluate(()=>window.egretGame.battle.game.buildings.find(b=>b.owner===0&&b.kind==='barracks'));
  await cursor(page,barracks);await page.keyboard.press('Enter');await ready(page,'button:剑士');
  await press(page,'button:剑士','touch');await awaitMode(page,'recruit');
  const gold=await page.evaluate(()=>window.egretGame.battle.game.players[0].gold);
  await page.keyboard.press('Enter');await awaitMode(page,'idle');
  check(await page.evaluate(before=>window.egretGame.battle.game.players[0].gold===before-100,gold),'native recruit menu uses the existing swordsman cost and legal manual placement');
  const timing=await page.evaluate(()=>window.egretGame.ui.overlay.getStartupTiming());
  check(Number.isFinite(timing.readyMs)&&Number.isFinite(timing.game.firstSubmitMs)&&timing.game.webgl2?.pagedMs===0,
    'native startup reports overlay and first-submit timing; single-page mode skips paged preparation');
} catch(error){checks.push([false,'native UI route stopped: '+error.message.split('\n')[0]]);}
finally {
  const errors=page?.problems??[];await browser.close();await server.close();
  report('StarBanner native overlay acceptance (Chromium, simulated touch viewport)',checks,errors);
}
