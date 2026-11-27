// Keep the real short browser viewport covered: the settings card must not shrink its hit targets.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { cardGeometry } = await import('../src/ui/card.mjs');
const { CONTROL } = await import('../src/ui/kit.mjs');
const { planScreen } = await import('../vendor/engine/dist/web/screen.js');

const settings = [
  { kind: 'title', en: 'Settings' },
  { kind: 'choice', text: 'Picture', options: ['low', 'medium', 'high'] },
  { kind: 'note' },
  { kind: 'slider' },
  { kind: 'toggle' },
  { kind: 'choice', text: 'Touch controls', options: ['auto', 'on', 'off'] },
  { kind: 'button' }
];

function layout(width, height, insets) {
  const screen = planScreen({ box: { width, height }, design: { width: 1066, height: 600 }, fit: 'expand', insets });
  return { screen, card: cardGeometry(screen, { rows: settings, cardWidth: 560 }) };
}

function safelyContains({ screen: { safe, scale }, card }) {
  const epsilon = 1e-6;
  assert.ok(card.x + epsilon >= safe.x && card.y + epsilon >= safe.y);
  assert.ok(card.x + card.w <= safe.x + safe.width + epsilon && card.y + card.h <= safe.y + safe.height + epsilon);
  assert.ok(CONTROL * card.sy * scale >= 44, `height ${CONTROL * card.sy * scale} CSS px`);
}

test('the physical Fold7 short landscape settings card keeps at least 44 CSS pixels per control', () => {
  const result = layout(873, 325);
  safelyContains(result);
  assert.ok(result.card.pad < 16 || result.card.gap < 6, 'use whitespace rather than squeezing controls');
});

test('normal notch landscape and narrow portrait preserve the spacious card geometry', () => {
  for (const result of [
    layout(852, 393, { top: 0, left: 59, right: 59, bottom: 21 }),
    layout(325, 873)
  ]) {
    safelyContains(result);
    assert.equal(result.card.pad, 16);
    assert.equal(result.card.gap, 6);
  }
});
