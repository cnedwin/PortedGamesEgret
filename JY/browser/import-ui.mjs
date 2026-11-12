import { importGamePack, openPackStore } from './pack-import.mjs';

const archive = document.querySelector('#jy-archive');
const folder = document.querySelector('#jy-folder');
const chooseArchive = document.querySelector('#jy-choose-archive');
const chooseFolder = document.querySelector('#jy-choose-folder');
const play = document.querySelector('#jy-play-full');
const cancel = document.querySelector('#jy-cancel-import');
const status = document.querySelector('#jy-import-status');
const progress = document.querySelector('#jy-import-progress');
const phases = {
  reading: '正在读取文件…',
  extracting: '正在解压原作数据…',
  saving: '正在保存到当前浏览器…',
  validating: '正在检查游戏数据…',
  complete: '4in1 已导入。',
};
let current;
let job;

function syncControls() {
  chooseArchive.disabled = Boolean(job);
  chooseFolder.disabled = Boolean(job);
  play.hidden = !current;
  play.disabled = Boolean(job);
  cancel.hidden = !job;
  progress.hidden = !job;
}

function report(update) {
  const message = phases[update.phase];
  const numbered = Number.isFinite(update.done) && Number.isFinite(update.total) && update.total > 0;
  if (numbered) {
    progress.max = update.total;
    progress.value = update.done;
  } else {
    progress.removeAttribute('value');
  }
  if (message) {
    const next = numbered ? message + ' ' + update.done + ' / ' + update.total : message;
    if (status.textContent !== next) status.textContent = next;
  }
}

async function checkPack(store) {
  const { createPackData } = await import('./pack-data.mjs');
  const pack = await createPackData(store);
  pack.dispose?.();
}

async function load(source) {
  if (!source || job) return;
  const controller = new AbortController();
  job = controller;
  status.textContent = phases.reading;
  progress.removeAttribute('value');
  syncControls();
  try {
    current = await importGamePack(source, { onProgress: report, signal: controller.signal, validate: checkPack });
    navigator.serviceWorker.controller?.postMessage({ type: 'pack-replaced' });
    status.textContent = '4in1 已导入。现在可以进入完整版。';
  } catch (error) {
    status.textContent = controller.signal.aborted ? '导入已取消。' : '导入失败。' + error.message;
  } finally {
    job = undefined;
    archive.value = folder.value = '';
    syncControls();
  }
}

async function launch() {
  if (!current || job) return;
  play.disabled = chooseArchive.disabled = chooseFolder.disabled = true;
  status.textContent = '正在启动完整版…';
  try {
    const worker = new URL('../browser-sw.mjs', import.meta.url);
    await navigator.serviceWorker.register(worker, { type: 'module', updateViaCache: 'none' });
    let timer;
    try {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => { timer = setTimeout(() => reject(Error('游戏启动等待超时，请刷新后重试。')), 12000); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    const target = new URL('../play/', import.meta.url);
    target.searchParams.set('pack', current.id);
    location.assign(target);
  } catch (error) {
    status.textContent = error.message;
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
  play.addEventListener('click', () => void launch());
  openPackStore().then(store => {
    if (job) return;
    current = store;
    if (store) status.textContent = '此浏览器已有 4in1 数据。';
    syncControls();
  }).catch(() => { status.textContent = '浏览器存储不可用，请检查隐私或储存设置。'; });
}
