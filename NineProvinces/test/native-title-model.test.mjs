import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/world.mjs';
import { setLanguage } from '../src/i18n.mjs';
import { createCampaignDraft, createOfficerDraft } from '../src/ui/native-title-model.mjs';
import { buildTitleView, buildSetupView, buildRosterView, createNativeTitleScreens } from '../src/ui/native-title.mjs';
import { pathToFileURL } from 'node:url';
async function enginePath(){if(process.env.NINE_ENGINE_VIEW)return pathToFileURL(process.env.NINE_ENGINE_VIEW);await import('../vendor/node-register.mjs');return new URL('../vendor/engine/dist/web/view.js',import.meta.url);}

const draftOfficer = {id:'u1',zh:'剑兰',en:'Jian Lan',age:24,female:true,portrait:4,service:'player',stats:{lead:70,war:70,int:70,pol:70,cha:70},trait:null};
function fixture(){
  let saved=[draftOfficer];
  return {demoState:createGame({seed:184}),screen:'title',notice:null,map:{setDrift(){},refreshLands(){},focus(id){this.focused=id}},wake(){},language:()=> 'zh',officerRoster:()=>saved,saveOfficerRoster:x=>(saved=x,true),slotSummary:()=>null,open(){},openSandbox(){},openNanpi(){},setLanguage(){},newGame(pick){this.submitted=pick},toTitle(){this.screen='title'}};
}
test('Historical draft preserves old branch/scenario semantics and selected roster isolation',()=>{
  const app=fixture(), d=createCampaignDraft(app,'liubei');
  assert.equal(d.pick.faction,'liubei');
  assert.equal(d.pick.branch,'liubei');
  assert.equal(d.chooseFaction('caocao'),false);
  d.selectOfficer('u1',true); d.submit();
  assert.deepEqual(app.submitted.officers,[draftOfficer]);
  assert.equal(app.submitted.command,true);
  d.chooseScenario('200');assert.equal(d.pick.branch,'free');
  assert.equal(d.chooseFaction('caocao'),true);
  assert.equal(app.demoState.scenario,'200');
  assert.equal(app.map.focused,app.demoState.factions.caocao.capital);
});
test('Founding draft keeps selected roster ruler/search and unique companions, never mutates snapshot',()=>{
  const app=fixture(), d=createCampaignDraft(app);
  d.chooseScenario('200');d.chooseMode('custom');
  assert.equal(d.founding.ruler,'roster:u1');
  const before=JSON.stringify(app.demoState);
  const options=d.options();assert(options.alternateHistory);assert(options.towns.length>0);
  const companion=options.officers.find(x=>x.ref!==d.founding.ruler);
  assert(d.chooseCompanion(0,companion.ref));
  assert.equal(d.chooseCompanion(1,companion.ref),false);
  d.setFounding('search','no match whatsoever');
  assert(d.officers('ruler').some(x=>x.ref==='roster:u1'));
  assert(d.officers(0).some(x=>x.ref===companion.ref));
  d.setFounding('zh','');assert.equal(d.validation().ok,false);assert.equal(d.submit(),false);
  d.setFounding('zh','义军');d.setFounding('flag','义');assert(d.submit());
  assert.equal(app.submitted.branch,'free');assert.equal(app.submitted.customFaction.ruler,'roster:u1');
  assert.deepEqual(app.submitted.customFaction.companions,[companion.ref]);
  assert.equal(JSON.stringify(app.demoState),before);
});
test('Roster draft reuses existing validation and persistence, keeps existing draft on rejected save',()=>{
  const app=fixture(), r=createOfficerDraft(app);
  assert.equal(r.commit(),false);
  r.set('zh','新武将');r.set('en','A new general');r.setStat('lead',91);
  assert.equal(r.commit(),false);assert.equal(r.draft.zh,'新武将');
  r.setStat('lead',71);assert.equal(r.budget(),351);assert.equal(r.commit(),false);
  r.setStat('lead',70);assert(r.commit());assert.equal(app.officerRoster().length,2);
  assert.equal(r.draft.zh,'');
  assert(r.remove('u1'));assert.equal(app.officerRoster().length,1);
});
const names=(node,map=new Map())=>{if(node.name){assert(!map.has(node.name),'duplicate part '+node.name);map.set(node.name,node);}node.children?.forEach(n=>names(n,map));return map;};
test('Data descriptions include native controls in both languages, all variants share names and kinds',()=>{
  for(const locale of ['zh','en']){
    setLanguage(locale);const app=fixture(), d=createCampaignDraft(app), r=createOfficerDraft(app);
    const handlers={goSetup(){},goRoster(){},back(){},goTitle(){},refresh(){},edit(){},select(){},selectOfficer(){},choosePortrait(){}};
    const views=[buildTitleView(app,handlers),buildSetupView(app,d,handlers),buildRosterView(app,r,handlers)];d.chooseScenario('200');d.chooseMode('custom');views.push(buildSetupView(app,d,handlers));
    for(const {description,bind} of views){const first=names(description.root);for(const variant of ['portrait','tablet','tabletPortrait']){const n=names(description[variant]);assert.deepEqual([...n].map(([k,v])=>[k,v.type]),[...first].map(([k,v])=>[k,v.type]));}for(const name of Object.keys(bind))assert(first.has(name),name);}
    assert(names(views[0].description.root).has('title-new'));
    assert(names(views[1].description.root).has('setup-start'));
    assert(names(views[2].description.root).has('roster-name'));
    assert(names(views[3].description.root).has('founding-search'));
  }
});

