// 战场画面：只读规则的状态（world）和每一步的事件（events），把它们画出来。
// - 路面、城墙和暗角是画布后面页面自己的一张图，只画一次；邪祟（影子画在帧里）、符箭、魂珠都是同一张图集上的位图，从对象池里取用，引擎合成一批绘制。
// - 小怪的走路用 SequencePlayer 按它自己的年纪取帧；首领的走路交给 animation 入口的 createSequenceController，
//   由引擎的时钟推动，脚步标记（marker）落地时扬起尘土。
// - 命中闪白、冰冻发蓝、灼烧发红、雷击定身都是材质着色（createSharedMaterial2D 的 light 和 dark）。
// - 震屏移动整个画布（screens.mjs），路面和上面的东西一起震。
// - 火星、纸屑、鬼火、烟、尘土、金光和雾是粒子发射器（createParticleEmitter），一种一个，在需要的地方迸发。
// - 雷链、天雷、八卦镜的光柱和墨斗线是一张随事件重画的矢量图。
// The battlefield view: it reads only the state of the rules (world) and each step's events, and draws them.
// - The road with its wall and its dark edge is the page's picture behind the canvas, painted once; haunts (their shadows painted in), bolts and souls are bitmaps of one
//   atlas taken from pools, drawn by the engine as one batch.
// - A haunt's walk comes from a SequencePlayer at the haunt's own age; a warden's walk is the animation entry's
//   createSequenceController, run by the engine's clock, and its footfall marker raises dust.
// - The white flash of a hit, the blue of frost, the red of fire and the stun of thunder are material tints
//   (createSharedMaterial2D light and dark).
// - Shaking moves the whole canvas (screens.mjs), so the road and what is on it shake together.
// - Sparks, paper scraps, ghost fire, smoke, dust, gold and mist are particle emitters (createParticleEmitter), one of
//   each kind, burst where they are needed.
// - The thunder chain, the thunder talisman, the bagua mirror's beam and the ink line are one vector drawing redrawn as
//   events come.
import { Bitmap, DisplayObjectContainer, SequencePlayer, Sprite, createSharedMaterial2D } from '@egret/engine';
import { createSequenceController } from '@egret/engine/animation';
import { createParticleEmitter } from '@egret/engine/particles';
import { HAUNT_ART, RES } from '../art/atlas.mjs';
import { HAUNTS } from '../sim/data.mjs';
import { FIELD, SOUL_FLIGHT } from '../sim/world.mjs';

const DEG = 180 / Math.PI;
const GOLD = 0xf0cf83, VERMILION = 0xce5a47, IVORY = 0xfff4d7, LIGHTNING = 0xc7b6ff;

/** Anchor a bitmap at the centre of its `width` × `height` atlas pixels and draw it at `scale` of them. */
function centre(bitmap, width, height, scale = 1 / RES) {
  bitmap.anchorOffsetX = width / 2;
  bitmap.anchorOffsetY = height / 2;
  bitmap.scaleX = bitmap.scaleY = scale;
  return bitmap;
}

/** The material tints a haunt can wear. */
const TINTS = {
  flash: createSharedMaterial2D({ light: [1, 1, 1, 1], dark: [0.92, 0.88, 0.8] }),
  frost: createSharedMaterial2D({ light: [0.62, 0.86, 1, 1], dark: [0.05, 0.12, 0.25] }),
  burn: createSharedMaterial2D({ light: [1, 0.74, 0.56, 1], dark: [0.28, 0.05, 0] }),
  stun: createSharedMaterial2D({ light: [0.78, 0.86, 1, 1], dark: [0.3, 0.38, 0.62] })
};

/** Each night's colour of mist. */
const MIST = { temple: 0x8ea0d8, graves: 0x9ed8b8, market: 0x9ee0c8 };

/**
 * The view of one night. `art` holds the loaded atlases and textures (screens.mjs loads them); `reducedMotion` turns
 * off the shaking and most of the drifting. Returns the root to place, `update(seconds, events)` to call each frame,
 * and `steerAt(x)` to turn a stage point into a place on the road.
 */
