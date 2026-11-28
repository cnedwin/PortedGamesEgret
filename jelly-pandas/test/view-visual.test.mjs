// Native visual-only changes use real World3D scene objects and unmodified rules as fixtures.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'node:module';
register('../vendor/node-resolve.mjs', import.meta.url);
const { Scene3D } = await import('@egret/engine/world3d');
const { ENEMIES, BOSSES } = await import('../src/data.mjs');
const { createIslandGeometry, groundHeight } = await import('../src/island.mjs');
const { createGame } = await import('../src/sim.mjs');
const { describeHazardCue, createView } = await import('../src/view.mjs');

test('visible warning cues follow actual bomb/dash/boss state, not a fabricated hit window',()=>{
  assert.equal(typeof describeHazardCue,'function');
  const mint={def:ENEMIES.find(e=>e.bomb),mode:1,modeT:.4,r:.5,x:4,z:5};
  const bomb=describeHazardCue(mint);
  assert.equal(bomb.kind,'bomb'); assert.equal(bomb.radius,3.2); assert.equal(bomb.progress,.5);
  assert.equal(describeHazardCue({...mint,mode:0}),undefined);
  assert.equal(describeHazardCue({...mint,dead:true}),undefined);
  const corn={def:ENEMIES.find(e=>e.dash),mode:1,modeT:.275,r:.5,dirX:1,dirZ:0,x:0,z:0};
  const dash=describeHazardCue(corn);
  assert.equal(dash.kind,'dash'); assert.equal(dash.dx,1); assert.equal(dash.dz,0); assert.equal(dash.progress,.5);
  assert.equal(describeHazardCue({...corn,mode:2}),undefined);
  const donut={def:BOSSES[1],boss:BOSSES[1],mode:1,modeT:.45,r:2.6,x:0,z:0,target:{x:3,z:4}};
  const charge=describeHazardCue(donut);
  assert.equal(charge.kind,'charge'); assert.equal(charge.progress,.5);
  assert.equal(charge.dx,.6); assert.equal(charge.dz,.8);
  assert.equal(describeHazardCue({...donut,mode:2}),undefined);
  const hop={def:BOSSES[0],boss:BOSSES[0],mode:0,leap:true,air:true,airT:.55,r:2.4,x:0,z:0};
  assert.equal(describeHazardCue(hop).kind,'hop'); assert.equal(describeHazardCue(hop).radius,7.5);
  assert.equal(describeHazardCue({...hop,air:false}),undefined);
});

test('bounded native instanced warnings are actual terrain-aligned ring and direction draws',()=>{
  const scene=new Scene3D(), geometry=createIslandGeometry(),view=createView(scene,{jelly:false,reflectionSize:0});
  view.attachIsland(geometry);
  const game=createGame({party:[{skin:0,human:true}],seed:7,islandGeometry:geometry});
  view.attach(game);
  const p=game.pandas[0];
  const mint=game.spawnEnemy(ENEMIES.findIndex(e=>e.bomb),p.x+2,p.z);
  mint.mode=1;mint.modeT=.6;
  const corn=game.spawnEnemy(ENEMIES.findIndex(e=>e.dash),p.x+8,p.z);
  corn.mode=1;corn.modeT=.4;corn.dirX=1;corn.dirZ=0;
  view.update(1/60,game);
  const {rings,arrows}=view.telegraphs;
  assert.equal(rings.count,32);
  assert.equal(arrows.count,3);
  assert.equal(rings.castShadow,false);assert.equal(arrows.castShadow,false);
  assert.equal(rings.layers,2);assert.equal(arrows.layers,2);
  const m=rings.instanceMatrices,x=m[12],y=m[13],z=m[14];
  assert.ok(Math.abs(Math.hypot(x-mint.x,z-mint.z)-3.2)<1e-5,'real bomb blast edge');
  assert.ok(y>groundHeight(x,z),'surface marker is above actual terrain');
  for(let i=0;i<36;i++) {
    const e=game.spawnEnemy(ENEMIES.findIndex(e=>e.bomb),p.x+3+(i%6)*.3,p.z+(i%4)*.6);
    e.mode=1;e.modeT=.6;
  }
  view.update(1/60,game);
  assert.equal(rings.count,rings.capacity,'warning instance capacity limits dense fights');
  assert.ok(arrows.count<=arrows.capacity);
  for(const e of game.enemies)e.mode=0;
  view.update(1/60,game);
  assert.equal(rings.count,0);assert.equal(arrows.count,0);
});

