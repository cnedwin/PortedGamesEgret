/** One browser data-preparation job. The UI can stay interactive while it runs. */
export function createPreparationController({ prepare, changed = () => {} }) {
  if (typeof prepare !== 'function') throw new TypeError('A preparation function is required.');
  let running;
  let state = Object.freeze({ phase: 'idle' });
  const update = next => {
    state = Object.freeze({ ...next });
    changed(state);
  };
  return {
    get state() { return state; },
    get pending() { return Boolean(running); },
    cancel() { running?.abort(); },
    async start(source) {
      if (running) return false;
      const job = new AbortController();
      const { signal } = job;
      running = job;
      const report = progress => {
        if (running === job && !signal.aborted) update(progress);
      };
      report({ phase: source ? 'reading' : 'checking' });
      try {
        const result = await prepare({ source, signal, report });
        signal.throwIfAborted();
        update({ phase: 'ready', ratio: 1 });
        return result;
      } catch (error) {
        update(signal.aborted ? { phase: 'cancelled' } : {
          phase: 'error', error: error instanceof Error ? error.message : String(error)
        });
        return false;
      } finally {
        if (running === job) running = undefined;
      }
    }
  };
}
