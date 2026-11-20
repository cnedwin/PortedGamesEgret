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

import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createBrowserGame } from '@egret/engine/web/game';

import { BONDS, ENEMIES, addCard, canPlay, createBattle, endTurn, playCard, previewSwap, rewardChoices, swapAndSettle } from './core/battle.mjs';
import { ELEMENT_INFO, ELEMENT_ORDER, STARTER_DECK } from './core/cards.mjs';
import { portraitById } from './portrait/index.mjs';
import { createHud } from './ui/hud.mjs';
import { createAudio } from './view/audio.mjs';
import { cascadeTempo, createBoardView } from './view/board-view.mjs';
import { PALETTE, drawEnemy } from './view/draw.mjs';
import { createFx } from './view/fx.mjs';
import { BOARD, ENEMY_SPOT, ENERGY_SLOTS, HERO_SPOT, STAGE, cellCentre } from './view/layout.mjs';
import { buildPortrait } from './view/portrait.mjs';
import { createSequence, ease } from './view/sequence.mjs';

const $ = (id) => document.getElementById(id);

const canvas = $('stage');
const stageBox = $('stage-box');
const hudRoot = $('hud');
const touch = $('board-touch');
const rewardsEl = $('rewards');

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
let enemySprite = null;
let world = null;
let boardLayer = null;
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

const heroBase = { holderX: 0, holderY: 0, shoulderNear: 0, chestY: 0, headY: 0 };
let clock = 0;

// ── 屏幕适配 ────────────────────────────────────────────────────
// --u 是"设计稿一个像素"值多少真实像素。CSS 里所有尺寸都写成 calc(N * var(--u))，
// 于是任何屏幕比例下位置和字号都同比例缩放。
function fitUnit() {
  const unit = stageBox.clientWidth / STAGE.width;
  if (unit > 0) document.documentElement.style.setProperty('--u', `${unit}px`);
}

// 棋盘触控层：位置和大小从 layout.mjs 来，和画布上的格子严丝合缝。
function placeTouchLayer() {
  const pctX = (value) => `${(value / STAGE.width) * 100}%`;
  const pctY = (value) => `${(value / STAGE.height) * 100}%`;
  const side = BOARD.cell * BOARD.size;
  touch.style.left = pctX(BOARD.x);
  touch.style.top = pctY(BOARD.y);
  touch.style.width = pctX(side);
  touch.style.height = pctY(side);
}

// ── 背景 ────────────────────────────────────────────────────────
function paintBackdrop(g) {
  g.beginLinearGradientFill(0, 0, 0, STAGE.height, [
    { offset: 0, color: 0x1b2433 },
    { offset: 0.34, color: 0x121a25 },
    { offset: 0.72, color: 0x0c1119 },
    { offset: 1, color: 0x070a0e },
  ]);
  g.drawRect(0, 0, STAGE.width, STAGE.height);
  g.endFill();

  // 敌后一轮冷月：给上方一个视觉重心，也让立绘的剪影有东西衬
  g.beginRadialGradientFill(ENEMY_SPOT.x, ENEMY_SPOT.y - 20, 250, [
    { offset: 0, color: 0x40628a, alpha: 0.55 },
    { offset: 0.55, color: 0x2a3f5c, alpha: 0.22 },
    { offset: 1, color: 0x0d1420, alpha: 0 },
  ]);
  g.drawCircle(ENEMY_SPOT.x, ENEMY_SPOT.y - 20, 250);
  g.endFill();

  // 我方一侧的暖光，和上方的冷月对照
  g.beginRadialGradientFill(HERO_SPOT.x, HERO_SPOT.y - 60, 210, [
    { offset: 0, color: 0x8a4a2a, alpha: 0.34 },
    { offset: 1, color: 0x0d1420, alpha: 0 },
  ]);
  g.drawCircle(HERO_SPOT.x, HERO_SPOT.y - 60, 210);
  g.endFill();

  // 地平线：把敌人"放在地上"。我方那条不画——立绘的脚被手牌挡住，
  // 画在胯高会变成一道横穿大腿的线。
  g.lineStyle(1.5, 0x2c3947, 0.55);
  g.moveTo(0, ENEMY_SPOT.y + 108).lineTo(STAGE.width, ENEMY_SPOT.y + 108);

  // 脚下的影子。没有影子，敌人就是贴纸浮在半空
  g.beginFill(0x000000, 0.32);
  g.drawEllipse(ENEMY_SPOT.x - 110, ENEMY_SPOT.y + 108, 220, 34);
  g.endFill();

  // 棋盘底盘
  const side = BOARD.cell * BOARD.size;
  g.beginFill(0x090d13, 0.92);
  g.drawRoundRect(BOARD.x - 16, BOARD.y - 16, side + 32, side + 32, 30);
  g.endFill();
  g.lineStyle(2, 0x2c3947, 0.9);
  g.drawRoundRect(BOARD.x - 16, BOARD.y - 16, side + 32, side + 32, 30);
  g.lineStyle(1, 0x1b242f, 0.9);
  g.drawRoundRect(BOARD.x - 6, BOARD.y - 6, side + 12, side + 12, 22);

  // 手牌托底：一条从棋盘到屏幕底部的暗带，让卡面浮起来
  g.beginLinearGradientFill(0, 640, 0, 840, [
    { offset: 0, color: 0x0a0e14, alpha: 0 },
    { offset: 1, color: 0x0a0e14, alpha: 0.75 },
  ]);
  g.drawRect(0, 640, STAGE.width, 200);
  g.endFill();
}

