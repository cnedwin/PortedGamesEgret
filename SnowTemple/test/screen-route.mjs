// The 8 device-profile checker follows normal browser input through the chapter.
// All positions, inventory, health, timers and progression come from the live game.
import fs from 'node:fs';
import path from 'node:path';
import {ready,press,wait,semanticReceipt,attachChapterObserver,bindKeyboardMouse,driveChapter} from './browser-ui.mjs';
export default async function(player){
 const page=player.page,rows=[],route=[],short=process.env.SNOW_SCREEN_SHORT==='1';let output,input,bag=false,pause=false;
 const url=new URL(page.url());url.searchParams.set('seed','7');url.searchParams.set('quality','low');url.searchParams.set('models','low');await page.goto(url.href);
 await ready(page,'button:踏雪上路');await wait(page,()=>!__snow.bootActive,null,90000);
 const renderer=await page.evaluate(()=>{const g=__snow.renderer.canvas.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e?.UNMASKED_RENDERER_WEBGL??g.RENDERER)});
 if(process.env.SNOW_HARDWARE==='1')player.expect(typeof renderer==='string'&&!/SwiftShader|Software/i.test(renderer),'actual hardware browser renderer: '+renderer);
 const touch=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),device=touch?'touch':'mouse';
 const checkpoint=async state=>{
  await page.evaluate(()=>__snow.ui.ready?.());const shot=await player.checkpoint(state);const semantic=await page.evaluate(semanticReceipt);
  const findings=shot.findings??[],row={state,picture:shot.picture,errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length,findings,engineWarnings:shot.engineWarnings??[],receipt:shot.controlReceipt,...semantic};rows.push(row);
  player.expect(shot.controlReceipt?.fresh===true,'fresh overlay semantic receipt in '+state);player.expect(row.errors===0,'zero device layout errors in '+state);
  if(shot.picture){output=path.join(path.dirname(shot.picture),'native-semantic.json');fs.writeFileSync(output,JSON.stringify({renderer,route,rows},null,2)+'\n');}
 };
 try{
  await checkpoint('title');await press(page,'button:设置',device);await wait(page,()=>__snow.hud.settingsOpen(),null);await checkpoint('settings');
  await press(page,'button:关闭',device);await wait(page,()=>!__snow.hud.settingsOpen(),null);await page.evaluate(attachChapterObserver);await press(page,'button:踏雪上路',device);await wait(page,()=>__snow.game.stage==='road'&&__snow.game.cine>0,null,20000);await page.waitForTimeout(600);await checkpoint('opening');
  await wait(page,()=>__snow.game.stage==='road'&&!__snow.hud.staged&&__snow.game.cine<=0,null,30000);
  // The letterbox dismissal is animated; do not capture its transient veil
  // as the representative, interactive road HUD.
  await page.waitForTimeout(850);
  if(short){
    await checkpoint('road');await press(page,'button:行囊',device);await checkpoint('bag');await press(page,'button:行囊',device);
    player.expect(['title','settings','opening','road','bag'].every(s=>rows.some(r=>r.state===s)),'all five short native UI states captured');
    if(output)fs.writeFileSync(output,JSON.stringify({renderer,short,route,rows},null,2)+'\n');
    return;
  }
  input=bindKeyboardMouse(page);
  // Screen-profile routing uses legitimate keyboard/mouse input for consistent
  // reproducibility across sizes. The Fold7 physical route separately uses touch.
  const result=await driveChapter(page,input,{checkpoint:async name=>checkpoint(name),onStage:async(stage,state)=>{
    if(['road','yard','gate','boss-1','boss-2'].includes(stage)){route.push({stage,time:state.time});await checkpoint(stage);}
  },onState:async(state,input)=>{
    if(state.stage!=='road'||state.cine>0||state.staged)return;
    if(state.time>3.6&&!bag){bag=true;await input.clear();await press(page,'button:行囊',device);await checkpoint('bag');await press(page,'button:行囊',device);}
    if(state.time>4.1&&!pause){pause=true;await input.clear();await press(page,'button:设置',device);await wait(page,()=>__snow.hud.settingsOpen(),null);const before=await page.evaluate(()=>__snow.game.time);await page.waitForTimeout(300);player.expect(await page.evaluate(()=>__snow.game.time)===before,'settings really pauses the game');await checkpoint('paused');await press(page,'button:关闭',device);}
  }});
  player.expect(result.state.stage==='done'&&['stage-yard','yard-second-party','stage-gate','stage-boss','boss-phase-2','win'].every(name=>result.milestones[name]),'complete actual chapter through two Lu Qian stages');
  await ready(page,'button:重战陆谦');await checkpoint('results');
  const expected=['title','settings','opening','road','bag','paused','yard','lesson','gate','boss-1','boss-2','results'];player.expect(expected.every(s=>rows.some(r=>r.state===s)),'each named native UI state is captured');
  if(output)fs.writeFileSync(output,JSON.stringify({renderer,route,rows,result},null,2)+'\n');
 }finally{await input?.clear();}
}