test('island visual texture shares the exact original physics geometry and preview never deletes normal props',()=>{
  const scene=new Scene3D(),geometry=createIslandGeometry(),before=geometry.getAttribute('position').data.slice();
  const view=createView(scene,{jelly:false,reflectionSize:0});
  view.attachIsland(geometry);
  const ground=scene.children.find(n=>n.geometry===geometry);
  assert.ok(ground.material.map,'textured ground material');
  assert.equal(ground.material.map.wrapS,'repeat');
  assert.ok(ground.material.map.mipmaps);
  assert.deepEqual(geometry.getAttribute('position').data,before);
  let game=createGame({party:[{skin:0,human:true}],seed:7,islandGeometry:geometry});
  view.attach(game);
  const props=game.props.map(p=>p.body.node);
  assert.ok(props.length>0&&props.every(n=>n.visible));
  view.setPreview(true);
  assert.ok(props.every(n=>!n.visible));
  assert.equal(game.props.length,props.length);
  const originalY=game.pandas[0].y;
  view.update(0,game);
  assert.equal(game.pandas[0].y,originalY,'preview does not change physics state');
  assert.ok(Math.abs(view.pandas[0].node.position[1]-groundHeight(game.pandas[0].x,game.pandas[0].z))<1e-5,'title panda stands on the ground');
  game=createGame({party:[{skin:1,human:true}],seed:8,islandGeometry:geometry});
  view.attach(game);
  assert.ok(game.props.every(p=>!p.body.node.visible));
  view.setPreview(false);
  assert.ok(game.props.every(p=>p.body.node.visible));
});

test('water uses native retained mirror interval and shore colors, not a new reflection pass',()=>{
  const scene=new Scene3D(),view=createView(scene,{jelly:false});
  assert.ok(view.water.reflection);
  assert.equal(view.water.reflection.interval,2);
  assert.equal(view.water.reflection.shadows,false);
  assert.equal(view.water.reflection.layerMask,~2);
  view.setReflect(false);assert.equal(view.water.material.reflectionMap,undefined);
  view.setReflect(true);assert.equal(view.water.material.reflectionMap,view.water.reflection.texture);
});

test('attaching a fresh game retires trails, rings, particles and pending impact even if the preview never advances time',()=>{
  const scene=new Scene3D(),geometry=createIslandGeometry(),view=createView(scene,{jelly:false,reflectionSize:0});
  view.attachIsland(geometry);
  let game=createGame({party:[{skin:0,human:true}],seed:7,islandGeometry:geometry});
  view.attach(game);
  const p=game.pandas[0];
  p.rolling=true;p.speedNow=8;
  view.update(1/60,game);p.x+=.6;view.update(1/60,game);
  const trails=scene.children.filter(n=>typeof n.pointCount==='number');
  assert.ok(trails.some(n=>n.pointCount>1&&n.visible),'actual trail exists');
  view.consume([{type:'slam',x:p.x,y:p.y,z:p.z,radius:4,panda:0,fall:7}]);
  const emitters=scene.children.filter(n=>typeof n.aliveCount==='number');
  assert.ok(emitters.some(n=>n.aliveCount>0),'native burst exists');
  assert.ok(view.rings.some(slot=>slot.mesh.visible)&&view.freeze>0&&view.shake>0);
  game=createGame({party:[{skin:2,human:true}],seed:8,islandGeometry:geometry});
  view.setPreview(true);view.attach(game);
  assert.ok(trails.every(n=>n.pointCount===0&&!n.visible));
  assert.ok(emitters.every(n=>n.aliveCount===0));
  assert.ok(view.rings.every(slot=>!slot.mesh.visible&&slot.t>=slot.life));
  assert.equal(view.freeze,0);assert.equal(view.shake,0);
  view.update(0,game);
  assert.ok(trails.every(n=>!n.visible),'reduced-motion title does not inherit old FX');
});

test('shore landmark upgrades preserve the original static draw count and a bounded triangle budget',()=>{
  const scene=new Scene3D(),view=createView(scene,{jelly:false});
  view.attachIsland(createIslandGeometry());
  const active=[];
  function visit(n){if(n.visible&&n.geometry&&n.count!==0)active.push(n);for(const child of n.children??[])visit(child);}
  visit(scene);
  const triangles=nodes=>nodes.reduce((sum,n)=>sum+(n.count??1)*(n.geometry.index?.data.length??n.geometry.getAttribute('position').data.length/3)/3,0);
  // Same scene object audit of the original: 11 meshes, 209118 triangles,
  // 42338 shadow triangles. Leave up to 12k extra static triangles for detail.
  assert.equal(active.length,11);
  assert.ok(triangles(active)<=221118);
  assert.ok(triangles(active.filter(n=>n.castShadow))<=54338);
});
