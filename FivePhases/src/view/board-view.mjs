// 棋盘的表现层：49 个方块、交换、消除、下落、连锁。
//
// 每个格子一个 Sprite，图形在创建时画好，之后只改变换——每帧重画 49 个路径
// 是这类游戏最典型的性能坑。
//
// 动画全部排进 sequence 串行播放；这里只负责"把事件表翻译成动作"。

import { ELEMENTS, EMPTY, PLAIN, index } from '../core/board.mjs';
import { ease } from './sequence.mjs';
import { drawTile } from './draw.mjs';

export const SWAP_MS = 110;
export const CLEAR_MS = 170;
export const FALL_MS = 240;
export const SPAWN_MS = 150;
// 极小或近透明的方块不可见，跳过会因浮点精度而退化的三角形。
const MIN_VISIBLE_FRACTION = 0.03;

/** 超长连锁完整播放首两层和收尾，其余层共用六层的演出时间。 */
export function cascadeTempo(events) {
  const last = events.findLast((event) => event.type === 'clearStep')?.chain ?? 0;
  const middleScale = Math.min(1, 6 / Math.max(1, last - 3));
  return (chain) => (chain > 2 && chain < last ? middleScale : 1);
}

function paintVectorTile(sprite, options) {
  sprite.graphics.clear();
  drawTile(sprite.graphics, options);
}

export function createBoardView({ battle, Sprite, scope, layer, geometry, paintTile = paintVectorTile }) {
  const { x, y, cell } = geometry;
  const board = battle.board;
  const sprites = new Array(board.size * board.size).fill(null);
  const size = cell * 0.94;

  const centreOf = (i) => ({
    x: x + (i % board.size) * cell + cell / 2,
    y: y + Math.floor(i / board.size) * cell + cell / 2,
  });

  function paint(sprite, kind, special) {
    if (kind === EMPTY) {
      sprite.visible = false;
      return;
    }
    sprite.visible = true;
    paintTile(sprite, { kind, special, size });
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
    let a;
    let b;
    const fromA = centre(event.a);
    const fromB = centre(event.b);
    sequence.call(() => {
      a = sprites[event.a];
      b = sprites[event.b];
    });
    sequence.tween(SWAP_MS, (t) => {
      if (!a || !b) return;
      a.x = fromA.x + (fromB.x - fromA.x) * t;
      a.y = fromA.y + (fromB.y - fromA.y) * t;
      b.x = fromB.x + (fromA.x - fromB.x) * t;
      b.y = fromB.y + (fromA.y - fromB.y) * t;
    }, {
      done: () => {
        if (!a || !b) return;
        sprites[event.a] = b;
        sprites[event.b] = a;
      },
    });
  }

  /**
   * 清空。分两拍：先鼓一下（1.0 → 1.28），再缩没（→ 0）。
   * 只缩不放的话，消掉的瞬间像被抠掉了，没有"炸开"的感觉。
   */
  function playClear(event, sequence, fx, durationScale = 1) {
    const cells = event.cleared ?? [];
    if (cells.length) {
      const targets = [];
      const big = event.combo ? 1.6 : 1.28;
      const ms = (event.combo ? 260 : CLEAR_MS) * durationScale;
      sequence.call(() => {
        for (const info of cells) {
          const sprite = sprites[info.index];
          if (!sprite) continue;
          targets.push({ sprite, info });
          sprites[info.index] = null;
        }
      });
      sequence.tween(ms * 0.35, (t) => {
        for (const { sprite } of targets) {
          sprite.scaleX = sprite.scaleY = 1 + (big - 1) * t;
        }
      });
      sequence.tween(ms * 0.65, (t) => {
        const k = 1 - t;
        for (const { sprite } of targets) {
          sprite.scaleX = sprite.scaleY = big * k;
          sprite.alpha = k;
          sprite.visible = k > MIN_VISIBLE_FRACTION;
        }
      });
      sequence.call(() => {
        for (const { sprite, info } of targets) {
          release(sprite);
          const at = centre(info.index);
          fx.burst(at.x, at.y, info.kind, event.combo ? 18 : 9);
        }
      });
    }

    // 这一步生成的特殊块：从零弹出来
    const spawned = event.spawned ?? [];
    if (spawned.length) {
      sequence.call(() => {
        for (const spawn of spawned) {
          // 普通块保留在特殊块的生成格，原地重画可避免把旧块留在显示列表中。
          const sprite = sprites[spawn.index] ?? makeSprite(spawn.kind, spawn.special, centre(spawn.index));
          if (sprites[spawn.index]) paint(sprite, spawn.kind, spawn.special);
          sprite.scaleX = sprite.scaleY = 0;
          sprite.visible = false;
          sprites[spawn.index] = sprite;
        }
      });
      sequence.tween(SPAWN_MS * durationScale, (t) => {
        const k = ease.outBack(t);
        for (const spawn of spawned) {
          const sprite = sprites[spawn.index];
          sprite.scaleX = sprite.scaleY = k;
          sprite.visible = k > MIN_VISIBLE_FRACTION;
        }
      });
    }
  }

  /** 下落：方块从原格滑到新格，越掉越快；新方块从棋盘上方掉进来。 */
  function playFall(event, sequence, durationScale = 1) {
    if (!event.drops.length && !event.fills.length) return;
    const moves = [];
    const fresh = [];
    sequence.call(() => {
      const next = [...sprites];
      for (const { from } of event.drops) next[from] = null;
      for (const { from, to } of event.drops) {
        const sprite = sprites[from];
        if (!sprite) continue;
        next[to] = sprite;
        moves.push({ sprite, to: centre(to), fromY: sprite.y, fromX: sprite.x });
      }
      // 新块从棋盘顶行略上方落下，避免遮住 HUD 和立绘。
      for (const fill of event.fills) {
        const at = centre(fill.index);
        const fromY = Math.max(y + cell * 0.5 - cell * 0.1, at.y - cell * (0.55 + fill.y * 0.45));
        const sprite = makeSprite(fill.kind, PLAIN, { x: at.x, y: fromY });
        sprite.alpha = 0.4;
        next[fill.index] = sprite;
        fresh.push({ sprite, to: at, fromY });
      }
      for (let i = 0; i < sprites.length; i += 1) sprites[i] = next[i];
    });
    sequence.tween(FALL_MS * durationScale, (t) => {
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
    const kind = ELEMENTS.indexOf(event.kind);
    if (kind === EMPTY) return;
    sequence.call(() => {
      for (const i of cells) {
        // 逻辑棋盘已算到最终状态，重放时用出牌当时的颜色。
        const sprite = sprites[i] ?? makeSprite(kind, PLAIN, centre(i));
        if (sprites[i]) paint(sprite, kind, PLAIN);
        sprites[i] = sprite;
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
    if (!cells.length) return;
    const targets = [];
    sequence.call(() => {
      for (const i of cells) {
        const sprite = sprites[i];
        if (!sprite) continue;
        targets.push({ sprite, i });
        sprites[i] = null;
      }
    });
    sequence.tween(180, (t) => {
      for (const { sprite } of targets) {
        sprite.scaleX = sprite.scaleY = 1 + 0.3 * t;
        sprite.alpha = 1 - t;
        sprite.visible = sprite.alpha > MIN_VISIBLE_FRACTION;
      }
    });
    sequence.call(() => {
      for (const { sprite, i } of targets) {
        release(sprite);
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
