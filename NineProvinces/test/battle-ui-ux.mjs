// Native browser regression: play the seeded sandbox normally, then inspect
// its earned result, replay, exact time scrub, rematch, and route back to title.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve,launch,openPage,until} from '../../tools/lib/browser.mjs';
import {nativePart,nativeGeometry,waitFrames} from './native-battle-browser.mjs';
const server=await serve(),browser=await launch(),checks=[];
const out=resolve(process.env.NINE_UX_OUTPUT??resolve(tmpdir(),'nine-provinces-battle-ui-ux'));await mkdir(out,{recursive:true});
const check=(ok,label,detail)=>{checks.push({ok:!!ok,label,detail});assert(ok,label);};let page;
const snapshot=page=>page.evaluate(()=>window.egretGame.app.lab?.controller.inspect());
const inspect=async()=>snapshot(page);
const part=(id,opts)=>nativePart(page,id,opts);
const phase=expected=>page.waitForFunction(phase=>window.egretGame.app.lab?.controller.inspect().phase===phase,expected,{timeout:30000});
try{
 page=await openPage(browser,server.url+'NineProvinces/?lang=zh&quality=low',{width:1440,height:900});
 await until(page,()=>window.egretGame?.ready&&window.egretGame.screen==='title');
 const before=await page.evaluate(()=>JSON.stringify(window.egretGame.app.state));
 await part('title-sandbox');await page.waitForFunction(()=>window.egretGame.app.lab?.controller.nativeView);await part('sandbox-encounter-spears');await phase('deploy');
 check((await inspect()).config.encounter==='spears','normal named preset opens native deployment');
 const owner=await page.evaluate(()=>{window.__uxPlay=window.egretGame.app.game;return window.egretGame.app.lab.controller.inspect().battle.time});
 for(const [width,height]of[[1440,900],[1280,720],[873,325],[411,813]]){
   await page.setViewportSize({width,height});await waitFrames(page);await part('sandbox-board-overview');await waitFrames(page);
   const fit=await nativeGeometry(page,'sandbox-live-board');check(fit&&fit.visible.height>=95&&fit.visible.width>120&&fit.visible.height<=fit.canvas.height+2&&fit.visible.x>=fit.canvas.x-2&&fit.visible.y>=fit.canvas.y-2&&fit.visible.x+fit.visible.width<=fit.canvas.x+fit.canvas.width+2&&fit.visible.y+fit.visible.height<=fit.canvas.y+fit.canvas.height+2,`native overview fits ${width}×${height}`,fit);
   check(await page.evaluate(()=>window.egretGame.app.game===window.__uxPlay)&&((await inspect()).battle.time===owner),`same engine and deployment state ${width}×${height}`);await page.screenshot({path:resolve(out,`deploy-${width}.png`)});
 }
 await page.setViewportSize({width:1440,height:900});await waitFrames(page);await part('sandbox-step');await phase('fight');
 const stepped=await inspect();check(stepped.paused&&stepped.battle.time>=.99&&stepped.battle.time<=1.01,'normal one-second step retains paused state',stepped.battle.time);
 const tactic=await page.evaluate(()=>window.egretGame.app.lab.controller.nativePresentation.filter(row=>row.id.startsWith('tactic-')));check(tactic.length>0&&tactic.some(t=>t.disabled&&t.detail.includes('100'))&&tactic.some(t=>(t.detail??'').includes('防御')),'native tactic panels retain effect, target, cost and disabled requirement',tactic);await page.screenshot({path:resolve(out,'tactic-panel.png')});
 // This is the real game control, not a simulated result or modified HP.
 if((await inspect()).autoPause)await part('sandbox-tempo-pause');await part('sandbox-speed-4');await part('sandbox-battle-toggle');
 check(!(await inspect()).paused,'normal resume at four-times speed');
 await page.waitForFunction(()=>window.egretGame.app.lab?.controller.inspect().phase==='result',null,{timeout:240000});const done=await inspect();check(done.battle.over&&done.tape?.frames?.at(-1)?.phase==='result'&&done.tape.frames.length>2,'natural sandbox result and recorded tape', {winner:done.battle.over.winner,seconds:done.battle.time,frames:done.tape.frames.length});await page.screenshot({path:resolve(out,'result.png')});
 await part('sandbox-replay');await page.waitForFunction(()=>window.egretGame.app.lab?.controller.inspect().child?.tab==='report');
 check((await inspect()).child.frame.phase==='deploy','report opens with unchanged recorded tape');await page.screenshot({path:resolve(out,'report.png')});
 await part('replay-replay-tab');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child?.tab==='replay');
 const slider=await part('native-replay-time',{focus:true});check(slider.role==='slider','native semantic replay time slider');
 await page.keyboard.press('End');await page.waitForFunction(()=>{const c=window.egretGame.app.lab.controller.inspect().child;return c.cursor===c.total;});
 check((await inspect()).child.frame.phase==='result','native keyboard End seeks actual final frame');
 for(let i=0;i<12;i++)await page.keyboard.press('Tab');await waitFrames(page);check(await page.evaluate(()=>{const a=window.egretGame.app,v=a.lab.controller.nativeView;return Boolean(v.focused)&&a.uiHost.semantics.publish().nodes.some(n=>n.id.endsWith(':'+v.focused)&&!n.inert&&!n.hidden)}),'Tab stays inside the active native replay modal');
 const scrub=await part('native-replay-time',{focus:true});await page.mouse.move(scrub.x-scrub.width*.30,scrub.y);await page.mouse.down();await page.mouse.move(scrub.x+scrub.width*.12,scrub.y,{steps:5});await page.mouse.up();await waitFrames(page);const scrubbed=(await inspect()).child;
 check(scrubbed.cursor>0&&scrubbed.cursor<scrubbed.total&&!scrubbed.playing,'real pointer scrubbing reaches a recorded intermediate time',scrubbed.cursor);
 const frozen=(await inspect()).battle.time;await part('replay-play');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child.cursor>0);await page.waitForTimeout(350);await part('replay-play');check((await inspect()).battle.time===frozen,'replay advances without stepping the completed sandbox');
 for(const [width,height]of[[1440,900],[873,325],[411,813]]){
   await page.setViewportSize({width,height});await waitFrames(page);await part('replay-overview');await waitFrames(page);const fit=await nativeGeometry(page,'replay-board');check(fit&&fit.visible.height>=95&&fit.visible.x+fit.visible.width<=fit.canvas.x+fit.canvas.width+2&&fit.visible.y+fit.visible.height<=fit.canvas.y+fit.canvas.height+2,`native replay overview fits ${width}×${height}`,fit);await page.screenshot({path:resolve(out,`replay-${width}.png`)});
 }
 await page.setViewportSize({width:1440,height:900});await waitFrames(page);await part('replay-report-tab');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child.tab==='report');
 check(await page.evaluate(()=>Boolean(window.egretGame.app.lab.controller.nativeView.rect('replay-duration'))),'native report retains duration and chronology rows');
 await part('replay-exit');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child===null);check((await inspect()).phase==='result','closing replay restores original result');
 await part('sandbox-replay');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child);await page.keyboard.press('Escape');await page.waitForFunction(()=>window.egretGame.app.lab.controller.inspect().child===null);await page.waitForFunction(()=>window.egretGame.app.lab.controller.nativeView.focused==='sandbox-replay');check(true,'Escape restores native report opener focus');
 await part('sandbox-rematch');await phase('deploy');check((await inspect()).battle.time===0,'normal rematch resets battle clock');await part('sandbox-exit');await page.waitForFunction(()=>!window.egretGame.app.lab&&window.egretGame.app.screen==='title');
 check(await page.evaluate(before=>JSON.stringify(window.egretGame.app.state)===before,before),'sandbox and replay never write campaign state');
 check(!page.problems.length,'no browser errors',page.problems);
}catch(error){checks.push({ok:false,label:'route failure',detail:{error:String(error),problems:page?.problems??[]}});try{await page?.screenshot({path:resolve(out,'failure.png')})}catch{};throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(checks,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({passed:checks.length,checks:checks.map(c=>c.label),out},null,2));