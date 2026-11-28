// Browser acceptance for the native overlay using genuine semantic controls and real browser keys/pointers.
// The replay discussed in screen-route.mjs accelerates only rule updates; its boss and defeat are not injected.
import { dirname, relative, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve } from '../../tools/lib/browser.mjs';
import { ready, names, control, point, press, tap, state, wait, waitFrames, checkpoint, runRoute, advance } from './screen-route.mjs';

const GAME=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const prefix=relative(ROOT,GAME).split('\\').join('/');
const server=await serve(), browser=await launch(), pages=[], checks=[], observations={};
const check=(pass,words)=>checks.push([Boolean(pass),words]);
const candidate=process.env.JELLY_SCREEN_CANDIDATES, evidence=process.env.JELLY_ACCEPT_REPORT;
const url=lang=>server.url+prefix+'/?seed=7&ratio=1&lang='+lang;

const driver=(page,{capture=false}={})=>({
  page,read:(fn,arg)=>page.evaluate(fn,arg),expect:(pass,words)=>{check(pass,words);if(!pass)throw new Error(words);},
  async picture(label){
    if(!capture)return;
    if(candidate){await mkdir(candidate,{recursive:true});await page.screenshot({path:resolve(candidate,label+'.png'),timeout:90000});}
    const name=label==='title-selected'?'title':label==='end'?'end':undefined;
    // Candidate mode is for inspecting an actual screenshot before adopting a new baseline.
    // Normal acceptance matches the approved baselines; no existing images are silently regenerated.
    if(name&&!candidate){const result=await matchBaseline(page,GAME,name);check(result.written||result.passed,name+' screenshot '+(result.written?'first baseline':(result.share*100).toFixed(2)+'% differs'));}
  }
});
async function makePage(lang,options={}) {
  const page=await openPage(browser,url(lang),options);pages.push(page);
  return page;
}
async function keyboardControl(player, name) {
  const wanted=await control(player,{name});
  for(let i=0;i<48;i++){
    if((await names(player)).some(n=>n.id===wanted.id&&n.focused))return true;
    await player.page.keyboard.press('Tab');
  }
  return false;
}
async function keyboardSemantics(){
  const pg=await makePage('en',{width:844,height:390}),p=driver(pg);
  await ready(p);
  check(await pg.evaluate(()=>window.egretGame?.ready===true),'boot readiness names the actual usable title');
  check(await keyboardControl(p,'Settings'),'Tab reaches the native Settings action and publishes focus');
  await pg.keyboard.press('Enter');
  await control(p,{id:'menu-settings-sound'});
  check(await keyboardControl(p,'Sound'),'Tab reaches native Sound switch');
  const before=await pg.evaluate(()=>JSON.parse(localStorage.getItem('jelly-pandas')??'{}').muted??false);
  await pg.keyboard.press('Space');
  await wait(p,old=>JSON.parse(localStorage.getItem('jelly-pandas')??'{}').muted!==old,before,'Space toggles the setting');
  check(true,'Space toggles sound and persists the old flat settings');
  await pg.keyboard.press('Escape');
  await control(p,{id:'menu-title-play'});
  check(await keyboardControl(p,'Play'),'Tab reaches native Play after closing Settings');
  const nodes=await names(p),active=nodes.find(n=>n.id==='menu-title-play');
  check(active?.focused,'the selected native control remains visibly focusable');
  check(!/[\u3400-\u9fff]/.test(nodes.map(n=>n.name).join('|')),'English native semantic names contain no untranslated CJK text');
  await pg.keyboard.press('Enter');
  await wait(p,()=>window.__jellyPandas?.mode==='play',undefined,'Enter starts a new game');
  check(true,'Enter activates the native Play action');
  observations.keyboard={names:nodes.map(n=>[n.role,n.name,n.focused]),mode:(await state(p)).mode};
  await pg.context().close();
}
function rotation(player, original) {
  return async(label)=>{
    const pg=player.page;
    const before=await state(player);
    await pg.evaluate(()=>{const {ui}=window.__jellyPandas;window.__jellyBaselineIdentity={ui,game:ui.game,overlay:ui.overlay,projection:ui.projection,sim:window.__jellyPandas.game};});
    const snapshots=[];
    for(const size of [{width:393,height:852},original]){
      await pg.setViewportSize(size);await waitFrames(player,3);
      const after=await state(player), identity=await pg.evaluate(()=>{
        const a=window.__jellyBaselineIdentity,s=window.__jellyPandas,{ui}=s,screen=ui.game.screen;
        return {hud:a.ui===ui,game:a.game===ui.game,overlay:a.overlay===ui.overlay,projection:a.projection===ui.projection,sim:a.sim===s.game,
          orientation:screen.orientation,viewport:[innerWidth,innerHeight],size:[screen.width,screen.height]};
      });
      check(Object.keys(identity).filter(k=>['hud','game','overlay','projection','sim'].includes(k)).every(k=>identity[k]),label+' '+size.width+'×'+size.height+' retains original overlay/game/projection/simulation');
      check(after.mode===before.mode&&after.menu===before.menu,label+' stays in the same screen after resizing');
      if(before.mode==='paused'||before.choice||before.mode==='over')check(after.t===before.t,label+' retains paused/choice/end progress across resizing');
      if(before.choice)check(after.pending===before.pending&&after.rerolls===before.rerolls,'open card offer does not change on rotation');
      snapshots.push({size,identity,state:after,geometry:await checkpoint(player,'resize-'+label+'-'+size.width+'x'+size.height)});
    }
    (observations.rotation??={})[label]=snapshots;
    await pg.evaluate(()=>delete window.__jellyBaselineIdentity);
  };
}
async function victory(p){
  // Same deterministic solo seed, actual rules until the third boss dies. This is a separate result variant.
  const pg=p.page,viewport=pg.viewportSize();await control(p,{name:'Play',role:'button'});
  await pg.setViewportSize({width:320,height:180});await control(p,{name:'Play',role:'button'});
  const win=await advance(p,1200,{bot:true,fresh:'Play'});
  check(win.start.t===0&&win.end.state==='won','native victory from the same exact fresh seed without editing rules or HP');
  if(win.end.state!=='won')throw new Error('Victory fixture failed '+JSON.stringify(win));
  await wait(p,()=>window.__jellyPandas.mode==='over',undefined,'victory result',120000);
  await waitFrames(p,12);await pg.setViewportSize(viewport);
  await control(p,{name:'Title',role:'button'});
  observations.victory={fixture:win,layout:await checkpoint(p,'victory')};
  await tap(p,'Title');await wait(p,()=>window.__jellyPandas.mode==='title',undefined,'victory title button');
}
async function saveCompatibility(){
  const previous={skin:4,party:3,muted:true,quality:'low'};
  const pg=await makePage('en',{width:844,height:390,before:async(page)=>{
    await page.addInitScript(previous=>{if(!sessionStorage.getItem('jelly-old-fixture')){localStorage.setItem('jelly-pandas',JSON.stringify(previous));sessionStorage.setItem('jelly-old-fixture','1');}},previous);
  }}),p=driver(pg);
  await ready(p);
  check((await state(p)).skin===4&&(await state(p)).party===3,'old unversioned settings load directly into native preview');
  await pg.reload();await ready(p);
  check((await state(p)).skin===4&&(await state(p)).party===3,'reload preserves previous choices without migration or loss');
  const settings=await pg.evaluate(()=>JSON.parse(localStorage.getItem('jelly-pandas')));
  check(JSON.stringify(settings)===JSON.stringify(previous),'original settings shape stays compatible');observations.save={settings};
  await pg.context().close();
  const broken=await makePage('en',{width:844,height:390,before:async page=>page.addInitScript(()=>localStorage.setItem('jelly-pandas','{broken'))}),b=driver(broken);
  await ready(b);check((await state(b)).skin===0&&(await state(b)).party===1,'malformed old settings fall back safely');
  await broken.context().close();
}
async function refusedAsset(resource='roster'){
  const file=resource==='glyph'?'/vendor/engine/dist/web/browserGameGlyphFont.js':'/assets/panda-roster.webp';
  let refused=0;const failures=[];
  const pg=await makePage('en',{width:844,height:390,before:async page=>{
    page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
    await page.route('**'+file,route=>{
      if(refused===0){refused++;return route.abort('failed');}return route.continue();
    });
  }}),p=driver(pg);
  // The failure screen is a real engine overlay, even before the roster texture loaded.
  await wait(p,()=>window.__jellyPandas?.ui?.semantics?.snapshot?.nodes.some(n=>!n.hidden&&!n.inert&&!n.disabled&&n.name==='Reload'),
    undefined,'native recovery control',90000);
  check(await pg.evaluate(()=>window.egretGame?.ready===true),'native recovery is a ready interactive screen');
  check(refused===1&&failures.some(f=>f.url.includes(file)),'intentional '+resource+' resource failure was exercised');
  if(candidate){await mkdir(candidate,{recursive:true});await pg.screenshot({path:resolve(candidate,resource==='glyph'?'failure-glyph.png':'failure.png'),timeout:90000});}
  await tap(p,{name:'Reload'});await ready(p);
  check((await state(p)).mode==='title','real recovery button reloads after '+resource+' resource becomes available');
  observations['refusal-'+resource]={refused,failures,mode:(await state(p)).mode};
  // Only the deliberate one-file abort may produce a failed-resource console message. Other page/HTTP errors remain.
  pg.problems=pg.problems.filter(m=>!(m.startsWith('console: Failed to load resource: net::ERR_FAILED')&&failures.length===1));
  await pg.context().close();
}

try {
  await keyboardSemantics();
  const pg=await makePage('zh',{width:844,height:390}),p=driver(pg,{capture:true});
  // This route additionally rotates the same live overlay during HUD, pause, cards and end.
  observations.desktop=await runRoute(p,{rotate:rotation(p,{width:844,height:390}),allParties:true});
  await victory(p);
  await pg.context().close();
  // Touch-size viewport emulation is intentionally separate from a physical-device test.
  const touch=await makePage('zh',{width:393,height:852,touch:true}),tp=driver(touch,{capture:false});
  observations.touch=await runRoute(tp,{includeEnd:false,allParties:false});
  await touch.context().close();
  await saveCompatibility();
  await refusedAsset();
  await refusedAsset('glyph');
}catch(error){checks.push([false,error.stack??String(error)]);}
finally{
  const problems=pages.flatMap(p=>p.problems??[]);
  if(evidence){await mkdir(evidence,{recursive:true});await writeFile(resolve(evidence,'report.json'),JSON.stringify({checks,problems,observations},null,2)+'\n');}
  report('Jelly Pandas · actual browser acceptance (SwiftShader; mobile touch simulated)',checks,problems);
  await browser.close();await server.close();
}
