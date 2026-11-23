// Original Han-inspired miniatures, not archaeological reconstructions or modern monument models.
// Chang'an high platforms: https://www.chnmus.net/ch/information/media/details.html?id=510167250563336824
// Han/Wei Luoyang context: https://hanweimuseum.cn/
// Explicitly avoid later Tang/Ming silhouettes and pre-dating the 212 Stone City / 223 Yellow Crane Tower.
import {createGeometry3D,createCylinderGeometry3D} from '@egret/engine/world3d';
import {NODES} from '../data/map.mjs';
import {HEX_W,HEX_H} from '../sim/hexgrid.mjs';
import {landAt} from '../sim/land.mjs';
import {routeLine,along} from '../sim/ways.mjs';

const north={roof:0x46565a,wall:0x958a75,plaster:0xd0c6b0,paving:0xa39478,houseRoofs:[0x4b5152,0x5c5b53,0x444d50,0x646052],houseWalls:[0xaaa089,0x988e77,0xb9ae95,0x9e937c]};
const south={roof:0x3c6562,wall:0xa6a28d,plaster:0xe3d7bd,paving:0x99977a,houseRoofs:[0x4e6763,0x52736b,0x465d5c,0x61756a],houseWalls:[0xc1b69b,0xd0c4a8,0xb2ae95,0xc9c1aa]};
const west={roof:0x535044,wall:0xaa916a,plaster:0xd2bd96,paving:0xa99771,houseRoofs:[0x645d4d,0x514f45,0x756a54,0x5b5a4d],houseWalls:[0xb2a07e,0xa99472,0xc2ae89,0xb19b77]};
export const CITY_IDENTITIES={
 changan:{...west,id:'western-capital',landmarks:['未央宫高台','长乐宫院','汉式双阙'],palace:'weiyang',harbour:false},
 luoyang:{...north,id:'eastern-capital',roof:0x3e6667,landmarks:['南北双宫','两宫复道','宫阙礼制院'],palace:'twin-palaces',harbour:false},
 jianye:{...south,id:'river-capital',landmarks:['江防石垒','水军船坞','滨江仓城'],palace:'river-citadel',harbour:'naval'},
 xiakou:{...south,id:'river-fortress',roof:0x4a616b,landmarks:['夏口江防望楼','水军营院'],palace:'river-watch',harbour:'naval'},
 guangling:{...north,id:'canal-market',roof:0x58716b,landmarks:['广陵粮仓','漕运商院'],palace:'granaries',harbour:'grain'},
 nanhai:{...south,id:'maritime-trade',roof:0x796443,landmarks:['南海商仓','海贸船场'],palace:'maritime-market',harbour:'sea'},
 chengdu:{...south,id:'brocade-city',roof:0x52765f,landmarks:['蜀锦作坊','官署庭院'],palace:'brocade',harbour:false},
 xuchang:{...north,id:'court-city',roof:0x535968,landmarks:['官署三院','许县双阙'],palace:'court',harbour:false},
 wuwei:{...west,id:'hexi-frontier',landmarks:['河西烽燧链','边郡戍院'],palace:null,harbour:false},
 dunhuang:{...west,id:'silk-road-frontier',landmarks:['汉式边燧','边郡仓院'],palace:null,harbour:false}
};
export function cityIdentity(id){
 if(CITY_IDENTITIES[id])return CITY_IDENTITIES[id];
 const n=NODES[id],palette=['yi','yang','jing','jiao'].includes(n?.prov)?south:['liang','bing','yong'].includes(n?.prov)?west:north;
 return {...palette,id:n?.kind==='port'?(n.water==='s'?'sea-harbour':'river-ferry'):'regional-'+(palette===south?'south':palette===west?'west':'north'),landmarks:[],palace:null,harbour:n?.kind==='port'?(n.water==='s'?'sea':'ferry'):false};
}

