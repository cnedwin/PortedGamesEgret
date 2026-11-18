export function createOpeningReading(edition, storage) {
  const key = 'jy:opening-691-read:' + edition;
  function read() {
    try {
      const value = JSON.parse((storage ?? globalThis.localStorage).getItem(key));
      if (Array.isArray(value)) return new Set(value.filter(Number.isSafeInteger));
    } catch {
      // Storage may be unavailable in a private session.
    }
    return new Set();
  }
  const earlier = read();
  const acknowledged = new Set(earlier);
  let fastForward = false;
  return {
    known(index) { return earlier.has(index); },
    start(index) { return fastForward = earlier.has(index); },
    shouldSkip(index) {
      if (!earlier.has(index)) fastForward = false;
      return fastForward;
    },
    acknowledge(index) {
      if (acknowledged.has(index)) return;
      acknowledged.add(index);
      try {
        const combined = new Set([...read(), ...acknowledged]);
        (storage ?? globalThis.localStorage).setItem(key, JSON.stringify([...combined]));
      } catch {
        // Reading the dialogue never depends on browser storage.
      }
    },
  };
}
