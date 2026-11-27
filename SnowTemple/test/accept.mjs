// Native World3D overlay acceptance. Default: small software-rendered opening smoke.
// Explicit SNOW_HARDWARE=1: normal full chapter, settings and touch regression.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { ROOT, launch, openPage, serve, matchBaseline, report } from '../../tools/lib/browser.mjs';
import { ready,press,target,wait,semanticReceipt,attachChapterObserver,bindKeyboardMouse,driveChapter,nativeTouchGeometry } from './browser-ui.mjs';

const gameDir=resolve(dirname(fileURLToPath(import.meta.url)),'..'),gamePath=relative(ROOT,gameDir).split('\\').join('/');
const server=await serve(),hardware=process.env.SNOW_HARDWARE==='1';
async function launchSnow(){if(!hardware)return launch();if(!process.env.CHROMIUM_PATH)throw Error('SNOW_HARDWARE requires CHROMIUM_PATH');const {chromium}=await import('playwright');return chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-software-rasterizer','--autoplay-policy=no-user-gesture-required']});}
const browser=await launchSnow(),checks=[],pages=[];
const check=(ok,text)=>{checks.push([Boolean(ok),text]);console.error((ok?'ok':'not ok')+' - '+text);return Boolean(ok);};
const need=(ok,text)=>{if(!check(ok,text))throw Error(text);};
const url=server.url+gamePath+'/?seed=7&quality=low&models=low';
const state=page=>page.evaluate(()=>{const q=__snow,g=q.game;return{time:g.time,x:g.hero.x,z:g.hero.z,stamina:g.hero.stamina,hp:g.hero.hp,stage:g.stage,phase:g.boss.phase,tier:g.tier,mode:g.mode,boons:g.boons.slice(),settingsOpen:q.hud.settingsOpen(),save:JSON.parse(localStorage.getItem('snow-temple-settings')??'null'),progress:JSON.parse(localStorage.getItem('snow-temple-progress')??'null')};});
async function named(page,role,prefix){await ready(page);const receipt=await page.evaluate(semanticReceipt);const node=receipt.nodes.find(n=>n.role===role&&(n.name===prefix||n.name.startsWith(prefix))&&!n.disabled);if(!node)throw Error('Missing semantic '+role+':'+prefix);return role+':'+node.name;}
async function orientations(page,label,query){
 const originalSize=page.viewportSize();await page.setViewportSize({width:852,height:393});await wait(page,()=>__snow.ui.game.screen.width>__snow.ui.game.screen.height,null,15000);await ready(page,query);
 const before=await page.evaluate(()=>{const q=__snow,u=q.ui;window.__snowTestRotate=[q.game,u,u.game,u.overlay,u.semantics];return {time:q.game.time,stage:q.game.stage,tier:q.game.tier,phase:q.game.boss.phase,boons:q.game.boons,choice:q.game.choice?.options,progress:localStorage.getItem('snow-temple-progress'),focus:u.game.keyboard.getSnapshot().focusedId};});
 for(const v of [{width:393,height:852},{width:852,height:393}]){await page.setViewportSize(v);await wait(page,portrait=>{const s=__snow.ui.game.screen;return (s.height>s.width)===portrait},v.height>v.width,15000);await ready(page,query);const rotation=await page.evaluate(b=>{const q=__snow,u=q.ui,g=q.game,focus=u.game.keyboard.getSnapshot().focusedId;return {identity:window.__snowTestRotate.every((v,i)=>v===[g,u,u.game,u.overlay,u.semantics][i]),stage:g.stage===b.stage,tier:g.tier===b.tier,phase:g.boss.phase===b.phase,boons:JSON.stringify(g.boons)===JSON.stringify(b.boons),choice:JSON.stringify(g.choice?.options)===JSON.stringify(b.choice),progress:localStorage.getItem('snow-temple-progress')===b.progress,time:q.hud.settingsOpen()?g.time===b.time:g.time>=b.time,focus:focus===b.focus,beforeFocus:b.focus,afterFocus:focus,beforeTime:b.time,afterTime:g.time,settingsOpen:q.hud.settingsOpen()};},before);const unchanged=['identity','stage','tier','phase','boons','choice','progress','time','focus'].every(key=>rotation[key]);if(!unchanged)console.error('rotation diagnostic '+JSON.stringify(rotation));need(unchanged,label+' '+v.width+'×'+v.height+' retains overlay, semantics, focus and chapter state');}
 await page.setViewportSize(originalSize);await ready(page,query);
}
async function verifySettings(page,{rotate=false}={}){
 await press(page,'button:设置');await wait(page,()=>__snow.hud.settingsOpen(),null);const paused=await state(page);await page.keyboard.press('w');await page.waitForTimeout(240);const afterSpace=await state(page);
 need(paused.time===afterSpace.time&&paused.x===afterSpace.x&&paused.z===afterSpace.z&&paused.stamina===afterSpace.stamina,'settings is modal and game time, position and stamina do not advance');
 await press(page,'radio:声音：关');need((await state(page)).save?.data?.sound==='off','native Sound off persists');await press(page,'radio:声音：开');need((await state(page)).save?.data?.sound==='on','native Sound on persists');
 await page.evaluate(()=>{window.__snowTestLocale=[__snow.game,__snow.ui.game];});await press(page,'radio:语言：English');await ready(page,'button:Close');need(await page.evaluate(()=>document.documentElement.lang==='en'&&__snow.game===window.__snowTestLocale[0]&&__snow.ui.game===window.__snowTestLocale[1]),'English native settings read back without replacing chapter or overlay');
 await press(page,'button:Close');await ready(page,'button:Satchel');const english=await page.evaluate(semanticReceipt);need(english.nodes.some(n=>n.name==='Satchel')&&await page.evaluate(()=>__snow.hud.combat.snapshot().pads.attack.label.includes('Strike')),'actual live combat HUD relabels into English');
 await press(page,'button:Settings');await ready(page,'button:Close');await press(page,'radio:Language：Chinese');await ready(page,'button:关闭');need(await page.evaluate(()=>document.documentElement.lang.startsWith('zh')&&__snow.game===window.__snowTestLocale[0]&&__snow.ui.game===window.__snowTestLocale[1]),'language returns to original Chinese, same actual chapter');
 await press(page,'button:出枪');await page.keyboard.press('Escape');need((await state(page)).save?.data?.keys?.attack==='Mouse0','Escape preserves original attack binding');
 await press(page,'button:出枪');await page.keyboard.press('Tab');need((await state(page)).save?.data?.keys?.attack==='Mouse0','Tab is not stored as a replacement input');
 if(rotate)await orientations(page,'settings','button:关闭');
 await press(page,'button:关闭');await wait(page,()=>!__snow.hud.settingsOpen(),null);
}
try{
 const page=await openPage(browser,url,{width:hardware?1280:640,height:hardware?800:360});pages.push(page);await ready(page,'button:踏雪上路');
 const actualGpu=await page.evaluate(()=>{const q=__snow,g=q.renderer.canvas.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {renderer:g.getParameter(e?.UNMASKED_RENDERER_WEBGL??g.RENDERER),lost:g.isContextLost(),error:q.status.error};});
 need(!actualGpu.lost&&!actualGpu.error&&(!hardware||!/SwiftShader|Software/i.test(actualGpu.renderer)),'actual World3D WebGL2 renderer: '+actualGpu.renderer);
 need(Boolean(await target(page,'button:守草料场')),'native title has both chapter and yard choices');
 need(await page.evaluate(()=>__snow.ui.overlay.canvas instanceof HTMLCanvasElement&&__snow.ui.tester.findAll('button:踏雪上路').length===1),'actual native overlay and named semantic control');
 if(!hardware){await wait(page,()=>!__snow.bootActive,null,90000);const record=process.argv.includes('--record-native')||process.argv.includes('--update');need(record||existsSync(resolve(gameDir,'test/baseline/native-title.png')),'reviewed native title reference exists');const shot=await matchBaseline(page,gameDir,'native-title',{limit:.08,update:record});need(shot.written||shot.passed,'native title screenshot '+(shot.written?'recorded for review':(shot.share*100).toFixed(2)+'% differs'));}
 const initial=await state(page);await page.evaluate(attachChapterObserver);await press(page,'button:踏雪上路');await wait(page,()=>__snow.game.mode==='chapter'&&__snow.game.stage==='road'&&__snow.game.cine>0,null,30000);
 need(await page.evaluate(()=>__snow.game.hero.hp>0&&__snow.game.tier===1&&!__snow.status.error),'trusted native Chapter entry reaches normal first tier opening with living hero');
 await wait(page,()=>__snow.game.cine<3.2&&__snow.game.time>0&&!__snow.status.error,null,30000);need((await state(page)).time>initial.time,'normal game clock advances after native chapter click');
 if(hardware){
  const input=bindKeyboardMouse(page);let settings=false,bag=false,lesson=false;
  try{
   const result=await driveChapter(page,input,{firstLessonKeyboard:true,checkpoint:async name=>{if(name==='lesson'&&!lesson){lesson=true;const frozen=await state(page);await orientations(page,'manual choice',null);need((await state(page)).time===frozen.time,'open manual page pauses actual chapter');}},onState:async(s,input)=>{if(s.stage==='road'&&!s.staged&&s.cine<=0&&s.time>3.5&&!settings){settings=true;await input.clear();await verifySettings(page,{rotate:true});await orientations(page,'actual road','button:设置');}
    if(s.stage==='road'&&!s.staged&&s.cine<=0&&s.time>4.1&&!bag){bag=true;await input.clear();await press(page,'button:行囊');const bagOpen=await page.evaluate(()=>__snow.hud.combat.snapshot().bag.open);need(bagOpen,'native bag opens from real control');await press(page,'button:行囊');need(await page.evaluate(()=>!__snow.hud.combat.snapshot().bag.open),'native bag closes normally');}}});
   need(result.state.stage==='done'&&['stage-yard','yard-second-party','stage-gate','stage-boss','boss-phase-2','win'].every(name=>result.milestones[name]),'legitimate full chapter completed through both Lu Qian stages without state injection');need(result.lessons[0]?.device==='keyboard','Digit selection applies actual first lesson through native dialog');
   await ready(page,'button:重战陆谦');await orientations(page,'results','button:重战陆谦');const prior=await state(page);need(prior.progress?.version===1&&prior.progress.data.open>=2&&Boolean(prior.progress.data.marks[1]),'normal victory persisted current version and opened next tier');
   const rematchAt=await page.evaluate(()=>{window.__snowTestWon=__snow.game;return window.__snowTestEvents.length;});await press(page,'button:重战陆谦');await wait(page,()=>__snow.game!==window.__snowTestWon&&__snow.game.stage==='boss'&&__snow.game.boss.phase===1&&__snow.game.hero.hp>0,null,30000);need(true,'native Rematch starts an actual first-phase encounter');
   await input.clear();await wait(page,start=>window.__snowTestEvents.slice(start).some(e=>e.type==='fall'),rematchAt,90000);await wait(page,start=>window.__snowTestEvents.slice(start).some(e=>e.type==='revive')&&__snow.game.stage==='gate'&&__snow.game.hero.hp>0,rematchAt,30000);need(true,'chapter fall naturally revives at the original mountain gate instead of inventing a defeat rule');
   await page.reload({waitUntil:'domcontentloaded'});await ready(page,'button:踏雪上路');need(JSON.stringify((await state(page)).progress)===JSON.stringify(prior.progress),'naturally earned old-format save survives real reload');
   await press(page,'button:守草料场');await wait(page,()=>__snow.game.mode==='yard',null,30000);await wait(page,()=>__snow.hud.menuSnapshot().result&&__snow.hud.menuSnapshot().resultData,null,120000);need(await page.evaluate(()=>__snow.game.over&&__snow.game.hero.hp<=0),'endless-yard mode genuinely reaches native loss settlement under normal rules');await press(page,'button:回到卷首');await ready(page,'button:踏雪上路');need(true,'native yard loss result returns to title');
  }finally{await input.clear();}
  const touch=await openPage(browser,url,{width:852,height:393,scale:1,touch:true});pages.push(touch);await ready(touch,'button:踏雪上路');await press(touch,'button:踏雪上路','touch');await wait(touch,()=>__snow.game.stage==='road'&&__snow.game.cine<=0&&!__snow.hud.staged,null,60000);
  const ui=await touch.evaluate(nativeTouchGeometry);need(ui.hasStick&&ui.coarse&&Object.values(ui.pads).every(p=>p.shown&&p.width>=43.9&&p.height>=43.9),'native joystick and seven actual ≥44px touch actions');
  const cdp=await touch.context().newCDPSession(touch);const pt=(id,x,y)=>({id,x,y,radiusX:3,radiusY:3,force:1});const a=pt(1,ui.stick.x,ui.stick.y),guard=pt(2,ui.pads.guard.x,ui.pads.guard.y);
  try{const scroll=await touch.evaluate(()=>[scrollX,scrollY,visualViewport.scale]);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+ui.radiusCss*.75}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,x:a.x+ui.radiusCss*.75},guard]});
   await wait(touch,()=>{const h=__snow.hud.combat.snapshot();return h.stick.active&&h.pads.guard.held;},null,10000);
   const outside=pt(1,Math.min(ui.width-2,ui.stickBox.x+ui.stickBox.width+30),Math.max(1,ui.stick.y-20));await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[outside,guard]});await touch.waitForTimeout(180);
   need(await touch.evaluate(()=>{const h=__snow.hud.combat.snapshot();return h.stick.active&&h.pads.guard.held})&&JSON.stringify(scroll)===JSON.stringify(await touch.evaluate(()=>[scrollX,scrollY,visualViewport.scale])),'two independent contacts persist outside joystick area without page scroll');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await wait(touch,()=>{const h=__snow.hud.combat.snapshot();return !h.stick.active&&!h.pads.guard.held;},null,10000);need(true,'cancel releases both native controls');
  }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}).catch(()=>{});await cdp.detach();}
  // The game already has a deliberate stock-body fallback for a rejected
  // optional character asset. Verify it by actually refusing one request.
  let refused=0;const fallback=await openPage(browser,url,{width:1024,height:600,before:async p=>{
    await p.route('**/assets/characters/hero-low.glb',async route=>{if(!refused++)await route.fulfill({status:503,contentType:'text/plain',body:'Deliberate optional-character test failure'});else await route.continue();});
  }});pages.push(fallback);await ready(fallback,'button:踏雪上路');await wait(fallback,()=>['ready','failed'].includes(__snow.status.characters.phase),null,120000);
  need(await fallback.evaluate(()=>{const c=__snow.status.characters;return c.phase==='ready'&&Boolean(c.failures.hero)&&!c.loaded.includes('hero')&&['blade','shield','bow','lu'].every(role=>c.loaded.includes(role))&&!__snow.status.error;}),'a genuine refused optional hero model retains playable title and healthy staged roles');
  const expected=fallback.problems.splice(0);need(refused===1&&expected.length>0&&expected.every(n=>/hero-low\.glb|Character HTTP 503|Failed to load resource.*503/i.test(n)),'only the deliberately refused optional model produced an HTTP error');
  let criticalRefused=0;const bootFailure=await openPage(browser,url,{width:1024,height:600,before:async p=>{
    await p.route(/\/assets\/models-low\.bin(?:\?|$)/,async route=>{if(!criticalRefused++)await route.fulfill({status:503,contentType:'text/plain',body:'Deliberate critical scene pack refusal'});else await route.continue();});
  }});pages.push(bootFailure);
  await wait(bootFailure,()=>{const q=window.__snowLoading;return Boolean(q?.status.error&&q.ui.tester.findAll('button:重试').some(n=>!n.hidden&&!n.inert&&!n.disabled&&n.bounds?.width>0));},null,120000);
  const retry=await bootFailure.evaluate(async()=>{const h=__snowLoading.ui;await h.ready();const n=h.tester.findAll('button:重试').find(n=>!n.hidden&&!n.inert&&!n.disabled);const r=n.bounds,c=h.overlay.canvas.getBoundingClientRect(),f=h.game.frame;return{x:c.x+(r.x+r.width/2)*c.width/f.width,y:c.y+(r.y+r.height/2)*c.height/f.height};});need(Boolean(retry),'actual critical scene pack error presents a named native Retry');
  const intentionalBoot=bootFailure.problems.splice(0);need(intentionalBoot.length>=1&&intentionalBoot.every(n=>/models-low\.bin|Model pack HTTP 503|Failed to load resource.*503/i.test(n)),'only the intentional critical HTTP503 and its direct error were observed');
  await Promise.all([bootFailure.waitForNavigation({waitUntil:'domcontentloaded',timeout:120000}),bootFailure.mouse.click(retry.x,retry.y)]);await ready(bootFailure,'button:踏雪上路');await wait(bootFailure,()=>__snow.status.characters.phase==='ready',null,120000);
  need(criticalRefused>=2&&await bootFailure.evaluate(()=>!__snow.status.error&&__snow.status.characters.loaded.length===5&&Object.keys(__snow.status.characters.failures).length===0),'native boot Retry actually reloads the scene pack and all five healthy roles');
 }
 need(await page.evaluate(()=>!__snow.status.error),'no game error after ordinary UI input');
}catch(error){check(false,'walk stopped: '+String(error.message??error));}
finally{const problems=pages.flatMap(p=>p.problems??[]);await browser.close();await server.close();report('SnowTemple native overlay acceptance ('+(hardware?'real local hardware browser, emulated touch; complete chapter':'SwiftShader software rendering; opening smoke')+')',checks,problems);}
