// 五行牌阵 · 入口：把逻辑层的事件表翻译成演出。
//
// 这一层只做四件事：
//   1. 搭台——背景、立绘、棋盘；
//   2. 收输入——拖相邻两格、点选两格、点手牌、结束回合；
//   3. 演事件——把 battle.mjs 吐出来的事件表排进演出队列；
//   4. 走流程——三关、奖励三选一、胜负。
//
// 一条纪律：**这里只读 battle 的状态，绝不改它。**
// 一旦表现层开始顺手改状态，就会出现"动画播完了但数据没变"或反过来的一类 bug，
// 而且查起来毫无线索——因为真相有两个地方在写。
//
// 演出是串行的：队列非空时锁输入。玩家连点会把几段演出叠在一起，
// 画面立刻变成一团乱麻（设计文档 10.2）。

import { Bitmap, DisplayObjectContainer, Sprite } from '@egret/engine';
import { play as enginePlay } from '@egret/engine/play';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createUiTester } from '@egret/engine/ui/testing';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

import { BONDS, ENEMIES, addCard, canPlay, createBattle, endTurn, playCard, previewSwap, rewardChoices, swapAndSettle } from './core/battle.mjs';
import { ELEMENT_INFO, ELEMENT_ORDER, STARTER_DECK } from './core/cards.mjs';
import { ATLAS_PORTRAITS, loadPortraitAtlas } from './portrait/atlas.mjs';
import { createHud } from './ui/hud.mjs';
import { createBoardInput } from './view/board-input.mjs';
import { createAudio } from './view/audio.mjs';
import { cascadeTempo, createBoardView } from './view/board-view.mjs';
import { PALETTE } from './view/draw.mjs';
import { createFx } from './view/fx.mjs';
import { BOARD, ENEMY_SPOT, ENERGY_SLOTS, HERO_SPOT, STAGE, cellCentre } from './view/layout.mjs';
import { buildPortrait } from './view/portrait.mjs';
import { createSequence, ease } from './view/sequence.mjs';
import { createTilePainter } from './view/tile-atlas.mjs';

const canvas = document.querySelector('#stage');
const stageBox = document.querySelector('#stage-box');
const semantics = createUiSemantics({ maxNodes: 2048 });
let boardInput, titleArt, battleArt, ready = false;
let currentRewards = [];

const audio = createAudio();
const sequence = createSequence();

/** 震屏开关：系统设了"减少动态效果"就关掉。 */
let shakeOn = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const shake = (power, seconds) => {
  if (shakeOn) fx?.shake(power, seconds);
};

// ── 状态 ────────────────────────────────────────────────────────
// battle 是唯一真相；view / hud / fx 都是它的投影。
let battle = null;
let view = null;
let hud = null;
let fx = null;
let hero = null;
let enemy = null;
let enemySprite = null;
const enemyRigs = new Map();
const heroMotion = { name: 'idle', time: 0 };
const enemyMotion = { name: 'idle', time: 0 };
const bossAttacks = {
  shanjiao: { label: '山魈·沉肩', cue: 'guard', kind: 'wood', shake: 12 },
  chijiao: { label: '赤蛟·卷潮', cue: 'cast', kind: 'water', shake: 15 },
  hundun: { label: '混沌·踏阵', cue: 'boom', kind: 'earth', shake: 19 },
};
let lastImpact = null;
let vitals = null;
let enemyStrike = null;
let world = null;
let boardLayer = null;
let paintTile = null;
let fxLayer = null;
let flashLayer = null;
/** 引擎的 Scope：所有显示对象都登记在它下面，关页面时统一回收。 */
let gameScope = null;
/** 引擎给的那个冻结对象，报错重启帧循环时要用。 */
let runtime = null;

/** 一局（三关）的进度：打到第几关、还剩多少气血、额外拿到的牌。 */
let run = null;
/** 覆盖层锁：'title' / 'reward' / 'over' / 'pending' / null。非 null 时输入全关。 */
let lock = 'title';

// One portrait canvas: the engine uses the same design units for board art, UI and input.

