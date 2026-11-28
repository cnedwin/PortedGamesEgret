// Do not supersede the first two changing HUD labels while their native rasters
// are still pending. Holding the display strings never pauses the simulation.
export function createHudTextGate({ schedule = setTimeout, cancel = clearTimeout } = {}) {
  let token = 0, holding = false, timer;
  const clear = () => {
    token++;
    holding = false;
    if (timer !== undefined) cancel(timer);
    timer = undefined;
  };
  const hold = view => {
    clear();
    const current = token;
    const pending = ['wave-time', 'call-bonus'].map(name => view.textReady(name)).filter(Boolean);
    if (!pending.length) return;
    holding = true;
    const release = () => { if (token === current) clear(); };
    timer = schedule(release, 2000);
    void Promise.allSettled(pending).then(results => {
      if (token !== current) return;
      if (results.some(result => result.status === 'rejected')) { release(); return; }
      cancel(timer);
      // Give the first resolved glyphs one short visible interval before replacing them.
      timer = schedule(release, 250);
    });
  };
  return { hold, clear, get holding() { return holding; } };
}

// Keep the action verb and countdown context independent of the changing numbers.
// Both supported word tables put the early-silver bonus at the end of the sentence.
export function splitCallWords(words) {
  const match = /^(.*?)\s+(\+\d+)$/.exec(words);
  return match ? { caption: match[1], value: match[2] } : { caption: words, value: '' };
}
export function splitWaveWords(words, language) {
  const match = language === 'zh' ? /^(\d+)\s*(.+)$/.exec(words) : /^(.*?)\s+(\d+\s+s)$/.exec(words);
  return match ? (language === 'zh' ? { caption: match[2], value: match[1] } : { caption: match[1], value: match[2] }) : { caption: words, value: '' };
}
