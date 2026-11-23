// Focused UI regression. Real sandbox controls; the replay fixture is earned by the unchanged battle simulation.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve,launch,openPage,until} from '../../tools/lib/browser.mjs';
const server=await serve(),browser=await launch(),checks=[];
const out=resolve(process.env.NINE_UX_OUTPUT??resolve(tmpdir(),'nine-provinces-battle-ui-ux'));await mkdir(out,{recursive:true});
const check=(ok,label,detail)=>checks.push({ok:!!ok,label,detail});
let page;
try{
 page=await openPage(browser,server.url+'NineProvinces/?lang=zh&quality=low',{width:1440,height:900});
 await until(page,()=>window.egretGame?.ready&&window.egretGame.screen==='title');
 await page.getByRole('button',{name:'演武沙盘',exact:true}).click();
 await page.getByRole('button',{name:'开始鹤翼拒骑',exact:true}).click();
 for(const [width,height]of[[1440,900],[1280,720],[873,325],[411,813]]){
  await page.setViewportSize({width,height});await page.getByRole('button',{name:'全景',exact:true}).click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const fit=await page.locator('.labBoard').evaluate(board=>{const b=board.getBoundingClientRect(),vp=board.parentElement.getBoundingClientRect(),body=board.closest('.labBody').getBoundingClientRect();return {board:b.toJSON(),viewport:vp.toJSON(),body:body.toJSON(),fits:b.height<=vp.height+2&&b.width<=vp.width+2&&b.bottom<=body.bottom+2};});
  check(fit.fits,`overview fits ${width}×${height}`,fit);await page.screenshot({path:resolve(out,`deploy-${width}.png`)});
 }
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'步进 1 秒',exact:true}).click();
 const tactics=await page.locator('.labTactics').innerText();
 check(tactics.includes('防御')&&tactics.includes('100')&&tactics.includes('清空'),'tactic panel explains real effects and rage requirement before casting',tactics);
 await page.screenshot({path:resolve(out,'tactic-panel.png')});
 // A deterministic normal simulation fixture exercises all report/replay states without changing a campaign.
 await page.evaluate(async()=>{const {recordedAutoBattle}=await import('./src/sim/battle-history.mjs'),{createSandboxSetup}=await import('./src/sim/battle-sandbox.mjs'),{openBattleReplay}=await import('./src/ui/battle-lab.mjs');window.__uxTape=recordedAutoBattle(createSandboxSetup({seed:43,armies:[[{unit:'spear',troops:1000}],[{unit:'lightcav',troops:15000}]]})).tape;window.__uxReplay=openBattleReplay(window.egretGame.app,window.__uxTape,{tab:'replay'});});
 await page.getByRole('dialog',{name:'战斗详报与回放',exact:true}).waitFor();
 const replay=page.getByRole('dialog',{name:'战斗详报与回放',exact:true});
 await replay.getByRole('slider',{name:'回放时间',exact:true}).press('End');
 for(let i=0;i<12;i++)await page.keyboard.press('Tab');
 check(await page.evaluate(()=>document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label')==='战斗详报与回放'),'Tab stays inside the top replay modal');
 const fitReplay=await replay.locator('.labBoard').evaluate(board=>{const b=board.getBoundingClientRect(),body=board.closest('.labBody').getBoundingClientRect();return {fits:b.bottom<=body.bottom+2,board:b.toJSON(),body:body.toJSON()};});
 check(fitReplay.fits,'replay overview and controls fit the desktop window',fitReplay);await page.screenshot({path:resolve(out,'replay-desktop.png')});
 for(const [width,height]of[[873,325],[411,813]]){
  await page.setViewportSize({width,height});await replay.getByRole('button',{name:'全景',exact:true}).click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const fit=await replay.locator('.labBoard').evaluate(board=>{const b=board.getBoundingClientRect(),v=board.parentElement.getBoundingClientRect();return {fits:b.height<=v.height+2&&b.width<=v.width+2,height:b.height,viewport:v.toJSON()};});
  check(fit.fits&&fit.height>=95,`replay field stays visible ${width}×${height}`,fit);await page.screenshot({path:resolve(out,`replay-${width}.png`)});
 }
 await page.setViewportSize({width:1440,height:900});
 await replay.getByRole('button',{name:'战斗详报',exact:true}).click();
 const report=await replay.locator('.labReportIntro').innerText();check(!report.includes('敌军溃散')&&report.includes('蓝军'),'report names the losing side without enemy-perspective ambiguity',report);
 await replay.getByRole('button',{name:'返回',exact:true}).click();
 check(await page.evaluate(()=>document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label')==='演武沙盘'),'closing replay restores focus to the sandbox');
 await page.locator('[data-lab="replay"]').click();await page.getByRole('dialog',{name:'战斗详报与回放',exact:true}).waitFor();
 await page.keyboard.press('Escape');
 check(await page.evaluate(()=>document.activeElement?.dataset?.lab==='replay'),'actual nested replay restores its rebuilt report opener after Escape');
 check(page.problems.length===0,'no browser errors',page.problems);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify(checks,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(checks.map(c=>({ok:c.ok,label:c.label})),null,2));
assert(checks.every(c=>c.ok),'battle UI regression; see '+resolve(out,'report.json'));
