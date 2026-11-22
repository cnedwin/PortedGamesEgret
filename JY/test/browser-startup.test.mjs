import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { shippedGameFile } from '../src/browser-imports.mjs';
import { startupModules } from '../src/browser-startup-modules.mjs';

test('hosted startup preloads refer to shipped static modules at their real import URLs', async () => {
  assert.equal(startupModules[0], 'play/main.mjs');
  assert.equal(new Set(startupModules).size, startupModules.length);
  assert(startupModules.includes('play/idb-keyval.mjs'));
  assert(startupModules.includes('vendor/robust-predicates/esm/util.js'));
  await Promise.all(startupModules.map(async path => {
    assert.match(path, /^(?:play|vendor|third-party)\/[\w./-]+\.(?:mjs|js)$/);
    assert(!path.split('/').includes('..'));
    const file = path.startsWith('play/') ? shippedGameFile(path.slice('play/'.length)) : path;
    await access(new URL('../' + file, import.meta.url));
  }));
});
