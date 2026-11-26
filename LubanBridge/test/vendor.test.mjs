// 引擎副本与页面的 import map 必须一致，游戏用到的每个引擎入口都要在副本里。
// The engine copy and the page's import map must agree, and every engine entry the game imports must be in the copy.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test("the page's import map is the one the engine copy came with", async () => {
  const page = await read('../index.html'),
    pasted = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(page)[1]);
  assert.deepEqual(pasted, JSON.parse(await read('../vendor/importmap.json')));
});

test('every engine entry the game imports is in the copy', async () => {
  const { imports } = JSON.parse(await read('../vendor/importmap.json')),
    asked = new Set();
  for (const folder of ['../src/', '../src/view/', '../src/sim/', '../src/audio/'])
    for (const name of await readdir(new URL(folder, import.meta.url)))
      if (name.endsWith('.mjs')) for (const [, entry] of (await read(folder + name)).matchAll(/from '(@egret\/[^']+)'/g)) asked.add(entry);
  assert.ok(asked.size >= 6, `only ${asked.size} entries`);
  for (const entry of asked) {
    assert.ok(imports[entry], `${entry} is not in vendor/importmap.json`);
    await read('../' + imports[entry]);
  }
  // The rules stay free of the page; of the engine they use only its 2D physics, which runs in Node as it is.
  for (const name of await readdir(new URL('../src/sim/', import.meta.url))) {
    const rules = await read('../src/sim/' + name);
    assert.ok(!/\b(document|window|localStorage)\b/.test(rules.replace(/\/\/.*$/gm, '')), name);
    for (const [, entry] of rules.matchAll(/from '(@egret\/[^']+)'/g)) assert.equal(entry, '@egret/engine/physics2d', name);
  }
});
