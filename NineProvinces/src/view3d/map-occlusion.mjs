// Actual retained UI owners supply the painted rectangles in Play design
// coordinates; no DOM boxes or guessed screen percentages are consulted.
export function createMapOcclusionRegistry(){
  const providers=new Set();
  const valid=r=>r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
  return {
    addMapOcclusion(provider){if(typeof provider!=='function')throw TypeError('Map occlusion provider must be a function');providers.add(provider);return()=>providers.delete(provider);},
    mapOcclusionRects(){const list=[];for(const provider of providers){const value=provider();for(const rect of Array.isArray(value)?value:[value])if(valid(rect))list.push(rect);}return list;},
    clearMapOcclusion(){providers.clear();}
  };
}
