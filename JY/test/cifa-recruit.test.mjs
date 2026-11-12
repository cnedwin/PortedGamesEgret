import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRecruitScript, runRecruitScript } from '../src/cifa-recruit.mjs';

const source = `
Talk("你願同行嗎？", 53, 0, 1);
ModifyEvent(-2, 8, -2, -2, 477, -2, -2, -2, -2, -2, -2, -2, -2);
if (!AskJoin ()) { Talk("下次再會。", 0, 1, 2); exit(); }
if (!CheckRoleMorality(0, 40, 100)) { exit(); }
if (TeamIsFull()) { exit(); }
DarkScene();
ModifyEvent(-2, 8, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2);
LightScene();
Join(53);
`;

function record({ accept = true, morality = true, full = false } = {}) {
  const calls = [];
  const host = {
    talk(...args) { calls.push(['talk', ...args]); },
    modifyEvent(...args) { calls.push(['modify', ...args]); },
    askJoin() { calls.push(['ask']); return Promise.resolve(accept); },
    checkRoleMorality(...args) { calls.push(['morality', ...args]); return morality; },
    teamIsFull() { calls.push(['full']); return full; },
    darkScene() { calls.push(['dark']); },
    lightScene() { calls.push(['light']); },
    join(id) { calls.push(['join', id]); },
  };
  return { calls, host };
}

test('recruit waits for the decision and applies native event and join calls in order', async () => {
  const { calls, host } = record();
  const { promise, resolve } = Promise.withResolvers();
  host.askJoin = () => { calls.push(['ask']); return promise; };
  const done = runRecruitScript(parseRecruitScript(source), host);
  await new Promise(setImmediate);
  assert.deepEqual(calls, [['talk', '你願同行嗎？', 53, 0, 1],
    ['modify', -2, 8, -2, -2, 477, -2, -2, -2, -2, -2, -2, -2, -2], ['ask']]);
  resolve(true);
  await done;
  assert.deepEqual(calls.slice(3), [['morality', 0, 40, 100], ['full'], ['dark'],
    ['modify', -2, 8, 0, 0, -1, -1, -1, -1, -1, -1, -2, -2, -2], ['light'], ['join', 53]]);
});

test('recruit exits the entire script on decline, insufficient morality or full party', async () => {
  const program = parseRecruitScript(source);
  for (const [options, tail] of [
    [{ accept: false }, [['talk', '下次再會。', 0, 1, 2]]],
    [{ morality: false }, [['morality', 0, 40, 100]]],
    [{ full: true }, [['morality', 0, 40, 100], ['full']]],
  ]) {
    const { calls, host } = record(options);
    await runRecruitScript(program, host);
    assert.deepEqual(calls.slice(3), tail);
  }
});

test('recruit rejects host calls outside the two original events', () => {
  assert.throws(() => parseRecruitScript('Join(53); autosave();'), /unsupported call autosave/);
  assert.throws(() => parseRecruitScript('if (!AskJoin(53)) { exit(); }'), /askjoin expects 0 arguments/);
});
