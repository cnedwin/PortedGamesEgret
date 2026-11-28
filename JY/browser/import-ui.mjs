import { play } from '@egret/engine/play';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createRpgFrontEnd } from '../web/jyx2/ui/native/front-end.mjs';
import { createShellWords } from '../web/jyx2/ui/native/words.mjs';
import { palette, skin, recommendedPlay } from '../web/jyx2/ui/native/theme.mjs';
import { titleBranding as branding, titleHelpSections, titleArt } from "../web/jyx2/ui/native/branding.mjs";
import { readPreferences, writePreferences, visualOptions } from '../web/jyx2/ui/native/preferences.mjs';
import { downloadHostedPack, findHostedPack } from './hosted-pack.mjs';
import { importGamePack, openPackStore } from './pack-import.mjs';
import { createPreparationController } from './preparation-controller.mjs';

const holder = document.querySelector('#native-title-holder');
const starting = document.querySelector('#native-starting');
const archive = document.querySelector('#jy-archive');
const folder = document.querySelector('#jy-folder');
const preferences = readPreferences();
const requestedLanguage = new URLSearchParams(location.search).get('lang');
if (requestedLanguage === 'en' || requestedLanguage === 'zh') preferences.language = requestedLanguage;
const words = createShellWords({ language: preferences.language });
document.documentElement.lang = words.language === 'en' ? 'en' : 'zh-Hant';
const semantics = createUiSemantics();
const tr = (zh, en) => words.language === 'en' ? en : zh;
let game, front, projection, completedPack, activePreparation, picking = false, navigating = false;
let dataError = '';
let titleTextReady = false, titleReady = false, checkingFrame = false;
// The shared verification tool must not mistake canvas allocation for a usable title.
globalThis.egretGame = Object.freeze({ get ready() { return titleReady; } });

async function checkPack(store) {
  const { createPackData } = await import('./pack-data.mjs');
  const pack = await createPackData(store);
  pack.dispose?.();
}

function prepare(source, signal, report) {
  const options = { signal, onProgress: progress => report(progress.phase === 'complete' ? { phase: 'initializing' } : progress), validate: checkPack };
  const preparePack = async () => {
    let input = source;
    if (!input) {
      // Recheck storage after acquiring the cross-tab lock; do not replace an active generation until validated.
      const cached = await openPackStore();
      if (cached) return cached;
      const hosted = await findHostedPack(signal);
      if (!hosted) throw Error('站點未提供線上資料，請從本機匯入。');
      input = await downloadHostedPack(hosted, options);
    }
    const pack = await importGamePack(input, options);
    navigator.serviceWorker.controller?.postMessage({ type: 'pack-replaced' });
    return pack;
  };
  return navigator.locks ? navigator.locks.request('ported-games-egret:jy:prepare', { signal }, preparePack) : preparePack();
}

async function readyWorker(registration, signal) {
  const pending = registration.installing ?? registration.waiting;
  const subscription = new AbortController();
  const updated = pending && new Promise((resolve, reject) => {
    function checkState() {
      if (pending.state === 'activated') resolve();
      else if (pending.state === 'redundant') reject(Error('遊戲服務啟動失敗。'));
    }
    pending.addEventListener('statechange', checkState, { signal: subscription.signal });
    checkState();
  });
  let timer;
  try {
    await Promise.race([
      Promise.all([navigator.serviceWorker.ready, updated]),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('遊戲服務啟動逾時。')), 12000); }),
      new Promise((_, reject) => {
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true, signal: subscription.signal });
      })
    ]);
  } finally {
    clearTimeout(timer);
    subscription.abort();
  }
}

const controller = createPreparationController({
  changed(state) {
    if (state.error) dataError = state.error;
    else if (state.phase !== 'error') dataError = '';
    front?.refresh();
  },
  async prepare({ source, signal, report }) {
    if (!('serviceWorker' in navigator) || !globalThis.indexedDB || !globalThis.isSecureContext) {
      throw Error('請透過 HTTPS 與支援本機儲存的瀏覽器開啟遊戲。');
    }
    const worker = new URL('../browser-sw.mjs', import.meta.url);
    const registration = navigator.serviceWorker.register(worker, { type: 'module', updateViaCache: 'none' });
    void registration.catch(() => {});
    const pack = await prepare(source, signal, report);
    signal.throwIfAborted();
    report({ phase: 'worker' });
    await readyWorker(await registration, signal);
    signal.throwIfAborted();
    return pack;
  }
});

function continueToRuntime() {
  if (!completedPack || picking || navigating || !front) return;
  const snapshot = front.stack.snapshot();
  // Do not close settings, guide, or a native file picker while the background work completes.
  if (snapshot.modal || snapshot.waiting.length) return;
  navigating = true;
  const target = new URL('../play/', import.meta.url);
  target.search = location.search;
  if (!['title', 'preview', 'play'].some(key => target.searchParams.has(key))) target.searchParams.set('title', '1');
  target.searchParams.set('pack', completedPack.id);
  location.replace(target);
}

async function startPreparation(source) {
  if (activePreparation) return false;
  completedPack = undefined;
  const pending = controller.start(source);
  activePreparation = pending;
  try {
    const pack = await pending;
    if (pack) { completedPack = pack; continueToRuntime(); }
    return Boolean(pack);
  } finally {
    if (activePreparation === pending) activePreparation = undefined;
    archive.value = folder.value = '';
    front?.refresh();
  }
}

