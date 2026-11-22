import * as sim from '../sim.mjs';
import {SOCIAL_SCENES}from'../data/social-stories.mjs';
import {socialScript}from'../story/social-stories.mjs';
import {PLACES,SLOTS_OF_DAY}from'../data/places.mjs';
import {playScript}from'./story.mjs';

export async function openSocialStory(game,id,{returnToPlace=false}={}){
 const d=SOCIAL_SCENES[id],checkpoint=sim.beginSocial(game.state,id);if(!d||!checkpoint)return false;
 const {stage,outfit}=game.state.socialStories[id],previous=game.state.place;
 sim.enter(game.state,d.place);game.save();game.hideHud();
 await game.world.setScene(d.scene,id==='pajama'?'dusk':'night');await game.fadeIn(.2);
 try{
  const result=await playScript(game,socialScript(game.state,id,stage),{girl:d.lead,checkpoint,outfit:stage?outfit:null});
  if(result.completed&&sim.finishSocial(game.state,id,stage)){
   game.audio.play('good');game.toast(game.L(stage===0?['穿搭已保存，赴約入口已更新','Outfits saved; the meeting is ready']:stage===1?['新的稱呼、話題與下次邀約已記在手機','New names, topics and invitations are recorded on the phone']:['你們的約定已保存','Your shared promise is saved']),'good');
  }
  game.save();return result.completed;
 }finally{
  game.audio.stopVoice?.();game.audio.setMusic?.('campus');await game.fadeOut(.2);await game.world.hideActor();
  if(returnToPlace&&PLACES[previous]){sim.enter(game.state,previous);await game.world.setScene(PLACES[previous].scene,SLOTS_OF_DAY[game.state.slot].light);await game.fadeIn(.2);game.save();}
 }
}
