// Regenerate the shipped music from the original scores with Node and FFmpeg (libmp3lame).
// Run `node tools/render-music.mjs [path-to-ffmpeg]` after changing a score.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PIECES, RATE, renderPiece } from '../src/audio/synth.mjs';

const encoder = process.argv[2] ?? 'ffmpeg';
const folder = new URL('../assets/music/', import.meta.url);
mkdirSync(folder, { recursive: true });
for (const [name, score] of Object.entries(PIECES)) {
  const loop = name !== 'victory' && name !== 'defeat';
  const samples = renderPiece(score, { loop });
  const result = spawnSync(encoder, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '1',
    '-i', 'pipe:0', '-c:a', 'libmp3lame', '-q:a', '2',
    fileURLToPath(new URL(name + '.mp3', folder))
  ], { input: Buffer.from(samples.buffer), stdio: ['pipe', 'ignore', 'pipe'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not encode ${name}: ${result.stderr.toString().trim()}`);
}
