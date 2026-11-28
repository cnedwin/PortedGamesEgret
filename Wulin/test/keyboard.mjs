// A real keyboard-only route: no programmatic focus, simulation changes or page widgets.
import {serve,launch,openPage} from '../../tools/lib/browser.mjs';
import assert from 'node:assert/strict';
const server=await serve(),browser=await launch();let page;
const result={steps:[],errors:[]};
try{
  page=await openPage(browser,server.url+'Wulin/?seed=7&quality=low',{width:1280,height:800});
  await page.waitForFunction(()=>window.egretGame?.ready&&!window.egretGame.failed);
  const focused=()=>page.evaluate(()=>__wulin.native.semantics.snapshot.nodes.filter(n=>n.focused&&!n.hidden&&!n.inert).map(n=>n.name));
  async function select(word){let count=0;for(;count<100;count++){await page.keyboard.press('Tab');await page.waitForTimeout(60);if((await focused()).includes(word))break;}assert(count<100,'Cannot reach '+word+' by Tab');await page.keyboard.press('Enter');await page.waitForTimeout(300);result.steps.push({word,tabs:count+1});}
  for(const word of ['开创新局','跳过序章','定下传承','入主山门','确认','查看山门','弟子'])await select(word);
  assert.equal(await page.evaluate(()=>__wulin.ui.page),'disciples');
  assert.deepEqual(page.problems,[]);result.pass=true;
}catch(error){result.error=String(error.stack??error);}
finally{result.errors=page?.problems??[];console.log(JSON.stringify(result,null,2));await browser.close();await server.close();if(!result.pass)process.exitCode=1;}