// ── 背景 ────────────────────────────────────────────────────────
function paintBackdrop(g) {
  g.beginFill(0x080705, 0.52).drawEllipse(360, 309, 318, 36).endFill();
  const side = BOARD.cell * BOARD.size;
  g.beginFill(0x41352a, 0.96).drawRoundRect(BOARD.x - 15, BOARD.y - 15, side + 30, side + 30, 28).endFill();
  g.beginFill(0x9b7950, 0.86).drawRoundRect(BOARD.x - 11, BOARD.y - 11, side + 22, side + 22, 22).endFill();
  g.beginFill(0x11191b, 0.98).drawRoundRect(BOARD.x - 8, BOARD.y - 8, side + 16, side + 16, 18).endFill();
}

// ── 搭台 ────────────────────────────────────────────────────────
function coverBitmap(parent, scope, lease, verticalAlignment = 0.5) {
  const node = parent.addChild(scope.use(new Bitmap(lease)));
  const { width, height } = lease.value;
  const scale = Math.max(STAGE.width / width, STAGE.height / height);
  node.scaleX = node.scaleY = scale;
  node.x = (STAGE.width - width * scale) / 2;
  node.y = (STAGE.height - height * scale) * verticalAlignment;
  return node;
}

function buildScene(game, atlases, arenaTexture, titleTexture) {
  const { world: stage, scope } = game;
  battleArt = stage.addChild(scope.use(new DisplayObjectContainer()));
  coverBitmap(battleArt, scope, arenaTexture);

  // 背景和整屏闪光固定在舞台上，避免震屏把贴边三角形裁成极细的碎片。
  const backdrop = battleArt.addChild(scope.use(new Sprite()));
  paintBackdrop(backdrop.graphics);
  world = battleArt.addChild(scope.use(new DisplayObjectContainer()));

  const enemyLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  for (const id of ENEMIES.map((entry) => entry.id)) {
    const rig = buildPortrait({ ...atlases.get(id), Bitmap, Sprite, scope });
    rig.holder.visible = false;
    enemyLayer.addChild(rig.holder);
    enemyRigs.set(id, rig);
  }

  const heroLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  hero = buildPortrait({ ...atlases.get('fire'), Bitmap, Sprite, scope });
  heroLayer.addChild(hero.holder);
  hero.place(HERO_SPOT.x, HERO_SPOT.y, HERO_SPOT.width / hero.width);

  boardLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  fxLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  flashLayer = battleArt.addChild(scope.use(new DisplayObjectContainer()));
  fx = createFx({ Sprite, scope, world, layer: fxLayer, flashLayer });

  titleArt = stage.addChild(scope.use(new DisplayObjectContainer()));
  coverBitmap(titleArt, scope, titleTexture, 0.38);
  // Same dark-jade fade as the original cover, now rendered by Egret.
  const shade = titleArt.addChild(scope.use(new Sprite()));
  const stops = [[0, 0.18], [0.27, 0], [0.42, 0], [0.56, 0.25], [0.74, 0.85], [0.92, 0.98], [1, 1]];
  for (let i = 0; i < 72; i++) {
    const t = (i + .5) / 72;
    const b = stops.findIndex(row => row[0] >= t);
    const a = stops[Math.max(0,b-1)], z = stops[b];
    const alpha = a[1] + (z[1]-a[1]) * ((t-a[0]) / Math.max(.0001,z[0]-a[0]));
    const y = i * STAGE.height / 72;
    shade.graphics.beginFill(0x0d1715, alpha).drawRect(0, y, STAGE.width, STAGE.height / 72 + .1).endFill();
  }
  titleArt.visible = false;
}

// ── 一局的开始与结束 ────────────────────────────────────────────

function paintEnemy(id) {
  if (enemy) enemy.holder.visible = false;
  enemy = enemyRigs.get(id);
  enemySprite = enemy.holder;
  const { x, y, width } = ENEMY_SPOT.placement[id];
  enemy.place(x, y, width / enemy.width);
  enemySprite.alpha = 1;
  enemySprite.visible = true;
  setMotion(enemyMotion, 'idle');
  setMotion(heroMotion, 'idle');
  hero.place(HERO_SPOT.x, HERO_SPOT.y, HERO_SPOT.width / hero.width);
}

