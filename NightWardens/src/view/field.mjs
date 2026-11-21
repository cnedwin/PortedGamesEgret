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
    bodyLayer = layer(),
    barLayer = layer(),
    lowFx = layer(),
    boltLayer = layer(),
    turretLayer = layer(),
    highFx = layer(),
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
    sparks: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.12, 0.3], speed: [140, 340], size: 7, startColor: 0xfff2b0, endColor: 0xff7020, endScale: 0.3, drag: 3, maxParticles: 600 }),
    scraps: emitter(lowFx, { texture: art.particles.scrap, lifetime: [0.6, 1.1], speed: [60, 210], angle: [200, 340], gravity: { x: 0, y: 300 }, drag: 1.2, size: 8, spin: [-540, 540], rotation: [0, 360], startColor: 0xf6f0e2, endColor: 0xbfb294, startAlpha: 1, endAlpha: 0 }),
    ghostfire: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.3, 0.75], speed: [40, 150], gravity: { x: 0, y: -140 }, size: 15, startColor: 0xb8ffe0, endColor: 0x1f9a78, endScale: 0.2 }),
    smoke: emitter(lowFx, { texture: art.particles.smoke, lifetime: [0.6, 1.2], speed: [18, 60], size: 40, startScale: 0.6, endScale: 1.7, startColor: 0xa6a6b6, endColor: 0x3a3a4a, startAlpha: 0.55, endAlpha: 0, maxParticles: 200 }),
    embers: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.35, 0.8], speed: [10, 50], angle: [240, 300], gravity: { x: 0, y: -150 }, size: 8, startColor: 0xffd070, endColor: 0xff3000, endScale: 0.2 }),
    gold: emitter(highFx, { texture: art.particles.glow, blendMode: 'add', lifetime: [0.4, 0.9], speed: [80, 280], drag: 2.2, size: 11, startColor: 0xfff0b0, endColor: 0xff9a30, endScale: 0.2 }),
    dust: emitter(lowFx, { texture: art.particles.smoke, lifetime: [0.7, 1.4], speed: [40, 140], angle: [180, 360], drag: 2, size: 46, startScale: 0.5, endScale: 1.8, startColor: 0x8a7a64, endColor: 0x3a3226, startAlpha: 0.6, endAlpha: 0, maxParticles: 160 }),
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
  const burst = (e, x, y, count) => {
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
      return entry;
    }
    // Shadows are painted into the frames themselves: one bitmap a haunt.
    const body = bodyLayer.addChild(use(new Bitmap(art.common.lease))),
      player = use(new SequencePlayer(body, art.common.clips[kind], 'loop'));
    const [w, h] = HAUNT_ART[kind].size;
    player.applyAt(0);
    centre(body, w * RES, h * RES);
    const bar = HAUNTS[kind].elite || kind === 'lantern' ? barLayer.addChild(use(new Sprite())) : null;
    return { kind, body, player, bar, flash: 0, shownHp: -1, w, h };
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
      g.lineStyle(z.width * 3, z.colour, 0.25 * fade);
      z.path.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineStyle(z.width, 0xffffff, 0.95 * fade);
      z.path.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineStyle(0);
    }
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
        if (entry) entry.flash = 0.07;
        if (warden?.haunt?.id === event.id) warden.flash = 0.06;
        burst(fx.sparks, event.x, event.y, event.crit ? 10 : 3);
        if (event.crit) burst(fx.gold, event.x, event.y, 6);
        break;
      }
      case 'kill': {
        const { x, y, kind } = event;
        if (kind === 'paper' || kind === 'general') burst(fx.scraps, x, y, kind === 'general' ? 60 : 12);
        if (kind === 'wisp' || kind === 'lantern' || kind === 'wuchang') burst(fx.ghostfire, x, y, kind === 'wuchang' ? 50 : 10);
        if (kind === 'jiangshi' || kind === 'bride' || kind === 'hanba') burst(fx.smoke, x, y, kind === 'hanba' ? 30 : 5);
        if (kind === 'lantern' || kind === 'hanba') burst(fx.embers, x, y, 16);
        if (event.boss) {
          burst(fx.gold, x, y, 80);
          shakeBy(12);
          flashSprite.alpha = 0.55;
          flashSprite.visible = true;
        }
        releaseHaunt(event.id);
        break;
      }
      case 'bite':
        burst(fx.dust, event.x, FIELD.wallY, 4);
        crackAt(event.x);
        shakeBy(Math.min(8, 2 + event.amount * 0.4));
        break;
      case 'shot':
        recoil = 5;
        break;
      case 'chain':
        zap(event.points, { colour: 0x8ccfff });
        break;
      case 'thunder':
        flashSprite.alpha = 0.7;
        flashSprite.visible = true;
        shakeBy(12);
        for (const [x, y] of event.points.slice(0, 28)) {
          zap([[x + (Math.random() - 0.5) * 60, -40], [x, y]], { life: 0.35, colour: 0xa8d8ff, width: 3.5, jag: 26 });
          burst(fx.sparks, x, y, 5);
        }
        break;
      case 'mirror':
        zaps.push({ kind: 'beam', x: event.x, life: 0.4, age: 0 });
        burst(fx.gold, event.x, FIELD.turretY - 30, 12);
        break;
      case 'spit':
        burst(fx.ghostfire, event.x, event.y + 10, 4);
        break;
      case 'stomp':
        if (warden) {
          warden.stompTime = 0.45;
          burst(fx.dust, event.x, event.y + warden.h * 0.35, 18);
        }
        shakeBy(9);
        break;
      case 'summon':
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
      entry.body.x = haunt.x;
      entry.body.y = haunt.y - lift - (haunt.kind === 'jiangshi' && (haunt.age + haunt.phase) % 1 < 0.42 ? Math.sin((((haunt.age + haunt.phase) % 1) / 0.42) * Math.PI) * 10 : 0);
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