// ── 搭台 ────────────────────────────────────────────────────────
function buildScene(game) {
  const { stage, scope } = game;

  // 背景和整屏闪光固定在舞台上，避免震屏把贴边三角形裁成极细的碎片。
  const backdrop = stage.addChild(scope.use(new Sprite()));
  paintBackdrop(backdrop.graphics);
  world = stage.addChild(scope.use(new DisplayObjectContainer()));

  const enemyLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  enemySprite = enemyLayer.addChild(scope.use(new Sprite()));
  enemySprite.x = ENEMY_SPOT.x;
  enemySprite.y = ENEMY_SPOT.y;

  const heroLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  hero = buildPortrait({ portrait: portraitById('fire'), Sprite, scope });
  heroLayer.addChild(hero.holder);
  hero.place(HERO_SPOT.x, HERO_SPOT.y, HERO_SPOT.scale);

  heroBase.holderX = hero.holder.x;
  heroBase.holderY = hero.holder.y;
  heroBase.shoulderNear = hero.bones.get('shoulder-near').rotation;
  heroBase.chestY = hero.bones.get('chest').y;
  heroBase.headY = hero.bones.get('head').y;

  boardLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  fxLayer = world.addChild(scope.use(new DisplayObjectContainer()));
  flashLayer = stage.addChild(scope.use(new DisplayObjectContainer()));
  fx = createFx({ Sprite, scope, world, layer: fxLayer, flashLayer });
}

// ── 一局的开始与结束 ────────────────────────────────────────────

function paintEnemy(id) {
  enemySprite.graphics.clear();
  drawEnemy(enemySprite.graphics, { kind: id, w: ENEMY_SPOT.width, h: ENEMY_SPOT.height });
  enemySprite.x = ENEMY_SPOT.x;
  enemySprite.y = ENEMY_SPOT.y;
  enemySprite.scaleX = 1;
  enemySprite.scaleY = 1;
  enemySprite.alpha = 1;
}

function startBattle(index) {
  sequence.clear();
  fx.clear();
  clearSelection();

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
  });

  paintEnemy(battle.enemy.id);
  hud.resetHand();
  hud.render(battle);
  hud.banner(`${battle.enemy.name}　${battle.enemy.title}`, 1700);
}

/** 三个覆盖层收在一处开关，免得某条路径漏关一个，界面就卡死了。 */
function setOverlayVisible(id, visible) {
  const overlay = $(id);
  overlay.inert = !visible;
  overlay.classList.toggle('is-on', visible);
}

function hideOverlays() {
  for (const id of ['overlay-title', 'overlay-reward', 'overlay-over']) setOverlayVisible(id, false);
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
  if (battle.over === 'win') {
    run.heroHp = Math.max(1, Math.round(battle.hero.hp));
    lock = 'pending';
    // 敌人散掉
    sequence.tween(420, (t) => {
      enemySprite.alpha = 1 - t;
      enemySprite.scaleX = enemySprite.scaleY = 1 + 0.14 * t;
    });
    sequence.call(() => {
      fx.burst(ENEMY_SPOT.x, ENEMY_SPOT.y, null, 24);
      fx.flash(0.4, 0.3);
    });
    setTimeout(() => {
      if (run.index >= ENEMIES.length - 1) showOver('win');
      else showReward();
    }, 720);
  } else {
    lock = 'pending';
    sequence.call(() => fx.flash(0.55, 0.4));
    setTimeout(() => showOver('lose'), 720);
  }
}

