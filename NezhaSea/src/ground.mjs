// 海面：深夜的东海和剪纸的海水江崖纹，由页面在一块二维画布上画一次，放在引擎透明画布的下面；只在海面框改变大小时
// 重画。会动的东西都在引擎里。
// The sea: the East Sea by night with paper-cut waves and cliffs along its edges, painted once by the page on a 2D
// canvas under the engine's clear one, and again only when the sea's box changes size. Everything that moves is in
// the engine.
import { FIELD } from './sim/data.mjs';

/** A row of scalloped waves along `y`, each `size` wide, as paper cut from `color`. */
function waves(context, y, size, color, alpha, flip = 1) {
  context.fillStyle = color;
  context.globalAlpha = alpha;
  context.beginPath();
  context.moveTo(0, y + flip * size);
  for (let x = 0; x <= FIELD.width + size; x += size) context.arc(x, y, size / 2, flip > 0 ? Math.PI : 0, flip > 0 ? 0 : Math.PI, flip < 0);
  context.lineTo(FIELD.width, y + flip * size * 2);
  context.lineTo(0, y + flip * size * 2);
  context.fill();
  context.globalAlpha = 1;
}

/** The classic wave mark: nested half rings, as on an official's robe. */
function crest(context, x, y, r) {
  context.strokeStyle = 'rgba(244,236,216,0.10)';
  context.lineWidth = 2;
  for (let k = r; k > 4; k -= 6) {
    context.beginPath();
    context.arc(x, y, k, Math.PI, 0);
    context.stroke();
  }
}

export function drawSea(context) {
  const deep = context.createLinearGradient(0, 0, 0, FIELD.height);
  deep.addColorStop(0, '#0a2030');
  deep.addColorStop(0.5, '#0d2a3a');
  deep.addColorStop(1, '#0a2231');
  context.fillStyle = deep;
  context.fillRect(0, 0, FIELD.width, FIELD.height);
  for (let i = 0; i < 26; i++) crest(context, (i * 137) % FIELD.width, 90 + ((i * 263) % (FIELD.height - 180)), 18 + (i % 3) * 8);
  // Along the top, the shore of Chentang Pass; along the bottom, the open sea.
  waves(context, 26, 36, '#1d4c5e', 1, -1);
  waves(context, 14, 28, '#2f6f80', 1, -1);
  context.fillStyle = '#132f3d';
  context.fillRect(0, 0, FIELD.width, 8);
  waves(context, FIELD.height - 30, 36, '#1d4c5e', 1, 1);
  waves(context, FIELD.height - 16, 28, '#2f6f80', 1, 1);
  context.strokeStyle = 'rgba(232,184,74,0.35)';
  context.lineWidth = 2;
  context.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
}

/** Paint the sea on `canvas` to fill its box, again whenever the box changes size. */
export function paintSea(canvas) {
  const paint = () => {
    const box = canvas.getBoundingClientRect(),
      density = Math.min(globalThis.devicePixelRatio || 1, 2),
      width = Math.max(1, Math.round(box.width * density)),
      height = Math.max(1, Math.round(box.height * density));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.setTransform(width / FIELD.width, 0, 0, height / FIELD.height, 0, 0);
    drawSea(context);
  };
  paint();
  const watch = new ResizeObserver(paint);
  watch.observe(canvas);
  return () => watch.disconnect();
}
