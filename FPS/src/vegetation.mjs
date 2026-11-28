// Original rain-wet woodland dressing for the station. Bark and leaf sprays are
// procedural textures; branches and foliage are true world-space native instances.
// The authored level coordinates, collision, and simulation remain independent.
import { InstancedMesh3D, Texture3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createBuilder } from './build.mjs';

const SIZE=256,TAU=Math.PI*2,clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const unit=n=>clamp(n,0,1),mix=(a,b,t)=>a+(b-a)*t;
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function hash(x,y,seed=0){
 let n=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1446648777))|0;
 n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;
}
const tone=(base,k)=>base.map(v=>clamp(v*k,0,255));
function foliageBuffer(rgb){const pixels=new Uint8Array(SIZE*SIZE*4);for(let i=0;i<pixels.length;i+=4)pixels.set(rgb,i);return pixels;}
function pixel(pixels,x,y,colour,alpha){
  if(x<0||y<0||x>=SIZE||y>=SIZE||alpha<=0)return;
  const i=(y*SIZE+x)*4,a=unit(alpha),old=pixels[i+3]/255,out=a+old*(1-a);
  if(out<=0)return;
  for(let k=0;k<3;k++)pixels[i+k]=Math.round((colour[k]*a+pixels[i+k]*old*(1-a))/out);
  pixels[i+3]=Math.round(out*255);
}
function stroke(pixels,x0,y0,x1,y1,width,colour){
  const dx=x1-x0,dy=y1-y0,len=Math.max(1,dx*dx+dy*dy),r=width/2;
  const left=Math.max(1,Math.floor(Math.min(x0,x1)-r-1)),right=Math.min(SIZE-2,Math.ceil(Math.max(x0,x1)+r+1));
  const top=Math.max(1,Math.floor(Math.min(y0,y1)-r-1)),bottom=Math.min(SIZE-2,Math.ceil(Math.max(y0,y1)+r+1));
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    const t=unit(((x+.5-x0)*dx+(y+.5-y0)*dy)/len),d=Math.hypot(x+.5-(x0+dx*t),y+.5-(y0+dy*t));
    pixel(pixels,x,y,colour,unit(r+.65-d));
  }
}
/** A tapered wet leaf with a soft serrated outline, midrib and oblique veins. */
function leaf(pixels,cx,cy,length,width,angle,base,seed,needle=false){
  const co=Math.cos(angle),si=Math.sin(angle),r=Math.ceil(Math.hypot(length,width)+2);
  // Preserve the old conservative raster radius, but skip unused needle corners.
  // The profile can never exceed 1.065 and admitted edge never exceeds 1.04.
  const rx=Math.min(r,Math.ceil(Math.abs(co)*length*1.05+Math.abs(si)*width*1.11+2)),
    ry=Math.min(r,Math.ceil(Math.abs(si)*length*1.05+Math.abs(co)*width*1.11+2));
  for(let y=Math.max(1,Math.floor(cy-ry));y<=Math.min(SIZE-2,Math.ceil(cy+ry));y++){
    for(let x=Math.max(1,Math.floor(cx-rx));x<=Math.min(SIZE-2,Math.ceil(cx+rx));x++){
      const dx=x+.5-cx,dy=y+.5-cy,u=(dx*co+dy*si)/length,v=(-dx*si+dy*co)/width;
      if(Math.abs(u)>1.05||Math.abs(v)>1.11)continue;
      const profile=Math.pow(Math.max(.006,1-u*u),needle?.75:.58)*(1+.065*Math.sin(u*26+seed));
      const edge=Math.abs(v)/profile;
      if(edge>1.04)continue;
      const alpha=unit((1.045-edge)*9);
      const rib=Math.max(0,1-Math.abs(v)/(needle?.28:.14));
      const vein=needle?0:Math.pow(Math.max(0,Math.cos((u+Math.abs(v)*.31)*19)),12)*.08*(1-Math.abs(v)*.5);
      const ripple=hash(x,y,seed)-.5;
      const brightness=.81+(.5+.5*u)*.11+(v+1)*.06+rib*.13+vein+ripple*.10;
      pixel(pixels,x,y,tone(base,brightness),alpha);
    }
  }
}
function broadleafAtlas(){
  const out=foliageBuffer([78,99,72]),random=rng(0x7162b3);
  stroke(out,126,246,131,27,4,[98,78,54]);
  // Offset side twigs, with paired but not mechanically symmetric leaves.
  for(let i=0;i<7;i++){
    const t=(i+1)/8,y=mix(232,46,t),rootX=mix(126,131,t);
    for(const side of [-1,1]){
      const reach=(76-31*t)*(0.78+random()*.28),endX=rootX+side*reach,endY=y-23-random()*19;
      stroke(out,rootX,y,endX,endY,2.65-1.15*t,[104,82,58]);
      const a=Math.atan2(endY-y,endX-rootX);
      for(let j=0;j<4;j++){
        const q=.23+j*.19,x=mix(rootX,endX,q),yy=mix(y,endY,q);
        for(const turn of [-1,1]){
          const theta=a+turn*(.56+random()*.40),length=(13.5+random()*10)*(1-.12*t),width=5.3+random()*4.9;
          const base=[74+random()*22,94+random()*27,65+random()*21].map(Math.round);
          leaf(out,x+Math.cos(theta)*length*.71,yy+Math.sin(theta)*length*.71,length,width,theta,base,i*31+j*7+(side+1)*3+turn+37);
        }
      }
      const tipColour=[88+random()*19,113+random()*19,76+random()*18].map(Math.round);
      leaf(out,endX+Math.cos(a)*10,endY+Math.sin(a)*10,19,8.5,a,tipColour,71+i*9+side);
    }
  }
  // The terminal growth is fresher and smaller, with visible open gaps.
  for(let side of [-1,1]){
    const a=-Math.PI/2+side*.5;
    leaf(out,131+side*9,34,21,9,a,[89,117,78],103+side);
  }
  return out;
}
function pineAtlas(){
  const out=foliageBuffer([76,95,72]),random=rng(0xa89106);
  stroke(out,126,246,130,17,4,[95,75,53]);
  // A fan of secondary evergreen shoots, visible stems and many narrow needles.
  for(let tier=0;tier<8;tier++){
    const f=(tier+1)/9,y=mix(242,32,f),rootX=mix(126,130,f);
    for(const side of [-1,1]){
      const reach=(102-45*f)*(.88+random()*.12),x1=rootX+side*reach,y1=y-25-15*random();
      stroke(out,rootX,y,x1,y1,2.4-0.7*f,[99,83,62]);
      const a=Math.atan2(y1-y,x1-rootX);
      for(let j=0;j<7;j++){
        const t=.12+j*.122,x=mix(rootX,x1,t),yy=mix(y,y1,t);
        // Four slender needles are packed on each side of the twig, not one cone.
        for(let k=0;k<4;k++){
          const turn=k%2?-1:1,theta=a+turn*(.55+.22*(k>>1)+random()*.35);
          const length=9.4+random()*12.0,width=1.6+random()*1.55;
          const base=[76+random()*20,94+random()*24,68+random()*20].map(Math.round);
          leaf(out,x+Math.cos(theta)*length*.67,yy+Math.sin(theta)*length*.67,length,width,theta,base,36+tier*23+j*4+k,true);
        }
      }
      leaf(out,x1+Math.cos(a)*7,y1+Math.sin(a)*7,15,2.8,a,[89,113,77],tier+199,true);
    }
  }
  return out;
}
function barkAtlas(){
  const colour=new Uint8Array(SIZE*SIZE*4),normal=new Uint8Array(colour.length),relief=new Float32Array(SIZE*SIZE);
  const at=(x,y)=>relief[((y+SIZE)%SIZE)*SIZE+(x+SIZE)%SIZE];
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const u=x/SIZE,v=y/SIZE;
    // Long irregular seams, sharply recessed crevices, then fine bark ridges.
    const twist=.014*Math.sin(v*TAU*3+.7)+.007*Math.sin(v*TAU*7+u*TAU*2);
    const primary=Math.abs(Math.sin((u+twist)*TAU*19));
    const cracks=Math.pow(1-primary,5);
    const secondary=.5+.5*Math.sin((u+twist*.48)*TAU*57+Math.sin(v*TAU*5)*.45);
    const grain=(hash(x>>1,y>>2,27)*.19+hash(x,y,92)*.09);
    const h=unit(.42+primary*.26+secondary*.09+grain-cracks*.39);
    relief[y*SIZE+x]=h;
    const i=(y*SIZE+x)*4,wet=(.5+.5*Math.sin(u*TAU*7+v*TAU*2))*.05;
    const value=clamp(.68+h*.54+wet-cracks*.10,.47,1.18);
    const ash=(hash(x>>3,y>>4,55)-.5)*8;
    colour[i]=clamp(112*value+ash,0,255);
    colour[i+1]=clamp(96*value+ash,0,255);
    colour[i+2]=clamp(80*value+ash,0,255);colour[i+3]=255;
  }
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
    const dx=(at(x+1,y)-at(x-1,y))*2.2,dy=(at(x,y+1)-at(x,y-1))*1.05;
    const length=Math.hypot(dx,dy,1),i=(y*SIZE+x)*4;
    normal[i]=(-dx/length*.5+.5)*255;normal[i+1]=(-dy/length*.5+.5)*255;normal[i+2]=(1/length*.5+.5)*255;normal[i+3]=255;
  }
  return {bark:colour,normal};
}
export function vegetationPixels(){return {size:SIZE,oak:broadleafAtlas(),pine:pineAtlas(),...barkAtlas()};}