/** Local reservations only; the immutable city boundary and all external gate coordinates stay unchanged. */
export function landmarkLayout(f){
 const hx=(f.a-.25)*HEX_W,hz=f.b*HEX_H;
 const rect=(kind,x,z,w,d)=>({kind,x:x*hx,z:z*hz,w:w*hx,d:d*hz});
 switch(cityIdentity(f.id).palace){
  case 'weiyang':return [rect('weiyang',-.46,-.35,.78,.78),rect('changle',.48,-.36,.64,.70)];
  case 'twin-palaces':return [rect('north-palace',0,-.48,.74,.64),rect('south-palace',0,.46,.68,.64),rect('gallery',-.47,0,.11,.25),rect('gallery',.47,0,.11,.25)];
  case 'river-citadel':return [rect('citadel',-.43,-.32,.64,.66),rect('shipyard',.45,.35,.62,.70)];
  case 'river-watch':return [rect('watchtower',-.44,-.28,.40,.56),rect('barracks',.42,.28,.65,.70)];
  case 'granaries':return [rect('granary',-.43,-.28,.65,.78),rect('market',.43,.29,.62,.70)];
  case 'maritime-market':return [rect('trade-court',-.42,-.24,.62,.76),rect('shipyard',.43,.28,.65,.74)];
  case 'brocade':return [rect('brocade',-.45,-.30,.68,.80),rect('court',.45,.32,.65,.72)];
  case 'court':return [rect('court',0,-.15,.84,1.13)];
  default:return [];
 }
}
export const reservedForLandmark=(layout,x,z,padding=.2)=>layout.some(p=>Math.abs(x-p.x)<p.w/2+padding&&Math.abs(z-p.z)<p.d/2+padding);

const shoreCache=new WeakMap();
// Include both pier corners and the transverse landing: the closest bank may already carry a bridge.
const DOCK_CLEARANCE_SAMPLES=[[-.9,-.625],[-.9,.625],[4.3,-.625],[4.3,.625],[3.39,-2.4],[3.39,2.4],[4.21,-2.4],[4.21,2.4]];
/** A dock is allowed only at a sampled local shore. The hull bow, middle and stern must all lie on real water. */
export function findCityHarbour(f){
 if(shoreCache.has(f))return shoreCache.get(f);
 const sample={},candidates=[];let first=Infinity;
 for(let radius=4;radius<=74&&radius<=first+8;radius+=2){
  for(let i=0;i<24;i++){
   const angle=i/24*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle);
   landAt(f.x+dx*radius,f.z+dz*radius,sample);if(!sample.water)continue;
   first=Math.min(first,radius);let lo=Math.max(0,radius-2),hi=radius;
   for(let k=0;k<7;k++){const mid=(lo+hi)/2;landAt(f.x+dx*mid,f.z+dz*mid,sample);if(sample.water)hi=mid;else lo=mid;}
   const x=f.x+dx*hi,z=f.z+dz*hi,berths=[];
   const clear=DOCK_CLEARANCE_SAMPLES.every(([depth,side])=>landAt(x+dx*depth+dz*side,z+dz*depth-dx*side,sample).road>2.2);
   if(!clear)continue;
   landAt(x-dx*.6,z-dz*.6,sample);const ground=sample.height;
   for(const[depth,side]of[[3.0,1.5],[4.8,-1.4],[6.4,1.5]]){
    const bx=x+dx*depth+dz*side,bz=z+dz*depth-dx*side;
    const waters=[-1.25,0,1.25].map(d=>({...landAt(bx+dx*d,bz+dz*d,{})}));
    if(waters.every(p=>p.water))berths.push({x:bx,z:bz,level:waters[1].level});
   }
   if(!berths.length)continue;
   landAt(x+dx*2,z+dz*2,sample);const waterLevel=sample.level;
   if(!sample.water||ground-waterLevel>3.5)continue;
   candidates.push({x,z,dx,dz,ground,waterLevel,berths,score:hi+(ground-waterLevel)*1.4});
  }
 }
 const result=candidates.sort((a,b)=>a.score-b.score)[0]??null;shoreCache.set(f,result);return result;
}

const disc=createCylinderGeometry3D({radiusTop:1,radiusBottom:1,height:1,radialSegments:16});
function prismHull(){
 const p=[],n=[];
 const triangle=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;p.push(...a,...b,...c);for(let i=0;i<3;i++)n.push(nx/l,ny/l,nz/l);};
 const top=[[-.5,.3,-.35],[0,.3,-.56],[.5,.3,-.35],[.46,.3,.38],[0,.3,.56],[-.46,.3,.38]],keel=[0,-.25,0];
 for(let i=0;i<top.length;i++){triangle(keel,top[(i+1)%top.length],top[i]);triangle([0,.3,0],top[i],top[(i+1)%top.length]);}
 return createGeometry3D({positions:new Float32Array(p),normals:new Float32Array(n)});
}
const hull=prismHull();

