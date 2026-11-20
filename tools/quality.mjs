#!/usr/bin/env node
// 品质验收：按 docs/QUALITY-CHECKLIST.md 在无头 Chromium 里实测一个游戏的自动项，写进它的 QUALITY.md。
//   node tools/quality.mjs <游戏目录> [--no-write] [--json]
// 真机项（真手机帧时间、真机触屏走完全程等）不在这里跑，QUALITY.md 里写「未运行」。
// 退出码：自动项有不达标时为 1。
//
// Quality acceptance: measures the automatic items of docs/QUALITY-CHECKLIST.md for one game in headless Chromium and
// writes them into its QUALITY.md. Items that need a real device are not run here and are written as not run.
// The exit code is 1 when an automatic item fails.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ROOT, launch, openPage, serve } from './lib/browser.mjs';
import { noteQualityInReadme } from './lib/quality-readme.mjs';

const args = process.argv.slice(2);
const folderArg = args.find((a) => !a.startsWith('-'));
if (!folderArg) {
  console.error('用法 · Usage: node tools/quality.mjs <game folder> [--no-write] [--json]');
  process.exit(2);
}
const GAME = resolve(process.cwd(), folderArg),
  path = relative(ROOT, GAME).split('\\').join('/');
if (!existsSync(join(GAME, 'index.html'))) {
  console.error(`${path}/index.html 不存在 · not found`);
  process.exit(2);
}

/** The network and processor of the start-up measurement: a mid-range phone on 4G. */
export const START = { download: 10e6 / 8, upload: 5e6 / 8, latency: 40, cpu: 4, target: 3000 };
/** Frame-time targets, milliseconds at the 95th percentile. */
export const FRAME = { desktop: 16.7, phone: 33.3, seconds: 4 };
const SIZES = [
  [1280, 800, false],
  [390, 844, true],
  [844, 390, true],
  [768, 1024, true]
];

const PASS = 'pass',
  FAIL = 'fail',
  NA = 'n/a',
  NOT_RUN = 'not run';
const results = new Map();
const record = (id, result, value = '') => results.set(id, { result, value: String(value) });

/** Wait for the game: `window.egretGame.ready` when it says so, otherwise the load event and a drawn canvas. */
async function settle(page, seconds = 60) {
  const start = Date.now();
  await page.waitForLoadState('load', { timeout: seconds * 1000 }).catch(() => {});
  while (Date.now() - start < seconds * 1000) {
    const state = await page
      .evaluate(() => {
        const game = window.egretGame;
        if (game && 'ready' in game) return game.ready ? 'ready' : 'waiting';
        const canvas = [...document.querySelectorAll('canvas')].find((c) => c.width > 0 && c.getBoundingClientRect().width > 0);
        if (canvas) return 'canvas';
        // A title made of page elements: a visible button or link to press.
        const control = [...document.querySelectorAll('button, [role=button], a[href]')].find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden';
        });
        return document.readyState === 'complete' && control ? 'canvas' : 'waiting';
      })
      .catch(() => 'waiting');
    if (state === 'ready') return Date.now() - start;
    if (state === 'canvas') {
      await page.waitForTimeout(1500);
      return Date.now() - start;
    }
    await page.waitForTimeout(100);
  }
  return null;
}

const url = (query = '') => `${server.url}${path}/${query}`;

/** Keys of the browser storage the game uses: what it wrote, and the keys its code names. */
function storageKeysInCode() {
  const keys = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['vendor', 'node_modules', 'test', 'tests', 'tools', 'media', 'assets'].includes(entry.name) || entry.name.startsWith('.')) continue;
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.m?js$/.test(entry.name)) {
        const text = readFileSync(file, 'utf8');
        for (const [, key] of text.matchAll(/localStorage\.(?:get|set)Item\(\s*['"]([^'"]+)['"]/g)) keys.add(key);
        for (const [, key] of text.matchAll(/(?:SAVE_KEY|STORAGE_KEY|SAVE_NAME)\s*=\s*['"]([^'"]+)['"]/g)) keys.add(key);
        if (/createSaveStore/.test(text)) for (const [, key] of text.matchAll(/\bkey:\s*['"]([^'"]+)['"]/g)) keys.add(key);
      }
    }
  };
  walk(GAME);
  return keys;
}

