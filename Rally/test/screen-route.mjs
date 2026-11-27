// `node vendor/egret.mjs verify --screens --play test/screen-route.mjs`
// Check every profile through the same actual one-lap race and native UI path.
import fs from 'node:fs';
import path from 'node:path';
import {ready,press,nodes,awaitMode,steeringInput,testRandom} from './native-actions.mjs';
export default async function(player){
 const page=player.page,rows=[],route=[];let output;
 await page.addInitScript(testRandom);await page.emulateMedia({reducedMotion:'reduce'});
 const url=new URL(page.url());url.searchParams.set('seed','7');url.searchParams.set('quality','low');url.searchParams.set('lang','zh');await page.goto(url.href);await ready(page,'button:开始');
 const observedGpu=await player.read(()=>{const gl=document.querySelector('#stage').getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl?.getParameter(ext?.UNMASKED_RENDERER_WEBGL??gl.RENDERER);});
 if(process.env.RALLY_HARDWARE==='1')player.expect(typeof observedGpu==='string'&&!/SwiftShader|Software/i.test(observedGpu),'explicit local hardware GPU: '+observedGpu);
 const touch=await player.read(()=>matchMedia('(pointer:coarse)').matches),device=touch?'touch':'mouse';
 const checkpoint=async state=>{
   await player.read(async()=>window.__rally.ui.ready?.());const shot=await player.checkpoint(state);
   const observed=await player.read(()=>{const q=window.__rally,h=q.ui,c=h.overlay.canvas,b=c.getBoundingClientRect(),f=h.game.frame,stage=document.querySelector('#stage').getBoundingClientRect(),receipt=globalThis.__egretScreens,map=r=>({x:b.x+r.x*b.width/f.width,y:b.y+r.y*b.height/f.height,width:r.width*b.width/f.width,height:r.height*b.height/f.height});const nodes=h.semantics.snapshot.nodes.filter(n=>!n.inert&&n.bounds?.width>0&&n.bounds?.height>0);return{viewport:[innerWidth,innerHeight,devicePixelRatio],safe:receipt?.screen?.safe??h.game.screen?.safe,controls:receipt?.controls??null,receipts:receipt?.receipts??0,stage:stage.toJSON(),overlay:[c.width,c.height],logical:[f.width,f.height],semanticControls:nodes.filter(n=>['button','radio','switch'].includes(n.role)).map(n=>({name:n.name,id:n.id,disabled:n.disabled,box:map(n.bounds)})),texts:nodes.filter(n=>['text','status','alert','heading'].includes(n.role)).map(n=>({name:n.name,id:n.id,box:map(n.bounds)})),mode:q.mode,race:q.race?.state,clock:q.race?.time};});
   const findings=shot.findings??[],engineWarnings=shot.engineWarnings??[];const row={state,picture:shot.picture,controlReceipt:shot.controlReceipt,errors:findings.filter(f=>f.severity==='error').length,warnings:findings.filter(f=>f.severity==='warning').length,findings,engineWarnings,observedGpu,...observed};rows.push(row);
   const driving=['race','countdown','item'].includes(state);
   player.expect(shot?.controlReceipt?.fresh===true&&Array.isArray(observed.controls)&&observed.controls.length===shot.controls&&observed.receipts>=shot.controlReceipt.after,'fresh native overlay control receipt for '+state);
   player.expect(driving?shot.controls===(touch?6:1):shot.controls>0,'actual control count in '+state);
   player.expect(row.errors===0,'zero native screen errors in '+state);
   if(shot.picture){output=path.join(path.dirname(shot.picture),'native-semantic.json');fs.writeFileSync(output,JSON.stringify({route,rows},null,2)+'\n');}
 };
 await checkpoint('title');
 await press(page,'English',device);await ready(page,'button:Start');await checkpoint('title-en');await press(page,'Start',device);await awaitMode(page,'select');await ready(page,'radio:Tuan the Panda');await checkpoint('select-en');await press(page,'Back',device);await awaitMode(page,'title');await press(page,'中文',device);await ready(page,'button:开始');
 await press(page,'开始',device);await awaitMode(page,'select');await press(page,'熊猫 · 团团',device);await press(page,'策马奔腾',device);await press(page,'1',device);await checkpoint('select');
 player.expect(await player.read(()=>__rally.settings.racer===1&&__rally.settings.laps===1),'one lap and Panda are actually chosen');
 await press(page,'出发！',device);await awaitMode(page,'race',180,'countdown');await checkpoint('countdown');await awaitMode(page,'race',180,'race');
 await page.keyboard.down('w');try{await page.waitForFunction(()=>__rally.race.human.speed>12,null,{timeout:180000,polling:100});}finally{await page.keyboard.up('w');}await checkpoint('race');
 const pickup=await steeringInput(page,{collect:true,timeout:600000,until:s=>Boolean(s.item)&&s.roulette<=0,onProgress:s=>{route.push({time:s.time,position:s.s,lap:s.lap,phase:'item',speed:s.speed,lateral:s.lateral,item:s.item,roulette:s.roulette,boxTarget:s.boxTarget});if(output)fs.writeFileSync(output,JSON.stringify({route,rows},null,2)+'\n');}});player.expect(Boolean(pickup.item)&&!pickup.finished,'real item collected before finish');await checkpoint('item');
 if(touch)await press(page,'暂停','touch');else await page.keyboard.press('Escape');await awaitMode(page,'paused');const before=await player.read(()=>__rally.race.time);await page.waitForTimeout(300);player.expect(await player.read(()=>__rally.race.time)===before,'race clock actually stops on pause');await checkpoint('pause');
 await press(page,'继续',device);await awaitMode(page,'race');
 const finish=await steeringInput(page,{timeout:600000,onProgress:s=>{route.push({time:s.time,position:s.s,lap:s.lap});if(output)fs.writeFileSync(output,JSON.stringify({route,rows},null,2)+'\n');}});player.expect(finish.finished&&finish.lap===1,'actual full one-lap race reaches finish');await awaitMode(page,'results',180);await ready(page,'button:回到标题');await checkpoint('results');
 const actual=await player.read(()=>__rally.race.results().map(x=>({human:x.kart.human,place:x.place,time:x.time})));player.expect(actual.length===8&&actual.some(x=>x.human&&Number.isFinite(x.time)),'all eight real race results and player time');await press(page,'回到标题',device);await awaitMode(page,'title');
 player.expect(rows.length===9,'all nine UI checkpoints on the actual route');
 if(output)fs.writeFileSync(output,JSON.stringify({route,rows,finish,actual},null,2)+'\n');
}
