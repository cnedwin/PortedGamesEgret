import {nativeReady,pressNative,nativeGeometry} from './browser-ui.mjs';
export default async function(player){
 const p=player.page,url=new URL(p.url());url.searchParams.set('quality','low');url.searchParams.set('seed','7');url.searchParams.set('lang','zh');await p.goto(url.href,{waitUntil:'domcontentloaded'});
 await nativeReady(p,'button:部署',120000);const touch=await p.evaluate(()=>matchMedia('(pointer:coarse)').matches);
 const press=q=>pressNative(p,q,touch),wait=fn=>p.waitForFunction(fn,null,{timeout:120000});
 const shot=async name=>{
  const report=await player.checkpoint(name),receipt=report.controlReceipt;
  player.expect((report.findings??[]).length===0,'No native screen errors or warnings in '+name+': '+JSON.stringify(report.findings??[]));
  player.expect((report.engineWarnings??[]).length===0,'No engine warnings in '+name+': '+JSON.stringify(report.engineWarnings??[]));
  player.expect(receipt?.fresh===true&&receipt.after>receipt.before,'A fresh native control receipt in '+name);
  // Active desktop play may have no on-screen controls. Every menu and the
  // active touch HUD must actually report its native controls.
  const minimum=name==='play'?(touch?11:0):1;
  player.expect(Number.isInteger(report.controls)&&report.controls>=minimum,'Native control count in '+name+' (expected >= '+minimum+', actual '+report.controls+')');
  return report;
 };
 await shot('title');await press('button:设置');await wait(()=>__cutoff.ui.menus.snapshot().panel==='settings');await shot('settings-display');
 await press('tab:输入');await wait(()=>__cutoff.ui.menus.snapshot().settingsPage==='input');await shot('settings-input');
 await press('tab:通用');await wait(()=>__cutoff.ui.menus.snapshot().settingsPage==='general');await shot('settings-general');
 await press('tab:操作说明');await wait(()=>__cutoff.ui.menus.snapshot().panel==='controls');await shot('controls');await press('button:关闭');await wait(()=>!__cutoff.ui.menus.snapshot().panel);
 await press('button:部署');await wait(()=>__cutoff.mode==='play'||(__cutoff.mode==='pause'&&__cutoff.ui.menus.snapshot().mouseStatus==='failed'));
 if(await p.evaluate(()=>__cutoff.mode==='pause'))await press('button:使用拖动瞄准');await wait(()=>__cutoff.mode==='play');await p.waitForTimeout(350);const playReport=await shot('play');
 // Cross-check the engine's actual control receipt with the independently
 // projected semantic bounds. Receipt IDs describe the native display tree,
 // not semantic IDs; match localized names and geometry instead.
 if(touch){
  const geometry=await p.evaluate(nativeGeometry),nodes=geometry.nodes,targets=nodes.filter(n=>['button','switch'].includes(n.role)&&!n.disabled);
  const native=await p.evaluate(()=>{const report=globalThis.__egretScreens;return{receipts:report?.receipts??0,controls:report?.controls??[]};});
  const inside=(a,b)=>a.x>=b.x-.5&&a.y>=b.y-.5&&a.x+a.width<=b.x+b.width+.5&&a.y+a.height<=b.y+b.height+.5;
  const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5;
  const same=(a,b)=>['x','y','width','height'].every(k=>Number.isFinite(a[k])&&Number.isFinite(b[k])&&Math.abs(a[k]-b[k])<=1);
  player.expect(targets.length===11&&targets.every(n=>n.id.startsWith('fps-touch-')),'All eleven directly attached native action/switch targets are represented in the semantic tree');
  player.expect(native.receipts>=playReport.controlReceipt.after&&Array.isArray(native.controls)&&native.controls.length>=11,'The native receipt includes at least eleven visible controls during touch play');
  const reported=targets.map(target=>native.controls.filter(c=>c.name===target.name&&same(c,target.box)));
  player.expect(reported.every(matches=>matches.length===1),'Each of the eleven touch action controls has a unique native name and matching CSS bounds: '+JSON.stringify(targets.map((n,i)=>[n.name,reported[i].length])));
  const matched=reported.flat();
  player.expect(matched.every(c=>typeof c.id==='string'&&c.id.length>0&&Array.isArray(c.ancestors))&&new Set(matched.map(c=>c.id)).size===11,'The native receipt identifies eleven distinct display-tree targets');
  player.expect(matched.every(c=>c.width>=43.9&&c.height>=43.9&&inside(c,geometry.safe)),'The native-reported visible hit targets are also within the safe area and >=44 CSS px');
  // blockedBy describes a real native pick obstruction. coveredBy is an
  // explicit painted-face advisory, not a composited-pixel opacity test.
  player.expect(matched.every(c=>!c.blockedBy&&!(c.coveredBy??[]).length),'No native input obstruction or declared painted-face overlap on the direct touch controls');
  player.expect(targets.every(n=>n.box.width>=43.9&&n.box.height>=43.9&&inside(n.box,geometry.safe)),'Touch targets are within the safe area and >=44 CSS px');
  player.expect(targets.every((n,i)=>targets.slice(i+1).every(other=>!overlaps(n.box,other.box))),'Touch targets do not overlap each other');
  for(const card of nodes.filter(n=>n.role==='group'&&['状态','装备','任务目标','无线电讯息'].includes(n.name))){
    player.expect(inside(card.box,geometry.safe),card.name+' card fits the safe area');
    player.expect(targets.every(n=>!overlaps(card.box,n.box)),card.name+' does not cover action controls');
  }
 }
 if(touch)await press('button:背包');else await p.keyboard.press('Tab');await wait(()=>__cutoff.ui.menus.snapshot().bagOpen);await shot('bag-weapons');
 await press('tab:配件');await wait(()=>__cutoff.ui.menus.snapshot().bagTab==='attachments');await shot('bag-attachments');
 await press('tab:补给');await wait(()=>__cutoff.ui.menus.snapshot().bagTab==='supplies');await shot('bag-supplies');
 await press('button:关闭');await wait(()=>!__cutoff.ui.menus.snapshot().bagOpen);
 await wait(()=>__cutoff.mode==='play'||(__cutoff.mode==='pause'&&__cutoff.ui.menus.snapshot().mouseStatus==='failed'));
 if(!touch&&await p.evaluate(()=>__cutoff.mode==='pause'))await press('button:使用拖动瞄准');await wait(()=>__cutoff.mode==='play');
 if(touch)await press('button:暂停');else if(await p.evaluate(()=>__cutoff.ui.game.pointer.locked))await p.evaluate(()=>__cutoff.ui.game.pointer.unlock());else await p.keyboard.press('Escape');await wait(()=>__cutoff.mode==='pause');await shot('pause');
 player.expect(!await p.evaluate(()=>__cutoff.error),'No runtime error after native route');
}
