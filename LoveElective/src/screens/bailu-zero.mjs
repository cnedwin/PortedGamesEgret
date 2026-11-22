import * as sim from '../sim.mjs';
import {BAILU_ZERO_TITLE,BAILU_ZERO_STAGES} from '../data/bailu-zero.mjs';
import {bailuZeroScript} from '../story/bailu-zero.mjs';
import {playScript} from './story.mjs';

/** One appointment at a time. The map/phone offer the next saved appointment. */
export async function openBailuZero(game){
 const status=sim.bailuZeroStatus(game.state),checkpoint=sim.beginBailuZero(game.state);
 if(!checkpoint)return;
 const stage=status.stage,node=BAILU_ZERO_STAGES[stage];
 sim.enter(game.state,node.place);game.save();game.hideHud();
 await game.world.setScene(node.place,node.place==='rooftop'?'night':node.place==='library'?'day':'dusk');
 await game.fadeIn(.25);
 try{
  const result=await playScript(game,bailuZeroScript(stage),{girl:'bailu',checkpoint,light:'night'});
  if(result.completed&&sim.finishBailuZero(game.state,stage)){
   game.save();game.audio.play('good');
   game.toast(`${game.L(BAILU_ZERO_TITLE)} · ${game.L(stage===4?['特別篇完成','Interlude complete']:['紀錄已保存，下一步已標在地圖','Saved · next appointment marked on the map'])}`,'good');
  }else game.save();
 }finally{
  game.audio.stopVoice?.();game.audio.setMusic?.('campus');
  await game.fadeOut(.2);await game.world.hideActor();
 }
}
