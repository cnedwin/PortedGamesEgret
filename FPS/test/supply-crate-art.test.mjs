import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { Scene3D, createPerspectiveCamera3D, loadGltf3D } = await import('@egret/engine/world3d');
const { describeModel } = await import('../src/asset-models.mjs');
const { createGame } = await import('../src/sim.mjs');
const { createView } = await import('../src/view.mjs');

const names = (scene, name) => {
  const found = [];
  scene.traverse(node => { if (node.name === name) found.push(node); });
  return found;
};
function fixture(models = {}) {
  const scene = new Scene3D(), camera = createPerspectiveCamera3D({ aspect: 1.5, near: .03, far: 460 });
  scene.addChild(camera);
  const game = createGame({ seed: 3 }), view = createView(scene, camera, { models });
  view.attach(game);
  return { scene, camera, game, view };
}
const ruleSnapshot = game => JSON.stringify({ t: game.t, state: game.state, player: game.player, crates: game.crates, loot: game.loot, stats: game.stats });

// The actual authored case is hollow. Decoration must be inside its scaled shell,
// not an unlit full-width slab floating above or occluding the opening.
test('authored supply crates keep one lit, low-poly recessed decoration per case and unchanged opening state', async () => {
  const bytes = await readFile(new URL('../assets/models/supply-crate.glb', import.meta.url));
  const asset = await loadGltf3D(bytes, { decodeImage: async () => ({ width: 1, height: 1, data: new Uint8Array([255, 255, 255, 255]) }) });
  try {
    const model = describeModel(asset.scene, { parts: { body: 'body', lid: 'lid' } });
    const f = fixture({ 'supply-crate': model }), interiors = names(f.scene, 'supply-crate-interior');
    assert.equal(interiors.length, f.game.crates.length, 'one existing decoration draw per case, including closed ones');
    const scale = 1.05 / (model.bounds[3] - model.bounds[0]);
    const offset = [-(model.bounds[0] + model.bounds[3]) * scale / 2, -model.bounds[1] * scale, -(model.bounds[2] + model.bounds[5]) * scale / 2];
    const shell = model.parts.body.bounds.map((v, i) => v * scale + offset[i % 3]);
    for (const interior of interiors) {
      assert.equal(interior.visible, false);
      assert.equal(interior.material.shading, 'standard');
      assert.equal(interior.material.vertexColors, true);
      assert.equal(interior.castShadow, false);
      assert(interior.geometry.drawCount > 36 && interior.geometry.drawCount <= 1080, 'detailed but cheap single batch');
      const bound = interior.geometry.boundingBox;
      for (let axis = 0; axis < 3; axis++) {
        assert(bound[axis] >= shell[axis] - .001 && bound[axis + 3] <= shell[axis + 3] + .001, 'interior stays within authored shell');
      }
      assert(bound[4] < shell[4] - .02, 'decorations do not fill the case all the way to the rim');
      const colors = interior.geometry.getAttribute('color').data;
      const distinct = new Set();
      for (let i = 0; i < colors.length; i += 3) distinct.add(Array.from(colors.subarray(i, i + 3)).join(','));
      assert(distinct.size >= 7, 'lining, partitions and different subdued packages have distinct surface tints');
      const positions = interior.geometry.getAttribute('position').data, levels = new Set();
      for (let i = 1; i < positions.length; i += 3) levels.add(Math.round(positions[i] * 1000));
      assert(levels.size >= 5, 'real shallow compartments and stacked packaging, not a flat plate');
    }
    const first = f.game.crates[0], interior = interiors.find(n => Math.abs(n.parent.position[0] - first.x) < .001 && Math.abs(n.parent.position[2] - first.z) < .001);
    assert(interior, 'case placement is unchanged');
    first.opened = true; // Only a unit fixture: the view must not mutate game state while animating it.
    const before = ruleSnapshot(f.game);
    f.view.update(.05, f.game, 'title', .05);
    assert.equal(interior.visible, false, 'old open threshold is preserved');
    f.view.update(.05, f.game, 'title', .10);
    assert.equal(interior.visible, true);
    assert.equal(ruleSnapshot(f.game), before, 'display changes do not award or consume loot');
    first.opened = false;
    f.view.update(.05, f.game, 'title', .15);
    assert.equal(interior.visible, false);
    const geometry = interior.geometry;
    f.view.attach(createGame({ seed: 3 }));
    const replacement = names(f.scene, 'supply-crate-interior').find(n => Math.abs(n.parent.position[0] - first.x) < .001 && Math.abs(n.parent.position[2] - first.z) < .001);
    assert.equal(replacement.geometry, geometry, 'reuse the same static geometry on later deployments');
    assert.equal(replacement.visible, false);
  } finally { asset.dispose(); }
});

test('procedural fallback keeps the old exterior envelope but has a real recessed floor', () => {
  const { scene, game } = fixture();
  const bodies = names(scene, 'supply-crate-body');
  assert.equal(bodies.length, game.crates.length);
  const geometry = bodies[0].geometry, bound = geometry.boundingBox;
  // Former exterior, including the front latch. No changes to world position or collision dimensions.
  const wanted = [-.525, 0, -.325, .525, .52, .31];
  assert(Array.from(bound).every((v, i) => Math.abs(v - wanted[i]) < .001));
  // At the horizontal centre the only upper-facing surface is the inner floor,
  // not a solid lid-like top face. Walls remain full height at the perimeter.
  const p = geometry.getAttribute('position').data, n = geometry.getAttribute('normal').data;
  const idx = geometry.index.data;
  let highest = -Infinity;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    if (n[a + 1] < .99 || n[b + 1] < .99 || n[c + 1] < .99) continue;
    const xs = [p[a], p[b], p[c]], zs = [p[a + 2], p[b + 2], p[c + 2]];
    if (Math.min(...xs) <= 0 && Math.max(...xs) >= 0 && Math.min(...zs) <= 0 && Math.max(...zs) >= 0)
      highest = Math.max(highest, p[a + 1], p[b + 1], p[c + 1]);
  }
  assert(highest >= 0 && highest < .12, 'opening is hollow down to the floor');
  const inside = names(scene, 'supply-crate-interior');
  assert.equal(inside.length, game.crates.length);
  assert(inside.every(mesh => !mesh.visible));
});
