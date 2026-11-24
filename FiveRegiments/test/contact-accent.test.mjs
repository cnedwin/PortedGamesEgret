import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createContactAccent } from '../src/view/contact-accent.mjs';

test('a hit holds the visible contact without pausing the action or extending it across cancellation', () => {
  const actor = { alive: true, act: { kind: 'swing', t: 0.32 } };
  const accent = createContactAccent();
  accent.hold(actor, 0.027);
  actor.act.t = 0.352;
  assert.equal(accent.sample(actor, 0.016), 0.32);
  assert.equal(accent.sample(actor, 0.016), 0.32);
  const settling = accent.sample(actor, 0.028);
  assert.ok(settling > 0.32 && settling < 0.352);
  assert.equal(actor.act.t, 0.352);
  actor.act = { kind: 'recover', t: 0 };
  assert.equal(accent.sample(actor, 0.016), null);
});

test('mounted attacks keep continuous travel and have no held pose', () => {
  const actor = { alive: true, mounted: true, act: { kind: 'swing', t: 0.5 } };
  const accent = createContactAccent();
  accent.hold(actor, 0.04);
  assert.equal(accent.sample(actor, 0.016), null);
});
