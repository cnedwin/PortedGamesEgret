import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { FEATURED_ID, GAMES } from '../showcase/games.js';
import { MATRIX } from '../showcase/capabilities.js';

const root = new URL('../', import.meta.url);
const media = ['cover.webp', 'detail-1.webp', 'detail-2.webp'];
const ids = new Set();
const bilingual = (value, label) => {
  assert.ok(value?.zh?.trim() && value?.en?.trim(), `Missing Chinese or English text for ${label}`);
};

const playable = [];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const folder = new URL(`${entry.name}/`, root);
  const hasGame = await Promise.allSettled([
    access(new URL('index.html', folder)),
    access(new URL('vendor/SOURCE.md', folder)),
  ]);
  if (hasGame.every(({ status }) => status === 'fulfilled')) playable.push(entry.name);
}

assert.deepEqual(GAMES.map((game) => game.folder).sort(), playable.sort(), 'Every playable game needs a catalog case');
assert.deepEqual([...MATRIX.games].sort(), [...playable], 'Update the capability matrix when adding a game');
for (const game of GAMES) {
  assert.match(game.id, /^[a-z][a-z0-9-]*$/);
  assert.ok(!ids.has(game.id), `Duplicate case ID: ${game.id}`);
  ids.add(game.id);
  assert.ok(['2d', '3d'].includes(game.kind));
  for (const value of [game, game.genre, game.summary]) bilingual(value, game.id);
  assert.equal(game.scenes.length, media.length, `Add a caption for each picture in ${game.id}`);
  assert.ok(game.features.length >= 3 && game.features.length <= 5, `Show three to five engine capabilities for ${game.id}`);
  for (const feature of game.features) {
    bilingual(feature.title, game.id);
    bilingual(feature.description, game.id);
    assert.match(feature.source, /^(?:[\w.-]+\/)*[\w.-]+\.(?:mjs|js|ts)$/);
    assert.ok(!feature.source.split('/').includes('..'));
    await access(new URL(`${game.folder}/${feature.source}`, root));
  }
  const directory = new URL(`showcase/media/${game.id}/`, root);
  assert.deepEqual((await readdir(directory)).sort(), [...media].sort(), `Unexpected image files for ${game.id}`);
  for (const [index, file] of media.entries()) {
    bilingual(game.scenes[index], `${game.id}/${file}`);
    const bytes = await readFile(new URL(file, directory));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${game.id}/${file}`);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${game.id}/${file}`);
  }
}
assert.ok(ids.has(FEATURED_ID), 'The featured case must exist');
console.log(`${GAMES.length} cases, ${GAMES.length * media.length} WebP images, all engine references verified.`);
