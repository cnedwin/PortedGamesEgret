// Actual browser keyboard workflow. The controller is a simulated standard
// browser gamepad, not a physical device. No ui.press/state mutations.
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,launch,openPage,report,serve} from '../../tools/lib/browser.mjs';
const game=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const path=relative(ROOT,game).split('\\').join('/');
const server=await serve(),browser=await launch(),checks=[];let page;
function check(ok,name){checks.push([Boolean(ok),name]);if(!ok)throw Error(name);}
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:30000});
async function tabTo(part,byLabel=false){
 for(let i=0;i<180;i++){
  const focused=await page.evaluate(({part,byLabel})=>{const {app}=egretGame;return document.activeElement===app.game.canvas&&app.uiHost.semantics.publish().nodes.some(n=>n.focused&&!n.disabled&&!n.hidden&&!n.inert&&(byLabel?n.name===part||n.label===part:n.id.endsWith(':'+part)));},{part,byLabel});
  if(focused)return i;
  await page.keyboard.press('Tab');await page.waitForTimeout(40);
 }
 throw Error('Could not reach native focus using Tab: '+part);
}
async function keyPart(part,byLabel=false){await tabTo(part,byLabel);await page.keyboard.press('Enter');await page.waitForTimeout(250);}
const pad=async index=>{await page.evaluate(i=>window.nineTestPadButtons[i]=true,index);await page.waitForTimeout(200);await page.evaluate(i=>window.nineTestPadButtons[i]=false,index);await page.waitForTimeout(220);};
const snapshot=async army=>page.evaluate(id=>({day:egretGame.state.day,mode:egretGame.app.mode,selected:egretGame.app.sel?.army,army:egretGame.state.armies[id]}),army);
try{
 page=await openPage(browser,`${server.url}${path}/?seed=1&lang=zh&quality=medium`,{width:1280,height:720,before:page=>page.addInitScript(()=>{
   window.nineTestPadButtons=Array(17).fill(false);const controller={id:'Standard test controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],timestamp:0};Object.defineProperty(controller,'buttons',{get:()=>window.nineTestPadButtons.map(x=>({pressed:x,touched:x,value:Number(x)}))});Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[controller,null,null,null]});
 })});
 await wait(()=>window.egretGame?.ready&&egretGame.screen==='title');
 await keyPart('title-new');await wait(()=>egretGame.screen==='setup');check(true,'keyboard Enter opens native campaign');
 await keyPart('branch-liubei');await wait(()=>egretGame.app.nativeTitle.snapshot().setup.pick.faction==='liubei');check(true,'keyboard Tab chooses the native campaign branch');
 await keyPart('setup-start');await wait(()=>egretGame.app.dialogs.name==='story');check(await page.evaluate(()=>egretGame.state.player==='liubei'),'keyboard starts the intended original campaign');
 await keyPart('story-next');await wait(()=>!egretGame.app.dialogOpen);check(true,'keyboard closes the event with its normal action');
 await keyPart('coach-dismiss');check(await page.evaluate(()=>egretGame.app.firstMonth.dismissed),'keyboard dismisses native first-month coach');
 await keyPart('realm-tab-orders');check(await page.evaluate(()=>egretGame.ui.state('tab:政令').selected),'keyboard reaches city orders');
 await keyPart('muster');await wait(()=>egretGame.app.dialogs.name==='muster');await keyPart('muster-confirm');await wait(()=>!egretGame.app.dialogOpen&&egretGame.app.sel?.army);const army=await page.evaluate(()=>egretGame.app.sel.army);check(Boolean(army),'keyboard confirms existing campaign modal');
 // Cancel is tested before dispatching the same normal destination by keyboard.
 const before=await snapshot(army);await keyPart('army-destination-list');await wait(()=>egretGame.app.game.asking);await page.keyboard.press('Escape');await wait(()=>!egretGame.app.game.asking);check(JSON.stringify(await snapshot(army))===JSON.stringify(before),'Escape cancels native destination list without changing selected army/mode/day');
 await keyPart('army-destination-list');await wait(()=>egretGame.app.game.asking);await keyPart('冀州',true);await wait(()=>egretGame.app.game.asking);await keyPart('南皮',true);await wait(()=>!egretGame.app.game.asking);await wait(id=>egretGame.state.armies[id]?.target==='nanpi',army);check(await page.evaluate(id=>egretGame.app.mode===null&&egretGame.app.sel?.army===id,army),'native list dispatches the existing exact game destination, preserving selection');
 // A simulated standard controller enters the actual engine gamepad polling;
 // this only establishes browser input mapping, not a physical controller.
 await keyPart('army-destination-list');await wait(()=>egretGame.app.game.asking);const issued=await snapshot(army);await pad(13);check(await page.evaluate(()=>egretGame.app.game.device==='gamepad'),'simulated standard controller reaches actual Play polling');await pad(1);await wait(()=>!egretGame.app.game.asking);check(JSON.stringify(await snapshot(army))===JSON.stringify(issued),'simulated controller B cancels native destination with no command');
 check(page.problems.length===0,'zero browser errors');
}catch(error){checks.push([false,`native input route stopped: ${error.message.split('\n')[0]}`]);}
finally{const problems=page?.problems??[];await browser.close();await server.close();report('NineProvinces native input acceptance (headless Chromium, software; controller simulated)',checks,problems);}