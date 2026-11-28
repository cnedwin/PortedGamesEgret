import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { createGeometry3D, createStandardMaterial3D, Texture3D, Object3D, Mesh3D, loadGltf3D } = await import('@egret/engine/world3d');
const { describeModel } = await import('../src/asset-models.mjs');
const { cropSceneModel, repeatSceneModel } = await import('../src/scene-modules.mjs');

// Attribute and index fingerprints intentionally retain raw order and bytes, including tangents.
function digest(model, source) {
  const hash = createHash('sha256');
  function bytes(view) {
    hash.update(view.constructor.name + ':' + view.length + ':');
    hash.update(Buffer.from(view.buffer, view.byteOffset, view.byteLength));
  }
  bytes(new Float64Array(model.bounds));
  for (const part of model.meshes) {
    assert(source.meshes.some(original => original.material === part.material));
    bytes(part.matrix);
    for (const [name, attr] of part.geometry.attributes) {
      hash.update(name + ':');
      bytes(attr.data);
    }
    bytes(part.geometry.index.data);
  }
  return hash.digest('hex');
}

function source() {
  const positions = [-2,-1,-0.2, -1,-1,0, -1,1,0, -0.5,-0.5,0, 0.8,-0.5,0, 0.8,0.8,0, 1,-1,0, 2,-1,0, 1,1,0.3];
  const normals = Array.from({ length: positions.length }, (_, i) => i % 3 === 2 ? 1 : 0);
  const uvs = Array.from({ length: positions.length / 3 * 2 }, (_, i) => (i % 7) / 6);
  const root = new Object3D();
  const material = createStandardMaterial3D({ color: 0xffffff, normalMap: new Texture3D({width:1,height:1,data:new Uint8Array([127,127,255,255])}) });
  root.addChild(new Mesh3D(createGeometry3D({ positions, normals, uvs, indices:[0,1,2,3,4,5,6,7,8] }), material));
  return describeModel(root);
}

const fixtures = [
  ['inside', model => cropSceneModel(model, [-3,-2,-1,3,2,1])],
  ['outside', model => cropSceneModel(model, [3,-2,-1,4,2,1])],
  ['mixed', model => cropSceneModel(model, [-1.2,-0.6,-0.1,1.2,0.7,0.2])],
  ['boundary', model => cropSceneModel(model, [-1,-1,-0.2,1,1,0.3])],
  ['nonfinite', model => cropSceneModel(model, [Infinity,NaN,Infinity,-Infinity,NaN,-Infinity])],
  ['repeat', model => repeatSceneModel(model, 0, 9.5, 1.4)]
];

test('clipped and repeated geometry preserves byte order in interior, exterior, mixed and boundary cases', () => {
  const model = source();
  const actual = Object.fromEntries(fixtures.map(([name, run]) => [name, digest(run(model), model)]));
  // Captured before the allocation optimization; boundary equality and order must not change.
  assert.deepEqual(actual, {
    inside:'2381fdfea7c4419c144c2be8597e94866861dbca8bbdf49637f704d39bd53e7c',
    outside:'627818f966d4f7475b8fe81ce925b4bd4567b859fdb5e5c35b79959e582f4163',
    mixed:'6be119286a515626a1a04492826a3dab375fc18851029abbb5fc09f43ce46802',
    boundary:'281e4bb104ea6f4d254f62883e58fbdaa0227906b4c0024b17c0b62143d28e45',
    nonfinite:'2381fdfea7c4419c144c2be8597e94866861dbca8bbdf49637f704d39bd53e7c',
    repeat:'9cb1be5ae859c2bf59c889a575f51d17014d370fe1882e967b252850e0adba1d'
  });
});