/** Add landmark geometry to the same three stone/roof/body builders used by the city. */
export function buildCityLandmarks(b,f,level,kit,{coarse=false}={}){
 const style=cityIdentity(f.id),layout=landmarkLayout(f),{UNIT,pavilion,hipRoof,gableRoof}=kit;
 const block=(builder,x,y,z,w,h,d,color,rotation=0)=>builder.add(UNIT.box,{position:[f.x+x,level+y,f.z+z],scale:[w,h,d],color,rotation:[0,rotation,0]});
 function hall(x,z,w,d,height,{base=.22,tiers=1,body=style.plaster}={}){
  block(b.stone,x,base/2,z,w+.55,base,d+.55,style.wall);
  if(coarse){block(b.body,x,base+height/2,z,w,height,d,body);b.roof.add(hipRoof(w+.65,d+.65,(d+.65)*.38),{position:[f.x+x,level+base+height,f.z+z],color:style.roof});}
  else pavilion(b,[f.x+x,level+base,f.z+z],w,d,height,{tiers,body,roof:style.roof});
 }
 function que(x,z,height=1.6){
  block(b.stone,x,height*.42,z,.55,height*.84,.58,style.wall);
  block(b.stone,x,height*.84,z,.83,.16,.8,0xc3b491);
  b.roof.add(hipRoof(1.12,.96,.34),{position:[f.x+x,level+height*.9,f.z+z],color:style.roof});
  if(!coarse)block(b.body,x,height*.77,z+.31,.16,.42,.045,0x584a32);
 }
 function enclosure(p){
  if(coarse)return;
  for(const side of[-1,1])block(b.stone,p.x+side*p.w/2,.26,p.z,.16,.52,p.d,style.wall);
  block(b.stone,p.x,.26,p.z-p.d/2,p.w,.52,.16,style.wall);
  for(const side of[-1,1])block(b.stone,p.x+side*(p.w/4+.5),.26,p.z+p.d/2,p.w/2-1,.52,.16,style.wall);
 }
 for(const p of layout){
  const {x,z,w,d}=p;block(b.body,x,.035,z,w,.06,d,style.paving);enclosure(p);
  if(p.kind==='weiyang'){
   const bw=w*.77,bd=d*.66;
   for(let tier=0;tier<(coarse?1:3);tier++)block(b.stone,x,.32+tier*.32,z-d*.1,bw-tier*.45,.64,bd-tier*.32,style.wall);
   hall(x,z-d*.1,bw*.72,bd*.70,1.15,{base:1.05,tiers:2,body:0x8e4c37});
   if(!coarse){for(let step=0;step<5;step++)block(b.stone,x,.08+step*.12,z+d*.28-step*.17,bw*.35,.16,.8,0xc9b48d);for(const side of[-1,1])que(x+side*w*.32,z+d*.39,2.0);}
  }else if(p.kind==='changle'){
   hall(x,z-d*.13,w*.57,d*.46,.8,{base:.45,body:0x9b5b40});
   if(!coarse)for(const side of[-1,1])hall(x+side*w*.34,z+d*.15,w*.16,d*.58,.44,{base:.08});
  }else if(p.kind==='north-palace'||p.kind==='south-palace'){
   hall(x,z-d*.04,w*.58,d*.57,p.kind==='north-palace'?1.0:.83,{base:p.kind==='north-palace'?.68:.38,tiers:2,body:0x86513e});
   if(!coarse){for(const side of[-1,1])hall(x+side*w*.35,z+d*.12,w*.18,d*.6,.48,{base:.12});for(const side of[-1,1])que(x+side*w*.21,z+d*.43,1.55);}
  }else if(p.kind==='gallery'){
   block(b.body,x,.64,z,w*.5,1.0,d,0x734536);b.roof.add(gableRoof(d+.3,w+.45,.35),{position:[f.x+x,level+1.15,f.z+z],rotation:[0,Math.PI/2,0],color:style.roof});
  }else if(p.kind==='citadel'){
   block(b.stone,x,.55,z,w*.87,1.1,d*.8,0x8b8e7c);hall(x,z,w*.55,d*.46,1.0,{base:1.1,tiers:2});
   if(!coarse)for(const side of[-1,1]){block(b.stone,x+side*w*.37,.8,z+d*.3,.7,1.6,.8,0x929782);que(x+side*w*.36,z+d*.3,2.0);}
  }else if(p.kind==='watchtower'){
   block(b.stone,x,.6,z,w*.84,1.2,d*.82,0x838f82);hall(x,z,w*.62,d*.55,1.85,{base:1.15,tiers:2,body:0xc7c6ac});
   if(!coarse)for(const side of[-1,1])block(b.body,x+side*w*.4,1.75,z,.1,2.0,d*.9,0x6b4d37);
  }else if(p.kind==='granary'){
   for(const side of[-1,1]){hall(x+side*w*.25,z,w*.35,d*.69,1.15,{base:.55,body:0xb09b73});if(!coarse)for(let i=0;i<4;i++)block(b.stone,x+side*w*.25,.25,z+(i-1.5)*d*.16,w*.30,.5,.15,0x7e7762);}
  }else if(p.kind==='brocade'){
   for(const side of[-1,1])hall(x+side*w*.33,z-d*.07,w*.26,d*.77,.64,{base:.14});hall(x,z-d*.33,w*.57,d*.23,.8);
   if(!coarse)for(let i=0;i<5;i++){const px=x+(i-2)*w*.12;block(b.body,px,.63,z+d*.20,w*.10,.018,d*.37,[0x547b80,0xa96b4d,0x8c6c88,0xc1a260,0x677c5d][i]);for(const side of[-1,1])block(b.body,px,.32,z+d*(.20+side*.19),.045,.65,.045,0x65583e);}
  }else if(p.kind==='shipyard'){
   hall(x,z-d*.27,w*.67,d*.30,.58,{base:.10,body:0xd3bf94});
   for(const side of[-1,1]){block(b.body,x+side*w*.23,.18,z+d*.15,w*.19,.18,d*.55,0x71604a);if(!coarse){b.body.add(hull,{position:[f.x+x+side*w*.23,level+.40,f.z+z+d*.15],scale:[w*.22,.42,d*.59],color:0x856643});block(b.body,x+side*w*.23,1.20,z+d*.15,.06,2.0,.06,0x645037);}}
  }else if(p.kind==='court'){
   hall(x,z-d*.22,w*.59,d*.34,.95,{base:.42,tiers:2,body:0x8d5240});
   if(!coarse){for(const side of[-1,1])hall(x+side*w*.34,z+d*.07,w*.18,d*.6,.52,{base:.12});for(const side of[-1,1])que(x+side*w*.22,z+d*.35,1.75);}
  }else{
   // Merchant courtyards / riverside barracks have long low galleries, not an imperial hall.
   hall(x,z-d*.20,w*.69,d*.34,.75,{base:.22});
   if(!coarse)for(const side of[-1,1])hall(x+side*w*.33,z+d*.12,w*.18,d*.55,.46,{base:.1});
  }
 }
 // A central ritual forecourt identifies the eastern capital between its two distinct palace groups.
 if(style.palace==='twin-palaces'){
  block(b.stone,0,.08,0,4.8,.16,2.3,0xb8b39b);
  for(const side of[-1,1])que(side*1.6,0,coarse?1.8:2.35);
  if(!coarse)b.body.add(disc,{position:[f.x,level+.20,f.z],scale:[.5,.35,.5],color:0x6d795f});
 }
 return {identity:style.id,landmarks:style.landmarks.slice(),layout};
}

