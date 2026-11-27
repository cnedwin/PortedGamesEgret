// Native scene controls are found by semantic name, never by a DOM control or fixed pixel.
// 通过语义名称查找原生界面；赛车使用实际键盘/触屏输入，规则状态只读。
export async function ready(page,query,seconds=180){
 await page.waitForFunction(()=>window.__rally?.frames>0&&window.__rally?.ui?.tester&&!window.__rally.error,null,{timeout:seconds*1000,polling:120});
 await page.evaluate(async()=>window.__rally.ui.ready?.());
 if(query)await page.waitForFunction(query=>{try{return window.__rally.ui.tester.findAll(query).some(n=>!n.inert&&!n.disabled&&n.bounds?.width>0&&n.bounds?.height>0);}catch{return false;}},query,{timeout:seconds*1000,polling:120});
}
export const nodes=page=>page.evaluate(async()=>{const host=window.__rally.ui;await host.ready?.();return host.semantics.snapshot.nodes;});
export const awaitMode=(page,mode,seconds=180,stage=null)=>page.waitForFunction(({mode,stage})=>window.__rally?.mode===mode&&(!stage||window.__rally.race?.state===stage),{mode,stage},{timeout:seconds*1000,polling:100});
export async function target(page,name){
 return page.evaluate(async name=>{const host=window.__rally.ui;await host.ready?.();let found=[];for(const role of ['button','radio','switch'])try{found.push(...host.tester.findAll(role+':'+name));}catch{}const n=found.find(n=>!n.inert&&!n.disabled&&n.bounds?.width>0);if(!n)return null;const c=host.overlay.canvas,b=c.getBoundingClientRect(),f=host.game.frame,r=n.bounds;return{id:n.id,name:n.name,x:b.left+(r.x+r.width/2)*b.width/f.width,y:b.top+(r.y+r.height/2)*b.height/f.height,width:r.width*b.width/f.width,height:r.height*b.height/f.height};},name);
}
export async function press(page,name,device='mouse',seconds=60){
 const deadline=Date.now()+seconds*1000;let p;do{p=await target(page,name);if(p)break;await page.waitForTimeout(80);}while(Date.now()<deadline);if(!p)throw Error('Native semantic control unavailable: '+name);
 if(device==='touch')await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await page.evaluate(async()=>window.__rally.ui.ready?.());return p;
}
export async function steeringInput(page,options={}){
 const {senseCourse}=await import('./course-input.mjs'),drive=options.drive??true;
 await page.evaluate(source=>{window.__rallyTestSense=(0,eval)('('+source+')');window.__rallyTestPlan={};},senseCourse.toString());
 const held=new Set();async function send(s){const want=new Set();if(s?.turn<0)want.add('a');if(s?.turn>0)want.add('d');if(s?.brake)want.add('s');else if(s?.throttle)want.add('w');for(const k of held)if(!want.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}}
 let state,lastTime=-10;const deadline=Date.now()+(options.timeout??600000);
 try{do{state=await page.evaluate(collect=>window.__rallyTestSense(window.__rally,collect,window.__rallyTestPlan),options.collect??false);if(state.time>=lastTime+5){lastTime=state.time;options.onProgress?.(state);}if(state.finished||options.until?.(state))return state;if(!drive)throw Error('Race not completed');await send(state);await page.waitForTimeout(38);}while(Date.now()<deadline);throw Error('Actual race did not finish: '+JSON.stringify(state));}finally{await send({});}
}

/** Change language from the real Pause menu, resume live English HUD, then
 * pause and restore Chinese while retaining the same race and overlay. */
export async function raceLocaleRoundTrip(page,device='mouse'){
 await awaitMode(page,'paused');const before=await page.evaluate(()=>{const q=__rally;window.__rallyTestLocale=[q.race,q.ui.game];return q.race.time;});
 await press(page,'English',device);await ready(page,'button:Resume');
 const inspect=()=>page.evaluate(()=>{const q=__rally,u=q.ui,h=q.hud.race.snapshot(),labels=u.semantics.snapshot.nodes.filter(n=>!n.inert&&!n.hidden&&n.bounds?.width>0).map(n=>n.name).filter(Boolean);return{locale:h.language,documentLang:document.documentElement.lang,controls:Object.values(h.touchControls).map(c=>c.name),labels,time:q.race.time,sameRace:q.race===window.__rallyTestLocale[0]&&u.game===window.__rallyTestLocale[1],mode:q.mode};});
 const paused=await inspect();await press(page,'Resume',device);await awaitMode(page,'race');await ready(page,'button:Pause');const live=await inspect();
 if(device==='touch')await press(page,'Pause','touch');else await page.keyboard.press('Escape');await awaitMode(page,'paused');await ready(page,'button:Resume');await press(page,'中文',device);await ready(page,'button:继续');const restored=await inspect();
 const english=value=>value.locale==='en'&&value.documentLang==='en'&&value.sameRace&&value.controls.includes('Steer left')&&value.controls.includes('Hop and drift')&&value.labels.every(name=>name==='中文'||!/[\u3400-\u9fff]/u.test(name));
 return{paused,live,restored,passed:english(paused)&&paused.time===before&&paused.labels.includes('Resume')&&english(live)&&live.labels.some(n=>/^Lap /i.test(n))&&live.time>=before&&restored.locale==='zh'&&restored.documentLang==='zh'&&restored.sameRace&&restored.labels.includes('继续')&&restored.time>=before};
}

/** A reproducible random source for presentation/rival ordering, only within a test-owned page. */
export function testRandom(){let s=7;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
