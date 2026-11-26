// 营地存档：几何体按名字写进场景文档（`tent/0`），读回来时按名字找回同一份几何；旧存档里整份写下的几何照样能读。
// The camp in the save: geometries go into the scene document by name (`tent/0`) and are found again by name on
// loading; a camp saved earlier, with its geometries written whole, still loads.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Object3D, serializeScene3D } = await import('@egret/engine/world3d');
const { CAMP_PIECES, createCamp } = await import('../src/play/camp.mjs');

const yard = { station: { x: 0, z: 0 }, heightAt: () => 0 };
const laidOut = () => {
  const camp = createCamp(new Object3D(), null, null, yard);
  for (const piece of CAMP_PIECES) camp.add(piece.key);
  camp.add('tent');
  return camp;
};

test('a saved camp names its geometries instead of holding them', () => {
  const camp = laidOut(),
    doc = camp.serialize();
  assert.ok(doc.geometries.length > 0);
  for (const geometry of doc.geometries) assert.match(geometry.key, /^[a-z]+\/\d$/);
  // Two tents share one geometry, written once.
  assert.equal(doc.geometries.filter((g) => g.key === 'tent/0').length, 1);
  assert.ok(JSON.stringify(doc).length < 20000, `${JSON.stringify(doc).length} characters`);
});

test('a camp read back has its pieces where they were, on the same geometries', () => {
  const camp = laidOut(),
    doc = JSON.parse(JSON.stringify(camp.serialize())),
    again = createCamp(new Object3D(), null, null, { ...yard, saved: doc });
  assert.equal(again.pieces.length, camp.pieces.length);
  again.pieces.forEach((piece, i) => {
    assert.equal(piece.name, camp.pieces[i].name);
    assert.deepEqual([...piece.position], [...camp.pieces[i].position]);
    assert.equal(piece.children[0].geometry, camp.pieces[i].children[0].geometry);
  });
});

test('a camp saved with whole geometries still loads', () => {
  const camp = laidOut(),
    old = JSON.parse(JSON.stringify(serializeScene3D(camp.group))),
    again = createCamp(new Object3D(), null, null, { ...yard, saved: old });
  assert.equal(again.pieces.length, camp.pieces.length);
  assert.ok(again.pieces[0].children[0].geometry.attributes.get('position').data.length > 0);
});
