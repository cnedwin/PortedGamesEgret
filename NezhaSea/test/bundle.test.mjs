import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = name => {
  assert.ok(!isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'Owned game path: ' + name);
  return readFileSync(join(root, name), 'utf8').replace(/\r\n/g, '\n');
};
const hash = text => createHash('sha256').update(text).digest('hex');

test('launch bundle is current with the vendored engine and readable source', () => {
  const manifest = JSON.parse(read('bundle/manifest.json'));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.esbuild, '0.28.2');
  assert.equal(manifest.engine, read('vendor/SOURCE.md').match(/commit `([0-9a-f]{40})`/)?.[1]);
  assert.ok(manifest.inputs['src/main.mjs']);
  assert.ok(manifest.inputs['src/audio-render.mjs']);
  assert.ok(manifest.outputs['main.mjs']);
  assert.ok(manifest.outputs['audio-render.mjs']);
  for (const [name, digest] of Object.entries(manifest.inputs)) assert.equal(hash(read(name)), digest, 'Rebuild for ' + name);
  for (const [name, digest] of Object.entries(manifest.outputs)) assert.equal(hash(read('bundle/' + name)), digest, 'Generated ' + name);
  const names = readdirSync(join(root, 'bundle')).sort();
  assert.deepEqual(names, ['manifest.json', ...Object.keys(manifest.outputs)].sort());
  assert.match(read('index.html'), /await import\('\.\/bundle\/main\.mjs'\)/);
});