function showReward() {
  lock = 'reward';
  $('reward-kicker').textContent = `${battle.enemy.name}已破　气血 ${run.heroHp}`;
  rewardsEl.replaceChildren();

  for (const card of rewardChoices(battle, 3)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'card is-ready';
    button.dataset.element = card.element;
    button.style.setProperty('--tint', ELEMENT_INFO[card.element].color);
    button.style.setProperty('--deep', ELEMENT_INFO[card.element].deep);
    button.innerHTML = cardMarkup(card);
    button.addEventListener('click', () => {
      run.extra.push(card.id);
      addCard(battle, card);
      nextBattle();
    });
    rewardsEl.append(button);
  }
  setOverlayVisible('overlay-reward', true);
}

function nextBattle() {
  hideOverlays();
  run.index += 1;
  lock = null;
  startBattle(run.index);
}

function showOver(result) {
  lock = 'over';
  $('over-kicker').textContent = result === 'win' ? '阵成' : '阵破';
  $('over-title').textContent = result === 'win' ? '三关皆破' : '倒下了';
  $('over-text').textContent =
    result === 'win'
      ? `三关全破，剩余气血 ${Math.round(battle.hero.hp)}，最高连锁 ${run.bestChain} 层。`
      : `倒在第 ${run.index + 1} 关·${battle.enemy.name}，最高连锁 ${run.bestChain} 层。`;
  setOverlayVisible('overlay-over', true);
}

function cardMarkup(card) {
  const info = ELEMENT_INFO[card.element];
  return `<span class="card-cost">${card.cost}</span>
    <span class="card-name">${card.name}</span>
    <span class="card-elem">${info.name}</span>
    <span class="card-text">${card.text.replaceAll('\n', '<br>')}</span>`;
}

// ── 锁 ──────────────────────────────────────────────────────────
const locked = () => lock !== null || !battle || sequence.busy || battle.phase !== 'player' || battle.over !== null;

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
        hud.render(battle);
      },
    });
  });
  // 球是并行飞的，不进队列等它——不然每消一次都要多等小半秒
}

function play(events) {
  hud.render(battle);
  const tempo = cascadeTempo(events);

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
        sequence.call(() => {
          audio.cast(Boolean(event.card.ult));
          heroCast();
        });
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
        playDamage(event);
        break;

      case 'absorb':
        sequence.call(() => {
          const at = event.to === 'hero' ? heroFloat() : enemyFloat();
          hud.floater(`挡 ${event.amount}`, { ...at, kind: 'shield' });
          hud.render(battle);
        });
        break;

      case 'shield':
        sequence.call(() => {
          audio.guard();
          const at = event.to === 'enemy' ? enemyFloat() : heroFloat();
          hud.floater(`+盾 ${event.amount}`, { ...at, kind: 'shield' });
          hud.render(battle);
        });
        break;

      case 'heal':
        sequence.call(() => {
          if (event.amount > 0) {
            audio.heal();
            hud.floater(`+${event.amount}`, { ...heroFloat(), kind: 'heal' });
          }
          hud.render(battle);
        });
        break;

      case 'regrow':
        sequence.call(() => hud.floater(`回春 ${event.amount}`, { ...heroFloat(), kind: 'heal' }));
        break;

      case 'poison':
        sequence.call(() => {
          const at = event.to === 'hero' ? heroFloat() : enemyFloat();
          hud.floater(`毒 ${event.amount}`, { ...at, kind: 'info' });
          hud.render(battle);
        });
        break;

      case 'poisonTick':
        sequence.call(() => {
          const at = event.to === 'hero' ? heroFloat() : enemyFloat();
          hud.floater(`-${event.amount}`, { ...at, kind: 'damage' });
          hud.render(battle);
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
          hud.render(battle);
          audio.draw();
        });
        break;

      case 'over':
        sequence.call(() => {
          if (event.result === 'win') audio.win();
          else audio.lose();
        });
        break;

      default:
        break;
    }
  }

  // 收尾：把界面同步到最终状态，再看要不要切场景
  sequence.call(() => {
    hud.render(battle);
    if (battle.over) endOfBattle();
  });
}

const heroFloat = () => ({ x: HERO_SPOT.x + 40, y: HERO_SPOT.y - 170 });
const enemyFloat = () => ({ x: ENEMY_SPOT.x, y: ENEMY_SPOT.y - 30 });

