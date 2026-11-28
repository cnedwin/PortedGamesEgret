import { sampleTerrainTile } from './terrain-sampling.mjs';
self.addEventListener('message', ({data})=>{
  const {id,tx,tz}=data;
  try{
    const {heights,tint}=sampleTerrainTile(tx,tz);
    self.postMessage({id,heights,tint},[heights.buffer,tint.buffer]);
  }catch(error){self.postMessage({id,error:String(error?.message??error)});}
});