function startBattle(index) {
  sequence.clear();
  fx.clear();
  clearSelection();
  closeAttackCue();
  lastImpact = null;
  vitals = null;
  enemyStrike = null;

  battle = createBattle({
    seed: (Date.now() ^ (index * 7919)) >>> 0,
    deck: [...STARTER_DECK, ...run.extra],
    enemy: ENEMIES[index],
    heroHp: run.heroHp,
  });

  boardLayer.removeChildren();
  view = createBoardView({
    battle,
    Sprite,
    scope: gameScope,
    layer: boardLayer,
    geometry: { x: BOARD.x, y: BOARD.y, cell: BOARD.cell },
    paintTile,
  });

  paintEnemy(battle.enemy.id);
  if (lock !== 'title') audio.setScene(battle.enemy.id);
  hud.resetHand();
  hud.render(battle);
  hud.banner(`${battle.enemy.name}　${battle.enemy.title}`, 1700);
}

/** A native page or modal owns the input; the board stays untouched beneath it. */
function hideOverlays() {
  boardInput?.cancel();
  hud.hideOverlays();
  if (titleArt) titleArt.visible = false;
  if (battleArt) battleArt.visible = true;
}

function beginRun() {
  hideOverlays();
  run = { index: 0, heroHp: 1000, extra: [], bestChain: 0 };
  lock = null;
  startBattle(0);
}

/** 打完一关：先让演出把最后一帧画完，再切界面。 */
function endOfBattle() {
  run.bestChain = Math.max(run.bestChain, battle.bestChain);
  const won = battle.over === 'win';
  lock = 'pending';
  setMotion(heroMotion, won ? 'win' : 'lose');
  setMotion(enemyMotion, won ? 'lose' : 'win');
  if (won) {
    run.heroHp = Math.max(1, Math.round(battle.hero.hp));
    audio.win();
    fx.burst(ENEMY_SPOT.x, ENEMY_SPOT.y, null, 20);
    fx.flash(0.18, 0.25);
  } else {
    audio.lose();
    fx.flash(0.28, 0.3);
  }
  const duration = Math.max(hero.clips[heroMotion.name].duration, enemy.clips[enemyMotion.name].duration);
  sequence.wait(duration * 1000);
  sequence.call(() => {
    if (won && run.index < ENEMIES.length - 1) showReward();
    else showOver(battle.over);
  });
}

function showReward() {
  lock = 'reward';
  boardInput?.cancel();
  currentRewards = rewardChoices(battle, 3);
  hud.showReward({enemyName: battle.enemy.name, heroHp: run.heroHp, cards: currentRewards});
}

function chooseReward(id) {
  if (lock !== 'reward') return;
  const card = currentRewards.find(item => item.id === id);
  if (!card) return;
  audio.unlock();
  audio.reward();
  run.extra.push(card.id);
  addCard(battle, card);
  nextBattle();
}

function nextBattle() {
  hideOverlays();
  run.index += 1;
  lock = null;
  startBattle(run.index);
}

function showOver(result) {
  lock = 'over';
  boardInput?.cancel();
  audio.setScene(null);
  hud.showOver({ result, index: run.index, enemyName: battle.enemy.name, heroHp: Math.round(battle.hero.hp), bestChain: run.bestChain });
}

// ── 锁 ──────────────────────────────────────────────────────────
const locked = () => lock !== null || hud?.modalOpen || !battle || sequence.busy || battle.phase !== 'player' || battle.over !== null;

// ── 演出：事件表 → 画面 ─────────────────────────────────────────
//
// 按事件顺序排入队列。格子归属在各段开始或完成时更新，让下落能接上
// 前一段刚生成的特殊块，也让下一次消除找到已经落定的方块。

function playEnergy(event) {
  const index = ELEMENT_ORDER.indexOf(event.element);
  const slot = ENERGY_SLOTS[index] ?? ENERGY_SLOTS[0];
  const from = event.from >= 0 ? cellCentre(event.from) : { x: STAGE.width / 2, y: BOARD.y + 40 };
  sequence.call(() => {
    fx.orb(from, slot, index, {
      ms: 280,
      onArrive: () => {
        hud.pulse(event.element);
        renderBattle();
      },
    });
  });
  // 球是并行飞的，不进队列等它——不然每消一次都要多等小半秒
}

