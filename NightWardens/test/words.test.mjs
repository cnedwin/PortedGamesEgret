// 文字：每一句都有中英两种；每道符法、每位首领、每一夜都有名字；界面代码里不写死中文（只有 i18n.mjs 里有，
// 以及切换语言时的「中文」二字；art/ 里画在图上的字是画，不算界面文字）。
// Words: every line has Chinese and English; every ward, warden and night has a name; and the interface code writes no
// Chinese itself (only i18n.mjs does, and the word for the language in the language switch; letters painted into the
// pictures of art/ are pictures, not interface words).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { WARDS, NIGHTS } from '../src/sim/data.mjs';
import { WARD_WORDS, WORDS, clock, setLanguage, starMarks, t } from '../src/i18n.mjs';

test('every line has both languages and the same placeholders in each', () => {
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(names(entry.zh), names(entry.en), key);
  }
  setLanguage('en');
  assert.equal(t('levelShort', { level: 4 }), 'Lv 4');
  assert.equal(clock(125), '2:05');
  setLanguage('zh');
  assert.equal(t('levelShort', { level: 4 }), '4 级');
  assert.equal(clock(125), '2 分 05 秒');
  assert.equal(starMarks(2), '★★☆');
});

test('every ward, warden and night has its words', () => {
  for (const id of Object.keys(WARDS)) {
    assert.ok(WARD_WORDS[id], id);
    for (const key of WARD_WORDS[id]) assert.ok(WORDS[key], key);
  }
  for (const night of NIGHTS) {
    assert.ok(WORDS[`night${night.id}`] && WORDS[`nightShort${night.id}`]);
    assert.ok(WORDS[night.boss], night.boss);
  }
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/,
    allowed = new Set(["'中文'"]);
  const files = [];
  for (const folder of ['../src/', '../src/ui/', '../src/sim/', '../src/audio/', '../src/view/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (CJK.test(literal)) assert.ok(allowed.has(literal), `${file}: ${literal}`);
  }
});
