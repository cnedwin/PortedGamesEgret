import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { readCatalog, writeCatalog } from './catalog.mjs';

const real = await readFile(new URL('../../showcase/games.js', import.meta.url), 'utf8');
const small = `// Catalogue note
export const FEATURED_ID = 'beta';
export const GAMES = [
  {
    id: 'alpha', /* alpha's original note */
    summary: { zh: '阿尔法', en: "Alpha's \\u2603", stamp: 'keep this' },
    genre: { zh: '类型', en: 'Genre' },
    extra: [false, true, null, -1.25e2, { "with-space": 'literal' },],
  },
  { id: 'beta', summary: { zh: '贝塔', en: 'Beta' }, imageFocus: '75% center' },
];
// End of catalogue
`;

test('reads every game and arbitrary published metadata from the current showcase', () => {
  const { featuredId, games } = readCatalog(real);
  const expectedIds = [...real.matchAll(/^    id:\s*['"]([a-z][a-z0-9-]*)['"],/gm)].map(match => match[1]);
  assert(expectedIds.length > 0);
  assert.deepEqual(games.map(({ id }) => id), expectedIds);
  assert(games.some(game => game.id === featuredId));
  assert.equal(games.find(({ id }) => id === 'snow').imageFocus, '75% center');
  assert.equal(games.find(({ id }) => id === 'nine').features[0].source, 'src/view3d/terrain.mjs');
  assert(games.every(game => game.folder && game.zh && game.en && game.scenes.length === 3 && game.features.length >= 3));
});

test('reorders the full catalogue and only changes the requested bilingual summaries', () => {
  const { featuredId, games } = readCatalog(real);
  const reversed = games.map(({ id }) => id).reverse();
  const summaries = { snow: { zh: '新版中文版', en: 'New English description' } };
  const output = writeCatalog(real, reversed, summaries);
  assert.deepEqual(readCatalog(output), {
    featuredId,
    games: [...games].reverse().map(game => game.id === 'snow' ? { ...game, summary: summaries.snow } : game),
  });
  assert.equal(writeCatalog(real, games.map(({ id }) => id), {}), real);
  assert.equal(writeCatalog(output, reversed, summaries), output);
});

test('retains original template text and serializes edits as safely quoted text', () => {
  const source = small.replaceAll('\n', '\r\n');
  assert.deepEqual(readCatalog(source).games[0].extra, [false, true, null, -125, { 'with-space': 'literal' }]);
  const zh = '第一行\n第二行🧊\\反斜线\u2029“引号”\u0000';
  const en = '"; ] } </script><img src=x onerror="alert(1)"> & \\ \' \u2028';
  const output = writeCatalog(source, ['beta', 'alpha'], { alpha: { zh, en } });
  const { featuredId, games } = readCatalog(output);
  assert.equal(featuredId, 'beta');
  assert.deepEqual(games[1].summary, { zh, en, stamp: 'keep this' });
  assert(output.includes('<') === false);
  assert(output.includes('\r\n'));
  assert(output.startsWith('// Catalogue note\r\n'));
  assert(output.endsWith('// End of catalogue\r\n'));
  const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: output, encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  assert(output.includes(`id: 'alpha', /* alpha's original note */`));
  assert(output.includes(`{ id: 'beta', summary: { zh: '贝塔', en: 'Beta' }, imageFocus: '75% center' }`));
});

test('rejects executable syntax and ambiguous object-literal properties', () => {
  const snippet = expression => small.replace("'阿尔法'", expression);
  for (const expression of [
    'String(42)', '(1 + 2)', "name", "'hello' + 'world'", 'undefined', 'NaN',
    "'' || (globalThis.catalogWasExecuted = true)", '`template`', 'new Date()',
    "{ get zh() { return 'value'; } }", "{ ['zh']: 'computed' }", '{ ...value }',
  ]) assert.throws(() => readCatalog(snippet(expression)), SyntaxError, expression);
  assert.equal(globalThis.catalogWasExecuted, undefined);
  assert.throws(() => readCatalog(small + '\nconsole.log("trailing code");'), SyntaxError);
  assert.throws(() => readCatalog(small.replace('extra:', 'constructor:')), SyntaxError);
  assert.throws(() => readCatalog(small.replace('extra:', '"__proto__":')), SyntaxError);
  assert.throws(() => readCatalog(small.replace('stamp:', 'zh:')), SyntaxError);
});

test('rejects duplicate or missing source IDs, a missing featured game, and invalid edits', () => {
  assert.throws(() => readCatalog(small.replace("id: 'beta'", "id: 'alpha'")), /duplicate.*id/i);
  assert.throws(() => readCatalog(small.replace("id: 'beta'", "name: 'beta'")), /id/i);
  assert.throws(() => readCatalog(small.replace("FEATURED_ID = 'beta'", "FEATURED_ID = 'missing'")), /featured/i);
  for (const order of [
    ['alpha'], ['alpha', 'alpha'], ['alpha', 'missing'], ['alpha', 'beta', 'missing'],
  ]) assert.throws(() => writeCatalog(small, order, {}), /order/i);
  assert.throws(() => writeCatalog(small, ['alpha', 'beta'], { unknown: { zh: '字', en: 'text' } }), /summary|summaries/i);
  assert.throws(() => writeCatalog(small, ['alpha', 'beta'], { beta: { zh: '仅中文' } }), /summary/i);
  assert.throws(() => writeCatalog(small, ['alpha', 'beta'], { beta: { zh: '好', en: '  ' } }), /summary/i);
  assert.throws(() => writeCatalog(small, ['alpha', 'beta'], { beta: { zh: '好', en: 'Text', title: 'override' } }), /summary/i);
});
