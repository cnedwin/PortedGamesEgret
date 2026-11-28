import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { BOUNDS, BOXES, PLACES } = await import('../src/level.mjs');
const { Scene3D } = await import('@egret/engine/world3d');
const { createBuilder } = await import('../src/build.mjs');
const { groundWeedSites, makeDrainMaps, buildGroundDetails, appendTrafficCones, appendLampFittings, createDistantRidge, fitPlateLine, DRAIN_SITES, CONE_SITES } = await import('../src/ground-details.mjs');

test('ground dressing retains all original authored and seeded placements without altering level geometry', () => {
  let seed=7;const rand=()=> (seed=(seed*16807)%2147483647)/2147483647;
  const sites=[];const tuft=(x,z)=>{sites.push([x,z]);for(let i=0;i<30;i++)rand();};
  const w=BOUNDS.maxX-BOUNDS.minX,d=BOUNDS.maxZ-BOUNDS.minZ;
  for(let i=0;i<170;i++){
    const side=Math.floor(rand()*4),along=rand(),off=.15+rand()*.9;
    if(side===0)tuft(BOUNDS.minX+off,BOUNDS.minZ+along*d);
    else if(side===1)tuft(BOUNDS.maxX-off,BOUNDS.minZ+along*d);
    else if(side===2)tuft(BOUNDS.minX+along*w,BOUNDS.maxZ-off);
    else tuft(BOUNDS.minX+along*w,BOUNDS.minZ+1.3+off);
  }
  for(const b of BOXES){
    if(!['container','barrier','sandbag','crate','tyres'].includes(b.kind)||b.y-b.h/2>.1)continue;
    for(let i=0;i<(b.kind==='container'?5:2);i++){
      const onX=rand()<b.w/(b.w+b.d),sign=rand()<.5?-1:1;
      tuft(b.x+(onX?(rand()-.5)*b.w:sign*(b.w/2+.08)),b.z+(onX?sign*(b.d/2+.08):(rand()-.5)*b.d));
    }
  }
  assert.deepEqual(groundWeedSites(BOUNDS,BOXES),sites);
  assert.equal(DRAIN_SITES.length,5);assert.equal(CONE_SITES.length,6);
});

test('cast iron plate map is detailed, non-black, opaque and has a matching relief texture',()=>{
  const a=makeDrainMaps(),b=makeDrainMaps();
  assert.deepEqual(a,b);assert.equal(a.width,128);assert.equal(a.height,128);
  assert.equal(a.color.length,128*128*4);assert.equal(a.normal.length,a.color.length);
  const rgb=new Set(),normal=new Set();let luminance=0;
  for(let i=0;i<a.color.length;i+=4){assert.equal(a.color[i+3],255);assert.equal(a.normal[i+3],255);rgb.add(a.color[i]+','+a.color[i+1]+','+a.color[i+2]);normal.add(a.normal[i]+','+a.normal[i+1]);luminance+=a.color[i]+a.color[i+1]+a.color[i+2];}
  assert.ok(rgb.size>100&&normal.size>18);assert.ok(luminance/(128*128*3)>48);
});

test('ground plants and drains use two static native surfaces with a bounded mobile geometry budget',()=>{
  const scene=new Scene3D();const before=BOXES.length;const {grass,drains,sites}=buildGroundDetails(scene,BOUNDS,BOXES);
  assert.equal(BOXES.length,before);assert.equal(scene.children.length,2);
  assert.ok(grass.geometry.drawCount/3>sites.length*25&&grass.geometry.drawCount/3<sites.length*125);
  assert.ok(grass.geometry.boundingBox[1]>=.01&&grass.geometry.boundingBox[4]<.65);
  assert.equal(grass.material.side,'double');assert.equal(grass.castShadow,false);assert.equal(grass.receiveShadow,true);
  assert.ok(drains.material.map&&drains.material.normalMap);assert.ok(drains.geometry.drawCount/3<=DRAIN_SITES.length*64);
  assert.ok(drains.geometry.boundingBox[4]<.04);
  const builder=createBuilder();appendTrafficCones(builder);assert.ok(builder.finish().drawCount>500);
});
test('lamp fittings preserve every light anchor and distant landscape is a bounded decorative surface',()=>{
  const plain=createBuilder(),glow=createBuilder();const anchors=PLACES.lamps.map(p=>[...p]);
  appendLampFittings(plain,glow,PLACES.lamps);
  assert.deepEqual(PLACES.lamps,anchors);
  assert.ok(plain.finish().drawCount>PLACES.lamps.length*100&&glow.finish().drawCount>=PLACES.lamps.length*30);
  const hills=createDistantRidge();assert.ok(hills.drawCount/3>900&&hills.drawCount/3<3000);
  assert.ok(hills.boundingBox[0]<-300&&hills.boundingBox[3]>300);
  assert.ok(hills.getAttribute('color'));
  const pos=hills.getAttribute('position').data,normals=hills.getAttribute('normal').data;
  for(let i=0;i<128;i++)assert.ok(Math.abs(pos[i*3+1]+.25)<1e-5,'near edge meets outside ground');
  let n=0;for(let i=1;i<normals.length;i+=3)n+=normals[i];assert.ok(n/(normals.length/3)>.35,'top-facing ridge normals');
});
test('sign lettering is measured against the painted border instead of being clipped',()=>{
  const ctx={font:'',measureText(text){return {width:Number(/(\d+)px/.exec(this.font)[1])*text.length*.71};}};
  const px=fitPlateLine(ctx,'DANGER  HIGH VOLTAGE',224,26);
  assert.ok(px>0&&px<26);assert.ok(ctx.measureText('DANGER  HIGH VOLTAGE').width<=224);
  assert.equal(fitPlateLine(ctx,'EXIT',224,26),26);
});