// This can also use the freshly vendored module when the files are integrated.
test('Exact current engine planner accepts all descriptions; fixed footer targets stay safe',async()=>{
  const {checkView,planView}=await import(await enginePath());
  const controls=['setup-back','setup-start','roster-back','roster-commit'];
  for(const locale of ['zh','en']){
    setLanguage(locale); const app=fixture(), d=createCampaignDraft(app), r=createOfficerDraft(app);
    const handlers={goSetup(){},goRoster(){},back(){},goTitle(){},refresh(){},edit(){},select(){},selectOfficer(){},choosePortrait(){}};
    const views=[buildTitleView(app,handlers),buildSetupView(app,d,handlers),buildRosterView(app,r,handlers)];d.chooseScenario('200');d.chooseMode('custom');views.push(buildSetupView(app,d,handlers));
    for(const {description,bind} of views){
      const valid=checkView(description);for(const name of Object.keys(bind))assert(valid.has(name));
      for(const [width,height,insets] of [[873,325,[20,0,20,0]],[852,393,[59,0,59,0]],[390,844,[0,40,0,30]],[768,1024,[0,0,0,0]],[1024,768,[0,0,0,0]],[1280,800,[0,0,0,0]]]){
        const scale=44/48,[left,top,right,bottom]=insets;const screen={x:0,y:0,width:width/scale,height:height/scale};const safe={x:left/scale,y:top/scale,width:(width-left-right)/scale,height:(height-top-bottom)/scale};
        const plan=planView(description,{screen,safe,orientation:height>width?'portrait':'landscape',form:Math.min(width,height)>=600?'tablet':'phone'});
        for(const name of controls){const index=plan.names.get(name);if(index===undefined)continue;const a=plan.parts[index].rect;assert(a.width*scale>=44-1e-7&&a.height*scale>=44-1e-7,`${locale} ${name} at ${width}x${height}`);assert(a.x>=safe.x&&a.y>=safe.y&&a.x+a.width<=safe.x+safe.width+1e-7&&a.y+a.height<=safe.y+safe.height+1e-7,`${locale} ${name} safe`);}
      }
    }
  }
});

test('Title controller routes names through native field/select bindings, preserves setup draft and cancels composition',async()=>{
  setLanguage('zh');const app=fixture(), sessions=[];let selection=[], selects=[];
  const game={show(description,options){const v={description,options,focused:null,closed:false,offset:0,changed:0,
    focus(name){this.focused=name;return true},scroll(){return{offset:this.offset,scrollTo:v=>{this.offset=v}}},close(){this.closed=true},show(){},hide(){},cover(){},reveal(){},activate(){},deactivate(){},
    edit(name,options){this.editor={name,options};return true},refresh(){this.changed++},replaceChildren(name,rows,bind){assert.equal(name,'page-body');this.options.bind={...this.options.bind,...bind};this.changed++},tap(name){const binding=this.options.bind[name];assert(binding,name);assert(!binding.disabled?.(),name);return binding.tap?.()}};sessions.push(v);return v;},
    async select(entries,opts){selects.push({entries,opts});return selection.shift();}};
  const view=createNativeTitleScreens(game,{app,onError:e=>{throw e}});let tick=()=>new Promise(resolve=>queueMicrotask(resolve));
  view.showTitle();assert.equal(view.view.focused,'title-new');view.view.tap('title-new');assert.equal(app.screen,'setup');
  view.view.tap('scenario-200');await tick();view.view.tap('mode-custom');await tick();
  view.view.tap('founding-name');let edit=view.view.editor.options;edit.onCommit('义军');await tick();
  assert.equal(view.snapshot().setup.founding.zh,'义军');
  view.view.tap('founding-search');edit=view.view.editor.options;edit.onChange({value:'nihao',composing:true});assert.equal(view.snapshot().setup.founding.search,'');
  edit.onChange({value:'赵',composing:false});assert.equal(view.snapshot().setup.founding.search,'赵');edit.onCancel();await tick();assert.equal(view.snapshot().setup.founding.search,'');
  selection=['@next-page',undefined];view.view.tap('founding-ruler');await tick();await tick();assert.equal(selects.length,2);assert(selects.every(x=>x.entries.length<=35));
  view.view.focus('founding-roster');view.view.offset=120;view.view.tap('founding-roster');assert.equal(app.screen,'roster');
  view.view.tap('roster-name');view.view.editor.options.onCommit('新武将');await tick();
  view.view.tap('roster-commit');await tick();assert.equal(app.officerRoster().length,2);
  view.view.tap('roster-back');assert.equal(app.screen,'setup');assert.equal(view.snapshot().setup.founding.zh,'义军');assert.equal(view.snapshot().setup.pick.scenario,'200');assert.equal(view.view.focused,'founding-roster');assert.equal(view.view.offset,120);
  view.view.tap('setup-start');assert.equal(app.submitted.customFaction.zh,'义军');assert.equal(view.view,undefined);assert(sessions.every(s=>s.closed));
});

