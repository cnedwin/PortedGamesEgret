import test from 'node:test';
import assert from 'node:assert/strict';
import { captureTempleLoadout, createTempleReplay } from '../src/chapter.mjs';
import { createGame, quiet, step } from '../src/rules/game.mjs';

test('temple replay uses the entry loadout and starts a fresh, original first phase', () => {
  const first = createGame();
  first.hero.power = 1.2;
  first.hero.will = 61;
  first.bag.coin = 3;
  first.coins = 34;
  const loadout = captureTempleLoadout(first);
  first.coins += 460;
  first.bag.coin++;
  first.hero.will = 0;
  first.boss.hp = 0;
  first.boss.state = 'dead';
  first.boss.phase = 2;

  const retry = createTempleReplay(loadout);
  assert.equal(retry.coins, 34);
  assert.equal(retry.bag.coin, 3);
  assert.equal(retry.hero.power, 1.2);
  assert.equal(retry.hero.will, 61);
  assert.equal(retry.hero.hp, createGame().hero.hp);
  assert.equal(retry.boss.hp, retry.boss.maxHp);
  assert.equal(retry.boss.phase, 1);
  assert.equal(retry.checkpoint, 'rest');
  assert.deepEqual(retry.foes, [retry.boss]);
  const events = step(retry, quiet(), 1 / 60);
  assert.ok(events.some((event) => event.type === 'stage' && event.stage === 'boss'));
  assert.equal(retry.bars.court, true);
});
