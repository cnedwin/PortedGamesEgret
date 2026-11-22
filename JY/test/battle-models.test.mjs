import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { battleModelFor, battleModelGroups, battleModels } from '../web/jyx2/actors/battle-models.mjs';

const directory = new URL('../web/jyx2/actors/', import.meta.url);

test('the default classic roster has a distinct entry for every combat appearance', () => {
  assert.equal(battleModelGroups.length, 92);
  assert.equal(new Set(battleModelGroups.map(([path]) => path)).size, 92);
  assert.equal(battleModelGroups.reduce((count, [, ids]) => count + ids.length, 0), 289);
  assert.equal(battleModels.size, 289, 'a role ID appears in more than one group');
  assert.equal(battleModels.get(76), 'battle-76.glb', 'Wang Yuyan uses her own model');
  assert.equal(battleModels.get(77), 'troop-98.glb', 'the giant python uses its creature rig');
  assert.equal(battleModels.get(81), battleModels.get(90), 'Shaolin disciples share the original troop appearance');
  assert.notEqual(battleModels.get(60), battleModels.get(61), 'Ouyang Feng and Ouyang Ke have distinct entries');
  assert.equal(battleModelFor({ id: 76, headId: 109 }), 'battle-76.glb');
  assert.equal(battleModelFor({ id: 76, headId: 76 }), undefined, 'a mod can reuse an original role ID');
});

test('every registered model has a skin and all four combat clips', async () => {
  for (const [path] of battleModelGroups) {
    const file = await readFile(new URL(path, directory));
    assert.equal(file.toString('ascii', 0, 4), 'glTF', path);
    const asset = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)));
    assert(asset.skins?.some(skin => skin.joints.length > 1), path + ' has no animated skin');
    for (const name of ['idle', 'walk', 'attack', 'hit']) {
      const clip = asset.animations?.find(clip => clip.name === name);
      assert(clip?.channels.length, path + ' is missing ' + name);
      assert(clip.samplers.some(sampler => asset.accessors[sampler.input].max[0] > 0), path + ' has no motion for ' + name);
    }
  }
});
