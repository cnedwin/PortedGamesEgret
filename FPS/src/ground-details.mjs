// Original, purely visual outdoor dressing. All placement and collision data stay in level.mjs.
import { Mesh3D, Texture3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { rgb } from './build.mjs';
const TAU=Math.PI*2,clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
export const DRAIN_SITES=Object.freeze([[1.5,20],[-8,2],[14,12],[22,-6],[-20,21]].map(Object.freeze));
export const CONE_SITES=Object.freeze([[-1.2,23.4],[4.4,21],[19.5,17.5],[23.5,14.2],[-11,12.8],[8.4,-5.6]].map(Object.freeze));
/** Retain the original seed stream and each ground dressing position exactly. */
export function groundWeedSites(bounds,boxes){
  const width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ,sites=[];
  let seed=7;const rand=()=> (seed=(seed*16807)%2147483647)/2147483647;
  const tuft=(x,z)=>{sites.push([x,z]);for(let i=0;i<30;i++)rand();}; // prior five blades, six samples each
  for(let i=0;i<170;i++){
    const side=Math.floor(rand()*4),along=rand(),off=.15+rand()*.9;
    if(side===0)tuft(bounds.minX+off,bounds.minZ+along*depth);
    else if(side===1)tuft(bounds.maxX-off,bounds.minZ+along*depth);
    else if(side===2)tuft(bounds.minX+along*width,bounds.maxZ-off);
    else tuft(bounds.minX+along*width,bounds.minZ+1.3+off);
  }
  for(const b of boxes){
    if(!['container','barrier','sandbag','crate','tyres'].includes(b.kind)||b.y-b.h/2>.1)continue;
    for(let i=0;i<(b.kind==='container'?5:2);i++){
      const onX=rand()<b.w/(b.w+b.d),sign=rand()<.5?-1:1;
      tuft(b.x+(onX?(rand()-.5)*b.w:sign*(b.w/2+.08)),b.z+(onX?sign*(b.d/2+.08):(rand()-.5)*b.d));
    }
  }
  return sites;
}
const rng=seed=>()=> ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const hash=(x,y)=>{let n=(Math.imul(x,374761393)^Math.imul(y,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
/** Curved tapered leaf ribbons with root-to-tip variation; no large alpha overdraw. */
function grassGeometry(sites){
  const positions=[],colors=[],indices=[];
  const palette=[0x5e6a46,0x777b4a,0x566746,0x8a8258,0x3e5a47].map(rgb);
  for(let s=0;s<sites.length;s++){
    const [cx,cz]=sites[s],random=rng((s+1)*7919);const count=10+Math.floor(random()*4);
    for(let i=0;i<count;i++){
      const a=random()*TAU,c=Math.cos(a),d=Math.sin(a),rx=cx+(random()-.5)*.28,rz=cz+(random()-.5)*.28;
      const base=palette[Math.floor(random()*palette.length)],height=.14+random()*.34,lean=.08+random()*.22;
      const width=(i%5===0?.075:.025)+random()*.035,variation=.85+random()*.38;
      const first=positions.length/3,rows=[[0,.26],[.32,.5],[.61,.39],[.86,.17]];
      for(const [t,w] of rows){
        const y=.016+height*(t-.20*t*t),offset=lean*t*t,twist=.15*Math.sin(a+t*2);
        for(const side of [-1,1]){
          positions.push(rx+c*offset-d*width*w*side,y+twist*width*w*side,rz+d*offset+c*width*w*side);
          const tone=variation*(.70+.48*t)*(side===-1?.88:1.09);colors.push(base[0]*tone,base[1]*tone,base[2]*tone);
        }
      }
      const end=positions.length/3;positions.push(rx+c*lean,.016+height*.8,rz+d*lean);colors.push(...base.map(k=>k*variation*.94));
      for(let n=0;n<3;n++){const b=first+2*n;indices.push(b,b+2,b+1,b+1,b+2,b+3);}
      indices.push(first+6,end,first+7);
    }
  }
  return createGeometry3D({positions,colors,indices}).computeNormals();
}
/** A circular cast-iron cover: raised diamond tread, peripheral grooves and rust flecks. */
export function makeDrainMaps(){
  const width=128,height=128,color=new Uint8Array(width*height*4),normal=new Uint8Array(color.length),levels=new Float32Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=2*x/(width-1)-1,v=2*y/(height-1)-1,r=Math.hypot(u,v),angle=Math.atan2(v,u),n=hash(x,y),idx=y*width+x,i=idx*4;
    const ring=r>.82&&r<.9,edge=r>.94,groove=Math.abs(r-.77)<.018||Math.abs(r-.925)<.011;
    const diamond=(Math.abs(Math.sin((u+v)*37))<.14||Math.abs(Math.sin((u-v)*37))<.14)&&r<.72;
    const bolt=r>.84&&r<.895&&Math.cos(angle*8)>.92;
    const slot=r>.27&&r<.67&&Math.cos(angle*4)>.97;
    const h=groove||slot?.18:bolt?.96:ring?.58:edge?.42:diamond?.72:.4;
    levels[idx]=h+(n-.5)*.055;
    const worn=hash(x>>2,y>>2),rust=(worn>.92?.25:0)+(worn>.82&&ring?.15:0),l=clamp(61+h*48+(n-.5)*25+(worn-.5)*20,38,133);
    color[i]=Math.round(l+rust*29);color[i+1]=Math.round(l*(1-rust*.1));color[i+2]=Math.round(l*.94-rust*20);color[i+3]=255;
  }
  const get=(x,y)=>levels[clamp(y,0,height-1)*width+clamp(x,0,width-1)];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=(get(x-1,y)-get(x+1,y))*.65,dy=(get(x,y-1)-get(x,y+1))*.65,len=Math.hypot(dx,dy,1),i=(y*width+x)*4;
    normal[i]=Math.round(128+127*dx/len);normal[i+1]=Math.round(128+127*dy/len);normal[i+2]=Math.round(128+127/len);normal[i+3]=255;
  }
  return{width,height,color,normal};
}
function drainGeometry(){
  const positions=[],normals=[],uvs=[],indices=[];const sides=36,r=.42,y=.02;
  for(const [x,z] of DRAIN_SITES){
    const center=positions.length/3;positions.push(x,y,z);normals.push(0,1,0);uvs.push(.5,.5);
    for(let i=0;i<sides;i++){const a=i/sides*TAU,c=Math.cos(a),s=Math.sin(a);positions.push(x+r*c,y,z+r*s);normals.push(0,1,0);uvs.push(.5+.5*c,.5-.5*s);}
    for(let i=0;i<sides;i++)indices.push(center,center+1+(i+1)%sides,center+1+i);
  }
  return createGeometry3D({positions,normals,uvs,indices}).computeTangents();
}
export function buildGroundDetails(scene,bounds,boxes){
  const sites=groundWeedSites(bounds,boxes),atlas=makeDrainMaps(),tex=(data,space)=>new Texture3D({width:atlas.width,height:atlas.height,data},{colorSpace:space,mipmaps:true,anisotropy:2});
  const grass=new Mesh3D(grassGeometry(sites),createStandardMaterial3D({color:0xffffff,vertexColors:true,side:'double',roughness:.81,emissive:0x263623,emissiveIntensity:.08}));
  grass.name='Weathered ground foliage';grass.castShadow=false;grass.receiveShadow=true;
  const drains=new Mesh3D(drainGeometry(),createStandardMaterial3D({map:tex(atlas.color,'srgb'),normalMap:tex(atlas.normal,'linear'),roughness:.67,metallic:.42,normalScale:.75}));
  drains.name='Cast iron drain covers';drains.castShadow=false;drains.receiveShadow=true;
  scene.addChild(grass);scene.addChild(drains);return{grass,drains,sites};
}
/** Keep the traffic cone silhouette and base at exactly the original sites. */
export function appendTrafficCones(builder){
  const rubber=rgb(0x292b2a),orange=rgb(0xb84a22),white=rgb(0xd6d1bf),lip=rgb(0x9b4528);
  for(const [x,z] of CONE_SITES){
    builder.box(x,.018,z,.36,.036,.36,{tint:rubber,skipBottom:true});builder.box(x,.036,z,.32,.022,.32,{tint:rubber,skipBottom:true});
    const radius=y=>.139-(y-.045)/.54*.105,segment=(a,b,tint)=>builder.cylinder(x,(a+b)/2,z,radius(a),b-a,{top:radius(b),sides:24,tint,caps:false});
    segment(.045,.28,orange);segment(.28,.31,lip);segment(.31,.405,white);segment(.405,.585,orange);
    builder.cylinder(x,.585,z,.038,.018,{top:.034,sides:24,tint:lip});
    builder.cylinder(x,.595,z,.021,.002,{sides:24,tint:rubber});
  }
}
/** Refine the visible housing around the unchanged light source positions. */
export function appendLampFittings(plain,glow,lamps){
  const steel=rgb(0x596268),trim=rgb(0x333b3f),bolt=rgb(0x777b7c),lens=rgb(0x8d928e);
  for(const [x,y,z] of lamps){
    const outdoors=y>4.5&&!(x>-8&&x<16&&z<-8&&z>-26);
    if(outdoors){
      const px=x+.9;
      plain.cylinder(px,.055,z,.17,.11,{top:.145,sides:16,tint:trim});
      plain.cylinder(px,.21,z,.081,.32,{top:.072,sides:16,tint:steel});
      plain.cylinder(px,y*.5+.11,z,.071,y-.46,{top:.049,sides:16,tint:steel});
      for(let i=0;i<4;i++){const a=i*TAU/4+.42;plain.cylinder(px+.104*Math.cos(a),.117,z+.104*Math.sin(a),.016,.022,{sides:6,tint:bolt});}
      plain.cylinder(x+.49,y+.10,z,.047,.84,{axis:'x',sides:12,tint:steel});
      plain.limb([px,y-.30,z],[x+.48,y+.065,z],.022,.022,{sides:8,tint:trim});
    }else{
      plain.cylinder(x,y+.32,z,.025,.6,{sides:8,tint:trim});
      plain.box(x,y+.62,z,.17,.035,.16,{tint:steel});
    }
    // Tiered casing and diffuser retain the exact head and existing emitter.
    plain.box(x,y+.045,z,.54,.10,.34,{tint:trim});
    plain.box(x,y+.105,z,.46,.045,.28,{tint:steel});
    plain.box(x,y-.015,z,.46,.025,.28,{tint:lens});
    glow.box(x-.106,y-.034,z,.197,.016,.232,{tint:[1.65,1.42,.98]});
    glow.box(x+.106,y-.034,z,.197,.016,.232,{tint:[1.65,1.42,.98]});
  }
}
/** Denser, continuous decorative hillside profile, entirely outside the playable yard. */
export function createDistantRidge(){
  const spokes=128,rings=[58,70,88,110,145,183,230,282,340],anchors=[58,95,150,230,340],heights=[0,.38,.8,1,.9];
  const positions=[],colors=[],indices=[],near=rgb(0x414e38),far=rgb(0x727b67),rock=rgb(0x716e57);
  const lerp=(a,b,t)=>a+(b-a)*t;
  for(let k=0;k<rings.length;k++){
    const range=rings[k];let p=0;while(p<anchors.length-2&&range>anchors[p+1])p++;
    const t=clamp((range-anchors[p])/(anchors[p+1]-anchors[p]),0,1),rise=lerp(heights[p],heights[p+1],t),phase=lerp(p,p+1,t);
    for(let i=0;i<spokes;i++){
      const a=i/spokes*TAU,north=Math.max(0,-Math.cos(a)),open=Math.max(0,Math.cos(a-.9))**6;
      const ridges=.54+.18*Math.sin(a*5+phase)+.14*Math.sin(a*11+phase*2.3)+.07*Math.sin(a*19-phase*.72)+.045*Math.sin(a*31+phase*.63);
      const distance=range*(1+.035*Math.sin(a*7+phase)+.017*Math.sin(a*16-phase*.7));
      const h=(16+north*58+ridges*34)*rise*(1-open*.85);
      positions.push(Math.sin(a)*distance,h-.25,Math.cos(a)*distance);
      const haze=(range-58)/(340-58),mottle=.87+.13*Math.sin(a*23+phase*5)+.05*Math.sin(a*59-phase*2);
      const stone=clamp((h-30)/130,0,.42)*(.56+.44*Math.sin(a*9+phase));
      for(let c=0;c<3;c++)colors.push(lerp(lerp(near[c],rock[c],stone),far[c],haze)*mottle);
    }
  }
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<spokes;i++){
    const a=k*spokes+i,b=k*spokes+(i+1)%spokes,c=a+spokes,d=b+spokes;indices.push(a,c,b,b,c,d);
  }
  return createGeometry3D({positions,colors,indices}).computeNormals();
}
/** Keep labels inside the painted plate, using actual font metrics. */
export function fitPlateLine(context,line,maxWidth,initialSize){
  let px=Math.max(1,Math.floor(initialSize));
  const font=()=>`bold ${px}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", Arial, sans-serif`;
  context.font=font();const width=context.measureText(line).width;
  if(width>maxWidth){px=Math.max(1,Math.floor(px*maxWidth/width));context.font=font();}
  return px;
}