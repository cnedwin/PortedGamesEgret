import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,createSaveSnapshot,dispatch,update,nextRecovery} from '../src/sim/world.mjs';
import {PROFESSIONS} from '../src/sim/arsenal.mjs';
import {makeEnemy} from '../src/sim/progression.mjs';
import {forecastHits,lateBossForecast} from '../src/sim/campaign-ai.mjs';

test('profession and seeded expeditions persist, and legacy slots always migrate to guard',()=>{
 for(const profession of Object.keys(PROFESSIONS)){
  const s=createSession(null,{profession,seed:9876});assert.equal(s.profession,profession);assert.equal(s.hero.classId,profession);assert.equal(s.seed,9876);
  assert.equal(s.inventory[0].itemId,PROFESSIONS[profession].starterWeapon);
  const again=createSession(createSaveSnapshot(s),{profession:'other',seed:123});assert.equal(again.profession,profession);assert.equal(again.seed,9876);
 }
 const old=createSaveSnapshot(createSession());delete old.profession;assert.equal(createSession(old,{profession:'ranger'}).profession,'guard');
});

test('recovery chooses the smallest stocked size that covers the deficit and persists separate pills',()=>{
 const hero={hp:100,maxHp:100,potions:2,tonics:2};assert.equal(nextRecovery(hero),null);
 for(const [hp,key]of [[60,'potions'],[55,'potions'],[54,'tonics'],[35,'tonics'],[10,'tonics']]){hero.hp=hp;assert.equal(nextRecovery(hero).key,key);}
 hero.tonics=0;hero.hp=10;assert.equal(nextRecovery(hero).key,'potions');hero.potions=0;assert.equal(nextRecovery(hero),null);
 const s=createSession();s.hero.hp=40;s.hero.tonics=1;assert(dispatch(s,{type:'potion'}));assert.equal(s.hero.hp,100);assert.equal(s.hero.tonics,0);assert.equal(s.hero.potions,5);
 s.hero.tonics=3;assert.equal(createSession(createSaveSnapshot(s)).hero.tonics,3);
});

test('Lv8 recovery pill is a real locked shop item and buy writes tonics without changing potions',()=>{
 const s=createSession();s.hero.x=530;s.hero.y=480;s.hero.gold=200;dispatch(s,{type:'openShop',id:'apothecary'});
 assert(!dispatch(s,{type:'buy',offerId:'apothecary-recovery-pill'}));s.hero.level=8;
 assert(dispatch(s,{type:'buy',offerId:'apothecary-recovery-pill'}));assert.equal(s.hero.tonics,1);assert.equal(s.hero.potions,5);assert.equal(s.hero.gold,180);
});

test('ring and cross forecasts use the same player-disc geometry as their safe markers',()=>{
 const ring={shape:'ring',x:0,y:0,radius:330,innerRadius:92,safeZones:[{x:0,y:0,radius:92}]};
 assert(!forecastHits({x:70,y:0},ring));assert(!forecastHits({x:74,y:0},ring));assert(forecastHits({x:75,y:0},ring));assert(forecastHits({x:250,y:0},ring));assert(!forecastHits({x:350,y:0},ring));
 const cross={shape:'cross',x:0,y:0,radius:310,width:74,safeZones:[{x:145,y:145,radius:64}]};
 assert(forecastHits({x:200,y:0},cross));assert(forecastHits({x:0,y:200},cross));assert(!forecastHits({x:145,y:145},cross));assert(!forecastHits({x:200,y:200},cross));assert(!forecastHits({x:0,y:400},cross));
});
function skillFixture(profession){const s=createSession(null,{profession});s.mapId='pass';Object.assign(s.hero,{x:200,y:1180});
 const foe=makeEnemy('windlord',330,1180,'target');foe.cooldown=99;s.enemies=[foe];s.worlds.pass.enemies=s.enemies;return{s,foe};}

test('a volley keeps three real arrows but repeated hits in one target share diminishing damage',()=>{
 const {s,foe}=skillFixture('ranger');assert(dispatch(s,{type:'classSkill',x:foe.x,y:foe.y}));assert.equal(s.projectiles.length,3);
 const events=[];for(let i=0;i<60;i++)events.push(...update(s,1/60));
 const hits=events.filter(e=>e.type==='hit'&&e.id===foe.id).map(e=>e.amount).sort((a,b)=>b-a);
 assert.deepEqual(hits,[35,7,4]);assert.equal(s.projectiles.length,0);assert(s.hero.classCooldown>4);
});

test('ritualist array produces three decreasing real pulses and its slow expires',()=>{
 const {s,foe}=skillFixture('ritualist');assert(dispatch(s,{type:'classSkill',x:foe.x,y:foe.y}));
 const events=[];let slowed=false;for(let i=0;i<180;i++){events.push(...update(s,1/60));slowed ||= foe.slow>0;}
 assert.deepEqual(events.filter(e=>e.type==='hit'&&e.id===foe.id).map(e=>e.amount),[28,18,14]);assert(slowed);assert.equal(foe.slow,0);assert.equal(s.casts.length,0);
});

test('late boss pattern definitions expose readable safe zones, sequenced waves and interruptible channels',()=>{
 const state=createSession();for(const kind of ['riverLord','warMarshal'])for(let attack=1;attack<=3;attack++){
  const foe=makeEnemy(kind,900,800,'boss');foe.attacks=attack;const mark=lateBossForecast(state,foe);
  assert(mark.name&&mark.hint&&mark.skillId);assert(mark.total>0);if(attack===3)assert(mark.channeling&&mark.breakDamage>0);
  if(mark.shape==='ring')assert(mark.safeZones.length&&mark.innerRadius>18);
  if(kind==='warMarshal'&&attack===1)assert.equal(mark.followUps.length,2);
 }
});