function snapshotVitals() {
  const { hero, enemy, turn, steps } = battle;
  return { hero: { hp: hero.hp, shield: hero.shield }, enemy: { hp: enemy.hp, shield: enemy.shield }, turn, steps };
}

// 逻辑已结算。画面上的血条和护盾沿演出队列逐次结算。
const renderBattle = () => hud.render(battle, {
  vitals: vitals ?? battle,
  resolving: vitals !== null,
  enemyStrike,
});

function play(events, before) {
  vitals = before;
  const incoming = events.find((event) => event.type === 'damage' && event.to === 'hero');
  // 本次攻击播完再显示下一招和新回合，避免上下两处分别显示两招。
  enemyStrike = incoming ? { name: incoming.source, damage: incoming.total } : null;
  renderBattle();
  const tempo = cascadeTempo(events);
  let strikeCard = null;

  for (const event of events) {
    switch (event.type) {
      case 'swap':
        view.playSwap(event, sequence);
        sequence.call(() => audio.swap());
        break;

      case 'combo':
        sequence.call(() => {
          audio.combo();
          fx.flash(0.55, 0.3);
          shake(20, 0.5);
        });
        break;

      case 'clearStep': {
        const chain = event.chain ?? 1;
        const durationScale = tempo(chain);
        view.playClear(event, sequence, fx, durationScale);
        // 快速连锁每三层报一次节拍，避免音效与反馈动画密集重叠。
        if (durationScale === 1 || chain % 3 === 0) {
          sequence.call(() => {
            audio.clear(chain);
            if (chain >= 2) hud.chain(chain);
            if (event.combo) shake(16, 0.4);
            else shake(2 + Math.min(chain, 6) * 2.2, 0.16);
          });
        }
        break;
      }

      case 'fall':
        view.playFall(event, sequence, tempo(event.chain));
        break;

      case 'paint':
        view.playRepaint(event, sequence);
        sequence.call(() => audio.guard());
        break;

      case 'clear':
        view.playCleared(event, sequence, fx);
        sequence.call(() => audio.boom());
        break;

      case 'flood':
        sequence.call(() => hud.banner(`水淹全场　落下的都是${ELEMENT_INFO[event.kind]?.name ?? '同色'}`, 1300));
        break;

      case 'energy':
        playEnergy(event);
        break;

      case 'cast':
        if (events.some((entry) => entry.type === 'damage' && entry.to === 'enemy' && entry.source === event.card.name)) {
          strikeCard = event.card;
        } else {
          queueAttack(hero, heroMotion, () => audio.cast(Boolean(event.card.ult)));
        }
        break;

      case 'echo':
        sequence.call(() => hud.banner('残响　再触发一次', 900));
        break;

      case 'bond': {
        const bond = BONDS[event.id];
        sequence.call(() => hud.banner(bond ? `${bond.name}　触发` : event.id, 1000));
        break;
      }

      case 'damage':
        if (strikeCard?.name === event.source && event.to === 'enemy') {
          const card = strikeCard;
          queueAttack(hero, heroMotion, () => audio.cast(Boolean(card.ult)), () => showImpact(event));
          strikeCard = null;
        } else if (event.to === 'hero') {
          const boss = bossAttacks[battle.enemy.id];
          queueAttack(enemy, enemyMotion, () => {
            hud.attackCue(boss.label + '　' + event.source, battle.enemy.id);
            audio[boss.cue]();
          }, () => showImpact(event, boss));
        } else {
          sequence.call(() => showImpact(event));
          sequence.wait(130);
        }
        break;

      case 'absorb':
        // 核心紧接着发出 damage，护盾和伤害数字共用它的命中关键帧。
        break;

      case 'shield':
        sequence.call(() => {
          audio.guard();
          const at = event.to === 'enemy' ? enemyFloat() : heroFloat();
          vitals[event.to ?? 'hero'].shield += event.amount;
          hud.floater(`+盾 ${event.amount}`, { ...at, kind: 'shield' });
          renderBattle();
        });
        break;

      case 'heal':
        sequence.call(() => {
          if (event.amount > 0) {
            audio.heal();
            vitals.hero.hp += event.amount;
            hud.floater(`+${event.amount}`, { ...heroFloat(), kind: 'heal' });
          }
          renderBattle();
        });
        break;

      case 'regrow':
        sequence.call(() => hud.floater(`回春 ${event.amount}`, { ...heroFloat(), kind: 'heal' }));
        break;

      case 'poison':
        sequence.call(() => {
          const at = event.to === 'hero' ? heroFloat() : enemyFloat();
          hud.floater(`毒 ${event.amount}`, { ...at, kind: 'info' });
          renderBattle();
        });
        break;

      case 'poisonTick':
        sequence.call(() => {
          const at = event.to === 'hero' ? heroFloat() : enemyFloat();
          vitals[event.to].hp = Math.max(0, vitals[event.to].hp - event.amount);
          hud.floater(`-${event.amount}`, { ...at, kind: 'damage' });
          renderBattle();
        });
        sequence.wait(120);
        break;

      case 'draw':
        sequence.call(() => audio.draw());
        break;

      case 'delay':
        sequence.call(() => hud.banner(`敌人出手推迟 ${event.amount} 步`, 900));
        break;

      case 'buff':
        sequence.call(() => hud.banner('下一击加重', 900));
        break;

      case 'reshuffle':
        sequence.call(() => {
          view.reset();
          clearSelection();
          hud.banner('无解，重排', 1000);
          audio.refuse();
        });
        break;

      case 'wait':
        // 敌人这回合不动手，但要给玩家一个"它确实动过"的停顿
        sequence.call(() => hud.banner(`倒计时 ${event.countdown} 步`, 800));
        sequence.wait(240);
        break;

      case 'turn':
        sequence.call(() => {
          vitals.hero.shield = battle.hero.shield;
          renderBattle();
          audio.draw();
        });
        break;

      default:
        break;
    }
  }

  // 收尾：把界面同步到最终状态，再看要不要切场景
  sequence.call(() => {
    vitals = null;
    enemyStrike = null;
    hud.render(battle);
    if (battle.over) endOfBattle();
  });
}

