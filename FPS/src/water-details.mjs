// Shallow rainwater and sluice spray: authored procedural RGBA masks on native
// World3D surfaces. No intersecting volumes, extra render pass, or collision.
import { createGeometry3D, createStandardMaterial3D, Mesh3D, Texture3D } from '@egret/engine/world3d';

export const PUDDLE_LAYOUT=Object.freeze([
  [-6,17,3.2,2,.3],[7.5,5.5,2.6,3.6,1.1],[-12,-6.5,3.8,2.2,.6],[15,19,2.4,2.4,0],
  [-24,13.2,2.2,1.4,.2],[3,-6.2,4.2,1.6,0],[24,10,3,2.2,.8],[-30,-17.5,2.6,1.8,.4],
  [20.5,-11,1.8,3,.1],[-3,27,2.6,1.6,.5],
].map(row=>Object.freeze(row)));
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(lo,hi,value)=>{const t=clamp((value-lo)/(hi-lo));return t*t*(3-2*t);};
const hash=(x,y,seed)=>{
  let n=Math.imul(x+seed*13,374761393)^Math.imul(y-seed*7,668265263);
  n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
};
function noise(x,y,seed){
  const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy);
  return lerp(lerp(hash(ix,iy,seed),hash(ix+1,iy,seed),u),lerp(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v);
}
const pixel=(data,i,r,g,b,a)=>{data[i]=Math.round(r);data[i+1]=Math.round(g);data[i+2]=Math.round(b);data[i+3]=Math.round(clamp(a)*255);};

/** Left half: a translucent streaked fall; right half: a soft irregular foam footprint. */
export function makeSluiceAtlas(){
  const width=256,height=256,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const spray=x>=128,u=(x%128)/127,v=y/(height-1),i=(y*width+x)*4;
    const border=smooth(0,.08,Math.min(u,1-u))*smooth(0,.09,Math.min(v,1-v));
    if(spray){
      const a=(u-.5)*2,b=(v-.5)*2,angle=Math.atan2(b,a),r=Math.hypot(a,b);
      const lip=.79+.10*Math.sin(angle*3+.9)+.06*Math.sin(angle*7+1.8);
      const feather=smooth(0,.28,lip-r),bubbles=noise(u*31,v*37,29)*.7+noise(u*68,v*73,43)*.3;
      const wisps=noise(u*11,v*14,3),brightness=.56+.44*bubbles;
      pixel(data,i,130+70*brightness,151+67*brightness,158+65*brightness,border*feather*(.08+.29*bubbles+.10*wisps));
    }else{
      // Staggered long filaments and spray streaks, not flat white fill.
      const waviness=Math.sin(v*Math.PI*3.2)*.018+Math.sin(v*Math.PI*8+u*8)*.008;
      const stream=noise((u+waviness)*34,v*2.3,17),fine=noise((u+waviness)*93,v*9,37),wash=noise(u*8,v*5,11);
      const brightness=.40+.34*stream+.26*fine,edge=smooth(0,.10,Math.min(u+waviness,1-u-waviness));
      const a=border*edge*(.08+.24*stream+.14*fine+.12*wash);
      pixel(data,i,105+90*brightness,130+82*brightness,147+76*brightness,a);
    }
  }
  return{width,height,data};
}

/** One non-rectangular water footprint, with a broad, visible-to-invisible wet fringe. */
export function makePuddleMask(){
  const width=128,height=128,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/(width-1),v=y/(height-1),a=2*u-1,b=2*v-1,angle=Math.atan2(b,a),r=Math.hypot(a,b);
    const lip=.82+.077*Math.sin(angle*3+.7)+.057*Math.sin(angle*5-1.3)+.033*Math.sin(angle*11+2.1);
    const distance=lip-r,edge=smooth(0,.15,distance),core=smooth(.06,.39,distance);
    const border=smooth(0,.055,Math.min(u,1-u))*smooth(0,.055,Math.min(v,1-v));
    const mottling=noise(u*8.5,v*9,19)*.65+noise(u*36,v*31,41)*.35;
    // The pale, desaturated water merges with wet tarmac even with planar
    // reflection disabled; depth is represented by opacity rather than black.
    pixel(data,(y*width+x)*4,105+38*mottling,127+36*mottling,132+38*mottling,border*edge*(.20+.35*core+.09*mottling));
  }
  return{width,height,data};
}

function surface(){
  const positions=[],normals=[],uvs=[],indices=[];
  return{
    quad(points,normal,uv=[0,0,1,1]){
      const base=positions.length/3,[u0,v0,u1,v1]=uv;
      points.forEach(p=>{positions.push(...p);normals.push(...normal);});
      uvs.push(u0,v0,u1,v0,u1,v1,u0,v1);indices.push(base,base+1,base+2,base,base+2,base+3);
    },
    ground(x,y,z,w,d,turn,uv){
      const c=Math.cos(turn),s=Math.sin(turn);
      const points=[[-w/2,d/2],[w/2,d/2],[w/2,-d/2],[-w/2,-d/2]].map(([dx,dz])=>[x+c*dx+s*dz,y,z-s*dx+c*dz]);
      this.quad(points,[0,1,0],uv);
    },
    finish(){return createGeometry3D({positions,normals,uvs,indices});},
  };
}
function mesh(name,geometry,material){
  const node=new Mesh3D(geometry,material);node.name=name;node.castShadow=false;node.receiveShadow=true;return node;
}

/** The three authored gates and ten low spots use exactly two native draw surfaces. */
export function createWaterDetails(minZ){
  const falls=surface(),pool=surface(),texel=.5/256;
  for(const x of [-25,-15,25]){
    // A single forward-facing sheet, with the authored sluice visible through it.
    const y0=.22,y1=6.58,z=minZ+.52,w=5.4;
    falls.quad([[x-w/2,y0,z],[x+w/2,y0,z],[x+w/2,y1,z],[x-w/2,y1,z]],[0,0,1],[texel,texel,.5-texel,1-texel]);
    // Feathered, ground-level spray replaces the opaque block across the sill.
    falls.ground(x,.027,minZ+1.48,6.2,2.1,0,[.5+texel,texel,1-texel,1-texel]);
  }
  for(const [x,z,w,d,turn] of PUDDLE_LAYOUT)pool.ground(x,.022,z,w*1.13,d*1.13,turn,[0,0,1,1]);
  const sluice=mesh('Sluice water and spray',falls.finish(),createStandardMaterial3D({
    color:0xffffff,map:new Texture3D(makeSluiceAtlas(),{colorSpace:'srgb',mipmaps:true}),
    roughness:.31,environmentIntensity:.7,alphaMode:'blend',depthWrite:false,side:'double',
  }));
  const puddles=mesh('Rain puddles',pool.finish(),createStandardMaterial3D({
    color:0xffffff,map:new Texture3D(makePuddleMask(),{colorSpace:'srgb',mipmaps:true}),
    roughness:.12,environmentIntensity:1.05,alphaMode:'blend',depthWrite:false,
  }));
  return{sluice,puddles,puddleStrength:.88};
}