const sourceText = (() => {
  let all = '';
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (['vendor', 'node_modules', 'test', 'tests', 'tools', 'media', 'assets'].includes(entry.name) || entry.name.startsWith('.')) continue;
      const file = join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:m?js|css|html)$/.test(entry.name)) all += readFileSync(file, 'utf8') + '\n';
    }
  };
  walk(GAME);
  return all;
})();

const server = await serve(),
  browser = await launch();
const version = browser.version();
try {
  // E1 · a clean console on opening and a few seconds of standing.
  {
    const page = await openPage(browser, url(), { width: 1280, height: 800, reducedMotion: false });
    const took = await settle(page);
    await page.waitForTimeout(3000);
    record('E1', took !== null && page.problems.length === 0 ? PASS : FAIL, took === null ? 'not ready in 60 s' : page.problems.slice(0, 3).join(' | ') || '0 errors');

    // F1 · frame time on this desktop, headless and software-drawn.
    const deltas = await page.evaluate(
      (seconds) =>
        new Promise((done) => {
          const out = [];
          let last = performance.now();
          const end = last + seconds * 1000;
          const tick = (now) => {
            out.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else done(out);
          };
          requestAnimationFrame(tick);
        }),
      FRAME.seconds
    );
    deltas.sort((a, b) => a - b);
    const p95 = deltas[Math.floor(deltas.length * 0.95)] ?? Infinity;
    record('F1', p95 <= FRAME.desktop + 0.5 ? PASS : FAIL, `p95 ${p95.toFixed(1)} ms over ${deltas.length} frames`);

    // A2 · the screen reader's view: named buttons and other controls.
    const tree = await page.locator('body').ariaSnapshot().catch(() => '');
    const named = [...tree.matchAll(/- (button|switch|checkbox|slider|link|radio|tab|menuitem|combobox) "([^"]+)"/g)];
    record('A2', named.length > 0 ? PASS : FAIL, named.length ? `${named.length} named controls, e.g. ${named.slice(0, 3).map((m) => `${m[1]} "${m[2]}"`).join(', ')}` : 'no named control in the accessibility tree');

    // A1 · the keyboard reaches a named control, and its focus shows.
    let reached = null;
    for (let i = 0; i < 8 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title');
        if (!name) return null;
        const style = getComputedStyle(el),
          rect = el.getBoundingClientRect();
        // Shown by the element itself, or drawn by the game on its canvas around the semantic node's place.
        const outline = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
        return { name: name.slice(0, 30), outline, size: rect.width * rect.height };
      });
    }
    record('A1', reached ? PASS : FAIL, reached ? `Tab → "${reached.name}"${reached.outline ? ' (outline)' : ' (focus drawn by the game)'}` : 'Tab reached no named control');

    // E3 · hidden and shown again: nothing breaks.
    const before = page.problems.length;
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(1500);
    const listens = /visibilitychange|document\.hidden|visibilityState/.test(sourceText) || /createBrowserGame/.test(sourceText);
    record('E3', page.problems.length === before && listens ? PASS : FAIL, page.problems.length !== before ? page.problems.slice(before, before + 2).join(' | ') : listens ? 'no errors; the game or the engine loop watches visibility' : 'nothing in the game watches visibility');

    // S keys · what the game wrote while standing open.
    const written = await page.evaluate(() => Object.keys(localStorage));
    globalThis.__keys = new Set([...written, ...storageKeysInCode()]);
    await page.context().close();
  }

  // T2, T3, I3 · a phone held upright, touch on.
  {
    const page = await openPage(browser, url('?lang=en'), { width: 390, height: 844, touch: true });
    await settle(page);
    const touch = await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect(),
          s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
      };
      const controls = [...document.querySelectorAll('button, a[href], [role=button], [role=switch], [role=checkbox], [role=slider], [role=tab], input, select, textarea')].filter(visible);
      const small = controls
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 44 - 0.5 || r.height < 44 - 0.5)
        .map(({ el, r }) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 16)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      const root = getComputedStyle(document.documentElement),
        body = getComputedStyle(document.body);
      const overscroll = [root.overscrollBehaviorY, body.overscrollBehaviorY].some((v) => v === 'none' || v === 'contain') || (body.overflow === 'hidden' && root.overflow === 'hidden');
      const target = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      let action = 'auto';
      for (let el = target; el; el = el.parentElement) {
        const value = getComputedStyle(el).touchAction;
        if (value && value !== 'auto') {
          action = value;
          break;
        }
      }
      const meta = document.querySelector('meta[name=viewport]')?.content ?? '';
      const noZoom = /none|manipulation|pinch-zoom/.test(action) || /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(meta);
      // Words cut off: an element whose text is wider than its box, its overflow hidden or spilling.
      const cut = [...document.querySelectorAll('body *')]
        .filter((el) => el.children.length === 0 && el.textContent.trim() && visible(el) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto' && getComputedStyle(el).overflowX !== 'scroll' && el.clientWidth > 0)
        .map((el) => el.textContent.trim().slice(0, 24));
      return { count: controls.length, small, overscroll, action, noZoom, cut, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    record('T2', touch.count === 0 ? NA : touch.small.length === 0 ? PASS : FAIL, touch.count === 0 ? 'no page controls; the canvas is measured by hand' : touch.small.length ? `${touch.small.length} of ${touch.count} under 44×44: ${touch.small.slice(0, 4).join('; ')}` : `${touch.count} controls, all at least 44×44`);
    record('T3', touch.overscroll && touch.noZoom ? PASS : FAIL, `overscroll ${touch.overscroll ? 'held' : 'free'}, touch-action ${touch.action}, double-tap zoom ${touch.noZoom ? 'off' : 'on'}`);
    record('I3', touch.cut.length === 0 && touch.overflow <= 0 ? PASS : FAIL, touch.cut.length ? `cut off: ${touch.cut.slice(0, 3).join(' | ')}` : touch.overflow > 0 ? `page ${touch.overflow}px too wide` : 'no page text cut off at 390 px in English');

    // I1 · English throughout: no Chinese in page text or accessible names.
    const cjk = await page.evaluate(() => {
      const words = [document.body.innerText, ...[...document.querySelectorAll('[aria-label],[title],[alt]')].map((el) => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('alt')].join(' '))].join(' ');
      return { lang: document.documentElement.lang, hits: [...new Set(words.replace(/中文/g, '').match(/[\u3400-\u9fff]+/g) ?? [])].slice(0, 5) };
    });
    const choosable = /[?&]lang=|lang=en|'en'|"en"/.test(sourceText);
    record('I1', choosable && cjk.hits.length === 0 && cjk.lang.startsWith('en') ? PASS : FAIL, !choosable ? 'no way to choose English found' : `html lang "${cjk.lang}"${cjk.hits.length ? `, Chinese left: ${cjk.hits.join(' ')}` : ', no Chinese in page text or names'}`);
    await page.context().close();
  }

  // O1 · four window sizes, then resized in place.
  {
    const notes = [];
    let ok = true;
    for (const [w, h, touch] of SIZES) {
      const page = await openPage(browser, url(), { width: w, height: h, touch });
      const took = await settle(page);
      const fit = await page.evaluate(() => {
        // The picture: the largest visible canvas, or, for a screen made of page elements, the largest top-level box.
        const boxes = [...document.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
        if (!boxes.length)
          for (let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) boxes.push(r);
          }
        const canvas = boxes.sort((a, b) => b.width * b.height - a.width * a.height)[0];
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          share: canvas ? Math.max(Math.min(canvas.width, innerWidth) / innerWidth, Math.min(canvas.height, innerHeight) / innerHeight) : 0
        };
      });
      const good = took !== null && fit.overflow <= 0 && fit.share >= 0.5 && page.problems.length === 0;
      if (!good) {
        ok = false;
        notes.push(`${w}×${h}: ${took === null ? 'not ready' : fit.overflow > 0 ? `${fit.overflow}px too wide` : fit.share < 0.5 ? 'picture under half the window' : page.problems[0]}`);
      }
      if (w === 1280) {
        for (const [rw, rh] of [[844, 390], [390, 844], [1280, 800]]) {
          await page.setViewportSize({ width: rw, height: rh });
          await page.waitForTimeout(800);
        }
        const after = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (after > 0 || page.problems.length) {
          ok = false;
          notes.push(`resized: ${after > 0 ? `${after}px too wide` : page.problems[0]}`);
        }
      }
      await page.context().close();
    }
    record('O1', ok ? PASS : FAIL, ok ? '1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors' : notes.join('; '));
  }

  // L1 · start-up on a mid-range phone's network and processor.
  {
    const page = await openPage(browser, url(), {
      width: 390,
      height: 844,
      touch: true,
      before: async (page) => {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: START.latency, downloadThroughput: START.download, uploadThroughput: START.upload });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: START.cpu });
      }
    });
    const took = await settle(page, 90);
    const bytes = await page.evaluate(() => performance.getEntriesByType('resource').reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0));
    record('L1', took !== null && took <= START.target ? PASS : FAIL, took === null ? 'not ready in 90 s' : `${(took / 1000).toFixed(1)} s to the first playable screen, ${(bytes / 1e6).toFixed(1)} MB`);
    await page.context().close();
  }

  // S1, S2, S3 · a broken save, a save from a newer version, and storage that refuses.
  {
    const keys = [...(globalThis.__keys ?? new Set())].filter((key) => !/lang$|^egret-demos/.test(key));
    const trial = async (id, value, note) => {
      if (!keys.length) return record(id, NA, 'the game keeps nothing in browser storage');
      const page = await openPage(browser, url(), {
        width: 960,
        height: 540,
        before: (page) => page.addInitScript(([keys, value]) => {
          if (sessionStorage.getItem('quality-planted')) return;
          sessionStorage.setItem('quality-planted', '1');
          for (const key of keys) localStorage.setItem(key, value);
        }, [keys, value])
      });
      const took = await settle(page);
      await page.waitForTimeout(1500);
      const errors = page.problems.filter((p) => p.startsWith('pageerror'));
      record(id, took !== null && errors.length === 0 ? PASS : FAIL, took === null ? 'did not start' : errors.length ? errors[0].slice(0, 160) : `${note}; started without an uncaught error (keys: ${keys.join(', ')})`);
      await page.context().close();
    };
    await trial('S1', '{broken', 'unreadable text');
    await trial('S2', JSON.stringify({ version: 9999, savedAt: 0, data: {} }), 'a save from a newer version');
    const page = await openPage(browser, url(), {
      width: 960,
      height: 540,
      before: (page) =>
        page.addInitScript(() => {
          for (const name of ['localStorage', 'sessionStorage'])
            Object.defineProperty(window, name, { configurable: true, get: () => { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
        })
    });
    const took = await settle(page);
    await page.waitForTimeout(1500);
    const errors = page.problems.filter((p) => p.startsWith('pageerror'));
    record('S3', took !== null && errors.length === 0 ? PASS : FAIL, took === null ? 'did not start with storage refused' : errors.length ? errors[0].slice(0, 160) : 'storage refused: started without an uncaught error');
    await page.context().close();
  }

  // E2 · a file that fails to arrive: no uncaught error, and a way to try again.
  {
    let refused = 0;
    const page = await openPage(browser, url(), {
      width: 960,
      height: 540,
      before: (page) =>
        page.route('**/*', (route) => {
          const request = route.request(),
            kind = request.resourceType(),
            address = request.url();
          const asset = ['image', 'media', 'font'].includes(kind) || ((kind === 'fetch' || kind === 'xhr') && !/\.m?js(\?|$)/.test(address));
          if (asset && address.includes(`/${path}/`) && !/favicon/.test(address)) {
            refused++;
            return route.abort('failed');
          }
          return route.continue();
        })
    });
    await settle(page, 30);
    await page.waitForTimeout(2500);
    const errors = page.problems.filter((p) => p.startsWith('pageerror'));
    const retry = await page.evaluate(() => /重试|再试|重新加载|Retry|Try again|Reload/i.test(document.body.innerText + [...document.querySelectorAll('[aria-label]')].map((el) => el.getAttribute('aria-label')).join(' ')));
    record('E2', refused === 0 ? NA : errors.length === 0 && retry ? PASS : FAIL, refused === 0 ? 'the game loads no image, sound, font or data file' : `${refused} files refused; ${errors.length ? 'uncaught: ' + errors[0].slice(0, 100) : 'no uncaught error'}; ${retry ? 'offers to try again' : 'no error screen with a retry'}`);
    await page.context().close();
  }

  // A3 · reduced motion: the game reads the preference.
  {
    const reads = /prefers-reduced-motion|reducedMotion|reduceMotion/.test(sourceText);
    record('A3', reads ? PASS : FAIL, reads ? 'the code reads prefers-reduced-motion or offers a setting' : 'prefers-reduced-motion is not read');
  }
} finally {
  await browser.close();
  await server.close();
}

// ---- the report ------------------------------------------------------------------------------
export const ITEMS = [
  ['T1', '触屏走完主流程', 'The whole game by touch', 'device'],
  ['T2', '触控区 ≥ 44×44 CSS px', 'Touch targets ≥ 44 × 44 CSS px', 'auto'],
  ['T3', '不误触下拉刷新和双击缩放', 'No pull-to-refresh or double-tap zoom', 'auto'],
  ['F1', '桌面帧时间 p95 ≤ 16.7 ms', 'Desktop frame time p95 ≤ 16.7 ms', 'auto'],
  ['F2', '中端手机帧时间 p95 ≤ 33 ms', 'Mid-range phone frame time p95 ≤ 33 ms', 'device'],
  ['L1', `首屏 ≤ ${START.target / 1000} s（10/5 Mbps、40 ms、CPU ×${START.cpu}）`, `Start-up ≤ ${START.target / 1000} s (10/5 Mbps, 40 ms, CPU ×${START.cpu})`, 'auto'],
  ['O1', '横竖屏与窗口尺寸', 'Orientation and window sizes', 'auto'],
  ['I1', '中英文全可切换，英文下无中文', 'Both languages; no Chinese left in English', 'auto'],
  ['I2', '画布上的字也随语言切换', 'Words drawn on the canvas follow the language', 'manual'],
  ['I3', '长英文不溢出', 'Long English does not overflow', 'auto'],
  ['A1', '键盘可到达控件，焦点可见', 'The keyboard reaches controls; focus shows', 'auto'],
  ['A1m', '只用键盘走完主流程', 'The whole game by keyboard alone', 'manual'],
  ['A2', '读屏读出主要按钮', 'A screen reader names the main buttons', 'auto'],
  ['A3', '尊重 prefers-reduced-motion', 'prefers-reduced-motion is honoured', 'auto'],
  ['S1', '存档损坏不崩溃', 'A broken save does not crash', 'auto'],
  ['S2', '存档版本不匹配不崩溃', 'A save of another version does not crash', 'auto'],
  ['S3', '存储不可用不崩溃', 'Refused storage does not crash', 'auto'],
  ['S4', '存档出问题时提示并可重开', 'A save problem is told and a fresh start offered', 'manual'],
  ['E1', '无控制台错误', 'No console errors', 'auto'],
  ['E2', '资源失败有错误界面和重试', 'A failed file shows an error and a retry', 'auto'],
  ['E3', '切到后台再回来不出错', 'Hidden and shown again without errors', 'auto'],
  ['E4', '切回后声音和计时正常', 'Sound and timers right after coming back', 'device']
];
const WORD = { [PASS]: '达标 · pass', [FAIL]: '不达标 · fail', [NA]: '不适用 · n/a', [NOT_RUN]: '未运行 · not run' };
const HOW = { auto: '自动 · automatic', manual: '人工 · by hand', device: '真机 · device' };
const rows = ITEMS.map(([id, zh, en, how]) => ({ id, zh, en, how, ...(results.get(id) ?? { result: NOT_RUN, value: how === 'auto' ? 'not measured' : '' }) }));
const failed = rows.filter((row) => row.how === 'auto' && row.result === FAIL);
const today = new Date().toISOString().slice(0, 10);

const title = readFileSync(join(GAME, 'README.md'), 'utf8').split('\n')[0].replace(/^#\s*/, '') || path;
const report = [
  `# 品质验收 · Quality — ${title}`,
  '',
  `按 [QUALITY-CHECKLIST.md](${relative(GAME, join(ROOT, 'docs', 'QUALITY-CHECKLIST.md')).split('\\').join('/')}) 验收。自动项由 \`node tools/quality.mjs ${path}\` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。`,
  '',
  `Checked against QUALITY-CHECKLIST.md. The automatic items were measured by \`node tools/quality.mjs ${path}\`, which writes`,
  'this file; items by hand or on a device are marked not run until someone runs them.',
  '',
  '## 测量环境 · Where it was measured',
  '',
  `- 日期 · Date: ${today}`,
  `- 浏览器 · Browser: 无头 Chromium ${version}，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU`,
  `- 机器 · Machine: Linux 容器 · a Linux container, ${process.platform} ${process.arch}, Node ${process.version}`,
  `- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 ${START.latency} ms，CPU 降速 ×${START.cpu} · down 10 Mbps, up 5 Mbps, ${START.latency} ms round trip, CPU slowed ×${START.cpu}`,
  '- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.',
  '',
  '## 结果 · Results',
  '',
  '| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |',
  '|---|---|---|---|---|',
  ...rows.map((row) => `| ${row.id} | ${row.zh} · ${row.en} | ${HOW[row.how]} | ${WORD[row.result]} | ${row.value.replaceAll('|', '/')} |`),
  '',
  `自动项不达标 · Automatic items failing: ${failed.length ? failed.map((row) => row.id).join(', ') : '无 · none'}。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.`,
  ''
].join('\n');

if (args.includes('--json')) console.log(JSON.stringify(rows, null, 2));
else for (const row of rows) console.log(`${row.result === PASS ? 'ok  ' : row.result === FAIL ? 'FAIL' : '--  '} ${row.id.padEnd(4)} ${row.en}: ${row.value}`);
if (!args.includes('--no-write')) {
  // A section of results by hand or on devices, written by a person, is kept as it is.
  const file = join(GAME, 'QUALITY.md'),
    old = existsSync(file) ? readFileSync(file, 'utf8') : '',
    kept = old.indexOf('## 人工与真机结果');
  writeFileSync(file, kept >= 0 ? report + '\n' + old.slice(kept) : report);
  // Failing automatic items go into the README's Known issues (templates/ excepted: its items must all pass).
  if (!path.startsWith('templates/')) noteQualityInReadme(GAME);
  console.log(`写入 · Wrote ${path}/QUALITY.md`);
}
process.exitCode = failed.length ? 1 : 0;
