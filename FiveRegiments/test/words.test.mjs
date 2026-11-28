// 文字：每一句都有中英两种；界面代码里不写死中文（只在 i18n.mjs 和 sim/regiments.mjs 的名字表里）。
// Words: every line has Chinese and English; the interface code writes no Chinese itself (only i18n.mjs and the name
// tables in sim/regiments.mjs do).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { WORDS, setLanguage, t } from '../src/i18n.mjs';
import { REGIMENTS, SKILLS, TALENTS } from '../src/sim/regiments.mjs';

test('every line and every name has both languages, with the same placeholders', () => {
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(names(entry.zh), names(entry.en), key);
  }
  for (const table of [REGIMENTS, SKILLS, TALENTS]) for (const [id, v] of Object.entries(table)) assert.ok(v.name.zh && v.name.en, id);
  setLanguage('en');
  assert.equal(t('stage', { n: 2 }), 'Fight 2');
  setLanguage('zh');
  assert.equal(t('stage', { n: 2 }), '第2阵');
});

test('no Chinese is written into the interface code outside the tables', async () => {
  const CJK = /[㐀-鿿]/,
    allowed = new Set(["'中文'"]);
  const files = [];
  for (const folder of ['../src/', '../src/view/', '../src/sim/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs' && name !== 'regiments.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (CJK.test(literal)) assert.ok(allowed.has(literal), `${file}: ${literal}`);
  }
});

test('Imperial Arena uses its new localized public brand consistently', () => {
  for (const [lang,name] of [['zh','帝国竞技场'],['en','Imperial Arena']]) {
    setLanguage(lang);
    assert.equal(t('title'),name);
    assert.ok(t('canvasLabel').startsWith(name));
    assert.ok(t('runDone').startsWith(name));
  }
  setLanguage('zh');
});
