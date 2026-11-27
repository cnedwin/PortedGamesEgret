import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeArtReplay } from './art-replay.mjs';
import { artReady, actionsAt, createGame, act, cloneGame } from '../src/sim/rules.mjs';
import { mapById } from '../src/sim/maps.mjs';
test('the focused rally-art browser fixture is generated solely from legal orders and a real save envelope',()=>{
  const replay=makeArtReplay();
  assert.ok(replay.orders.length>10);
  const game=createGame(mapById(replay.setup.map),replay.setup.sides,replay.seed);
  for(const order of replay.orders)act(game,order);
  assert.deepEqual(cloneGame(game),replay.game,'the saved state is exactly the legal replay');
  assert.ok(artReady(game,0));
  const com=game.units.find(u=>u.id===replay.commander.id);
  assert.ok(!com.done&&actionsAt(game,com,com.x,com.y).some(a=>a.kind==='art'));
  assert.deepEqual(JSON.parse(replay.save).data.battle.game,replay.game);
});
