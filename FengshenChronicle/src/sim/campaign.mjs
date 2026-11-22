import {CAMPAIGN_CHAPTERS,ITEMS} from './data.mjs';
import {rareWeaponFor} from './arsenal.mjs';
const emit=(state,type,detail={})=>state.pendingEvents.push({type,...detail});
export const CAMPAIGN_IDS=['ford','siege'];
export function campaignDefaults(){return Object.fromEntries(CAMPAIGN_IDS.map(id=>[id,{stage:'locked',kills:0,rewarded:false}]));}
export function restoreCampaign(state,saved){
 const stages=['locked','offer','active','return','complete'];
 for(const id of CAMPAIGN_IDS)if(saved.campaign?.[id]){
  const value=saved.campaign[id];if(!stages.includes(value.stage)||!Number.isSafeInteger(value.kills)||value.kills<0)throw Error('Invalid campaign');
  state.campaign[id]={...state.campaign[id],...value};
 }
 if(state.chapter.stage==='complete'&&state.campaign.ford.stage==='locked')state.campaign.ford.stage='offer';
 if(state.campaign.ford.stage==='complete'&&state.campaign.siege.stage==='locked')state.campaign.siege.stage='offer';
}
export function lateDialogue(state){
 for(const id of CAMPAIGN_IDS){
  const progress=state.campaign[id],data=CAMPAIGN_CHAPTERS[id];
  if(progress.stage==='offer')return {text:data.descriptions.offer,options:[{id:'accept-'+id,label:'领命：'+data.name,enabled:true,kind:'quest'}]};
  if(progress.stage==='active'||progress.stage==='return')return {text:data.descriptions[progress.stage]+(progress.stage==='active'?`（守军 ${progress.kills}/${data.requiredKills}）`:''),options:[]};
 }
 if(state.campaign.siege.stage==='complete')return {text:CAMPAIGN_CHAPTERS.siege.descriptions.complete,options:[]};
 return null;
}
export function acceptCampaign(state,id){
 const progress=state.campaign[id],data=CAMPAIGN_CHAPTERS[id];if(!progress||progress.stage!=='offer')return false;
 progress.stage='active';emit(state,'campaign',{id:data.id,mapId:id,stage:'active'});return true;
}
export function claimCampaign(state,grantItem){
 const id=CAMPAIGN_IDS.find(id=>state.campaign[id].stage==='return'&&!state.campaign[id].rewarded);
 if(!id)return null;
 const data=CAMPAIGN_CHAPTERS[id];if(!grantItem(state,data.reward))return false;
 state.hero.gold+=data.gold;Object.assign(state.campaign[id],{stage:'complete',rewarded:true});
 if(id==='ford'&&state.campaign.siege.stage==='locked')state.campaign.siege.stage='offer';
 emit(state,'campaign',{id:data.id,mapId:id,stage:'complete',gold:data.gold});
 emit(state,'campaignComplete',{chapterId:data.id,x:state.hero.x,y:state.hero.y});return true;
}
export function campaignKill(state,foe,{drop,makeEnemy}){
 const id=state.mapId,data=CAMPAIGN_CHAPTERS[id];if(!data)return false;
 const progress=state.campaign[id],room=state.worlds[id];
 if(!foe.boss&&progress.stage==='active'){
  progress.kills++;emit(state,'campaign',{id:data.id,mapId:id,stage:'active',kills:progress.kills});
  if(progress.kills>=data.requiredKills&&!room.bossSpawned){
   room.bossSpawned=true;const boss=makeEnemy(data.bossKind,data.boss.x,data.boss.y,`${data.bossKind}-${room.run}`,room.run);state.enemies.push(boss);
   emit(state,'bossSpawn',{id:boss.id,name:boss.name,x:boss.x,y:boss.y});
  }
 }
 if(foe.kind===data.bossKind&&progress.stage==='active'){
  progress.stage='return';const weapon=rareWeaponFor(state.profession,id==='ford'?2:3);
  drop(state,weapon,foe.x-18,foe.y);drop(state,'scrap-iron',foe.x+25,foe.y,3);
  emit(state,'campaign',{id:data.id,mapId:id,stage:'return'});emit(state,'victory',{chapterId:data.id,mapId:id,x:foe.x,y:foe.y});
 }
 if(state.enemies.every(enemy=>enemy.dead))room.cleared=true;
 return true;
}
export function sideReward(state,choice,grantItem){
 const itemId=choice==='ferry-ring'?'wayfarer-ring':null;
 if(itemId&&!grantItem(state,itemId))return false;
 if(choice==='ferry-medicine'){state.hero.gold+=80;state.hero.potions=Math.min(99,state.hero.potions+6);}
 if(choice==='beacons-gold')state.hero.gold+=140;
 if(choice==='beacons-supply'){state.resources.parts+=6;state.hero.potions=Math.min(99,state.hero.potions+8);}
 return true;
}