const heroFloat = () => ({ x: HERO_SPOT.x + 40, y: HERO_SPOT.y - 170 });
const enemyFloat = () => ({ x: ENEMY_SPOT.x, y: ENEMY_SPOT.y - 30 });

function showImpact(event, boss) {
  const toHero = event.to === 'hero';
  const at = toHero ? heroFloat() : enemyFloat();
  const shown = vitals[event.to];
  const absorbed = event.total - event.amount;
  const attacker = toHero ? enemyMotion : heroMotion;
  lastImpact = {
    actor: toHero ? 'enemy' : 'hero', boss: battle.enemy.id,
    at: performance.now(), time: attacker.time, clip: attacker.name,
  };
  if (absorbed > 0) {
    shown.shield = Math.max(0, shown.shield - absorbed);
    hud.floater(`挡 ${absorbed}`, { ...at, x: at.x + 68, kind: 'shield' });
  }
  if (event.amount > 0) {
    setMotion(toHero ? heroMotion : enemyMotion, 'hit');
    shown.hp = Math.max(0, shown.hp - event.amount);
    hud.floater(`-${event.amount}`, { ...at, kind: 'damage' });
  }
  if (boss) {
    audio.enemyHit();
    shake(boss.shake, 0.24);
    fx.bossImpact(battle.enemy.id, at.x, at.y);
    fx.burst(at.x, at.y, ELEMENT_ORDER.indexOf(boss.kind), 10);
  } else {
    audio.hit();
    shake(event.crit ? 16 : 9, 0.22);
    fx.burst(ENEMY_SPOT.x, ENEMY_SPOT.y, null, event.crit ? 16 : 9);
    fx.ring(ENEMY_SPOT.x, ENEMY_SPOT.y, PALETTE.gold, event.crit ? 150 : 100);
  }
  renderBattle();
}

// ── 两个角色的动作 ──────────────────────────────────────────────

function setMotion(motion, name) {
  motion.name = name;
  motion.time = 0;
}

function closeAttackCue() {
  hud?.clearAttackCue();
}