/** Docks and ships are appended into existing city batches. No geographic or collision surface is changed. */
export function buildCityHarbour(b,f,kit,{coarse=false,flags=[]}={}){
 const plan=findCityHarbour(f);if(!plan)return null;
 const {UNIT,gableRoof}=kit,style=cityIdentity(f.id),rot=Math.atan2(plan.dx,plan.dz),deck=Math.max(plan.waterLevel+.25,plan.ground+.06);
 const point=(depth,side)=>[plan.x+plan.dx*depth+plan.dz*side,plan.z+plan.dz*depth-plan.dx*side];
 const block=(x,y,z,w,h,d,color)=>b.body.add(UNIT.box,{position:[x,y,z],scale:[w,h,d],rotation:[0,rot,0],color});
 const [qx,qz]=point(1.7,0);block(qx,deck,qz,1.25,.14,5.2,0x8a6c47);
 const [tx,tz]=point(3.8,0);block(tx,deck,tz,4.8,.14,.82,0x80643f);
 if(!coarse){
  for(let depth=0;depth<=4.5;depth+=.75)for(const side of[-1,1]){const[x,z]=point(depth,side*.53);block(x,deck-.65,z,.09,1.45,.09,0x544632);}
  for(let i=0;i<6;i++){const[x,z]=point(.1,i*.25-1.4),sample=landAt(x,z,{});if(!sample.water)block(x,sample.height+.15,z,.3,.3,.35,0x9a8052);}
  // A simple covered landing on genuinely dry ground, using the same roof material as its city.
  const[x,z]=point(-1.25,1.0),land=landAt(x,z,{});
  if(!land.water){block(x,land.height+.4,z,1.9,.8,1.1,style.plaster);b.roof.add(gableRoof(2.2,1.4,.52),{position:[x,land.height+.8,z],rotation:[0,rot,0],color:style.roof});}
 }
 for(const berth of plan.berths.slice(0,coarse?1:3)){
  const y=berth.level+.12;
  b.body.add(hull,{position:[berth.x,y,berth.z],scale:[.8,.5,2.4],rotation:[0,rot,0],color:0x65462f});
  block(berth.x,y+.22,berth.z,.55,.24,1.25,0xa0895e);
  block(berth.x,y+1.10,berth.z,.055,2.2,.055,0x5a4933);
  if(!coarse){block(berth.x+plan.dz*.22,y+1.23,berth.z-plan.dx*.22,.48,1.15,.028,0xd2c39c);block(berth.x,y+.45,berth.z,.42,.3,.7,0x776f55);}
 }
 if(!coarse){const[x,z]=point(-.7,0);flags.push([x,Math.max(plan.ground,deck),z]);}
 return {x:plan.x,z:plan.z,dx:plan.dx,dz:plan.dz,deck,berths:plan.berths.map(p=>({...p}))};
}

