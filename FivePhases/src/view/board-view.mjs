// 棋盘的表现层：49 个方块、交换、消除、下落、连锁。
//
// 每个格子一个 Sprite，图形在创建时画好，之后只改变换——每帧重画 49 个路径
// 是这类游戏最典型的性能坑。
//
// 动画全部排进 sequence 串行播放；这里只负责"把事件表翻译成动作"。

import { EMPTY, index } from '../core/board.mjs';
import { ease } from './sequence.mjs';
import { drawTile } from './draw.mjs';

export const SWAP_MS = 110;
export const CLEAR_MS = 170;
export const FALL_MS = 240;
export const SPAWN_MS = 150;

export function createBoardView({ battle, Sprite, scope, layer, geometry }) {
  const { x, y, cell } = geometry;
  const board = battle.board;
  const sprites = new Array(board.size * board.size).fill(null);
  const size = cell * 0.94;

  const centreOf = (i) => ({
    x: x + (i % board.size) * cell + cell / 2,
    y: y + Math.floor(i / board.size) * cell + cell / 2,
  });

  function paint(sprite, kind, special) {
    sprite.graphics.clear();
    if (kind === EMPTY) {
      sprite.visible = false;
      return;
    }
    sprite.visible = true;
    drawTile(sprite.graphics, { kind, special, size });
  }

  // 方块走对象池。一场战斗会消掉上千个方块，每次都 new 一个 Sprite 的话，
  // 显示列表和 scope 都会一路涨——这是"越玩越卡"最典型的来路。
  const pool = [];

  function makeSprite(kind, special, at) {
    let sprite = pool.pop() ?? null;
    if (sprite) {
      layer.addChild(sprite);
      sprite.visible = true;
      sprite.alpha = 1;
      sprite.scaleX = 1;
      sprite.scaleY = 1;
    } else {
      sprite = new Sprite();
      scope.use(sprite);
      layer.addChild(sprite);
    }
    sprite.x = at.x;
    sprite.y = at.y;
    paint(sprite, kind, special);
    return sprite;
  }

  /** 还给池子，顺便从显示列表里摘掉——留在列表里就算不可见也要遍历。 */
  function release(sprite) {
    if (!sprite) return;
    sprite.visible = false;
    if (sprite.parent) sprite.parent.removeChild(sprite);
    pool.push(sprite);
  }

  function sync() {
    for (let i = 0; i < sprites.length; i += 1) {
      const at = centreOf(i);
      const kind = board.kind[i];
      const special = board.special[i];
      if (!sprites[i]) {
        if (kind === EMPTY) continue;
        sprites[i] = makeSprite(kind, special, at);
      } else {
        sprites[i].x = at.x;
        sprites[i].y = at.y;
        sprites[i].scaleX = 1;
        sprites[i].scaleY = 1;
        sprites[i].alpha = 1;
        paint(sprites[i], kind, special);
      }
    }
  }

  /** 屏幕坐标落在哪一格；不在棋盘上返回 -1。 */
  function cellAt(px, py) {
    const col = Math.floor((px - x) / cell);
    const row = Math.floor((py - y) / cell);
    if (col < 0 || row < 0 || col >= board.size || row >= board.size) return -1;
    return index(board, col, row);
  }

  const centre = (i) => centreOf(i);

  // ── 事件 → 动画 ────────────────────────────────────────────────

  function playSwap(event, sequence) {
    const a = sprites[event.a];
    const b = sprites[event.b];
    if (!a || !b) return;
    const fromA = { x: a.x, y: a.y };
    const fromB = { x: b.x, y: b.y };
    sequence.tween(SWAP_MS, (t) => {
      a.x = fromA.x + (fromB.x - fromA.x) * t;
      a.y = fromA.y + (fromB.y - fromA.y) * t;
      b.x = fromB.x + (fromA.x - fromB.x) * t;
      b.y = fromB.y + (fromA.y - fromB.y) * t;
    });
  }

  /**
   * 清空。分两拍：先鼓一下（1.0 → 1.28），再缩没（→ 0）。
   * 只缩不放的话，消掉的瞬间像被抠掉了，没有"炸开"的感觉。
   */
  function playClear(event, sequence, fx) {
    const cells = event.cleared ?? [];
    const targets = [];
    for (const cellInfo of cells) {
      const sprite = sprites[cellInfo.index];
      if (!sprite) continue;
      targets.push({ sprite, cell: cellInfo });
      sprites[cellInfo.index] = null;
    }
    if (!targets.length) return;

    const big = event.combo ? 1.6 : 1.28;
    const ms = event.combo ? 260 : CLEAR_MS;
    sequence.tween(ms * 0.35, (t) => {
      for (const { sprite } of targets) {
        sprite.scaleX = sprite.scaleY = 1 + (big - 1) * t;
      }
    });
    sequence.tween(ms * 0.65, (t) => {
      for (const { sprite } of targets) {
        const k = 1 - t;
        sprite.scaleX = sprite.scaleY = big * k;
        sprite.alpha = k;
      }
    });
    sequence.call(() => {
      for (const { sprite } of targets) release(sprite);
      for (const { cell: info } of targets) {
        fx.burst(centre(info.index).x, centre(info.index).y, info.kind, event.combo ? 18 : 9);
      }
    });

    // 这一步生成的特殊块：从零弹出来
    const spawned = event.spawned ?? [];
    if (spawned.length) {
      sequence.call(() => {
        for (const spawn of spawned) {
          const at = centre(spawn.index);
          const sprite = makeSprite(spawn.kind, spawn.special, at);
          sprite.scaleX = sprite.scaleY = 0;
          sprites[spawn.index] = sprite;
        }
      });
      sequence.tween(SPAWN_MS, (t) => {
        for (const spawn of spawned) {
          const sprite = sprites[spawn.index];
          if (!sprite) continue;
          const k = ease.outBack(t);
          sprite.scaleX = sprite.scaleY = k;
        }
      });
    }
  }

  /** 下落：方块从原格滑到新格，越掉越快；新方块从棋盘上方掉进来。 */
  function playFall(event, sequence) {
    const next = new Array(sprites.length).fill(null);
    const moves = [];

    for (const drop of event.drops) {
      const sprite = sprites[drop.from];
      if (!sprite) continue;
      next[drop.to] = sprite;
      moves.push({ sprite, to: centre(drop.to), fromY: sprite.y, fromX: sprite.x });
    }

    // 新方块只从棋盘顶行上面一点点起跳，不能真从屏幕外掉进来：
    // 引擎没有裁剪，从棋盘上方三格起跳的方块会画到 HUD 和立绘上面去。
    const fresh = [];
    for (const fill of event.fills) {
      const at = centre(fill.index);
      const fromY = Math.max(y + cell * 0.5 - cell * 0.1, at.y - cell * (0.55 + fill.y * 0.45));
      const sprite = makeSprite(fill.kind, 0, { x: at.x, y: fromY });
      sprite.alpha = 0.4;
      next[fill.index] = sprite;
      fresh.push({ sprite, to: at, fromY });
    }

    for (let i = 0; i < next.length; i += 1) if (!next[i] && sprites[i]) next[i] = sprites[i];
    for (let i = 0; i < sprites.length; i += 1) sprites[i] = next[i];

    if (!moves.length && !fresh.length) return;
    sequence.tween(FALL_MS, (t) => {
      const k = ease.inQuad(t);
      for (const move of moves) {
        move.sprite.x = move.fromX + (move.to.x - move.fromX) * k;
        move.sprite.y = move.fromY + (move.to.y - move.fromY) * k;
      }
      for (const item of fresh) {
        item.sprite.y = item.fromY + (item.to.y - item.fromY) * k;
        item.sprite.alpha = 0.4 + 0.6 * k;
      }
    });
  }

  /** 卡牌改了棋盘：直接重画受影响的格子，闪一下。 */
  function playRepaint(event, sequence) {
    const cells = event.cells ?? [];
    sequence.call(() => {
      for (const i of cells) {
        const sprite = sprites[i];
        if (!sprite) {
          const at = centre(i);
          if (board.kind[i] === EMPTY) continue;
          sprites[i] = makeSprite(board.kind[i], board.special[i], at);
          continue;
        }
        paint(sprite, board.kind[i], board.special[i]);
        sprite.scaleX = sprite.scaleY = 1.25;
      }
    });
    sequence.tween(160, (t) => {
      for (const i of cells) {
        const sprite = sprites[i];
        if (!sprite) continue;
        sprite.scaleX = sprite.scaleY = 1.25 - 0.25 * t;
      }
    });
  }

  /** 卡牌清了一整行/列：先亮再消失，然后交给下落。 */
  function playCleared(event, sequence, fx) {
    const cells = event.cells ?? [];
    const targets = [];
    for (const i of cells) {
      const sprite = sprites[i];
      if (!sprite) continue;
      targets.push(sprite);
      sprites[i] = null;
    }
    if (!targets.length) return;
    sequence.tween(180, (t) => {
      for (const sprite of targets) {
        sprite.scaleX = sprite.scaleY = 1 + 0.3 * t;
        sprite.alpha = 1 - t;
      }
    });
    sequence.call(() => {
      for (const sprite of targets) release(sprite);
      for (const i of cells) {
        const at = centre(i);
        fx.burst(at.x, at.y, 0, 4);
      }
    });
  }

  function highlight(cells, on) {
    for (const i of cells) {
      const sprite = sprites[i];
      if (!sprite) continue;
      sprite.scaleX = sprite.scaleY = on ? 1.12 : 1;
    }
  }

  sync();

  return {
    sync,
    cellAt,
    centre,
    playSwap,
    playClear,
    playFall,
    playRepaint,
    playCleared,
    highlight,
    sprites,
    /** 棋盘重排之后整个重画。 */
    reset() {
      for (let i = 0; i < sprites.length; i += 1) {
        release(sprites[i]);
        sprites[i] = null;
      }
      sync();
    },
  };
}
