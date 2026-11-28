// Settings keep their original key and fields; Egret owns validation and writes.
// The first explicit save upgrades a legacy raw object to a versioned record.
import { createSaveStore } from '@egret/engine/kit';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { pickLanguage } from './text.mjs';

export const SETTINGS_KEY = 'operation-cutoff';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const emptyParams = () => new URLSearchParams();
function defaultsFor(params) {
  return {
    quality: 'high', sensitivity: 1, adsSensitivity: 0.62, invertY: false,
    volume: 0.8, fov: 74, lang: pickLanguage(params.get('lang')),
  };
}

/** Accept the old raw JSON without writing over it until a player saves. */
function legacyStorage(storage) {
  return {
    getItem(key) {
      const text = storage.getItem(key);
      if (key !== SETTINGS_KEY || text === null) return text;
      try {
        const data = JSON.parse(text);
        // Only the former settings object needs wrapping. Malformed/versioned
        // records are left for the native store to report and preserve aside.
        if (record(data) && !Object.hasOwn(data, 'version') && !Object.hasOwn(data, 'savedAt') && !Object.hasOwn(data, 'data')) {
          return JSON.stringify({ version: 1, savedAt: 'legacy', data });
        }
      } catch { /* The engine preserves unreadable original text. */ }
      return text;
    },
    setItem(key, value) { storage.setItem(key, value); },
    removeItem(key) { storage.removeItem(key); },
  };
}

/** Injectable storage keeps the compatibility contract testable without a DOM. */
export function createSettingsStore({ storage = browserSaveStorage(), onProblem } = {}) {
  const adapted = legacyStorage(storage);
  const open = (params = emptyParams()) => createSaveStore({
    key: SETTINGS_KEY, version: 1, defaults: () => defaultsFor(params),
    validate: record, storage: adapted, onProblem,
  });
  return {
    load(params = emptyParams()) {
      const defaults = defaultsFor(params), saved = open(params).data;
      // Query overrides and the historical ADS bounds are unchanged for valid
      // old settings; unknown fields stay available to later game versions.
      return {
        ...defaults, ...saved,
        adsSensitivity: Number.isFinite(saved.adsSensitivity) ? Math.max(0.2, Math.min(1.5, saved.adsSensitivity)) : defaults.adsSensitivity,
        ...(params.get('lang') ? { lang: defaults.lang } : {}),
        ...(params.get('quality') ? { quality: params.get('quality') } : {}),
      };
    },
    save(settings) { return open().save(settings); },
  };
}

// Keep the memory fallback alive for this visit when the page cannot persist.
let current;
const browserSettings = () => (current ??= createSettingsStore());
export function loadSettings(params = new URLSearchParams(globalThis.location?.search ?? '')) {
  return browserSettings().load(params);
}
export function saveSettings(settings) {
  return browserSettings().save(settings);
}
