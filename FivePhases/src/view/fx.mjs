// 特效：粒子、震屏、白闪、飞向卡牌的能量球。
//
// 粒子走对象池。每次消除都新建 Sprite 的话，一场战斗下来会产生几千个节点，
// 引擎的显示列表会越来越慢——这是"越玩越卡"最常见的原因。
//
// 震屏不移动相机，而是移动整个世界容器：相机一抖，背景和 UI 会一起抖，
// 那是"整个屏幕在动"；世界容器抖，只有战场在动，UI 是稳的。

import { ELEMENT_COLORS, ELEMENT_KEYS, PALETTE } from './draw.mjs';
import { ease } from './sequence.mjs';

// 每种颜色备多少颗。五色 + 金色，一共 PER_COLOUR * 6 个 Sprite。
//
// 这里踩过一个坑：一开始是"一个池子、每次炸开时重画粒子的图形"。
// 重画会让引擎在那一帧重新准备几何，一次消除几十颗就是几十次；
// 连着几轮连锁，就把每帧的几何预算（prepared vertices）吃满，
// 引擎直接抛 WEBGL2_GEOMETRY_RANGE，帧循环停在 failed，整局冻结。
// 现在每个粒子的图形只画一次，之后只改位置、缩放、透明度——一帧里几何零变化。
const PER_COLOUR = 10;
const RINGS = 4;
// 三种出手的剪影预先烘在显示对象上，命中时只动位置、缩放和透明度。
const BOSS_MARKS = {
  shanjiao: {
    colour: 0xffcc85,
    paths: [
      [[-73, 40], [-31, -3], [12, -47]],
      [[-43, 51], [-9, 6], [45, -46]],
      [[-5, 56], [32, 9], [73, -38]],
    ],
  },
  chijiao: {
    colour: 0x81d8ff,
    paths: [
      [[-88, 16], [-57, -5], [-27, -8], [4, 7], [34, 12], [63, -4], [93, -29]],
      [[-72, 40], [-41, 22], [-14, 24], [12, 39], [41, 38], [69, 19]],
    ],
  },
  hundun: {
    colour: 0xdabcff,
    paths: [
      [[0, -57], [55, -3], [0, 53], [-56, -3], [0, -57]],
      [[-23, -13], [1, 0], [20, -8]],
      [[1, 0], [-9, 25], [16, 38]],
      [[1, 0], [13, -21], [6, -37]],
    ],
  },
};

