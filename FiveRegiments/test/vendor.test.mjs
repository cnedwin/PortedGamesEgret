// 引擎副本与页面的 import map 必须一致，游戏用到的每个引擎入口都要在副本里；规则文件不碰页面和引擎。
// The engine copy and the page's import map agree, every engine entry the game imports is in the copy, and the rules
// touch neither the page nor the engine.
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
  for (const folder of ['../src/', '../src/view/', '../src/sim/'])
    for (const name of await readdir(new URL(folder, import.meta.url)))
      if (name.endsWith('.mjs')) for (const [, entry] of (await read(folder + name)).matchAll(/from '(@egret\/[^']+)'/g)) asked.add(entry);
  assert.ok(asked.size >= 4, `only ${asked.size} entries`);
  for (const entry of asked) {
    assert.ok(imports[entry], `${entry} is not in vendor/importmap.json`);
    await read('../' + imports[entry]);
  }
  for (const file of ['fight.mjs', 'brain.mjs', 'regiments.mjs', 'road.mjs']) {
    const rules = await read('../src/sim/' + file);
    assert.ok(!/\b(document|window|localStorage)\b/.test(rules.replace(/\/\/.*$/gm, '')), file);
    assert.ok(!/from '@egret/.test(rules), file);
  }
});
