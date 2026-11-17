// The engine copy and the page that loads it have to agree, or the game stops at its first import.
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
  for (const folder of ['../src/', '../src/rules/', '../src/view/'])
    for (const name of await readdir(new URL(folder, import.meta.url)))
      if (name.endsWith('.mjs')) for (const [, entry] of (await read(folder + name)).matchAll(/from '(@egret\/[^']+)'/g)) asked.add(entry);
  assert.ok(asked.size >= 4);
  for (const entry of asked) {
    assert.ok(imports[entry], `${entry} is not in vendor/importmap.json`);
    await read('../' + imports[entry]);
  }
  // The rules stay free of the engine, so they run in plain Node.
  for (const name of await readdir(new URL('../src/rules/', import.meta.url))) assert.ok(!(await read('../src/rules/' + name)).includes('@egret/'), name);
});
