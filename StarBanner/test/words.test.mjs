// 文字：每一句都有中英两种，占位符一致；界面代码里不写死中文（只有 i18n.mjs 里有）；兵种、地形、指挥官、地图和战意技的
// 名字也都中英齐全。
// Words: every line has Chinese and English with the same placeholders; the interface code writes no Chinese itself
// (only i18n.mjs does); and the names of units, terrain, commanders, maps and rally arts are in both languages.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { WORDS, setLanguage, t } from '../src/i18n.mjs';
import { UNITS, BUILDINGS } from '../src/sim/units.mjs';
import { TERRAIN } from '../src/sim/terrain.mjs';
import { COMMANDERS, FACTIONS } from '../src/sim/commanders.mjs';
import { MAPS } from '../src/sim/maps.mjs';

test('every line has both languages and the same placeholders in each', () => {
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(names(entry.zh), names(entry.en), key);
  }
  setLanguage('en');
  assert.equal(t('turn', { n: 3 }), 'Turn 3');
  setLanguage('zh');
  assert.equal(t('turn', { n: 3 }), '第 3 回合');
});

test('every critical rule has words', () => {
  for (const u of Object.values(UNITS)) if (u.crit) assert.ok(WORDS['rule_' + u.crit.rule], u.crit.rule);
});

test('names of units, buildings, terrain, commanders, arts and maps are in both languages', () => {
  const both = (e, where) => assert.ok(e?.zh && e?.en, where);
  for (const [id, u] of Object.entries(UNITS)) both(u, id);
  for (const [id, b] of Object.entries(BUILDINGS)) both(b, id);
  for (const [id, x] of Object.entries(TERRAIN)) both(x, id);
  for (const [id, f] of Object.entries(FACTIONS)) both(f, id);
  for (const [id, c] of Object.entries(COMMANDERS)) {
    both(c, id);
    both(c.title, id + ' title');
    both(c.blurb, id + ' blurb');
    both(c.art, id + ' art');
    both(c.art.text, id + ' art text');
  }
  for (const m of MAPS) {
    both(m.name, m.id);
    both(m.blurb, m.id + ' blurb');
  }
});

test('no Chinese is written into the interface code outside the word table and the data', async () => {
  const CJK = /[㐀-鿿]/;
  const files = [];
  for (const folder of ['../src/', '../src/view/', '../src/audio/', '../src/ui/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) assert.ok(!CJK.test(literal), `${file}: ${literal}`);
  }
});
