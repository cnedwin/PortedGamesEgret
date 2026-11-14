// What to do next. A new head of a sect is led through the work of the sect
// one matter at a time: each has something to be done, a place in the game
// where it is done, and a reward for doing it. When the last is behind them,
// what remains is the three ways the game is won.
import { membersOf, placesOf } from './world.mjs';

const levels = (state, sectId) => placesOf(state, sectId).reduce((sum, id) => sum + state.places[id].buildings.reduce((s, b) => s + b.level, 0), 0);

/**
 * The matters, in order. `count` reports how far along the sect is, as
 * [now, wanted]; `go` is where in the game the thing is done, for whoever
 * draws the screen: a page, and perhaps a sheet to open there.
 */
export const GOALS = [
  { id: 'time', title: '开门立派', text: '日子不走，万事不动。让时间流转起来，过完头一旬。', how: '点右上角的「行」', count: (s) => [Math.min(10, s.day), 10], gives: { silver: 200 } },
  { id: 'recruit', title: '广纳门徒', text: '招贤榜前常有人求见。会一会他们，把门下添到十二人。', how: '山门 · 招贤榜 · 会见', go: { page: 'seat' }, count: (s, id) => [membersOf(s, id).length, 12], gives: { silver: 300, grain: 40 } },
  { id: 'build', title: '大兴土木', text: '新建一座建筑，或把现有的升上一级。', how: '山门 · 兴建建筑，或点画面上的建筑名', go: { page: 'seat', sheet: 'build' }, count: (s, id) => [Math.max(0, levels(s, id) - (s.goals.base ?? 0)), 1], gives: { silver: 400 } },
  { id: 'master', title: '因材施教', text: '让一名弟子拜在长老或掌门门下，练功事半功倍。', how: '弟子 · 选一人 · 拜师', go: { page: 'disciples' }, count: (s, id) => [membersOf(s, id).some((p) => p.master) ? 1 : 0, 1], gives: { renown: 15 } },
  { id: 'shop', title: '开源', text: '在山下开一间店铺，每旬有银两进账，还能代售门中出产。', how: '山门 · 此地 · 开设店铺', go: { page: 'seat' }, count: (s, id) => [placesOf(s, id).reduce((sum, p) => sum + s.places[p].shops, 0), 1], gives: { silver: 500 } },
  { id: 'renown', title: '威名初显', text: '威望到二百。布施、登擂、处置奇遇得当，名声自然传开。', how: '战阵 · 擂台，或山门 · 布施', go: { page: 'battle' }, count: (s, id) => [Math.floor(s.sects[id].renown), 200], gives: { silver: 500, grain: 60 } },
  { id: 'second', title: '开枝散叶', text: '再占一处据点：无主之地可以直接开设分舵，有主的要打下来。', how: '江湖 · 点相邻的据点', go: { page: 'world' }, count: (s, id) => [placesOf(s, id).length, 2], gives: { silver: 800, renown: 20 } },
  { id: 'friend', title: '远交', text: '与一个门派把关系处到四十，两家之间的路就成了商路。', how: '江湖 · 门派往来 · 馈赠', go: { page: 'world', sheet: 'diplomacy' }, count: (s, id) => [Math.max(0, Math.floor(Math.max(...Object.values(s.sects[id].relations ?? { x: 0 })))), 40], gives: { silver: 600 } },
  { id: 'many', title: '门下济济', text: '门人到二十。厢房不够就添，粮草要跟得上。', how: '山门 · 招贤榜；厢房决定住得下多少人', go: { page: 'seat' }, count: (s, id) => [membersOf(s, id).length, 20], gives: { silver: 800, grain: 80 } },
  { id: 'realm', title: '三分天下', text: '手握四处据点，便是一方之雄。', how: '江湖 · 出兵或开设分舵', go: { page: 'world' }, count: (s, id) => [placesOf(s, id).length, 4], gives: { silver: 1500, renown: 40 } },
  { id: 'fame', title: '威震江湖', text: '威望到五百。到了这一步，武林大会上便有人推举你了。', how: '多行义举，多打胜仗', go: { page: 'chronicle' }, count: (s, id) => [Math.floor(s.sects[id].renown), 500], gives: { silver: 2000 } },
];
/** What is shown once every matter is behind the sect. */
export const LAST_WORD = { title: '问鼎江湖', text: '一统天下、武林大会推为盟主、受朝廷封赏——三者成其一，便是功成。', how: '江湖 · 纪事' };

/** Begins the list for a world's player. Called once, when the world is made. */
export function startGoals(state) {
  state.goals = { index: 0, base: levels(state, state.playerSect) };
}

/**
 * The matter in hand: `{ id, title, text, how, go, now, wanted, done, gives, step, steps }`,
 * or `{ last: true, ... }` when all are done, or null for a world without a list.
 */
export function goalView(state) {
  if (!state.goals) return null;
  const goal = GOALS[state.goals.index];
  if (!goal) return { last: true, ...LAST_WORD };
  const [now, wanted] = goal.count(state, state.playerSect);
  return { ...goal, now: Math.min(now, wanted), wanted, done: now >= wanted, step: state.goals.index + 1, steps: GOALS.length };
}

/** Takes the reward for the matter in hand, if it is done, and moves on to the next. */
export function claimGoal(state) {
  const view = goalView(state);
  if (!view || view.last || !view.done) return { ok: false, why: '此事未了' };
  const books = state.sects[state.playerSect];
  for (const [key, amount] of Object.entries(view.gives)) books[key] += amount;
  state.goals.index += 1;
  // What is built from here on counts towards the next time building is asked for.
  state.goals.base = levels(state, state.playerSect);
  return { ok: true, gives: view.gives, title: view.title };
}
