// 文字：每一句都有中英两种、占位符一致；界面代码里不写死中文（只在文字表、关卡表和题字「班」里有）。
// Words: every line has Chinese and English with the same placeholders, and the interface code writes no Chinese of
// its own (only the word table, the level table and the seal's one character do).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, say } = await import('../src/words.mjs');
const { CHAPTERS, LEVELS, SANDBOX } = await import('../src/sim/levels.mjs');

test('every line has both languages and the same placeholders in each', () => {
  const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  assert.deepEqual(Object.keys(WORDS.zh).sort(), Object.keys(WORDS.en).sort());
  for (const key of Object.keys(WORDS.zh)) {
    assert.ok(WORDS.zh[key] && WORDS.en[key], key);
    assert.deepEqual(names(WORDS.zh[key]), names(WORDS.en[key]), key);
  }
  assert.equal(say('zh', 'budget', { budget: 120 }), '预算 120 两');
  assert.equal(say('en', 'cost', { cost: 75 }), 'Cost 75 taels');
});

test('every level and chapter is named and explained in both languages', () => {
  for (const l of [...LEVELS, SANDBOX]) for (const k of ['name', 'tip']) assert.ok(l[k].zh && l[k].en, `${l.id} ${k}`);
  for (const c of CHAPTERS) assert.ok(c.name.zh && c.name.en && c.lesson.zh && c.lesson.en, c.id);
});

test('no Chinese is written into the interface code outside the tables', async () => {
  const CJK = /[㐀-鿿]/,
    allowed = new Set(["'班'", "'中文'"]);
  const files = [];
  for (const folder of ['../src/', '../src/view/', '../src/sim/', '../src/audio/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && !['words.mjs', 'levels.mjs'].includes(name)) files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (CJK.test(literal)) assert.ok(allowed.has(literal), `${file}: ${literal}`);
  }
});
