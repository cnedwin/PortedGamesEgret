import { FIRST_EVENING, firstEveningStatus, firstEveningAction, beginFirstEvening, finishFirstEvening } from '../first-evening.mjs';
import { FIRST_EVENING_SCRIPT } from '../story/first-evening.mjs';
import * as sim from '../sim.mjs';
import { playScript } from './story.mjs';

export async function openFirstEvening(game) {
  const s = game.state;
  if (!firstEveningAction(firstEveningStatus(s))) return;
  // Only the explicit wait-and-meet action skips the remaining daylight slots.
  while (s.slot < FIRST_EVENING.slot) sim.advance(s);
  const checkpoint = beginFirstEvening(s);
  if (!checkpoint) return;
  sim.enter(s, FIRST_EVENING.place);
  game.save();
  game.hideHud();
  // The walk takes place under the lit lanterns, within the same evening slot.
  const light = 'night';
  await game.world.setScene(FIRST_EVENING.place, light);
  await game.fadeIn(0.25);
  try {
    const result = await playScript(game, FIRST_EVENING_SCRIPT, {
      girl: FIRST_EVENING.girl, checkpoint, light, reader: game.memoryScenes.track('linxia-first-evening'),
    });
    if (result.completed && finishFirstEvening(s)) {
      // The meeting introduces her without advancing any of her regular chapters.
      sim.finishChapter(s, FIRST_EVENING.girl, 0);
      game.memoryScenes.unlock('linxia-first-evening', s);
      game.toast(game.L(['第一次邀约完成', 'First meeting complete']), 'good');
    }
    game.save();
  } finally {
    game.audio.setMusic('campus');
    await game.fadeOut(0.3);
  }
}
