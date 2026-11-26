import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,createSaveSnapshot,dispatch,update} from '../src/sim/world.mjs';
import {MAPS,ITEMS,EQUIPMENT_SLOTS,SHOPS} from '../src/sim/data.mjs';

test('the RPG expansion exposes stable maps, NPCs, gear and three separate shops',()=>{
 for(const id of ['city','trail','pass','trial'])assert(MAPS[id]);
 for(const id of ['elder','smith','apothecary','merchant','scout'])assert(MAPS.city.npcs.some(n=>n.id===id));
 assert.deepEqual(EQUIPMENT_SLOTS,['weapon','offhand','armor','boots','ring','skill']);
 assert.equal(ITEMS['jade-seal'].slot,'ring');
 assert.equal(Object.keys(SHOPS).length,3);
 const state=createSession();assert.equal(state.hero.anger,0);assert.equal(state.chapter.stage,'locked');
});

test('first quest equips its granted Q skill, and unequipping genuinely disables it',()=>{
 const state=createSession();state.hero.x=800;state.hero.y=490;
 assert(dispatch(state,{type:'interact',id:'elder'}));
 assert.equal(state.inventory.find(i=>i.uid===state.equipment.skill).itemId,'qiankun-ring');
 assert(dispatch(state,{type:'unequip',slot:'skill'}));assert(!dispatch(state,{type:'artifact'}));
 const empty=createSession(createSaveSnapshot(state));assert.equal(empty.equipment.skill,null);assert(!dispatch(empty,{type:'artifact'}));
 const ring=state.inventory.find(i=>i.itemId==='qiankun-ring');assert(dispatch(state,{type:'equip',uid:ring.uid}));
 assert(dispatch(state,{type:'artifact'}));
});

test('legacy equipped jade seal migrates without losing its combat stats',()=>{
 const state=createSession();const old=createSaveSnapshot(state);
 old.inventory.push({uid:'legacy-seal',itemId:'jade-seal'});old.equipment.charm='legacy-seal';delete old.equipment.ring;
 old.flags.artifactOwned=true;const restored=createSession(old);
 assert.equal(restored.equipment.ring,'legacy-seal');assert(restored.hero.attack>state.hero.attack);
 assert(restored.equipment.skill);assert.equal(restored.artifact.phase,'idle');
});

test('shop transactions require a nearby vendor and never mint gold through resale',()=>{
 const state=createSession();assert(!dispatch(state,{type:'openShop',id:'smith'}));
 state.hero.x=1120;state.hero.y=480;assert(dispatch(state,{type:'openShop',id:'smith'}));
 const offer=state.shop.offers.find(o=>o.itemId==='bronze-sword'),before=state.hero.gold;
 assert(!dispatch(state,{type:'buy',offerId:offer.id}));state.hero.gold=200;
 assert(dispatch(state,{type:'buy',offerId:offer.id}));const bought=state.inventory.at(-1);
 assert(dispatch(state,{type:'sell',uid:bought.uid}));assert(state.hero.gold<200);
 assert.equal(before,24);
});

test('anger comes from real damage, rage has an actual delayed footprint, and it cannot feed itself',()=>{
 const state=createSession();state.hero.x=800;state.hero.y=490;dispatch(state,{type:'interact',id:'elder'});
 state.hero.x=1450;state.hero.y=840;dispatch(state,{type:'interact',id:'portal'});
 assert(!dispatch(state,{type:'rage'}));
 const foe=state.enemies[0];state.enemies=[foe];state.trailState.enemies=state.enemies;
 Object.assign(foe,{x:230,y:1190,hp:500,maxHp:500,cooldown:99});
 dispatch(state,{type:'target',id:foe.id});
 for(let i=0;i<600&&state.hero.anger<100;i++)update(state,1/60);
 assert.equal(state.hero.anger,100);state.autoAttack=false;state.pendingStrike=null;
 const hp=foe.hp;assert(dispatch(state,{type:'rage'}));assert.equal(state.hero.anger,0);
 update(state,.2);assert.equal(foe.hp,hp);update(state,.25);assert(foe.hp<hp);
 assert.equal(state.hero.anger,0);assert.equal(state.rage.phase,'idle');assert(!dispatch(state,{type:'rage'}));
});

test('wind banner is equipable, pulses three times, protects, and shares cooldown through skill swaps',()=>{
 const state=createSession();state.flags.artifactOwned=true;
 state.inventory.push({uid:'wind',itemId:'wind-banner'},{uid:'ring-q',itemId:'qiankun-ring'});
 assert(dispatch(state,{type:'equip',uid:'wind'}));assert(dispatch(state,{type:'artifact'}));
 assert.equal(state.artifact.phase,'idle');assert(state.hero.ward>0);
 const events=[];for(let i=0;i<90;i++)events.push(...update(state,1/60));
 assert.equal(events.filter(e=>e.type==='skillPulse').length,3);
 assert(dispatch(state,{type:'equip',uid:'ring-q'}));assert(!dispatch(state,{type:'artifact'}));
 const again=createSession(createSaveSnapshot(state));assert(again.artifact.cooldown>5);assert.equal(again.hero.ward,0);
 assert(!dispatch(again,{type:'artifact'}));
});

