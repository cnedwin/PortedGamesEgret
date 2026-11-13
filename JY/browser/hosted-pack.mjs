import { maxArchiveBytes } from './pack-format.mjs';

const manifestUrl = new URL('../data/full-game.json', import.meta.url);
const requestOptions = { credentials: 'omit', redirect: 'error' };

export async function findHostedPack(signal) {
  const timeout = AbortSignal.timeout(8000);
  const response = await fetch(manifestUrl, {
    ...requestOptions, cache: 'no-cache', signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (response.status === 404) return;
  if (!response.ok) throw Error('暂时无法获取在线游戏数据。');

  const { version, enabled, archive, bytes } = (await response.json()) ?? {};
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
}

export async function downloadHostedPack({ url, bytes }, { signal, onProgress }) {
  const response = await fetch(url, { ...requestOptions, cache: 'no-store', signal });
  if (!response.ok || !response.body) throw Error('暂时无法下载在线游戏数据。');

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  try {
    onProgress({ phase: 'downloading', done: received, total: bytes });
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
