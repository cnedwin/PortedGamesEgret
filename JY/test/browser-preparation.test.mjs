import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreparationController } from '../browser/preparation-controller.mjs';

test('preparation is a single cancellable job with independently visible progress', async () => {
  let finish;
  const seen = [];
  const controller = createPreparationController({
    prepare: ({ signal, report }) => new Promise((resolve, reject) => {
      finish = resolve;
      report({ phase: 'downloading', done: 7, total: 10 });
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
    changed: state => seen.push(state.phase)
  });
  const running = controller.start();
  assert.deepEqual(controller.state, { phase: 'downloading', done: 7, total: 10 });
  assert.equal(await controller.start(), false);
  controller.cancel();
  assert.equal(await running, false);
  assert.equal(controller.state.phase, 'cancelled');
  finish({ id: 'late' });
  const retry = controller.start('local file');
  finish({ id: 'ready' });
  assert.deepEqual(await retry, { id: 'ready' });
  assert.equal(controller.state.phase, 'ready');
  assert(seen.includes('cancelled'));
});

test('preparation failure can be retried and completion does not conceal a failure', async () => {
  let calls = 0;
  const controller = createPreparationController({ prepare: async ({ report }) => {
    if (++calls === 1) throw Error('file unavailable');
    report({ phase: 'validating' });
    return { id: 'ok' };
  } });
  assert.equal(await controller.start(), false);
  assert.equal(controller.state.phase, 'error');
  assert.match(controller.state.error, /file unavailable/);
  assert.deepEqual(await controller.start(), { id: 'ok' });
  assert.equal(controller.state.phase, 'ready');
});
