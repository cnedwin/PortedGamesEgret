// Native choice and browser file exchange using trusted keyboard activation.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {serve,launch,openPage} from '../../tools/lib/browser.mjs';
import {activate,press,wait} from './screen-route.mjs';
const server=await serve(), browser=await launch();let page;const checks=[];
try{
  page=await openPage(browser,server.url+'Wulin/?seed=7&quality=low',{width:1280,height:800});
  await wait(page,()=>window.egretGame?.ready&&!window.egretGame.failed,undefined,'title');
  await page.evaluate(()=>__wulin.native.game.canvas.focus());
  await activate(page,'page',{page:'prologue'});await activate(page,'skip-prologue');await activate(page,'sect-next');
  await wait(page,()=>__wulin.ui.page==='legacy',undefined,'legacy options');
  const focus=()=>page.evaluate(()=>{const s=__wulin.native.semantics.snapshot;return s.nodes.find(n=>n.id===s.focused)?.name;});
  const chooseDifficulty=async direction=>{
    const previous=await page.evaluate(()=>__wulin.ui.difficulty);
    await activate(page,'@choice',{change:'difficulty'});await wait(page,()=>__wulin.native.game.asking,undefined,'native selection');
    const old=await focus();assert.ok(old);
    await page.keyboard.press(direction);await wait(page,old=>{const s=__wulin.native.semantics.snapshot;return s.nodes.find(n=>n.id===s.focused)?.name!==old;},old,'native arrow selection');
    await page.keyboard.press('Enter');await wait(page,previous=>!__wulin.native.game.asking&&__wulin.ui.difficulty!==previous,previous,'native choice committed');
  };
  await chooseDifficulty('ArrowDown');assert.equal(await page.evaluate(()=>__wulin.ui.difficulty),2);
  await chooseDifficulty('ArrowUp');assert.equal(await page.evaluate(()=>__wulin.ui.difficulty),1);
  const scenario=await page.evaluate(()=>__wulin.ui.scenario);
  await activate(page,'@choice',{change:'scenario'});await wait(page,()=>__wulin.native.game.asking,undefined,'scenario selector');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await wait(page,()=>!__wulin.native.game.asking,undefined,'selection dismissed');
  assert.equal(await page.evaluate(()=>__wulin.ui.scenario),scenario);checks.push('engine scrollable choice: current value, arrows, commit and Escape cancel');
  await activate(page,'new');await press(page,'button:确认');await wait(page,()=>__wulin.world&&__wulin.ui.sheet?.kind==='guide'&&__wulin.picture.stage?.frames>0,undefined,'world ready',120000);
  await activate(page,'close');await activate(page,'page',{page:'saves'});await wait(page,()=>__wulin.ui.page==='saves',undefined,'saves page');
  await activate(page,'save',{slot:'1'});await wait(page,()=>!!localStorage.getItem('wulin-slot-1'),undefined,'saved original format');
  const slot=await page.evaluate(()=>localStorage.getItem('wulin-slot-1'));
  const expected=JSON.parse(slot);assert.equal(expected.magic,'wulin-save');
  const exportedEvent=page.waitForEvent('download');await activate(page,'export');const exported=await exportedEvent;
  assert.match(exported.suggestedFilename(),/\.wulin\.json$/u);
  const bytes=await readFile(await exported.path());const file=JSON.parse(bytes.toString('utf8'));
  assert.deepEqual(file,expected);assert.equal(await page.locator('a[download]').count(),0);
  checks.push('actual download exactly matches original browser slot format and bytes');
  async function chooseFile(action,payload){
    const event=page.waitForEvent('filechooser');await activate(page,action);const chooser=await event;
    await chooser.setFiles(payload);await wait(page,()=>document.querySelectorAll('input[type=file]').length===0,undefined,'file chooser cleaned');
  }
  const before=await page.evaluate(()=>({day:__wulin.world.day,sect:__wulin.world.playerSect}));
  await chooseFile('import',[]);assert.deepEqual(await page.evaluate(()=>({day:__wulin.world.day,sect:__wulin.world.playerSect})),before);
  await chooseFile('import',{name:'invalid.wulin.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
  await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>({day:__wulin.world.day,sect:__wulin.world.playerSect})),before);
  await activate(page,'quit');await press(page,'button:确认');await wait(page,()=>__wulin.ui.page==='title',undefined,'return to title');
  await activate(page,'sheet',{kind:'load'});await wait(page,()=>__wulin.ui.sheet?.kind==='load',undefined,'load menu');
  await chooseFile('import',{name:exported.suggestedFilename(),mimeType:'application/json',buffer:bytes});
  await wait(page,()=>__wulin.world&&__wulin.ui.page==='seat'&&!__wulin.ui.sheet,undefined,'imported original-format save');
  assert.deepEqual(await page.evaluate(()=>({day:__wulin.world.day,sect:__wulin.world.playerSect})),before);
  assert.equal(await page.evaluate(()=>localStorage.getItem('wulin-slot-1')),slot);
  checks.push('cancelled/invalid import preserves current world; exported legacy-format file restored from title');
  await activate(page,'sheet',{kind:'settings'});await wait(page,()=>__wulin.ui.sheet?.kind==='settings',undefined,'settings');
  await chooseFile('mod-load',{name:'invalid-mod.json',mimeType:'application/json',buffer:Buffer.from('invalid JSON')});
  assert.equal(await page.evaluate(()=>localStorage.getItem('wulin-mod')),null);
  checks.push('invalid data pack rejected without installing or reloading it');
  assert.deepEqual(page.problems,[]);console.log(JSON.stringify({checks,pass:true}));
}catch(error){console.error(error,JSON.stringify({checks,problems:page?.problems}));process.exitCode=1;}
finally{await browser.close();await server.close();}
