import { unzipSync } from '../third-party/fflate/index.js';

/** The game's texture groups and desktop saves contain flat ZIP members. */
export function unpackFlatZip(bytes, {
  label = 'ZIP', limit = 128 * 1024 * 1024, maxCompressed = limit, maxEntries = 12000, include,
} = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 22 || bytes.byteLength > maxCompressed) {
    throw new Error(label + ' 文件大小无效。');
  }
  const entries = new Map();
  let decodedSize = 0;
  const files = unzipSync(bytes, { filter({ name, originalSize }) {
    const path = name.toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{0,254}$/i.test(name) || entries.has(path)) {
      throw new Error(label + ' 包含无效或重复的文件名。');
    }
    if (!Number.isSafeInteger(originalSize) || originalSize < 0) {
      throw new Error(label + ' 的解压尺寸无效。');
    }
    decodedSize += originalSize;
    if (entries.size >= maxEntries || decodedSize > limit) {
      throw new Error(label + ' 的文件数量或解压尺寸超出范围。');
    }
    entries.set(path, originalSize);
    return !include || include(path);
  } });
  const result = new Map();
  for (const [name, data] of Object.entries(files)) {
    const path = name.toLowerCase();
    if (data.byteLength !== entries.get(path)) throw new Error(label + ' 的解压尺寸与记录不符。');
    result.set(path, data);
  }
  return result;
}
