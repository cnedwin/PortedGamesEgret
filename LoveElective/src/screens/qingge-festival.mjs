import { CHAPTERS_SCRIPT } from '../story/chapters.mjs';
import { qinggeFestivalPreparation } from '../story/qingge-festival.mjs';

export function qinggeChapterFour(state) {
  return [...qinggeFestivalPreparation(state), ...CHAPTERS_SCRIPT.qingge[4]];
}
