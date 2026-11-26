import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,createSaveSnapshot,dispatch,update} from '../src/sim/world.mjs';
import {ITEMS,MAPS} from '../src/sim/data.mjs';
import {canEquip,equipmentStats} from '../src/sim/arsenal.mjs';

// This oracle only uses a new game, normal movement/combat/interactions and real
// earned drops. It never teleports actors, edits HP, injects loot or grants gold.
test('a new character finishes both chapters, branching errands and two challenge runs using normal actions',()=>{
  let state=createSession();const history=[];
  const distance=point=>Math.hypot(state.hero.x-point.x,state.hero.y-point.y);
  function tick(){history.push(...update(state,1/60));}
  function travel(point,radius=65){
    assert(dispatch(state,{type:'moveTo',x:point.x,y:point.y}));
    for(let frame=0;frame<60*45&&distance(point)>radius&&state.phase==='play';frame++){
      if(state.hero.hp<55)dispatch(state,{type:'potion'});tick();
    }
    assert.equal(state.phase,'play','travel remains survivable');assert(distance(point)<=radius,'normal path reaches its destination');
  }
  function talk(id){travel(MAPS.city.npcs.find(npc=>npc.id===id));assert(dispatch(state,{type:'interact',id}));}
  function gate(id='portal'){
    travel(MAPS[state.mapId].portals.find(portal=>portal.id===id));assert(dispatch(state,{type:'interact',id}));
  }
  function equipBest(){
    const score=item=>{const data=equipmentStats(ITEMS[item.itemId],item.affixes);return data.attack+data.defense*2+data.maxHp*.1+data.speed*.1;};
    for(const slot of ['weapon','offhand','armor','boots','ring']){
      const best=state.inventory.filter(item=>ITEMS[item.itemId].slot===slot&&canEquip(ITEMS[item.itemId],state.profession,state.hero.level)).sort((a,b)=>score(b)-score(a))[0];
      if(best)assert(dispatch(state,{type:'equip',uid:best.uid}));
    }
  }
  function collectNearby(){
    for(const drop of [...state.drops].filter(drop=>distance(drop)<100))assert(dispatch(state,{type:'pickup',id:drop.id}));
    equipBest();
  }
  function fight(foe){
    if(!foe.dead)assert(dispatch(state,{type:'target',id:foe.id}));
    for(let frame=0;frame<60*65&&!foe.dead&&state.phase==='play';frame++){
      if(state.hero.hp<state.hero.maxHp*.62)dispatch(state,{type:'potion'});
      const skill=state.inventory.find(item=>item.uid===state.equipment.skill)?.itemId;
      if(distance(foe)<(skill==='wind-banner'?140:330))dispatch(state,{type:'artifact',x:foe.x,y:foe.y});
      if(distance(foe)<170)dispatch(state,{type:'rage'});tick();
    }
    assert.equal(state.phase,'play',`survived ${foe.name}`);assert(foe.dead,`defeated ${foe.name}`);collectNearby();
  }
  function collectEpics(){for(const drop of [...state.drops].filter(drop=>ITEMS[drop.itemId].tier==='epic')){
    travel(drop,55);assert(dispatch(state,{type:'pickup',id:drop.id}));
  }equipBest();}
  function checkpoint(){
    const before=createSaveSnapshot(state),ids=state.inventory.map(i=>i.uid).sort(),gold=state.hero.gold,attack=state.hero.attack;
    state=createSession(JSON.parse(JSON.stringify(before)));
    assert.deepEqual(state.inventory.map(i=>i.uid).sort(),ids);assert.equal(state.hero.gold,gold);assert.equal(state.hero.attack,attack);
    assert.equal(new Set(state.inventory.map(i=>i.uid)).size,state.inventory.length);
  }
  talk('elder');talk('apothecary');assert(dispatch(state,{type:'dialogueAction',id:'accept-herbs'}));
  talk('smith');assert(dispatch(state,{type:'dialogueAction',id:'accept-parts'}));gate();
  for(const foe of [...state.enemies].slice(0,6))fight(foe);
  for(const herb of [...state.gatherables]){
    travel(herb,55);assert(dispatch(state,{type:'gather',id:herb.id}));checkpoint();
    assert(!dispatch(state,{type:'gather',id:herb.id}),'reloading never renews a harvested herb');
  }
  fight(state.enemies.find(foe=>foe.kind==='boss'));collectEpics();gate();
  const firstReward=state.hero.gold;talk('elder');assert.equal(state.hero.gold,firstReward+100);assert.equal(state.quest.stage,'complete');checkpoint();
  talk('apothecary');assert.equal(state.sideQuests.herbs.stage,'ready');
  const herbGold=state.hero.gold,herbPotions=state.hero.potions;
  assert(dispatch(state,{type:'dialogueAction',id:'herbs-medicine'}));
  assert.equal(state.hero.gold,herbGold+30);assert.equal(state.hero.potions,herbPotions+5);
  assert(!dispatch(state,{type:'dialogueAction',id:'herbs-ring'}));
  talk('smith');assert.equal(state.sideQuests.parts.stage,'ready');assert(dispatch(state,{type:'dialogueAction',id:'parts-shield'}));equipBest();
  talk('elder');assert(dispatch(state,{type:'dialogueAction',id:'accept-pass'}));
  const banner=state.inventory.find(item=>item.itemId==='wind-banner');assert(banner);assert(dispatch(state,{type:'equip',uid:banner.uid}));
  gate('pass-gate');for(const foe of [...state.enemies])fight(foe);
  const lord=state.enemies.find(foe=>foe.kind==='windlord');assert(lord);fight(lord);collectEpics();gate();
  const secondReward=state.hero.gold;talk('elder');assert.equal(state.hero.gold,secondReward+160);assert.equal(state.chapter.stage,'complete');
  assert(state.inventory.some(item=>item.itemId==='wind-sword'));assert(state.inventory.some(item=>item.itemId==='wind-boots'));equipBest();checkpoint();
  const rewardGold=state.hero.gold;talk('elder');assert.equal(state.hero.gold,rewardGold);
  const completedEvents=history.filter(e=>(e.type==='quest'||e.type==='chapter'||e.type==='sideQuest')&&e.stage==='complete').length;
  for(let run=1;run<=2;run++){
    gate('trial-gate');assert.equal(state.worlds.trial.run,run);
    const ids=new Set(state.enemies.map(foe=>foe.id));assert.equal(ids.size,state.enemies.length);
    for(const foe of [...state.enemies])fight(foe);assert(state.worlds.trial.cleared);gate();
  }
  checkpoint();
  assert.equal(history.filter(e=>(e.type==='quest'||e.type==='chapter'||e.type==='sideQuest')&&e.stage==='complete').length,completedEvents);
  assert.equal(state.chapter.rewarded,true);assert.equal(state.sideQuests.herbs.choice,'herbs-medicine');assert.equal(state.sideQuests.parts.choice,'parts-shield');
  assert(history.some(e=>e.type==='artifactHit'&&e.phase==='return'));assert(history.some(e=>e.type==='skillPulse'));assert(history.some(e=>e.type==='rage'));
  assert(state.inventory.some(item=>item.itemId==='vanguard-shield'));
  assert(state.inventory.some(item=>ITEMS[item.itemId].slot==='boots'&&ITEMS[item.itemId].tier==='common'),'repeat challenges award forgeable basic gear; extra high rarity is rolled');
  for(const [vendor,itemId]of [['smith','bronze-sword'],['apothecary','potion'],['merchant','silver-ring']]){
    talk(vendor);assert(dispatch(state,{type:'dialogueAction',id:'open-shop'}));
    const offer=state.shop.offers.find(offer=>offer.itemId===itemId),gold=state.hero.gold,potions=state.hero.potions;
    assert(dispatch(state,{type:'buy',offerId:offer.id}));assert.equal(state.hero.gold,gold-offer.price);
    if(itemId==='potion')assert.equal(state.hero.potions,potions+offer.quantity);
    else{
      const bought=state.inventory.at(-1);assert.equal(bought.itemId,itemId);assert(dispatch(state,{type:'sell',uid:bought.uid}));
      assert.equal(state.hero.gold,gold-offer.price+ITEMS[itemId].sellPrice);
    }
  }
  checkpoint();
  assert(state.hero.gold>=0&&state.hero.potions>=0&&state.hero.anger>=0&&state.hero.anger<=100);
});
