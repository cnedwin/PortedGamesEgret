// Menu state and native actions are checked without a browser or a simulated fight.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {setLanguage,t} from '../src/i18n.mjs';
const {createScreens}=await import('../src/screens.mjs');
const {checkView,planView}=await import('../vendor/engine/dist/web/view.js');

function harness(width=852,height=393){
  let mounted=null,onScreenChange=null,keys=new Set();
  const game={
    screen:{width,height},safe:{x:0,y:0,width,height},uiScale:1,
    canvas:{clientWidth:width,clientHeight:height,width,height,focus(){}},
    keys:{pressed:(...values)=>values.some(x=>keys.has(x))},
    onScreenChange(fn){onScreenChange=fn;return ()=>{};},
    show(desc,opts){
      const names=checkView(desc);for(const id of Object.keys(opts.bind))assert.ok(names.has(id),'binding belongs to the current native view: '+id);
      const screen={x:0,y:0,...game.screen};
      const plan=planView(desc,{screen,safe:screen,orientation:screen.width<screen.height?'portrait':'landscape'});
      for(const {part,rect} of plan.parts)if(part.type==='button'||part.type==='toggle'){assert.ok(rect.width>=44,part.name+' width '+rect.width);assert.ok(rect.height>=44,part.name+' height '+rect.height);}
      const result={desc,opts,focused:undefined,visible:true,closed:false,
        close(){this.closed=true;if(mounted===this)mounted=null;},
        hide(){this.visible=false;},show(){this.visible=true;},
        activate(){},deactivate(){},cover(){this.hide();},reveal(){this.show();},
        focus(id){this.focused=id;return true;},
        refresh(){},scroll(){return {offset:0,scrollTo(){}};},
      }; mounted=result;return result;
    },
    invalidate(){},scope:{use(x){return x;}},
  };
  const screens=createScreens(game,{coarse:false,onLanguage(){},paragraphCache:null});
  return {screens,game,get mounted(){return mounted;},async ready(){for(let i=0;i<15;i++)await Promise.resolve();assert.ok(mounted);return mounted;},
    async press(id){const v=await this.ready();assert.ok(v.opts.bind[id]?.tap,id);v.opts.bind[id].tap(v.opts.state);return await this.ready();},
    async key(key){keys.add(key);screens.update();keys.clear();return await this.ready();},
    async resize(w,h){Object.assign(game.screen,{width:w,height:h});Object.assign(game.safe,{width:w,height:h});onScreenChange?.();return await this.ready();}};
}
const nodes=(v)=>{const result=[];function walk(x){result.push(x);x.children?.forEach(walk)}walk(v.desc.root);return result;};

test('native menu preserves all title routes and responsive choice state',async()=>{
  setLanguage('zh');
  const h=harness(); const routes=[];
  h.screens.title({onRoad:()=>routes.push('road'),onExpedition:()=>routes.push('expedition'),onFree:()=>routes.push('free'),
    onSeries:()=>routes.push('series'),onSettings:()=>routes.push('settings'),best:'record',note:'notice'});
  let v=await h.ready();
  assert.equal(h.screens.current,'title');assert.ok(v.desc.root);
  for(const id of ['road','expedition','free','series','settings'])await h.press(id);
  assert.deepEqual(routes,['road','expedition','free','series','settings']);
  const looked=[],picked=[],difficulty=[];
  h.screens.choose({selected:'yulin',veteran:false,onLook:r=>looked.push(r),onDifficulty:x=>difficulty.push(x),onPick:r=>picked.push(r),onBack(){}});
  await h.ready();await h.key('right');await h.press('difficulty-veteran');await h.resize(393,852);
  assert.equal(h.screens.snapshot().selected,'tiger');assert.equal(h.screens.snapshot().veteran,true);
  await h.press('pick');assert.deepEqual(difficulty,[true]);assert.deepEqual(picked,['tiger']);assert.equal(looked.at(-1),'tiger');
  assert.ok(nodes(await h.ready()).filter(n=>n.type==='button').every(n=>n.height>=44));
});

test('native loadout retains the minimum skill/default and ordered talent selections',async()=>{
  const h=harness(393,852);let chosen;
  h.screens.loadout({regiment:'tiger',onDone:p=>{chosen=p;},onBack(){}});
  await h.ready();
  assert.equal(h.screens.snapshot().skills.length,2);assert.equal(h.screens.snapshot().talents.length,2);
  await h.press('talent-solo');assert.equal(h.screens.snapshot().talents.length,1);
  await h.press('talent-solo');assert.equal(h.screens.snapshot().talents.length,2);
  await h.press('skill-mist');assert.equal(h.screens.snapshot().skills.length,2);
  await h.press('done');assert.deepEqual(chosen.skills,['swing','mist']);
});

