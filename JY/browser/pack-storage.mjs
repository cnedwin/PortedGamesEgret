// IndexedDB can support byte arrays but refuse Blob/File storage (in some
// WebKit or ephemeral sessions). Keep a single atomic generation; never clear
// the current active pack and never retry a quota or constraint failure.
export function completed(tx) {
  let requestError;
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    // A request error bubbles before tx.error is necessarily populated. Wait
    // for abort so a retry cannot conflict with the first transaction.
    tx.onerror = event => { requestError ??= event.target?.error; };
    tx.onabort = () => reject(tx.error ?? requestError ?? Error('浏览器未能写入原作资源。'));
  });
}

export function readStoredBlob(record) {
  if (record?.blob instanceof Blob) return record.blob;
  if (record?.bytes instanceof ArrayBuffer) return new Blob([record.bytes], { type: record.type ?? '' });
  return undefined;
}

async function writeRecords(db, id, rows, encoding) {
  // Finish asynchronous Blob conversion before starting the transaction:
  // Safari can close a transaction while awaiting arbitrary promises.
  const records = encoding === 'bytes'
    ? await Promise.all(rows.map(async ({ path, blob }) => ({ id, path, bytes: await blob.arrayBuffer(), type: blob.type })))
    : rows.map(({ path, blob }) => ({ id, path, blob }));
  const tx = db.transaction('files', 'readwrite');
  const done = completed(tx);
  try {
    const files = tx.objectStore('files');
    for (const record of records) files.add(record);
  } catch (error) {
    try { tx.abort(); } catch { /* Already finished. */ }
    await done.catch(() => {});
    throw error;
  }
  await done;
}

export async function writePackBatch(db, id, rows, encoding = 'blob') {
  try {
    await writeRecords(db, id, rows, encoding);
    return encoding;
  } catch (error) {
    if (encoding !== 'blob' || !['UnknownError', 'DataCloneError'].includes(error?.name)) throw error;
    await writeRecords(db, id, rows, 'bytes');
    return 'bytes';
  }
}
