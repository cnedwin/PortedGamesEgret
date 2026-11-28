// A retained screen can become ready after the last on-demand presentation.
// Request a draw now and one when its essential text is ready, with a deadline.
export function presentStaticScreen(game, view, names, isCurrent, {
  schedule = setTimeout, cancel = clearTimeout, timeoutMs = 2000, presentDelayMs = 350
} = {}) {
  if (!isCurrent()) return;
  game.invalidate();
  let complete = false;
  const finish = () => {
    if (complete) return;
    complete = true;
    cancel(timer);
    if (isCurrent()) schedule(() => { if (isCurrent()) game.invalidate(); }, presentDelayMs);
  };
  const timer = schedule(finish, timeoutMs);
  const pending = names.map(name => view.textReady(name)).filter(Boolean);
  void Promise.allSettled(pending).then(finish);
}
