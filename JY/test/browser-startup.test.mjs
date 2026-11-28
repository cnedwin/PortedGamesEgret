import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { makeGameImports, musicPackages, shippedGameFile } from '../src/browser-imports.mjs';
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
  // Native title input already loads the pointer router. It must be present in
  // the combined startup closure, without a duplicate Home hint.
  assert(startup.has('vendor/runtime/dist/input/PointerRouter.js') || modulePreloads.includes('vendor/runtime/dist/input/PointerRouter.js'));
  assert(!modulePreloads.includes('play/jyx2/scene/native-home-view.mjs'));
  assert(modulePreloads.every(path => !startup.has(path)));
  await checkShippedModules(modulePreloads);
});

test('hosted and local launchers resolve the generated engine closure and music imports', async () => {
  const map = JSON.parse(await readFile(new URL('../vendor/importmap.json', import.meta.url), 'utf8'));
  const imports = makeGameImports(map, (folder, file) => `vendor/${folder}/${file}`, name => `music-lib/${name}/index.js`);
  assert(imports['@egret/engine/web/text']);
  assert(imports['@egret/engine/webgl2/world3d']);
  assert.deepEqual(Object.keys(imports).sort(), [...Object.keys(map.imports), ...musicPackages].sort());
  for (const [specifier, file] of Object.entries(map.imports)) {
    assert.equal(imports[specifier], file.slice(2));
    await access(new URL('../' + imports[specifier], import.meta.url));
  }
});
