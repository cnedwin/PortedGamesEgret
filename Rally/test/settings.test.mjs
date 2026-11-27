import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { loadSettings, saveSettings, SETTINGS_KEY } = await import('../src/settings.mjs');

function storage(value) {
  const entries = new Map(value === undefined ? [] : [[SETTINGS_KEY, value]]);
  return { getItem: key => entries.get(key), setItem: (key, data) => entries.set(key, data) };
}

test('plain JSON settings retain the original storage key and round-trip all choices', () => {
  const s = storage();
  const chosen = { racer: 5, klass: 2, laps: 1, muted: true, quality: 'low', lang: 'en' };
  saveSettings(s, chosen);
  assert.deepEqual(JSON.parse(s.getItem('jinxiu-rally')), chosen);
  assert.deepEqual(loadSettings(s), chosen);
});

test('corrupt settings and inaccessible storage fall back safely', () => {
  const expected = { racer: 0, klass: 1, laps: 3, muted: false, quality: 'high', lang: 'zh' };
  for (const s of [storage('{'), storage('null'), storage('["a"]'), storage('{"racer":99,"klass":8,"laps":0,"muted":"true","quality":"bad","lang":"bad"}'), { getItem() { throw Error(); } }]) {
    assert.deepEqual(loadSettings(s, new URLSearchParams(), 'zh-TW'), expected);
  }
  assert.doesNotThrow(() => saveSettings({ setItem() { throw Error(); } }, expected));
});

test('only valid query overrides are accepted over a previous save', () => {
  const s = storage(JSON.stringify({ racer: 3, quality: 'medium', lang: 'zh' }));
  assert.deepEqual(loadSettings(s, new URLSearchParams('quality=low&lang=en'), 'en-US'), {
    racer: 3, klass: 1, laps: 3, muted: false, quality: 'low', lang: 'en',
  });
  assert.equal(loadSettings(s, new URLSearchParams('lang=invalid&quality=x')).lang, 'zh');
});
