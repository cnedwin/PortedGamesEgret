// 地面：静止的地图由页面在一块二维画布上画一次，放在引擎透明画布的下面。画法和引擎的 Graphics 同名（drawMap 不用
// 改），这里只是把这些调用翻成 Canvas 2D。地图每帧不变，交给引擎每帧重画，在没有显卡的软件渲染下会把帧时间翻倍。
// The ground: the still map, painted once by the page on a 2D canvas under the engine's clear one. The drawing calls
// have the names of the engine's Graphics (drawMap is the same either way); this only turns them into Canvas 2D. The
// map never changes, and drawn by the engine each frame it doubled the frame time under software rendering.
import { FIELD } from './sim/data.mjs';
import { drawMap } from './view.mjs';

const rgba = (color, alpha) => `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;

/** The calls of the engine's Graphics that drawMap uses, onto a 2D context. */
export function canvasGraphics(context) {
  let fill = null,
    line = null,
    open = false;
  // What has been drawn since the last fill or line change is filled and stroked as the engine would.
  const flush = () => {
    if (open) {
      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }
      if (line) {
        context.lineWidth = line.width;
        context.strokeStyle = line.style;
        context.lineJoin = line.options.joints ?? 'miter';
        context.lineCap = line.options.caps === 'round' ? 'round' : line.options.caps === 'square' ? 'square' : 'butt';
        context.setLineDash(line.options.dash ?? []);
        context.stroke();
      }
    }
    context.beginPath();
    open = false;
  };
  const g = {
    beginFill(color, alpha = 1) {
      flush();
      fill = rgba(color, alpha);
      return g;
    },
    endFill() {
      flush();
      fill = null;
      return g;
    },
    lineStyle(width = 0, color = 0, alpha = 1, options = {}) {
      flush();
      line = width > 0 ? { width, style: rgba(color, alpha), options } : null;
      return g;
    },
    moveTo(x, y) {
      context.moveTo(x, y);
      open = true;
      return g;
    },
    lineTo(x, y) {
      context.lineTo(x, y);
      open = true;
      return g;
    },
    curveTo(cx, cy, x, y) {
      context.quadraticCurveTo(cx, cy, x, y);
      open = true;
      return g;
    },
    drawRect(x, y, width, height) {
      context.rect(x, y, width, height);
      open = true;
      return g;
    },
    drawCircle(x, y, radius) {
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
      open = true;
      return g;
    },
    drawEllipse(x, y, width, height) {
      context.moveTo(x + width, y + height / 2);
      context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      open = true;
      return g;
    },
    finish: flush
  };
  return g;
}

/**
 * Paint the map on `canvas`, filling its box at the screen's pixel density, and again whenever the box changes size.
 * Returns a function that stops watching.
 */
export function paintGround(canvas) {
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
    const g = canvasGraphics(context);
    drawMap(g);
    g.finish();
  };
  paint();
  const watch = new ResizeObserver(paint);
  watch.observe(canvas);
  return () => watch.disconnect();
}
