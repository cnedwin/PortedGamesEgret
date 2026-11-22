// Native Egret 2D: shared painted atlas, foot-sorted actors and bounded effects.
// Event clocks animate presentation only. Simulation owns every hit and move.
import { Bitmap, DisplayObjectContainer, Sprite, createSharedMaterial2D } from '@egret/engine';
import { MAPS } from './sim/data.mjs';
import { buildArt } from './art/paint.mjs';
import { combatPose } from './art/effects.mjs';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const degrees = angle => angle * 180 / Math.PI;
const HURT = createSharedMaterial2D({ light: [1, 1, 1, 1], dark: [.5, .16, .1] });
const WHITE = createSharedMaterial2D({ light: [1, 1, 1, 1], dark: [.48, .39, .24] });
const GOLD = createSharedMaterial2D({ light: [1, .95, .76, 1], dark: [.12, .065, .01] });
const JADE = createSharedMaterial2D({ light: [.81, 1, .93, 1], dark: [.015, .065, .05] });
const CINNABAR = createSharedMaterial2D({ light: [1, .62, .36, 1], dark: [.18, .035, .015] });
const FX_LIMIT = 76;
const FX_FALLBACKS = {
  'fx-cut': 'slash', 'fx-impact': 'impact', 'fx-spark': 'impact', 'fx-splinter': 'dust',
  'fx-brush': 'dust', 'fx-dust': 'dust', 'fx-ringtrail': 'ring', 'fx-ringreturn': 'ring',
  'fx-sigil': 'level', 'fx-talisman': 'seal'
};

