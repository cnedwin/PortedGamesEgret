/**
 * Reads KYS `index.txt` or `index.ka`. Missing frame IDs have offset (0, 0).
 * Nonempty text takes precedence. Binary contains little-endian signed 16-bit
 * pairs in frame order. Ignore incomplete trailing pairs and text rows whose
 * values cannot fit signed 32-bit integers.
 * @param {number} count Number of frame slots in the texture group.
 * @param {{text?: string, binary?: ArrayBuffer | ArrayBufferView}} [options]
 * @returns {Map<number, {dx: number, dy: number}>}
 */
export function readTextureOffsets(count, { text = '', binary } = {}) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError('Texture frame count must be a nonnegative safe integer');
  }
  if (typeof text !== 'string') {
    throw new TypeError('Texture index text must be a string');
  }

  const offsets = new Map();
  if (text.length > 0) {
    for (const line of text.split('\n')) {
      // Match mlcc's findNumbers<int>: numeric-looking runs, then atof and truncation.
      const runs = line.replaceAll('\r', '').match(/[0-9.eE+\-]+/g) ?? [];
      const [id, dx, dy] = runs.filter(run => /\d/.test(run)).slice(0, 3)
        .map(run => Math.trunc(Number.parseFloat(run) || 0) || 0);
      if ([id, dx, dy].every(value => value >= -0x80000000 && value <= 0x7fffffff)
        && id >= 0 && id < count) {
        offsets.set(id, { dx, dy });
      }
    }
    return offsets;
  }

  if (binary === undefined) return offsets;
  const view = ArrayBuffer.isView(binary)
    ? new DataView(binary.buffer, binary.byteOffset, binary.byteLength)
    : new DataView(binary);
  const frames = Math.min(count, Math.floor(view.byteLength / 4));
  for (let id = 0; id < frames; id++) {
    const start = id * 4;
    offsets.set(id, { dx: view.getInt16(start, true), dy: view.getInt16(start + 2, true) });
  }
  return offsets;
}
