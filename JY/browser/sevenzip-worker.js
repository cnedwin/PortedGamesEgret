/* global SevenZipWasm */
let acknowledge;
let running = false;
self.onmessage = async ({ data }) => {
  if (data?.type === 'ack') {
    acknowledge?.();
    acknowledge = undefined;
    return;
  }
  if (running || data?.type !== 'extract') return;
  running = true;
  try {
    await extract(data.file);
    self.postMessage({ type: 'done' });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message ?? '无法解压 4in1 资源包。' });
  }
};

async function extract(file) {
  const { checkPackEntries, normalizedPath, selectedPath } = await import('./pack-format.mjs');
  const vendor = new URL('./vendor/sevenzip-wasm/', self.location.href);
  importScripts(new URL('sevenzip-wasm.js', vendor).href);
  const listing = [];
  let recordOutput = true, diagnostic = '';
  const decoder = await SevenZipWasm({
    locateFile: name => new URL(name, vendor).href,
    print(line) {
      if (recordOutput) listing.push(line);
      if (listing.length > 350000) throw Error('原作压缩包的文件清单太大。');
    },
    printErr(line) { diagnostic = line; },
  });
  const fs = decoder.FS;
  fs.mkdir('/input');
  fs.mkdir('/output');
  fs.mount(decoder.WORKERFS ?? fs.filesystems.WORKERFS, { blobs: [{ name: 'source.7z', data: file }] }, '/input');
  function run(args) {
    diagnostic = '';
    let status;
    try { status = decoder.callMain(args); }
    catch (error) {
      if (!Number.isInteger(error?.status)) throw Error('7-Zip ' + args[0] + '：' + (error?.message ?? error));
      status = error.status;
    }
    if (status) throw Error('7-Zip 无法读取原作资源包（' + status + '）。' + (diagnostic ? ' ' + diagnostic : ''));
  }

  run(['l', '-slt', '-ba', '-bd', '-p__kys_no_password__', '/input/source.7z']);
  recordOutput = false;
  const entries = [];
  const archiveMethods = new Set();
  for (const block of listing.join('\n').split(/\r?\n\r?\n/)) {
    const fields = new Map();
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(' = ');
      if (separator >= 0) fields.set(line.slice(0, separator), line.slice(separator + 3));
    }
    const name = fields.get('Path');
    const canonical = normalizedPath(name);
    if (!canonical?.startsWith('game/')) continue;
    const path = canonical.slice(5);
    const attributes = fields.get('Attributes') ?? '';
    if (!selectedPath(path) || fields.get('Folder') === '+' || attributes.startsWith('D')) continue;
    if (fields.get('Encrypted') === '+' || fields.get('Symbolic Link') || fields.get('Hard Link') || /\bl[rwx-]{9}\b/.test(attributes)) {
      throw Error('默认 4in1 游戏文件不能是加密文件或链接。');
    }
    const size = Number(fields.get('Size'));
    entries.push({ path, name, size });
    if (fields.get('Method')) archiveMethods.add(fields.get('Method'));
  }
  listing.length = 0;
  const bytes = checkPackEntries(entries);
  self.postMessage({ type: 'listed', total: entries.length, bytes, methods: [...archiveMethods] });
  fs.writeFile('/selection.txt', entries.map(entry => entry.name).join('\n') + '\n');
  run(['x', '-y', '-aoa', '-bb0', '-bso0', '-bsp0', '-spd', '-p__kys_no_password__',
    '-scsUTF-8', '-o/output', '/input/source.7z', '@/selection.txt']);
  fs.unmount('/input');
  let files = [], transfer = [], batchBytes = 0;
  async function send() {
    if (!files.length) return;
    await new Promise(resolve => {
      acknowledge = resolve;
      self.postMessage({ type: 'batch', files }, transfer);
    });
    files = [];
    transfer = [];
    batchBytes = 0;
  }
  for (const entry of entries) {
    const source = '/output/' + entry.name;
    const stat = fs.lstat(source);
    if (!fs.isFile(stat.mode) || stat.size !== entry.size) throw Error('解包后的游戏文件与清单不一致。');
    const bytes = fs.readFile(source);
    fs.unlink(source);
    files.push({ path: entry.path, buffer: bytes.buffer });
    transfer.push(bytes.buffer);
    batchBytes += bytes.byteLength;
    if (files.length >= 48 || batchBytes >= 4 * 1024 * 1024) await send();
  }
  await send();
}
