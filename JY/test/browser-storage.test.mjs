import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStoredBlob, writePackBatch } from '../browser/pack-storage.mjs';

// Model an IndexedDB transaction's request-error and abort order. WebKit may
// expose the request's error while the transaction's error is still null.
function fakeDb({ blobFailure } = {}) {
  const commits = [], attempts = [];
  return { commits, attempts, transaction(name, mode) {
    assert.equal(name, 'files'); assert.equal(mode, 'readwrite');
    const rows = [], tx = { error: null, objectStore: () => ({ add: row => rows.push(row) }) };
    let aborted = false;
    tx.abort = () => { aborted = true; queueMicrotask(() => tx.onabort?.()); };
    queueMicrotask(() => {
      if (aborted) return;
      attempts.push(rows);
      if (blobFailure && rows.some(row => row.blob)) {
        const error = new DOMException('Cannot store Blob', blobFailure);
        tx.onerror?.({ target: { error } });
        // Crucial: real WebKit initially reports null tx.error.
        tx.onabort?.();
      } else {
        commits.push(...rows); tx.oncomplete?.();
      }
    });
    return tx;
  } };
}
const batch = [ { path: 'resource/a', blob: new Blob([Uint8Array.of(1,2,3)], {type:'application/octet-stream'}) }, { path: 'resource/b', blob: new Blob(['hi']) } ];

test('write failure on Blob is atomically retried with bytes and later batches use the same format', async () => {
  const db = fakeDb({blobFailure:'UnknownError'});
  let encoding = await writePackBatch(db,'pack',batch);
  assert.equal(encoding,'bytes');
  assert.equal(db.attempts.length,2);
  assert.equal(db.commits.length,2);
  assert.deepEqual(new Uint8Array(await readStoredBlob(db.commits[0]).arrayBuffer()),Uint8Array.of(1,2,3));
  assert.equal(readStoredBlob(db.commits[0]).type,'application/octet-stream');
  encoding = await writePackBatch(db,'next',batch,encoding);
  assert.equal(encoding,'bytes'); assert.equal(db.attempts.length,3);
  assert.ok(db.commits.every(row => row.bytes instanceof ArrayBuffer));
});

test('normal Blob storage stays intact and old rows are read unchanged', async () => {
  const db = fakeDb();
  assert.equal(await writePackBatch(db,'pack',batch),'blob');
  assert.equal(db.attempts.length,1);
  assert.equal(readStoredBlob(db.commits[0]),batch[0].blob);
  assert.equal(readStoredBlob(undefined),undefined);
});

test('quota/constraint errors are not retried as if they were Blob incompatibility', async () => {
  for (const name of ['QuotaExceededError','ConstraintError']) {
    const db = fakeDb({blobFailure:name});
    await assert.rejects(writePackBatch(db,'pack',batch),{name});
    assert.equal(db.attempts.length,1); assert.equal(db.commits.length,0);
  }
});
