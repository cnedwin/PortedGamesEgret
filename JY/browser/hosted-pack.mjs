import { maxArchiveBytes } from './pack-format.mjs';

const manifestUrl = new URL('../data/full-game.json', import.meta.url);
const requestOptions = { credentials: 'omit', redirect: 'error' };

export async function findHostedPack(signal) {
  // Keep one ordinary controller alive throughout both the fetch and body read.
  // In WebKit, cancellation of a held manifest was not reliable with an inline composite signal.
  const request = new AbortController();
  const forwardAbort = () => request.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(() => request.abort(new DOMException('Game data request timed out.', 'TimeoutError')), 8000);
  try {
    request.signal.throwIfAborted();
    const response = await fetch(manifestUrl, {
      ...requestOptions, cache: 'no-cache', signal: request.signal,
    });
    request.signal.throwIfAborted();
    if (response.status === 404) return;
    if (!response.ok) throw Error('暂时无法获取在线游戏数据。');

    const { version, enabled, archive, bytes } = (await response.json()) ?? {};
    request.signal.throwIfAborted();
    if (version === 1 && enabled === false) return;
    if (version !== 1 || (enabled !== undefined && enabled !== true) || typeof archive !== 'string' || !archive
      || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > maxArchiveBytes) {
      throw Error('在线游戏数据的配置有误。');
    }
    const url = new URL(archive, manifestUrl);
    const sameOriginHttp = url.protocol === 'http:' && url.origin === manifestUrl.origin;
    if ((url.protocol !== 'https:' && !sameOriginHttp)
      || url.username || url.password || url.hash || !/\.7z$/i.test(url.pathname)) {
      throw Error('在线游戏数据的地址无效。');
    }
    return { url, bytes };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export async function downloadHostedPack({ url, bytes }, { signal, onProgress }) {
  onProgress({ phase: 'downloading', done: 0, total: bytes });
  const response = await fetch(url, { ...requestOptions, cache: 'no-store', signal });
  if (!response.ok || !response.body) throw Error('暂时无法下载在线游戏数据。');

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > bytes) throw Error('下载的文件大小与游戏数据配置不符。');
      chunks.push(value);
      onProgress({ phase: 'downloading', done: received, total: bytes });
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (received !== bytes) throw Error('在线游戏数据下载不完整。');
  return new Blob(chunks, { type: 'application/x-7z-compressed' });
}