function selectLocal(input, context) {
  // A valid browser's chooser must be entered while the real activation is still live.
  picking = true;
  controller.cancel();
  input.click();
  context.close();
}

for (const input of [archive, folder]) {
  input.addEventListener('cancel', () => { picking = false; continueToRuntime(); });
  input.addEventListener('change', async () => {
    const source = input === archive ? input.files[0] : Array.from(input.files);
    picking = false;
    if (!source || (Array.isArray(source) && !source.length)) return;
    if (activePreparation) await activePreparation;
    void startPreparation(source);
  });
}

function dataScreen() {
  const heading = tr('遊戲資料', 'Game data');
  return {
    id: 'boot-data', layer: 'modal', open(context) {
      const button = (name, text, color = palette.jade) => ({ type: 'button', name, text, color, width: 'fill', height: 76, size: 20 });
      const children = [
        { type: 'text', text: heading, width: 'fill', height: 42, bold: true, color: palette.gold, size: 25 },
        { type: 'text', name: 'message', text: tr('選擇合法持有的資料檔案。', 'Select a game data file you are entitled to use.'), width: 'fill', height: 64, size: 18 },
        button('archive', tr('選擇資料壓縮包', 'Choose data archive')),
        ...('webkitdirectory' in folder ? [button('folder', tr('選擇資料資料夾', 'Choose data folder'))] : []),
        button('back', tr('返回', 'Back'), palette.card)
      ];
      const view = game.show({ label: heading, modal: true, area: 'safe', skin,
        root: { type: 'panel', anchor: 'center', width: '90%', height: 'fill', layout: 'column',
          padding: 18, gap: 10, card: true, children } }, {
        state: () => controller.state, gamepad: true, initialFocus: 'back', dismiss: () => context.close(), bind: {
          message: { text: () => dataError || tr('選擇合法持有的資料檔案。', 'Select a game data file you are entitled to use.') },
          archive: { tap: () => selectLocal(archive, context) },
          ...('webkitdirectory' in folder ? { folder: { tap: () => selectLocal(folder, context) } } : {}),
          back: { tap: () => context.close() }
        }
      });
      return view;
    }
  };
}

async function boot() {
  game = await play({ ...recommendedPlay, parent: holder, background: palette.night, audio: false, semantics,
    onFrameTiming(sample) {
      if (!titleTextReady || titleReady || checkingFrame || sample.outcome !== 'submitted') return;
      checkingFrame = true;
      void game.browser.host.whenIdle().then(() => requestAnimationFrame(() => {
        titleReady = true;
        starting.hidden = true;
      }), () => { checkingFrame = false; });
    },
    setup(runtime) {
      game = runtime;
      front = createRpgFrontEnd(runtime, {
        state: () => ({ preparation: controller.state, preferences, canContinue: false }), words, branding,
        art: titleArt, helpSections: titleHelpSections,
        visualOptions, onError: error => { dataError = String(error?.message ?? error); },
        actions: {
          applySettings(next) {
            Object.assign(preferences, next);
            const saved = writePreferences(preferences);
            document.documentElement.lang = preferences.language === 'en' ? 'en' : 'zh-Hant';
            const url = new URL(location.href);
            if (url.searchParams.has('lang') && url.searchParams.get('lang') !== preferences.language) {
              url.searchParams.delete('lang');
              history.replaceState(history.state, '', url);
            }
            return { persisted: saved };
          },
          openData: () => front.stack.open(dataScreen()).finally(() => {
            // The screen stack reactivates the title after the modal closes.
            // Restore the named opener once it is eligible again.
            front.getView('title')?.focus('data');
          }),
          retryPreparation: () => startPreparation(),
          cancelPreparation: () => controller.cancel(),
          newGame: () => { continueToRuntime(); },
          continueGame: () => { continueToRuntime(); }
        }
      });
      front.stack.onChange(continueToRuntime);
      void front.openTitle();
      projection = createBrowserSemantics({ semantics, canvas: runtime.canvas,
        width: runtime.browser.frame.width, height: runtime.browser.frame.height, label: branding.name[words.language] });
      const stop = runtime.browser.onScreenChange(() => projection.sync(runtime.browser.frame));
      runtime.scope.use({ dispose() { stop(); projection.dispose(); void front.dispose(); controller.cancel(); } });
      if (new URLSearchParams(location.search).get('qa') === '1') {
        globalThis.__jyNativeQa = { semantics, game: runtime, front, preparation: () => controller.state };
      }
    }
  });
  // Observe the actual text raster, then an accepted frame. No fixed startup sleep is used.
  void (async () => {
    while (!titleTextReady) {
      const view = front.getView('title');
      if (view) {
        try {
          await Promise.all(['title-name', 'settings', 'help'].map(name => view.textReady(name)));
          titleTextReady = true;
          game.invalidate();
          break;
        } catch { /* A superseded text revision is retried with the current view. */ }
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  })();
  // Large data transfer is independent of title raster preparation and the Play setup promise.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  void startPreparation();
}

void boot().catch(error => {
  starting.hidden = false;
  starting.textContent = tr('遊戲介面無法啟動。請重新載入。', 'The game interface could not start. Please reload.') + ' ' + String(error?.message ?? error);
});
