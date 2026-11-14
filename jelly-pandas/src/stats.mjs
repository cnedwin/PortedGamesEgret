// A small performance readout, shown with ?stats=1. It times the parts of a
// frame and reports what the renderer drew, so a slow device can be told
// apart from a slow game: rules, view and drawing each get their own number.

const SMOOTH = 0.1; // share of each new sample in the running averages

/**
 * `renderer` supplies `info.drawCalls` and `info.triangles` for the frame
 * just drawn. With `visible` false the numbers are still gathered (for
 * automated checks) but nothing is added to the page.
 */
export function createStats(renderer, visible = true) {
  const average = { frame: 0, rules: 0, view: 0, draw: 0 };
  const stats = { average, renderer, drawCalls: 0, triangles: 0, slowest: 0, enemies: 0 };
  let box,
    lastFrame = 0,
    mark = 0,
    shownAt = 0;
  if (visible) {
    box = document.createElement('pre');
    box.className = 'frame-stats';
    document.body.appendChild(box);
  }
  const blend = (key, value) => {
    average[key] += (value - average[key]) * SMOOTH;
  };

  /** Call at the very start of a frame. */
  stats.begin = () => {
    const now = performance.now();
    if (lastFrame) {
      const gap = now - lastFrame;
      blend('frame', gap);
      stats.slowest = Math.max(stats.slowest * 0.995, gap);
    }
    lastFrame = now;
    mark = now;
  };
  /** Close the part of the frame that started at the previous mark: 'rules' or 'view'. */
  stats.lap = (key) => {
    const now = performance.now();
    blend(key, now - mark);
    mark = now;
  };
  /**
   * Call at the end of the frame's own work. The engine draws right after, in
   * the same task, so a microtask queued here runs once drawing has been handed
   * to the graphics driver.
   */
  stats.end = (enemies) => {
    const start = performance.now();
    stats.enemies = enemies;
    queueMicrotask(() => {
      const now = performance.now();
      blend('draw', now - start);
      stats.drawCalls = renderer.info.drawCalls;
      stats.triangles = renderer.info.triangles;
      if (!box || now - shownAt < 250) return;
      shownAt = now;
      box.textContent =
        `${(1000 / Math.max(average.frame, 0.01)).toFixed(0)} fps   ${average.frame.toFixed(1)} ms   slowest ${stats.slowest.toFixed(0)} ms\n` +
        `rules ${average.rules.toFixed(2)}   view ${average.view.toFixed(2)}   draw ${average.draw.toFixed(2)} ms\n` +
        `${stats.drawCalls} draws   ${(stats.triangles / 1000).toFixed(0)}k triangles   ${enemies} enemies`;
    });
  };
  return stats;
}
