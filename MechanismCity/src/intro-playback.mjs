// A slow or unsupported optional opening video must never hold the game behind a blank screen.
export function startOptionalIntro(film, { fallback, schedule = setTimeout, cancel = clearTimeout, timeoutMs = 10000 }) {
  let live = true, hasFrame = false;
  const finish = () => {
    if (!live) return;
    live = false;
    cancel(timer);
    fallback();
  };
  const timer = schedule(() => { if (!hasFrame) finish(); }, timeoutMs);
  try { void Promise.resolve(film.play()).catch(finish); }
  catch { finish(); }
  return {
    shown() { hasFrame = true; cancel(timer); },
    failed: finish,
    dispose() { live = false; cancel(timer); }
  };
}
