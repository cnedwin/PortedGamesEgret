// A real keyboard-only route: no programmatic focus, simulation changes or page widgets.
import {serve,launch,openPage} from '../../tools/lib/browser.mjs';
import assert from 'node:assert/strict';
const server=await serve(),browser=await launch();let page;
const result={steps:[],errors:[]};
try{
  page=await openPage(browser,server.url+'Wulin/?seed=7&quality=low',{width:1280,height:800});
  await page.waitForFunction(()=>window.egretGame?.ready&&!window.egretGame.failed);
  const focused=()=>page.evaluate(()=>{
    const {game,semantics}=__wulin.native,s=semantics.snapshot,owner=document.activeElement;
    const part=s.nodes.find(n=>n.id===s.focused&&!n.hidden&&!n.inert&&!n.disabled);
    const id=owner?.getAttribute('aria-activedescendant'),target=id?document.getElementById(id):null;
    const valid=owner===game.canvas&&!!part&&!!target&&target.getAttribute('aria-label')===part.name;
    return {name:valid?part.name:null,coherent:owner!==game.canvas||valid||(!part&&!id),
      signature:JSON.stringify([owner?.tagName,id,part?.id])};
  });
  // A key event is synchronous, but the semantic projection follows the engine
  // frame. Await its receipt before sending another key on a slow renderer.
  async function select(word){
    let count=0,state=await focused();
    while(state.name!==word&&count<100){
      const before=state.signature;await page.keyboard.press('Tab');count++;
      const deadline=Date.now()+10000;
      do{await page.waitForTimeout(25);state=await focused();}
      while((!state.coherent||state.signature===before)&&Date.now()<deadline);
      assert(state.coherent&&state.signature!==before,'Tab focus did not advance while seeking '+word);
    }
    assert.equal(state.name,word,'Cannot reach '+word+' by Tab');
    await page.keyboard.press('Enter');result.steps.push({word,tabs:count});
  }
  async function advance(word,ready){await select(word);await page.waitForFunction(ready,undefined,{timeout:120000,polling:50});}
  await advance('开创新局',()=>__wulin.ui.page==='prologue');
  await advance('跳过序章',()=>__wulin.ui.page==='sects');
  await advance('定下传承',()=>__wulin.ui.page==='legacy');
  await advance('入主山门',()=>__wulin.native.semantics.snapshot.nodes.some(n=>n.name==='确认'&&!n.hidden&&!n.inert));
  await advance('确认',()=>__wulin.ui.page==='seat'&&__wulin.ui.sheet?.kind==='guide'&&__wulin.picture.stage?.frames>0&&!__wulin.picture.stage.preparing);
  await advance('查看山门',()=>__wulin.ui.page==='seat'&&!__wulin.ui.sheet);
  await advance('弟子',()=>__wulin.ui.page==='disciples');
  assert.deepEqual(page.problems,[]);result.pass=true;
}catch(error){result.error=String(error.stack??error);}
finally{result.errors=page?.problems??[];console.log(JSON.stringify(result,null,2));await browser.close();await server.close();if(!result.pass)process.exitCode=1;}
