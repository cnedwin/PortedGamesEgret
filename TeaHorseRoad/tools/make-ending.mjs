// 录结尾短片：在无头浏览器里以 ?film 打开游戏，按帧推进车队和镜头，每帧截一张图，再用 ffmpeg 编成 VP9 的 WebM 和
// H.264 的 MP4，放进 media/。短片里的一切都是游戏自己画的。
// Records the closing film: opens the game with ?film in a headless browser, steps the convoy and the camera frame by
// frame, captures each frame, and has ffmpeg encode them as VP9 WebM and H.264 MP4 into media/. Everything in the film
// is drawn by the game itself.
//
//   node tools/make-ending.mjs http://localhost:4190/TeaHorseRoad/
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4190/TeaHorseRoad/',
  fps = 24,
  frames = new URL('../media/frames/', import.meta.url).pathname,
  media = new URL('../media/', import.meta.url).pathname;
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (error) => console.error('page', error.message));
await page.goto(base + '?film&quality=high');
await page.waitForFunction(() => window.teaHorseRoadFilm, null, { timeout: 120000 });
await page.evaluate(() => window.teaHorseRoadFilm.settle(1.5));
const seconds = await page.evaluate(() => window.teaHorseRoadFilm.seconds);
const total = Math.round(seconds * fps);
for (let i = 0; i < total; i++) {
  // Step the game, then let the page draw the stepped state once before the capture.
  await page.evaluate(([t, dt]) => new Promise((done) => {
    window.teaHorseRoadFilm.frame(t, dt);
    requestAnimationFrame(() => setTimeout(done, 0));
  }), [i / fps, 1 / fps]);
  await page.screenshot({ path: `${frames}${String(i).padStart(4, '0')}.png` });
  if (i % 24 === 0) console.log(`frame ${i}/${total}`);
}
await browser.close();
const input = ['-y', '-framerate', String(fps), '-i', `${frames}%04d.png`];
// A fade from black at the start and to black at the end.
const fade = `fade=t=in:st=0:d=1,fade=t=out:st=${seconds - 1.5}:d=1.5`;
execFileSync('ffmpeg', [...input, '-vf', fade, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-pix_fmt', 'yuv420p', `${media}ending.webm`], { stdio: 'inherit' });
execFileSync('ffmpeg', [...input, '-vf', fade, '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${media}ending.mp4`], { stdio: 'inherit' });
execFileSync('ffmpeg', ['-y', '-i', `${frames}${String(Math.round(total * 0.85)).padStart(4, '0')}.png`, '-q:v', '4', `${media}ending-poster.jpg`], { stdio: 'inherit' });
rmSync(frames, { recursive: true, force: true });
console.log('done');
