// Run with the vendored engine's verify --screens --play. Each checkpoint is a real rendered game state.
// World3DOverlay does not currently publish BrowserPlay control probes; the actual native semantic tree is
// inspected independently and recorded beside each profile's official checkpoint screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { ready, nodes, press, state, cursor, awaitMode, chooseMove, reachAttack } from './ui-actions.mjs';

function findings(controls,safe,touch) {
  const found=[],right=r=>r.x+r.width,bottom=r=>r.y+r.height;
  const inside=(a,b,slack=1)=>a.x>=b.x-slack&&a.y>=b.y-slack&&right(a)<=right(b)+slack&&bottom(a)<=bottom(b)+slack;
  for(const control of controls){
    const b=control.box;
    if(!inside(b,safe))found.push({check:'inSafeArea',severity:'error',control:control.name,rect:b});
    if(touch&&(b.width<43.5||b.height<43.5))found.push({check:'touchTarget',severity:'warning',control:control.name,size:[b.width,b.height]});
  }
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
    const a=controls[i].box,b=controls[j].box;
    const overlap=Math.max(0,Math.min(right(a),right(b))-Math.max(a.x,b.x))*Math.max(0,Math.min(bottom(a),bottom(b))-Math.max(a.y,b.y));
    if(overlap>1&&!inside(a,b,.5)&&!inside(b,a,.5))
      found.push({check:'apart',severity:'warning',controls:[controls[i].name,controls[j].name]});
  }
  return found;
}

export async function geometry(player,label,shot){
  const observed=await player.read(async()=>{
    const host=window.egretGame.ui;await host.ready();
    const rect=host.overlay.canvas.getBoundingClientRect(),frame=host.game.frame,safe=host.game.screen.safe;
    const map=b=>({x:rect.x+b.x*rect.width/frame.width,y:rect.y+b.y*rect.height/frame.height,width:b.width*rect.width/frame.width,height:b.height*rect.height/frame.height});
    // Semantics are real engine nodes, not copied data written by the test or a layout generated separately.
    const all=host.semantics.snapshot.nodes.filter(n=>!n.inert&&n.bounds?.width>0&&n.bounds?.height>0);
    const controls=all.filter(n=>!n.disabled&&n.actions?.includes('activate')).map(n=>({id:n.id,name:n.name,role:n.role,box:map(n.bounds),focused:n.focused}));
    const texts=all.filter(n=>['text','status','alert','heading'].includes(n.role)).map(n=>({id:n.id,name:n.name,role:n.role,box:map(n.bounds)}));
    const actualInsets=globalThis.__egretAgent?.insets??{top:0,right:0,bottom:0,left:0};
    return {width:innerWidth,height:innerHeight,dpr:devicePixelRatio,touch:matchMedia('(pointer:coarse)').matches,
      viewport:[innerWidth,innerHeight],engineSafe:map(safe),insets:actualInsets,
      safe:{x:actualInsets.left,y:actualInsets.top,width:innerWidth-actualInsets.left-actualInsets.right,height:innerHeight-actualInsets.top-actualInsets.bottom},
      controls,texts,logical:[frame.width,frame.height],backing:[host.overlay.canvas.width,host.overlay.canvas.height],mode:window.egretGame.battle?.mode};
  });
  const hits=findings(observed.controls,observed.safe,observed.touch);
  const result={state:label,picture:shot?.picture??null,engineControls:shot?.controls??null,
    errors:hits.filter(f=>f.severity==='error').length,warnings:hits.filter(f=>f.severity==='warning').length,
    findings:hits,...observed};
  console.log('native-semantic',label,observed.width+'x'+observed.height,observed.controls.length+' controls',result.errors+'/'+result.warnings);
  return result;
}

