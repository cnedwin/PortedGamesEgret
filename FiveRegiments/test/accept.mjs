// Browser acceptance uses the original gameplay route, with native semantic
// controls instead of DOM selectors. Keyboard and actual pointer tests remain
// separate from semantic activation. The old PNGs remain strict by default.
import { dirname, relative, resolve } from 'node:path';
import {mkdir} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(), browser = await launch(), checks = [], check = (ok, words) => checks.push([Boolean(ok), words]);
const candidate=process.argv.find(x=>x.startsWith('--candidate='))?.split('=').slice(1).join('=');
if(candidate)await mkdir(candidate,{recursive:true});
const readyName=name=>page.waitForFunction(n=>window.egretGame?.tester?.exists(n),name,{timeout:30000});
const press=async name=>{await readyName(name);return page.evaluate(words=>window.egretGame.tester.press(words),name);};
const words=async name=>{await readyName(name);return page.evaluate(words=>window.egretGame.tester.text(words),name);};
const snapshot=()=>page.evaluate(()=>window.egretGame.screens.snapshot());
let page;
async function screen(kind){
  await page.waitForFunction(k=>window.egretGame?.screens?.current===k&&window.egretGame.screens.view?.visible,kind,{timeout:180000});
  // A view publishes its accessible geometry on the Play frame, not while its
  // stack is mounting. Require two real frames before the next semantic action.
  const frame=await page.evaluate(()=>egretGame.status.frames);
  await page.waitForFunction(n=>egretGame.status.frames>=n+2,frame,{timeout:30000});
}
async function clickIntoFight(){
  // The player now explicitly enters pointer-lock on a completed canvas click;
  // a menu gesture must not be carried across an asynchronous level load.
  await page.waitForFunction(()=>egretGame?.mode==='fight'&&egretGame.screens.current===null);
  if(await page.evaluate(()=>egretGame.input.state.wantLock&&!egretGame.input.state.pointerLocked)){
    const bounds=await page.evaluate(()=>{const r=egretGame.uiGame.canvas.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
    await page.mouse.click(bounds.x,bounds.y);
    await page.waitForFunction(()=>egretGame.input.state.pointerLocked,null,{timeout:10000});
  }
}
async function pressControl(name,id) {
  // Use the actual semantic tester, but also require the part be present before
  // activation. The visible UI and native buttons serve the same input action.
  await page.waitForFunction(id=>{try{return !!egretGame.screens?.view?.visibleRect(id)}catch{return false}},id,{timeout:30000});
  await page.evaluate(async id=>{await egretGame.screens.view?.textReady(id);},id);
  return press(name);
}
try {
  page = await openPage(browser, `${server.url}${path}/?seed=3&lang=zh&quality=low`, { width: 1024, height: 600 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await screen('title');
  check((await words('text:帝国竞技场'))==='帝国竞技场','the native title is up, in Chinese');
  await pressControl('征途','road');await screen('choose');
  // Real browser keyboard, not direct state mutation.
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>egretGame.screens.snapshot().selected==='tiger');
  check((await snapshot()).selected==='tiger','the right arrow turns to the Tiger Step');
  await page.keyboard.press('Enter');await screen('loadout');
  check((await snapshot()).skills.length===2,'two skills are taken by default');
  check((await snapshot()).talents.length===2,'the Tiger Step’s two published talents are taken by default');
  // The toggle's accessible name stays stable when its checked state changes.
  await press('万人敌');
  check((await snapshot()).talents.length===1,'a talent can be taken off');
  await press('万人敌');
  check((await snapshot()).talents.length===2,'and put back');
  check((await snapshot()).arts===1,'the weapon art is shown with the skills');
  // Focus returns to the same card after editing; reach the footer using a
  // named native action, then Enter activates that focused control.
  await page.evaluate(()=>egretGame.tester.focus('出阵'));
  await page.keyboard.press('Enter');await screen('card');
  check((await words('text:县城校场'))==='县城校场','the first fight is on the county drill ground');
  await page.keyboard.press('Enter');await until(page,()=>window.egretGame.mode==='fight',180);
  const men=await page.evaluate(()=>window.egretGame.game.men.map(m=>m.regiment));
  check(men[0]==='tiger'&&men.length===2,`the fight is on: ${men.join(' against ')}`);
  check(await page.evaluate(()=>{const h=egretGame.hud.snapshot();return h.visible&&h.skillCount===3&&h.slotCount===10&&h.compass}),
    'the native HUD shows the compass, ten slots, two skills and the art');
  await clickIntoFight();
  const over=await page.evaluate(()=>window.egretGame.run(240));
  check(over==='won'||over==='lost',`a stand-in plays it out: ${over}`);
  await screen('result');
  check(await page.evaluate(()=>egretGame.tester.exists('text:胜')||egretGame.tester.exists('text:败')),'the result reads won or lost');
  await press('回到卷首');await screen('title');
  check(true,'back to the native title');
  await press('设置');await screen('settings');
  await press('tab:血雾 · 关');await page.waitForTimeout(200);
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('five-regiments')).data.settings.blood===false),'blood off is kept in the save');
  await page.keyboard.press('Escape');await screen('title');
  await pressControl('English','lang');
  await page.waitForFunction(()=>document.documentElement.lang==='en'&&egretGame.tester.exists('text:Imperial Arena'));
  check((await words('text:Imperial Arena'))==='Imperial Arena','switching to English redraws the title');
  // Two at once, straight from the original supported address.
  await page.goto(`${server.url}${path}/?seed=5&lang=zh&quality=low&duel=vanguard,plume,archer&place=palace`);
  await until(page,()=>window.egretGame?.mode==='fight',180);
  check(await page.evaluate(()=>egretGame.hud.snapshot().plates===2),'a native nameplate for each foe');
  await clickIntoFight();
  const two=await page.evaluate(()=>window.egretGame.run(300));
  check(two==='won'||two==='lost',`one against two plays out: ${two}`);
  await screen('result');check(true,'and ends on a result');
  // Deterministic screenshots: an explicit --candidate=<directory> run captures
  // proposed frames for review without replacing or ignoring the originals.
  const frames=async n=>{
    const from=await page.evaluate(()=>egretGame.status.frames);
    await page.waitForFunction(at=>egretGame.status.frames>=at,from+n,{timeout:240000,polling:50});
  };
  const looks=async(name,label)=>{
    if(candidate)await page.screenshot({path:resolve(candidate,name+'.png')});
    const seen=await matchBaseline(page,GAME,name,{update:!candidate&&process.argv.includes('--update')});
    check(candidate||seen.written||seen.passed,`${label} (${seen.written?'baseline written':(seen.share*100).toFixed(2)+'% differs'}${candidate?' · candidate only, original retained':''})`);
  };
  await page.goto(`${server.url}${path}/?seed=3&lang=zh&quality=low&fixed`);
  await screen('title');await frames(40);await looks('title','the title and five on the drill ground');
  await press('征途');await screen('choose');await frames(60);await looks('choose','choose a regiment');
  await page.goto(`${server.url}${path}/?seed=4&lang=zh&quality=low&fixed&auto&duel=plume,vanguard&place=bamboo`);
  await until(page,()=>window.egretGame?.mode==='fight',180);
  await page.evaluate(()=>egretGame.hud.hideBanner());
  await page.evaluate(()=>egretGame.holdAt(2.5));
  await page.waitForFunction(()=>egretGame.game.time>=2.5,null,{timeout:240000,polling:50});
  await frames(30);await looks('fight','a duel on the bamboo path');
} catch(error){check(false,`the walk stopped: ${error.message.split('\n')[0]}`);}
finally{
  const problems=page?.problems??[];
  await browser.close();await server.close();
  report('FiveRegiments native UI acceptance (headless Chromium, SwiftShader)',checks,problems);
}