function playDamage(event) {
  const toHero = event.to === 'hero';

  // 打敌人时的前顶动作由 cast 事件负责，这里只管挨打的那一下
  if (toHero) sequence.call(() => enemyStrike());

  sequence.call(() => {
    if (event.amount > 0) {
      hud.floater(`-${event.amount}`, { ...(toHero ? heroFloat() : enemyFloat()), kind: 'damage' });
    }
    if (toHero) {
      audio.enemyHit();
      shake(18, 0.3);
      fx.flash(0.26, 0.16);
    } else {
      audio.hit();
      shake(event.crit ? 16 : 9, 0.22);
      fx.burst(ENEMY_SPOT.x, ENEMY_SPOT.y, null, event.crit ? 16 : 9);
      fx.ring(ENEMY_SPOT.x, ENEMY_SPOT.y, PALETTE.gold, event.crit ? 150 : 100);
    }
    hud.render(battle);
  });
  // 一小段顿帧。伤害数字要"落地"才有力，但太长会让连消变得拖沓
  sequence.wait(80);
}

// ── 两个角色的动作 ──────────────────────────────────────────────

/** 我方出牌：整个人往前一顶，肩一沉，刀就劈出去了。 */
function heroCast() {
  const base = heroBase.holderX;
  const shoulder = heroBase.shoulderNear;
  const arm = hero.bones.get('shoulder-near');
  sequence.tween(90, (t) => {
    hero.holder.x = base + 26 * t;
    arm.rotation = shoulder - 34 * t;
  }, { ease: ease.outQuad });
  sequence.tween(190, (t) => {
    hero.holder.x = base + 26 * (1 - t);
    arm.rotation = shoulder - 34 * (1 - t);
  }, { ease: ease.outQuad });
}

/** 敌人出手：往前压过来，再退回去。 */
function enemyStrike() {
  const base = ENEMY_SPOT.x;
  sequence.tween(130, (t) => {
    enemySprite.x = base - 86 * t;
    enemySprite.scaleX = enemySprite.scaleY = 1 + 0.09 * t;
  }, { ease: ease.inQuad });
  sequence.tween(230, (t) => {
    enemySprite.x = base - 86 * (1 - t);
    enemySprite.scaleX = enemySprite.scaleY = 1.09 - 0.09 * t;
  }, { ease: ease.outQuad });
}

/** 待机：呼吸、甩发、裙摆。幅度要小，大了像抽筋。 */
function idle(t) {
  const bones = hero.bones;
  bones.get('chest').y = heroBase.chestY + Math.sin(t * 1.5) * 3.5;
  bones.get('head').y = heroBase.headY + Math.sin(t * 1.5 + 0.5) * 2.2;
  bones.get('hair-tail').rotation = Math.sin(t * 1.1) * 3.5;
  bones.get('hair-lock-l').rotation = Math.sin(t * 1.35 + 0.7) * 2.6;
  bones.get('hair-lock-r').rotation = Math.sin(t * 1.25 + 1.4) * 2.4;
  bones.get('skirt-l').rotation = Math.sin(t * 1.05) * 1.8;
  bones.get('skirt-r').rotation = -Math.sin(t * 1.05) * 1.8;

  if (enemySprite.alpha > 0) {
    enemySprite.y = ENEMY_SPOT.y + Math.sin(t * 1.2) * 6;
  }
}

// ── 操作 ────────────────────────────────────────────────────────

function runSwap(a, b) {
  if (locked()) return;
  clearSelection();
  const events = swapAndSettle(battle, a, b);
  if (!events) {
    audio.refuse();
    return;
  }
  play(events);
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

  const events = playCard(battle, uid);
  if (events) play(events);
}

function tryEndTurn() {
  if (locked()) return;
  clearSelection();
  const events = endTurn(battle);
  play(events);
}

