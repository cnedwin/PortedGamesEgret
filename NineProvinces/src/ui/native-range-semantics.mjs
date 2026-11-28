// Play data views do not yet have a range part. Let their actual focusable
// target publish a slider role, using the same native tree and clipping data.
// No second semantic tree, HTML control, or keyboard transport is created.
const sliders = new Set(['musicVolume-slider', 'effectsVolume-slider', 'muster-troops-slider', 'transfer-amount-slider', 'native-replay-time']);

export function createNativeRangeSemantics(tree) {
  const sliderSemanticMeta=new Map();
  const semantics=Object.create(tree,{add:{value(definition){
    const name=definition.id.split(':').at(-1),meta=sliderSemanticMeta.get(name);
    if(!sliders.has(name)||!meta||definition.role!=='button')return tree.add(definition);
    const {onActivate:unused,...rest}=definition;
    return tree.add({...rest,role:'slider',describe(){
      const base=definition.describe();
      return {...base,name:meta.label,range:{min:meta.min,max:meta.max,now:meta.value},orientation:'horizontal'};
    }});
  }}});
  return {semantics,sliderSemanticMeta};
}
