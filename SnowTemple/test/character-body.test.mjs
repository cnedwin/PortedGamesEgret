import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

// The engine is found under the names the page uses: the vendored copy brings its own Node loader.
const { Scene3D, createBoxGeometry3D, createPerspectiveCamera3D, createStandardMaterial3D } =
  await import('@egret/engine/world3d');
const { createGame } = await import('../src/rules/game.mjs');
const { createView } = await import('../src/view/view.mjs');

test('a late character body retains pose, tint and equipment and survives round resets', () => {
  const scene = new Scene3D(),
    camera = createPerspectiveCamera3D({}),
    stock = createBoxGeometry3D({}),
    models = new Proxy({}, { get: () => stock }),
    geometry = createBoxGeometry3D({ width: 2 }),
    template = createStandardMaterial3D({ emissive: 0x336699, emissiveIntensity: 2 }),
    parts = [{ geometry, material: template }, { geometry, material: [template] }],
    game = createGame();
  scene.addChild(camera);
  const view = createView(scene, camera, models, { detail: 'low', density: 0.01, particles: 0.2 });
  const actor = kind => scene.children.find(child => child.name === kind);
  const body = root => root.children.find(child => child.skeleton);
  function emitted(material) {
    return Array.from(material.emissive, value => value * material.emissiveIntensity);
  }
  try {
    assert.throws(() => view.useCharacterBody('bow', [{ geometry, material: [] }]), /requires live materials/);

    game.boss.face = 0.9;
    view.update(game, [], 1 / 60, 1);
    const lu = actor('lu'),
      old = body(lu),
      skeleton = old.skeleton,
      joint = skeleton.bones.find(node => node.name === 'spine'),
      pose = joint.quaternion.slice(),
      weapon = skeleton.bones.find(node => node.name === 'weapon').children.slice(),
      tint = emitted(old.material),
      authored = emitted(template);
    lu.updateWorldMatrix();
    assert.notDeepEqual(lu.matrixWorld, old.bindMatrix);
    assert.throws(() => view.useCharacterBody('lu', [{ geometry, material: [] }]), /requires live materials/);
    assert.equal(body(lu), old);
    assert.equal(old.material.isDisposed, false);

    assert.equal(view.useCharacterBody('lu', parts), true);
    const [next, second] = lu.children.filter(child => child.skeleton);
    assert.equal(next.geometry, geometry);
    assert.equal(next.skeleton, skeleton);
    assert.deepEqual(next.bindMatrix, old.bindMatrix);
    assert.deepEqual(joint.quaternion, pose);
    assert.deepEqual(skeleton.bones.find(node => node.name === 'weapon').children, weapon);
    assert.equal(next.material, second.material[0]);
    assert.notEqual(next.material, template);
    for (const [index, value] of emitted(next.material).entries())
      assert.ok(Math.abs(value - (authored[index] + tint[index])) < 1e-6);
    assert.deepEqual(emitted(template), authored);
    assert.equal(old.parent, undefined);
    assert.equal(old.material.isDisposed, true);

    view.resetRound(game);
    assert.equal(next.material.isDisposed, true);
    view.update(game, [], 0, 2);
    const newLu = actor('lu'), later = body(newLu);
    assert.notEqual(newLu, lu);
    assert.equal(later.geometry, geometry);
    assert.notEqual(later.material, template);

    view.disposeCharacters();
    view.disposeCharacters();
    assert.equal(actor('lu'), undefined);
    assert.equal(actor('hero'), undefined);
    assert.equal(later.material.isDisposed, true);
    assert.equal(view.useCharacterBody('lu', parts), false);
    assert.equal(geometry.isDisposed, false);
    assert.equal(template.isDisposed, false);
  } finally {
    view.disposeCharacters();
    geometry.dispose();
    stock.dispose();
    template.dispose();
  }
});