test('Shared engine screen stack keeps covered page input inactive and releases old page',async()=>{
  const entry=await enginePath(), {createUiScreenStack}=await import(new URL('../ui/screenStack.js',entry));
  const stack=createUiScreenStack(), app=fixture(), views=[];
  const game={show(description,options){const v={description,options,focused:null,active:true,closed:false,focus(name){this.focused=name;return true},scroll(){return{offset:0,scrollTo(){}}},close(){this.closed=true},show(){},hide(){},cover(){},reveal(){},activate(){this.active=true},deactivate(){this.active=false},replaceChildren(){}};views.push(v);return v;}};
  const ui=createNativeTitleScreens(game,{app,stack,onError:e=>{throw e}});const until=async f=>{for(let i=0;i<30;i++){if(f())return;await new Promise(r=>setTimeout(r,0));}assert(f());};
  ui.showTitle();await until(()=>stack.snapshot().active==='nine-title');assert.equal(ui.view.focused,'title-new');
  const first=ui.view;ui.view.options.bind['title-new'].tap();await until(()=>stack.snapshot().active==='nine-setup');assert(first.closed);assert.equal(ui.view.focused,'scenario-184');
  const modal={id:'test-modal',layer:'modal',open:()=>({})};void stack.open(modal);await until(()=>stack.snapshot().active==='test-modal');assert.equal(ui.view.active,false);
  const setupView=ui.view;ui.refresh();await new Promise(r=>setTimeout(r,0));assert.equal(ui.view,setupView);assert.equal(ui.view.active,false);
  await stack.close(modal);await until(()=>stack.snapshot().active==='nine-setup');assert.equal(ui.view.active,true);
  ui.close();await until(()=>stack.snapshot().pages.length===0);assert(views.every(v=>v.closed));await stack.dispose();
});

test('Selected historical ruler portrait and summary remain fixed above the long setup scroll',async()=>{
  const {checkView,planView}=await import(await enginePath());
  for(const locale of ['zh','en']){
    setLanguage(locale);const app=fixture(),d=createCampaignDraft(app,'liubei'),handlers={goTitle(){},goRoster(){},refresh(){},edit(){},select(){},close(){}};
    const {description}=buildSetupView(app,d,handlers);checkView(description);
    for(const variant of ['root','portrait','tablet','tabletPortrait']){
      const all=names(description[variant]),body=all.get('page-body');assert(!names(body).has('setup-ruler-art'),'portrait must not depend on the scroll clip');assert(!names(body).has('setup-summary'));
      assert(all.get('setup-ruler-art').src.endsWith('/panel/liubei.webp')); assert.equal(all.get('setup-ruler-header').height,84);
    }
    for(const [width,height,left,right,top,bottom]of [[873,325,20,20,0,0],[852,393,59,59,0,0],[390,844,0,0,40,30],[1280,800,0,0,0,0]]){
      const scale=44/48,screen={x:0,y:0,width:width/scale,height:height/scale},safe={x:left/scale,y:top/scale,width:(width-left-right)/scale,height:(height-top-bottom)/scale};const plan=planView(description,{screen,safe,orientation:height>width?'portrait':'landscape',form:Math.min(width,height)>=600?'tablet':'phone'});
      const art=plan.parts[plan.names.get('setup-ruler-art')].rect,summary=plan.parts[plan.names.get('setup-summary')].rect,body=plan.parts[plan.names.get('page-body')].rect;assert(art.y>=safe.y&&art.y+art.height<=body.y&&summary.y+summary.height<=body.y);assert(body.height*scale>=44);
    }
  }
});