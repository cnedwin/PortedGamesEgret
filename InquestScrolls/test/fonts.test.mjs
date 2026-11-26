// 字体子集必须盖住游戏里的每一个字：CanvasKit 段落遇到字体里没有的字会整段拒绝排版。改了文字就重跑
// tools/assets/fonts.mjs。
// The font subset must hold every character of the game: a CanvasKit paragraph refuses the whole text when a
// character is missing from its fonts. Run tools/assets/fonts.mjs again after changing any words.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { CASES, PROLOGUE, SCROLLS } from '../src/sim/cases/index.mjs';
import { KINDS } from '../src/sim/kinds.mjs';
import { WORDS } from '../src/words.mjs';

function* strings(v) {
  if (typeof v === 'string') yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) yield* strings(x);
}

test('every character of the game is in the body font', async () => {
  const have = new Set(await readFile(new URL('../assets/fonts/song-chars.txt', import.meta.url), 'utf8'));
  const missing = new Set();
  for (const s of strings([CASES, PROLOGUE, SCROLLS, KINDS, WORDS]))
    for (const ch of s.replace(/\[\[[a-z0-9]+\|?|\]\]|\{\{[a-z0-9]+\}\}/g, '')) if (ch !== '\n' && !have.has(ch)) missing.add(ch);
  assert.deepEqual([...missing], []);
});

test('the font manifest named in fonts.json is the one on disk', async () => {
  const { createHash } = await import('node:crypto');
  const config = JSON.parse(await readFile(new URL('../assets/fonts/fonts.json', import.meta.url), 'utf8'));
  const bytes = await readFile(new URL('../assets/fonts/' + config.manifestPath, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), config.manifestSha256);
  for (const file of Object.values(config.blobs)) await readFile(new URL('../assets/fonts/' + file, import.meta.url));
});
