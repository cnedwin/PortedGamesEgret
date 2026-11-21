import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { GLNativeSession } = await import('../vendor/engine/dist/web/webgl2Native.js');
const { createSharedWebGL2Host } = await import('../vendor/engine/dist/web/webgl2.js');
const { SHARED_REGION_WINDOW_BYTES_2D } = await import('../vendor/engine/dist/rendering/packSharedDraws2D.js');

const completion = 0x91b1;
const sources = [['vertex one', 'fragment one'], ['vertex two', 'fragment two']];

function fixture(extension) {
  let ready = false, current = true;
  let yielded;
  const calls = [];
  let attributes;
  const canvas = {
    width: 8, height: 8,
    getContext(_kind, options) { attributes = options; return context; },
    addEventListener() {},
    removeEventListener() {}
  };
  const context = new Proxy({
    canvas,
    getContextAttributes: () => attributes,
    getParameter: param => param === 3386 ? [8192, 8192] : param === 35380 ? 256 : 16384,
    getShaderPrecisionFormat: () => ({ precision: 23, rangeMin: 127, rangeMax: 127 }),
    getFramebufferAttachmentParameter: (_target, attachment, param) =>
      param === 33296 ? (attachment === 36064 ? 35904 : 9729) : param === 33297 ? 35863 : 8,
    checkFramebufferStatus: () => 36053,
    getUniformBlockIndex: (_program, name) => name === 'RegionWindow' ? 1 : 0,
    getActiveUniformBlockParameter: (_program, index) => index === 1 ? SHARED_REGION_WINDOW_BYTES_2D : 128,
    getUniformIndices: (_program, names) => names.map((_, index) => index),
    getActiveUniforms: (_program, indices) => indices.map(index => index * 16),
    getExtension(name) {
      assert.equal(name, 'KHR_parallel_shader_compile');
      return extension ? { COMPLETION_STATUS_KHR: completion } : null;
    },
    createShader: () => ({}),
    createProgram: () => ({}),
    createFramebuffer: () => ({}),
    createTexture: () => ({}),
    createVertexArray: () => ({}),
    deleteShader: () => calls.push('deleteShader'),
    deleteProgram: () => calls.push('deleteProgram'),
    getError: () => 0,
    isContextLost: () => false,
    linkProgram: () => calls.push('link'),
    getShaderParameter() { calls.push('compileStatus'); return true; },
    getProgramParameter(program, param) {
      calls.push(param === completion ? 'completion' : 'linkStatus');
      return param === completion ? ready : true;
    }
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const native = new GLNativeSession(context, () => {
    if (!current) throw new Error('Generation retired');
  });
  return {
    native, calls, canvas,
    wait: () => new Promise(resolve => { yielded = resolve; }),
    complete() { ready = true; yielded(); },
    cancel() { current = false; yielded(); }
  };
}

test('2D bootstrap submits both links before polling and validates only completed programs', async () => {
  const f = fixture(true);
  const pending = f.native.preparePrograms(sources, f.wait);
  assert.deepEqual(f.calls, ['link', 'link', 'completion', 'completion']);
  f.complete();
  assert.equal((await pending).length, 2);
  assert.deepEqual(f.calls, [
    'link', 'link', 'completion', 'completion', 'completion', 'completion',
    'linkStatus', 'deleteShader', 'deleteShader', 'linkStatus', 'deleteShader', 'deleteShader'
  ]);
  assert(f.native.cleanupAll());
});

test('retiring a pending generation prevents a subsequent GL query and releases every tracked owner', async () => {
  const f = fixture(true);
  const pending = f.native.preparePrograms(sources, f.wait);
  f.cancel();
  await assert.rejects(pending, /Generation retired/);
  assert.deepEqual(f.calls, ['link', 'link', 'completion', 'completion']);
  assert(f.native.cleanupAll());
  assert.equal(f.calls.filter(call => call === 'deleteShader').length, 4);
  assert.equal(f.calls.filter(call => call === 'deleteProgram').length, 2);
});

test('a context without KHR retains the original serial compile and link checks', () => {
  const f = fixture(false);
  assert.equal(f.native.preparePrograms(sources, assert.fail), undefined);
  for (const source of sources) f.native.program(...source);
  const one = ['compileStatus', 'compileStatus', 'link', 'linkStatus', 'deleteShader', 'deleteShader'];
  assert.deepEqual(f.calls, [...one, ...one]);
  assert(f.native.cleanupAll());
});

test('the no-KHR host yields between links and keeps one readiness barrier', async () => {
  const { canvas, calls } = fixture(false);
  const host = createSharedWebGL2Host({ canvas, enableEffects: true });
  try {
    const ready = host.start();
    assert.equal(host.whenReady(), ready);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(host.getSessionStatus().state, 'starting');
    assert.equal(calls.filter(call => call === 'link').length, 1);
    await ready;
    assert.equal(calls.filter(call => call === 'link').length, 8);
    assert.equal(host.getSessionStatus().state, 'ready');
  } finally {
    await host.close();
  }
});

test('closing a host while KHR is pending retires the generation without link status queries', async () => {
  const { canvas, calls } = fixture(true);
  const host = createSharedWebGL2Host({ canvas, enableEffects: true });
  const ready = host.start();
  const rejected = assert.rejects(ready, { code: 'WEBGL2_CLOSED' });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.filter(call => call === 'link').length, 8);
  assert(calls.includes('completion'));
  await host.close();
  await rejected;
  assert(!calls.includes('linkStatus'));
  assert.equal(calls.filter(call => call === 'deleteShader').length, 16);
  assert.equal(calls.filter(call => call === 'deleteProgram').length, 8);
});
