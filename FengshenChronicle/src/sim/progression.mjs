import {CAMPAIGN_CHAPTERS,CHAPTER,ENEMIES,EQUIPMENT_SLOTS,ITEMS,MAPS,ROOM_SPAWNS,SHOPS,SIDE_QUESTS} from './data.mjs';
import {FORGE_RECIPES,canEquip,equipmentStats,isForgeIngredient,rareWeaponFor,rollDrop,rollForge,shopOffers,stockOffers} from './arsenal.mjs';
import {acceptCampaign,campaignDefaults,campaignKill,lateDialogue,restoreCampaign,sideReward} from './campaign.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const emit=(state,type,detail={})=>state.pendingEvents.push({type,...detail});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const say=(state,text)=>{state.notice=text;emit(state,'talk',{text});};
export const bagSize=state=>state.inventory.filter(i=>ITEMS[i.itemId]?.slot!=='skill').length;
export function makeEnemy(kind,x,y,id,run=1){
  const data=ENEMIES[kind],scale=1+Math.min(4,Math.max(0,run-1))*.08;
  return {id,kind,name:data.name,artKind:data.artKind??kind,x,y,hp:Math.round(data.hp*scale),maxHp:Math.round(data.hp*scale),
    radius:data.radius,facing:Math.PI/2,state:'idle',telegraph:null,cooldown:.6,dead:false,boss:Boolean(data.boss),elite:Boolean(data.elite),
    path:[],repath:0,attacks:0,run,guard:0};
}
export function makeRoom(mapId,run=1){
  const room={run,enemies:ROOM_SPAWNS[mapId].map(([kind,x,y],i)=>makeEnemy(kind,x,y,`${mapId==='trail'?'foe':mapId+'-'+run}-${i+1}`,run)),
    drops:[],gatherables:(MAPS[mapId].gatherables??[]).map(point=>({...point,collected:false})),cleared:false,bossSpawned:false};
  if(mapId==='pass'&&run>1){room.enemies.push(makeEnemy('windlord',1420,210,`windlord-${run}`,run));room.bossSpawned=true;}
  const campaign=CAMPAIGN_CHAPTERS[mapId];
  if(campaign&&run>1){room.enemies.push(makeEnemy(campaign.bossKind,campaign.boss.x,campaign.boss.y,`${campaign.bossKind}-${run}`,run));room.bossSpawned=true;}
  return room;
}
export function rpgDefaults(){
  const worlds=Object.fromEntries(Object.keys(ROOM_SPAWNS).map(id=>[id,makeRoom(id)]));
  return {worlds,trailState:worlds.trail,gatherables:[],chapter:{id:'windpass',stage:'locked',kills:0,rewarded:false},
    sideQuests:Object.fromEntries(Object.keys(SIDE_QUESTS).map(id=>[id,{stage:'available',amount:0,choice:null,rewarded:false}])),
    campaign:campaignDefaults(),resources:{herb:0,parts:0,survivors:0,beacons:0},dialogue:null,shop:null,forge:null,
    projectiles:[],casts:[],hazards:[],classEffect:null,skillEffect:null,rage:{phase:'idle',remaining:0,x:0,y:0,radius:185}};
}
export function grantItem(state,itemId,affixes){
  if(ITEMS[itemId].slot==='skill'){
    const existing=state.inventory.find(i=>i.itemId===itemId);if(existing)return existing.uid;
  }else if(bagSize(state)>=30){say(state,'行囊已满，请先出售或整理装备，再领取奖励。');return false;}
  const uid=`item-${state.nextId++}`;state.inventory.push({uid,itemId,...(affixes&&Object.keys(affixes).length?{affixes}:{})});
  emit(state,'reward',{itemId,uid,name:ITEMS[itemId].name});return uid;
}
export function grantRing(state){
  state.flags.artifactOwned=true;const uid=grantItem(state,'qiankun-ring');if(!state.equipment.skill)state.equipment.skill=uid;
}
export function syncRoom(state){
  if(state.mapId==='city')return;
  Object.assign(state.worlds[state.mapId],{enemies:state.enemies,drops:state.drops,gatherables:state.gatherables});
  state.trailState=state.worlds.trail;
}
export function enterRoom(state,mapId){
  state.dialogue=null;state.shop=null;state.forge=null;state.skillEffect=null;state.classEffect=null;
  state.projectiles=[];state.casts=[];state.hazards=[];state.rage.phase='idle';
  if(mapId==='city'){state.enemies=[];state.drops=[];state.gatherables=[];return;}
  let room=state.worlds[mapId];
  if(MAPS[mapId].repeatable&&room.cleared){
    room=makeRoom(mapId,room.run+1);state.worlds[mapId]=room;
    for(const node of room.gatherables)if(node.questId&&state.sideQuests[node.questId]?.rewarded)node.collected=true;
  }
  state.enemies=room.enemies;state.drops=room.drops;state.gatherables=room.gatherables;
}
export function restoreRpg(state,saved){
  const stages=['locked','offer','active','return','complete'];
  if(saved.chapter){
    if(!stages.includes(saved.chapter.stage)||!Number.isSafeInteger(saved.chapter.kills)||saved.chapter.kills<0)throw Error('Invalid chapter');
    state.chapter={...state.chapter,...saved.chapter,id:'windpass'};
  }else if(state.quest.stage==='complete')state.chapter.stage='offer';
  restoreCampaign(state,saved);
  for(const id of Object.keys(SIDE_QUESTS))if(saved.sideQuests?.[id]){
    const q=saved.sideQuests[id];if(!['available','active','ready','complete'].includes(q.stage))throw Error('Invalid side quest');
    state.sideQuests[id]={...state.sideQuests[id],...q};
  }
  for(const resource of Object.keys(state.resources)){
    const value=saved.resources?.[resource]??0;
    if(!Number.isSafeInteger(value)||value<0||value>10000)throw Error('Invalid resource');state.resources[resource]=value;
  }
  for(const mapId of Object.keys(ROOM_SPAWNS)){
    const room=mapId==='trail'?saved.trailState:saved.worlds?.[mapId];if(!room)continue;
    if(!Array.isArray(room.enemies)||!Array.isArray(room.drops)||room.enemies.some(e=>!ENEMIES[e.kind]||!['x','y','hp'].every(k=>Number.isFinite(e[k]))||e.hp<0)
      ||room.drops.some(d=>!ITEMS[d.itemId]||!Number.isFinite(d.x+d.y)))throw Error('Invalid room');
    const fresh=makeRoom(mapId,Math.max(1,Math.min(999,room.run??1)));
    state.worlds[mapId]={...fresh,...room,gatherables:Array.isArray(room.gatherables)?room.gatherables:fresh.gatherables};
    for(const foe of state.worlds[mapId].enemies)Object.assign(foe,{artKind:ENEMIES[foe.kind].artKind??foe.kind,path:[],repath:0,telegraph:null,cooldown:.7,state:foe.dead?'dead':'idle',guard:0});
  }
  state.trailState=state.worlds.trail;
  const savedEquipment={...saved.equipment,ring:saved.equipment?.ring??saved.equipment?.charm};
  for(const slot of EQUIPMENT_SLOTS){const uid=savedEquipment[slot];state.equipment[slot]=state.inventory.some(i=>i.uid===uid&&ITEMS[i.itemId].slot===slot&&canEquip(ITEMS[i.itemId],state.profession,state.hero.level))?uid:null;}
  state.equipment.charm=null;
  if(state.flags.artifactOwned&&!state.inventory.some(i=>i.itemId==='qiankun-ring'))grantRing(state);
  // An intentional empty skill slot in a new save remains empty.
  if(!Object.hasOwn(saved.equipment??{},'skill')&&state.flags.artifactOwned)state.equipment.skill=state.inventory.find(i=>i.itemId==='qiankun-ring')?.uid??null;
  state.hero.anger=Math.max(0,Math.min(100,Number.isFinite(saved.hero.anger)?saved.hero.anger:0));state.hero.ward=0;
  if(state.mapId!=='city'){
    const room=state.worlds[state.mapId];state.enemies=room.enemies;state.drops=room.drops;state.gatherables=room.gatherables;
  }
  refreshSideQuests(state);
}
export function rpgSnapshot(state){
  syncRoom(state);return {worlds:state.worlds,chapter:state.chapter,campaign:state.campaign,sideQuests:state.sideQuests,resources:state.resources,profession:state.profession};
}
export function refreshSideQuests(state){
  for(const [id,data]of Object.entries(SIDE_QUESTS)){
    const q=state.sideQuests[id];q.amount=state.resources[data.resource];
    if(q.stage==='active'||q.stage==='ready'){
      const stage=q.amount>=data.required?'ready':'active';
      if(q.stage!==stage){q.stage=stage;emit(state,'sideQuest',{id,stage:q.stage});}
    }
  }
}
export function addResource(state,itemId,amount){
  const key=ITEMS[itemId]?.resource;if(!key)return false;
  state.resources[key]=Math.min(10000,state.resources[key]+Math.max(1,Math.floor(amount)));refreshSideQuests(state);return true;
}
export function afterKill(state,foe,{drop,random}){
  if(['raider','shaman','guard','slinger','sentinel','channeler'].includes(foe.kind))drop(state,'scrap-iron',foe.x-20,foe.y+12,foe.elite?2:1);
  const rolled=rollDrop({mapId:state.mapId,kind:foe.boss?'boss':foe.elite?'elite':'normal',level:state.hero.level,seed:state.seed,profession:state.profession});
  state.seed=rolled.seed;if(rolled.itemId)drop(state,rolled.itemId,foe.x+25,foe.y-8,1,rolled.affixes);
  if(state.mapId==='trail')return false;
  const room=state.worlds[state.mapId];
  if(CAMPAIGN_CHAPTERS[state.mapId]){
    campaignKill(state,foe,{drop,makeEnemy});
    if(!foe.boss&&random(state)<.3)drop(state,'potion',foe.x-10,foe.y);
    if(room.cleared)emit(state,'roomClear',{mapId:state.mapId,run:room.run});
    return true;
  }
  if(state.mapId==='pass'){
    if(!foe.boss&&state.chapter.stage==='active'){
      state.chapter.kills++;emit(state,'chapter',{id:'windpass',stage:'active',kills:state.chapter.kills});
      if(state.chapter.kills>=CHAPTER.requiredKills&&!room.bossSpawned){
        room.bossSpawned=true;const boss=makeEnemy('windlord',1420,210,`windlord-${room.run}`,room.run);state.enemies.push(boss);
        emit(state,'bossSpawn',{id:boss.id,x:boss.x,y:boss.y,name:boss.name});
      }
    }
    if(foe.kind==='windlord'){
      if(!state.flags.windlordDefeated){
        state.flags.windlordDefeated=true;drop(state,state.profession==='guard'?'wind-sword':rareWeaponFor(state.profession,2),foe.x-18,foe.y);drop(state,'storm-ring',foe.x+18,foe.y);
        state.chapter.stage='return';emit(state,'chapter',{id:'windpass',stage:'return'});
        emit(state,'victory',{chapterId:'windpass',x:foe.x,y:foe.y});
      }
    }
  }
  if(state.mapId==='trial'&&foe.boss){
    if(room.run===1)drop(state,'vanguard-shield',foe.x-15,foe.y);
    else{
      const basics=shopOffers('merchant',state.hero.level,state.profession).filter(offer=>ITEMS[offer.itemId].slot==='boots');
      const best=basics.sort((a,b)=>b.unlockLevel-a.unlockLevel)[0];
      drop(state,best?.itemId??'trail-boots',foe.x-15,foe.y);
    }
    drop(state,'potion',foe.x+25,foe.y,2);emit(state,'challengeComplete',{mapId:'trial',run:room.run,x:foe.x,y:foe.y});
  }else if(!foe.boss&&random(state)<.3)drop(state,'potion',foe.x-10,foe.y);
  if(state.enemies.every(e=>e.dead)){room.cleared=true;emit(state,'roomClear',{mapId:state.mapId,run:room.run});}
  return true;
}
function npcNear(state,npcId){return MAPS[state.mapId].npcs.find(n=>n.id===npcId&&distance(n,state.hero)<=140);}
function option(id,label,enabled=true,kind='quest'){return {id,label,enabled,kind};}
function stopForConversation(state){
  state.path=[];state.moveTarget=null;state.autoAttack=false;state.targetId=null;
  if(state.hero.action==='walk')state.hero.action='idle';
}
export function sideQuestUnlocked(state,id){
  if(id==='ferry')return state.chapter.stage==='complete';
  if(id==='beacons')return state.campaign.ford.stage==='complete';
  return id==='herbs'||id==='parts';
}
export function openShop(state,npcId){
  const npc=npcNear(state,npcId),shop=SHOPS[npcId];if(!npc||!shop)return false;
  stopForConversation(state);
  state.dialogue=null;state.forge=null;
  state.shop={npcId,name:shop.name,offers:clone(stockOffers(npcId,state.profession)).map(offer=>({...offer,enabled:offer.unlockLevel<=state.hero.level})),buybackRate:.4};
  emit(state,'shop',{npcId});return true;
}
export function openDialogue(state,npcId){
  const npc=npcNear(state,npcId);if(!npc)return false;refreshSideQuests(state);
  stopForConversation(state);
  let text='',options=[];
  if(npcId==='elder'){
    if(state.chapter.stage==='offer'){text='这方印上缺了一瓣云纹。铜关烽台下埋着另一瓣，阵主正在借它倒转山风，令守军认不得归路。去关里寻阵眼。我给你一面回风幡，近身能挡住头一阵风，与乾坤圈择一装配。';options.push(option('accept-pass','领命：铜关回风'));}
    else if(state.chapter.stage==='active')text=CHAPTER.descriptions.active+`（守军 ${state.chapter.kills}/${CHAPTER.requiredKills}）`;
    else if(state.chapter.stage==='return')text=CHAPTER.descriptions.return;
    else if(state.chapter.stage==='complete')text='今早铜关终于按时燃起烽火。你带回的雷印合上了古道那半瓣，两个村子的驿卒都能回家了。青禾把旧营整成了校场，有余力便去试试新军械。';
    else text=state.quest.stage==='hunt'?'昨夜有驿卒循着人声走进雾里，再也没回城。雾借人声引路，却怕铜器震响。持乾坤圈去古道除掉六名邪祟，逼幕后主将现身。圈回来时还能再打一次，别站在敌人的蓄力圈里。':'先平定古道，再来问铜关之事。';
    if(state.chapter.stage==='complete'){
      const late=lateDialogue(state);if(late){text=late.text;options.push(...late.options);}
    }
  }else if(npcId==='smith'||npcId==='apothecary'){
    const id=npcId==='smith'?'parts':'herbs',q=state.sideQuests[id],data=SIDE_QUESTS[id];
    text=npcId==='smith'?'那几副旧甲是我和师父一起敲出来的。守关的人失踪后，甲片散在古道兵卒手里。帮我找回三片，我会把旧甲锻成盾或履，让它们再护送一个人归家。':'昨夜逃回来的驿卒总说听见山在喊他。清心草能让他睡一觉，古道背阴处长着它。替我采三株，回来可带一包药，或戴上我家传的养心环。';
    if(q.stage==='available')options.push(option('accept-'+id,'接下：'+data.name));
    if(q.stage==='active')text+=` 已收集 ${q.amount}/${data.required}。`;
    if(q.stage==='ready'){
      text+=' 物料齐了，谢礼由你挑选。';
      if(id==='herbs')options.push(option('herbs-medicine','换回春散五份与三十文'),option('herbs-ring','换辛夷养心环'));
      else options.push(option('parts-shield','锻铸纹铜盾'),option('parts-boots','锻轻行履'));
    }
    if(q.stage==='complete')text+=' 上次相助已经记下，谢礼只领一次。';
    options.push(option('open-shop','看看货物',true,'shop'));
    if(npcId==='smith')options.push(option('open-forge','熔铸与精锻',true,'forge'));
  }else if(npcId==='merchant'){
    text='往铜关的车队停了三天。我把防滑的履和护行银环留下，等还肯走山路的人。旧装我收，你先看看鞋底磨不磨脚。';options.push(option('open-shop','买卖行装',true,'shop'));
  }else if(npcId==='scout'){
    text='演武旧营已立起阵旗。每次清营后再入，敌军与战利品重整，军功任务不会重新发赏。';
    options.push(option('enter-trial','进入演武旧营',state.quest.stage!=='unaccepted'));
  }
  for(const id of ['ferry','beacons']){
    const data=SIDE_QUESTS[id],q=state.sideQuests[id];if(data.npcId!==npcId)continue;
    const unlocked=sideQuestUnlocked(state,id);
    if(q.stage==='available')options.push(option('accept-'+id,'接下：'+data.name,unlocked));
    if(q.stage==='active')text+=` ${data.description}（${q.amount}/${data.required}）`;
    if(q.stage==='ready'){
      text+=' 你已办妥，谢礼由你挑选。';
      if(id==='ferry')options.push(option('ferry-medicine','领六份药与八十文'),option('ferry-ring','领护行铜瑗'));
      else options.push(option('beacons-gold','领一百四十文军饷'),option('beacons-supply','领八份药与六份锻材'));
    }
    if(q.stage==='complete')text+=' 这份恩情已经记下，不会重复发赏。';
  }
  options.push(option('close','告辞',true,'close'));
  state.shop=null;state.forge=null;state.dialogue={npcId,name:npc.name,portraitId:npcId,text,options};say(state,text);emit(state,'dialogue',{npcId});return true;
}
function openForge(state){
  if(!npcNear(state,'smith'))return false;stopForConversation(state);
  state.dialogue=null;state.shop=null;state.forge={npcId:'smith',recipes:clone(FORGE_RECIPES)};return true;
}
export function townAction(state,action,{changeMap,stats}){
  switch(action.type){
    case 'closeDialogue':state.dialogue=null;return true;
    case 'closeShop':state.shop=null;return true;
    case 'closeForge':state.forge=null;return true;
    case 'openForge':return openForge(state);
    case 'forge':{
      if(!state.forge||!npcNear(state,'smith'))return false;
      const recipe=FORGE_RECIPES.find(r=>r.id===action.recipeId),uids=action.uids;
      if(!recipe||state.hero.level<recipe.unlockLevel||!Array.isArray(uids)||uids.length!==recipe.count||new Set(uids).size!==uids.length
        ||state.hero.gold<recipe.gold||state.resources.parts<recipe.parts)return false;
      const inputs=uids.map(uid=>state.inventory.find(item=>item.uid===uid));
      if(inputs.some(item=>!item||Object.values(state.equipment).includes(item.uid)||!isForgeIngredient(ITEMS[item.itemId],recipe,state.profession)))return false;
      const result=rollForge({recipeId:recipe.id,seed:state.seed,level:state.hero.level,profession:state.profession});
      if(!result||!ITEMS[result.itemId])return false;
      state.inventory=state.inventory.filter(item=>!uids.includes(item.uid));
      state.hero.gold-=recipe.gold;state.resources.parts-=recipe.parts;state.seed=result.seed;
      const uid=grantItem(state,result.itemId,result.affixes);refreshSideQuests(state);stats(state);
      emit(state,'forge',{recipeId:recipe.id,itemId:result.itemId,uid,affixes:result.affixes});return true;
    }
    case 'openShop':return openShop(state,action.id);
    case 'buy':{
      const shop=state.shop;if(!shop||!npcNear(state,shop.npcId))return false;
      const offer=shopOffers(shop.npcId,state.hero.level,state.profession).find(o=>o.id===action.offerId);if(!offer||state.hero.gold<offer.price)return false;
      if(ITEMS[offer.itemId].slot&&!canEquip(ITEMS[offer.itemId],state.profession,state.hero.level))return false;
      if(ITEMS[offer.itemId].slot==='skill'&&state.inventory.some(i=>i.itemId===offer.itemId)){say(state,'这门法宝已在行囊中。');return false;}
      if(ITEMS[offer.itemId].consumable||offer.itemId==='potion'){
        const key=ITEMS[offer.itemId].consumable??'potions';
        if((state.hero[key]??0)+offer.quantity>99)return false;state.hero[key]=(state.hero[key]??0)+offer.quantity;
      }else if(!grantItem(state,offer.itemId))return false;
      state.hero.gold-=offer.price;emit(state,'buy',{npcId:shop.npcId,itemId:offer.itemId,price:offer.price});return true;
    }
    case 'sell':{
      const shop=state.shop;if(!shop||!npcNear(state,shop.npcId))return false;
      const item=state.inventory.find(i=>i.uid===action.uid),data=ITEMS[item?.itemId];
      if(!item||!data.sellPrice||data.sellable===false||Object.values(state.equipment).includes(item.uid))return false;
      state.inventory.splice(state.inventory.indexOf(item),1);state.hero.gold+=data.sellPrice;
      emit(state,'sell',{uid:item.uid,itemId:item.itemId,gold:data.sellPrice});return true;
    }
    case 'dialogueAction':{
      const d=state.dialogue;if(!d||!npcNear(state,d.npcId)||!d.options.some(o=>o.id===action.id&&o.enabled))return false;
      if(action.id==='close'){state.dialogue=null;return true;}
      if(action.id==='open-shop')return openShop(state,d.npcId);
      if(action.id==='open-forge')return openForge(state);
      if(action.id==='enter-trial'){changeMap(state,'trial');return true;}
      if(action.id==='accept-pass'){
        if(state.chapter.stage!=='offer'||!grantItem(state,'wind-banner'))return false;
        state.chapter.stage='active';state.flags.passUnlocked=true;emit(state,'chapter',{id:'windpass',stage:'active'});
        return openDialogue(state,'elder');
      }
      if(action.id==='accept-ford'||action.id==='accept-siege'){
        if(!acceptCampaign(state,action.id.slice(7)))return false;return openDialogue(state,'elder');
      }
      for(const id of Object.keys(SIDE_QUESTS)){
        const q=state.sideQuests[id],data=SIDE_QUESTS[id];
        if(action.id==='accept-'+id&&q.stage==='available'){
          q.stage='active';refreshSideQuests(state);emit(state,'sideQuest',{id,stage:q.stage});return openDialogue(state,d.npcId);
        }
        if(action.id.startsWith(id+'-')&&q.stage==='ready'&&!q.rewarded&&state.resources[data.resource]>=data.required){
          const reward=action.id==='herbs-ring'?'verdant-ring':action.id==='parts-shield'?'bronze-shield':action.id==='parts-boots'?'march-boots':null;
          if(reward&&!grantItem(state,reward))return false;
          if(action.id==='herbs-medicine'){state.hero.potions=Math.min(99,state.hero.potions+5);state.hero.gold+=30;}
          if((id==='ferry'||id==='beacons')&&!sideReward(state,action.id,grantItem))return false;
          state.resources[data.resource]-=data.required;Object.assign(q,{stage:'complete',choice:action.id,rewarded:true});
          emit(state,'sideQuest',{id,stage:'complete',choice:action.id});refreshSideQuests(state);stats(state);return openDialogue(state,d.npcId);
        }
      }
      return false;
    }
    case 'gather':{
      const node=state.gatherables.find(n=>n.id===action.id&&!n.collected);if(!node||distance(node,state.hero)>80)return false;
      if(node.questId&&state.enemies.some(foe=>!foe.dead&&distance(foe,node)<140)){
        say(state,'附近仍有邪祟守卫，先清出安全地带。');return false;
      }
      node.collected=true;addResource(state,node.itemId,1);emit(state,'gather',{id:node.id,itemId:node.itemId,x:node.x,y:node.y,amount:1});return true;
    }
    default:return null;
  }
}
