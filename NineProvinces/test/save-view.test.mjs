import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../src/sim/world.mjs';
import { captureCampaignView, restoreCampaignView, createProgressCheckpoint } from '../src/save-view.mjs';

test('legacy saves start paused at their capital, without inventing a tutorial', () => {
  const game = createGame({ seed: 12 });
  const view = restoreCampaignView(game);
  assert.equal(view.paused, true);
  assert.deepEqual(view.selection, { node: game.factions[game.player].capital });
  assert.equal(view.firstMonth, null);
});

test('a view snapshot restores selection, camera, pause and speed independently of simulation data', () => {
  const game = createGame({ seed: 12 });
  const city = game.factions[game.player].capital;
  const original = JSON.stringify(game);
  const view = captureCampaignView({ state: game, sel: { node: city }, paused: false, speed: 4,
    lastOwnedCity: city, map: { rig: { view: { x: 180, z: 245, d: 72 } } },
    firstMonth: { day: game.day, dismissed: false } });
  assert.deepEqual(restoreCampaignView(game, view), {
    paused: false, speed: 4, selection: { node: city }, lastOwnedCity: city,
    camera: { x: 180, z: 245, d: 72 }, firstMonth: { day: game.day, dismissed: false }
  });
  assert.equal(JSON.stringify(game), original);
  view.camera.x = 900;
  assert.equal(restoreCampaignView(game, view).camera.x, 900);
});

test('invalid view fields cannot select missing entities or place the camera outside the realm', () => {
  const game = createGame({ seed: 12 });
  const capital = game.factions[game.player].capital;
  const view = restoreCampaignView(game, { paused: 'false', speed: 99, selection: { army: 'missing' },
    lastOwnedCity: 'missing', camera: { x: NaN, z: 1, d: -20 }, firstMonth: { day: 'no', dismissed: false } });
  assert.equal(view.paused, true);
  assert.equal(view.speed, null);
  assert.deepEqual(view.selection, { node: capital });
  assert.equal(view.camera, null);
  assert.equal(view.lastOwnedCity, capital);
  assert.equal(view.firstMonth, null);
});

test('deliberately cleared selection and a saved live army can each be restored', () => {
  const game = createGame({ seed: 12 });
  assert.equal(restoreCampaignView(game, { selection: null }).selection, null);
  game.armies.a1 = { id: 'a1', faction: game.player };
  assert.deepEqual(restoreCampaignView(game, { selection: { army: 'a1' } }).selection, { army: 'a1' });
});

test('progress protection ignores view changes and only resets after a successful save', () => {
  const game = createGame({ seed: 12 });
  const checkpoint = createProgressCheckpoint();
  checkpoint.saved(game);
  assert.equal(checkpoint.changed(game), false);
  game.nodes[game.factions[game.player].capital].work = { kind: 'farm', left: 12, of: 12 };
  assert.equal(checkpoint.changed(game), true);
  checkpoint.saved(game);
  assert.equal(checkpoint.changed(game), false);
  game.day++;
  assert.equal(checkpoint.changed(game), true);
  checkpoint.clear();
  assert.equal(checkpoint.changed(game), false);
});