test('side quest reward choices consume actual resources once and survive reload',()=>{
 const state=createSession();state.hero.x=530;state.hero.y=480;
 assert(dispatch(state,{type:'interact',id:'apothecary'}));assert(dispatch(state,{type:'dialogueAction',id:'accept-herbs'}));
 assert(!dispatch(state,{type:'dialogueAction',id:'herbs-ring'}));
 state.resources.herb=3;assert(dispatch(state,{type:'interact',id:'apothecary'}));
 assert(dispatch(state,{type:'dialogueAction',id:'herbs-ring'}));
 assert.equal(state.resources.herb,0);assert.equal(state.sideQuests.herbs.choice,'herbs-ring');
 assert.equal(state.inventory.filter(i=>i.itemId==='verdant-ring').length,1);
 assert(!dispatch(state,{type:'dialogueAction',id:'herbs-medicine'}));
 const again=createSession(createSaveSnapshot(state));assert.equal(again.sideQuests.herbs.rewarded,true);
 assert.equal(again.inventory.filter(i=>i.itemId==='verdant-ring').length,1);
});

test('new chapter gate is locked and invalid item sales or unaffordable offers preserve the economy',()=>{
 const state=createSession();state.hero.x=1450;state.hero.y=560;
 assert(!dispatch(state,{type:'interact',id:'pass-gate'}));assert.equal(state.mapId,'city');
 state.hero.x=1120;state.hero.y=480;dispatch(state,{type:'openShop',id:'smith'});
 assert(!dispatch(state,{type:'sell',uid:'starter-sword'}));assert(!dispatch(state,{type:'buy',offerId:'unknown'}));
 const snapshot=createSaveSnapshot(state);assert.equal(createSession(snapshot).hero.gold,24);
});

test('low and upgraded kits deal their actual weapon damage and both survive the complete new boss pattern',async()=>{
 const {makeEnemy}=await import('../src/sim/progression.mjs');
 function duel(upgraded){
  // Isolated balance fixture; the full progression oracle above earns every item.
  const s=createSession();s.mapId='pass';Object.assign(s.hero,{x:200,y:1180});
  s.flags.artifactOwned=true;s.inventory.push({uid:'q',itemId:'qiankun-ring'});dispatch(s,{type:'equip',uid:'q'});
  if(upgraded)for(const itemId of ['wind-sword','scale-armor','vanguard-shield','wind-boots','storm-ring']){
   const uid='fixture-'+itemId;s.inventory.push({uid,itemId});dispatch(s,{type:'equip',uid});
  }
  const foe=makeEnemy('windlord',300,1180,'duel');s.enemies=[foe];s.worlds.pass.enemies=s.enemies;
  dispatch(s,{type:'target',id:foe.id});const history=[];let frames=0;
  for(;frames<60*60&&!foe.dead&&s.phase==='play';frames++){
   if(s.hero.hp<s.hero.maxHp*.62)dispatch(s,{type:'potion'});
   dispatch(s,{type:'artifact',x:foe.x,y:foe.y});dispatch(s,{type:'rage'});history.push(...update(s,1/60));
  }
  assert.equal(s.phase,'play');assert(foe.dead);
  return{frames,potions:s.hero.potions,damage:history.find(e=>e.type==='hit'&&e.cause==='melee').amount,
   patterns:new Set(history.filter(e=>e.type==='enemyAttack').map(e=>e.kind)),extra:history.filter(e=>e.type==='telegraph'&&e.kind==='crosswind').map(e=>e.extra)};
 }
 const low=duel(false),high=duel(true);
 assert.equal(low.damage,17);assert.equal(high.damage,41);assert(low.frames>high.frames);assert(low.potions<high.potions);
 assert.deepEqual([...low.patterns].sort(),['crosswind','dash','slam']);assert(low.extra.every(marks=>marks.length===2));
});

test('the alternative parts reward equips real boots without also granting the shield',()=>{
 const s=createSession();s.hero.x=1120;s.hero.y=480;dispatch(s,{type:'interact',id:'smith'});
 dispatch(s,{type:'dialogueAction',id:'accept-parts'});s.resources.parts=3;dispatch(s,{type:'interact',id:'smith'});
 assert(dispatch(s,{type:'dialogueAction',id:'parts-boots'}));const boots=s.inventory.find(i=>i.itemId==='march-boots');
 assert(boots);assert(!s.inventory.some(i=>i.itemId==='bronze-shield'));assert(dispatch(s,{type:'equip',uid:boots.uid}));
 assert.equal(s.hero.speed,200);assert.equal(s.resources.parts,0);assert(!dispatch(s,{type:'dialogueAction',id:'parts-shield'}));
});
