// 文字：每一句都有中英两种；界面代码里不写死中文（只有 i18n.mjs 里有，切换语言时的「中文」二字，以及画进手卷里的
// 题字和印章——那是画的一部分，哪种语言下都一样）。
// Words: every line has Chinese and English, and the interface code writes no Chinese itself (only i18n.mjs does, the
// word for the language in the language switch, and the title and seal painted into the scroll, which are part of the
// picture and the same in either language).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { WORDS, setLanguage, t } from '../src/i18n.mjs';

test('every line has both languages and the same placeholders in each', () => {
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    assert.deepEqual(names(entry.zh), names(entry.en), key);
  }
  setLanguage('en');
  assert.equal(t('chain', { chain: 3 }), 'Chain ×3');
  setLanguage('zh');
  assert.equal(t('chain', { chain: 3 }), '连消 ×3');
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/,
    allowed = new Set(["'中文'"]),
    painted = '../src/view/scroll.mjs';
  const files = [];
  for (const folder of ['../src/', '../src/ui/', '../src/sim/', '../src/audio/', '../src/view/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && name !== 'i18n.mjs') files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (CJK.test(literal) && file !== painted) assert.ok(allowed.has(literal), `${file}: ${literal}`);
  }
});
