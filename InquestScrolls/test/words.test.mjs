// 文字：界面上的每个词中英都有；英文里不混中文；案卷里的英文同样不混中文，中文不缺。
// Words: every interface word in both languages; no Chinese in the English; the same for every case text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, say } from '../src/words.mjs';
import { CASES, PROLOGUE, SCROLLS } from '../src/sim/cases/index.mjs';
import { KINDS } from '../src/sim/kinds.mjs';

const CJK = /[㐀-鿿　-〿＀-￯]/;

function* texts(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* texts(v, `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* texts(v, `${path}.${k}`);
}

test('every interface word has Chinese and English, and the English has no Chinese in it', () => {
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    assert.ok(!CJK.test(entry.en), `${key}: ${entry.en}`);
  }
  assert.equal(say('en', 'pouchCount', { n: 3 }), 'Pouch 3');
  assert.equal(say('zh', 'sealedOf', { n: 1, m: 2 }), '已核 1/2 页');
});

test('every English case text is free of Chinese, and every text has both languages', () => {
  const pairs = [];
  const visit = (v, path) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('zh' in v && 'en' in v && (typeof v.zh === 'string' || Array.isArray(v.zh))) pairs.push([path, v]);
      for (const [k, x] of Object.entries(v)) if (k !== 'zh' && k !== 'en') visit(x, `${path}.${k}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
  };
  for (const c of CASES) visit(c, c.id);
  visit(PROLOGUE, 'prologue');
  visit(SCROLLS, 'scrolls');
  visit(KINDS, 'kinds');
  assert.ok(pairs.length > 300, String(pairs.length));
  for (const [path, v] of pairs) {
    assert.ok(v.zh?.length && v.en?.length, path);
    if (Array.isArray(v.en) && Array.isArray(v.zh) && path.endsWith('board') === false) assert.equal(v.en.length, v.zh.length, `${path}: paragraphs`);
    for (const [, s] of texts(v.en)) assert.ok(!CJK.test(s), `${path}: ${s}`);
  }
});
