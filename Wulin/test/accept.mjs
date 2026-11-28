import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve,launch,openPage,matchBaseline,report} from '../../tools/lib/browser.mjs';
import {runRoute,wait} from './screen-route.mjs';
const dir=resolve(fileURLToPath(new URL('..',import.meta.url))),server=await serve(),browser=await launch();
const checks=[],problems=[];let page;
try{
  page=await openPage(browser,server.url+'Wulin/?seed=7&quality=low',{width:1280,height:800});
  await runRoute({page,checkpoint:async name=>{
    checks.push([true,name]);
    if(['title','legacy'].includes(name)){
      await page.waitForTimeout(1000);
      if(process.env.WULIN_BASELINE_OUT){await mkdir(process.env.WULIN_BASELINE_OUT,{recursive:true});await page.screenshot({path:resolve(process.env.WULIN_BASELINE_OUT,name+'.png')});}
      if(process.env.WULIN_REVIEW_BASELINE!=='1'){
        const b=await matchBaseline(page,dir,name,{update:false});checks.push([b.written||b.passed,'reviewed '+name+' baseline: '+b.share]);
      }
    }
  }});
  problems.push(...page.problems);
  checks.push([true,'Native keyboard/semantic flow and old-format browser save']);
}catch(error){checks.push([false,String(error.stack??error)]);problems.push(...(page?.problems??[]));}
finally{await browser.close();await server.close();}
report('Wulin native UI',checks,problems);
