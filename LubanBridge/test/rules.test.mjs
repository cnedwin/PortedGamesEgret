// 规则：每关的参考解都合规、在预算内、能让车队过河；只铺桥面不加支撑的桥在每一关都过不去；同一张图纸每次结果相同；
// 图纸的检查、对称、撤销、造价和读档。
// The rules: each level's reference is valid, within budget, and gets the carts across; a bare deck with nothing
// holding it fails on every level; the same drawing ends the same way each time; and the drawing's checks, mirror,
// undo, cost and reading back.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { GRID, costOf, createHistory, emptyDesign, mirrored, problemsOf, readDesign, whyNot } = await import('../src/sim/design.mjs');
const { LEVELS, SANDBOX, levelById } = await import('../src/sim/levels.mjs');
const { MATERIALS, compressionOf } = await import('../src/sim/materials.mjs');
const { along, sketch } = await import('../src/sim/plans.mjs');
const { createRun, runToEnd } = await import('../src/sim/run.mjs');

test('25 levels in five chapters, each with a reference within its budget', () => {
  assert.equal(LEVELS.length, 25);
  for (let c = 0; c < 5; c++) assert.equal(LEVELS.filter((l) => l.chapter === c).length, 5);
  for (const level of LEVELS) {
    assert.deepEqual(problemsOf(level, level.reference), [], level.id);
    assert.ok(costOf(level.reference) <= level.budget, level.id);
    for (const m of level.reference.members) assert.ok(level.materials.includes(m[4]), `${level.id} ${m[4]}`);
  }
});

for (const level of LEVELS)
  test(`level ${level.id}: the reference gets every cart across, nothing broken`, () => {
    const out = runToEnd(level, level.reference);
    assert.equal(out.won, true, `${level.id}: ${out.reason}`);
    assert.equal(out.broken, 0, level.id);
    assert.ok(out.peak < 1, level.id);
  });

test('a bare deck, nothing holding it up, fails on every level', () => {
  for (const level of LEVELS) {
    const s = sketch();
    s.path(along([level.road.left.x, level.road.left.y], [level.road.right.x, level.road.right.y], Math.ceil(level.span / 2.5)), 'plank');
    assert.equal(runToEnd(level, s.design).won, false, level.id);
  }
});

test('the same drawing ends the same way each time', () => {
  const level = levelById('3-3');
  const a = runToEnd(level, level.reference),
    b = runToEnd(level, level.reference);
  assert.deepEqual(a, b);
  // Step by step too: the frame's nodes are where they were.
  const r1 = createRun(level, level.reference),
    r2 = createRun(level, level.reference);
  for (let i = 0; i < 300; i++) (r1.step(), r2.step());
  assert.deepEqual(
    r1.truss.nodes.map((n) => [n.x, n.y]),
    r2.truss.nodes.map((n) => [n.x, n.y])
  );
  r1.dispose();
  r2.dispose();
});

test('what may not be laid, and why', () => {
  const level = levelById('1-2'),
    d = emptyDesign();
  assert.equal(whyNot(level, d, 0, 0, 5, 0, 'plank'), null);
  assert.equal(whyNot(level, d, 0, 0, 6, 0, 'plank'), 'long');
  assert.equal(whyNot(level, d, 0, 0, 0, 0, 'plank'), 'short');
  assert.equal(whyNot(level, d, -4, 0, -4, 4, 'wood'), 'ground');
  assert.equal(whyNot(level, d, 0, 0, 4, 0, 'chain'), 'material');
  assert.equal(whyNot(level, { ...d, members: [[0, 0, 4, 0, 'plank']] }, 4, 0, 0, 0, 'wood'), 'same');
  assert.equal(whyNot(level, d, 0, -100, 4, -100, 'wood'), 'outside');
  const river = levelById('4-3');
  assert.equal(whyNot(river, d, 18, 2, 22, 2, 'plank'), 'channel');
});

test('mirroring, undo and redo, cost, and a drawing read back', () => {
  const level = levelById('1-2');
  const h = createHistory();
  h.change((d) => d.members.push([0, 0, 4, -3, 'wood']));
  assert.equal(h.design.members.length, 1);
  const m = mirrored(level, h.design);
  assert.deepEqual(m.members[1], [16, 0, 12, -3, 'wood']);
  assert.ok(h.undo() && h.design.members.length === 0 && h.redo() && h.design.members.length === 1);
  assert.equal(costOf({ members: [[0, 0, 4, 0, 'plank']], pontoons: [], piers: [] }), Math.round(MATERIALS.plank.price * 4 * GRID));
  assert.deepEqual(readDesign({ members: [[0, 0, 1, 1, 'wood'], [0, 'x', 1, 1, 'wood'], [0, 0, 1, 1, 'gold']], pontoons: 'no', piers: [0, 0, 99] }), { members: [[0, 0, 1, 1, 'wood']], pontoons: [], piers: [0] });
  assert.deepEqual(readDesign(null), emptyDesign());
});

test('materials: ropes never push, long struts buckle, the sandbox has everything', () => {
  assert.equal(compressionOf('rope', 2), 0);
  assert.equal(compressionOf('chain', 2), 0);
  assert.ok(compressionOf('wood', 4) < compressionOf('wood', 2));
  assert.equal(SANDBOX.budget, Infinity);
  assert.equal(SANDBOX.materials.length, Object.keys(MATERIALS).length);
});
