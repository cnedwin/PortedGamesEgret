// 存档：设置（语言、音效、配乐、减弱动画）存一处，三个存档位和一个自动存档各存一处。都由引擎的存档库读写：有版本号，
// 读不懂的旧档另放一边而不是丢掉，浏览器拒绝写入也不报错。整局也能导出成文件、再导入回来。
// The save: the settings (language, sound, music, reduced motion) in one place, and three slots and an autosave each
// in their own. All kept by the engine's save store: versioned, an unreadable save set aside rather than lost, a
// refused write never throwing. A whole game can also be exported to a file and imported again.
import { createSaveStore } from '@egret/engine/kit';
import { VERSION } from './sim/world.mjs';

export const SAVE_KEY = 'nine-provinces';
export const SLOTS = ['auto', '1', '2', '3'];

export const freshSettings = (language = 'zh') => ({ settings: { language, sound: true, music: true, reducedMotion: false, speed: 2 } });

/** The settings store. */
export function openSettings(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 1,
    defaults: () => freshSettings(language),
    storage,
    onProblem,
    validate: (data) => Boolean(data?.settings) && (data.settings.language === 'zh' || data.settings.language === 'en') && typeof data.settings.sound === 'boolean'
  });
}

/** Whether something looks like a game this build can carry on with. */
export function gameLooksRight(game) {
  return (
    Boolean(game) &&
    typeof game === 'object' &&
    game.version === VERSION &&
    Number.isInteger(game.day) &&
    typeof game.factions === 'object' &&
    typeof game.nodes === 'object' &&
    typeof game.generals === 'object' &&
    Array.isArray(game.inbox) &&
    Array.isArray(game.log)
  );
}

/** One save slot: { game, summary } or empty. */
export function openSlot(storage, slot, onProblem = () => {}) {
  return createSaveStore({
    key: `${SAVE_KEY}.${slot}`,
    version: 1,
    defaults: () => ({ game: null, summary: null }),
    storage,
    onProblem,
    validate: (data) => Boolean(data) && typeof data === 'object' && (data.game === null || gameLooksRight(data.game))
  });
}

/** What a slot shows before it is opened: the power, the date, the cities held. */
export function summarize(game, cities) {
  return { faction: game.player, day: game.day, cities, savedAt: new Date().toISOString() };
}

/** Write a game into a slot. Returns whether the browser kept it. */
export function writeSlot(store, game, cities) {
  const copy = JSON.parse(JSON.stringify(game));
  return (
    store.update((data) => {
      data.game = copy;
      data.summary = summarize(game, cities);
    }) !== false
  );
}

/** A save as a file's text, and back. */
export const exportText = (game) => JSON.stringify({ kind: 'nine-provinces-save', game });
export function importText(text) {
  try {
    const data = JSON.parse(text);
    return data?.kind === 'nine-provinces-save' && gameLooksRight(data.game) ? data.game : null;
  } catch {
    return null;
  }
}