export default async function(player){
  const page=player.page;
  // The tool's screen profiles own the viewport; set only the game seed and quality for a reproducible route.
  await page.emulateMedia({reducedMotion:'reduce'});
  const url=new URL(page.url());
  url.searchParams.set('seed','3');url.searchParams.set('lang','zh');url.searchParams.set('quality','low');url.searchParams.set('map','wheat');
  await page.goto(url.href);
  await ready(page,'dialog:星旗战记');
  const touch=await player.read(()=>matchMedia('(pointer:coarse)').matches),device=touch?'touch':'mouse',rows=[],route=[];
  let output;
  const snapshot=async label=>{
    await page.evaluate(async()=>window.egretGame.ui.ready());
    const shot=await player.checkpoint(label);
    const row=await geometry(player,label,shot);
    rows.push(row);
    if(shot?.picture)output=path.join(path.dirname(shot.picture),'native-semantic.json');
    if(output)fs.writeFileSync(output,JSON.stringify({route,rows},null,2)+'\n');
  };
  await snapshot('title');
  await press(page,'button:设置',device);await ready(page,'dialog:设置');await snapshot('settings');
  await press(page,'button:好',device);await ready(page,'dialog:星旗战记');
  await press(page,'button:遭遇战',device);await ready(page,'dialog:遭遇战');
  await press(page,'button:对手',device);await ready(page,'radio:维蕾塔');await press(page,'radio:维蕾塔',device);
  player.expect((await state(page,'radio:维蕾塔')).checked===true,'selected Vireta as opponent');
  await press(page,'button:战场',device);await ready(page,'radio:麦浪渡口');await snapshot('setup');
  await press(page,'button:出阵',device);await awaitMode(page,'idle',240);
  await page.waitForFunction(()=>window.egretGame.screen==='battle',null,{timeout:240000});
  await snapshot('opening');
  const sw=await player.read(()=>window.egretGame.battle.game.units.find(u=>u.owner===0&&u.type==='swordsman'));
  await cursor(page,sw);await page.keyboard.press('Enter');await awaitMode(page,'move');await snapshot('selected');
  const t0=Date.now();
  await player.read(()=>{
    const p=window.__starPerf={frames:[],started:performance.now(),stop:false};let last=performance.now();
    const tick=now=>{p.frames.push(now-last);last=now;if(!p.stop&&p.frames.length<120)requestAnimationFrame(tick)};requestAnimationFrame(tick);
  });
  await cursor(page,{x:sw.x,y:sw.y-2});await page.keyboard.press('Enter');await awaitMode(page,'act');await ready(page,'button:待命');
  await page.waitForTimeout(1500);
  const perf=await player.read(()=>{const p=window.__starPerf;p.stop=true;return{frames:p.frames,elapsed:performance.now()-p.started}});
  const v=[...perf.frames].sort((a,b)=>a-b);
  route.push({label:'first move to action menu: swordsman two tiles up',actionElapsedMs:Date.now()-t0,samples:v.length,
    p95Ms:v[Math.ceil(v.length*.95)-1]??null,maxMs:v.at(-1)??null,over50:v.filter(x=>x>50).length,frames:perf.frames});
  await snapshot('action');
  await press(page,'button:待命',device);await awaitMode(page,'idle');
  const moved=await player.read(id=>window.egretGame.battle.game.units.find(u=>u.id===id),sw.id);
  player.expect(moved.y===sw.y-2&&moved.done,'the legal two-tile move and Wait committed');
  await player.read(()=>{window.egretGame.app.settings.speed=12;window.egretGame.app.reducedMotion=true;});
  const attack=await reachAttack(page,{prioritizeCapture:false,maxMoves:4,onTurn:turn=>route.push({turn})});
  player.expect(Boolean(attack),'ordinary moves and computer turns reach an actual attack');
  await chooseMove(page,attack.unit,attack.to);await press(page,'button:攻击',device);await awaitMode(page,'target');
  await page.waitForFunction(()=>window.egretGame.ui.semantics.snapshot.nodes.some(n=>n.id==='hud-label-forecast-deal'),null,{timeout:30000});
  await snapshot('forecast');
  for(let i=0;i<4;i++){
    if(await player.read(()=>window.egretGame.battle.mode==='idle'))break;
    await page.keyboard.press('Escape');await page.waitForTimeout(350);
  }
  await awaitMode(page,'idle');
  await page.keyboard.press('KeyM');await ready(page,'button:认输');await press(page,'button:认输',device);
  await ready(page,'button:确定');await press(page,'button:确定',device);await ready(page,'button:再战一局',180);
  await snapshot('result');
  player.expect((await nodes(page)).some(n=>n.name==='再战一局'&&!n.disabled),'result offers a real rematch');
  if(output)fs.writeFileSync(output,JSON.stringify({route,rows},null,2)+'\n');
  player.expect(rows.length===8,'all eight UI states were reached');
  player.expect(rows.every(row=>row.errors===0),'no actionable semantic control is outside the simulated safe region');
}