export function createField(app, scope, world, art, { reducedMotion = false } = {}) {
  const engine = app.game.engine,
    use = (thing) => scope.use(thing);
  const root = use(new DisplayObjectContainer()),
    shaker = root.addChild(use(new DisplayObjectContainer()));
  const layer = () => shaker.addChild(use(new DisplayObjectContainer()));

  // The road itself is the page's picture behind the canvas (screens.mjs); the engine draws what lies on it.
  const cracksLayer = layer(),
    inkLayer = layer(),
    warningSprite = shaker.addChild(use(new Sprite())),
    bodyLayer = layer(),
    barLayer = layer(),
    lowFx = layer(),
    trailSprite = shaker.addChild(use(new Sprite())),
    boltLayer = layer(),
    turretLayer = layer(),
    highFx = layer(),
    impactSprite = shaker.addChild(use(new Sprite())),
    zapSprite = shaker.addChild(use(new Sprite())),
    flashSprite = shaker.addChild(use(new Sprite()));
  flashSprite.graphics.beginFill(0xe8f0ff, 1).drawRect(-20, -20, FIELD.width + 40, FIELD.height + 40).endFill();
  flashSprite.alpha = 0;
  flashSprite.visible = false;

  // ——— Particles: one emitter of each kind, burst where something happens. ———
  const emitter = (parent, options) => {
    const e = use(createParticleEmitter({ running: false, maxParticles: 400, ...options }));
    parent.addChild(e.display);
    return e;
  };
  const fx = {
    sparks: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.1, 0.24], speed: [100, 260], size: 5, startColor: IVORY, endColor: VERMILION, endScale: 0.15, drag: 4, maxParticles: 160 }),
    scraps: emitter(lowFx, { texture: art.particles.scrap, lifetime: [0.35, 0.7], speed: [55, 180], angle: [195, 345], gravity: { x: 0, y: 260 }, drag: 1.8, size: 7, spin: [-420, 420], rotation: [0, 360], startColor: 0xf6dca1, endColor: VERMILION, startAlpha: 1, endAlpha: 0, maxParticles: 128 }),
    ghostfire: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.22, 0.55], speed: [35, 120], gravity: { x: 0, y: -120 }, size: 12, startColor: 0xb8ffe0, endColor: 0x278b89, endScale: 0.15, maxParticles: 100 }),
    smoke: emitter(lowFx, { texture: art.particles.smoke, lifetime: [0.4, 0.85], speed: [18, 55], size: 29, startScale: 0.6, endScale: 1.4, startColor: 0x8592a9, endColor: 0x253348, startAlpha: 0.4, endAlpha: 0, maxParticles: 60 }),
    embers: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.2, 0.55], speed: [15, 65], angle: [235, 305], gravity: { x: 0, y: -120 }, size: 6, startColor: GOLD, endColor: VERMILION, endScale: 0.15, maxParticles: 96 }),
    gold: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.25, 0.6], speed: [75, 240], drag: 3, size: 8, startColor: IVORY, endColor: GOLD, endScale: 0.15, maxParticles: 160 }),
    frost: emitter(highFx, { texture: art.particles.scrap, blendMode: 'add', lifetime: [0.14, 0.35], speed: [60, 150], size: 4, rotation: [0, 360], spin: [-90, 90], startColor: 0xe0f7ff, endColor: 0x86bde5, endScale: 0.3, maxParticles: 64 }),
    dust: emitter(lowFx, { texture: art.particles.smoke, lifetime: [0.4, 0.9], speed: [35, 110], angle: [180, 360], drag: 3, size: 31, startScale: 0.5, endScale: 1.5, startColor: 0x9a8c73, endColor: 0x343b46, startAlpha: 0.45, endAlpha: 0, maxParticles: 60 }),
    mist: emitter(highFx, {
      texture: art.particles.smoke,
      running: !reducedMotion,
      rate: 2.2,
      lifetime: [6, 9],
      speed: [6, 18],
      angle: [-20, 20],
      size: 120,
      startScale: 0.8,
      endScale: 1.4,
      startColor: MIST[world.plan.ground],
      endColor: MIST[world.plan.ground],
      startAlpha: 0.11,
      endAlpha: 0,
      shape: { kind: 'rectangle', width: FIELD.width, height: 220 },
      // Few and soft: each is a large translucent square, and many of them cost a software renderer dear.
      maxParticles: 24,
      seed: world.seed
    })
  };
  fx.mist.x = FIELD.width / 2;
  fx.mist.y = 150;
  let burstBudget = 160;
  const burst = (e, x, y, count) => {
    count = Math.min(burstBudget, Math.ceil(count * (reducedMotion ? 0.5 : 1)));
    if (!count) return;
    burstBudget -= count;
    e.x = x;
    e.y = y;
    e.burst(count);
  };

  // ——— The crossbow on its tower. ———
  const tower = turretLayer.addChild(use(art.common.sheet.createBitmap('tower')));
  const crossbow = turretLayer.addChild(use(art.common.sheet.createBitmap('crossbow')));
  const region = (name) => art.common.sheet.getRegion(name);
  centre(tower, region('tower').width, region('tower').height);
  centre(crossbow, region('crossbow').width, region('crossbow').height);
  // The crossbow turns about its grip, low on the stock.
  crossbow.anchorOffsetY = region('crossbow').height * 0.72;
  tower.y = FIELD.wallY + 2;
  let recoil = 0;

  // ——— Pools: haunts by kind, bolts, spit, souls, cracks. ———
  const pools = {},
    live = new Map();
  function takeHaunt(kind) {
    const pool = (pools[kind] ??= []);
    const entry = pool.pop();
    if (entry) {
      entry.body.visible = true;
      entry.flash = entry.kick = 0;
      return entry;
    }
    // Shadows are painted into the frames themselves: one bitmap a haunt.
    const body = bodyLayer.addChild(use(new Bitmap(art.common.lease))),
      player = use(new SequencePlayer(body, art.common.clips[kind], 'loop'));
    const [w, h] = HAUNT_ART[kind].size;
    player.applyAt(0);
    centre(body, w * RES, h * RES);
    const bar = HAUNTS[kind].elite || kind === 'lantern' ? barLayer.addChild(use(new Sprite())) : null;
    return { kind, body, player, bar, flash: 0, kick: 0, kickX: 0, kickY: 0, shownHp: -1, w, h };
  }
  function releaseHaunt(id) {
    const entry = live.get(id);
    if (!entry) return;
    live.delete(id);
    entry.body.visible = false;
    if (entry.bar) entry.bar.visible = false;
    pools[entry.kind].push(entry);
  }

  /** A pool of still pictures of the sprite sheet, shown `count` at a time. */
  function stillPool(parent, name) {
    const items = [];
    return {
      items,
      show(count) {
        while (items.length < count) {
          const b = parent.addChild(use(art.common.sheet.createBitmap(name)));
          centre(b, region(name).width, region(name).height);
          items.push(b);
        }
        for (let i = 0; i < items.length; i++) items[i].visible = i < count;
        return items;
      }
    };
  }
  const bolts = stillPool(boltLayer, 'bolt'),
    blueBolts = stillPool(boltLayer, 'boltBlue'),
    spits = stillPool(boltLayer, 'spit'),
    souls = stillPool(highFx, 'soul');
  const cracks = [];
  function crackAt(x) {
    let c;
    if (cracks.length < 16) {
      c = cracksLayer.addChild(use(art.common.sheet.createBitmap('crack')));
      centre(c, region('crack').width, region('crack').height);
      cracks.push(c);
    } else cracks.push((c = cracks.shift()));
    c.x = x + (Math.random() - 0.5) * 20;
    c.y = FIELD.wallY + 22 + Math.random() * 40;
    c.rotation = (Math.random() - 0.5) * 60;
  }

  // ——— The warden: its walk run by the engine's clock, its stomp a still frame shown for a moment. ———
  let warden = null;
  function makeWarden(kind) {
    const atlas = art.warden,
      body = bodyLayer.addChild(use(new Bitmap(atlas.lease))),
      stomp = bodyLayer.addChild(use(new Bitmap(atlas.lease)));
    const [w, h] = atlas.size;
    for (const b of [body, stomp]) centre(b, w * RES, h * RES);
    use(new SequencePlayer(stomp, atlas.stomp, 'once')).applyAt(0);
    stomp.visible = false;
    const controller = use(
      createSequenceController(engine, scope, body, atlas.walk, {
        profile: 'egret.sequence-control/1',
        totalPlays: 'infinite',
        // A footfall at the start of each frame of the walk. Marker ids must differ (ENGINE-NOTES 1).
        markers: [
          { id: 'stepLeft', timeSeconds: 0 },
          { id: 'stepRight', timeSeconds: atlas.seconds }
        ],
        onEvent: (event) => {
          if (event.kind === 'marker' && warden?.haunt && !reducedMotion) burst(fx.dust, warden.haunt.x + (Math.random() - 0.5) * w * 0.5, warden.haunt.y + h * 0.4, 3);
          return undefined;
        }
      })
    );
    controller.start();
    return { kind, body, stomp, controller, w, h, stompTime: 0, flash: 0, haunt: null };
  }

  // ——— Lines: the thunder chain, the thunder talisman, the mirror's beam. ———
  const zaps = [];
  let zapsDrawn = false;
  /** A jagged line through `points`, fading over `life` seconds. */
  function zap(points, { life = 0.22, colour = 0xbfe4ff, width = 3, jag = 10 } = {}) {
    if (zaps.length >= 40) zaps.shift();
    const path = [];
    for (let i = 0; i < points.length; i++) {
      if (i > 0) {
        const [x0, y0] = points[i - 1],
          [x1, y1] = points[i],
          steps = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 18));
        for (let s = 1; s < steps; s++) path.push([x0 + ((x1 - x0) * s) / steps + (Math.random() - 0.5) * jag, y0 + ((y1 - y0) * s) / steps + (Math.random() - 0.5) * jag]);
      }
      path.push(points[i]);
    }
    zaps.push({ kind: 'line', path, life, age: 0, colour, width });
  }
  function drawZaps(seconds) {
    const g = zapSprite.graphics;
    if (!zaps.length && !zapsDrawn) return;
    g.clear();
    zapsDrawn = zaps.length > 0;
    for (let i = zaps.length - 1; i >= 0; i--) {
      const z = zaps[i];
      z.age += seconds;
      if (z.age >= z.life) {
        zaps.splice(i, 1);
        continue;
      }
      const fade = 1 - z.age / z.life;
      if (z.kind === 'beam') {
        const half = 26 * (0.6 + 0.4 * fade);
        g.beginLinearGradientFill(z.x - half, 0, z.x + half, 0, [
          { offset: 0, color: 0xffd080, alpha: 0 },
          { offset: 0.5, color: 0xfff6dc, alpha: 0.85 * fade },
          { offset: 1, color: 0xffd080, alpha: 0 }
        ])
          .drawRect(z.x - half, -40, half * 2, FIELD.turretY + 20)
          .endFill();
        continue;
      }
      g.lineStyle(z.width * 3, z.colour, 0.18 * fade);
      z.path.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineStyle(z.width, 0xfff5e4, 0.95 * fade);
      z.path.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineStyle(0);
    }
  }

  // Short, local talisman strokes retain a readable impact without covering neighbouring enemies.
  const impacts = [];
  let impactsDrawn = false;
  function seal(x, y, size, colour = GOLD, life = .22) {
    if (impacts.length >= 56) impacts.shift();
    impacts.push({ x, y, size, colour, life, age: 0 });
  }
  function drawImpacts(seconds) {
    if (!impacts.length && !impactsDrawn) return;
    const g = impactSprite.graphics;
    g.clear();
    impactsDrawn = impacts.length > 0;
    for (let i = impacts.length - 1; i >= 0; i--) {
      const mark = impacts[i];
      mark.age += seconds;
      if (mark.age >= mark.life) { impacts.splice(i, 1); continue; }
      const phase = mark.age / mark.life, fade = 1 - phase;
      const r = mark.size * (.45 + .7 * phase);
      g.lineStyle(1.2, mark.colour, fade * .8).drawCircle(mark.x, mark.y, r);
      for (let ray = 0; ray < 4; ray++) {
        const angle = ray * Math.PI / 2 + Math.PI / 4;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        g.lineStyle(2 * fade + .5, mark.colour, fade)
          .moveTo(mark.x + dx * r * .48, mark.y + dy * r * .48)
          .lineTo(mark.x + dx * r * 1.32, mark.y + dy * r * 1.32);
      }
      g.lineStyle(0).beginFill(IVORY, Math.max(0, 1 - phase * 4) * .8)
        .drawCircle(mark.x, mark.y, Math.max(1, r * .22)).endFill();
    }
  }

  let warningsDrawn = false;
  function drawWarnings() {
    const g = warningSprite.graphics;
    if (warningsDrawn) g.clear();
    warningsDrawn = false;
    let count = 0;
    for (const haunt of world.haunts) {
      if (haunt.dead || haunt.stun > 0 || haunt.y <= 40 || count >= 12) continue;
      const kind = HAUNTS[haunt.kind];
      const shooting = kind.shoot && haunt.shootTimer < .6;
      const summoning = kind.summon && haunt.summonTimer < .8;
      const stomping = kind.stomp && haunt.stompTimer < .7;
      if (!shooting && !summoning && !stomping) continue;
      warningsDrawn = true;
      count++;
      const time = shooting ? haunt.shootTimer / .6 : summoning ? haunt.summonTimer / .8 : haunt.stompTimer / .7;
      const radius = haunt.radius + 6 + (1 - time) * 5;
      const alpha = .35 + (1 - time) * .45;
      const y = haunt.y + haunt.radius * .55;
      g.lineStyle(1.5, VERMILION, alpha).drawEllipse(haunt.x - radius, y - radius * .36, radius * 2, radius * .72);
      g.lineStyle(1, GOLD, alpha * .65).drawEllipse(haunt.x - radius + 4, y - radius * .36 + 2, radius * 2 - 8, radius * .72 - 4);
      if (shooting) {
        g.lineStyle(1, VERMILION, alpha * .25).moveTo(haunt.x, haunt.y + haunt.radius).lineTo(haunt.x, FIELD.wallY);
        g.lineStyle(0).beginFill(VERMILION, alpha * .6).drawRect(haunt.x - 10, FIELD.wallY - 3, 20, 3).endFill();
      }
    }
  }

  let trailsDrawn = false;
  function drawTrails() {
    if (!world.bolts.length && !world.spits.length && !trailsDrawn) return;
    const g = trailSprite.graphics;
    g.clear();
    trailsDrawn = world.bolts.length > 0 || world.spits.length > 0;
    for (const bolt of world.bolts.slice(0, 96)) {
      const length = Math.hypot(bolt.vx, bolt.vy) || 1;
      const dx = bolt.vx / length, dy = bolt.vy / length;
      const colour = bolt.chain ? LIGHTNING : world.wards.fire ? VERMILION : world.wards.frost ? 0xa3d6ef : GOLD;
      g.lineStyle(bolt.chain ? 5 : 3, colour, .18).moveTo(bolt.x - dx * 28, bolt.y - dy * 28).lineTo(bolt.x, bolt.y);
      g.lineStyle(1.1, bolt.chain ? IVORY : colour, .65).moveTo(bolt.x - dx * 15, bolt.y - dy * 15).lineTo(bolt.x, bolt.y);
    }
    for (const spit of world.spits.slice(0, 40)) {
      g.lineStyle(4, VERMILION, .16).moveTo(spit.x, spit.y - 23).lineTo(spit.x, spit.y);
    }
    g.lineStyle(0);
  }

  // ——— The ink line, drawn while it lies across the road. ———
  const inkSprite = inkLayer.addChild(use(new Sprite()));
  let inkShown = null;
  function drawInk() {
    if (world.ink === inkShown) return;
    inkShown = world.ink;
    const g = inkSprite.graphics;
    g.clear();
    if (!inkShown) return;
    const y = inkShown.y;
    g.lineStyle(10, 0x000000, 0.25).moveTo(0, y).lineTo(FIELD.width, y);
    g.lineStyle(3, 0x0c0a14, 0.95).moveTo(0, y).lineTo(FIELD.width, y);
    g.lineStyle(1, 0xf0c060, 0.8).moveTo(0, y - 2).lineTo(FIELD.width, y - 2);
    g.lineStyle(0);
    for (let x = 18; x < FIELD.width; x += 54) g.beginFill(0xf0c060, 0.9).drawCircle(x, y, 2.4).endFill();
  }

  // ——— Shaking. ———
  let shake = 0;
  const shakeBy = (amount) => {
    if (!reducedMotion) shake = Math.min(14, shake + amount);
  };

  /** What each happening looks like. */
  function show(event) {
    switch (event.type) {
      case 'hit': {
        const entry = live.get(event.id);
        if (entry) {
          entry.flash = .075;
          entry.kick = reducedMotion ? 0 : event.crit ? 6 : 3;
          const dx = event.x - world.turret.x, dy = event.y - FIELD.turretY, distance = Math.hypot(dx, dy) || 1;
          entry.kickX = dx / distance;
          entry.kickY = dy / distance;
        }
        if (warden?.haunt?.id === event.id) warden.flash = 0.06;
        burst(fx.sparks, event.x, event.y, event.crit ? 10 : 3);
        seal(event.x, event.y, event.crit ? 16 : 8, event.crit ? IVORY : GOLD, event.crit ? .27 : .16);
        if (world.wards.fire) burst(fx.embers, event.x, event.y, 3);
        if (world.wards.frost) burst(fx.frost, event.x, event.y, 4);
        if (event.crit) burst(fx.gold, event.x, event.y, 6);
        break;
      }
      case 'kill': {
        const { x, y, kind } = event;
        seal(x, y, event.boss ? 66 : 19, event.cause === 'thunder' ? LIGHTNING : VERMILION, event.boss ? .65 : .28);
        if (kind === 'paper' || kind === 'general') burst(fx.scraps, x, y, kind === 'general' ? 60 : 12);
        if (kind === 'wisp' || kind === 'lantern' || kind === 'wuchang') burst(fx.ghostfire, x, y, kind === 'wuchang' ? 50 : 10);
        if (kind === 'jiangshi' || kind === 'bride' || kind === 'hanba') burst(fx.smoke, x, y, kind === 'hanba' ? 30 : 5);
        if (kind === 'lantern' || kind === 'hanba') burst(fx.embers, x, y, 16);
        if (event.boss) {
          burst(fx.gold, x, y, 52);
          shakeBy(12);
          flashSprite.alpha = reducedMotion ? .08 : .24;
          flashSprite.visible = true;
        }
        releaseHaunt(event.id);
        break;
      }
      case 'bite':
        seal(event.x, FIELD.wallY, 25, VERMILION, .24);
        burst(fx.dust, event.x, FIELD.wallY, 4);
        crackAt(event.x);
        shakeBy(Math.min(8, 2 + event.amount * 0.4));
        break;
      case 'shot':
        recoil = reducedMotion ? 0 : 5;
        seal(world.turret.x + Math.cos(world.turret.aim) * 28, FIELD.turretY + Math.sin(world.turret.aim) * 28, 7, GOLD, .1);
        break;
      case 'chain':
        zap(event.points, { colour: LIGHTNING, life: .17, width: 2.4, jag: 12 });
        for (const [x, y] of event.points) seal(x, y, 12, LIGHTNING, .2);
        break;
      case 'thunder':
        flashSprite.alpha = reducedMotion ? .08 : .28;
        flashSprite.visible = true;
        shakeBy(12);
        for (const [x, y] of event.points.slice(0, 18)) {
          zap([[x + (Math.random() - 0.5) * 60, -40], [x, y]], { life: .25, colour: LIGHTNING, width: 3, jag: 26 });
          seal(x, y, 26, LIGHTNING, .3);
          burst(fx.sparks, x, y, 5);
        }
        break;
      case 'mirror':
        if (zaps.length >= 40) zaps.shift();
        zaps.push({ kind: 'beam', x: event.x, life: 0.4, age: 0 });
        burst(fx.gold, event.x, FIELD.turretY - 30, 12);
        break;
      case 'spit':
        burst(fx.ghostfire, event.x, event.y + 10, 4);
        break;
      case 'stomp':
        seal(event.x, event.y + (warden?.h ?? 70) * .35, 55, VERMILION, .45);
        if (warden) {
          warden.stompTime = 0.45;
          burst(fx.dust, event.x, event.y + warden.h * 0.35, 18);
        }
        shakeBy(9);
        break;
      case 'summon':
        seal(event.x, event.y, 34, VERMILION, .4);
        burst(fx.ghostfire, event.x, event.y, 14);
        break;
      case 'level':
      case 'ward':
        burst(fx.gold, world.turret.x, FIELD.turretY - 10, 30);
        break;
      case 'bossCame':
        shakeBy(6);
        break;
    }
  }

  /** Put every haunt where the rules have it, with its frame and tint. */
  function placeHaunts(seconds) {
    for (const haunt of world.haunts) {
      const h = HAUNTS[haunt.kind];
      if (h.boss) {
        warden ??= makeWarden(haunt.kind);
        warden.haunt = haunt;
        continue;
      }
      let entry = live.get(haunt.id);
      if (!entry) live.set(haunt.id, (entry = takeHaunt(haunt.kind)));
      const lift = haunt.kind === 'wisp' || haunt.kind === 'lantern' || haunt.kind === 'bride' ? 10 + Math.sin(haunt.age * 3 + haunt.phase) * 3 : 0;
      // A jiangshi's frame follows its hop: up while it leaps.
      const time = haunt.kind === 'jiangshi' ? ((haunt.age + haunt.phase) % 1 < 0.42 ? HAUNT_ART.jiangshi.seconds : 0) : haunt.stun > 0 ? 0 : haunt.age + haunt.phase;
      entry.player.applyAt(time);
      entry.kick = Math.max(0, entry.kick - seconds * 38);
      entry.body.x = haunt.x + entry.kickX * entry.kick;
      entry.body.y = haunt.y + entry.kickY * entry.kick - lift - (haunt.kind === 'jiangshi' && (haunt.age + haunt.phase) % 1 < 0.42 ? Math.sin((((haunt.age + haunt.phase) % 1) / 0.42) * Math.PI) * 10 : 0);
      entry.body.alpha = Math.min(1, haunt.age * 3);
      entry.flash = Math.max(0, entry.flash - seconds);
      entry.body.sharedMaterial = entry.flash > 0 ? TINTS.flash : haunt.stun > 0 ? TINTS.stun : haunt.slow > 0 ? TINTS.frost : haunt.burn > 0 ? TINTS.burn : null;
      if (haunt.burn > 0 && Math.random() < seconds * 8) burst(fx.embers, haunt.x + (Math.random() - 0.5) * 14, haunt.y - 6, 1);
      if (entry.bar) {
        const hp = Math.max(0, Math.round((haunt.hp / haunt.max) * 20));
        entry.bar.visible = haunt.hp < haunt.max;
        entry.bar.x = haunt.x - 18;
        entry.bar.y = haunt.y - entry.h * 0.5 - 4;
        if (hp !== entry.shownHp) {
          entry.shownHp = hp;
          entry.bar.graphics.clear().beginFill(0x0a0a10, 0.8).drawRect(-1, -1, 38, 5).endFill().beginFill(haunt.kind === 'bride' ? 0xe04050 : 0xffa040, 1).drawRect(0, 0, (36 * hp) / 20, 3).endFill();
        }
      }
    }
    // Haunts that left the road without a kill (they bit the wall) are let go too.
    if (live.size > world.haunts.length) {
      const here = new Set(world.haunts.map((h) => h.id));
      for (const id of [...live.keys()]) if (!here.has(id)) releaseHaunt(id);
    }
    if (warden) {
      const haunt = warden.haunt && !warden.haunt.dead && world.boss === warden.haunt ? warden.haunt : null;
      if (!haunt) {
        // The warden fell: its pictures go, its clock stops.
        warden.body.visible = warden.stomp.visible = false;
        warden.controller.stop();
        // A pending ward choice may pause the live walk below, but never a retired controller.
        warden = null;
      } else {
        warden.stompTime = Math.max(0, warden.stompTime - seconds);
        warden.flash = Math.max(0, warden.flash - seconds);
        const stomping = warden.stompTime > 0;
        warden.body.visible = !stomping;
        warden.stomp.visible = stomping;
        const bob = warden.kind === 'wuchang' ? Math.sin(haunt.age * 1.8) * 6 : 0;
        for (const b of [warden.body, warden.stomp]) {
          b.x = haunt.x;
          b.y = haunt.y + bob;
          b.alpha = Math.min(1, haunt.age * 1.5);
          b.sharedMaterial = warden.flash > 0 ? TINTS.flash : haunt.stun > 0 ? TINTS.stun : haunt.burn > 0 ? TINTS.burn : null;
        }
        if (haunt.burn > 0 && Math.random() < seconds * 14) burst(fx.embers, haunt.x + (Math.random() - 0.5) * 60, haunt.y, 1);
      }
    }
  }

  function placeFlyers() {
    // Bolts: gold, or blue for the thunder chain's shot.
    let gold = 0,
      blue = 0;
    for (const b of world.bolts) (b.chain ? blue++ : gold++);
    const goldItems = bolts.show(gold),
      blueItems = blueBolts.show(blue);
    gold = blue = 0;
    for (const b of world.bolts) {
      const item = b.chain ? blueItems[blue++] : goldItems[gold++];
      item.x = b.x;
      item.y = b.y;
      item.rotation = Math.atan2(b.vy, b.vx) * DEG + 90;
    }
    const spitItems = spits.show(world.spits.length);
    world.spits.forEach((s, i) => {
      spitItems[i].x = s.x + Math.sin(s.y * 0.05) * 3;
      spitItems[i].y = s.y;
    });
    // Souls fly home along an arc.
    const soulItems = souls.show(world.orbs.length);
    world.orbs.forEach((o, i) => {
      const t = Math.min(1, o.time / SOUL_FLIGHT),
        ease = t * t * (3 - 2 * t),
        tx = world.turret.x,
        ty = FIELD.turretY;
      soulItems[i].x = o.x + (tx - o.x) * ease + Math.sin(t * Math.PI) * 30 * Math.sign(o.x - tx || 1);
      soulItems[i].y = o.y + (ty - o.y) * ease - Math.sin(t * Math.PI) * 60;
      soulItems[i].scaleX = soulItems[i].scaleY = (1 + 0.4 * Math.sin(t * Math.PI)) / RES;
    });
  }

  return {
    root,
    /** Draw one frame: `events` are what happened since the last frame. */
    update(seconds, events) {
      burstBudget = 160;
      for (const event of events) show(event);
      placeHaunts(seconds);
      placeFlyers();
      // The crossbow follows the rules' aim and kicks back on each shot.
      recoil = Math.max(0, recoil - seconds * 40);
      crossbow.rotation = world.turret.aim * DEG + 90;
      crossbow.x = world.turret.x - Math.cos(world.turret.aim) * recoil;
      crossbow.y = FIELD.turretY - Math.sin(world.turret.aim) * recoil;
      tower.x = world.turret.x;
      drawInk();
      drawWarnings();
      drawTrails();
      drawImpacts(seconds);
      drawZaps(seconds);
      flashSprite.alpha = Math.max(0, flashSprite.alpha - seconds * 2.5);
      flashSprite.visible = flashSprite.alpha > 0;
      if (warden && world.offer) warden.controller.pause();
      else if (warden && warden.controller.getStatus().state === 'paused') warden.controller.resume();
      for (const e of Object.values(fx)) e.update(world.offer ? 0 : seconds);
      shake = Math.max(0, shake - seconds * 30);
      this.shakeX = shake ? (Math.random() - 0.5) * shake : 0;
      this.shakeY = shake ? (Math.random() - 0.5) * shake : 0;
    },
    /** How far the whole picture is shaken this frame, in field units; screens.mjs moves the canvas by it. */
    shakeX: 0,
    shakeY: 0,
    /** How many particles live, for the stats readout and tests. */
    particles: () => Object.values(fx).reduce((sum, e) => sum + e.alive, 0)
  };
}
