import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const aliases = {
  '@egret/engine': '../vendor/engine/dist/index.js',
  '@egret/engine/world3d': '../vendor/engine/dist/rendering/world3d/index.js',
  '@egret/engine/webgl2/world3d': '../vendor/engine/dist/web/world3d/index.js',
  '@egret/runtime': '../vendor/runtime/dist/index.js',
  '@egret/contracts': '../vendor/contracts/dist/index.js',
  '@egret/contracts/resources': '../vendor/contracts/dist/resources/index.js'
};
registerHooks({ resolve(name, context, next) {
  return next(aliases[name] ? new URL(aliases[name], import.meta.url).href : name, context);
} });
const { createEngine } = await import('@egret/engine');
const { createWorld3DHost } = await import('@egret/engine/webgl2/world3d');
const { loadCharacterGroup } = await import('../src/view/characters.mjs');
const hero = await readFile(new URL('../assets/characters/hero-low.glb', import.meta.url));

async function setup(t, fetchAsset, decode) {
  t.mock.method(globalThis, 'fetch', fetchAsset);
  const original = globalThis.createImageBitmap;
  globalThis.createImageBitmap = decode;
  t.after(() => {
    if (original === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = original;
  });
  const engine = await createEngine({ host: createWorld3DHost({}) });
  t.after(() => engine.dispose());
  return { engine, scope: engine.createScope() };
}

test('a missing optional role does not reject a healthy member of the asset group', async t => {
  let opened = 0, closed = 0;
  const { engine, scope } = await setup(t, async url => {
    if (url.pathname.endsWith('index.json')) return Response.json({ hero: ['low'], lu: ['low'], bow: ['high'] });
    if (url.pathname.endsWith('hero-low.glb')) return new Response(hero);
    return new Response(null, { status: 503 });
  }, async () => {
    opened++;
    return { width: 1, height: 1, close() { closed++; } };
  });
  const { group, roles } = await loadCharacterGroup(engine, scope, 'low');
  assert.deepEqual(roles, ['hero', 'lu']);
  const members = await group.ready;
  assert.equal(group.state, 'ready');
  const body = members[0].value;
  const { mesh, geometry, material } = body.parts[0];
  assert.equal(body.kind, 'hero');
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  assert.deepEqual(members[1].value, { kind: 'lu', error: 'Character HTTP 503' });
  assert.ok(opened > 0);
  assert.equal(closed, 0);

  scope.dispose();
  assert.equal(group.state, 'disposed');
  assert.equal(geometry.isDisposed, true);
  assert.equal(closed, opened);
});

test('page cancellation retires pending acquisition and closes a bitmap returned after abort', { timeout: 5000 }, async t => {
  const decoderStarted = Promise.withResolvers(),
    allowDecode = Promise.withResolvers(),
    bitmapClosed = Promise.withResolvers();
  const { engine, scope } = await setup(t, async url => {
    if (url.pathname.endsWith('index.json')) return Response.json({ hero: ['low'] });
    return new Response(hero);
  }, async () => {
    decoderStarted.resolve();
    await allowDecode.promise;
    return { width: 1, height: 1, close() { bitmapClosed.resolve(); } };
  });
  const page = new AbortController();
  const { group } = await loadCharacterGroup(engine, scope, 'low', page.signal);
  await decoderStarted.promise;
  page.abort();
  await assert.rejects(group.ready, { code: 'ASSET_GROUP_DISPOSED' });
  assert.equal(group.state, 'disposed');

  allowDecode.resolve();
  await bitmapClosed.promise;
});

test('a failed availability index rejects before requesting optional bodies', async t => {
  const urls = [];
  const { engine, scope } = await setup(t, async url => {
    urls.push(url.pathname);
    return new Response(null, { status: 503 });
  }, () => assert.fail('No bitmap should be decoded'));
  await assert.rejects(loadCharacterGroup(engine, scope, 'low'), /Character index HTTP 503/);
  assert.equal(urls.length, 1);
  assert.ok(urls[0].endsWith('index.json'));
});
