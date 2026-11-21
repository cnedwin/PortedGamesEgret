// 文字：每一句都有中英两种、占位符一致、英文里没有中文；曲名和说明也有两种；界面代码里不写死中文。锣鼓经的字是谱
// 本身（songs.mjs 和按字选声音的 sound.mjs），戏台匾上的「出将」「入相」是画（ground.mjs），这三处除外。
// Words: every line in Chinese and English, with the same placeholders, and no Chinese in the English; the songs'
// names and notes in both too; the interface code writes no Chinese itself. The score's syllables (songs.mjs, and
// sound.mjs, which picks a sound by syllable) and the plaques painted over the stage doors (ground.mjs) are the
// exceptions.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, words, setLanguage, startLanguage, t } = await import('../src/i18n.mjs');
const { SONGS } = await import('../src/sim/songs.mjs');

test('every line has both languages and the same placeholders in each', () => {
  assert.deepEqual(words.missing(), { zh: [], en: [] });
  const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(WORDS.zh)) assert.deepEqual(names(WORDS.zh[key]), names(WORDS.en[key]), key);
  for (const [key, line] of Object.entries(WORDS.en)) if (key !== 'language') assert.ok(!/[㐀-鿿]/.test(line), `${key}: ${line}`);
  for (const song of SONGS) {
    assert.ok(song.zh && song.en && song.noteZh && song.noteEn, song.id);
    assert.ok(!/[\u3400-\u9fff]/.test(song.en + song.noteEn), song.id);
  }
  setLanguage('en');
  assert.equal(t('score', { n: 300 }), '300 pts');
  setLanguage('zh');
  assert.equal(t('score', { n: 300 }), '300 分');
});

test('the browser language picks the starting language', () => {
  assert.equal(startLanguage(['en-GB', 'zh-CN']), 'en');
  assert.equal(startLanguage(['zh-TW']), 'zh');
  assert.equal(startLanguage(['fr-FR', 'zh-CN']), 'zh');
});

test('no Chinese is written into the interface code outside the word table', async () => {
  const CJK = /[㐀-鿿]/;
  const files = [];
  const exceptions = new Set(['../src/i18n.mjs', '../src/sim/songs.mjs', '../src/audio/sound.mjs', '../src/ground.mjs']);
  for (const folder of ['../src/', '../src/sim/', '../src/audio/'])
    for (const name of await readdir(new URL(folder, import.meta.url))) if (name.endsWith('.mjs') && !exceptions.has(folder + name)) files.push(folder + name);
  for (const file of files) {
    const code = (await readFile(new URL(file, import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const literal of code.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) assert.ok(!CJK.test(literal), `${file}: ${literal}`);
  }
});
