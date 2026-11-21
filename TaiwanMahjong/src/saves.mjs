// 存档：设置（语言、声音、配乐、牌友语音、出牌速度、听牌提示、减弱动画）、上次选的圈数和难度，以及战绩：打过几将、几次
// 第一、胡几把、自摸几把、放槍几次、最大一把几台、最好的一将几分。由引擎的存档库读写：有版本号，读不懂的旧档放到
// 一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings (language, sound, music, voices, pace, ready hints, reduced motion), the last length and level
// chosen, and the record: games played and won, hands won, self-draws, deal-ins, the most tai in one hand, the best
// game. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost, and a write the
// browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';

export const SAVE_KEY = 'taiwan-mahjong';
export const LEVEL_NAMES = ['easy', 'normal', 'hard'];
export const PACES = ['calm', 'brisk'];

export const freshSave = (language = 'zh') => ({
  setup: { rounds: 1, level: 'normal' },
  record: { games: 0, firsts: 0, hands: 0, wins: 0, selfDraws: 0, dealIns: 0, bestTai: 0, bestGame: null },
  settings: { language, sound: true, music: true, voice: true, pace: 'calm', hints: true, reducedMotion: false }
});

const isCount = (n) => Number.isInteger(n) && n >= 0;

/** Open the save in `storage`. `onProblem` hears of a save that could not be read or written. */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 2,
    defaults: () => freshSave(language),
    storage,
    onProblem,
    migrations: {
      // Players who previously muted the table keep the newly added voices muted.
      1: (data) => data?.settings && { ...data, settings: { ...data.settings, voice: data.settings.sound } }
    },
    validate: (data) => {
      if (!data || typeof data !== 'object') return false;
      const { setup, record, settings: s } = data;
      if (!setup || ![1, 4].includes(setup.rounds) || !LEVEL_NAMES.includes(setup.level)) return false;
      if (!record || !['games', 'firsts', 'hands', 'wins', 'selfDraws', 'dealIns', 'bestTai'].every((key) => isCount(record[key]))) return false;
      if (record.bestGame !== null && !Number.isInteger(record.bestGame)) return false;
      return (
        Boolean(s) &&
        (s.language === 'zh' || s.language === 'en') &&
        ['sound', 'music', 'voice', 'hints', 'reducedMotion'].every((key) => typeof s[key] === 'boolean') &&
        PACES.includes(s.pace)
      );
    }
  });
}

/** One hand over: count what the player (seat 0) did in it. */
export function recordHand(data, result) {
  data.record.hands++;
  if (result.kind !== 'win') return;
  if (result.seat === 0) {
    data.record.wins++;
    if (result.from === null) data.record.selfDraws++;
    data.record.bestTai = Math.max(data.record.bestTai, result.score.total);
  } else if (result.from === 0) data.record.dealIns++;
}

/** A game over with the player's score and place (1–4). Returns whether it is the best game yet. */
export function recordGame(data, score, place) {
  data.record.games++;
  if (place === 1) data.record.firsts++;
  const best = data.record.bestGame === null || score > data.record.bestGame;
  if (best) data.record.bestGame = score;
  return best;
}