/** 关键帧和命中事件一起推进，即使一帧跨过事件，也只触发一次。 */
function queueAttack(rig, motion, onWindup, onImpact) {
  const { duration, events } = rig.clips.attack;
  let marker = 0;
  sequence.tween(duration * 1000, (progress) => {
    motion.name = 'attack';
    motion.time = progress * duration;
    while (marker < events.length && events[marker][0] <= motion.time + 1e-8) {
      const [time, event] = events[marker++];
      if (event === 'windup') onWindup();
      else {
        motion.time = time;
        onImpact?.();
      }
    }
  }, {
    ease: ease.linear,
    done: () => {
      setMotion(motion, 'idle');
      if (motion === enemyMotion) closeAttackCue();
    },
  });
}

function posePortrait(rig, motion, dt) {
  if (!rig.holder.visible) return;
  const duration = rig.clips[motion.name].duration;
  if (motion.name === 'idle') motion.time = (motion.time + dt) % duration;
  else if (motion.name !== 'attack') {
    motion.time = Math.min(duration, motion.time + dt);
    if (motion.name === 'hit' && motion.time === duration) setMotion(motion, 'idle');
  }
  rig.sample(motion.name, motion.time);
}

// ── 操作 ────────────────────────────────────────────────────────

function runSwap(a, b) {
  if (locked()) return;
  clearSelection();
  const before = snapshotVitals();
  const events = swapAndSettle(battle, a, b);
  if (!events) {
    audio.refuse();
    return;
  }
  play(events, before);
}

function tryPlay(uid) {
  if (locked()) return;
  const card = battle.hand.find((item) => item.uid === uid);
  if (!card) return;

  if (!canPlay(battle, uid)) {
    audio.refuse();
    const missing = card.cost - battle.energy[card.element];
    hud.floater(`还差 ${missing} 点${ELEMENT_INFO[card.element].name}能量`, {
      x: STAGE.width / 2,
      y: 780,
      kind: 'info',
    });
    hud.pulse(card.element);
    return;
  }

  const before = snapshotVitals();
  const events = playCard(battle, uid);
  if (events) play(events, before);
}

function tryEndTurn() {
  if (locked()) return;
  clearSelection();
  const before = snapshotVitals();
  const events = endTurn(battle);
  play(events, before);
}

// 拖动 / 点选
let selected = -1;
let highlighted = [];

function clearSelection() {
  if (view && highlighted.length) view.highlight(highlighted, false);
  highlighted = [];
  selected = -1;
}

function select(cell) {
  clearSelection();
  if (cell < 0) return;
  selected = cell;
  highlighted = [cell];
  view.highlight(highlighted, true);
}

/** 沿拖动方向取邻格；越界返回 -1。 */
function neighbourOf(cell, dx, dy) {
  const size = BOARD.size;
  const col = cell % size;
  const row = Math.floor(cell / size);
  if (Math.abs(dx) > Math.abs(dy)) {
    const next = col + (dx > 0 ? 1 : -1);
    return next < 0 || next >= size ? -1 : row * size + next;
  }
  const next = row + (dy > 0 ? 1 : -1);
  return next < 0 || next >= size ? -1 : next * size + col;
}

