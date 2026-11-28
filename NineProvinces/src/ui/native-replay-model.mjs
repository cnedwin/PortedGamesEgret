// Read-only cursor for a recorded fictional battle. Identical replay snapshot
// selection: free scrubbing uses the last preceding sample, highlights the first
// following sample. The tape and campaign save are never changed.
import { replayFrameAt } from '../sim/battle-history.mjs';
import { replayMoments } from './native-replay-copy.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
export function createReplayCursor(tape,{playerSide=null,tab='report'}={}){
  if(!tape?.frames?.length)throw Error('Replay has no recorded frames');
  const total=tape.frames.at(-1).time,moments=replayMoments(tape,playerSide),timeline=[...(tape.events??[]).map(e=>({...e,at:e.t})),...(tape.actions??[]).filter(e=>!['select','aim','cancelAim'].includes(e.kind)).map(e=>({...e,at:e.time,order:true}))].sort((a,b)=>b.at-a.at);
  let cursor=0,playing=false,speed=1,activeMoment=null,selectedUnit=null;
  function seek(value){cursor=Math.max(0,Math.min(total,Number.isFinite(value)?value:0));playing=false;activeMoment=null;}
  function jump(kind){const moment=typeof kind==='string'?moments.find(x=>x.kind===kind):moments.find(x=>x===kind);if(!moment)return false;cursor=moment.time;playing=false;activeMoment=moment;selectedUnit=null;tab='replay';return true;}
  function toggle(){if(tab!=='replay')return false;playing=!playing;if(playing)activeMoment=null;if(cursor>=total)cursor=0;return true;}
  function setSpeed(value){if(![1,2,4].includes(value))return false;speed=value;return true;}
  function change(next){if(!['report','replay'].includes(next))return false;tab=next;playing=false;return true;}
  function update(dt){if(tab==='replay'&&playing){cursor=Math.min(total,cursor+Math.max(0,Number.isFinite(dt)?dt:0)*speed);if(cursor===total)playing=false;}}
  function current(){return activeMoment?.kind==='result'?tape.frames.at(-1):activeMoment?tape.frames.find(frame=>frame.time>=activeMoment.time)??tape.frames.at(-1):replayFrameAt(tape,cursor);}
  function recent(){return timeline.filter(e=>e.at<=cursor+1e-7).slice(0,5);}
  function presentation(){const frame=current(),units=frame.units.map(u=>({...tape.units[u.id],...u})),tiles=tape.field.tiles.slice();for(const [at,tile]of frame.terrain??[])tiles[at]=tile;const area=Number.isInteger(activeMoment?.hex)&&activeMoment.hex>=0&&activeMoment.hex<tiles.length?[activeMoment.hex]:[];return {frame,units,tiles,area,target:activeMoment?.target,selected:activeMoment?.unit??selectedUnit,recent:recent()};}
  return {seek,jump,toggle,setSpeed,change,update,current,presentation,recent,selectUnit(id){selectedUnit=id;activeMoment=null;},moments,get tab(){return tab},get cursor(){return cursor},get speed(){return speed},get playing(){return playing},get total(){return total},get highlight(){return activeMoment},get selected(){return activeMoment?.unit??selectedUnit},inspect:()=>({kind:'replay',tab,cursor,playing,speed,total,frame:clone(current()),highlight:activeMoment?{kind:activeMoment.kind,time:activeMoment.time,unit:activeMoment.unit,target:activeMoment.target,hex:activeMoment.hex}:null})};
}