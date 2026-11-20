import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const {
  InstancedMesh3D, Mesh3D, Scene3D, Texture3D, createBoxGeometry3D, createGradientCubeTexture3D, createHeightField3D,
  createPerspectiveCamera3D, createPhysicsWorld3D, createStandardMaterial3D, createTerrain3D, createTerrainMaterial3D
} = await import('@egret/engine/world3d');
const { WebGL2Renderer3D } = await import('@egret/engine/webgl2/world3d');
const { stoneGeometry } = await import('../src/models/plants.mjs');
const { createConvoy } = await import('../src/play/convoy.mjs');
const { createEffects } = await import('../src/play/effects.mjs');
const { createLandmarks } = await import('../src/world/landmarks.mjs');
const { prepareRoadPrograms } = await import('../src/world/programs.mjs');
const { createWaters } = await import('../src/world/water.mjs');

test('the first-use road shader keys are linked before any view draws', async () => {
  // Keep WebGL off this test machine. The production renderer still selects the keys and deduplicates links.
  let linked = 0;
  const gl = {
    MAX_TEXTURE_SIZE: 1, CURRENT_PROGRAM: 2, LINK_STATUS: 3, ACTIVE_UNIFORMS: 4, INVALID_INDEX: -1,
    getParameter(parameter) { return parameter === this.MAX_TEXTURE_SIZE ? 4096 : null; },
    getExtension: () => null,
    isContextLost: () => false,
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    createProgram: () => ({}),
    attachShader() {},
    linkProgram() { linked++; },
    getProgramParameter(_program, parameter) { return parameter === this.LINK_STATUS ? true : 0; },
    getUniformBlockIndex() { return this.INVALID_INDEX; },
    useProgram() {},
    deleteShader() {}
  };
  const canvas = { getContext: () => gl, addEventListener() {} };
  const renderer = new WebGL2Renderer3D({ canvas, toneMapping: 'aces', shadows: true });
  renderer.postProcess.enabled = true;
  const shaders = new Set();
  const request = renderer.programRequest.bind(renderer);
  renderer.programRequest = (...args) => {
    const result = request(...args);
    shaders.add(result.key);
    return result;
  };

  const scene = new Scene3D();
  scene.environment = createGradientCubeTexture3D([1, 1, 1], [1, 1, 1], [1, 1, 1], 2);
  const camera = createPerspectiveCamera3D();
  const physics = createPhysicsWorld3D();
  const texture = new Texture3D({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 0]) });
  const plant = new InstancedMesh3D(createBoxGeometry3D(), createStandardMaterial3D({ map: texture }), 1);
  plant.setColorAt(0, 1, 1, 1);
  scene.addChild(plant);
  scene.addChild(new Mesh3D(createBoxGeometry3D(), createStandardMaterial3D({
    map: texture, normalMap: texture, side: 'double'
  })));
  const waters = createWaters(scene, { quality: 'high' });
  const convoy = createConvoy(scene, physics, () => 0);
  createLandmarks(scene, physics, { quality: 'high' });
  createEffects(scene, physics, convoy, { land: {}, water: waters, quality: 'high' });
  const field = createHeightField3D({ width: 1, depth: 1, columns: 2, rows: 2, heights: new Float32Array(4) });
  scene.addChild(createTerrain3D(field, createTerrainMaterial3D({ layers: [texture, texture, texture, texture], weights: texture })));
  scene.addChild(new InstancedMesh3D(stoneGeometry(0), createStandardMaterial3D({ vertexColors: true }), 1));
  const initialChildren = [...scene.children];

  await prepareRoadPrograms(renderer, scene, camera, waters);

  const mirror = 'TONE_MAPPED LINEAR_OUTPUT';
  const standardMirror = 'USE_ENVIRONMENT ' + mirror;
  const waterFeatures = ' USE_TRANSMISSION USE_REFLECTION_MAP CUSTOM_FRAGMENT CUSTOM_VERTEX CUSTOM_NORMAL|world3d-water';
  const sceneDepth = [
    'DEPTH_ONLY USE_NORMAL',
    'DEPTH_ONLY USE_NORMAL USE_MAP',
    'DEPTH_ONLY USE_NORMAL USE_INSTANCING USE_VERTEX_COLOR',
    'DEPTH_ONLY USE_NORMAL USE_VERTEX_COLOR',
    'DEPTH_ONLY USE_NORMAL USE_INSTANCING USE_MAP',
    'DEPTH_ONLY USE_NORMAL USE_MAP ALPHA_MASK'
  ];
  assert.deepEqual(shaders, new Set([
    'SHADING_STANDARD USE_NORMAL ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_MAP DOUBLE_SIDED ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_MAP USE_NORMAL_MAP DOUBLE_SIDED ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_INSTANCING USE_VERTEX_COLOR USE_INSTANCE_COLOR ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_INSTANCING USE_VERTEX_COLOR ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_VERTEX_COLOR ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_INSTANCING USE_MAP ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_MAP ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_SPLAT ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_SOFT_DEPTH DOUBLE_SIDED ' + standardMirror + waterFeatures,
    'SHADING_UNLIT USE_NORMAL USE_INSTANCING GPU_PARTICLES BILLBOARD USE_MAP ALPHA_BLEND USE_INSTANCE_COLOR DOUBLE_SIDED ' + mirror,
    'SHADING_UNLIT USE_MAP ALPHA_BLEND USE_VERTEX_COLOR DOUBLE_SIDED ' + mirror,
    'SHADING_STANDARD USE_NORMAL USE_MAP ALPHA_BLEND ' + standardMirror,
    'SHADING_STANDARD USE_NORMAL USE_MAP ALPHA_MASK DOUBLE_SIDED ' + standardMirror,
    ...sceneDepth,
    'SHADING_STANDARD USE_NORMAL USE_MAP RECEIVE_SHADOW USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_MAP USE_NORMAL_MAP DOUBLE_SIDED RECEIVE_SHADOW USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_INSTANCING USE_MAP RECEIVE_SHADOW USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_SOFT_DEPTH DOUBLE_SIDED RECEIVE_SHADOW USE_ENVIRONMENT LINEAR_OUTPUT' + waterFeatures,
    'DEPTH_ONLY USE_NORMAL USE_SKINNING USE_VERTEX_COLOR',
    'SHADING_STANDARD USE_NORMAL USE_SKINNING USE_VERTEX_COLOR RECEIVE_SHADOW USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_SKINNING USE_VERTEX_COLOR ' + standardMirror
  ]));
  assert.equal(linked, shaders.size);
  assert.deepEqual(scene.children, initialChildren);

  shaders.clear();
  const previousLinks = linked;
  renderer.shadowsEnabled = false;
  await prepareRoadPrograms(renderer, scene, camera, waters, { reflections: false });
  assert.deepEqual(shaders, new Set([
    ...sceneDepth,
    'SHADING_STANDARD USE_NORMAL USE_MAP USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_MAP USE_NORMAL_MAP DOUBLE_SIDED USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_INSTANCING USE_MAP USE_ENVIRONMENT LINEAR_OUTPUT',
    'SHADING_STANDARD USE_NORMAL USE_SOFT_DEPTH DOUBLE_SIDED USE_ENVIRONMENT LINEAR_OUTPUT' + waterFeatures,
    'SHADING_STANDARD USE_NORMAL USE_SKINNING USE_VERTEX_COLOR USE_ENVIRONMENT LINEAR_OUTPUT'
  ]));
  assert.equal(linked - previousLinks, 5);
  assert.deepEqual(scene.children, initialChildren);
});
