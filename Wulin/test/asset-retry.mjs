import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { serve, launch, openPage } from '../../tools/lib/browser.mjs';
import { wait } from './screen-route.mjs';

// Refuse the same resources as E2, plus each launch dependency alone. A
// recoverable load must show a native, clickable retry, not freeze the canvas.
const server=await serve(),browser=await launch(),out=process.env.WULIN_ASSET_RETRY_OUT;
const results=[];
if(out)await mkdir(out,{recursive:true});
try {
  for(const [name,match,language] of [
    ['all',(_,kind)=>['image','media','font','fetch','xhr'].includes(kind),'zh'],
    ['manifest',url=>url.endsWith('/art-handoff/manifest.json'),'zh'],
    ['seal',url=>url.endsWith('/assets/ui/command-seal.png'),'zh'],
    ['title',url=>url.endsWith('/assets/scenes/title.webp'),'en'],
  ]){
    let refuse=true;const refused=[];
    const page=await openPage(browser,server.url+'Wulin/?lang='+language,{width:960,height:540,before:page=>page.route('**/*',route=>{
      const req=route.request(),url=req.url(),kind=req.resourceType();
      if(refuse&&url.includes('/Wulin/')&&!/\.m?js(\?|$)|favicon/.test(url)&&match(url,kind)){
        refused.push(url);return route.abort('failed');
      }
      return route.continue();
    })});
    try{
      await wait(page,()=>egretGame.ready&&egretGame.failed,undefined,name+' failure ready',30000);
      assert.ok(refused.length,name+' expected a failed request');
      // Keep the error on screen as a player would, beyond E2's observation window.
      await page.waitForTimeout(2500);
      assert.equal(await page.evaluate(()=>__wulin.native.game.browser.loop.state),'running','startup failure must not end the native host');
      const retry=language==='en'?'Retry':'重试';
      await wait(page,retry=>__wulin.native?.tester.exists('button:'+retry),retry,name+' native retry',12000);
      assert.equal(await page.locator('#loading').evaluate(e=>e.hidden),true,'healthy host should use the native error view');
      const control=await page.locator('[aria-label="'+retry+'"]').boundingBox();
      assert.ok(control&&control.width>=44&&control.height>=44,'retry has a usable hit area');
      if(out)await page.screenshot({path:join(out,name+'-error.png')});
      refuse=false;
      const navigated=page.waitForNavigation();
      await page.mouse.click(control.x+control.width/2,control.y+control.height/2);
      await navigated;
      await wait(page,()=>egretGame.ready&&!egretGame.failed,undefined,name+' healthy reload',30000);
      await wait(page,()=>__wulin.native.ui.focusAction('page',{page:'prologue'})!==null,undefined,name+' working title');
      if(out)await page.screenshot({path:join(out,name+'-recovered.png')});
      assert.deepEqual(page.problems.filter(p=>p.startsWith('pageerror')),[]);
      results.push({name,refused:refused.map(x=>new URL(x).pathname),native:true,recovered:true});
    }finally{await page.context().close();}
  }
  // A later declarative image binding can still terminate Play. Only then
  // the bootstrap status line owns a reload link; never rely on a frozen
  // canvas or a stale semantic control.
  let refuseScene=true;const refusedScene=[];
  const scenePage=await openPage(browser,server.url+'Wulin/?lang=zh',{width:393,height:852,touch:true,before:page=>page.route('**/art-handoff/assets/scenes/decree.webp',route=>{
    if(refuseScene){refusedScene.push(route.request().url());return route.abort('failed');}
    return route.continue();
  })});
  async function enterPrologue(){
    const target=scenePage.locator('[aria-label="开创新局"]');
    await target.waitFor({state:'visible'});
    const box=await target.boundingBox();
    assert.ok(box&&box.width>=44&&box.height>=44);
    await scenePage.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  }
  try{
    await wait(scenePage,()=>egretGame.ready&&!egretGame.failed,undefined,'normal title before late failure');
    await enterPrologue();
    await wait(scenePage,()=>egretGame.failed&&__wulin.native.game.browser.loop.state==='failed',undefined,'late image terminated host',12000);
    assert.ok(refusedScene.length);
    const link=scenePage.locator('#loading[role=alert] a');
    await link.waitFor({state:'visible'});
    await scenePage.waitForTimeout(2500);
    assert.ok(await link.isVisible(),'emergency retry remains visible');
    assert.ok((await link.boundingBox()).height>=44);
    assert.equal(await scenePage.locator('#overlay').evaluate(e=>e.inert),true);
    if(out)await scenePage.screenshot({path:join(out,'late-error.png')});
    refuseScene=false;
    const navigated=scenePage.waitForNavigation();
    await link.tap();await navigated;
    await wait(scenePage,()=>egretGame.ready&&!egretGame.failed,undefined,'retry after stopped host reloads');
    await enterPrologue();
    await wait(scenePage,()=>__wulin.ui.page==='prologue'&&__wulin.native.game.browser.loop.state==='running',undefined,'same scene available');
    await scenePage.waitForTimeout(1500);
    assert.equal(await scenePage.evaluate(()=>!!egretGame.failed),false);
    assert.deepEqual(scenePage.problems.filter(p=>p.startsWith('pageerror')),[]);
    if(out)await scenePage.screenshot({path:join(out,'late-recovered.png')});
    results.push({name:'late-scene',refused:refusedScene.map(x=>new URL(x).pathname),native:false,recovered:true});
  }finally{await scenePage.context().close();}
  console.log(JSON.stringify({results,pass:true},null,2));
}finally{await browser.close();await server.close();}
