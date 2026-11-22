import assert from 'node:assert/strict';
import test from 'node:test';
import { forecastHits } from '../src/sim/campaign-ai.mjs';
import { tideEscapeGuide } from '../src/sim/tide-guide.mjs';
import { clearLine } from '../src/sim/world.mjs';

const hero = {x:1087.537, y:512.628, radius:18, speed:225};
const undertow = {kind:'undertow', shape:'ring', x:1085.186, y:310.332, radius:330, innerRadius:92,
  total:1.35, remaining:1.183};

test('the riverbank guide points toward reachable bridge-side ground instead of into the river', () => {
  assert.equal(clearLine('ford', hero, {x:1087.537,y:665}, hero.radius), false);
  const guide = tideEscapeGuide('ford', hero, undertow);
  assert.equal(guide.kind, 'outer');
  assert.equal(guide.direction, '左下');
  assert(clearLine('ford', hero, guide.target, hero.radius));
  assert.equal(forecastHits(guide.target, undertow, hero.radius), false);
  assert(Math.hypot(guide.target.x - hero.x, guide.target.y - hero.y) / hero.speed < .9);
});

test('when the outer route is too long for the remaining warning, an open inner route is offered', () => {
  const mark = {...undertow, remaining:.783};
  const guide = tideEscapeGuide('ford', hero, mark);
  assert.equal(guide.kind, 'inner');
  assert.equal(guide.direction, '上');
  assert(clearLine('ford', hero, guide.target, hero.radius));
  assert.equal(forecastHits(guide.target, mark, hero.radius), false);
  assert.equal(tideEscapeGuide('ford', hero, {...mark, remaining:.2}), null);
});

test('safe positions are not routed back through danger, and other boss moves have no guide', () => {
  assert.deepEqual(tideEscapeGuide('ford', {...hero, x:undertow.x,y:undertow.y}, undertow), {kind:'safe'});
  assert.deepEqual(tideEscapeGuide('ford', {...hero, x:700,y:310}, undertow), {kind:'safe'});
  assert.equal(tideEscapeGuide('ford', hero, {...undertow, kind:'command-channel'}), null);
});
