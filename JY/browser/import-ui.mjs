import { downloadHostedPack, findHostedPack } from './hosted-pack.mjs';
import { importGamePack, openPackStore } from './pack-import.mjs';

const archive = document.querySelector('#jy-archive');
const folder = document.querySelector('#jy-folder');
const chooseArchive = document.querySelector('#jy-choose-archive');
const chooseFolder = document.querySelector('#jy-choose-folder');
const localImport = document.querySelector('#jy-local-import');
const retry = document.querySelector('#jy-retry');
const cancel = document.querySelector('#jy-cancel-import');
const status = document.querySelector('#jy-import-status');
const progress = document.querySelector('#jy-import-progress');
const phases = {
  downloading: '正在下载游戏数据…',
  reading: '正在读取文件…',
  extracting: '正在解压原作数据…',
  saving: '正在保存到当前浏览器…',
  validating: '正在检查游戏数据…',
  complete: '游戏数据已就绪。',
};
let job;

function report({ phase, done, total }) {
  const message = phases[phase];
  if (!message) return;
  const numbered = Number.isFinite(done) && Number.isFinite(total) && total > 0;
  if (numbered) {
    progress.max = total;
    progress.value = done;
  } else {
    progress.removeAttribute('value');
  }
  const counts = phase === 'downloading' ? Math.floor(done * 100 / total) + '%' : done + ' / ' + total;
  const next = numbered ? message + ' ' + counts : message;
  if (status.textContent !== next) status.textContent = next;
}

async function checkPack(store) {
  const { createPackData } = await import('./pack-data.mjs');
  const pack = await createPackData(store);
  pack.dispose?.();
}

function prepare(source, signal) {
  const options = { signal, onProgress: report, validate: checkPack };
  const preparePack = async () => {
    let input = source;
    if (!input) {
      // Two fresh tabs can start together. Recheck storage after entering the lock.
      const cached = await openPackStore();
      if (cached) return cached;
      const hosted = await findHostedPack(signal);
      if (!hosted) throw Error('站点未提供在线游戏数据，请从本机导入。');
      input = await downloadHostedPack(hosted, options);
    }
    const pack = await importGamePack(input, options);
    navigator.serviceWorker.controller?.postMessage({ type: 'pack-replaced' });
    return pack;
  };
  return navigator.locks
    ? navigator.locks.request('ported-games-egret:jy:prepare', { signal }, preparePack)
    : preparePack();
}

async function readyWorker(registration) {
  const pending = registration.installing ?? registration.waiting;
  const subscription = new AbortController();
  const updated = pending && new Promise((resolve, reject) => {
    function checkState() {
      if (pending.state === 'activated') resolve();
      else if (pending.state === 'redundant') reject(Error('游戏组件启动失败。'));
    }
    pending.addEventListener('statechange', checkState, { signal: subscription.signal });
    checkState();
  });
  let timer;
  try {
    await Promise.race([
      Promise.all([navigator.serviceWorker.ready, updated]),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('游戏组件启动超时。')), 12000); }),
    ]);
  } finally {
    clearTimeout(timer);
    subscription.abort();
  }
}

function showRecovery(message) {
  status.textContent = message;
  progress.hidden = true;
  cancel.hidden = true;
  retry.hidden = false;
  localImport.hidden = false;
}

async function start(source) {
  if (job) return;
  const controller = new AbortController();
  const { signal } = controller;
  job = controller;
  retry.disabled = chooseArchive.disabled = chooseFolder.disabled = true;
  retry.hidden = localImport.hidden = true;
  cancel.hidden = progress.hidden = false;
  report({ phase: source ? 'reading' : 'validating' });
  try {
    const pack = await prepare(source, signal);
    signal.throwIfAborted();
    status.textContent = '正在启动游戏…';
    progress.removeAttribute('value');
    cancel.hidden = true;
    const worker = new URL('../browser-sw.mjs', import.meta.url);
    const registration = await navigator.serviceWorker.register(worker, { type: 'module', updateViaCache: 'none' });
    await readyWorker(registration);
    const target = new URL('../play/', import.meta.url);
    target.search = location.search;
    if (!['title', 'preview', 'play'].some(key => target.searchParams.has(key))) target.searchParams.set('title', '1');
    target.searchParams.set('pack', pack.id);
    location.replace(target);
  } catch (error) {
    showRecovery(signal.aborted ? '已取消游戏数据准备。' : '准备游戏失败。' + error.message);
  } finally {
    job = undefined;
    archive.value = folder.value = '';
    retry.disabled = chooseArchive.disabled = chooseFolder.disabled = false;
  }
}

if (!('serviceWorker' in navigator) || !globalThis.indexedDB || !globalThis.isSecureContext) {
  status.textContent = '请在支持本地存储的浏览器中，通过 HTTPS 打开此页。';
  progress.hidden = true;
} else {
  chooseFolder.hidden = !('webkitdirectory' in folder);
  chooseArchive.addEventListener('click', () => archive.click());
  chooseFolder.addEventListener('click', () => folder.click());
  archive.addEventListener('change', () => { if (archive.files[0]) void start(archive.files[0]); });
  folder.addEventListener('change', () => { if (folder.files.length) void start(Array.from(folder.files)); });
  cancel.addEventListener('click', () => job?.abort());
  retry.addEventListener('click', () => void start());
  void start();
}
