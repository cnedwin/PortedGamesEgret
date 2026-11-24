import assert from 'node:assert/strict';
import {test} from 'node:test';
import '../vendor/node-register.mjs';
import {createGame,advance} from '../src/sim/world.mjs';
import {muster,order,siegeCouncil,waitForSiegeReinforcement,activeSiegeWait,cancelSiegeWait} from '../src/sim/military.mjs';
const {openSlot,writeSlot}=await import('../src/saves.mjs');

function waitingArmy() {
  const state=createGame({seed:1,faction:'liubei',branch:'free'});
  const main=muster(state,state.player,'pingyuan',{commander:'liubei',troops:3000,target:'nanpi'});assert(main.ok);
  const lead=state.armies[main.army];
  for(let i=0;i<40&&!lead.besieging;i++)assert(advance(state));
  for(let i=0;i<8;i++)assert(advance(state));
  const support=muster(state,state.player,'pingyuan',{commander:'guanyu',troops:1000,target:'nanpi'});assert(support.ok);
  const second=muster(state,state.player,'pingyuan',{commander:'zhangfei',troops:1000,unit:'lightcav',target:'nanpi'});assert(second.ok);
  for(let i=0;i<20&&!state.inbox.some(m=>m.kind==='battle');i++)assert(advance(state));
  const setup=state.inbox.find(m=>m.kind==='battle').setup;
  return {state,setup,main:main.army,support:support.army,second:second.army};
}
const clone=x=>JSON.parse(JSON.stringify(x));

test('Nanpi council reads actual arrivals, supplies, home garrisons and daily-leg ETA without mutation',()=>{
  const {state,setup,main,support}=waitingArmy(),before=JSON.stringify(state);
  const view=siegeCouncil(state,setup);assert.equal(view.nodeId,'nanpi');assert.equal(view.arrived[0].armyId,main);assert(view.arrived[0].unit);
  const incoming=view.incoming.find(a=>a.armyId===support);assert(incoming.reachable);assert(incoming.etaDays>0);assert.equal(incoming.origin,'pingyuan');assert.equal(incoming.originGarrison,state.nodes.pingyuan.troops);assert(incoming.unit);
  assert.equal(JSON.stringify(state),before);assert.equal(state.inbox.find(m=>m.setup?.id===setup.id).setup,setup);
  assert.equal(siegeCouncil(state,{...setup,place:{node:'ye'}}),null);
});

test('waiting releases only this snapshot and all selected reinforcements must physically arrive before one new council',()=>{
  const {state,setup,main,support,second}=waitingArmy(),view=siegeCouncil(state,setup),eta=Math.max(...view.incoming.filter(a=>[support,second].includes(a.armyId)).map(a=>a.etaDays)),day=state.day,grain=state.armies[main].grain;
  assert(waitForSiegeReinforcement(state,setup,[support,second]).ok);
  assert.equal(state.day,day);assert.equal(state.armies[main].grain,grain);assert(!state.inbox.some(m=>m.setup?.id===setup.id));assert.equal(state.armies[main].inBattle,null);assert.equal(state.armies[support].at,null);
  assert.equal(waitForSiegeReinforcement(state,setup,[support]).ok,false);
  for(let i=1;i<=eta;i++){assert(advance(state));const pending=state.inbox.filter(m=>m.kind==='battle'&&m.setup.place.node==='nanpi');assert.equal(pending.length,i===eta?1:0);}
  const fresh=state.inbox.find(m=>m.kind==='battle').setup;
  assert.notEqual(fresh.id,setup.id);assert.equal(fresh.council.reason,'arrived');assert(fresh.units.some(u=>u.army===main));assert(fresh.units.some(u=>u.army===support));assert(fresh.units.some(u=>u.army===second));assert.equal(activeSiegeWait(state),null);assert(state.armies[main].grain<grain);
  assert.equal(advance(state),false);assert.equal(state.inbox.filter(m=>m.kind==='battle').length,1);
});

test('waiting survives the real v1 save-slot roundtrip and yields the same rebuilt battle',()=>{
  const {state,setup,support}=waitingArmy();assert(waitForSiegeReinforcement(state,setup,support).ok);
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
  assert(writeSlot(openSlot(storage,'1'),state,1));const restored=openSlot(storage,'1').data.game;assert.deepEqual(restored,clone(state));
  while(!state.inbox.some(m=>m.blocks)){assert(advance(state));assert(advance(restored));}
  assert.deepEqual(restored,clone(state));
});

