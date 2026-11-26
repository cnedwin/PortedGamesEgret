#!/usr/bin/env node
// 无头浏览器探针：把页面跑起来，把控制台里说的话、页面里的值、屏幕上看到的图一起带回来。
//
//   node FivePhases/tools/probe.mjs --url http://127.0.0.1:8123/FivePhases/
//   node FivePhases/tools/probe.mjs --url ... --eval "window.game.stats()" --wait 4000
//
// 参数：
//   --url    要跑的地址（必填）
//   --wait   加载后等多少毫秒再取值，默认 2500
//   --eval   在页面里求值的表达式，结果以 JSON 打出来，可重复
//   --shot   截图存到哪，默认 .feel/probe.png
//   --size   窗口尺寸，默认 750,1624
//   --port   CDP 端口，默认 9333
//   --keep   跑完不关浏览器
//
// 没有依赖：Node 22 自带 WebSocket 与 fetch。

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

function parseArgs(argv) {
  const options = { wait: 2500, size: '750,1624', port: 9333, shot: '.feel/probe.png', eval: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--url') options.url = next();
    else if (arg === '--wait') options.wait = Number(next());
    else if (arg === '--eval') options.eval.push(next());
    else if (arg === '--shot') options.shot = next();
    else if (arg === '--clip') options.clip = next();
    else if (arg === '--size') options.size = next();
    else if (arg === '--port') options.port = Number(next());
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('node FivePhases/tools/probe.mjs --url <地址> [--wait ms] [--eval 表达式] [--shot 路径]');
      process.exit(0);
    } else {
      console.error(`不认识的参数：${arg}`);
      process.exit(2);
    }
  }
  if (!options.url) {
    console.error('缺 --url');
    process.exit(2);
  }
  return options;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) if (existsSync(candidate)) return candidate;
  throw new Error('找不到 Chrome，用 CHROME 环境变量指一个');
}

async function waitForDevtools(port, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {
      /* 还没起来 */
    }
    await sleep(150);
  }
  throw new Error('DevTools 端口没起来');
}

/** 一个最小 CDP 客户端：请求带 id，回来按 id 派发。 */
class Cdp {
  constructor(url) {
    this.next = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', () => resolve());
      this.socket.addEventListener('error', (event) => reject(event.error ?? new Error('WebSocket 出错')));
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(`${waiter.method}: ${message.error.message}`));
        else waiter.resolve(message.result);
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  send(method, params = {}, timeoutMs = 20000) {
    const id = this.next++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} 超时`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.socket.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chrome = findChrome();
  const profile = path.join(process.cwd(), '.feel', 'chrome-profile');

  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--mute-audio',
      '--autoplay-policy=no-user-gesture-required',
      `--remote-debugging-port=${options.port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${options.size}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const logs = [];
  let cdp;
  try {
    const browserUrl = await waitForDevtools(options.port);
    const browser = new Cdp(browserUrl);
    await browser.ready;

    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });

    // 扁平会话：请求都带上 sessionId
    const page = {
      send(method, params = {}, timeoutMs) {
        const id = browser.next++;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            browser.pending.delete(id);
            reject(new Error(`${method} 超时`));
          }, timeoutMs ?? 20000);
          browser.pending.set(id, {
            method,
            resolve: (value) => {
              clearTimeout(timer);
              resolve(value);
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
          });
          browser.socket.send(JSON.stringify({ id, method, params, sessionId }));
        });
      },
    };

    browser.on((message) => {
      if (message.method === 'Runtime.consoleAPICalled') {
        const text = (message.params.args ?? [])
          .map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? arg.type)
          .join(' ');
        logs.push({ kind: message.params.type, text });
      } else if (message.method === 'Runtime.exceptionThrown') {
        const detail = message.params.exceptionDetails;
        logs.push({
          kind: 'exception',
          text: detail.exception?.description ?? detail.text,
          url: detail.url,
          line: detail.lineNumber,
        });
      } else if (message.method === 'Log.entryAdded') {
        logs.push({ kind: `log:${message.params.entry.level}`, text: message.params.entry.text });
      }
    });

    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    // 关掉 HTTP 缓存。探针用的是固定 profile，不关的话改完代码再看截图还是旧的，
    // 这一条能省掉一小时的"为什么没生效"。
    await page.send('Network.enable');
    await page.send('Network.setCacheDisabled', { cacheDisabled: true });
    await page.send('Page.navigate', { url: options.url });
    await sleep(options.wait);

    const results = [];
    for (const expression of options.eval) {
      try {
        const { result, exceptionDetails } = await page.send('Runtime.evaluate', {
          expression,
          returnByValue: true,
          awaitPromise: true,
        });
        results.push(
          exceptionDetails
            ? { expression, error: exceptionDetails.exception?.description ?? exceptionDetails.text }
            : { expression, value: result.value ?? result.description },
        );
      } catch (error) {
        results.push({ expression, error: error.message });
      }
    }

    // --clip x,y,w,h[,scale]：只截一块，并按倍数放大。
    // 看 8 像素高的眼睛、看描边有没有糊，全屏截图缩下来是没用的。
    const clip = options.clip
      ? (() => {
          const [x, y, width, height, scale = 2] = String(options.clip).split(',').map(Number);
          return { x, y, width, height, scale };
        })()
      : undefined;
    const shot = await page.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    await mkdir(path.dirname(options.shot), { recursive: true });
    await writeFile(options.shot, Buffer.from(shot.data, 'base64'));

    const report = { url: options.url, shot: options.shot, logs, results };
    console.log(JSON.stringify(report, null, 2));
    if (!options.keep) browser.close();
  } finally {
    if (!options.keep) child.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
