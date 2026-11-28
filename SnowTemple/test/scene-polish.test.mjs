import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Scene3D, Mesh3D, InstancedMesh3D, createBoxGeometry3D } = await import('@egret/engine/world3d');
const scenery = await import('../src/view/scenery.mjs');
const { createSnowLook } = await import('../src/view/look.mjs');
const { edge, WET } = await import('../src/rules/arena.mjs');

test('snow and wet flags retain native material batches and the existing instance/light budget', () => {
  const scene = new Scene3D(), stock = createBoxGeometry3D({}), models = new Proxy({}, { get: () => stock });
  const built = scenery.buildScenery(scene, models, { density: 0.001 });
  const meshes = scene.children.filter(node => node instanceof Mesh3D);
  const byKey = key => meshes.filter(mesh => mesh.material.shader?.key === key);
  const ground = byKey('snow-ground'), paving = byKey('snow-flagstone'), grass = byKey('snow-reeds');
  assert.equal(ground.length, 1);
  assert.equal(paving.length, 2, 'matte and wet flags remain separate, not one draw per stone');
  assert.equal(grass.length, 1);
  assert.ok(grass[0] instanceof InstancedMesh3D);
  assert.equal(built.grass.count, 15);
  assert.equal(grass[0].geometry.drawCount, 30, 'five leaves remain ten triangles');
  assert.equal(built.lights.length, 10);
  assert.ok(Math.max(...built.lights.map(lamp => lamp.intensity)) <= 24, 'restrain source pools, especially the censer');
  const wet = built.paving.material, matte = paving.find(mesh => mesh.material !== wet).material;
  assert.ok(wet.roughness <= 0.32 && matte.roughness >= 0.72);
  assert.equal(wet.metallic, 0);
  assert.ok(wet.shader.uniforms[1] < matte.shader.uniforms[1], 'wet stone has fewer frost deposits');
  assert.ok(WET.every(([x,z]) => built.paving.nearReflection(x,z)), 'retain every original wet-rule patch');
  const wall = meshes.find(mesh => mesh.name === 'gate-wing-foundation');
  assert.ok(wall, 'the segmented wall is one native mesh');
  assert.ok(wall.geometry.drawCount / 3 <= 768, 'bounded decorative wall complexity');
});

test('gate wing foundations stay buried along both slopes and outside the walkable ground', () => {
  const segments = scenery.gateWallPlan();
  assert.equal(segments.length, 16);
  for (const segment of segments) {
    assert.ok(segment.top > segment.bottom);
    const samples = [-segment.width/2,0,segment.width/2].flatMap(dx =>
      [-segment.depth/2,0,segment.depth/2].map(dz => [segment.x+dx,segment.z+dz]));
    for (const [x,z] of samples) {
      assert.ok(edge(x,z) > 0, 'a decorative wall does not enter walkable terrain');
      assert.ok(segment.bottom < scenery.height(x,z), 'foundation follows the actual sloping ground');
      assert.ok(segment.top >= scenery.height(x,z) + 2.3, 'wall does not disappear below the adjacent ridge');
    }
  }
  for (const side of [-1,1]) {
    const wing = segments.filter(segment => Math.sign(segment.x) === side);
    const extent = wing.flatMap(segment => [Math.abs(segment.x)-segment.width/2,Math.abs(segment.x)+segment.width/2]);
    assert.ok(Math.abs(Math.min(...extent)-9.2)<1e-6 && Math.abs(Math.max(...extent)-25.2)<1e-6);
  }
});

test('night grade restrains the previous bright halos without new passes or unbounded exposure', () => {
  const post = { brightness: 1 }, renderer = { postProcess:post }, update = createSnowLook(renderer,true);
  assert.equal(post.bloomLevels,6);
  assert.equal(post.fxaa,true);
  assert.equal(post.ssao,true);
  assert.ok(post.bloomThreshold >= 1.4);
  assert.ok(post.bloomIntensity <= 0.2);
  assert.equal(post.custom.key,'snow-night-mist');
  const camera={updateWorldMatrix(){},matrixWorld:[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,2,0,1]};
  const lamps=[
    {distance:2,fire:false,light:{position:[1,0,0],intensity:100}},
    {distance:2,fire:true,light:{position:[-1,0,0],intensity:100}},
    {distance:30,fire:true,light:{position:[0,0,3],intensity:100}}
  ];
  for(let i=0;i<12;i++)update(camera,lamps,false,false,1);
  assert.ok(post.custom.uniforms[7] > 0 && post.custom.uniforms[7] <= 0.69);
  assert.ok(post.custom.uniforms[11] < 0 && post.custom.uniforms[11] >= -0.69);
  assert.equal(post.custom.uniforms[15],0);
  assert.ok(post.brightness >= 0.9 && post.brightness <= 1);
  for(let i=0;i<12;i++)update(camera,lamps,true,true,1);
  assert.ok(post.brightness >= 0.8 && post.brightness <= 0.9);
});
