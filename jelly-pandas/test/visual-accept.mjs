// Focused visual regressions after the art pass: native preview, cross-run effects, and portrait Boss HUD.
// Uses real browser input and seeded rule updates; no direct writes to HP, kills, elapsed time or enemy modes.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, openPage, report, serve } from '../../tools/lib/browser.mjs';
import { ready, control, point, press, tap, state, wait, waitFrames, advance, assertBossPartySeparation, checkpoint } from './screen-route.mjs';
const gameDir=resolve(dirname(fileURLToPath(import.meta.url)),'..'),prefix=relative(ROOT,gameDir).split('\\').join('/'),
  out=resolve(process.env.JELLY_VISUAL_REPORT??join(tmpdir(),'jelly-visual-'+Date.now())),server=await serve(),browser=await launch(),pages=[],checks=[],observations={};
await mkdir(out,{recursive:true});
const check=(ok,msg)=>{checks.push([Boolean(ok),msg]);if(!ok)throw new Error(msg);};
const driver=page=>({page,read:(fn,arg)=>page.evaluate(fn,arg),expect:check,picture:label=>page.screenshot({path:resolve(out,label+'.png'),timeout:90000})});
async function open(width,height,{touch=false,scale=1}={}){
  const page=await openPage(browser,server.url+prefix+'/?seed=7&lang=en',{width,height,touch,scale});
  pages.push(page);const p=driver(page);await ready(p);return p;
}
async function setup(p){
  await tap(p,'Settings');await press(p,{id:'menu-settings-sound'});
  await press(p,{id:'menu-settings-quality'});await press(p,'Close');
  await tap(p,{id:'menu-title-skin-mint'});await waitFrames(p,8);
}
// Inspect actual current scene nodes, never a fake flag set by the test.
async function sceneState(p){
  return p.read(async()=>{
    const s=window.__jellyPandas,scene=s.camera.parent,g=s.game,{groundHeight}=await import(new URL('./src/island.mjs',location.href).href),
      panda=g.pandas[0];
    const trails=scene.children.filter(n=>typeof n.pointCount==='number'&&typeof n.clear==='function').map(n=>({id:n.id,points:n.pointCount,visible:n.visible}));
    const props=g.props.map(prop=>({kind:prop.kind,visible:prop.body.node.visible}));
    // Panda rig root has pose -> pivot -> head/limbs. It is the only such scene tree at this panda's X/Z.
    const rigs=scene.children.filter(n=>n.children.length===1&&n.children[0].children.length===1&&n.children[0].children[0].children.length>=6&&
      Math.abs(n.position[0]-panda.x)<.01&&Math.abs(n.position[2]-panda.z)<.01)
      .map(n=>({id:n.id,x:n.position[0],y:n.position[1],z:n.position[2],visible:n.visible}));
    return {mode:s.mode,frames:s.frames,t:g.t,panda:[panda.x,panda.y,panda.z],ground:groundHeight(panda.x,panda.z),rigs,trails,props,
      warnings:scene.children.filter(n=>n.name==='Candy wind-up rings'||n.name==='Candy wind-up direction').map(n=>({name:n.name,count:n.count}))};
  });
}
async function preview(p,label){
  await waitFrames(p,5);
  const a=await sceneState(p);
  check(a.mode==='title'&&a.props.length>0&&a.props.every(x=>!x.visible),label+' title hides only the round prop visuals');
  check(a.rigs.length===1&&a.rigs[0].visible&&Math.abs(a.rigs[0].y-a.ground)<.01,label+' real panda rig is grounded on sampled terrain');
  check(a.trails.every(x=>x.points===0&&!x.visible),label+' preview contains no stale trail');
  check(a.warnings.every(x=>x.count===0),label+' preview contains no stale combat warning');
  observations[label]=a;
  await p.picture(label);
}
async function rollTrail(p,label){
  const page=p.page;
  await page.keyboard.down('KeyW');await page.keyboard.down('KeyE');
  try{
    await wait(p,()=>window.__jellyPandas.camera.parent.children.some(n=>typeof n.pointCount==='number'&&n.pointCount>1&&n.visible),
      undefined,label+' actual moving roll creates a live trail',90000);
    const before=await sceneState(p);check(before.trails.some(t=>t.points>1&&t.visible),label+' live native trail exists before leaving the round');
    observations[label]=before;await p.picture(label);
    // Pause while the active effect is still present, so natural time-based decay cannot mask a lifecycle leak.
    await page.keyboard.press('KeyP');await wait(p,()=>window.__jellyPandas.mode==='paused',undefined,'pause with live effect');
    const frozen=await sceneState(p);check(frozen.trails.some(t=>t.points>1&&t.visible),label+' pause retains a real live trail for the reset check');
  }finally{await page.keyboard.up('KeyE');await page.keyboard.up('KeyW');}
}
async function landscapeLifecycle(){
  const p=await open(844,390);await setup(p);await preview(p,'landscape-title');
  await tap(p,'Play');await wait(p,()=>window.__jellyPandas.mode==='play',undefined,'real Play starts');
  check((await sceneState(p)).props.every(x=>x.visible),'normal round restores all physical prop visuals');
  await rollTrail(p,'live-roll-before-restart');
  await tap(p,'Restart');await wait(p,()=>window.__jellyPandas.mode==='play',undefined,'actual Restart');
  await waitFrames(p,2);const restarted=await sceneState(p);
  check(restarted.props.length>0&&restarted.props.every(p=>p.visible),'Restart preserves active physical prop visuals');
  check(restarted.trails.every(t=>t.points===0&&!t.visible),'Restart clears outgoing round trail pool');
  observations.restarted=restarted;await p.picture('landscape-restarted');
  await rollTrail(p,'live-roll-before-title');
  await tap(p,'Title');await wait(p,()=>window.__jellyPandas.mode==='title',undefined,'actual Title return');
  await preview(p,'landscape-returned-title');await p.page.context().close();
}
async function portrait(){
  const p=await open(375,667,{touch:true,scale:2});await preview(p,'phone-title');
  await setup(p);await preview(p,'phone-selected-title');await checkpoint(p,'phone-selected-geometry');await p.page.context().close();
}
async function bossProfile(width,height){
  const p=await open(width,height,{touch:true,scale:2});await setup(p);
  const boss=await advance(p,300.1,{bot:true,stopBoss:true,fresh:'Play'});
  check(boss.start.t===0&&boss.end.boss==='pudding','actual first Boss in '+width+'×'+height);
  await waitFrames(p,5);const rects=await assertBossPartySeparation(p),tag='boss-'+width+'x'+height;
  observations[tag]={fixture:boss,geometry:rects};await checkpoint(p,tag);
  // Follow the actual boss leap until the rule-derived cue activates. The native warning mesh must be populated.
  const leap=await p.read(async()=>{
    const {describeHazardCue}=await import(new URL('./src/view.mjs',location.href).href),g=window.__jellyPandas.game,panda=g.pandas[0],original=panda.human,
      input={moveX:0,moveZ:0,jump:false,slam:false,roll:false};panda.human=false;let steps=0;
    try{
      while(g.state==='play'&&g.boss&&g.t<330&& !describeHazardCue(g.boss)){g.update(1/60,input);g.events.length=0;steps++;}
      return {t:g.t,steps,state:g.state,boss:g.boss?.def.key,cue:g.boss?describeHazardCue(g.boss):undefined};
    }finally{panda.human=original;}
  });
  check(leap.boss==='pudding'&&leap.cue?.kind==='hop',tag+' real rule-driven Boss leap cue');
  await wait(p,()=>window.__jellyPandas.camera.parent.children.some(n=>n.name==='Candy wind-up rings'&&n.count>=16),undefined,'native instanced warning ring mesh');
  const warning=await sceneState(p);check(warning.warnings.some(n=>n.name==='Candy wind-up rings'&&n.count>=16),tag+' native warning ring is drawn');
  observations['warning-'+width+'x'+height]={leap,warning};await p.picture('warning-'+width+'x'+height);
  await p.page.context().close();
}
try{
  await landscapeLifecycle();await portrait();await bossProfile(768,1024);await bossProfile(884,1104);
}catch(error){checks.push([false,error.stack??String(error)]);}
finally{
  const problems=pages.flatMap(p=>p.problems??[]);await writeFile(resolve(out,'report.json'),JSON.stringify({checks,problems,observations},null,2)+'\n');
  console.log('Visual evidence: '+out);report('Jelly Pandas · visual lifecycle and portrait Boss regression',checks,problems);
  await browser.close();await server.close();
}
