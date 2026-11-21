// 文字：每一句都有中英两种、占位符一致；42 种牌都有名字；台数表里每一类都有名字和说明；界面代码里不写死中文（只有
// i18n.mjs 里有）。
// Words: every line has Chinese and English with the same placeholders; all 42 tiles are named; every kind of tai has
// a name and a note; and the interface code writes no Chinese itself (only i18n.mjs does).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, setLanguage, t, tileName, words } = await import('../src/i18n.mjs');
const { TAI } = await import('../src/sim/score.mjs');

test('every line has both languages and the same placeholders in each', () => {
  const zh = Object.keys(WORDS.zh).sort(),
    en = Object.keys(WORDS.en).sort();
  assert.deepEqual(zh, en);
  const names = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
  for (const key of zh) assert.deepEqual(names(WORDS.zh[key]), names(WORDS.en[key]), key);
  assert.equal(words.missing?.().length ?? 0, 0);
  setLanguage('en');
  assert.equal(t('wallLeft', { n: 12 }), '12 left');
  assert.equal(tileName(4), '5 Characters');
  setLanguage('zh');
  assert.equal(t('wallLeft', { n: 12 }), '剩 12 張');
  assert.equal(tileName(31), '紅中');
});

test('every tile and every kind of tai is named, and English has no Chinese', () => {
  for (let kind = 0; kind < 42; kind++) assert.ok(WORDS.zh['tile' + kind] && WORDS.en['tile' + kind], `tile ${kind}`);
  for (const key of Object.keys(TAI)) for (const prefix of ['tai_', 'note_']) assert.ok(WORDS.zh[prefix + key] && WORDS.en[prefix + key], prefix + key);
  for (const [key, text] of Object.entries(WORDS.en)) if (key !== 'chinese' && key !== 'pageTitle') assert.ok(!/[㐀-鿿]/.test(text), `${key}: ${text}`);
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/;
  const files = [];
  for (const folder of ['../src/', '../src/sim/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs' && name !== 'tiles.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) assert.ok(!CJK.test(literal), `${file}: ${literal}`);
  }
});
