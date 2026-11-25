import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createAccount, createAdmin } from './server.mjs';
import { createPublisher } from './publish.mjs';

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

try {
  if (process.argv[2] === '--setup') {
    await setup(process.argv[3]);
  } else {
    const port = Number(process.env.SHOWCASE_ADMIN_PORT || 8765);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('后台端口设置无效。');
    let account;
    try { account = JSON.parse(await readFile(accountFile, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') throw new Error('请先运行 node tools/showcase-admin/index.mjs --setup 账号名');
      throw error;
    }
    const server = await createAdmin({ publisher: createPublisher(repo), account, dataDir });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    console.log('展示站后台  http://127.0.0.1:' + port + '/');
  }
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? '后台端口已被占用。' : error.message);
  process.exitCode = 1;
}
