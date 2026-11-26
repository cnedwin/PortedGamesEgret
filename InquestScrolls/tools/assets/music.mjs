// 把 synth.mjs 里的曲子渲染成 MP3（需要 ffmpeg）。
//   node tools/assets/music.mjs
// Renders the pieces in synth.mjs to MP3 (needs ffmpeg).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIECES, RATE, renderPiece } from '../../src/audio/synth.mjs';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(GAME, 'assets/music');
mkdirSync(out, { recursive: true });
for (const [name, piece] of Object.entries(PIECES)) {
  const samples = renderPiece(piece, { loop: name !== 'closed' });
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  const raw = path.join(tmpdir(), `inquest-${name}.raw`);
  writeFileSync(raw, pcm);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', raw, '-b:a', '64k', path.join(out, name + '.mp3')]);
  rmSync(raw);
  console.log(name, (samples.length / RATE).toFixed(1) + 's');
}
