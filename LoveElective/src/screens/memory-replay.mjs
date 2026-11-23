import { BAILU_ZERO_STAGES, freshBailuZero } from '../data/bailu-zero.mjs';
import { MEMORY_SCENES } from '../memory-scenes.mjs';
import * as sim from '../sim.mjs';
import { bailuZeroScript } from '../story/bailu-zero.mjs';
import { CHAPTERS_SCRIPT } from '../story/chapters.mjs';
import { FIRST_EVENING_SCRIPT } from '../story/first-evening.mjs';
import { qinggeFestivalRoute, qinggeFestivalEpilogue } from '../story/qingge-festival.mjs';
import { qinggeChapterFour } from './qingge-festival.mjs';
import { playScript } from './story.mjs';

export async function replayMemoryScene(game, id) {
  const budgetReplay = id === 'qingge-festival';
  const girl = budgetReplay ? 'qingge' : MEMORY_SCENES.find(scene => scene.id === id)?.girl;
  if (!girl) return;
  const state = budgetReplay ? game.readQinggeBranch() : game.memoryScenes.read(id);
  if (!state) return;

  // The runner and invited wardrobe can only write to this detached state.
  // The active term, the source archive and the pre-budget bookmark stay intact.
  const previousStoryStatus = game.storyStatus;
  const replay = {
    state, stage: game.stage, ui: game.ui, world: game.world, audio: game.audio,
    lang: game.lang, L: game.L,
    spec: (who, expression) => game.spec(who, expression, state),
    showHud: game.hideHud,
    save() {},
    toast() {},
    set storyStatus(status) { game.storyStatus = status; },
  };
  const play = (steps, scope, options = {}) => playScript(replay, steps, {
    girl, exitLabel: ['退出回看', 'Exit replay'],
    reader: game.memoryScenes.track(scope), ...options,
  });

  game.hideHud();
  try {
    if (budgetReplay) {
      if (!(await play(CHAPTERS_SCRIPT.qingge[3], 'qingge-budget')).completed) return;
      const route = qinggeFestivalRoute(state);
      if (!(await play(qinggeChapterFour(state), `qingge-preparation-${route}`)).completed || !route) return;
      const epilogue = `qingge-${route}`;
      if ((await play(qinggeFestivalEpilogue(state), epilogue, { light: 'night' })).completed) {
        game.memoryScenes.unlock(epilogue, state);
      }
    } else if (id === 'bailu-zero') {
      state.bailuZero = freshBailuZero();
      for (let stage = 0; stage < BAILU_ZERO_STAGES.length; stage++) {
        const checkpoint = sim.beginBailuZero(state);
        if (!checkpoint) break;
        const seen = await play(bailuZeroScript(stage), checkpoint.id, { checkpoint, light: 'night' });
        if (!seen.completed || !sim.finishBailuZero(state, stage)) break;
      }
    } else if (id === 'linxia-first-evening') {
      await play(FIRST_EVENING_SCRIPT, id, { light: 'night' });
    } else {
      await play(qinggeFestivalEpilogue(state), id, { light: 'night' });
    }
  } finally {
    game.storyStatus = previousStoryStatus;
    game.audio.stopVoice?.();
    game.audio.setMusic?.('campus');
    await game.world.hideActor();
    await game.world.setScene('gate', 'dusk');
  }
}
