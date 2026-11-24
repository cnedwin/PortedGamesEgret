// Presentation over existing rules and old recordings. No costs, effects, or historical data are changed here.
import {KINDS,SHAPES} from '../data/tactics.mjs';
import {FIELD,colOf,rowOf} from '../sim/battle.mjs';
const HELP=new Set(['atk','def','spd','heal','rally','rage']);
const words=(language,zh,en)=>language==='en'?en:zh;

export function tacticPresentation(tactic,reach,{language='zh'}={}){
 if(!tactic)return {effect:'',target:'',cost:'',detail:''};
 const w=(zh,en)=>words(language,zh,en),pair=value=>value?.[language==='en'?1:0]??'';
 let effect=pair(KINDS[tactic.kind]);
 if(['atk','def','spd'].includes(tactic.kind))effect+=' +'+tactic.power+'% · '+(tactic.seconds||8)+w('秒','s');
 else if(tactic.kind==='rally')effect=w('士气 +','Morale +')+tactic.power+w('，解除异常','; clears ailments');
 else if(tactic.kind==='rage')effect=w('友军怒气 +','Allied rage +')+tactic.power;
 else if(tactic.kind==='heal')effect+=w('（受智力影响）',' (scales with intellect)');
 else if(['fear','confuse','stun'].includes(tactic.kind)){
  const seconds=tactic.kind==='stun'?Math.min(4,tactic.seconds||5):tactic.seconds||5;
  effect+=w('，基础','; base ')+seconds+w('秒，可被抵抗','s, subject to resistance');
 }
 const helping=HELP.has(tactic.kind);
 const target=helping
  ? tactic.shape==='self'?w('自身','Self'):tactic.shape==='all'?w('己方全军','All allied units'):w('3格内友军','Allies within 3 hexes')
  : w('敌军 · ','Enemy · ')+pair(SHAPES[tactic.shape])+' · '+w('射程','reach ')+reach+w('格',' hexes');
 const cost=w('需100怒气 · 施后清空','Requires 100 rage · empties rage');
 const resisted=tactic.mind&&!helping?w('；谋略被识破后余30怒气','; resisted schemes leave 30 rage'):'';
 return {effect,target,cost,detail:effect+' · '+target+' · '+cost+resisted};
}

/** A result is relative to its recorded sides, never automatically to the winning army's enemy. */
export function battleOutcomeReason(result,playerSide=null,language='zh'){
 const w=(zh,en)=>words(language,zh,en),loser=result?.winner===0?1:result?.winner===1?0:null;
 const sideName=side=>side===0?w('蓝军','Blue army'):w('红军','Red army');
 const relative=side=>playerSide===null?sideName(side):(side===playerSide?w('我军','Our army'):w('敌军','Enemy army'))+w('（',' (')+sideName(side)+w('）',')');
 if(result?.why==='broken'&&loser!==null)return relative(loser)+w('溃散',' broke');
 if(result?.why==='retreat'&&loser!==null)return relative(loser)+w('撤退',' withdrew');
 if(result?.why==='keep')return result.winner===playerSide?w('我军攻占敌营','Our army took the enemy keep'):playerSide!==null?w('本营失守','Our keep was taken'):w('守军本营被攻占','The defending army’s keep was taken');
 if(result?.why==='depot')return result.winner===playerSide?w('我军焚毁敌军粮仓','Our army burned the enemy depot'):playerSide!==null?w('我军粮仓被焚','Our depot was burned'):w('粮仓被焚','The depot was burned');
 if(result?.why==='sunset')return w('日落收兵','Sunset ended the fighting');
 return w('战斗结束','Battle ended');
}

export function hexPositionLabel(at,language='zh'){
 return Number.isInteger(at)&&at>=0&&at<FIELD.cols*FIELD.rows?words(language,'位置 ','Position ')+(colOf(at)+1)+','+(rowOf(at)+1):words(language,'原位置','Previous position');
}

export function battleActionLabel(action,language='zh'){
 if(action.kind==='intent'){
  if(action.arg==='guard')return words(language,'守住阵线','Guard line');
  if(action.arg==='range')return words(language,'保持射距','Keep distance');
  return words(language,'主动接敌','Engage');
 }
 const labels={select:['选军','Select unit'],deploy:['部署','Deploy'],formation:['变阵','Change formation'],move:['移动','Move'],attack:['进攻','Attack'],hold:['坚守','Hold'],auto:['自动指挥','Auto orders'],autoTactic:['自动战法','Auto tactics'],tactic:['战法','Tactic'],cancelAim:['取消施策','Cancel tactic'],pause:['暂停','Pause'],resume:['继续','Resume'],begin:['开战','Begin'],entrust:['全军委任','Entrust army'],speed:['倍速','Speed'],step:['步进','Step'],result:['结算','Result']};
 const label=action.kind==='aim'?(action.target==null?['选择战法','Choose tactic']:['选择目标','Choose target']):labels[action.kind]??['军令','Order'];
 return label[language==='en'?1:0];
}
