import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { buildRealmSheet,nativeTipFor } = await import('../src/ui/native-realm-hud.mjs');
const { createCampaignCoach } = await import('../src/ui/native-campaign-coach.mjs');
const { createGame } = await import('../src/sim/world.mjs');
const { setLanguage } = await import('../src/i18n.mjs');
const { muster } = await import('../src/sim/military.mjs');
function namedParts(description){const list=new Map(),walk=n=>{if(n?.name)list.set(n.name,n);for(const child of n?.children??[])walk(child)};walk(description.root);return list;}
const all=['overview','works','orders','officers'];
const s=createGame({seed:184,faction:'liubei',branch:'free'});
let calls=[];const app={state:s,sel:{node:'pingyuan'},mode:null,rulers:()=>new Set(),open:(...a)=>calls.push(a),act:(...a)=>calls.push(a),select:v=>app.sel=v,language:()=>s.language,setMode:v=>app.mode=v};
test('each city page has real native controls, status and complete business callback parity',()=>{
 for(const loc of ['zh','en']){
  setLanguage(loc);app.sel={node:'pingyuan'};
  for(const sec of all){
   const layout={portrait:false,width:320,height:460,top:100},views=buildRealmSheet(app,sec,layout,()=>{});
   const names=namedParts(views.description);for(const name of Object.keys(views.bind))assert(names.has(name),name);
   assert(names.has('realm-close'));for(const tab of all)assert(names.has('realm-tab-'+tab));
   if(sec==='orders'){const n=calls.length;views.bind.muster.tap();assert.deepEqual(calls[n],['muster',{from:'pingyuan'}]);for(const key of ['search','transfer','moveOfficer','governor-build','governor-search','governor-recruit'])assert(names.has(key),key);}
   if(sec==='works')for(const k of ['farm','market','wall','office'])assert(names.has('work-'+k));
  }
  assert(nativeTipFor(app,{node:'pingyuan'}).length===3);
 }
});
test('realm sheet authors fixed native tab and close targets with a scrollable body',()=>{
 for(const portrait of [true,false]){
  const layout={portrait,width:portrait?380:340,height:320,top:100};
  const spec=buildRealmSheet(app,'orders',layout,()=>{}),parts=namedParts(spec.description);
  for(const key of ['realm-close',...all.map(t=>'realm-tab-'+t)]){const part=parts.get(key);assert(part.height>=48,key);assert(part.width==='fill'||part.width>=48,key);}
  assert.equal(parts.get('realm-body').scroll,'vertical');
  assert.equal(spec.description.root.anchor,portrait?'bottom':'top-left');
 }
});
test('first-month coach renders a native named fixed footer without spending days',()=>{
 setLanguage('zh');let last,paused=true;
 app.firstMonth={day:s.day,dismissed:false};app.screen='play';app.paused=true;app.dialogOpen=false;app.setPaused=v=>{paused=v};
 app.goHome=()=>{};
 app.minimap={snapshot:()=>({box:{width:130,height:100}})};
 const game={show(description,options){const parts=namedParts(description);last={description,options,parts};return {close(){},visibleRect(){return undefined}}},fromStage:(x,y)=>({x,y})};
 const host={game,topInset:160,metrics:()=>({scale:1,uiScale:1,safe:{x:0,y:0,width:390,height:844},portrait:true}),addLayout(fn){fn();return ()=>{}}};
 const c=createCampaignCoach(app,host);c.refreshFirst();
 assert(last.parts.has('coach-dismiss'));assert(last.parts.has('coach-start'));const day=s.day;
 last.options.bind['coach-start'].tap();assert(app.firstMonth.dismissed);assert.equal(paused,false);assert.equal(s.day,day);c.dispose();
});

test('own army sheet keeps map command and adds a genuine named native list opener',()=>{
  const state=createGame({seed:184,faction:'liubei',branch:'free'});
  const issued=muster(state,state.player,'pingyuan',{commander:'liubei',troops:1000});assert(issued.ok);
  let picked;const fixture={...app,state,sel:{army:issued.army},mode:null,destinationPicker:{open(id){picked=id}},setMode(v){fixture.mode=v}};
  const spec=buildRealmSheet(fixture,'overview',{portrait:false,width:340,height:450,top:100},()=>{}),parts=namedParts(spec.description);
  assert(parts.has('army-destination-list'));assert(parts.get('army-destination-list').height>=48);
  spec.bind['army-destination-list'].tap();assert.equal(picked,issued.army);assert.equal(fixture.mode,null);
  spec.bind['army-march'].tap();assert.deepEqual(fixture.mode,{kind:'march',army:issued.army});
});
