// Battle history is a detached observation, never a second simulation or a save of the realm.
import { createBattle, stepBattle, outcome, battleReport, FIELD } from './battle.mjs';
const copy=value=>JSON.parse(JSON.stringify(value));

export function createBattleRecorder(b,{interval=1,maxFrames=901}={}) {
  let cadence=Math.max(.1,interval),last=-Infinity,seen=0,phase=null;
  const frames=[],events=[],actions=[],initialTiles=b.tiles.slice();
  const cap=Math.max(8,Math.floor(maxFrames));
  function capture(nextPhase='fight',{force=false}={}) {
    for(;seen<b.events.length;seen++)if(events.length<6000)events.push(copy(b.events[seen]));
    const changed=nextPhase!==phase;phase=nextPhase;
    if(!force&&!changed&&b.time<last+cadence-1e-7)return;
    const frame={time:+b.time.toFixed(3),phase,units:b.units.map(u=>({id:u.id,pos:u.pos,troops:Math.round(u.troops),morale:Math.round(Math.max(0,u.morale)),rage:Math.round(u.rage),formation:u.formation,order:u.order,target:u.target?.id??null,goal:u.goal,path:u.path.slice(),hits:u.record?.hits??0,lastAttack:u.lastAttack?{...u.lastAttack}:null,routed:u.routed,gone:u.gone,status:{...u.status},end:u.end??null})),terrain:b.tiles.flatMap((tile,at)=>tile===initialTiles[at]?[]:[[at,tile]]),fire:Object.keys(b.fire).map(Number),gate:b.gate?{hp:Math.round(b.gate.hp),open:b.gate.open}:null,depot:b.depot?{hp:Math.round(b.depot.hp),burnt:b.depot.burnt}:null,keepHeld:+b.keepHeld.toFixed(2),over:b.over?{...b.over}:null};
    const previous=frames.at(-1);
    if(previous&&previous.time===frame.time&&previous.phase===frame.phase)frames[frames.length-1]=frame;
    else frames.push(frame);
    if(frames.length>cap){const retained=frames.filter((_,i)=>i===0||i===frames.length-1||i%2===0);frames.splice(0,frames.length,...retained);cadence*=2;}
    last=b.time;
  }
  function action(kind,data={}) {if(actions.length<4000)actions.push({time:+b.time.toFixed(3),phase:phase??'deploy',kind,...copy(data)});}
  function finish(){capture(b.over?'result':phase??'fight',{force:true});return copy({version:1,setup:b.setup,field:{cols:FIELD.cols,rows:FIELD.rows,tiles:initialTiles,gate:b.gate?.at??null,keep:b.keep,depot:b.depot?.at??null},units:b.units.map(u=>({id:u.id,side:u.side,kind:u.kind,general:u.general??null,start:u.start})),frames,events,actions,report:{...battleReport(b),actions}});}
  capture('deploy');
  return {capture,action,finish};
}

/** Coarse seek selects the last actual sample at or before the requested battle time. */
export function replayFrameAt(tape,seconds) {
  const frames=tape?.frames??[];if(!frames.length)return null;
  if(seconds<=frames[0].time)return frames[0];
  let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].time<=seconds)lo=mid;else hi=mid-1;}
  return frames[lo];
}

/** Only the player's explicit entrust action uses this; strategic AI keeps its lightweight autoBattle. */
export function recordedAutoBattle(setup,state=null) {
  const b=createBattle(setup,state),record=createBattleRecorder(b);record.action('entrust');record.capture('fight',{force:true});
  for(let i=0;i<2400&&!b.over;i++){stepBattle(b,.25);record.capture('fight');}
  if(!b.over)b.over={winner:1,why:'sunset'};
  const result=outcome(b),tape=record.finish();return {result,tape,report:tape.report};
}
