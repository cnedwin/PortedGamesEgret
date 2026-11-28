// A failed first entry after a healthy title must show native retry instead of
// leaving the player in loading. The deliberate HTTP 503 is not a game error
// assertion; uncaught promise rejections are.
import assert from 'node:assert/strict';
import { launch,openPage,serve } from '../../tools/lib/browser.mjs';
const server=await serve(),browser=await launch(),url=server.url+'FiveRegiments/?lang=en&quality=high&seed=3';
let page;
try {
 page=await openPage(browser,url,{width:1024,height:600});
 const exceptions=[];page.on('pageerror',e=>exceptions.push(String(e)));
 const screen=kind=>page.waitForFunction(k=>window.egretGame?.screens?.current===k,kind,{timeout:180000});
 const press=async name=>{await page.waitForFunction(n=>egretGame?.tester?.exists(n),name,{timeout:30000});await page.evaluate(n=>egretGame.tester.press(n),name);};
 await screen('title');
 const match=/\/assets\/characters\/[^/]+-high\.glb(?:\?.*)?$/;
 let refused=0;await page.route(match,r=>{refused++;return r.fulfill({status:503,body:'test unavailable'});});
 await press('The road');await screen('choose');await press('Next');await screen('loadout');
 await press('To the field');await screen('card');await press('Fight');
 await screen('error');assert(refused>0);
 assert.equal(await page.evaluate(()=>egretGame.mode),'error');
 assert.equal(exceptions.length,0,'no unhandled callback rejection');
 await page.unroute(match);
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),press('Retry')]);
 await screen('title');assert(await page.evaluate(()=>egretGame.status.error===null));
 console.log('PASS native error, no unhandled rejection, retry returns to healthy title');
 await press('Settings');await screen('settings');await press('tab:Picture · Low');await press('Done');await screen('title');
 assert.equal(await page.evaluate(()=>egretGame.quality),'low');
 await press('Settings');await screen('settings');await press('tab:Picture · High');await press('Done');await screen('title');
 assert.equal(await page.evaluate(()=>egretGame.quality),'high');
 console.log('PASS live picture tier changes low and back to high');
}finally{await browser.close();await server.close();}
