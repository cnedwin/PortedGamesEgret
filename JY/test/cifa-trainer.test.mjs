import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTrainerScript, runTrainerScript, trainerEventRandom, trainerRandom } from '../src/cifa-trainer.mjs';

const source = `
// This commented call must never execute: autosave();
NewTalk("試煉" + to_string(getitemcountinbag(198)) + "勝", 114, 0);
pool = {17, 8, 90, 37};
wins = getitemcountinbag(198);
index = 3 - wins / 2 + random(-3, 3);
if (index < 1) { index = random(1, 3); }
index = floor(index);
if ((trybattle(pool[index], 0))) {
  additem(random(0, 197), 1);
  additemwithouthint(198, 1);
} else {
  additemwithouthint(199, 1);
}
autosave();
`;

test('trainer awaits dialogue, battle, reward and the save in script order', async () => {
  const calls = [];
  const { promise: dialogue, resolve: confirm } = Promise.withResolvers();
  const { promise: battle, resolve: win } = Promise.withResolvers();
  const { promise: save, resolve: persisted } = Promise.withResolvers();
  const tick = () => new Promise(resolve => setImmediate(resolve));
  let finished = false;
  const result = runTrainerScript(parseTrainerScript(source), {
    getitemcountinbag: id => id === 198 ? 1 : 0,
    newtalk(...args) { calls.push(['talk', ...args]); return dialogue; },
    random(min, max) { calls.push(['random', min, max]); return min === -3 ? 0.25 : 18.75; },
    trybattle(...args) { calls.push(['battle', ...args]); return battle; },
    additem(...args) { calls.push(['reward', ...args]); },
    additemwithouthint(...args) { calls.push(['count', ...args]); },
    autosave() { calls.push(['save']); return save; },
  }).then(() => { finished = true; });
  await tick();
  assert.deepEqual(calls, [['talk', '試煉1勝', 114, 0]]);
  confirm();
  await tick();
  assert.deepEqual(calls.slice(1), [['random', -3, 3], ['battle', 90, 0]]);
  win(true);
  await tick();
  assert.deepEqual(calls.slice(3), [['random', 0, 197], ['reward', 18, 1], ['count', 198, 1], ['save']]);
  assert.equal(finished, false);
  persisted();
  await result;
  assert.equal(finished, true);
});

test('trainer reselects from its fallback range and only increments losses on defeat', async () => {
  const calls = [];
  await runTrainerScript(parseTrainerScript(source), {
    getitemcountinbag: () => 20,
    newtalk() {},
    random(min, max) { calls.push(['random', min, max]); return min === -3 ? -2 : 1.6; },
    trybattle(...args) { calls.push(['battle', ...args]); return false; },
    additem: () => assert.fail('defeat cannot grant the reward'),
    additemwithouthint(...args) { calls.push(['count', ...args]); },
    autosave() { calls.push(['save']); },
  });
  assert.deepEqual(calls, [['random', -3, 3], ['random', 1, 3], ['battle', 8, 0], ['count', 199, 1], ['save']]);
});

test('trainer rejects unsupported syntax or host calls before execution', () => {
  assert.throws(() => parseTrainerScript('autosave(); run_file("unknown");'), /Cifa 1:\d+: unsupported call run_file/);
  assert.throws(() => parseTrainerScript('if (1 < 2) { trybattle(0); }'), /trybattle expects 2 arguments/);
  assert.throws(() => parseTrainerScript('if (1 < 2) { autosave();'), /expected }/);
});

test('trainer samples the inclusive native rand endpoints before host integer conversion', () => {
  assert.equal(trainerRandom(-3, 3, () => 0), -3);
  assert.equal(trainerRandom(-3, 3, () => 32767 / 32768), 3);
  assert.equal(trainerRandom(1, 133, () => 16383 / 32768), 1 + 16383 * 132 / 32767);
});

test('the zero-win trainer endpoint selects the last valid battle without changing the native reward draw', () => {
  const maximumDraw = () => 32767 / 32768;
  assert.equal(Math.floor(133 + trainerEventRandom(-3, 3, 0, maximumDraw)), 135);
  assert.equal(trainerEventRandom(-3, 3, 1, maximumDraw), 3);
  assert.equal(trainerEventRandom(0, 197, 0, maximumDraw), 197);
});
