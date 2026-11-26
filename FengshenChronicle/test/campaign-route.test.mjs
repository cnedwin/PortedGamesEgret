import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,createSaveSnapshot,dispatch,update,nextRecovery} from '../src/sim/world.mjs';
import {ITEMS,MAPS} from '../src/sim/data.mjs';
import {PROFESSIONS,canEquip,equipmentStats} from '../src/sim/arsenal.mjs';
import {forecastHits} from '../src/sim/campaign-ai.mjs';

// Every position, resource, level and item in this oracle is earned through
// normal movement, battles, gathering, dialogue, purchases or forging.
for(const profession of ['guard','ranger','ritualist'])test(`${profession} earns the complete four-chapter campaign and its profession kit`,t=>{
 let state=createSession(null,{profession,seed:74123});const history=[],bossMetrics=[],globalBossMetrics=[],bossOnsets=new Map();
 const dist=point=>Math.hypot(state.hero.x-point.x,state.hero.y-point.y);
 const role=PROFESSIONS[profession];
 function tick(input={}){
  const before=new Map(state.enemies.filter(foe=>foe.boss).map(foe=>[foe.id,{hp:Math.min(foe.maxHp,foe.hp+state.pendingEvents.filter(e=>e.type==='hit'&&e.id===foe.id).reduce((n,e)=>n+e.amount,0)),maxHp:foe.maxHp}]));
  const events=update(state,1/60,input);history.push(...events);
  for(const event of events){
   const foe=state.enemies.find(foe=>foe.id===event.id);if(!foe?.boss)continue;
   if(event.type==='hit'){
    if(!bossOnsets.has(foe.id))bossOnsets.set(foe.id,{first:state.time,hpAtFirst:before.get(foe.id)?.hp??foe.maxHp,maxHp:foe.maxHp,causes:{},health:before.get(foe.id)?.hp??foe.maxHp});
    const tracker=bossOnsets.get(foe.id),damage=Math.min(tracker.health,event.amount);tracker.health-=damage;
    tracker.causes[event.cause]=(tracker.causes[event.cause]??0)+damage;
   }
   if(event.type==='kill'){
    const tracker=bossOnsets.get(foe.id);globalBossMetrics.push({boss:foe.kind,hpAtFirst:tracker.hpAtFirst,maxHp:tracker.maxHp,
     seconds:+(state.time-tracker.first).toFixed(2),causes:tracker.causes});
   }
  }
 }
 function heal(){if(state.hero.hp<state.hero.maxHp*.65)dispatch(state,{type:'potion'});}
 function travel(point,radius=65){
  assert(dispatch(state,{type:'moveTo',x:point.x,y:point.y}));
  for(let i=0;i<60*55&&dist(point)>radius&&state.phase==='play';i++){heal();tick();}
  assert.equal(state.phase,'play','travel survived');assert(dist(point)<=radius,`reachable ${state.mapId} ${point.x},${point.y}`);
 }
 function talk(id){travel(MAPS.city.npcs.find(n=>n.id===id));assert(dispatch(state,{type:'interact',id}));}
 function gate(id='portal'){travel(MAPS[state.mapId].portals.find(p=>p.id===id));assert(dispatch(state,{type:'interact',id}));}
 const score=instance=>{const d=equipmentStats(ITEMS[instance.itemId],instance.affixes);return d.attack+d.defense*2+d.maxHp*.12+d.speed*.08;};
 function equip(){for(const slot of ['weapon','armor','offhand','boots','ring']){
  const item=state.inventory.filter(i=>ITEMS[i.itemId].slot===slot&&canEquip(ITEMS[i.itemId],profession,state.hero.level)).sort((a,b)=>score(b)-score(a))[0];
  if(item)assert(dispatch(state,{type:'equip',uid:item.uid}));
 }}
 function loot(){for(const drop of [...state.drops].filter(d=>dist(d)<100)){
  if(ITEMS[drop.itemId].slot&&state.inventory.filter(i=>ITEMS[i.itemId].slot!=='skill').length>=30)continue;
  assert(dispatch(state,{type:'pickup',id:drop.id}));
 }equip();}
 function walkable(point){const map=MAPS[state.mapId],r=18;return point.x>=r&&point.y>=r&&point.x<=map.width-r&&point.y<=map.height-r
  &&!map.obstacles.some(o=>point.x>o.x-r&&point.x<o.x+o.width+r&&point.y>o.y-r&&point.y<o.y+o.height+r);}
 function safePoint(marks){
  const candidates=[];
  for(const mark of marks)for(const safe of mark.safeZones??[]){
   const dx=state.hero.x-safe.x,dy=state.hero.y-safe.y,d=Math.max(1,Math.hypot(dx,dy)),radius=Math.max(0,safe.radius-28);
   candidates.push({x:safe.x+dx/d*radius,y:safe.y+dy/d*radius});
  }
  const target=state.enemies.find(foe=>foe.id===state.targetId&&!foe.dead);
  if(target)for(let i=0;i<16;i++)candidates.push({x:target.x+Math.cos(i*Math.PI/8)*role.chaseRange,y:target.y+Math.sin(i*Math.PI/8)*role.chaseRange});
  for(const length of [80,100,120,160,260,360])for(let i=0;i<16;i++)candidates.push({x:state.hero.x+Math.cos(i*Math.PI/8)*length,y:state.hero.y+Math.sin(i*Math.PI/8)*length});
  return candidates.filter(p=>walkable(p)&&marks.every(mark=>!forecastHits(p,mark))).sort((a,b)=>dist(a)-dist(b))[0];
 }
 function fight(foe){
  if(foe.dead){loot();return;}
  const started=state.time,eventStart=history.length,level=state.hero.level,attack=state.hero.attack,defense=state.hero.defense,hpAtStart=foe.hp;
  assert(dispatch(state,{type:'target',id:foe.id}));let dodgeUntil=0;
  for(let i=0;i<60*100&&!foe.dead&&state.phase==='play';i++){
   heal();
   const marks=state.enemies.filter(f=>!f.dead&&f.telegraph).flatMap(f=>[f.telegraph,...(f.telegraph.extra??[])]).concat(state.hazards);
   const threatening=marks.filter(mark=>forecastHits(state.hero,mark));
   if(threatening.length&&state.time>=dodgeUntil){
    const point=safePoint(marks);if(point&&dispatch(state,{type:'moveTo',x:point.x,y:point.y}))dodgeUntil=state.time+Math.max(...threatening.map(m=>m.remaining))+.09;
   }
   if(state.time>=dodgeUntil&&!state.autoAttack)dispatch(state,{type:'target',id:foe.id});
   if(dist(foe)<role.active.range)dispatch(state,{type:'classSkill',x:foe.x,y:foe.y});
   if(dist(foe)<330)dispatch(state,{type:'artifact',x:foe.x,y:foe.y});
   if(dist(foe)<Math.max(170,role.rage.range))dispatch(state,{type:'rage',x:foe.x,y:foe.y});
   if(dodgeUntil>state.time&&dist(foe)<role.reach)dispatch(state,{type:'attack'});
   tick();
  }
  assert.equal(state.phase,'play',`${profession} survived ${foe.kind}`);assert(foe.dead,`${profession} defeated ${foe.kind}`);
  if(foe.boss){const events=history.slice(eventStart);bossMetrics.push({boss:foe.kind,hpAtStart,maxHp:foe.maxHp,level,attack,defense,seconds:+(state.time-started).toFixed(2),
   recoveries:events.filter(e=>e.type==='heal').length,damageReceived:events.filter(e=>e.type==='hit'&&e.id==='hero').reduce((n,e)=>n+e.amount,0),
   skills:[...new Set(events.filter(e=>e.type==='telegraph'&&e.id===foe.id).map(e=>e.kind))]});}
  loot();
 }
 function claimDrops(){for(const drop of [...state.drops].filter(d=>ITEMS[d.itemId].tier==='rare'||ITEMS[d.itemId].tier==='epic'||ITEMS[d.itemId].tier==='legendary')){
  if(state.inventory.filter(i=>ITEMS[i.itemId].slot!=='skill').length>=30)break;travel(drop,55);dispatch(state,{type:'pickup',id:drop.id});
 }equip();}
 function gather(node){
  travel(node,55);
  if(dispatch(state,{type:'gather',id:node.id}))return;
  for(const foe of [...state.enemies].filter(foe=>!foe.dead&&Math.hypot(foe.x-node.x,foe.y-node.y)<140))fight(foe);
  travel(node,55);assert(dispatch(state,{type:'gather',id:node.id}),'rescue/disable after clearing the actual nearby defenders');
 }
 function checkpoint(){tick();const before=createSaveSnapshot(state),gold=state.hero.gold,atk=state.hero.attack,inventory=structuredClone(state.inventory);
  state=createSession(JSON.parse(JSON.stringify(before)),{profession:'other',seed:0});assert.equal(state.profession,profession);assert.equal(state.hero.gold,gold);assert.equal(state.hero.attack,atk);assert.deepEqual(state.inventory,inventory);
 }
 function sellSpare(){talk('merchant');dispatch(state,{type:'dialogueAction',id:'open-shop'});
  for(const item of [...state.inventory])if(!Object.values(state.equipment).includes(item.uid)&&ITEMS[item.itemId].slot!=='skill')dispatch(state,{type:'sell',uid:item.uid});
  dispatch(state,{type:'closeShop'});
 }
 talk('elder');talk('apothecary');dispatch(state,{type:'dialogueAction',id:'accept-herbs'});talk('smith');dispatch(state,{type:'dialogueAction',id:'accept-parts'});gate();
 for(const foe of [...state.enemies].slice(0,6))fight(foe);
 for(const node of [...state.gatherables]){travel(node,55);assert(dispatch(state,{type:'gather',id:node.id}));}
 for(const drop of [...state.drops].filter(drop=>drop.itemId==='scrap-iron')){travel(drop,55);assert(dispatch(state,{type:'pickup',id:drop.id}));}
 fight(state.enemies.find(f=>f.kind==='boss'));claimDrops();gate();talk('elder');assert.equal(state.quest.stage,'complete');
 talk('apothecary');assert(dispatch(state,{type:'dialogueAction',id:'herbs-medicine'}));talk('smith');assert(dispatch(state,{type:'dialogueAction',id:'parts-shield'}));equip();
 talk('elder');dispatch(state,{type:'dialogueAction',id:'accept-pass'});gate('pass-gate');for(const foe of [...state.enemies])fight(foe);fight(state.enemies.find(f=>f.kind==='windlord'));claimDrops();gate();talk('elder');equip();checkpoint();
 // Forge uses two legally purchased common inputs and earned scrap/coins.
 talk('smith');dispatch(state,{type:'dialogueAction',id:'open-shop'});const inputUids=[];
 for(let i=0;i<2;i++){assert(dispatch(state,{type:'buy',offerId:'smith-linen-armor'}));inputUids.push(state.inventory.at(-1).uid);}
 assert(dispatch(state,{type:'openForge'}));const goldBefore=state.hero.gold,partsBefore=state.resources.parts;
 assert(dispatch(state,{type:'forge',recipeId:'fine-armor-1',uids:inputUids}));assert.equal(state.hero.gold,goldBefore-44);assert.equal(state.resources.parts,partsBefore-2);
 const forged=state.inventory.at(-1);assert.equal(forged.itemId,'fine-armor-1');assert(Object.keys(forged.affixes).length>0);equip();checkpoint();
 talk('merchant');assert(dispatch(state,{type:'dialogueAction',id:'accept-ferry'}));talk('elder');assert(dispatch(state,{type:'dialogueAction',id:'accept-ford'}));gate('ford-gate');
 for(const foe of [...state.enemies]){fight(foe);const boss=state.enemies.find(f=>f.kind==='riverLord');if(boss){fight(boss);break;}}
 for(const foe of [...state.enemies].filter(f=>!f.dead))fight(foe);
 for(const node of [...state.gatherables]){gather(node);checkpoint();assert(!dispatch(state,{type:'gather',id:node.id}));}
 claimDrops();gate();
 const fordGold=state.hero.gold;talk('elder');assert.equal(state.hero.gold,fordGold+260);assert.equal(state.campaign.ford.stage,'complete');equip();
 talk('merchant');assert(dispatch(state,{type:'dialogueAction',id:'ferry-medicine'}));talk('scout');assert(dispatch(state,{type:'dialogueAction',id:'accept-beacons'}));sellSpare();
 talk('elder');assert(dispatch(state,{type:'dialogueAction',id:'accept-siege'}));gate('siege-gate');
 for(const foe of [...state.enemies]){fight(foe);const boss=state.enemies.find(f=>f.kind==='warMarshal');if(boss){fight(boss);break;}}
 for(const foe of [...state.enemies].filter(f=>!f.dead))fight(foe);
 for(const node of [...state.gatherables])gather(node);
 claimDrops();gate();
 const siegeGold=state.hero.gold;talk('elder');assert.equal(state.hero.gold,siegeGold+400);assert.equal(state.campaign.siege.stage,'complete');
 talk('scout');assert(dispatch(state,{type:'dialogueAction',id:'beacons-supply'}));equip();checkpoint();
 const rewardGold=state.hero.gold;talk('elder');assert.equal(state.hero.gold,rewardGold);
 talk('apothecary');dispatch(state,{type:'dialogueAction',id:'open-shop'});
 if(state.hero.level>=8){assert(dispatch(state,{type:'buy',offerId:'apothecary-recovery-pill'}));assert(state.hero.tonics>0);}
 checkpoint();assert(history.some(e=>e.type==='classSkill'));assert(history.some(e=>e.type==='rage'));assert(history.some(e=>e.type==='forge'));
 for(const metric of bossMetrics.filter(m=>m.boss==='riverLord'||m.boss==='warMarshal'))assert.equal(metric.skills.length,3,'new bosses naturally forecast all three patterns');
 assert.equal(state.sideQuests.ferry.rewarded,true);assert.equal(state.sideQuests.beacons.rewarded,true);
 t.diagnostic(JSON.stringify({profession,level:state.hero.level,gold:state.hero.gold,potions:state.hero.potions,tonics:state.hero.tonics,bossMetrics,globalBossMetrics}));
});