test('wholly inside faces do not copy read-only vertex arrays for every clipping plane', () => {
  const model = source();
  const original = Array.prototype.slice;
  let copies = 0;
  Array.prototype.slice = function (...args) {
    if (this.length === 8 && args.length === 0) copies++;
    return original.apply(this, args);
  };
  let result;
  try { result = cropSceneModel(model, [-3,-2,-1,3,2,1]); }
  finally { Array.prototype.slice = original; }
  assert(result.meshes[0].geometry.index.data.length > 0);
  assert.equal(copies, 0, 'fully inside vertices need no defensive clone');
});

test('shared indexed vertices keep exact transformed attributes and are transformed once per part', () => {
  const root = new Object3D();
  const material = createStandardMaterial3D({ color:0xffffff, normalMap:new Texture3D({width:1,height:1,data:new Uint8Array([127,127,255,255])}) });
  const geometry = createGeometry3D({
    positions:[-1,-1,-0.4, 1,-1,0, 1,1,0.2, -1,1,0.1],
    normals:[0.2,0,1, 0,0.3,1, 0.2,0.2,0.9, 0.1,0.5,0.9],
    uvs:[0,0, 1,0, 1,1, 0,1], indices:[0,1,2,0,2,3]
  });
  const mesh = new Mesh3D(geometry, material);
  mesh.setPosition(0.37,-0.21,0.51).setScale(1.3,0.8,1.1).setRotation(0.12,0.39,-0.2);
  root.addChild(mesh);
  const model=describeModel(root), part=model.meshes[0];
  const sourcePositions=part.geometry.getAttribute('position').data;
  const original=Float32Array.prototype.set;
  let transforms=0;
  Float32Array.prototype.set=function(values,...rest){
    // Count source-position conversion into the reusable three-component Float32 point only.
    if(this.length===3&&values?.length===3&&values.buffer===sourcePositions.buffer)transforms++;
    return original.call(this,values,...rest);
  };
  let result;
  try { result=cropSceneModel(model,[-0.7,-0.65,-1.1,1.3,0.45,1.5]); }
  finally { Float32Array.prototype.set=original; }
  assert.equal(digest(result,model),'9651d19c940cd44fb8b904c7bf9864b6e1490e89032f796963a5579514609aa6');
  assert.equal(transforms,new Set(part.geometry.index.data).size,'a repeated index reuses its converted position, normal and UV');
});

test('authored scene module crops retain exact geometry and original PBR materials', async () => {
  const actual = {};
  for (const name of ['container','plant']) {
    const bytes = await readFile(new URL('../assets/models/' + name + '.glb', import.meta.url));
    const asset = await loadGltf3D(bytes, { decodeImage: async () => ({ width:1,height:1,data:new Uint8Array([255,255,255,255]) }) });
    const model = describeModel(asset.scene);
    const axis = name === 'container' ? 2 : 0;
    const span = model.bounds[axis+3]-model.bounds[axis];
    const expanded = repeatSceneModel(model, axis, span*2.7, 1.3);
    const range = expanded.bounds.slice();
    range[axis] += (range[axis+3]-range[axis])*0.19;
    range[axis+3] -= (range[axis+3]-range[axis])*0.31;
    const cropped = cropSceneModel(expanded, range);
    actual[name] = {repeat:digest(expanded, model), crop:digest(cropped, model)};
    for (const part of [...expanded.meshes, ...cropped.meshes]) part.geometry.dispose();
    asset.dispose();
  }
  // Captured from the pre-optimization implementation at the same engine pin.
  assert.deepEqual(actual, {
    container:{repeat:'a221c8591fae6961b7a33e869946edbcf93ca67340001bfc6dbc5f7291e697c0',crop:'cb2954e4aeb4db4774d3b58ae0e7fb883138cfce91dc06a426a58c0281aebd3e'},
    plant:{repeat:'15d7147c5377b8145020fb819b70f206f69bd294f1d0eaa50de15e23e6062024',crop:'a89a63cdf517391821d1eef11900521a45bebb1b5b828c7ed3b161fffa72c5fe'}
  });
});
