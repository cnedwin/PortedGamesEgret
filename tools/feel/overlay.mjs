// A readout of what `feel` measured, drawn over the page.
// Shown when asked for — the game decides; this only draws.
//
// Kept deliberately plain: a <pre> and a line of text, refreshed four times a
// second so reading it never becomes the slowest thing in the frame.

const REFRESH_MS = 250;

/**
 * @param {ReturnType<import('./feel.mjs').createFeel>} feel
 * @param {object} [options]
 * @param {HTMLElement} [options.root] where the panel is added
 * @param {boolean} [options.visible] false still measures, draws nothing
 */
export function createFeelOverlay(feel, options = {}) {
  const root = options.root ?? document.body;
  let box = null;
  let shownAt = 0;

  if (options.visible !== false) {
    box = document.createElement('pre');
    box.className = 'feel-overlay';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText =
      'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;z-index:2147483647;' +
      'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#dfe6f0;' +
      'background:rgba(10,13,18,.72);border-radius:6px;pointer-events:none;white-space:pre;';
    root.appendChild(box);
  }

  const overlay = {
    /** Call at the end of a frame. */
    update() {
      if (!box) return;
      const now = performance.now();
      if (now - shownAt < REFRESH_MS) return;
      shownAt = now;
      const r = feel.report();
      const mark = (ok) => (ok ? 'ok  ' : 'FAIL');
      box.textContent =
        `${r.fps.p95.toFixed(0)} fps p95   ${r.frameGapMs.p95.toFixed(1)} ms   dropped ${r.droppedFrames.count}\n` +
        `input p95 ${r.input.p95.toFixed(0)} ms  max ${r.input.max.toFixed(0)} ms  lost ${r.input.lost}\n` +
        `feedback ${(r.clears.completeShare * 100).toFixed(0)}%  swallowed ${r.chains.swallowed}\n` +
        `${mark(r.verdict.inputP95)} latency   ${mark(r.verdict.frameP95)} frames   ${mark(r.verdict.feedbackComplete)} feedback`;
    },
    dispose() {
      box?.remove();
      box = null;
    },
  };

  return overlay;
}
