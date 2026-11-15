// What a new head of a sect is shown, and when. A game begins with the seat,
// the disciples and their work; the rest of what a sect can do opens as the
// sect grows, each with a line on what it is for. Nothing here changes the
// rules: it only says which parts of the page are on show, so the sects the
// game runs, and a world nobody is watching, are not touched by it.
import { DAYS_PER_YEAR } from '../data/goods.mjs';

const places = (state) => Object.values(state.places).filter((place) => place.owner === state.playerSect).length;
/** How many of the matters in hand (core/goals.mjs) are behind the sect. */
const goals = (state) => state.goals?.index ?? 0;

/**
 * The parts that open in time, in the order they are likely to. `hint` says
 * what brings it, for the list of what is still to come; `when` is the test.
 */
export const FEATURES = [
  { id: 'world', name: '江湖', about: '天下据点与各派动向尽在此图，日后在这里开分舵、定去向。', hint: '过完头一旬', when: (s) => s.day >= 10 || goals(s) >= 1 },
  { id: 'master', name: '拜师', about: '让弟子拜在长老或掌门门下，师父造诣越高，徒弟练得越快。', hint: '开派满一个月', when: (s) => s.day >= 30 || goals(s) >= 2 },
  { id: 'here', name: '此地与店铺', about: '山下开店每旬有银两进账；每处据点还可定一项专精。', hint: '开派满两个月', when: (s) => s.day >= 60 || goals(s) >= 3 },
  { id: 'affairs', name: '门派事务', about: '立门规、任命职位、开丹房、布施扬名，都在山门的「事务」里。', hint: '开派满两个月', when: (s) => s.day >= 60 || goals(s) >= 4 },
  { id: 'battle', name: '战阵与擂台', about: '让弟子登擂扬名；与邻派为敌时，在此商议出兵。三年一度的论剑大会也在这里看。', hint: '开派满一季', when: (s) => s.day >= 90 || goals(s) >= 5 },
  { id: 'wheel', name: '出招与站位', about: '为弟子排定出招次序和前后排，交手时照此施为。', hint: '开派满一季', when: (s) => s.day >= 90 || goals(s) >= 5 },
  { id: 'gear', name: '装备丹药', about: '为弟子打造兵甲、赐予神兵、服用丹药。', hint: '开派满四个月', when: (s) => s.day >= 120 || goals(s) >= 6 },
  { id: 'diplomacy', name: '门派往来', about: '馈赠结好、求授武学；交情到了，两家之间的路就是商路。', hint: '开派满四个月', when: (s) => s.day >= 120 || goals(s) >= 6 },
  { id: 'meridian', name: '经脉', about: '内功根基够了，可为弟子打通经脉，每一脉两种走法择其一。', hint: '开派满一年', when: (s) => s.day >= DAYS_PER_YEAR || goals(s) >= 8 },
  { id: 'spy', name: '卧底', about: '在他派安插卧底，与之交手时攻势更盛，但有败露之险。', hint: '据有两处据点，或开派满两年', when: (s) => places(s) >= 2 || s.day >= 2 * DAYS_PER_YEAR },
];
const BY_ID = Object.fromEntries(FEATURES.map((feature) => [feature.id, feature]));

/** Begins a new game with only the first things on show. */
export function startUnlocks(state) {
  state.unlocks = {};
}

/** Puts everything on show at once: for a game from before this list, or a player who asks. */
export function openAll(state) {
  state.unlocks = Object.fromEntries(FEATURES.map((feature) => [feature.id, state.unlocks?.[feature.id] ?? state.day]));
}

/** Whether a part is on show. A world without a list shows everything. */
export const isOpen = (state, id) => !state?.unlocks || !BY_ID[id] || id in state.unlocks;

/** Opens whatever the sect has grown into; returns the features that are new, for telling the player. */
export function checkUnlocks(state) {
  if (!state.unlocks) return [];
  const fresh = FEATURES.filter((feature) => !(feature.id in state.unlocks) && feature.when(state));
  for (const feature of fresh) state.unlocks[feature.id] = state.day;
  return fresh;
}

/** What has yet to open, for the list in the leader's handbook. */
export const stillToCome = (state) => (state.unlocks ? FEATURES.filter((feature) => !(feature.id in state.unlocks)) : []);
