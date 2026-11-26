import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { shippedGameFile } from '../src/browser-imports.mjs';
import { startupModules } from '../src/browser-startup-modules.mjs';

async function checkShippedModules(paths) {
  assert.equal(new Set(paths).size, paths.length);
  await Promise.all(paths.map(async path => {
    assert.match(path, /^(?:play|vendor|third-party)\/[\w./-]+\.(?:mjs|js)$/);
    assert(!path.split('/').includes('..'));
    const file = path.startsWith('play/') ? shippedGameFile(path.slice('play/'.length)) : path;
    await access(new URL('../' + file, import.meta.url));
  }));
}

test('hosted startup preloads refer to shipped static modules at their real import URLs', async () => {
  assert.equal(startupModules[0], 'play/main.mjs');
  assert(startupModules.includes('play/idb-keyval.mjs'));
  assert(startupModules.includes('vendor/robust-predicates/esm/util.js'));
  await checkShippedModules(startupModules);
});

test('the Home scene manifest hints only additional renderer modules', async () => {
  const { modulePreloads } = JSON.parse(await readFile(new URL('../web/jyx2/home3d/scene.json', import.meta.url), 'utf8'));
  const startup = new Set(startupModules);
  assert(modulePreloads.includes('vendor/runtime/dist/input/PointerRouter.js'));
  assert(!modulePreloads.includes('play/jyx2/scene/native-home-view.mjs'));
  assert(modulePreloads.every(path => !startup.has(path)));
  await checkShippedModules(modulePreloads);
});
