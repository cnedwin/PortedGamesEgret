// Decorative, stylized energy layered over the existing display cues. No game state is read.
import {Mesh3D,createGeometry3D,createUnlitMaterial3D} from '@egret/engine/world3d';
import {decorativeEnergyEnvelope} from './presentation-envelope.mjs';

// The dark gemstone rim, saturated middle and pale core all occupy one draw. This
// remains legible both against a bright outdoor sky and in darker backgrounds.
function haloGeometry(){
  const positions=[], colors=[], indices=[], steps=24;
  // A narrow luminous ribbon reads more naturally than a solid torus. Keep
  // the existing mesh budget and concentrate brightness along its inner line.
  const rings=[[.57,.20],[.64,.60],[.70,1],[.76,.65],[.86,.20]];
  for(let i=0;i<=steps;i++){
    const a=i/steps*Math.PI*2, x=Math.sin(a), z=Math.cos(a);
    const detail=1+.045*Math.cos(a*6);
    for(const [r,k] of rings){
      positions.push(x*r*detail,0,z*r*detail);
      colors.push(k,k,k);
    }
    if(i)for(let j=0;j<rings.length-1;j++){
      const a=(i-1)*rings.length+j,b=a+rings.length;
      indices.push(a,a+1,b,b,a+1,b+1);
    }
  }
  return createGeometry3D({positions,colors,indices});
}

function flareGeometry(){
  const positions=[],colors=[],indices=[],steps=16;
  // Three fixed crossed planes make this little ornament visible from varied
  // cameras. It follows no animation skeleton and is not a target indicator.
  for(let plane=0;plane<3;plane++){
    const start=positions.length/3;
    positions.push(0,0,0);colors.push(1,1,1);
    for(let i=0;i<=steps;i++){
      const a=i/steps*Math.PI*2;
      const long=i%4===0?.97:i%2===0?.56:.22;
      for(const [r,k] of [[long*.45,.96],[long,.15]]){
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        positions.push(...(plane===0?[x,y,0]:plane===1?[0,y,x]:[x,0,y]));
        colors.push(k,k,k);
      }
      if(i){
        const b=start+1+2*(i-1);
        indices.push(start,b,b+2,b,b+1,b+2,b+1,b+3,b+2);
      }
    }
  }
  return createGeometry3D({positions,colors,indices});
}

/**
 * A small fixed pool. Only transform/color/opacity change: no per-event
 * resource allocation, dynamic mesh upload, shadow pass or full-screen flash.
 */
export function createLuminousAccents(scene,{capacity,reducedMotion}){
  const geometries={halo:haloGeometry(),flare:flareGeometry()};
  const slots=Array.from({length:capacity},()=>{
    const material=createUnlitMaterial3D({vertexColors:true,blending:'normal',
      depthWrite:false,side:'double',fog:false,opacity:0});
    const mesh=new Mesh3D(geometries.halo,material);
    mesh.name='decorative-energy';
    mesh.castShadow=false;
    mesh.renderOrder=5;
    mesh.visible=false;
    scene.addChild(mesh);
    return {mesh,material,remaining:0,duration:0,size:1,opacity:0};
  });
  let emitted=0,peak=0;
  const activeCount=()=>slots.reduce((n,slot)=>n+(slot.mesh.visible?1:0),0);
  const clear=()=>{
    for(const slot of slots){
      slot.remaining=0;
      slot.mesh.visible=false;
    }
  };
  return {
    show(shape,at,tint,{size=.72,duration=.29,opacity=shape==='halo'?.68:.84}={}){
      if(reducedMotion())return;
      const slot=slots.reduce((best,item)=>item.remaining<best.remaining?item:best);
      Object.assign(slot,{remaining:duration,duration,size,opacity});
      const {mesh,material}=slot;
      mesh.geometry=geometries[shape];
      mesh.setPosition(...at);
      mesh.setRotation(0,0,0);
      const scale=size*decorativeEnergyEnvelope(0,duration).scale;
      mesh.setScale(scale,scale,scale);
      material.color.set(tint.map(c=>.38+.62*c));
      material.opacity=opacity;
      mesh.visible=true;
      emitted++;
      peak=Math.max(peak,activeCount());
    },
    update(dt){
      if(reducedMotion()){clear();return;}
      for(const slot of slots){
        if(slot.remaining<=0)continue;
        slot.remaining=Math.max(0,slot.remaining-Math.max(0,dt));
        slot.mesh.visible=slot.remaining>0;
        if(!slot.mesh.visible)continue;
        const envelope=decorativeEnergyEnvelope(slot.duration-slot.remaining,slot.duration);
        const scale=slot.size*envelope.scale;
        slot.mesh.setScale(scale,scale,scale);
        slot.material.opacity=slot.opacity*envelope.opacity;
      }
    },
    clear,
    // No transforms, input or game data are exposed by this diagnostic.
    snapshot:()=>Object.freeze({capacity:slots.length,active:activeCount(),emitted,peak})
  };
}
