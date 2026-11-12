import { execFile, fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, realpath, rename, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { tar } from './archiver.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const execute = promisify(execFile);
const gameArchiveName = 'kys-cpp-4in1.7z';
const archiveEntries = [
  'game/config', 'game/list', 'game/music', 'game/resource', 'game/save/0.zip',
  'game/script/event-cifa', 'game/sound',
];
const requiredFiles = [
  'config/kysmod.ini', 'save/0.zip', 'script/event-cifa/691.cifa',
  'resource/smap.zip', 'resource/mmap.zip', 'resource/earth.002',
  'resource/war.sta', 'resource/warfld.idx', 'resource/warfld.grp',
];
const help = [
  '用法：node tools/launch.mjs [原作 game 目录或 kys-cpp-4in1.7z] [--port 端口] [--cache 缓存目录] [--vendor 白鹭构建目录] [--no-browser]',
  '启动后在浏览器打开终端显示的本机地址。关闭终端会结束网页 Demo 服务。',
].join('\n');

function options(args) {
  const settings = { port: 4185, cache: join(root, '.kys-cache'), browser: true };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') return { help: true };
    if (argument === '--no-browser') settings.browser = false;
    else if (['--port', '--cache', '--vendor'].includes(argument)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`${argument} 需要参数。`);
      if (argument === '--port') settings.port = Number(value);
      else if (argument === '--cache') settings.cache = resolve(value);
      else settings.vendor = resolve(value);
    } else if (argument.startsWith('-') || settings.source) throw new Error(`未知启动参数：${argument}`);
    else settings.source = resolve(argument);
  }
  if (!Number.isInteger(settings.port) || settings.port < 1 || settings.port > 65535) {
    throw new Error('端口须在 1 到 65535 之间。');
  }
  return settings;
}

async function existing(path) {
  try { return await stat(path); }
  catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function verifyGame(directory) {
  const files = await Promise.all(requiredFiles.map(file => existing(join(directory, file))));
  const missing = requiredFiles.filter((_, index) => !files[index]?.isFile());
  if (missing.length) throw new Error(`这个 game 目录缺少原作文件：${missing.join('、')}\n${directory}`);
  return directory;
}

async function removePrivateFolder(cache, directory) {
  const target = await realpath(directory).catch(error => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });
  if (!target) return;
  const name = relative(await realpath(cache), target);
  if (isAbsolute(name) || name.includes(sep) || !/^(?:session|unpack)-[a-z0-9]+$/i.test(name)) {
    throw new Error(`无法清理这个路径：${target}`);
  }
  await rm(target, { recursive: true, force: true });
}

async function archiveDigest(archive) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(archive)) hash.update(chunk);
  return hash.digest('hex');
}

async function checkArchive(archive) {
  const tarOptions = { windowsHide: true, maxBuffer: 8 * 1024 * 1024 };
  const [plain, verbose] = await Promise.all([
    execute(tar, ['-tf', archive], tarOptions),
    execute(tar, ['-tvf', archive], tarOptions),
  ]);
  const names = plain.stdout.trimEnd().split(/\r?\n/);
  const types = verbose.stdout.trimEnd().split(/\r?\n/);
  const selected = new Set();
  if (names.length !== types.length) throw new Error('无法读取原作压缩包的文件清单。');
  for (const [index, path] of names.entries()) {
    const name = path.replace(/\/$/, '');
    if (!archiveEntries.some(entry => name === entry || name.startsWith(entry + '/'))) continue;
    const unsafe = name.split('/').some(part => !part || /[<>:"|?*\\\x00-\x1f]/.test(part) || /[. ]$/.test(part)
      || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
    if (unsafe || !/^[-d]/.test(types[index]) || selected.has(name.toLowerCase())) {
      throw new Error(`原作压缩包中存在无法提取的文件：${path}`);
    }
    selected.add(name.toLowerCase());
  }
  if (requiredFiles.some(file => !selected.has('game/' + file.toLowerCase()))) {
    throw new Error('压缩包里缺少默认 game 的地图、存档或开场脚本，请使用原作 4in1 资源包。');
  }
}

async function extractGame(archive, cache) {
  const digest = await archiveDigest(archive);
  const destination = join(cache, '4in1-' + digest);
  const game = join(destination, 'game');
  if ((await existing(game))?.isDirectory()) return verifyGame(game);
  await checkArchive(archive);
  const staging = await mkdtemp(join(cache, 'unpack-'));
  try {
    console.log('正在读取 4in1 的默认游戏资源，首次启动需要稍等。');
    await execute(tar, ['-xf', archive, '-C', staging, ...archiveEntries], { windowsHide: true });
    await verifyGame(join(staging, 'game'));
    try { await rename(staging, destination); }
    catch (error) {
      if (!(await existing(game))?.isDirectory()) throw error;
    }
    return verifyGame(game);
  } finally {
    await removePrivateFolder(cache, staging);
  }
}

async function gameData(source, cache) {
  const choices = source ? [source] : [
    join(root, 'game'), join(root, gameArchiveName),
  ];
  for (const candidate of choices) {
    const path = await existing(candidate);
    if (path?.isDirectory()) {
      const child = join(candidate, 'game');
      return verifyGame((await existing(child))?.isDirectory() ? child : candidate);
    }
    if (path?.isFile() && extname(candidate).toLowerCase() === '.7z') return extractGame(candidate, cache);
  }
  throw new Error(source ? `找不到可用的原作目录或 .7z 压缩包：${source}` : `找不到原作资源。\n${help}`);
}

async function checkPort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.on('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  }).catch(error => {
    if (error.code === 'EADDRINUSE') throw new Error(`端口 ${port} 已被占用。请打开已运行的游戏，或使用 --port 指定另一个端口。`);
    throw error;
  });
}

function startBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  execute(command, args, { windowsHide: true }).catch(() => {
    console.log(`可在浏览器中打开 ${url}`);
  });
}

async function launch(settings) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('需要 Node.js 24 或更新版本。');
  try { await execute(tar, ['--version'], { windowsHide: true }); }
  catch { throw new Error('找不到系统 tar，无法读取原作压缩资源。请使用含有 tar 的 Windows 10 或 Windows 11。'); }
  await checkPort(settings.port);
  await mkdir(settings.cache, { recursive: true });
  const game = await gameData(settings.source, settings.cache);
  const session = await mkdtemp(join(settings.cache, 'session-'));
  try {
    const url = `http://127.0.0.1:${settings.port}/`;
    const serverArgs = [game, session, String(settings.port)];
    if (settings.vendor) serverArgs.push(settings.vendor);
    const child = fork(join(root, 'server.mjs'), serverArgs, {
      cwd: root, execArgv: [], stdio: ['inherit', 'inherit', 'inherit', 'ipc'], windowsHide: true,
    });
    child.once('message', message => {
      if (message?.ready === url && settings.browser) startBrowser(url);
    });
    const stop = () => { if (child.connected) child.disconnect(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    process.once('disconnect', stop);
    if (process.connected === false) stop();
    try {
      await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => code && !signal
          ? reject(new Error('游戏服务启动或运行失败，请查看上方提示。')) : resolve());
      });
    } finally {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      process.off('disconnect', stop);
    }
  } finally {
    await removePrivateFolder(settings.cache, session);
  }
}

try {
  const settings = options(process.argv.slice(2));
  if (settings.help) console.log(help);
  else await launch(settings);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