// 拖动 / 点选
let drag = null;
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
  touch.addEventListener('pointerdown', (event) => {
    audio.unlock();
    if (locked()) return;
    const point = game.toStage(event.clientX, event.clientY);
    const cell = view.cellAt(point.x, point.y);
    if (cell < 0) return;
    try {
      touch.setPointerCapture(event.pointerId);
    } catch {
      /* 指针已经抬起时 setPointerCapture 会抛，不影响后续 */
    }

    // 已经选中一格，再点相邻的一格 = 交换
    if (selected >= 0 && selected !== cell) {
      if (isNeighbour(selected, cell)) {
        runSwap(selected, cell);
        return;
      }
      select(cell);
      return;
    }
    if (selected === cell) {
      clearSelection();
      return;
    }

    drag = { cell, x: point.x, y: point.y, previewed: -1 };
  });

  touch.addEventListener('pointermove', (event) => {
    if (!drag || locked()) return;
    const point = game.toStage(event.clientX, event.clientY);
    const dx = point.x - drag.x;
    const dy = point.y - drag.y;
    const target = neighbourOf(drag.cell, dx, dy);
    if (target < 0) return;

    const reach = BOARD.cell * 0.4;
    if (Math.abs(dx) < reach && Math.abs(dy) < reach) {
      // 还没拖够：只是预览这一换会消掉什么（设计文档 4.1）
      if (drag.previewed !== target) {
        drag.previewed = target;
        clearSelection();
        highlighted = previewSwap(battle, drag.cell, target);
        if (highlighted.length) view.highlight(highlighted, true);
      }
      return;
    }

    const from = drag.cell;
    drag = null;
    runSwap(from, target);
  });

  const finish = () => {
    if (!drag) return;
    // 没拖出距离就是点了一下：选中它，等第二次点击
    const cell = drag.cell;
    drag = null;
    select(cell);
  };
  touch.addEventListener('pointerup', finish);
  touch.addEventListener('pointercancel', finish);
}

// ── 启动 ────────────────────────────────────────────────────────

function describe(cause) {
  const parts = [];
  for (let at = cause; at && parts.length < 5; at = at.cause) parts.push(String(at.code ?? at.message ?? at));
  return parts.join(' ← ');
}

let recoveries = 0;

/**
 * 帧循环一旦报错就会停在 failed，整局就此冻结——画面还在，但什么都不动了。
 * 这比崩溃更难查，所以：把真正的原因打出来，并且有限次地把循环重新拉起来。
 * 上限 5 次，是真的坏了就别再空转。
 */
function report(cause) {
  console.error(`引擎报错：${describe(cause)}`, cause);
  if (runtime?.loop.state === 'failed' && recoveries < 5) {
    recoveries += 1;
    setTimeout(() => {
      try {
        runtime.loop.start();
      } catch {
        /* 起不来就认了，控制台里已经有原因 */
      }
    }, 120);
  }
}

async function boot() {
  fitUnit();
  placeTouchLayer();

  const game = await createBrowserGame({
    canvas,
    width: STAGE.width,
    height: STAGE.height,
    clearColor: 0x080b10,
    pixelRatio: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    backend: 'webgl2',
    fit: 'contain',
    fitTo: stageBox,
    pointer: false,
    keyboard: false,
    autoStart: false,
    update,
    onError: report,
  });

  runtime = game;
  gameScope = game.scope;

  buildScene(game);

  hud = createHud({ root: hudRoot, onCard: tryPlay, onEndTurn: tryEndTurn });

  // 先摆一局出来当封面：标题页背后是一张真棋盘，不是一张图
  run = { index: 0, heroHp: 1000, extra: [], bestChain: 0 };
  startBattle(0);

  bindTouch(game);

  $('start').addEventListener('click', () => {
    audio.unlock();
    beginRun();
  });

  $('skip-reward').addEventListener('click', nextBattle);

  $('restart').addEventListener('click', beginRun);

  $('mute').addEventListener('click', () => {
    audio.unlock();
    const muted = audio.toggleMute();
    $('mute').setAttribute('aria-pressed', String(muted));
    $('mute').textContent = muted ? '静' : '音';
  });

  const resize = () => {
    fitUnit();
    placeTouchLayer();
  };
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(stageBox);

  // 给自动化测试和手感实测留一个入口：不靠像素点，直接调状态。
  window.fivephases = {
    get battle() {
      return battle;
    },
    get busy() {
      return sequence.busy || lock !== null;
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
      return { nodes: world ? count(world) : 0, queued: sequence.pending, updateFaults };
    },
  };

  game.loop.start();
}

let updateFaults = 0;

function update(seconds) {
  // 切走标签页再回来，seconds 会是一个很大的值；不夹住的话补间会一帧跳完
  const dt = Math.min(Math.max(seconds, 0), 0.05);
  clock += dt;
  // 一帧里抛出去，引擎只会报一句 FRAME_RENDER_FAILED，真正的原因就丢了。
  // 自己接住，把原始错误打出来——这是排查"画面卡住"唯一有用的线索。
  try {
    sequence.update(dt);
    fx.update(dt);
    idle(clock);
  } catch (error) {
    updateFaults += 1;
    if (updateFaults < 4) console.error(error);
    if (updateFaults === 4) console.error('每帧都在出错，后面不再重复打印。');
  }
}

boot().catch(report);
