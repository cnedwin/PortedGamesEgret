export const packSignature = Object.freeze([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
export const maxArchiveBytes = 1024 * 1024 * 1024;
export const maxImportBytes = 256 * 1024 * 1024;
export const maxImportFiles = 10000;
export const requiredPaths = Object.freeze([
  'config/kysmod.ini', 'save/0.zip', 'script/event-cifa/691.cifa', 'script/event-cifa/692.cifa',
  'resource/smap.zip', 'resource/mmap.zip', 'resource/earth.002', 'resource/surface.002',
  'resource/building.002', 'resource/buildx.002', 'resource/buildy.002',
  'resource/war.sta', 'resource/warfld.idx', 'resource/warfld.grp',
]);

export function normalizedPath(value) {
  if (typeof value !== 'string') return undefined;
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || /[\u0000-\u001f\u007f\\:*?"<>|]/.test(part))) return undefined;
  return parts.join('/').toLowerCase();
}

const roots = [
  ['config/', /\.ini$/], ['list/', /\.txt$/], ['music/', /\.(?:mid|midi|sf2)$/],
  ['resource/', /\.(?:002|grp|idx|ka|png|sta|txt|webp|zip)$/],
  ['script/event-cifa/', /\.cifa$/], ['sound/', /\.(?:wav|ogg)$/],
];
export const selectedPath = path => path === 'save/0.zip'
  || roots.some(([prefix, extension]) => path?.startsWith(prefix) && extension.test(path));

export function checkPackEntries(entries) {
  const paths = new Set();
  let bytes = 0;
  for (const { path, size } of entries) {
    if (!path || !selectedPath(path) || paths.has(path)) throw Error('原作资源包包含重复或无效的游戏文件。');
    if (!Number.isSafeInteger(size) || size < 0) throw Error('原作资源包中的文件大小无效。');
    paths.add(path);
    bytes += size;
  }
  if (bytes > maxImportBytes || paths.size > maxImportFiles) throw Error('原作资源包超出浏览器导入容量。');
  const missing = requiredPaths.filter(path => !paths.has(path));
  if (missing.length) throw Error('缺少默认 4in1 游戏文件：' + missing.join('、'));
  return bytes;
}