const beaconShaft=createCylinderGeometry3D({radiusTop:.64,radiusBottom:1,height:1,radialSegments:4});
/** Small regional landmarks live beside existing routes/real water, with no clickable or simulated nodes. */
export function outlyingLandmarkPlan(f){
 const result=[];
 if(f.id==='wuwei'||f.id==='dunhuang'){
  const other=f.id==='wuwei'?'dunhuang':'wuwei',line=routeLine(f.id,other);
  for(const share of[.028,.055,.080]){
   const p=along(line,share),x=p.x+Math.cos(p.heading)*4.5,z=p.z-Math.sin(p.heading)*4.5,ground=landAt(x,z,{});
   if(!ground.water&&!ground.place)result.push({kind:'beacon',name:'河西烽燧',x,z,y:ground.height,heading:p.heading});
  }
 }
 if(f.id==='chengdu'){
  const p=findCityHarbour(f);if(p)result.push({kind:'waterworks',name:'蜀郊分水木堰',x:p.x,z:p.z,y:p.waterLevel,dx:p.dx,dz:p.dz,ground:p.ground});
 }
 return result;
}
export function buildOutlyingLandmarks(b,f,kit,{coarse=false,flags=[]}={}){
 const plan=outlyingLandmarkPlan(f),{UNIT,pavilion}=kit;
 for(const p of plan){
  if(p.kind==='beacon'){
   b.stone.add(UNIT.box,{position:[p.x,p.y+.16,p.z],scale:[3,.5,3],color:0x9d8863});
   b.stone.add(beaconShaft,{position:[p.x,p.y+1.75,p.z],scale:[1.5,3.4,1.5],rotation:[0,Math.PI/4,0],color:0xb09a70});
   b.stone.add(UNIT.box,{position:[p.x,p.y+3.45,p.z],scale:[2.6,.22,2.6],color:0x91774e});
   if(!coarse){
    for(const side of[-1,1])for(const axis of[0,1])b.stone.add(UNIT.box,{position:[p.x+(axis?0:side*1.15),p.y+3.82,p.z+(axis?side*1.15:0)],scale:axis?[2.5,.6,.25]:[.25,.6,2.5],color:0xa28b60});
    for(let step=0;step<6;step++)b.body.add(UNIT.box,{position:[p.x+.8,p.y+.4+step*.47,p.z+1.0],scale:[.5,.07,.1],color:0x594a31});
    flags.push([p.x,p.y+3.6,p.z]);
   }
  }else{
   const rot=Math.atan2(p.dx,p.dz),at=(d,s)=>[p.x+p.dx*d+p.dz*s,p.z+p.dz*d-p.dx*s];
   for(const side of[-1,1]){
    const[x,z]=at(1.0,side*1.1);
    b.stone.add(UNIT.box,{position:[x,p.y+.15,z],scale:[.65,.55,2.7],rotation:[0,rot+side*.22,0],color:0x8f927d});
    b.body.add(UNIT.box,{position:[x,p.y+.65,z],scale:[.12,1.5,.13],color:0x675239});
   }
   const[x,z]=at(1.0,0);b.body.add(UNIT.box,{position:[x,p.y+1.30,z],scale:[3.1,.17,.18],rotation:[0,rot,0],color:0x8e744e});
   if(!coarse){
    for(const side of[-1,1]){const[a,c]=at(.7,side*.65);b.body.add(UNIT.box,{position:[a,p.y+.75,c],scale:[.46,.85,.065],rotation:[0,rot,0],color:0x826743});}
    const[a,c]=at(-1.7,-1.2),ground=landAt(a,c,{});
    if(!ground.water)pavilion(b,[a,ground.height,c],1.5,.95,.65,{roof:0x596c5a,body:0xc0b698,rot});
   }
  }
 }
 return plan.map(p=>({...p}));
}
