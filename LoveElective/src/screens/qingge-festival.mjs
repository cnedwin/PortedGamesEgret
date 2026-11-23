import { CHAPTERS_SCRIPT } from '../story/chapters.mjs';
import { qinggeFestivalPreparation, qinggeFestivalEpilogue } from '../story/qingge-festival.mjs';
import { playScript } from './story.mjs';

export function qinggeChapterFour(state) {
  return [...qinggeFestivalPreparation(state), ...CHAPTERS_SCRIPT.qingge[4]];
}

/** Review the story with the clothes and stats from the bookmark in a private copy. */
export async function replayQinggeFestival(game) {
  const snapshot = game.readQinggeBranch();
  if (!snapshot) return;
  const previousStoryStatus = game.storyStatus;
  const replay = {
    state: snapshot,
    stage: game.stage,
    ui: game.ui,
    world: game.world,
    audio: game.audio,
    L: game.L,
    lang: game.lang,
    spec: (who, expression) => game.spec(who, expression, snapshot),
    toast() {},
    set storyStatus(status) { game.storyStatus = status; },
  };
  const options = { girl: 'qingge', exitLabel: ['退出回看', 'Exit replay'] };
  game.hideHud();
  try {
    const budget = await playScript(replay, CHAPTERS_SCRIPT.qingge[3], options);
    if (budget.completed) {
      await playScript(replay, [
        ...qinggeChapterFour(snapshot),
        ...qinggeFestivalEpilogue(snapshot),
      ], options);
    }
  } finally {
    game.storyStatus = previousStoryStatus;
    game.audio.stopVoice?.();
    game.audio.setMusic?.('campus');
    await game.world.setScene('gate', 'dusk');
  }
}