export function createFx({ Sprite, scope, world, layer, flashLayer }) {
  // 分项开关：几何预算出问题时要能一项一项关掉，才知道是谁吃掉的
  const enabled = { burst: true, ring: true, flash: true, orb: true };
  const particles = [];
  const rings = [];
  const bossMarks = new Map();
  let shakePower = 0;
  let shakeTime = 0;
  let flashSprite = null;

  const PARTICLE_COLOURS = [...ELEMENT_KEYS.map((key) => ELEMENT_COLORS[key].color), PALETTE.gold];

  for (const colour of PARTICLE_COLOURS) {
    for (let i = 0; i < PER_COLOUR; i += 1) {
      const sprite = new Sprite();
      scope.use(sprite);
      sprite.alpha = 0;
      // 图形只画这一次：10×10 的方块，大小靠 scale 调
      sprite.graphics.beginFill(colour, 0.95).drawRect(-5, -5, 10, 10).endFill();
      layer.addChild(sprite);
      particles.push({ sprite, colour, life: 0, maxLife: 0, vx: 0, vy: 0, spin: 0 });
    }
  }

  // 光环同理：描一圈固定半径的圆，之后只改缩放，不再重画。
  // 描边的圆是这套引擎里最贵的一类几何，每帧重画几个就够呛。
  for (let i = 0; i < RINGS; i += 1) {
    const sprite = new Sprite();
    scope.use(sprite);
    sprite.alpha = 0;
    sprite.graphics.lineStyle(5, PALETTE.gold, 0.9).drawCircle(0, 0, 40);
    layer.addChild(sprite);
    rings.push({ sprite, life: 0, maxLife: 0, size: 0 });
  }

  for (const [id, { colour, paths }] of Object.entries(BOSS_MARKS)) {
    const sprite = scope.use(new Sprite());
    sprite.visible = false;
    sprite.graphics.lineStyle(6, colour, 0.95);
    for (const [first, ...rest] of paths) {
      sprite.graphics.moveTo(...first);
      for (const point of rest) sprite.graphics.lineTo(...point);
    }
    layer.addChild(sprite);
    bossMarks.set(id, { sprite, life: 0 });
  }

  function bossImpact(id, x, y) {
    const mark = bossMarks.get(id);
    mark.life = 0.28;
    mark.sprite.x = x;
    mark.sprite.y = y;
    mark.sprite.alpha = 1;
    mark.sprite.scaleX = mark.sprite.scaleY = 0.8;
    mark.sprite.visible = true;
  }

  /** 先找同色的空粒子，没有再退而求其次——颜色对不上也比不炸强。 */
  const takeParticle = (colour) =>
    particles.find((item) => item.life <= 0 && item.colour === colour) ?? particles.find((item) => item.life <= 0);
  const takeRing = () => rings.find((item) => item.life <= 0);

  function colourFor(kind) {
    if (kind === null || kind === undefined || kind < 0) return PALETTE.gold;
    return ELEMENT_COLORS[ELEMENT_KEYS[kind]]?.color ?? PALETTE.gold;
  }

  /** 在 (x, y) 炸一簇粒子。`kind` 是五行下标，`count` 是颗数。 */
  function burst(x, y, kind, count = 9) {
    if (!enabled.burst) return;
    const colour = colourFor(kind);
    for (let i = 0; i < count; i += 1) {
      const particle = takeParticle(colour);
      if (!particle) return;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 90 + Math.random() * 190;
      particle.sprite.alpha = 1;
      particle.sprite.x = x;
      particle.sprite.y = y;
      particle.sprite.alpha = 1;
      particle.sprite.rotation = Math.random() * 360;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 60;
      particle.spin = (Math.random() - 0.5) * 720;
      particle.life = 0.45 + Math.random() * 0.25;
      particle.maxLife = particle.life;
      // 粒子只有 6~14 像素，圆和叶在这里都是一个点。画成小方块：
      // 两个三角形对六十几个，一次消除几十颗粒子时这是能省下最多的地方。
      const size = (6 + Math.random() * 8) / 10;
      particle.base = size;
      particle.sprite.scaleX = particle.sprite.scaleY = size;
    }
  }

  /** 一圈扩散的光环，给特殊块和连携用。 */
  function ring(x, y, colour = PALETTE.gold, size = 80) {
    if (!enabled.ring) return;
    const item = takeRing();
    if (!item) return;
    item.sprite.alpha = 0.9;
    item.sprite.x = x;
    item.sprite.y = y;
    item.base = size / 80;
    item.sprite.scaleX = item.sprite.scaleY = item.base * 0.2;
    item.life = 0.42;
    item.maxLife = 0.42;
    item.size = size;
  }

  function shake(power = 8, seconds = 0.22) {
    shakePower = Math.max(shakePower, power);
    shakeTime = Math.max(shakeTime, seconds);
    shakeTotal = shakeTime;
  }
  let shakeTotal = 0.22;

  function flash(alpha = 0.75, seconds = 0.18) {
    if (!enabled.flash) return;
    if (!flashSprite) {
      flashSprite = new Sprite();
      scope.use(flashSprite);
      flashLayer.addChild(flashSprite);
      flashSprite.graphics.beginFill(0xffffff, 1).drawRect(0, 0, 750, 1624).endFill();
    }
    flashSprite.visible = true;
    flashSprite.alpha = alpha;
    flashStrength = alpha;
    flashLife = seconds;
    flashMax = seconds;
  }
  let flashLife = 0;
  let flashMax = 0.18;
  let flashStrength = 0;

  function update(dt) {
    for (const particle of particles) {
      if (particle.life <= 0) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.sprite.alpha = 0;
        continue;
      }
      particle.vy += 900 * dt;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.rotation += particle.spin * dt;
      const k = particle.life / particle.maxLife;
      particle.sprite.alpha = k;
      particle.sprite.scaleX = particle.sprite.scaleY = (particle.base ?? 1) * (0.4 + k * 0.6);
    }

    for (const item of rings) {
      if (item.life <= 0) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.sprite.alpha = 0;
        continue;
      }
      const k = 1 - item.life / item.maxLife;
      item.sprite.scaleX = item.sprite.scaleY = (item.base ?? 1) * (0.2 + k * 1.6);
      item.sprite.alpha = 0.9 * (1 - k);
    }

    for (const mark of bossMarks.values()) {
      if (mark.life <= 0) continue;
      mark.life = Math.max(0, mark.life - dt);
      const t = mark.life / 0.28;
      mark.sprite.visible = t > 0;
      mark.sprite.alpha = Math.min(1, 1.6 * t);
      mark.sprite.scaleX = mark.sprite.scaleY = 0.8 + (1 - t) * 0.55;
    }

    if (flashLife > 0) {
      flashLife -= dt;
      const k = flashMax > 0 ? Math.max(0, flashLife / flashMax) : 0;
      if (flashSprite) {
        flashSprite.alpha = flashStrength * k;
        flashSprite.visible = flashSprite.alpha > 0.015;
      }
    }

    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      // 余量小于一帧就当震完了，直接归零。
      //
      // 避免把不可见的余量写成接近零的非零坐标。
      if (shakeTime <= 1e-4) {
        shakeTime = 0;
        shakePower = 0;
        world.x = 0;
        world.y = 0;
      } else {
        const k = shakeTime / shakeTotal;
        const power = shakePower * k * k;
        world.x = (Math.random() - 0.5) * power * 2;
        world.y = (Math.random() - 0.5) * power * 2;
      }
    }
  }

  /**
   * 一颗能量球沿贝塞尔飞到目标点。设计文档里最重要的一条视觉缝合：
   * 让玩家眼睛看到"我消了 → 这张卡亮了"。
   *
   * 球走池子：一次交换会飞三四个，不池化的话一局下来就是几百个节点。
   */
  // 能量球也一样：六种颜色各预画几颗，飞的时候只改位置。
  const orbSprites = [];
  const orbFree = [];
  for (const colour of PARTICLE_COLOURS) {
    for (let i = 0; i < 3; i += 1) {
      const sprite = new Sprite();
      scope.use(sprite);
      sprite.alpha = 0;
      sprite.graphics.beginFill(colour, 1).drawCircle(0, 0, 11).endFill();
      sprite.graphics.beginFill(0xffffff, 0.75).drawCircle(-3, -3, 4).endFill();
      layer.addChild(sprite);
      orbSprites.push({ sprite, colour });
      orbFree.push(orbSprites.at(-1));
    }
  }

  function orb(from, to, kind, { ms = 280, onArrive } = {}) {
    const colour = colourFor(kind);
    const slot = orbFree.find((item) => item.colour === colour) ?? orbFree[0];
    if (!slot) return;
    orbFree.splice(orbFree.indexOf(slot), 1);
    const sprite = slot.sprite;
    sprite.alpha = 1;
    sprite.x = from.x;
    sprite.y = from.y;

    const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 150 };
    let t = 0;
    return {
      update(dt) {
        t += dt / (ms / 1000);
        const k = Math.min(1, t);
        const e = ease.outQuad(k);
        const a = (1 - e) * (1 - e);
        const b = 2 * (1 - e) * e;
        const c = e * e;
        sprite.x = a * from.x + b * control.x + c * to.x;
        sprite.y = a * from.y + b * control.y + c * to.y;
        sprite.scaleX = sprite.scaleY = 0.7 + e * 0.6;
        if (k >= 1) {
          sprite.alpha = 0;
          orbFree.push(slot);
          onArrive?.();
          return true;
        }
        return false;
      },
      release() {
        sprite.alpha = 0;
        if (!orbFree.includes(slot)) orbFree.push(slot);
      },
    };
  }

  const orbs = [];

  return {
    burst,
    ring,
    bossImpact,
    shake,
    flash,
    orb(from, to, kind, options) {
      if (!enabled.orb) return;
      orbs.push(orb(from, to, kind, options));
    },
    configure(next) {
      Object.assign(enabled, next);
    },
    update(dt) {
      update(dt);
      for (let i = orbs.length - 1; i >= 0; i -= 1) if (orbs[i].update(dt)) orbs.splice(i, 1);
    },
    clear() {
      for (const particle of particles) {
        particle.life = 0;
        particle.sprite.alpha = 0;
      }
      for (const item of rings) {
        item.life = 0;
        item.sprite.alpha = 0;
      }
      for (const mark of bossMarks.values()) {
        mark.life = 0;
        mark.sprite.visible = false;
      }
      shakePower = 0;
      shakeTime = 0;
      world.x = 0;
      world.y = 0;
      for (const item of orbs) item.release?.();
      orbs.length = 0;
      if (flashSprite) flashSprite.visible = false;
    },
  };
}
