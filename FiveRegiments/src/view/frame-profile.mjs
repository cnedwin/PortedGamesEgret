// Diagnostic-only bounded ring buffer. The engine supplies immutable CPU timing
// samples. Play and attached-world streams overlap and must never be summed.
export function createFrameProfile(capacity=2048){
  const lanes=new Map();
  return {
    record(name,sample){
      let lane=lanes.get(name);
      if(!lane){lane={data:new Array(capacity),count:0};lanes.set(name,lane);}
      lane.data[lane.count++%capacity]=sample;
    },
    snapshot(){
      return Object.fromEntries(Array.from(lanes,([name,lane])=>{
        const kept=Math.min(capacity,lane.count),start=lane.count-kept;
        return [name,{dropped:start,samples:Array.from({length:kept},(_,i)=>lane.data[(start+i)%capacity])}];
      }));
    }
  };
}
