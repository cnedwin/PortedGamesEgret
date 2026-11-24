import assert from 'node:assert/strict';
import test from 'node:test';
import { replayFrameAt } from '../src/sim/battle-history.mjs';
import { replayMoments } from '../src/ui/battle-lab.mjs';

const battleTape = () => ({
  setup: { factions: ['liubei', 'caocao'] },
  field: { tiles: Array(48).fill('plain'), gate: 23, keep: 30, depot: 38 },
  units: [{ id: 0, side: 0, general: 'guanyu' }, { id: 1, side: 1, general: 'caoren' }],
  actions: [],
  events: [],
  frames: [
    { time: 0, phase: 'deploy', units: [] },
    { time: 9, phase: 'fight', units: [{ id: 0, pos: 13, lastAttack: { time: 8.6, target: 1 } }, { id: 1, pos: 14 }] },
    { time: 11.5, phase: 'fight', units: [{ id: 0, pos: 22 }, { id: 1, pos: 23 }] },
    { time: 40, phase: 'result', units: [{ id: 0, pos: 30 }], over: { winner: 0, why: 'keep' } }
  ]
});

test('an in-progress tape never shows completed-battle highlights', () => {
  const tape = battleTape();
  tape.frames.pop();
  tape.report = { winner: 0 };
  tape.actions.push({ kind: 'result', time: 11.5 });
  assert.deepEqual(replayMoments(tape, 0), []);
});

test('siege highlights use recorded contact, gate damage actor, and actual capture', () => {
  const tape = battleTape();
  tape.actions.push({ kind: 'contact', time: 8.59999999999999, at: 14, unit: 0 }, { kind: 'occupy', time: 30, at: 30, unit: 0 });
  tape.events.push({ kind: 'structureHit', t: 8.6, structure: 'gate', at: 23, unit: 0 },
    { kind: 'structureHit', t: 11.5, structure: 'gate', at: 23, unit: 0 }, { kind: 'gateOpen', t: 11.5 });
  const before = JSON.stringify(tape);
  const moments = replayMoments(tape, 0);
  assert.deepEqual(moments.map(({ kind, time, unit, hex }) => ({ kind, time, unit, hex })), [
    { kind: 'contact', time: 8.6, unit: 0, hex: 14 },
    { kind: 'gate', time: 11.5, unit: 0, hex: 23 },
    { kind: 'result', time: 40, unit: 0, hex: 30 }
  ]);
  assert.equal(JSON.stringify(tape), before);
});

test('a successful player tactic is preferred over enemy casts and failed attempts', () => {
  const tape = battleTape();
  tape.events.push({ kind: 'tactic', t: 10, unit: 1, tactic: 'fengshi', target: 0 },
    { kind: 'tacticFailed', t: 11.4, unit: 0, tactic: 'wusheng', target: 1 },
    { kind: 'tactic', t: 11.4999999999999, unit: 0, tactic: 'wusheng', target: 1 });
  const [clash, tactic, result] = replayMoments(tape, 0);
  assert.equal(clash.time, 8.6);
  assert.equal(clash.target, 1);
  assert.deepEqual([tactic.kind, tactic.unit, tactic.target], ['tactic', 0, 1]);
  assert.equal(replayFrameAt(tape, tactic.time).time, 11.5);
  assert.equal(result.time, 40);
});
