// Native control acceptance route used by the ordinary and multi-screen checks.
import assert from 'node:assert/strict';
export async function wait(page,fn,arg,label,timeout=60000){
  try{await page.waitForFunction(fn,arg,{timeout,polling:100});}
  catch(cause){throw Error(label+' : '+await page.evaluate(()=>window.__wulin?.native?.tester.outline()??document.body.textContent),{cause});}
}
export async function activate(page,action,data={}){
  const q={action,data};
  await wait(page,q=>!!window.__wulin?.native?.ui.focusAction(q.action,q.data),q,'native action '+action);
  // The view reveals the actual focused row, then native keyboard input invokes it.
  await page.waitForTimeout(80);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(160);
}
export async function press(page,name){
  await wait(page,name=>window.__wulin?.native?.tester.exists(name),name,name);
  await page.evaluate(name=>__wulin.native.tester.press(name),name);
  await page.waitForTimeout(120);
}
const state=page=>page.evaluate(()=>{
  const s=__wulin;return {page:s.ui.page,sheet:s.ui.sheet?.kind,people:s.world?Object.values(s.world.persons).filter(p=>p.school===s.world.playerSect).length:0,day:s.world?.day,place:s.ui.place,stage:s.picture.stage?.frames,language:s.ui.language};
});
const on=async(page,name)=>wait(page,name=>__wulin.ui.page===name,name,'page '+name);
const sheet=async(page,kind)=>wait(page,kind=>__wulin.ui.sheet?.kind===kind,kind,'sheet '+kind);
export async function runRoute(player,{extended=true}={}){
  const page=player.page, checkpoint=async(name)=>{await page.waitForTimeout(200);await player.checkpoint(name);};
  await wait(page,()=>window.egretGame?.ready,undefined,'title ready'); await page.evaluate(()=>__wulin.native.game.canvas.focus());
  // The title is an actual drawn view; choose through engine's native semantic focus.
  await checkpoint('title');
  await activate(page,'page',{page:'prologue'});await on(page,'prologue');await checkpoint('prologue');
  await activate(page,'skip-prologue');await on(page,'sects');await checkpoint('sects');
  await activate(page,'sect-next');await on(page,'legacy');await checkpoint('legacy');
  await activate(page,'new');await press(page,'button:确认');await on(page,'seat');await sheet(page,'guide');
  await wait(page,()=>__wulin.picture.stage===null&&__wulin.picture.tried||__wulin.picture.stage?.frames>3,undefined,'initial seat',120000);
  await checkpoint('guide');
  await activate(page,'guide-go',{tab:'recruit'});await wait(page,()=>__wulin.ui.seatTab==='recruit',undefined,'recruit tab');
  const before=await state(page);await activate(page,'sheet',{kind:'applicant',index:0});await sheet(page,'applicant');await checkpoint('applicant');
  await activate(page,'recruit',{index:0});await wait(page,before=>Object.values(__wulin.world.persons).filter(p=>p.school===__wulin.world.playerSect).length>before,before.people,'the new disciple joins');
  await checkpoint('seat');
  if(!extended)return;
  await activate(page,'seat-tab',{tab:'build'});await activate(page,'sheet',{kind:'build'});await sheet(page,'build');await checkpoint('build');
  await activate(page,'close');await activate(page,'page',{page:'disciples'});await on(page,'disciples');await checkpoint('disciples');
  await activate(page,'person');await sheet(page,'person');await checkpoint('person');
  await activate(page,'sheet',{kind:'job'});await sheet(page,'job');await checkpoint('job');
  await activate(page,'close');await activate(page,'close');
  await activate(page,'sheet',{kind:'settings'});await sheet(page,'settings');await checkpoint('settings');
  await activate(page,'open-all');await activate(page,'close');
  await activate(page,'page',{page:'world'});await on(page,'world');await checkpoint('world');
  await activate(page,'page',{page:'battle'});await on(page,'battle');await checkpoint('battle-orders');
  await activate(page,'page',{page:'chronicle'});await on(page,'chronicle');await checkpoint('chronicle');
  await activate(page,'page',{page:'saves'});await on(page,'saves');
  await activate(page,'save',{slot:'1'});await wait(page,()=>!!localStorage.getItem('wulin-slot-1'),undefined,'slot persisted');await checkpoint('saves');
  await activate(page,'quit');await press(page,'button:确认');await on(page,'title');
  await activate(page,'sheet',{kind:'load'});await sheet(page,'load');await activate(page,'load',{slot:'1'});await on(page,'seat');
  assert.equal((await state(page)).people,before.people+1);
  await activate(page,'sheet',{kind:'settings'});await checkpoint('continued-settings');
  await activate(page,'close');
}
export default runRoute;