test('native free/series selection keeps one or two foes, excludes self and keeps the chosen arena',async()=>{
  const h=harness();let picked;
  const state={me:'yulin',foes:['tiger'],place:'county'};
  h.screens.free({state,onGo:s=>{picked=structuredClone(s);},onLook(){},onBack(){}});
  await h.ready();await h.press('foe-plume');await h.press('foe-archer');await h.press('me-plume');
  assert.equal(state.foes.includes(state.me),false);assert.ok(state.foes.length>=1&&state.foes.length<=2);
  await h.press('place-snow');await h.press('go');assert.equal(picked.place,'snow');
  h.screens.free({state,series:true,onGo:s=>{picked=structuredClone(s);},onLook(){},onBack(){}});
  await h.ready();await h.press('foe-tiger');await h.press('foe-yulin');assert.deepEqual(state.foes,['yulin']);
});

test('native settings, loading and result maintain existing callbacks and localized labels',async()=>{
  const h=harness();setLanguage('en');let changed=[],done=0;
  const settings={quality:'low',control:'classic',assist:true,blood:true,sound:true,invertY:false,sensitivity:1};
  h.screens.settings({settings,onChange:(...args)=>changed.push(args),onDone:()=>done++});
  let v=await h.ready();assert.ok(nodes(v).some(x=>x.text===t('settings')));
  await h.press('set-blood-false');assert.deepEqual(changed,[['blood',false]]);
  await h.press('done');assert.equal(done,1);
  h.screens.loading('Loading');await h.ready();h.screens.progress(.5,'Half');assert.equal(h.screens.snapshot().progress,.5);
  assert.equal(h.screens.snapshot().text,'Half');
  h.screens.result({won:true,double:false,stats:{time:3,deflects:1,broken:2,taken:0,score:10},last:false,onNext:()=>done++,onRetry(){},onTitle(){}});
  await h.ready();await h.press('next');assert.equal(done,2);
  setLanguage('zh');
});


test('all native screens plan valid target sizes in both languages on nine viewport shapes',async()=>{
  for(const lang of ['zh','en']){
    setLanguage(lang);
    for(const [width,height] of [[320,568],[393,852],[412,915],[852,393],[873,325],[768,1024],[1024,768],[744,882],[1280,800]]){
      const h=harness(width,height),s=h.screens,empty=()=>{};
      s.title({onRoad:empty,onExpedition:empty,onFree:empty,onSeries:empty,onSettings:empty});await h.ready();
      s.choose({selected:'archer',veteran:true,onPick:empty,onLook:empty,onDifficulty:empty,onBack:empty});await h.ready();
      for(const regiment of ['yulin','tiger','vanguard','plume','archer']){s.loadout({regiment,onDone:empty,onBack:empty});await h.ready();}
      for(const series of [false,true]){s.free({state:{me:'plume',foes:series?['archer']:['archer','yulin'],place:'bamboo'},series,onGo:empty,onBack:empty,onLook:empty});await h.ready();}
      s.stageCard({stage:{foes:['plume','archer'],double:true,place:'palace',index:3},total:5,onGo:empty,onBack:empty});await h.ready();
      s.result({won:true,double:true,last:true,stats:{time:36.4,deflects:1,broken:3,taken:2,score:80},expedition:true,onNext:empty,onRetry:empty,onTitle:empty,runMark:'jia'});await h.ready();
      s.result({won:false,last:false,stats:{time:20,deflects:0,broken:0,taken:3,score:0},onNext:empty,onRetry:empty,onTitle:empty});await h.ready();
      s.pause({onResume:empty,onSettings:empty,onLeave:empty});await h.ready();
      s.settings({settings:{quality:'high',control:'directional',assist:true,blood:false,sound:false,invertY:true,sensitivity:1.6},onChange:empty,onDone:empty});await h.ready();
      s.loading(t('loading'));await h.ready();
      let retries=0;s.error(t('error'),()=>retries++);await h.ready();await h.press('retry');assert.equal(retries,1);
    }
  }
  setLanguage('zh');
});


test('the framed title keeps all main actions and makes full controls separately accessible',async()=>{
  const h=harness(1280,800),noop=()=>{};setLanguage('en');
  h.screens.title({onRoad:noop,onExpedition:noop,onFree:noop,onSeries:noop,onSettings:noop});
  let v=await h.ready();
  assert.ok(v.desc.root.width<=360,'slim cinematic title rail');
  assert.ok(nodes(v).some(x=>x.name==='help'),'controls entry');
  assert.ok(!nodes(v).some(x=>x.name==='controls'),'instructions do not crowd the initial menu');
  await h.press('help');assert.equal(h.screens.snapshot().help,true);
  assert.ok(nodes(await h.ready()).some(x=>x.name==='controls'&&x.text===t('controlsText')),'all original instructions are available');
  await h.resize(873,325);assert.equal(h.screens.snapshot().help,true);
  await h.press('help');assert.equal(h.screens.snapshot().help,false);
  assert.ok(nodes(await h.ready()).some(x=>x.name==='road'));
  setLanguage('zh');
});

