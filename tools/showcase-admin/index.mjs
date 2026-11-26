import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createAccount, createAdmin } from './server.mjs';

const mode = process.env.SHOWCASE_ADMIN_MODE || 'local';
const dataDir = process.env.SHOWCASE_ADMIN_DATA ||
  join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'PortedGamesEgret', 'showcase-admin');
const accountFile = join(dataDir, 'account.json');
const repo = fileURLToPath(new URL('../../', import.meta.url));

async function setup(username) {
  if (!username) throw new Error('请在 --setup 后填写账号名。');
  const silent = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const reader = createInterface({ input: process.stdin, output: silent, terminal: Boolean(process.stdin.isTTY) });
  process.stdout.write('请输入后台密码（输入时隐藏）：');
  let password;
  try {
    password = await new Promise((resolve, reject) => {
      reader.once('line', resolve);
      reader.once('close', () => reject(new Error('未读取到密码。')));
    });
  } finally {
    reader.close();
    process.stdout.write('\n');
  }
  const account = await createAccount(username, password);
  await mkdir(dataDir, { recursive: true });
  try { await writeFile(accountFile, JSON.stringify(account), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('这台电脑已有后台账号。原账号未修改。');
    throw error;
  }
  console.log('本机后台账号已设置。');
}

async function configuration() {
  if (mode === 'github') {
    if (!process.env.SHOWCASE_ADMIN_DATA || !isAbsolute(dataDir)) throw new Error('线上模式需要配置持久化草稿目录。');
    const [{ createGitHubAuth }, { createGitHubPublisher }] = await Promise.all([
      import('./github-auth.mjs'), import('./github-publish.mjs'),
    ]);
    const origin = process.env.SHOWCASE_ADMIN_PUBLIC_ORIGIN;
    const users = (process.env.SHOWCASE_ADMIN_GITHUB_USER_IDS ?? '').split(',').map(id => id.trim());
    const allowedUserIds = users.map(id => {
      if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new Error('请设置获授权的 GitHub 数字账号 ID。');
      return Number(id);
    });
    const auth = createGitHubAuth({ origin, allowedUserIds, repositoryId: 1454186560,
      clientId: process.env.SHOWCASE_ADMIN_GITHUB_CLIENT_ID,
      clientSecret: process.env.SHOWCASE_ADMIN_GITHUB_CLIENT_SECRET });
    return { publisher: createGitHubPublisher(), online: { origin, auth }, host: '0.0.0.0',
      port: Number(process.env.PORT || 8080) };
  }
  if (mode !== 'local') throw new Error('后台运行模式无效。');
  let account;
  try { account = JSON.parse(await readFile(accountFile, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error('请先运行 node tools/showcase-admin/index.mjs --setup 账号名');
    throw error;
  }
  const { createPublisher } = await import('./publish.mjs');
  return { publisher: createPublisher(repo), account, host: '127.0.0.1',
    port: Number(process.env.SHOWCASE_ADMIN_PORT || 8765) };
}

try {
  if (process.argv[2] === '--setup') {
    if (mode !== 'local') throw new Error('线上账号通过 GitHub 授权。');
    await setup(process.argv[3]);
  } else {
    const { host, port, ...options } = await configuration();
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('后台端口设置无效。');
    const server = await createAdmin({ ...options, dataDir });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, resolve);
    });
    console.log('展示站后台  ' + (options.online?.origin ?? 'http://127.0.0.1:' + port) + '/');
  }
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? '后台端口已被占用。' : error.message);
  process.exitCode = 1;
}
