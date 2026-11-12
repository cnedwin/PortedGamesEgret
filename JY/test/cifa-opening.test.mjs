import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as opening from '../src/cifa-opening.mjs';

const { animationFrames, parseOpeningScript, runOpeningScript, modifySceneEvent } = opening;

test('opening syntax preserves dialogue and accepts the five case-insensitive host calls', () => {
  const commands = parseOpeningScript(`\uFEFF // keep dialogue text
    TALK("中文，( ) ; // \\"Ａ\\"", 0, 1, 42);
    PlayAnimation(-1, 8, 12); /* animation then facing */
    setTowards(0);
    PlayWave(24);
    ModifyEvent(-2, 1, -2, -2, 692, -1, -1, -2, -2, -2, -2, -2, -2);
  `);
  assert.deepEqual(commands, [
    { name: 'Talk', args: ['中文，( ) ; // "Ａ"', 0, 1, 42] },
    { name: 'PlayAnimation', args: [-1, 8, 12] },
    { name: 'SetTowards', args: [0] },
    { name: 'PlayWave', args: [24] },
    { name: 'ModifyEvent', args: [-2, 1, -2, -2, 692, -1, -1, -2, -2, -2, -2, -2, -2] },
  ]);
});

test('opening syntax rejects unsupported or malformed calls before running the script', () => {
  assert.throws(() => parseOpeningScript('Talk("x", 0, 1, 42); TryBattle(9);'), /TryBattle/);
  assert.throws(() => parseOpeningScript('Talk("x", 0, 1);'), /Talk/);
  assert.throws(() => parseOpeningScript('PlayWave(2 + 1);'), /PlayWave/);
  assert.throws(() => parseOpeningScript('Talk("unterminated);'), /Talk/);
  assert.throws(() => parseOpeningScript('SetTowards(2147483648);'), /SetTowards/);
});

test('execution waits for each dialogue and animation host promise before changing state', async () => {
  const { promise: dialogue, resolve: closeDialogue } = Promise.withResolvers();
  const { promise: animation, resolve: finishAnimation } = Promise.withResolvers();
  const calls = [];
  const commands = parseOpeningScript('Talk("開場", 0, 1, 42); PlayAnimation(-1, 8, 12); SetTowards(0); PlayWave(24); ModifyEvent(-2, 0, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2);');
  const execution = runOpeningScript(commands, {
    talk(...args) { calls.push(['talk', ...args]); return dialogue; },
    animate(...args) { calls.push(['animate', ...args]); return animation; },
    setTowards(...args) { calls.push(['setTowards', ...args]); },
    playWave(...args) { calls.push(['playWave', ...args]); },
    modifyEvent(...args) { calls.push(['modifyEvent', ...args]); },
  });
  assert.deepEqual(calls, [['talk', '開場', 0, 1, 42]]);
  closeDialogue();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls.at(-1), ['animate', -1, 8, 12]);
  assert.equal(calls.length, 2);
  finishAnimation();
  await execution;
  assert.deepEqual(calls.slice(2), [
    ['setTowards', 0], ['playWave', 24],
    ['modifyEvent', -2, 0, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2],
  ]);
});

test('animation preserves native player inclusivity and NPC raw picture stepping', () => {
  assert.deepEqual(animationFrames(-1, 6890, 6894), { frames: [3445, 3446, 3447], final: 3447 });
  assert.deepEqual(animationFrames(-1, 6894, 6890), { frames: [3447, 3446, 3445], final: 3445 });
  assert.deepEqual(animationFrames(-1, 6890, 6891), { frames: [3445], final: 3445 });
  assert.deepEqual(animationFrames(1, 6820, 6824), { frames: [6820, 6821, 6822, 6823], final: 6824 });
  assert.deepEqual(animationFrames(1, 6824, 6820), { frames: [6824, 6823, 6822, 6821], final: 6820 });
  assert.deepEqual(animationFrames(1, 6820, 6820), { frames: [], final: 6820 });
  assert.throws(() => animationFrames(-1, 0, 2147483647), /frame count/);
});

test('a before-command hook sees the parsed statement and finishes before its host call', async () => {
  const { promise, resolve } = Promise.withResolvers();
  const calls = [];
  const commands = parseOpeningScript('SetTowards(0); PlayWave(24);');
  const execution = runOpeningScript(commands, {
    beforeCommand(command, index) { calls.push([command, index]); return promise; },
    setTowards(direction) { calls.push(direction); },
    playWave(id) { calls.push(id); },
  });
  assert.deepEqual(calls, [[commands[0], 0]]);
  resolve();
  await execution;
  assert.deepEqual(calls, [[commands[0], 0], 0, [commands[1], 1], 24]);
});

test('event modifications retain -2 fields and copy the old grid entry when repositioning', () => {
  const record = { cannotWalk: 1, index: 7, event1: 3, event2: 5, event3: 6, currentPic: 22, endPic: 22, beginPic: 22, picDelay: 0, x: 1, y: 0 };
  const scene = { id: 70, width: 2, height: 2, layers: { eventIndex: Int16Array.of(-1, 9, -1, -1) }, events: [record] };
  modifySceneEvent(scene, 0, -2, -2, -2, -2, 692, -1, -1, -2, -2, -2, -2, -2, 1);
  assert.deepEqual(record, { cannotWalk: 1, index: 7, event1: 692, event2: -1, event3: -1, currentPic: 22, endPic: 22, beginPic: 22, picDelay: 0, x: 1, y: 1 });
  assert.deepEqual([...scene.layers.eventIndex], [-1, -1, -1, 9]);
});

test('event removal clears both coordinates and an out-of-bounds change leaves state unchanged', () => {
  const record = { cannotWalk: 1, index: 0, event1: -1, event2: -1, event3: 691, currentPic: 22, endPic: 22, beginPic: 22, picDelay: 0, x: 1, y: 0 };
  const scene = { id: 70, width: 2, height: 2, layers: { eventIndex: Int16Array.of(-1, 0, -1, -1) }, events: [record] };
  const unchanged = structuredClone(scene);
  assert.throws(() => modifySceneEvent(scene, 0, -2, 0, 0, 0, -1, -1, -1, -1, -1, -1, -2, 2, 0), /bounds/);
  assert.deepEqual(scene, unchanged);
  modifySceneEvent(scene, 0, -2, 0, 0, 0, -1, -1, -1, -1, -1, -1, -2, -1, -2);
  assert.deepEqual(record, { ...unchanged.events[0], cannotWalk: 0, event3: -1, currentPic: -1, endPic: -1, beginPic: -1, x: -1, y: -1 });
  assert.deepEqual([...scene.layers.eventIndex], [-1, -1, -1, -1]);
});
