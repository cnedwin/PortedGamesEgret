// Browser exercise of rally art from a legal replay-generated save. It does not fabricate HP, money or meter.
import assert from 'node:assert/strict';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, openPage, serve, report } from '../../tools/lib/browser.mjs';
import { makeArtReplay } from './art-replay.mjs';
import { ready, press, chooseMove, awaitMode } from './ui-actions.mjs';
const GAME=resolve(dirname(fileURLToPath(import.meta.url)),'..'), path=relative(ROOT,GAME).split('\\').join('/');
const server=await serve(),browser=await launch(),checks=[],replay=makeArtReplay();
const check=(v,s)=>{checks.push([Boolean(v),s]);assert.ok(v,s)};
let page;
try{
  page=await openPage(browser,`${server.url}${path}/?lang=zh&quality=low&map=wheat`,{
    width:1024,height:600,before:page=>page.addInitScript(save=>localStorage.setItem('star-banner',save),replay.save)
  });
  await ready(page,'button:继续上一局');await press(page,'button:继续上一局','mouse');await awaitMode(page,'idle',240);
  const start=await page.evaluate(()=>({turn:window.egretGame.battle.game.turn,meter:window.egretGame.battle.game.players[0].meter}));
  check(start.turn===replay.game.turn&&start.meter===replay.game.players[0].meter,
    `resume legal replay of ${replay.orders.length} orders, turn ${start.turn}, rally ${start.meter}`);
  await chooseMove(page,replay.commander,replay.commander);
  await ready(page,'button:战意技');await press(page,'button:战意技','mouse');await awaitMode(page,'idle',180);
  const after=await page.evaluate(id=>{
    const g=window.egretGame.battle.game;return {meter:g.players[0].meter,done:g.units.find(u=>u.id===id)?.done}
  },replay.commander.id);
  check(after.meter===0&&after.done,'native rally command consumes charged meter and finishes the commander action');
}catch(error){checks.push([false,'rally route stopped: '+error.message.split('\n')[0]]);}
finally{const problems=page?.problems??[];await browser.close();await server.close();report('StarBanner rally-art browser acceptance (legal replay save, not a human grind)',checks,problems);}
