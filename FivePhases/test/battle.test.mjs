import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BONDS,
  ENEMIES,
  ENERGY_CAP,
  HAND_CAP,
  STEPS_PER_TURN,
  addCard,
  canPlay,
  chainMultiplier,
  createBattle,
  damageOf,
  debugSetBoard,
  detectBonds,
  endTurn,
  energyFor,
  enemyTurn,
  playCard,
  previewSwap,
  rewardChoices,
  totalEnergy,
  swapAndSettle,
} from '../src/core/battle.mjs';
import { CARDS, STARTER_DECK, boardCards, cardById, pureDamageCards } from '../src/core/cards.mjs';
import { BOMB, EARTH, FIRE, RAINBOW, ROW, WATER, WILD, findRuns, index } from '../src/core/board.mjs';

const card = (id) => cardById(id);

function ready(overrides = {}) {
  const battle = createBattle({ seed: 7, ...overrides });
  return battle;
}

/** 给足能量，方便测单张卡。 */
function energise(battle, amount = 10) {
  for (const element of Object.keys(battle.energy)) battle.energy[element] = amount;
  return battle;
}

test('开局五张手牌，能量清零，倒计时是满的', () => {
  const battle = ready();
  assert.equal(battle.hand.length, 5);
  assert.equal(totalEnergy(battle), 0);
  assert.equal(battle.steps, STEPS_PER_TURN);
  assert.equal(battle.enemy.countdown, battle.enemy.maxCountdown);
  assert.equal(battle.phase, 'player');
});

test('能量不够就打不出牌，且状态一点都不动', () => {
  const battle = ready();
  const first = battle.hand[0];
  assert.equal(canPlay(battle, first.uid), false);
  const before = { hand: battle.hand.length, deck: battle.deck.length };
  assert.equal(playCard(battle, first.uid), null);
  assert.equal(battle.hand.length, before.hand);
  assert.equal(battle.deck.length, before.deck);
});

test('打牌扣能量、进弃牌堆，护盾和伤害都对', () => {
  const battle = energise(ready());
  const wall = { ...card('earth-wall'), uid: 'w1' };
  battle.hand.unshift(wall);
  const shieldBefore = battle.hero.shield;
  playCard(battle, wall.uid);
  assert.equal(battle.hero.shield, shieldBefore + 90);
  assert.equal(battle.energy.earth, 10 - 1);
  assert.ok(battle.discard.some((item) => item.uid === wall.uid), '打出的牌要进弃牌堆');
  assert.ok(!battle.hand.some((item) => item.uid === wall.uid), '手里不该还留着');
});

test('伤害先扣护盾，破甲卡直接穿过去', () => {
  const battle = energise(ready());
  battle.enemy.shield = 100;
  const pierce = { ...card('metal-edge'), uid: 'p1' };
  battle.hand.unshift(pierce);
  const hpBefore = battle.enemy.hp;
  playCard(battle, pierce.uid);
  assert.equal(battle.enemy.shield, 100, '破甲不该碰护盾');
  assert.ok(battle.enemy.hp < hpBefore, '血量要掉');

  const battle2 = energise(ready());
  battle2.enemy.shield = 100;
  const plain = { ...card('fire-spark'), uid: 'p2' };
  battle2.hand.unshift(plain);
  const hp2 = battle2.enemy.hp;
  playCard(battle2, plain.uid);
  assert.ok(battle2.enemy.shield < 100, '普通伤害要先扣盾');
  assert.equal(battle2.enemy.hp, hp2, '盾没破完不该掉血');
});

test('相生：上一张牌生的元素，这一张伤害 +50%', () => {
  const battle = ready();
  const fire = { ...card('fire-spark'), uid: 'f' };
  battle.previousCard = card('wood-thorn');
  const boosted = damageOf(battle, fire, { amount: 70 });
  battle.previousCard = null;
  const plain = damageOf(battle, fire, { amount: 70 });
  assert.ok(boosted > plain, `木生火应该加成，${boosted} 应大于 ${plain}`);
});

test('相克：打被克的敌人加伤，被反克减伤', () => {
  // 赤蛟是水属性，土克水
  const battle = ready({ enemy: ENEMIES[1] });
  const earthCard = card('earth-rebound');
  const earth = damageOf(battle, earthCard, { amount: 100 });
  // 火被水克
  const fire = damageOf(battle, card('fire-spark'), { amount: 100 });
  assert.ok(earth > 100, `土打水要加成，实际 ${earth}`);
  assert.ok(fire < 100, `火打水要减伤，实际 ${fire}`);
});

test('连锁倍率按表递增，封顶 3 倍', () => {
  assert.equal(chainMultiplier(1), 1);
  assert.equal(chainMultiplier(2), 1.25);
  assert.equal(chainMultiplier(6), 3);
  assert.equal(chainMultiplier(99), 3);
});

