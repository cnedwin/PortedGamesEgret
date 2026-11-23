import { isPlot } from './sim/world.mjs';

export const SAVE_KEY = 'egret-game-template';
const RECORD = 'homestead-v1';

export function readProgress(game) {
  const saved = game.load(RECORD, null);
  return {
    house: isPlot(saved?.house) ? saved.house : null,
    language: ['en', 'zh'].includes(saved?.language) ? saved.language : null,
    muted: saved?.muted === true
  };
}

export function writeProgress(game, { house }, { language, muted }) {
  game.save(RECORD, { house, language, muted });
}
