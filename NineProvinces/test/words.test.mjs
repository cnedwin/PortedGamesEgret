// 文字：每一句都有中英两种、占位符一致；界面代码里用到的每个键都在表里（包括拼出来的 why_、status_、tax_ 等）；
// 每个人名、地名、势力、兵种、阵型、地形、特性、战法、宝物、科技、演义事件和选项都有中英两种名字，英文名里没有
// 下划线和汉字；年号纪年对得上。
// Words: every line in both languages with the same placeholders; every key the interface code uses is in the table
// (including those it builds, why_, status_, tax_ and the rest); every officer, place, power, troop kind, formation,
// ground, trait, tactic, treasure, invention, event and choice is named in both languages, with no underscores or
// Chinese in the English; and the era dates come out right.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { WORDS, t, setLanguage, dateWords, hanzi } = await import('../src/i18n.mjs');
const { GENERALS } = await import('../src/data/generals.mjs');
const { NODES, PROVINCES } = await import('../src/data/map.mjs');
const { FACTIONS, LATER } = await import('../src/data/factions.mjs');
const { UNITS, FORMATIONS, TERRAIN } = await import('../src/data/battle.mjs');
const { TRAITS, EFFECTS } = await import('../src/data/traits.mjs');
const { TACTICS, SHAPES, KINDS } = await import('../src/data/tactics.mjs');
const { TREASURES } = await import('../src/data/treasures.mjs');
const { TECHS } = await import('../src/data/techs.mjs');
const { BRANCHES, EVENTS } = await import('../src/sim/story.mjs');

const HAN = /[㐀-鿿]/;

test('every line has both languages and the same placeholders in each', () => {
  const names = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, entry] of Object.entries(WORDS)) {
    assert.ok(entry.zh && entry.en, key);
    // Chinese dates carry the era name; English ones do not.
    if (key !== 'months' && key !== 'date') assert.deepEqual(names(entry.zh), names(entry.en), key);
    if (!['language', 'months'].includes(key)) assert.ok(!HAN.test(entry.en), `${key} has Chinese in English`);
  }
  assert.equal(WORDS.months.zh.split(' ').length, 12);
  assert.equal(WORDS.months.en.split(' ').length, 12);
});

test('every key the interface asks for is in the table', async () => {
  const files = [];
  for (const dir of ['../src/', '../src/ui/', '../src/view/'])
    for (const name of await readdir(new URL(dir, import.meta.url))) if (name.endsWith('.mjs')) files.push(await readFile(new URL(dir + name, import.meta.url), 'utf8'));
  const used = new Set();
  for (const text of files) for (const [, key] of text.matchAll(/\bt\('([A-Za-z_]+)'[,)]/g)) used.add(key);
  assert.ok(used.size > 150, `${used.size} keys`);
  for (const key of used) assert.ok(WORDS[key], key);
  // Keys put together from parts.
  const built = [
    ...['notOurs', 'generals', 'unit', 'water', 'troops', 'coin', 'grain', 'busy', 'full', 'people', 'cannot', 'notHere', 'inArmy', 'far', 'notCity', 'noWay', 'here', 'already', 'none', 'notAlly', 'gone', 'kind', 'broken', 'keep', 'depot', 'sunset', 'retreat'].map((w) => 'why_' + w),
    ...['serving', 'free', 'captive', 'dead', 'unborn'].map((w) => 'status_' + w),
    ...['low', 'normal', 'high'].map((w) => 'tax_' + w),
    ...['unified', 'tripod', 'endured', 'fallen'].flatMap((w) => ['ending_' + w, 'endingText_' + w]),
    ...['ally', 'truce'].map((w) => 'treaty_' + w),
    ...['field', 'siege', 'naval'].map((w) => 'battleKind_' + w),
    ...['wuchao', 'chibi'].map((w) => 'special_' + w),
    ...['confuse', 'fear', 'stun'].map((w) => 'st_' + w),
    ...['farm', 'market', 'wall', 'office'].flatMap((w) => [w, w + 'About']),
    ...['lead', 'war', 'int', 'pol', 'cha']
  ];
  for (const key of built) assert.ok(WORDS[key], key);
});

test('every name in the data is there in both languages', () => {
  const tables = { GENERALS, NODES, FACTIONS, LATER, UNITS, FORMATIONS, TERRAIN, TRAITS, TACTICS, TREASURES, TECHS, BRANCHES };
  for (const [name, table] of Object.entries(tables))
    for (const [id, item] of Object.entries(table)) {
      assert.ok(item.zh && HAN.test(item.zh), `${name}.${id} zh`);
      assert.ok(item.en && !item.en.includes('_') && !HAN.test(item.en), `${name}.${id} en: ${item.en}`);
    }
  for (const [id, pair] of Object.entries({ ...PROVINCES, ...SHAPES, ...KINDS, ...EFFECTS })) assert.ok(pair.length === 2 && HAN.test(pair[0]) && !HAN.test(pair[1]), id);
  for (const e of EVENTS) {
    for (const part of [e.title, e.text, ...(e.choices ?? []).map((c) => c.label)]) assert.ok(part.length === 2 && HAN.test(part[0]) && !HAN.test(part[1]) && part[1].length > 2, e.id);
  }
  for (const b of Object.values(BRANCHES)) assert.ok(b.about.length === 2, b.zh);
});

test('era dates: the first year is 元, then Chinese numerals; English uses the common era', () => {
  setLanguage('zh');
  assert.equal(dateWords(184, 2), '中平元年 二月');
  assert.equal(dateWords(196, 1), '建安元年 正月');
  assert.equal(dateWords(219, 12), '建安二十四年 腊月');
  assert.equal(dateWords(220, 6), '延康元年 六月');
  assert.equal(dateWords(250, 5), '公元250年 五月');
  assert.equal(hanzi(11), '十一');
  assert.equal(hanzi(20), '二十');
  setLanguage('en');
  assert.equal(dateWords(184, 2), 'February 184');
  assert.equal(t('marching', { place: 'Ye', days: 3 }), 'Marching to Ye, about 3 days');
  setLanguage('zh');
});
