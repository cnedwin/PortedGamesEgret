// 文字：每一句都有中英两种，占位符一致；界面会拼出来的每个键（坊区、品级、建筑、人才、民情……）都在表里；界面代码
// 里不写死中文（只有 i18n.mjs 里有，以及切换语言时的「中文」二字）。
// Words: every line in both languages with the same placeholders; every key the interface puts together (zones,
// ranks, buildings, talents, petitions…) is in the table; and the interface code writes no Chinese itself (only
// i18n.mjs does, and the word for the language in the language switch).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, amount, duration, setLanguage, t, buildingName } = await import('../src/i18n.mjs');
const D = await import('../src/sim/data.mjs');
const { GOALS } = await import('../src/sim/world.mjs');

test('every line has both languages and the same placeholders in each', () => {
  const names = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(WORDS.zh).sort(), Object.keys(WORDS.en).sort());
  for (const key of Object.keys(WORDS.zh)) assert.deepEqual(names(WORDS.zh[key]), names(WORDS.en[key]), key);
});

test('every key the interface builds from the tables is there', () => {
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const keys = [
    ...D.ZONES.flatMap((z) => ['zone' + cap(z), 'note' + cap(z)]),
    ...D.RANKS.map((_, i) => 'r' + i),
    ...[0, 1, 2, 3].map((i) => 'season' + i),
    ...GOALS.map((g) => 'g_' + g.id),
    ...D.RAIDS.kinds.map((k) => 'raid_' + k),
    ...['city', 'build', 'talent', 'affairs', 'defence'].map((k) => 'tab' + cap(k)),
    ...D.TALENTS.flatMap((x) => ['t_' + x.id, 'rarity_' + x.rarity, ...Object.keys(x.gift).map((g) => 'gift_' + g)]),
    ...['wall', 'tower', 'camp'].flatMap((k) => ['about_' + k, k]),
    ...Object.keys(D.OFFICES).flatMap((o) => ['office_' + o, 'officeNote_' + o]),
    ...['rule', 'farm', 'craft', 'trade', 'arms'].map((k) => 'stat_' + k),
    ...D.PETITIONS.list.flatMap((p) => ['p_' + p.id, 'pa_' + p.id, 'pb_' + p.id]),
    ...Object.keys(D.RESOURCES)
  ];
  for (const key of keys) assert.ok(key in WORDS.zh, key);
  for (const kind of [...Object.keys(D.BUILDINGS), ...Object.keys(D.NODES)]) {
    setLanguage('zh');
    assert.ok(buildingName(kind) && !buildingName(kind).includes('_'), kind);
  }
  // Every key main.mjs asks for by name.
  return readFile(new URL('../src/main.mjs', import.meta.url), 'utf8').then((code) => {
    for (const [, key] of code.matchAll(/\bt\('([A-Za-z0-9]+)'[,)]/g)) assert.ok(key in WORDS.zh, key);
  });
});

test('numbers and times read well in both languages', () => {
  setLanguage('zh');
  assert.equal(amount(47300), '4.7万');
  assert.equal(amount(1.2e8), '1.2亿');
  assert.match(duration(3 * 3600 + 120), /3 时 2 分/);
  setLanguage('en');
  assert.equal(amount(473000), '473k');
  assert.match(duration(3 * 3600 + 120), /3h 2m/);
  setLanguage('zh');
  assert.equal(t('title'), '桃溪县令');
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/,
    allowed = new Set(["'中文'"]);
  const files = [];
  for (const folder of ['../src/', '../src/sim/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (CJK.test(literal)) assert.ok(allowed.has(literal), `${file}: ${literal}`);
  }
});
