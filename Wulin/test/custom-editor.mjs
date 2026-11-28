import assert from 'node:assert/strict';
import {serve,launch,openPage} from '../../tools/lib/browser.mjs';
import {activate,press,wait} from './screen-route.mjs';
const server=await serve(),browser=await launch();let page;const checks=[];
try{
 page=await openPage(browser,server.url+'Wulin/?seed=7&quality=low',{width:1280,height:800});
 await wait(page,()=>window.egretGame?.ready&&!window.egretGame.failed,undefined,'title');await page.evaluate(()=>__wulin.native.game.canvas.focus());
 await activate(page,'page',{page:'prologue'});await activate(page,'skip-prologue');await activate(page,'choose-founding',{own:'true'});
 async function editField(id,value,match={}){
   await activate(page,'@field',{id,...match});
   await page.waitForFunction(()=>document.activeElement?.matches('input,textarea'));
   await page.keyboard.press('Control+a');await page.keyboard.insertText(value);await page.keyboard.press('Enter');await page.waitForTimeout(300);
   await page.evaluate(()=>__wulin.native.game.canvas.focus());
 }
 await editField('own-name','照影门');await editField('own-leader','顾照影');
 let seen=await page.evaluate(()=>[__wulin.ui.ownName,__wulin.ui.ownLeader]);assert.deepEqual(seen,['照影门','顾照影']);checks.push('custom sect engine-managed field committed through browser text insertion');
 await activate(page,'sect-next');await activate(page,'new');await press(page,'button:确认');await wait(page,()=>__wulin.world&&__wulin.ui.sheet?.kind==='guide',undefined,'custom world');
 await activate(page,'close');assert.equal(await page.evaluate(()=>__wulin.world.options.custom?.name),'照影门');
 await page.keyboard.press('F8');await page.waitForTimeout(100);await page.keyboard.press('F8');await wait(page,()=>__wulin.ui.sheet?.kind==='editor',undefined,'F8 editor');checks.push('native F8 double press');
 const silver=await page.evaluate(()=>__wulin.world.sects[__wulin.world.playerSect].silver);
 await editField('ed-silver','9999');
 assert.equal(await page.evaluate(()=>__wulin.world.sects[__wulin.world.playerSect].silver),9999);
 await activate(page,'ed-revert');await press(page,'button:确认');assert.equal(await page.evaluate(()=>__wulin.world.sects[__wulin.world.playerSect].silver),silver);checks.push('editor native field and confirmed revert');
 await activate(page,'close');await activate(page,'page',{page:'saves'});await activate(page,'save',{slot:'1'});
 const raw=await page.evaluate(()=>localStorage.getItem('wulin-slot-1'));assert.equal(JSON.parse(raw).magic,'wulin-save');checks.push('original-format custom world persisted');
 await page.evaluate(()=>localStorage.setItem('wulin-slot-2','broken-wulin-test'));
 await activate(page,'page',{page:'seat'});await activate(page,'page',{page:'saves'});
 await activate(page,'load',{slot:'2'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('wulin-slot-2.unread')),'broken-wulin-test');
 assert.equal(await page.evaluate(()=>__wulin.world.options.custom.name),'照影门');
 checks.push('corrupt slot preserved and current world retained');
 assert.deepEqual(page.problems,[]);console.log(JSON.stringify({checks,pass:true}));
}catch(error){console.error(error,JSON.stringify({checks,problems:page?.problems}));process.exitCode=1;}finally{await browser.close();await server.close();}
