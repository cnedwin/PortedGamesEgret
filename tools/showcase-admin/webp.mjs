export const MAX_IMAGE_BYTES = 1024 * 1024;
const LIMIT = 1600;

/** Validate a single static WebP and its dimensions before it becomes a public asset. */
export function validWebP(bytes) {
  if (bytes.length < 20 || bytes.length > MAX_IMAGE_BYTES ||
      bytes.toString('ascii', 0, 4) !== 'RIFF' ||
      bytes.toString('ascii', 8, 12) !== 'WEBP' ||
      bytes.readUInt32LE(4) !== bytes.length - 8) return false;
  let pos = 12, canvas, pixels;
  while (pos + 8 <= bytes.length) {
    const tag = bytes.toString('ascii', pos, pos + 4);
    const size = bytes.readUInt32LE(pos + 4), start = pos + 8;
    pos = start + size + (size % 2);
    if (pos > bytes.length) return false;
    if (tag === 'ANIM' || tag === 'ANMF') return false;
    if (tag === 'VP8X') {
      if (canvas || size !== 10 || (bytes[start] & 2)) return false;
      canvas = [1 + bytes.readUIntLE(start + 4, 3), 1 + bytes.readUIntLE(start + 7, 3)];
    } else if (tag === 'VP8 ' || tag === 'VP8L') {
      if (pixels) return false;
      if (tag === 'VP8 ') {
        if (size <= 10 || bytes.readUIntBE(start + 3, 3) !== 0x9d012a) return false;
        pixels = [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
      } else {
        if (size <= 5 || bytes[start] !== 0x2f) return false;
        const packed = bytes.readUInt32LE(start + 1);
        pixels = [1 + (packed & 0x3fff), 1 + ((packed >>> 14) & 0x3fff)];
      }
    }
  }
  return pos === bytes.length && Boolean(pixels?.every(n => n >= 1 && n <= LIMIT)) &&
    (!canvas || canvas.every((n, index) => n === pixels[index]));
}
