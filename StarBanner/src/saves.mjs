// 存档：设置、进行中的一局（每个回合结束时存下整盘状态，可以接着打）和战绩。由引擎的存档库读写：有版本号，读不懂的
// 旧档放到一边而不是丢掉，浏览器拒绝写入（隐私模式、空间满）也不报错。
// The save: the settings, the battle in progress (the whole board kept at the end of every turn, so it can be
// resumed) and the record. Kept by the engine's save store: versioned, an unreadable save set aside rather than lost,
// and a write the browser refuses (a private window, a full disk) never throws.
import { createSaveStore } from '@egret/engine/kit';
import { CAMPAIGN, campaignChapter } from './sim/campaign.mjs';

export const SAVE_KEY = 'star-banner';

export const freshSettings = (language = 'zh') => ({ language, sound: true, music: true, speed: 2, quality: 'auto', reducedMotion: false, grid: true });

const freshCampaign = () => ({ completed: [], battle: null });

/** What someone who has never played has. */
export const freshSave = (language = 'zh') => ({ settings: freshSettings(language), battle: null, record: { won: 0, lost: 0, byMap: {} }, campaign: freshCampaign() });

/** Whether a kept battle looks whole enough to resume. */
export function battleIsWhole(b) {
  return (
    !!b &&
    typeof b === 'object' &&
    typeof b.setup === 'object' &&
    b.setup !== null &&
    typeof b.game === 'object' &&
    b.game !== null &&
    Array.isArray(b.game.terrain) &&
    Array.isArray(b.game.units) &&
    Array.isArray(b.game.buildings) &&
    Array.isArray(b.game.players) &&
    b.game.terrain.length === b.game.w * b.game.h
  );
}

/** Open the save in `storage`; `onProblem` hears of a save that could not be read or written. */
export function openSave(storage, language = 'zh', onProblem = () => {}) {
  return createSaveStore({
    key: SAVE_KEY,
    version: 2,
    migrations: { 1: (data) => ({ ...data, campaign: freshCampaign() }) },
    defaults: () => freshSave(language),
    storage,
    onProblem,
    validate: (data) =>
      Boolean(data) &&
      typeof data === 'object' &&
      typeof data.settings === 'object' &&
      data.settings !== null &&
      (data.settings.language === 'zh' || data.settings.language === 'en') &&
      typeof data.record === 'object' &&
      data.record !== null &&
      (data.battle === null || battleIsWhole(data.battle))
  });
}

/** Settings with anything missing filled from the defaults. */
export function settingsOf(data) {
  return { ...freshSettings(data?.settings?.language), ...(data?.settings ?? {}) };
}

/** A finished battle into the record. */
export function recordBattle(data, mapId, won) {
  data.record ??= { won: 0, lost: 0, byMap: {} };
  if (won) data.record.won++;
  else data.record.lost++;
  const m = (data.record.byMap[mapId] ??= { won: 0, lost: 0 });
  if (won) m.won++;
  else m.lost++;
  data.battle = null;
}

/** Only a contiguous run of completed chapters unlocks new ones. Unknown IDs do not affect the other save slots. */
export function campaignProgressOf(data) {
  const kept = new Set(Array.isArray(data?.campaign?.completed) ? data.campaign.completed : []);
  const firstMissing = CAMPAIGN.findIndex((chapter) => !kept.has(chapter.id));
  const complete = firstMissing === -1;
  return {
    completed: CAMPAIGN.slice(0, complete ? CAMPAIGN.length : firstMissing).map((chapter) => chapter.id),
    next: complete ? null : CAMPAIGN[firstMissing].id,
    complete
  };
}

export function campaignChapterUnlocked(data, id) {
  const { completed, next } = campaignProgressOf(data);
  return typeof id === 'string' && (id === next || completed.includes(id));
}

function campaignBattleIsWhole(data, battle) {
  if (!battleIsWhole(battle)) return false;
  const chapter = campaignChapter(battle.setup.campaign);
  return Boolean(chapter && campaignChapterUnlocked(data, chapter.id) && battle.setup.map === chapter.map && battle.game.map === chapter.map);
}

export function campaignBattleOf(data) {
  const battle = data?.campaign?.battle;
  return campaignBattleIsWhole(data, battle) ? battle : null;
}

export function keepCampaignBattle(data, battle) {
  if (!campaignBattleIsWhole(data, battle)) return false;
  data.campaign = { completed: campaignProgressOf(data).completed, battle };
  return true;
}

export function clearCampaignBattle(data) {
  data.campaign = { completed: campaignProgressOf(data).completed, battle: null };
}

/** A result clears that chapter's checkpoint. Only a win advances the story. */
export function recordCampaignResult(data, id, won) {
  const progress = campaignProgressOf(data);
  if (!campaignChapterUnlocked(data, id)) return progress;
  const completed = won && id === progress.next ? [...progress.completed, id] : progress.completed;
  const battle = campaignBattleOf(data);
  data.campaign = { completed, battle: battle?.setup.campaign === id ? null : battle };
  return campaignProgressOf(data);
}
