// The recorder has to be right, or every number it reports is wrong.
// Runs in Node: `node --test tools/feel/`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeel, CHANNELS } from './feel.mjs';

test('an input answered in the same frame is measured at the next frame', () => {
  const feel = createFeel();
  feel.frame(1000);
  const token = feel.input(10, 20, 1010);
  feel.consumed(token);
  feel.frame(1026);
  const report = feel.report();
  assert.equal(report.input.samples, 1);
  assert.equal(report.input.p50, 16);
});

test('the browser handoff is reported apart from the total', () => {
  const feel = createFeel();
  // Real clocks, because this test is about a gap between an event's own
  // timestamp and the moment our code runs.
  const base = performance.now();
  feel.frame(base);
  const token = feel.input(10, 20, base - 12);
  feel.consumed(token);
  feel.frame(base + 30);
  const report = feel.report();
  assert.ok(report.input.dispatchP95 > 0, 'handoff should be measured');
  assert.ok(report.input.p95 > report.input.dispatchP95, 'total must include the handoff');
});

test('an event stamped ahead of our clock is skew, not a negative cost', () => {
  const feel = createFeel();
  feel.frame(1000);
  feel.input(10, 20, performance.now() + 5000);
  const report = feel.report();
  assert.equal(report.input.dispatchP95, 0);
});

test('an input nobody answers is counted as lost, not as latency', () => {
  const feel = createFeel({ inputTimeoutMs: 100 });
  feel.frame(1000);
  feel.input(10, 20, 1000);
  feel.frame(1200);
  const report = feel.report();
  assert.equal(report.input.lost, 1);
  assert.equal(report.input.samples, 0);
});

test('a clear that reaches every channel counts as complete', () => {
  const feel = createFeel();
  feel.clear({ chain: 1, cells: 3, channels: [...CHANNELS] });
  const report = feel.report();
  assert.equal(report.clears.total, 1);
  assert.equal(report.clears.completeShare, 1);
  assert.deepEqual(report.clears.byChannel, { visual: 1, audio: 1, haptic: 1, hitstop: 1 });
});

test('a clear missing a channel is reported with what it missed', () => {
  const feel = createFeel();
  feel.clear({ chain: 2, cells: 4, channels: ['visual', 'audio'] });
  const report = feel.report();
  assert.equal(report.clears.complete, 0);
  assert.equal(report.clears.incomplete.length, 1);
  assert.deepEqual(report.clears.incomplete[0].missing, ['haptic', 'hitstop']);
  assert.equal(report.verdict.feedbackComplete, false);
});

test('a chain the rules found but the view never played is swallowed', () => {
  const feel = createFeel();
  feel.chain(4, 3);
  const report = feel.report();
  assert.equal(report.chains.expected, 4);
  assert.equal(report.chains.played, 3);
  assert.equal(report.chains.swallowed, 1);
  assert.equal(report.verdict.noSwallowedChain, false);
});

test('a long frame gap is listed with the moment it happened', () => {
  const feel = createFeel({ longFrameMs: 33 });
  feel.frame(1000);
  feel.frame(1016);
  feel.frame(1100);
  const report = feel.report();
  assert.equal(report.longFrames.length, 1);
  assert.ok(report.longFrames[0].ms >= 80);
});

test('dropped frames are those past one and a half targets', () => {
  const feel = createFeel({ targetFrameMs: 16.7 });
  feel.frame(0);
  for (let i = 1; i <= 10; i++) feel.frame(i * 16.7);
  feel.frame(10 * 16.7 + 40);
  const report = feel.report();
  assert.equal(report.droppedFrames.count, 1);
});

test('disabled, nothing is recorded and nothing throws', () => {
  const feel = createFeel({ enabled: false });
  feel.frame(1000);
  const token = feel.input(0, 0, 1000);
  feel.consumed(token);
  feel.clear({ channels: ['visual'] });
  feel.chain(3, 1);
  const report = feel.report();
  assert.equal(report.frames, 0);
  assert.equal(report.clears.total, 0);
  assert.equal(report.chains.expected, 0);
});

test('reset clears every series but keeps the recorder usable', () => {
  const feel = createFeel();
  feel.frame(1000);
  feel.frame(1016);
  feel.clear({ channels: [...CHANNELS] });
  feel.chain(2, 1);
  feel.reset();
  const report = feel.report();
  assert.equal(report.frames, 0);
  assert.equal(report.frameGapMs.samples, 0);
  assert.equal(report.clears.total, 0);
  assert.equal(report.chains.swallowed, 0);
  feel.frame(2000);
  feel.frame(2016);
  assert.equal(feel.report().frames, 2);
});

test('the verdict passes only when every gate passes', () => {
  const feel = createFeel();
  feel.frame(1000);
  const token = feel.input(1, 1, 1000);
  feel.consumed(token);
  feel.frame(1016);
  feel.clear({ channels: [...CHANNELS] });
  feel.chain(1, 1);
  assert.equal(feel.report().pass, true);

  feel.clear({ channels: ['visual'] });
  assert.equal(feel.report().pass, false);
});
