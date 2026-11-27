import { pickLanguage } from '@egret/engine/kit';
import { LAP_CHOICES, RACERS } from './data.mjs';

export const SETTINGS_KEY = 'jinxiu-rally';
const QUALITY = ['high', 'medium', 'low'];
const LANG = ['zh', 'en'];

/** Read the original plain JSON format, also accepting saves made before language was set. */
export function loadSettings(storage, params = new URLSearchParams(), browserLanguage = 'en') {
  let saved = {};
  try {
    const value = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value;
  } catch {
    // Private browsing and broken or edited saves are safe to ignore.
  }
  return {
    racer: Number.isInteger(saved.racer) && RACERS[saved.racer] ? saved.racer : 0,
    klass: [0, 1, 2].includes(saved.klass) ? saved.klass : 1,
    laps: LAP_CHOICES.includes(saved.laps) ? saved.laps : 3,
    muted: saved.muted === true,
    quality: QUALITY.includes(params.get('quality')) ? params.get('quality') : QUALITY.includes(saved.quality) ? saved.quality : 'high',
    lang: LANG.includes(params.get('lang')) ? params.get('lang') : LANG.includes(saved.lang) ? saved.lang : pickLanguage(['en', 'zh'], [browserLanguage]),
  };
}

export function saveSettings(storage, settings) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Choices remain active for this visit even when storage is unavailable.
  }
}
