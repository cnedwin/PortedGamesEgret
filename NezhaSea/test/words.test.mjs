// 文字：每一句都有中英两种、占位符一致、英文里没有中文；每件法宝、宝物、属性、哪吒的样子和水族兵都有名字；界面代码
// 里不写死中文。
// Words: every line in Chinese and English, with the same placeholders, and no Chinese in the English; every
// treasure, item, stat, form of Nezha and sea soldier has a name; the interface code writes no Chinese itself.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, words, setLanguage, startLanguage, t } = await import('../src/i18n.mjs');
const D = await import('../src/sim/data.mjs');

test('every line has both languages and the same placeholders in each', () => {
  assert.deepEqual(words.missing(), { zh: [], en: [] });
  const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(WORDS.zh)) assert.deepEqual(names(WORDS.zh[key]), names(WORDS.en[key]), key);
  for (const [key, line] of Object.entries(WORDS.en)) if (key !== 'language') assert.ok(!/[㐀-鿿]/.test(line), `${key}: ${line}`);
  const named = [...D.WEAPON_KINDS, ...D.DIVINE_KINDS, ...D.ITEM_KINDS, ...D.HERO_KINDS, ...Object.keys(D.BASE_STATS), ...D.SOLDIER_KINDS.map((k) => (k === 'conch' ? 'soldierConch' : k)), 'yaksha', 'aoBing'];
  for (const key of named) assert.ok(WORDS.zh[key] && WORDS.en[key], key);
  for (const key of [...D.WEAPON_KINDS, ...D.DIVINE_KINDS]) assert.ok(WORDS.zh[`${key}Note`], `${key}Note`);
  setLanguage('en');
  assert.equal(t('wave', { n: 3, total: 20 }), 'Wave 3/20');
  setLanguage('zh');
  assert.equal(t('wave', { n: 3, total: 20 }), '第 3/20 波');
});

test('the browser language picks the starting language', () => {
  assert.equal(startLanguage(['en-GB', 'zh-CN']), 'en');
  assert.equal(startLanguage(['zh-TW']), 'zh');
  assert.equal(startLanguage(['fr-FR', 'zh-CN']), 'zh');
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/;
  const files = [];
  const exceptions = new Set(['../src/i18n.mjs']);
  for (const folder of ['../src/', '../src/sim/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && !exceptions.has(folder + name)) files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) assert.ok(!CJK.test(literal), `${file}: ${literal}`);
  }
});