export function treePlacements(){
  const oak=[[-34.5,30,1.25],[34.5,30.2,1.3],[36,-27.5,1.2],[-12.5,30.3,1.1],[45,6,2],[-46,12,2.2],
    [-44,-14,1.9],[10,40,2.1],[-20,41,1.8],[47,26,1.9]];
  const fir=[];
  for(let i=0;i<54;i++){
    const angle=(i/54)*TAU+Math.sin(i*3.7)*.05,reach=50+((i*37)%11)*1.6,x=Math.sin(angle)*reach*1.05,z=Math.cos(angle)*reach*.95+2;
    if(z<-24&&Math.abs(x)<50)continue;
    fir.push([x,z,2.2+((i*13)%7)*.22]);
  }
  fir.push([-35.5,29.5,1.5],[35,-24.5,1.7],[36,12.5,1.4],[-10.5,29.8,1.3]);
  return {oak,fir};
}
function foliageBuilder(){
  const positions=[],normals=[],uvs=[],colors=[],indices=[];
  const card=(center,w,h,yaw,tilt,roll,tint,flip)=>{
    const co=Math.cos(yaw),si=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt),cr=Math.cos(roll),sr=Math.sin(roll);
    const a=[co,0,si],b=[-si*st,ct,co*st];
    const u=a.map((v,i)=>v*cr+b[i]*sr),v=b.map((n,i)=>n*cr-a[i]*sr);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],base=positions.length/3;
    for(const [x,y] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      positions.push(...center.map((p,i)=>p+u[i]*x*w/2+v[i]*y*h/2));normals.push(...n);
      uvs.push(flip?(1-x)/2:(x+1)/2,(y+1)/2);colors.push(...tint);
    }
    indices.push(base,base+1,base+2,base,base+2,base+3);
  };
  return {card,finish:()=>createGeometry3D({positions,normals,uvs,colors,indices})};
}
function oakGeometry(){
  const wood=createBuilder(),crown=foliageBuilder(),random=rng(0x453a27),woodTint=[.94,.91,.87];
  wood.limb([0,0,0],[.045,.84,-.02],.176,.132,{sides:8,tint:woodTint,caps:false});
  wood.limb([.045,.84,-.02],[-.054,1.54,.065],.132,.085,{sides:8,tint:woodTint,caps:false});
  wood.limb([-.054,1.54,.065],[.03,2.62,.05],.085,.025,{sides:7,tint:woodTint,caps:false});
  wood.limb([.03,2.62,.05],[.06,3.35,-.02],.036,.012,{sides:5,tint:woodTint,caps:false});
  for(let i=0;i<5;i++){
    const a=i*TAU/5+.12;
    wood.limb([0,.21,0],[Math.cos(a)*.34,.025,Math.sin(a)*.34],.095,.023,{sides:5,tint:[.84,.82,.77],caps:false});
  }
  function spray(center,count,spread){
    for(let i=0;i<count;i++){
      const a=random()*TAU,r=random()*spread,point=[center[0]+Math.cos(a)*r,center[1]+(random()-.5)*.23,center[2]+Math.sin(a)*r];
      const w=.73+random()*.22,h=.72+random()*.22,t=.85+random()*.22;
      crown.card(point,w,h,a,random()*1.3-.65,random()*TAU,[t,t*(.99+random()*.025),t*.97],i%2===0);
    }
  }
  for(let i=0;i<9;i++){
    const a=i*2.399963+.32,h=1.35+(i%4)*.17+random()*.14,reach=.68+random()*.37;
    const endpoint=[Math.cos(a)*reach,2.25+(i%3)*.29+random()*.20,Math.sin(a)*reach];
    const bend=[endpoint[0]*.56,h+.39,endpoint[2]*.56],start=[-.01,h,.035];
    wood.limb(start,bend,.061-(i%3)*.006,.038,{sides:6,tint:woodTint,caps:false});
    wood.limb(bend,endpoint,.038,.012,{sides:5,tint:woodTint,caps:false});
    for(let fork=0;fork<2;fork++){
      const theta=a+(fork?-.58:.66),tip=[endpoint[0]+Math.cos(theta)*.21,endpoint[1]+(.11+random()*.23),endpoint[2]+Math.sin(theta)*.21];
      wood.limb(bend,tip,.024,.007,{sides:4,tint:[.86,.86,.81],caps:false});
      spray(tip,2,.06);
    }
    spray(endpoint,5,.08);
  }
  spray([.02,3.31,-.03],10,.25);
  return {bark:wood.finish({tangents:true}),canopy:crown.finish()};
}
function firGeometry(){
  const wood=createBuilder(),crown=foliageBuilder(),random=rng(0xf1581b),tint=[.9,.88,.84];
  wood.limb([0,0,0],[.018,1.23,.024],.134,.086,{sides:8,tint,caps:false});
  wood.limb([.018,1.23,.024],[-.024,2.43,.016],.086,.044,{sides:7,tint,caps:false});
  wood.limb([-.024,2.43,.016],[.02,3.49,-.025],.044,.012,{sides:6,tint,caps:false});
  for(let i=0;i<4;i++){
    const a=i*TAU/4+.41;
    wood.limb([0,.18,0],[Math.cos(a)*.25,.022,Math.sin(a)*.25],.066,.014,{sides:5,tint:[.82,.8,.77],caps:false});
  }
  for(let tier=0;tier<7;tier++){
    const baseY=.73+tier*.40,reach=1.1-tier*.138,n=[7,7,6,6,5,4,3][tier];
    for(let i=0;i<n;i++){
      const a=i*TAU/n+tier*.61+(random()-.5)*.17,r=reach*(.82+random()*.13),dy=-.12-random()*.13,
        branchY=baseY+(random()-.5)*.18;
      const tip=[Math.cos(a)*r,branchY+dy,Math.sin(a)*r];
      wood.limb([0,branchY+.08,0],tip,.033-tier*.002,.008,{sides:4,tint,caps:false});
      // Drooping horizontal sprays, crossed with sloped/vertical sprays for a full
      // silhouette from street level and from above, never camera-facing billboards.
      for(let j=0;j<3;j++){
        const q=.50+j*.105,point=[tip[0]*q,branchY+dy*.55+(j-1)*.14,tip[2]*q];
        const brightness=.84+random()*.26+(tier/7)*.07;
        crown.card(point,Math.max(.20,r*.53+.16),Math.max(.29,r*.93+.14),a+(j-1)*.21,
          (j===0?.90:j===1?.24:-.72)+(random()-.5)*.22,Math.PI/2+(j-1)*.37+(random()-.5)*.52,
          [brightness*.99,brightness,brightness*.96],(i+j)%2===0);
      }
    }
  }
  for(let i=0;i<4;i++){
    const a=i*TAU/4+.37;
    crown.card([.015,3.28,-.015],.23,.42,a,.20,Math.PI/2,[1.04,1.08,1.02],i%2===0);
  }
  return {bark:wood.finish({tangents:true}),canopy:crown.finish()};
}
function createTextures(pixels){
  const {size}=pixels,repeat={wrapS:'repeat',wrapT:'repeat',mipmaps:true,anisotropy:4},cutout={wrapS:'clamp',wrapT:'clamp',mipmaps:true,anisotropy:2};
  const make=(data,options)=>new Texture3D({width:size,height:size,data},options);
  return {bark:make(pixels.bark,{...repeat,colorSpace:'srgb'}),normal:make(pixels.normal,{...repeat,colorSpace:'linear'}),
    oak:make(pixels.oak,{...cutout,colorSpace:'srgb'}),pine:make(pixels.pine,{...cutout,colorSpace:'srgb'})};
}
/** Four shared native batches, one for each species' bark and cutout canopy. */
export function buildVegetation(scene){
  const textures=createTextures(vegetationPixels()),placements=treePlacements(),meshes=[];
  const bark=createStandardMaterial3D({color:0xffffff,vertexColors:true,map:textures.bark,normalMap:textures.normal,normalScale:.60,
    roughness:.76,metallic:0});
  const foliage=map=>createStandardMaterial3D({color:0xffffff,vertexColors:true,map,alphaMode:'mask',alphaCutoff:.36,side:'double',
    roughness:.74,metallic:0,emissive:0x252d21,emissiveIntensity:.18});
  function add(kind,geometry,material,part,list){
    const mesh=new InstancedMesh3D(geometry,material,list.length,3);mesh.name=kind+'-'+part;
    mesh.castShadow=true;mesh.receiveShadow=true;
    list.forEach(([x,z,size],i)=>{
      // Same rotation for both meshes of an individual tree.
      const a=(hash(i,kind==='oak'?14:97,18)-.5)*TAU,t=.91+hash(i,kind==='oak'?14:97,53)*.16;
      mesh.setTransformAt(i,[x,0,z],[0,Math.sin(a/2),0,Math.cos(a/2)],size);
      mesh.setColorAt(i,t,t*(.96+hash(i,5,23)*.07),t*(.96+hash(i,7,27)*.08));
    });
    scene.addChild(mesh);meshes.push(mesh);
  }
  for(const [kind,list,model,map] of [['oak',placements.oak,oakGeometry(),textures.oak],['fir',placements.fir,firGeometry(),textures.pine]]){
    add(kind,model.bark,bark,'bark',list);
    add(kind,model.canopy,foliage(map),'canopy',list);
  }
  return {meshes,placements,textures};
}