test('a redirected support ends waiting and reopens a single council for the actual besiegers',()=>{
  const {state,setup,support}=waitingArmy();assert(waitForSiegeReinforcement(state,setup,[support]).ok);assert(order(state,support,'pingyuan').ok);assert(advance(state));
  assert.equal(activeSiegeWait(state),null);const fresh=state.inbox.filter(m=>m.kind==='battle'&&m.setup.place.node==='nanpi');assert.equal(fresh.length,1);assert.equal(fresh[0].setup.council.reason,'supportRedirected');assert(!fresh[0].setup.units.some(u=>u.army===support));
});

test('a truce or ownership change ends waiting without inventing an attack or leaving battle locks',()=>{
  for(const change of['treaty','owner']){
    const {state,setup,main,support}=waitingArmy();assert(waitForSiegeReinforcement(state,setup,support).ok);
    if(change==='treaty')state.factions[state.player].treaties[state.nodes.nanpi.owner]={kind:'truce',until:state.day+30};else state.nodes.nanpi.owner=state.player;
    assert(advance(state));assert.equal(activeSiegeWait(state),null);assert.equal(state.armies[main].inBattle,null);assert.equal(state.inbox.filter(m=>m.kind==='battle'&&m.setup.place.node==='nanpi').length,0);
  }
});

test('missing or unreachable selected support exits deterministically, and explicit cancellation cannot double-trigger',()=>{
  for(const cause of['gone','blocked','cancel']){
    const {state,setup,support}=waitingArmy();assert(waitForSiegeReinforcement(state,setup,support).ok);
    if(cause==='gone')delete state.armies[support];
    else if(cause==='blocked'){const army=state.armies[support];army.link=null;army.at='pingyuan';army.path=[];}
    if(cause==='cancel'){assert(cancelSiegeWait(state));assert.equal(cancelSiegeWait(state),false);}else assert(advance(state));
    assert.equal(activeSiegeWait(state),null);assert.equal(state.inbox.filter(m=>m.kind==='battle'&&m.setup.place.node==='nanpi').length,1);
  }
});

test('legacy v1 states without a wait field keep original battle snapshots and reject unavailable support',()=>{
  const {state,setup,support}=waitingArmy();delete state.siegeCouncilWaits;const before=JSON.stringify(state);assert.equal(activeSiegeWait(state),null);assert.equal(waitForSiegeReinforcement(state,setup,['missing']).ok,false);assert.equal(JSON.stringify(state),before);
  state.armies[support].inBattle='another-battle';const locked=JSON.stringify(state);assert.equal(waitForSiegeReinforcement(state,setup,support).ok,false);assert.equal(JSON.stringify(state),locked);
});

test('a genuine queued long detour keeps daily supplies and the tenth-day siege cycle from interrupting the wait',()=>{
  const state=createGame({seed:1,faction:'liubei',branch:'free'});
  const main=muster(state,state.player,'pingyuan',{commander:'liubei',troops:3000,target:'nanpi'});assert(main.ok);
  const lead=state.armies[main.army];
  for(let i=0;i<40&&!lead.besieging;i++)assert(advance(state));
  for(let i=0;i<8;i++)assert(advance(state));
  // A diplomatic starting fixture; every army position and day below is earned by marching.
  state.factions[state.player].treaties[state.nodes.linzi.owner]={kind:'ally',until:state.day+100};
  const support=muster(state,state.player,'pingyuan',{commander:'guanyu',troops:1000,target:'linzi'});assert(support.ok);
  assert(advance(state));assert(state.armies[support.army].link);assert(order(state,support.army,'nanpi').later);
  while(!state.inbox.some(m=>m.kind==='battle'))assert(advance(state));
  const setup=state.inbox.find(m=>m.kind==='battle').setup,view=siegeCouncil(state,setup),row=view.incoming.find(a=>a.armyId===support.army);
  assert(row.reachable);assert(row.etaDays>10);const day=state.day,eta=row.etaDays,grain=lead.grain;
  assert(waitForSiegeReinforcement(state,setup,support.army).ok);
  for(let i=1;i<=eta;i++){
    assert(advance(state));
    assert.equal(state.inbox.filter(m=>m.kind==='battle'&&m.setup.place.node==='nanpi').length,i===eta?1:0);
    if(i<eta)assert.equal(activeSiegeWait(state).etaDays,eta-i);
  }
  assert.equal(state.day,day+eta);assert(lead.grain<grain);assert.equal(activeSiegeWait(state),null);
});
