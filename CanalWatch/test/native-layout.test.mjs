import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planCanalLayout } from '../src/native-layout.mjs';
import { FIELD, PLOTS } from '../src/sim/data.mjs';

for (const [width, height, mode] of [[1120, 700, 'desktop'], [540, 1060, 'portrait'], [1760, 680, 'wide']]) {
  test(`native ${mode} fits the original map and all plot positions`, () => {
    const safe = { x: 12, y: 8, width: width - 24, height: height - 16 };
    const layout = planCanalLayout({ width, height, safe });
    const f = layout.field;
    assert.equal(layout.mode, mode);
    assert.ok(Math.abs(f.scale - f.width / FIELD.width) < 1e-8);
    assert.ok(Math.abs(f.height / f.width - FIELD.height / FIELD.width) < 1e-8);
    assert.ok(f.x >= safe.x && f.y >= safe.y);
    assert.ok(f.x + f.width <= safe.x + safe.width + 1e-8);
    assert.ok(f.y + f.height <= safe.y + safe.height + 1e-8);
    for (const [x, y] of PLOTS) {
      assert.ok(f.x + x * f.scale >= f.x && f.x + x * f.scale <= f.x + f.width);
      assert.ok(f.y + y * f.scale >= f.y && f.y + y * f.scale <= f.y + f.height);
    }
    if (mode === 'portrait') assert.ok(safe.y + safe.height - f.y - f.height >= 340);
    if (mode === 'wide') assert.ok(f.x - safe.x >= 230);
  });
}