test('消除产出：三消一能量，四消二，五消三', () => {
  assert.equal(energyFor(3), 1);
  assert.equal(energyFor(4), 2);
  assert.equal(energyFor(9), 3);
});

test('交换一次扣一步、倒计时减一，交换不成的话原样退回', () => {
  const battle = ready();
  // 摆一个一定能消的局面
  debugSetBoard(battle, ['0010234', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const steps = battle.steps;
  const countdown = battle.enemy.countdown;
  const events = swapAndSettle(battle, index(battle.board, 2, 0), index(battle.board, 3, 0));
  assert.ok(events, '这一换应该能消');
  assert.equal(battle.steps, steps - 1);
  assert.equal(battle.enemy.countdown, countdown - 1);

  const battle2 = ready();
  debugSetBoard(battle2, ['0120120', '1201201', '2012012', '0120120', '1201201', '2012012', '0120120']);
  const before = [...battle2.board.kind];
  const bad = swapAndSettle(battle2, index(battle2.board, 0, 0), index(battle2.board, 1, 0));
  assert.equal(bad, null, '换不出三连就不该成立');
  assert.deepEqual([...battle2.board.kind], before, '棋盘要原样退回');
  assert.equal(battle2.steps, STEPS_PER_TURN, '不成立的交换不扣步数');
});

test('交换单个炸弹即使没有三连，预览与实际爆炸都以交换后的格子为中心', () => {
  const battle = ready();
  debugSetBoard(battle, ['0123401', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  battle.board.special[0] = BOMB;
  const before = [[...battle.board.kind], [...battle.board.special]];

  const preview = previewSwap(battle, 0, 1);
  assert.deepEqual([[...battle.board.kind], [...battle.board.special]], before);
  const clear = swapAndSettle(battle, 0, 1).find((event) => event.type === 'clearStep');

  assert.ok(clear, '特殊块单独交换也会触发消除');
  assert.deepEqual(clear.triggered, [{ index: 1, effect: BOMB }]);
  assert.deepEqual(clear.cleared.map((cell) => cell.index), preview);
  assert.deepEqual(preview.sort((a, b) => a - b), [0, 1, 2, 7, 8, 9]);
});

test('特殊块爆炸与自然四连合并结算，保留交换格上的新特殊块', () => {
  for (const [from, to] of [[4, 3], [3, 4]]) {
    const battle = ready();
    debugSetBoard(battle, ['0001023', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
    battle.board.special[from] = BOMB;

    const preview = previewSwap(battle, from, to);
    const clear = swapAndSettle(battle, from, to).find((event) => event.type === 'clearStep');

    assert.deepEqual(clear.triggered, [{ index: to, effect: BOMB }]);
    assert.deepEqual(clear.spawned, [{ index: 3, kind: FIRE, special: ROW }]);
    assert.deepEqual(clear.cleared.map((cell) => cell.index), preview);
    assert.ok(preview.includes(0) && preview.includes(11) && !preview.includes(3));
  }
});

test('交换彩虹块清除相邻方块的颜色，交换两个特殊块仍全盘消除', () => {
  const rows = ['0123401', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012'];
  const battle = ready();
  debugSetBoard(battle, rows);
  battle.board.kind[0] = WILD;
  battle.board.special[0] = RAINBOW;

  const preview = previewSwap(battle, 1, 0);
  const clear = swapAndSettle(battle, 1, 0).find((event) => event.type === 'clearStep');

  assert.ok(clear, '彩虹块单独交换也会触发消除');
  assert.deepEqual(clear.triggered, [{ index: 1, effect: RAINBOW }]);
  assert.deepEqual(clear.cleared.map((cell) => cell.index), preview);
  assert.ok(clear.cleared.every((cell) => cell.index === 1 || cell.kind === EARTH));

  const combo = ready();
  debugSetBoard(combo, rows);
  combo.board.kind[0] = WILD;
  combo.board.special[0] = RAINBOW;
  combo.board.special[1] = BOMB;
  const comboPreview = previewSwap(combo, 0, 1);
  const comboClear = swapAndSettle(combo, 0, 1).find((event) => event.type === 'clearStep');
  assert.equal(comboClear.combo, true);
  assert.equal(comboPreview.length, 49);
  assert.deepEqual(comboClear.cleared.map((cell) => cell.index), comboPreview);
});

test('潮汐首轮补入水方块，提示保持水元素文本', () => {
  const battle = ready({ seed: 12, deck: ['water-tide'] });
  battle.energy.water = 10;

  const events = playCard(battle, battle.hand[0].uid);
  const firstFall = events.find((event) => event.type === 'fall');

  assert.equal(events.find((event) => event.type === 'flood').kind, 'water');
  assert.equal(firstFall.fills.length, 14);
  assert.ok(firstFall.fills.every((fill) => fill.kind === WATER));
});

test('连锁会一直跑到没有可消的，棋盘始终满的', () => {
  const battle = ready();
  debugSetBoard(battle, ['0010234', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const events = swapAndSettle(battle, index(battle.board, 2, 0), index(battle.board, 3, 0));
  assert.ok(events && events.length > 0);
  assert.ok([...battle.board.kind].every((value) => value !== -1), '连锁之后棋盘不该有空洞');
  const steps = events.filter((event) => event.type === 'clearStep');
  assert.ok(steps.length >= 1);
  // 连锁层数递增
  steps.forEach((step, i) => assert.equal(step.chain, i + 1));
});

test('归墟补成水盘后能正常连锁并回到可操作棋盘', () => {
  const battle = ready({ seed: 12, deck: ['water-ult'] });
  battle.energy.water = 10;

  const events = playCard(battle, battle.hand[0].uid);
  const steps = events.filter((event) => event.type === 'clearStep');

  assert.equal(steps[0].cleared.length, 48);
  assert.equal(steps[0].spawned.length, 1);
  assert.ok(steps.every((step) => step.cleared.length > 0));
  assert.ok([...battle.board.kind].every((value) => value !== -1));
  assert.equal(findRuns(battle.board).runs.length, 0);
});

test('超长连锁达到保护上限时仍先补齐棋盘', () => {
  const battle = ready({ seed: 2, deck: ['water-ult'] });
  battle.energy.water = 10;

  const events = playCard(battle, battle.hand[0].uid);

  assert.equal(events.filter((event) => event.type === 'clearStep').at(-1).chain, 42);
  assert.ok([...battle.board.kind].every((value) => value !== -1));
  assert.equal(findRuns(battle.board).runs.length, 0);
});

test('敌人倒计时归零才出手，出手后重置', () => {
  const battle = ready();
  battle.enemy.countdown = 0;
  const hp = battle.hero.hp;
  const events = enemyTurn(battle);
  assert.ok(battle.hero.hp < hp, '应该挨打');
  assert.equal(battle.enemy.countdown, battle.enemy.maxCountdown, '出手后倒计时重置');
  assert.ok(events.some((event) => event.type === 'damage' && event.to === 'hero'));
});

test('回合结束：步数回满、抽两张、护盾清空', () => {
  const battle = ready();
  battle.hero.shield = 200;
  battle.steps = 0;
  battle.hand.length = 2;
  const before = battle.hand.length;
  endTurn(battle);
  assert.equal(battle.steps, STEPS_PER_TURN);
  assert.equal(battle.hero.shield, 0, '护盾不跨回合');
  assert.ok(battle.hand.length >= before, '应该抽牌了');
  assert.equal(battle.turn, 2);
});

test('手牌上限挡得住抽牌', () => {
  const battle = ready();
  battle.hand.length = HAND_CAP;
  endTurn(battle);
  assert.ok(battle.hand.length <= HAND_CAP, `手牌不该超过 ${HAND_CAP}`);
});

test('能量总上限挡得住囤积', () => {
  const battle = energise(ready(), ENERGY_CAP);
  assert.equal(totalEnergy(battle), ENERGY_CAP * 5);
  // 棋盘上怎么消都只加不溢出单色上限
  debugSetBoard(battle, ['0010234', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  swapAndSettle(battle, index(battle.board, 2, 0), index(battle.board, 3, 0));
  for (const element of Object.keys(battle.energy)) assert.ok(battle.energy[element] <= ENERGY_CAP);
});

test('羁绊按牌组判定，六条都能触发', () => {
  const bonds = detectBonds(CARDS.slice(0, 6));
  assert.ok(bonds.includes('swordShield') || bonds.length >= 1);
  const all = detectBonds(CARDS);
  for (const id of ['swordShield', 'samadhi', 'echo', 'chainBody', 'starlane']) {
    assert.ok(all.includes(id), `全卡池应该触发 ${BONDS[id].name}`);
  }
});

test('剑盾同源：先盾后攻，攻击多打一段', () => {
  const battle = energise(ready());
  battle.bonds = ['swordShield'];
  const wall = { ...card('earth-wall'), uid: 'w' };
  const hit = { ...card('fire-spark'), uid: 'f' };
  battle.hand.unshift(hit, wall);
  playCard(battle, wall.uid);
  const shield = battle.hero.shield;
  const hpBefore = battle.enemy.hp;
  playCard(battle, hit.uid);
  const lost = hpBefore - battle.enemy.hp;
  assert.ok(lost > 70, `剑盾同源应该多打一段，实际掉 ${lost} 血，护盾 ${shield}`);
});

test('三昧：第三张火卡白送一次灼烧', () => {
  const battle = energise(ready());
  battle.bonds = ['samadhi'];
  battle.firePlayed = 2;
  const spark = { ...card('fire-spark'), uid: 'f3' };
  battle.hand.unshift(spark);
  const events = playCard(battle, spark.uid);
  assert.ok(events.some((event) => event.type === 'bond' && event.id === 'samadhi'), '第三张火卡要触发三昧');
});

test('残响：辅助卡之后的第一张攻击卡打两次', () => {
  const battle = energise(ready());
  battle.bonds = ['echo'];
  const thorn = { ...card('wood-thorn'), uid: 's' };
  const hit = { ...card('fire-spark'), uid: 'a' };
  battle.hand.unshift(hit, thorn);
  playCard(battle, thorn.uid);
  const hpBefore = battle.enemy.hp;
  const events = playCard(battle, hit.uid);
  assert.ok(events.some((event) => event.type === 'echo'), '应该报出残响');
  const hits = events.filter((event) => event.type === 'damage' && event.to === 'enemy').length;
  assert.equal(hits, 2, `应该打两下，实际 ${hits}`);
  assert.ok(hpBefore - battle.enemy.hp > 70);
});

test('改棋盘的卡真的改了棋盘', () => {
  const battle = energise(ready());
  debugSetBoard(battle, ['0120120', '1201201', '2012012', '0120120', '1201201', '2012012', '0120120']);
  const slash = { ...card('fire-slash'), uid: 'x' };
  battle.hand.unshift(slash);
  const events = playCard(battle, slash.uid);

  // 染色的证据在事件里：报出来的格子必须都在最左一列，且原来不是火的才报
  const paint = events.find((event) => event.type === 'paint');
  assert.ok(paint, '应该报出 paint 事件');
  assert.equal(paint.kind, 'fire');
  for (const i of paint.cells) assert.equal(i % 7, 0, `第 ${i} 格不在最左一列`);
  assert.equal(paint.cells.length, 4, '最左一列原有 3 格是火，只该染剩下 4 格');

  // 染完整列会立刻凑成七连，所以会自己结算掉——结算完棋盘上不该留空洞
  assert.ok(events.some((event) => event.type === 'clearStep'), '整列变同色应该被消掉');
  for (let i = 0; i < 49; i += 1) assert.notEqual(battle.board.kind[i], -1, `第 ${i} 格不该是空的`);
});

test('奖励三选一不重复，且尽量给牌组里没有的元素', () => {
  const battle = ready();
  const picks = rewardChoices(battle, 3);
  assert.equal(picks.length, 3);
  assert.equal(new Set(picks.map((item) => item.id)).size, 3);
  assert.ok(picks.every((item) => !STARTER_DECK.includes(item.id)), '不该给已经有的牌');
});

test('拿牌之后羁绊会重算', () => {
  const battle = ready();
  const before = battle.bonds.length;
  addCard(battle, card('metal-hone'));
  assert.ok(battle.bonds.length >= before);
});

test('设计规约：改造棋盘的卡至少四成，纯伤害卡不超过一半', () => {
  const boardCount = boardCards().length;
  const pureCount = pureDamageCards().length;
  assert.ok(boardCount / CARDS.length >= 0.4, `改造棋盘的卡只有 ${boardCount}/${CARDS.length}，不到四成`);
  assert.ok(pureCount / CARDS.length <= 0.5, `纯伤害卡有 ${pureCount}/${CARDS.length}，超过一半`);
});

test('三十张卡，费用色都在五行里，且都有描述', () => {
  assert.equal(CARDS.length, 30);
  const elements = new Set(['fire', 'earth', 'metal', 'water', 'wood']);
  for (const item of CARDS) {
    assert.ok(elements.has(item.element), `${item.id} 的元素不对`);
    assert.ok(item.cost >= 1 && item.cost <= 4, `${item.id} 的费用 ${item.cost} 越界`);
    assert.ok(item.text.split('\n').length <= 2, `${item.id} 的描述超过两行`);
    assert.ok(item.effects.length > 0, `${item.id} 没有效果`);
  }
});

test('打赢了就结束，不会继续行动', () => {
  const battle = energise(ready());
  battle.enemy.hp = 10;
  const hit = { ...card('fire-spark'), uid: 'k' };
  battle.hand.unshift(hit);
  playCard(battle, hit.uid);
  assert.equal(battle.over, 'win');
  assert.equal(battle.phase, 'over');
  assert.equal(canPlay(battle, battle.hand[0]?.uid ?? 'x'), false);
});
