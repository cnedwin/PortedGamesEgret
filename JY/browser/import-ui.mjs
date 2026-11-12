import { downloadHostedPack, findHostedPack } from './hosted-pack.mjs';
import { importGamePack, openPackStore } from './pack-import.mjs';

const archive = document.querySelector('#jy-archive');
const folder = document.querySelector('#jy-folder');
const chooseArchive = document.querySelector('#jy-choose-archive');
const chooseFolder = document.querySelector('#jy-choose-folder');
const localImport = document.querySelector('#jy-local-import');
const play = document.querySelector('#jy-play-full');
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
let current;
let hosted;
let job;
let launching = false;

function syncControls() {
  const busy = Boolean(job) || launching;
  chooseArchive.disabled = chooseFolder.disabled = play.disabled = busy;
  play.hidden = !current && !hosted;
  cancel.hidden = !job || launching;
  progress.hidden = !job || launching;
}

function report({ phase, done, total }) {
  const numbered = Number.isFinite(done) && Number.isFinite(total) && total > 0;
  if (numbered) {
    progress.max = total;
    progress.value = done;
  } else {
    progress.removeAttribute('value');
  }
  const message = phases[phase];
  if (!message) return;
  const counts = phase === 'downloading' ? Math.floor(done * 100 / total) + '%' : done + ' / ' + total;
  const next = numbered ? message + ' ' + counts : message;
  if (status.textContent !== next) status.textContent = next;
}

async function checkPack(store) {
  const { createPackData } = await import('./pack-data.mjs');
  const pack = await createPackData(store);
  pack.dispose?.();
}

async function load(source, useHosted = false) {
  if ((!source && !useHosted) || job || launching) return;
  const controller = new AbortController();
  job = controller;
  status.textContent = phases[useHosted ? 'downloading' : 'reading'];
  progress.removeAttribute('value');
  syncControls();
  const options = { signal: controller.signal, onProgress: report };
  try {
    const input = useHosted ? await downloadHostedPack(hosted, options) : source;
    current = await importGamePack(input, { ...options, validate: checkPack });
    navigator.serviceWorker.controller?.postMessage({ type: 'pack-replaced' });
    if (useHosted) await launch();
    else status.textContent = '4in1 已导入。现在可以进入完整版。';
  } catch (error) {
    status.textContent = controller.signal.aborted ? '已取消。' : '准备游戏数据失败。' + error.message;
    if (useHosted && !controller.signal.aborted) localImport.open = true;
  } finally {
    job = undefined;
    archive.value = folder.value = '';
    syncControls();
  }
}

async function readyWorker(registration) {
  const pending = registration.installing ?? registration.waiting;
  const subscription = new AbortController();
  const updated = pending && new Promise((resolve, reject) => {
    function checkState() {
      if (pending.state === 'activated') resolve();
      else if (pending.state === 'redundant') reject(Error('无法启动游戏，请刷新后重试。'));
    }
    pending.addEventListener('statechange', checkState, { signal: subscription.signal });
    checkState();
  });
  let timer;
  try {
    await Promise.race([
      Promise.all([navigator.serviceWorker.ready, updated]),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('游戏启动等待超时，请刷新后重试。')), 12000); }),
    ]);
  } finally {
    clearTimeout(timer);
    subscription.abort();
  }
}

async function launch() {
  if (!current || launching) return;
  launching = true;
  syncControls();
  status.textContent = '正在启动完整版…';
  try {
    const worker = new URL('../browser-sw.mjs', import.meta.url);
    const registration = await navigator.serviceWorker.register(worker, { type: 'module', updateViaCache: 'none' });
    await readyWorker(registration);
    const target = new URL('../play/', import.meta.url);
    target.searchParams.set('pack', current.id);
    location.assign(target);
  } catch (error) {
    status.textContent = error.message;
    launching = false;
    syncControls();
  }
}

if (!('serviceWorker' in navigator) || !globalThis.indexedDB || !globalThis.isSecureContext) {
  status.textContent = '请在支持本地存储的浏览器中，通过 HTTPS 打开此页。';
  chooseArchive.disabled = chooseFolder.disabled = true;
} else {
  chooseFolder.hidden = !('webkitdirectory' in folder);
  chooseArchive.addEventListener('click', () => archive.click());
  chooseFolder.addEventListener('click', () => folder.click());
  archive.addEventListener('change', () => void load(archive.files[0]));
  folder.addEventListener('change', () => void load(folder.files.length ? Array.from(folder.files) : undefined));
  cancel.addEventListener('click', () => job?.abort());
  play.addEventListener('click', () => { if (current) void launch(); else if (hosted) void load(undefined, true); });

  openPackStore().then(async store => {
    if (store) {
      if (job || current) return;
      current = store;
      localImport.open = false;
      status.textContent = '此浏览器已有 4in1 数据。';
      syncControls();
      return;
    }
    let message = '当前站点未提供在线游戏数据。可从本机导入后进入完整版。';
    try {
      hosted = await findHostedPack();
    } catch (error) {
      message = '暂时无法获取在线游戏数据。可从本机导入后进入完整版。';
      console.warn('JY hosted game data', error);
    }
    if (job || current) return;
    if (hosted) localImport.open = false;
    status.textContent = hosted ? '首次进入将下载原版数据，之后可直接继续。' : message;
    syncControls();
  }).catch(() => { status.textContent = '浏览器存储不可用，请检查隐私或储存设置。'; });
}