function isNeighbour(a, b) {
  const size = BOARD.size;
  const ax = a % size;
  const ay = Math.floor(a / size);
  const bx = b % size;
  const by = Math.floor(b / size);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

function bindTouch(game) {
  const hit = game.world.addChild(game.scope.use(new Sprite()));
  const side = BOARD.cell * BOARD.size;
  // A nearly-transparent native hit area, never a DOM overlay.
  hit.graphics.beginFill(0xffffff, .001).drawRect(BOARD.x, BOARD.y, side, side).endFill();
  hit.touchEnabled = true;
  boardInput = createBoardInput({
    cellAt: (x,y) => view?.cellAt(x,y) ?? -1,
    acceptTarget: target => target === hit,
    locked, selected: () => selected, select, clear: clearSelection,
    neighbour: neighbourOf, adjacent: isNeighbour, reach: BOARD.cell * .4,
    preview: (a,b) => {
      highlighted = previewSwap(battle, a, b);
      if (highlighted.length) view.highlight(highlighted, true);
    },
    swap: runSwap, unlock: audio.unlock
  });
  const stop = game.browser.pointer.observe(boardInput.contact);
  game.scope.use({ dispose: stop });
}

// ── 启动 ────────────────────────────────────────────────────────

function describe(cause) {
  const parts = [];
  for (let at = cause; at && parts.length < 5; at = at.cause) parts.push(String(at.code ?? at.message ?? at));
  return parts.join(' ← ');
}

// Keep unknown/update failures strict. Only a specifically observed transient
// WebGL2 geometry-budget preparation refusal can retry the render.
function report(cause) {
  console.error(`引擎报错：${describe(cause)}`, cause);
}
function retryGeometry(cause, attempt) {
  for(let error=cause, depth=0;error&&depth<8;error=error.cause,depth++){
    if(error.code==='WEBGL2_GEOMETRY_RANGE' && /Geometry preparation budget/i.test(String(error.cause?.message??error.cause??''))){
      console.warn(`渲染准备预算拒绝，重试第 ${attempt} 次`);
      return true;
    }
  }
  return false;
}

async function boot() {
  const game = await enginePlay({
    canvas, parent: stageBox,
    width: STAGE.width, height: STAGE.height,
    background: 0x101b19,
    pixelRatio: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    backend: 'webgl2', fit: 'contain', audio: false, semantics,
    setup(made) {
      runtime = made.browser;
      gameScope = made.scope;
      hud = createHud({
        game: made, audio, onCard: tryPlay, onEndTurn: tryEndTurn,
        onStart: start, onRestart: start, onReward: chooseReward,
        onSkip: () => { if (lock === 'reward') { audio.unlock(); audio.ui(); nextBattle(); } },
        onToggleMute: () => { audio.unlock(); audio.toggleMute(); },
        onShake: value => { shakeOn = Boolean(value); },
        getShake: () => shakeOn
      });
      made.scope.use(createBrowserSemantics({semantics, canvas: made.canvas, width: STAGE.width, height: STAGE.height, label:'五行牌阵', onError:report}));
      hud.showLoading(0, '正在备阵…');
      document.querySelector('#boot')?.remove();
    },
    update,
    renderRetry:{maxConsecutive:5,shouldRetry:retryGeometry},
    onError: report
  });

  // The native loading view reflects actual resource completion. Keep concurrent
  // image decoding below the engine's four-job budget.
  let complete = 0;
  const step = (promise, label) => promise.then(value => {
    ++complete;
    // Late siblings of a refused asset must never replace the actionable error view.
    if (hud.active === 'loading') hud.showLoading(complete / 7, label);
    return value;
  });
  const texture = file => game.browser.loadTexture(new URL('../assets/art/' + file, import.meta.url).href);
  const [tileTexture, arenaTexture, titleTexture] = await Promise.all([
    step(texture('tiles.png'), '棋子图集'),
    step(texture('arena.webp'), '战场绘卷'),
    step(texture('title.webp'), '封面绘卷')
  ]);
  const loadedPortraits = await Promise.all(ATLAS_PORTRAITS.map(id => step(loadPortraitAtlas(game.browser,id), '角色立绘')));
  paintTile = createTilePainter({ Bitmap, scope: gameScope, textureLease: tileTexture });
  const atlases = new Map(loadedPortraits.map(data => [data.portrait.id, data]));
  buildScene(game, atlases, arenaTexture, titleTexture);
  run = { index: 0, heroHp: 1000, extra: [], bestChain: 0 };
  startBattle(0);
  audio.setScene('title');
  bindTouch(game);
  const visibility = () => { if (document.hidden) { boardInput.cancel(); clearSelection(); } };
  document.addEventListener('visibilitychange', visibility);
  game.scope.use({dispose: () => document.removeEventListener('visibilitychange', visibility)});
  titleArt.visible = true;
  // The opaque title covers the fight completely. Do not submit or animate it underneath.
  battleArt.visible = false;
  hud.setReady(true);
  hud.showTitle();
  ready = true;

  function start() {
    if (!ready || (lock !== 'title' && lock !== 'over')) return;
    audio.unlock(); audio.ui(); beginRun();
  }
  function clientRect(rect) {
    if (!rect) return null;
    const b = game.canvas.getBoundingClientRect();
    return {x:b.left+rect.x*b.width/STAGE.width,y:b.top+rect.y*b.height/STAGE.height,width:rect.width*b.width/STAGE.width,height:rect.height*b.height/STAGE.height};
  }
  const ui = {
    buttons: () => hud.buttons(),
    rect: name => hud.rect(name),
    clientRect: name => clientRect(hud.rect(name)),
    boardRect: () => clientRect({x:BOARD.x,y:BOARD.y,width:BOARD.cell*BOARD.size,height:BOARD.cell*BOARD.size}),
    get active() { return hud.active; },
    get modalOpen() { return hud.modalOpen; },
    tester: createUiTester({semantics}),
    get backend() { return game.browser.backend; }
  };

  // 给自动化测试和手感实测留一个入口：不靠像素点，直接调状态。
  window.fivephases = {
    ui, get ready() { return ready; },
    get battle() {
      return battle;
    },
    get busy() {
      return sequence.busy || lock !== null || hud.modalOpen;
    },
    get lock() {
      return lock;
    },
    fx(next) {
      fx?.configure(next);
    },
    setShake(value) {
      shakeOn = Boolean(value);
    },
    /** 分块开关，用来定位"哪一层把几何预算撑爆了"。 */
    hide(which, value) {
      const target = { board: boardLayer, hero: hero?.holder, enemy: enemySprite, fx: fxLayer }[which];
      if (target) target.visible = value !== false;
      if (which === 'fx' && flashLayer) flashLayer.visible = value !== false;
    },
    start: beginRun,
    /** 直接跳到第 n 关，调美术和验收用。 */
    stage(index) {
      hideOverlays();
      run = { index, heroHp: 1000, extra: [], bestChain: 0 };
      lock = null;
      startBattle(index);
    },
    swap: runSwap,
    play: tryPlay,
    endTurn: tryEndTurn,
    /** 找一个当前能消的交换，给自动化测试和"发呆时给个提示"用。 */
    hint() {
      for (let i = 0; i < BOARD.size * BOARD.size; i += 1) {
        for (const j of [i + 1, i + BOARD.size]) {
          if (j >= BOARD.size * BOARD.size) continue;
          if (!isNeighbour(i, j)) continue;
          if (previewSwap(battle, i, j).length) return [i, j];
        }
      }
      return null;
    },
    cellAt: (x, y) => view?.cellAt(x, y),
    centre: (cell) => cellCentre(cell),
    /** 显示列表里的节点总数。用来盯"越玩越卡"：这个数应该基本不涨。 */
    stats() {
      const count = (node) => {
        let total = 1;
        for (let i = 0; i < (node.numChildren ?? 0); i += 1) total += count(node.getChildAt(i));
        return total;
      };
      return {
        nodes: world ? count(world) : 0, queued: sequence.pending, updateFaults,
        heroClip: heroMotion.name, enemyClip: enemyMotion.name, lastImpact,
      };
    },
  };

}

let updateFaults = 0;

function update(seconds) {
  // 切走标签页再回来，seconds 会是一个很大的值；不夹住的话补间会一帧跳完
  const dt = Math.min(Math.max(seconds, 0), 0.05);
  // 一帧里抛出去，引擎只会报一句 FRAME_RENDER_FAILED，真正的原因就丢了。
  // 自己接住，把原始错误打出来——这是排查"画面卡住"唯一有用的线索。
  try {
    if (document.hidden) return;
    hud?.tick(dt);
    if (!ready || lock === 'title') return;
    sequence.update(dt);
    fx.update(dt);
    posePortrait(hero, heroMotion, dt);
    posePortrait(enemy, enemyMotion, dt);
  } catch (error) {
    updateFaults += 1;
    if (updateFaults < 4) console.error(error);
    if (updateFaults === 4) console.error('每帧都在出错，后面不再重复打印。');
  }
}

boot().catch((cause) => {
  report(cause);
  if (hud) {
    hud.showError(describe(cause), () => location.reload());
  } else {
    const status = document.querySelector('#boot');
    if (!status) return;
    status.textContent = '引擎未能启动，请重试。';
    const retry = document.createElement('button');
    retry.textContent = '重新加载';
    retry.addEventListener('click', () => location.reload(), {once:true});
    status.append(retry);
  }
});