export async function createView(game, scope, { width = 1280, height = 720, reducedMotion = false } = {}) {
  const art = await buildArt(game, scope, MAPS);
  const use = object => scope.use(object);
  const container = parent => parent.addChild(use(new DisplayObjectContainer()));
  const root = use(new DisplayObjectContainer()), world = container(root);
  const groundLane = container(world), underLane = container(world), depthLane = container(world), fxLane = container(world);
  const warning = underLane.addChild(use(new Sprite())), pathLine = underLane.addChild(use(new Sprite()));
  const camera = { x: 0, y: 0, zoom: 1, width, height, mapId: null };
  const scenery = {}, grounds = {}, actors = new Map(), drops = new Map(), motions = new Map();
  const effects = [], effectPool = [], numbers = [], numberPool = [];
  let time = 0, lastState, activeMap = null, hitShake = 0, disposed = false, fxMade = 0, numberMade = 0;
  let ringClock = 0, lastRing = null;
  const frameStats = { actors: 0, scenery: 0, effects: 0, effectsCreated: 0, effectLimit: FX_LIMIT,
    textures: (art.atlases?.length ?? 1) + 2 + Object.values(art.structures).reduce((n, list) => n + list.length, 0), native2D: true };

  function frameKey(key) {
    if (art.frames[key]) return key;
    return FX_FALLBACKS[key.replace(/:\d+$/, '')] ?? key;
  }
  function setFrame(bitmap, requested) {
    const key = frameKey(requested), frame = art.frames[key];
    if (!frame || bitmap.frameKey === key) return frame;
    const lease = art.atlases?.[frame.page ?? 0] ?? art.atlas;
    // Changing the lease resets its crop. Always bind the new page first.
    if (bitmap.textureLease !== lease) bitmap.textureLease = lease;
    bitmap.sourceRect = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    bitmap.anchorOffsetX = frame.width / 2;
    bitmap.anchorOffsetY = frame.pivotY * art.res;
    bitmap.scaleX = bitmap.scaleY = 1 / art.res;
    bitmap.frameKey = key;
    return frame;
  }
  function sprite(key, parent) {
    const frame = art.frames[frameKey(key)];
    const bitmap = parent.addChild(use(new Bitmap(art.atlases?.[frame?.page ?? 0] ?? art.atlas)));
    setFrame(bitmap, key);
    return bitmap;
  }
  function shadow(radius = 24) {
    const node = underLane.addChild(use(new Sprite()));
    node.graphics.beginFill(0x10201d, .13).drawEllipse(-radius, -radius * .28, radius * 2, radius * .56).endFill()
      .beginFill(0x10201d, .18).drawEllipse(-radius * .62, -radius * .15, radius * 1.24, radius * .3).endFill();
    return node;
  }
  for (const [id] of Object.entries(MAPS)) {
    const bitmap = groundLane.addChild(use(new Bitmap(art.grounds[id].lease)));
    bitmap.visible = false;
    grounds[id] = bitmap;
    scenery[id] = art.structures[id].map((structure, index) => {
      const node = depthLane.addChild(use(new Bitmap(structure.lease)));
      node.anchorOffsetX = structure.pivotX;
      node.anchorOffsetY = structure.pivotY;
      node.x = structure.x;
      node.y = structure.y;
      node.visible = false;
      return { node, y: structure.y, id: `scenery:${id}:${index}` };
    });
  }
  const portal = sprite('portal', underLane), heroShadow = shadow(27), hero = sprite('heroBack:0', depthLane);
  const heroSelection = underLane.addChild(use(new Sprite()));
  const artifact = sprite('ring', fxLane), charm = sprite('seal', depthLane), quest = sprite('quest', fxLane);
  artifact.visible = charm.visible = quest.visible = false;

  function updateCamera(state, dt, snap = false) {
    const map = MAPS[state.mapId], zoom = width < 700 ? .92 : width > 1400 ? 1.12 : 1.04;
    const x = clamp(state.hero.x - width / (2 * zoom), 0, Math.max(0, map.width - width / zoom));
    const y = clamp(state.hero.y - height * .64 / zoom, 0, Math.max(0, map.height - height / zoom));
    const ease = snap || reducedMotion ? 1 : 1 - Math.exp(-9 * Math.max(0, dt));
    camera.zoom = zoom;
    camera.x += (x - camera.x) * ease;
    camera.y += (y - camera.y) * ease;
    world.scaleX = world.scaleY = zoom;
    world.x = -camera.x * zoom + (reducedMotion ? 0 : Math.sin(time * 79) * hitShake);
    world.y = -camera.y * zoom + (reducedMotion ? 0 : Math.cos(time * 63) * hitShake * .45);
    hitShake = Math.max(0, hitShake - dt * 20);
  }
  function changeMap(state) {
    activeMap = state.mapId;
    camera.mapId = activeMap;
    for (const [id, bitmap] of Object.entries(grounds)) bitmap.visible = id === activeMap;
    for (const [id, list] of Object.entries(scenery)) for (const entry of list) entry.node.visible = id === activeMap;
    for (const actor of actors.values()) actor.body.visible = actor.bar.visible = actor.shadow.visible = false;
    for (const drop of drops.values()) drop.body.visible = drop.glow.visible = false;
    for (const fx of effects) { fx.body.visible = false; effectPool.push(fx); }
    for (const n of numbers) { n.root.visible = false; numberPool.push(n); }
    effects.length = numbers.length = 0;
    motions.clear();
    ringClock = 0;
    lastRing = null;
    const point = MAPS[activeMap].portal;
    portal.x = point.x;
    portal.y = point.y;
    updateCamera(state, 0, true);
  }
  function motionFor(id) {
    if (!motions.has(id)) motions.set(id, { step: 0, x: null, y: null, attackAt: -Infinity,
      hurtAt: -Infinity, deathAt: -Infinity, direction: null, dustAt: -Infinity });
    return motions.get(id);
  }
  function actorEntry(id, kind) {
    if (!actors.has(id)) actors.set(id, { id, body: sprite(`${kind}:0`, depthLane),
      shadow: shadow(kind === 'boss' ? 39 : kind === 'wolf' ? 31 : 22),
      bar: fxLane.addChild(use(new Sprite())), kind, hp: -1, maxHp: 0 });
    return actors.get(id);
  }
  function bodyFrame(body, groundShadow, kind, who, id) {
    const motion = motionFor(id), angle = Number.isFinite(who.facing) ? who.facing : Math.PI / 2;
    const back = Math.sin(angle) < -.36, mirror = Math.cos(angle) < -.22 ? -1 : 1;
    const dead = Boolean(who.dead || who.action === 'dead');
    const walking = !dead && (who.action === 'walk' || who.state === 'walk');
    const distance = motion.x === null ? 0 : Math.hypot(who.x - motion.x, who.y - motion.y);
    if (walking && distance < 80) motion.step += distance / (kind === 'wolf' ? 78 : 68) * TAU;
    motion.x = who.x;
    motion.y = who.y;
    const windup = who.telegraph ? clamp(1 - who.telegraph.remaining / who.telegraph.total, 0, 1) : 0;
    const pose = combatPose({ time, step: motion.step, walking, kind, dead, reducedMotion, windup,
      attackAge: time - motion.attackAt, hurtAge: time - motion.hurtAt,
      deathAge: Number.isFinite(motion.deathAt) ? time - motion.deathAt : Infinity });
    const prefix = `${kind}${back ? 'Back' : ''}`;
    const actionKey = pose.action && `${prefix}:${pose.action}`;
    const hasPose = actionKey && art.frames[actionKey];
    const frame = setFrame(body, hasPose ? actionKey : `${prefix}:${pose.frame}`);
    const direction = time - motion.attackAt < .38 && motion.direction !== null ? motion.direction : angle;
    body.x = who.x + Math.cos(direction) * pose.x;
    body.y = who.y + Math.sin(direction) * pose.x * .55 + pose.y;
    body.scaleX = mirror * pose.scaleX / art.res;
    body.scaleY = pose.scaleY / art.res;
    body.rotation = mirror * pose.rotation;
    const fallen = art.frames[`${prefix}:fallen`], hurt = art.frames[`${prefix}:hurt`];
    const separateFallen = fallen && hurt && (fallen.x !== hurt.x || fallen.y !== hurt.y || fallen.page !== hurt.page);
    if (dead && !separateFallen) {
      const age = Number.isFinite(motion.deathAt) ? time - motion.deathAt : 3;
      body.rotation = -mirror * clamp((age - .08) / .38, 0, 1) * 78;
    }
    body.alpha = pose.alpha;
    body.sharedMaterial = !dead && time - motion.hurtAt < .075 ? (id === 'hero' ? HURT : WHITE) : null;
    groundShadow.x = who.x;
    groundShadow.y = who.y + 1;
    groundShadow.visible = body.visible;
    groundShadow.alpha = dead ? pose.alpha * .65 : 1;
    if (walking && !reducedMotion && time - motion.dustAt > .28 && distance > .25) {
      spawnFx('fx-brush', who.x, who.y + 1, { life: .34, scale: kind === 'boss' ? .75 : .45, vy: -3, alpha: .62 });
      motion.dustAt = time;
    }
    return frame;
  }
  function health(entry, who, frame) {
    entry.bar.visible = !who.dead && (who.hp < who.maxHp || who.boss || who.state === 'windup');
    if (!entry.bar.visible) return;
    const size = who.boss ? 86 : 48;
    if (entry.hp !== who.hp || entry.maxHp !== who.maxHp) {
      entry.hp = who.hp;
      entry.maxHp = who.maxHp;
      entry.bar.graphics.clear().lineStyle(1, 0x131d1b, .9).beginFill(0x202823, .92)
        .drawRoundRect(-size / 2 - 2, -2, size + 4, 9, 3, 3).endFill().lineStyle(0)
        .beginFill(who.boss ? 0xc08a57 : 0xb56b53, 1)
        .drawRoundRect(-size / 2, 0, Math.max(0, size * clamp(who.hp / who.maxHp, 0, 1)), 5, 2, 2).endFill();
    }
    entry.bar.x = who.x;
    entry.bar.y = who.y - (frame?.pivotY ?? (who.boss ? 128 : 96)) + 8;
  }
  function spawnFx(kind, x, y, options = {}) {
    let fx = effectPool.pop();
    if (!fx) {
      if (fxMade >= FX_LIMIT) return;
      fx = { body: sprite(kind, fxLane) };
      fxMade++;
    }
    const { life = .35, scale = 1, rotation = 0, vx = 0, vy = 0, tint = null,
      delay = 0, frames = 0, gravity = 0, spin = 0, endScale = 1, alpha = 1, stretch = 1 } = options;
    Object.assign(fx, { kind, x, y, age: -delay, life, scale, rotation, vx, vy, frames, gravity, spin, endScale, alpha, stretch });
    setFrame(fx.body, frames ? `${kind}:0` : kind);
    fx.body.visible = false;
    fx.body.sharedMaterial = tint;
    effects.push(fx);
  }
  function burst(x, y, { direction = 0, strong = false, jade = false, enemy = false } = {}) {
    spawnFx('fx-impact', x, y, { life: .19, frames: 3, scale: strong ? 1.1 : .72, rotation: degrees(direction), tint: jade ? JADE : enemy ? CINNABAR : null });
    const count = reducedMotion ? 2 : strong ? 7 : 4;
    for (let i = 0; i < count; i++) {
      const angle = direction + (i - (count - 1) / 2) * .72, speed = 60 + i % 3 * 35;
      spawnFx(i % 3 === 2 ? 'fx-splinter' : 'fx-spark', x, y, { life: .2 + i % 3 * .07,
        scale: .48 + i % 2 * .23, rotation: degrees(angle), vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * .65 - 22, gravity: 140, spin: i % 2 ? 95 : -80,
        tint: jade ? JADE : enemy ? CINNABAR : null, endScale: .35 });
    }
  }
  function number(amount, x, y, heroHit = false) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    let n = numberPool.pop();
    if (!n) {
      if (numberMade >= 18) return;
      const node = container(fxLane);
      n = { root: node, digits: Array.from({ length: 4 }, () => sprite('digit:0', node)) };
      numberMade++;
    }
    const text = String(Math.round(amount)).slice(0, 4);
    Object.assign(n, { x: x + (numberMade % 3 - 1) * 8, y: y - 88, age: 0 });
    n.root.visible = true;
    n.root.alpha = 1;
    for (let i = 0; i < 4; i++) {
      const bitmap = n.digits[i];
      bitmap.visible = i < text.length;
      if (!bitmap.visible) continue;
      setFrame(bitmap, `digit:${text[i]}`);
      bitmap.x = (i - (text.length - 1) / 2) * 14;
      bitmap.y = 0;
      bitmap.sharedMaterial = heroHit ? CINNABAR : null;
    }
    numbers.push(n);
  }
  function events(state, list) {
    for (const event of list) {
      const x = Number.isFinite(event.x) ? event.x : state.hero.x, y = Number.isFinite(event.y) ? event.y : state.hero.y;
      const direction = event.direction ?? Math.atan2((event.targetY ?? y) - y, (event.targetX ?? x) - x);
      switch (event.type) {
        case 'attack': {
          const motion = motionFor(event.id ?? 'hero');
          motion.attackAt = time;
          motion.direction = event.direction ?? state.hero.facing;
          // Rules strike .12 seconds after attack: no immediate fake impact.
          spawnFx('fx-cut', x + Math.cos(motion.direction) * 36, y - 35 + Math.sin(motion.direction) * 25,
            { life: .18, delay: .095, frames: 4, scale: 1, rotation: degrees(motion.direction) + 55 });
          break;
        }
        case 'hit': {
          motionFor(event.id).hurtAt = time;
          const source = event.sourceId ? state.enemies.find(foe => foe.id === event.sourceId) : state.hero;
          burst(x, y - 42, { direction: source ? Math.atan2(y - source.y, x - source.x) : 0,
            enemy: event.id === 'hero', jade: event.cause === 'artifact' });
          number(event.amount, x, y, event.id === 'hero');
          if (event.id === 'hero') hitShake = Math.max(hitShake, 1.8);
          break;
        }
        case 'artifactHit':
          // `hit` already paints contact; this adds the readable ring inscription.
          spawnFx('fx-sigil', x, y - 40, { life: .28, scale: .53, rotation: event.phase === 'return' ? -15 : 15,
            tint: event.phase === 'return' ? JADE : GOLD, endScale: 1.15 });
          break;
        case 'enemyAttack': {
          const motion = motionFor(event.id);
          motion.attackAt = time - .12;
          motion.direction = direction;
          const tx = event.targetX ?? x, ty = event.targetY ?? y;
          if (event.kind === 'bolt') {
            const dx = tx - x, dy = ty - y;
            for (let i = 0; i < 6; i++) spawnFx('fx-spark', x + dx * i / 5, y - 35 + dy * i / 5,
              { life: .16, scale: 1.1, stretch: 1.7, rotation: degrees(direction), tint: CINNABAR });
            spawnFx('fx-talisman', tx, ty - 34, { life: .3, scale: .7, rotation: -12, vy: -12 });
          } else if (event.kind === 'slam') {
            spawnFx('fx-sigil', tx, ty, { life: .38, scale: event.radius / 48, endScale: 1.08, tint: CINNABAR });
            for (let i = 0; i < 6; i++) {
              const angle = i * TAU / 6;
              spawnFx('fx-dust', tx + Math.cos(angle) * 35, ty + Math.sin(angle) * 24,
                { life: .5, scale: 1.3, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 65 - 12, alpha: .85 });
            }
            hitShake = Math.max(hitShake, 2.6);
          } else spawnFx('fx-cut', tx, ty - 34, { life: .2, frames: 4, scale: event.radius > 50 ? 1.2 : .83,
            rotation: degrees(direction) + 55, tint: CINNABAR });
          break;
        }
        case 'kill': {
          motionFor(event.id).deathAt = time;
          spawnFx('fx-dust', x, y + 2, { life: .6, delay: .18, scale: event.boss ? 1.9 : .9, endScale: 1.4, vy: -4 });
          if (event.boss) {
            hitShake = 3.5;
            spawnFx('fx-sigil', x, y - 35, { life: .85, scale: 1.35, endScale: 1.5, tint: GOLD });
            for (let i = 0; i < 7; i++) spawnFx('fx-talisman', x + (i - 3) * 12, y - 35,
              { life: .75 + i * .04, scale: .5 + i % 2 * .15, vx: (i - 3) * 24, vy: -65 - i % 3 * 10,
                gravity: 85, spin: (i - 3) * 35, rotation: (i - 3) * 14 });
          }
          break;
        }
        case 'death': motionFor('hero').deathAt = time; break;
        case 'heal':
        case 'level':
        case 'equip': {
          const green = event.type === 'heal';
          spawnFx('fx-sigil', x, y - 28, { life: green ? .65 : .8, scale: green ? .7 : .9,
            endScale: 1.25, vy: -13, tint: green ? JADE : GOLD });
          for (let i = 0; i < 3; i++) spawnFx('fx-talisman', x + (i - 1) * 24, y - 18,
            { life: .7, delay: i * .045, scale: .35, vy: -40 - i * 7, rotation: (i - 1) * 14, tint: green ? JADE : null });
          break;
        }
        case 'artifactCast':
          spawnFx('fx-sigil', x, y - 27, { life: .28, scale: .72, endScale: 1.35, tint: GOLD });
          ringClock = .06;
          break;
        case 'artifactReturn':
          spawnFx('fx-ringreturn', x, y - 22, { life: .3, scale: 1.2, endScale: 1.6, tint: JADE });
          break;
        case 'artifactCatch':
          burst(x, y - 35, { jade: true });
          lastRing = null;
          break;
        case 'pickup':
          spawnFx('fx-spark', x, y - 12, { life: .35, scale: .7, rotation: -60, vy: -40, tint: GOLD });
          break;
        case 'bossSpawn':
          spawnFx('fx-sigil', x, y, { life: 1, scale: 1.9, endScale: 1.15, tint: CINNABAR });
          spawnFx('fx-dust', x, y - 2, { life: 1, scale: 2, endScale: 1.5, vy: -12 });
          break;
      }
    }
  }
  function drawWarnings(state) {
    const g = warning.graphics;
    g.clear();
    for (const foe of state.enemies) {
      const mark = foe.telegraph;
      if (!mark || foe.dead) continue;
      const p = clamp(1 - mark.remaining / Math.max(.01, mark.total), 0, 1), radius = mark.radius;
      // Exact collision footprint, with a dark keyline readable on either map.
      g.lineStyle(5, 0x301e1b, .88).beginFill(0xa44331, .09 + p * .15).drawCircle(mark.x, mark.y, radius).endFill();
      g.lineStyle(1.6, p > .75 ? 0xffe4a4 : 0xda9870, .97).drawCircle(mark.x, mark.y, radius);
      g.lineStyle(3.5, 0xf2c578, 1).drawArc(mark.x, mark.y, Math.max(4, radius - 4), -Math.PI / 2, -Math.PI / 2 + p * TAU);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2, dx = Math.cos(angle), dy = Math.sin(angle);
        const cx = mark.x + dx * (radius + 6), cy = mark.y + dy * (radius + 6);
        g.lineStyle(2, 0xf3d29a, .9).moveTo(cx - dy * 5 - dx * 5, cy + dx * 5 - dy * 5)
          .lineTo(cx, cy).lineTo(cx + dy * 5 - dx * 5, cy - dx * 5 - dy * 5);
      }
      const cross = mark.kind === 'slam' ? 16 : 9;
      g.lineStyle(2, 0xf7d49b, .7 + p * .25).moveTo(mark.x, mark.y - cross).lineTo(mark.x + cross, mark.y)
        .lineTo(mark.x, mark.y + cross).lineTo(mark.x - cross, mark.y).lineTo(mark.x, mark.y - cross).lineStyle(0);
      if (mark.kind === 'bolt') g.lineStyle(1.5, 0xf0bb7a, .45 + p * .3)
        .moveTo(foe.x, foe.y - 24).lineTo(mark.x, mark.y).lineStyle(0);
    }
  }
  function drawPath(state) {
    const g = pathLine.graphics;
    g.clear();
    if (state.moveTarget) {
      const { x, y } = state.moveTarget;
      g.lineStyle(1.4, 0xe3c78b, .75).moveTo(x, y - 6).lineTo(x + 10, y).lineTo(x, y + 6).lineTo(x - 10, y).lineTo(x, y - 6).lineStyle(0);
    }
    portal.alpha = reducedMotion ? .65 : .61 + Math.sin(time * 1.4) * .12;
    portal.rotation = 0;
    heroSelection.graphics.clear().lineStyle(1, 0xe5cf92, .3)
      .drawEllipse(state.hero.x - 21, state.hero.y - 8, 42, 16).lineStyle(0);
    if (state.targetId) {
      const foe = state.enemies.find(entry => entry.id === state.targetId && !entry.dead);
      if (foe) {
        const r = foe.radius + 7;
        for (const side of [-1, 1]) g.lineStyle(2, 0xf2c080, .95)
          .moveTo(foe.x + side * (r - 5), foe.y - 8).lineTo(foe.x + side * r, foe.y)
          .lineTo(foe.x + side * (r - 5), foe.y + 8).lineStyle(0);
      }
    }
    if (activeMap === 'trail' && ['return', 'complete'].includes(state.quest?.stage)) portal.alpha = .85;
  }
  function updateArtifact(state, dt) {
    const ring = state.artifact;
    artifact.visible = Boolean(ring && ring.phase !== 'idle');
    if (!artifact.visible) { lastRing = null; ringClock = 0; return; }
    const returning = ring.phase === 'return';
    artifact.x = ring.x;
    artifact.y = ring.y - 22;
    artifact.rotation = time * (returning ? -680 : 680);
    artifact.sharedMaterial = returning ? JADE : GOLD;
    ringClock += dt;
    const direction = lastRing ? Math.atan2(ring.y - lastRing.y, ring.x - lastRing.x) : Math.atan2(ring.dy, ring.dx);
    if (ringClock >= (reducedMotion ? .12 : .045)) {
      ringClock %= reducedMotion ? .12 : .045;
      spawnFx(returning ? 'fx-ringreturn' : 'fx-ringtrail', ring.x, ring.y - 22,
        { life: returning ? .2 : .16, scale: .82, rotation: degrees(direction), tint: returning ? JADE : null, endScale: .62, alpha: .8 });
    }
    lastRing = { x: ring.x, y: ring.y };
  }
  function updateEffects(dt) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const fx = effects[i];
      fx.age += dt;
      if (fx.age >= fx.life) {
        fx.body.visible = false;
        effects.splice(i, 1);
        effectPool.push(fx);
        continue;
      }
      if (fx.age < 0) { fx.body.visible = false; continue; }
      fx.body.visible = true;
      const p = fx.age / fx.life;
      if (fx.frames) setFrame(fx.body, `${fx.kind}:${Math.min(fx.frames - 1, Math.floor(p * fx.frames))}`);
      fx.body.x = fx.x + fx.vx * fx.age;
      fx.body.y = fx.y + fx.vy * fx.age + fx.gravity * fx.age * fx.age / 2;
      fx.body.alpha = fx.alpha * Math.pow(1 - p, fx.frames ? .55 : .85);
      fx.body.rotation = fx.rotation + fx.spin * fx.age;
      const scale = fx.scale * (1 + (fx.endScale - 1) * p) / art.res;
      fx.body.scaleX = scale * fx.stretch;
      fx.body.scaleY = scale;
    }
    for (let i = numbers.length - 1; i >= 0; i--) {
      const n = numbers[i];
      n.age += dt;
      if (n.age > .72) { n.root.visible = false; numbers.splice(i, 1); numberPool.push(n); continue; }
      n.root.x = n.x;
      n.root.y = n.y - (1 - Math.exp(-n.age * 7)) * 34;
      const punch = reducedMotion ? 1 : 1 + .17 * Math.max(0, 1 - n.age / .12);
      n.root.scaleX = n.root.scaleY = punch;
      n.root.alpha = clamp((.72 - n.age) / .25, 0, 1);
    }
  }
  function update(state, dt = 1 / 60, list = []) {
    if (disposed || !state || !MAPS[state.mapId]) return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .2);
    time += dt;
    lastState = state;
    if (activeMap !== state.mapId) changeMap(state);
    events(state, list);
    updateCamera(state, dt);
    drawWarnings(state);
    drawPath(state);
    const equipped = slot => state.inventory?.find(item => item.uid === state.equipment?.[slot])?.itemId;
    const armor = equipped('armor') === 'scale-armor', steel = equipped('weapon') === 'iron-sword';
    const requestedKind = armor ? (steel ? 'heroEliteSteel' : 'heroElite') : (steel ? 'heroSteel' : 'hero');
    const heroKind = art.frames[`${requestedKind}:0`] ? requestedKind : armor ? 'heroElite' : 'hero';
    bodyFrame(hero, heroShadow, heroKind, state.hero, 'hero');
    const depth = [...scenery[activeMap], { node: hero, y: state.hero.y, id: 'hero' }], seen = new Set();
    for (const npc of MAPS[activeMap].npcs) {
      const kind = npc.id === 'elder' ? 'elder' : 'smith', entry = actorEntry(`npc:${npc.id}`, kind);
      seen.add(entry.id);
      entry.body.visible = true;
      entry.bar.visible = false;
      bodyFrame(entry.body, entry.shadow, kind, { ...npc, facing: Math.PI / 2 }, entry.id);
      depth.push({ node: entry.body, y: npc.y, id: entry.id });
    }
    for (const foe of state.enemies) {
      const entry = actorEntry(foe.id, foe.kind);
      seen.add(entry.id);
      entry.body.visible = true;
      const frame = bodyFrame(entry.body, entry.shadow, foe.kind, foe, foe.id);
      health(entry, foe, frame);
      depth.push({ node: entry.body, y: foe.y, id: entry.id });
    }
    for (const [id, entry] of actors) if (!seen.has(id)) entry.body.visible = entry.bar.visible = entry.shadow.visible = false;
    const liveDrops = new Set();
    for (const drop of state.drops) {
      const legacy = drop.itemId === 'gold' ? 'gold' : drop.itemId === 'potion' ? 'potion'
        : drop.itemId.includes('armor') ? 'armor' : drop.itemId.includes('sword') ? 'sword' : 'seal';
      const key = art.frames[`item:${drop.itemId}`] ? `item:${drop.itemId}` : legacy;
      if (!drops.has(drop.id)) drops.set(drop.id, { body: sprite(key, depthLane), glow: sprite('fx-sigil', underLane) });
      const entry = drops.get(drop.id);
      setFrame(entry.body, key);
      liveDrops.add(drop.id);
      entry.body.visible = entry.glow.visible = true;
      entry.body.x = drop.x;
      entry.body.y = drop.y - 10 + (reducedMotion ? 0 : Math.sin(time * 2.2 + drop.x) * 1.5);
      const f = art.frames[key], itemScale = f && f.w > 48 ? 36 / f.w : 1;
      entry.body.scaleX = entry.body.scaleY = itemScale / art.res;
      entry.glow.x = drop.x;
      entry.glow.y = drop.y;
      entry.glow.scaleX = .31 / art.res;
      entry.glow.scaleY = .17 / art.res;
      entry.glow.alpha = .48;
      entry.glow.sharedMaterial = GOLD;
      depth.push({ node: entry.body, y: drop.y, id: `drop:${drop.id}` });
    }
    for (const [id, drop] of drops) if (!liveDrops.has(id)) drop.body.visible = drop.glow.visible = false;
    charm.visible = Boolean(state.equipment?.charm) && state.hero.action !== 'dead';
    if (charm.visible) {
      charm.x = hero.x + (hero.scaleX < 0 ? -15 : 15);
      charm.y = hero.y - 34;
      charm.scaleX = charm.scaleY = .27 / art.res;
      charm.alpha = .9;
      depth.push({ node: charm, y: state.hero.y + 1, id: 'charm' });
    }
    depth.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    for (const entry of depth) depthLane.setChildIndex(entry.node, depthLane.numChildren - 1);
    updateArtifact(state, dt);
    const elder = MAPS[activeMap].npcs.find(npc => npc.id === 'elder');
    quest.visible = Boolean(elder && ['unaccepted', 'return'].includes(state.quest?.stage));
    if (quest.visible) {
      quest.x = elder.x;
      const frame = art.frames['elder:0'];
      quest.y = elder.y - (frame?.pivotY ?? 96) - 8 + (reducedMotion ? 0 : Math.sin(time * 2) * 2);
    }
    updateEffects(dt);
    frameStats.actors = seen.size + 1;
    frameStats.scenery = scenery[activeMap].length;
    frameStats.effects = effects.length;
    frameStats.effectsCreated = fxMade;
  }
  function resize(w, h) {
    if (disposed) return;
    width = Math.max(1, w);
    height = Math.max(1, h);
    camera.width = width;
    camera.height = height;
    if (lastState) updateCamera(lastState, 0, true);
  }
  scope.use({ dispose() { disposed = true; } });
  return { root, update, resize, camera, stats: frameStats,
    worldAt: (x, y) => ({ x: x / camera.zoom + camera.x, y: y / camera.zoom + camera.y }),
    screenAt: (x, y) => ({ x: (x - camera.x) * camera.zoom, y: (y - camera.y) * camera.zoom }),
    dispose() { if (!disposed) { disposed = true; root.visible = false; } }
  };
}
