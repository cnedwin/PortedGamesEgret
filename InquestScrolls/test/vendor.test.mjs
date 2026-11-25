// 引擎副本与页面的 import map 必须一致，游戏用到的每个引擎入口都要在副本里；规则不碰引擎和页面。
// The engine copy and the page's import map must agree, every engine entry the game imports must be in the copy, and
// the rules stay free of the engine and the page.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const modules = async (folder) => {
  const out = [];
  for (const entry of await readdir(new URL(folder, import.meta.url), { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...(await modules(folder + entry.name + '/')));
    else if (entry.name.endsWith('.mjs')) out.push(folder + entry.name);
  }
  return out;
};

test("the page's import map is the one the engine copy came with", async () => {
  const page = await read('../index.html'),
    pasted = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(page)[1]);
  assert.deepEqual(pasted, JSON.parse(await read('../vendor/importmap.json')));
});

test('every engine entry the game imports is in the copy', async () => {
  const { imports } = JSON.parse(await read('../vendor/importmap.json')),
    asked = new Set();
  for (const file of await modules('../src/')) for (const [, entry] of (await read(file)).matchAll(/from '(@egret\/[^']+)'/g)) asked.add(entry);
  assert.ok(asked.size >= 10, `only ${asked.size} entries`);
  for (const entry of asked) {
    assert.ok(imports[entry], `${entry} is not in vendor/importmap.json`);
    await read('../' + imports[entry]);
  }
});

test('the rules use neither the engine nor the page', async () => {
  for (const file of await modules('../src/sim/')) {
    const rules = (await read(file)).replace(/\/\/.*$/gm, '');
    assert.ok(!/\b(document|window|localStorage|location)\.[a-z]/.test(rules), file);
    assert.ok(!/from '@egret/.test(rules), file);
    assert.ok(!/from '\.\.\/view|from '\.\.\/\.\.\/view/.test(rules), file);
  }
});
