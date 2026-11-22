// Native Egret 2D: shared painted atlas, foot-sorted actors and bounded effects.
// Event clocks animate presentation only. Simulation owns every hit and move.
import { Bitmap, DisplayObjectContainer, Sprite, createSharedMaterial2D } from '@egret/engine';
import { MAPS } from './sim/data.mjs';
import { buildArt } from './art/paint.mjs';
import { advanceHeroGait, combatPose, weaponAnchorForFrame, WEAPON_ANCHORS } from './art/effects.mjs';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const degrees = angle => angle * 180 / Math.PI;
const HURT = createSharedMaterial2D({ light: [1, 1, 1, 1], dark: [.5, .16, .1] });
const WHITE = createSharedMaterial2D({ light: [1, 1, 1, 1], dark: [.48, .39, .24] });
const GOLD = createSharedMaterial2D({ light: [1, .95, .76, 1], dark: [.12, .065, .01] });
const JADE = createSharedMaterial2D({ light: [.81, 1, .93, 1], dark: [.015, .065, .05] });
const CINNABAR = createSharedMaterial2D({ light: [1, .62, .36, 1], dark: [.18, .035, .015] });
const GOLD_LIGHT = createSharedMaterial2D({ light: [1, .9, .62, 1], blend: 'screen' });
const JADE_LIGHT = createSharedMaterial2D({ light: [.68, 1, .85, 1], blend: 'screen' });
const TEAL_LIGHT = createSharedMaterial2D({ light: [.12, .86, 1, 1], dark: [.01, .18, .3], blend: 'screen' });
const MARCH_BOOT = createSharedMaterial2D({ light: [1, .86, .65, 1], dark: [.045, .018, .005] });
const FX_LIMIT = 76;
const FX_FALLBACKS = {
  'fx-cut': 'slash', 'fx-impact': 'impact', 'fx-spark': 'impact', 'fx-splinter': 'dust',
  'fx-brush': 'dust', 'fx-dust': 'dust', 'fx-ringtrail': 'ring', 'fx-ringreturn': 'ring',
  'fx-sigil': 'level', 'fx-talisman': 'seal', 'fx-glow': 'impact',
  'fx-flare': 'impact', 'fx-streak': 'slash', 'fx-shock': 'level'
};

export async function createView(game, scope, { width = 1280, height = 720, reducedMotion = false } = {}) {
  const art = await buildArt(game, scope, MAPS);
  const use = object => scope.use(object);
  const container = parent => parent.addChild(use(new DisplayObjectContainer()));
  const root = use(new DisplayObjectContainer()), world = container(root);
  const groundLane = container(world), underLane = container(world), depthLane = container(world), fxLane = container(world);
  const warning = underLane.addChild(use(new Sprite())), pathLine = underLane.addChild(use(new Sprite()));
  const warningOutline = fxLane.addChild(use(new Sprite()));
  const camera = { x: 0, y: 0, zoom: 1, width, height, mapId: null };
  const scenery = {}, grounds = {}, actors = new Map(), drops = new Map(), motions = new Map();
  const portalEntries = [], ambientEntries = [], gatherNodes = new Map(), projectileNodes = new Map(), projectilePool = [];
  const effects = [], effectPool = [], numbers = [], numberPool = [];
  let time = 0, lastState, activeMap = null, disposed = false, fxMade = 0, numberMade = 0;
  let ringClock = 0, lastRing = null, rageDuration = .42, projectileMade = 0;
  const shakeSlots = Array.from({ length: 6 }, () => ({ age: 1, life: 0, power: 0, x: 1, y: 0 }));
  let shakeCursor = 0;
  const frameStats = { actors: 0, scenery: 0, effects: 0, effectsCreated: 0, effectLimit: FX_LIMIT,
    atlasSizes: art.atlasSizes,
    shakeX: 0, shakeY: 0, gearGlows: 0,
    ambient: 0, gatherables: 0, portals: 0, projectiles: 0, casts: 0, hazards: 0, profession: 'guard',
    textures: (art.atlases?.length ?? 1) + Object.keys(art.grounds).length + Object.values(art.structures).reduce((n, list) => n + list.length, 0), native2D: true };

  function frameKey(key) {
    if (art.frames[key]) return key;
    return FX_FALLBACKS[key.replace(/:\d+$/, '')] ?? key;
  }
  function setFrame(bitmap, requested) {
    const key = frameKey(requested), frame = art.frames[key];
    if (!frame) { bitmap.visible = false; return; }
    if (bitmap.frameKey === key) return frame;
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
  const heroShadow = shadow(27), hero = sprite('heroBack:0', depthLane);
  const heroSelection = underLane.addChild(use(new Sprite()));
  const artifact = sprite('ring', fxLane), charm = sprite('seal', depthLane), quest = sprite('quest', fxLane);
  const gearBack = container(depthLane), gearFront = container(depthLane);
  const armorGlow = sprite('fx-glow', gearBack), shoulderLeft = sprite('fx-glow', gearFront), shoulderRight = sprite('fx-glow', gearFront);
  const weaponGlow = sprite('fx-streak', gearFront), weaponFlare = sprite('fx-glow', gearFront);
  const charmGlow = sprite('fx-glow', gearFront), charmSigil = sprite('fx-sigil', gearFront);
  const offhand = sprite('seal', gearFront), boots = sprite('heroBack:0', gearFront);
  const artifactGlow = sprite('fx-glow', fxLane);
  const gearGroups = [gearBack, gearFront];
  const shoulderNodes = [shoulderLeft, shoulderRight];
  let anchorFrame = '', weaponAnchor = WEAPON_ANCHORS[0];
  gearFront.addChild(charm);
  for (const node of [weaponGlow,weaponFlare,shoulderLeft,shoulderRight,artifactGlow]) node.sharedMaterial = GOLD_LIGHT;
  for (const node of [armorGlow,charmGlow,charmSigil]) node.sharedMaterial = JADE_LIGHT;
  artifact.visible = charm.visible = quest.visible = offhand.visible = boots.visible = false;
  for (const [mapId, map] of Object.entries(MAPS)) {
    for (const point of map.portals ?? [map.portal]) {
      const body = sprite('portal', underLane), labelKey = `portal:${mapId}:${point.id}`;
      const label = art.frames[labelKey] ? sprite(labelKey, fxLane) : null;
      body.x = point.x; body.y = point.y; body.visible = false;
      if (label) { label.x = point.x; label.y = point.y - 65; label.visible = false; }
      portalEntries.push({ mapId, point, body, label });
    }
    for (const source of art.ambientActors?.[mapId] ?? []) {
      const body = sprite(`ambient:${source.kind}:0`, depthLane), groundShadow = shadow(source.kind === 'dog' ? 14 : 7);
      body.visible = groundShadow.visible = false;
      ambientEntries.push({ ...source, mapId, body, shadow: groundShadow, routeIndex: 1,
        distance: 0, wait: source.phase ?? 0, mirror: 1 });
    }
  }

  function impulse(power, life, direction = 0) {
    if (reducedMotion) return;
    const slot = shakeSlots[shakeCursor];
    shakeCursor = (shakeCursor + 1) % shakeSlots.length;
    slot.age = 0;
    slot.life = life;
    slot.power = power;
    slot.x = Math.cos(direction);
    slot.y = Math.sin(direction);
  }

  function updateCamera(state, dt, snap = false) {
    const map = MAPS[state.mapId], zoom = width < 700 ? .92 : width > 1400 ? 1.12 : 1.04;
    const x = clamp(state.hero.x - width / (2 * zoom), 0, Math.max(0, map.width - width / zoom));
    const y = clamp(state.hero.y - height * .64 / zoom, 0, Math.max(0, map.height - height / zoom));
    const ease = snap || reducedMotion ? 1 : 1 - Math.exp(-9 * Math.max(0, dt));
    camera.zoom = zoom;
    camera.x += (x - camera.x) * ease;
    camera.y += (y - camera.y) * ease;
    let shakeX = 0, shakeY = 0;
    for (const pulse of shakeSlots) {
      // Menus receive dt=0: clear pending kicks so resuming cannot replay them.
      if (snap || dt <= 0 || reducedMotion) { pulse.age = pulse.life; continue; }
      if (pulse.age >= pulse.life) continue;
      const envelope = (1 - pulse.age / pulse.life) ** 2;
      const wave = Math.cos(pulse.age * 78);
      shakeX += pulse.x * wave * pulse.power * envelope;
      shakeY += (pulse.y * wave * .66 + Math.sin(pulse.age * 65) * .24) * pulse.power * envelope;
      pulse.age += dt;
    }
    const magnitude = Math.hypot(shakeX, shakeY), limit = 9;
    if (magnitude > limit) { shakeX *= limit / magnitude; shakeY *= limit / magnitude; }
    frameStats.shakeX = shakeX;
    frameStats.shakeY = shakeY;
    world.scaleX = world.scaleY = zoom;
    world.x = -camera.x * zoom + shakeX;
    world.y = -camera.y * zoom + shakeY;
  }
  function changeMap(state) {
    activeMap = state.mapId;
    camera.mapId = activeMap;
    for (const [id, bitmap] of Object.entries(grounds)) bitmap.visible = id === activeMap;
    for (const [id, list] of Object.entries(scenery)) for (const entry of list) entry.node.visible = id === activeMap;
    for (const actor of actors.values()) { actor.body.visible = actor.bar.visible = actor.shadow.visible = actor.channel.visible = actor.aura.visible = false; if (actor.tag) actor.tag.visible = false; }
    for (const drop of drops.values()) drop.body.visible = drop.glow.visible = drop.beam.visible = false;
    for (const entry of gatherNodes.values()) entry.body.visible = entry.glow.visible = false;
    for (const entry of projectileNodes.values()) { entry.visible = false; projectilePool.push(entry); } projectileNodes.clear();
    for (const entry of ambientEntries) entry.body.visible = entry.shadow.visible = entry.mapId === activeMap;
    for (const entry of portalEntries) entry.body.visible = entry.mapId === activeMap;
    for (const fx of effects) { fx.body.visible = false; effectPool.push(fx); }
    for (const n of numbers) { n.root.visible = false; numberPool.push(n); }
    effects.length = numbers.length = 0;
    motions.clear();
    ringClock = 0;
    lastRing = null;
    updateCamera(state, 0, true);
  }
  function motionFor(id) {
    if (!motions.has(id)) motions.set(id, { step: 0, x: null, y: null, attackAt: -Infinity,
      hurtAt: -Infinity, deathAt: -Infinity, direction: null, dustAt: -Infinity });
    return motions.get(id);
  }
  function actorEntry(id, kind) {
    if (!actors.has(id)) { const aura=sprite('fx-glow',underLane);aura.visible=false;
      const channel=fxLane.addChild(use(new Sprite()));channel.visible=false;
      actors.set(id, { id, body: sprite(`${kind}:0`, depthLane),
      shadow: shadow(['boss','riverLord','warMarshal'].includes(kind) ? 39 : kind === 'wolf' ? 31 : 22),
      bar: fxLane.addChild(use(new Sprite())), kind, hp: -1, maxHp: 0,
      channel, aura,
      tag: id.startsWith('npc:') && art.frames[`npc-tag:${id.slice(4)}`] ? sprite(`npc-tag:${id.slice(4)}`, fxLane) : null }); }
    return actors.get(id);
  }
  function bodyFrame(body, groundShadow, kind, who, id) {
    const motion = motionFor(id), angle = Number.isFinite(who.facing) ? who.facing : Math.PI / 2;
    let back = Math.sin(angle) < -.36, mirror = Math.cos(angle) < -.22 ? -1 : 1;
    const dead = Boolean(who.dead || who.action === 'dead');
    let walking = !dead && (who.action === 'walk' || who.state === 'walk');
    const dx = motion.x === null ? 0 : who.x - motion.x, dy = motion.y === null ? 0 : who.y - motion.y;
    const distance = Math.hypot(dx, dy), isHero = id === 'hero';
    if (isHero) {
      advanceHeroGait(motion, dx, dy, walking, angle, time,
        dead || time - motion.attackAt < .38 || time - motion.hurtAt < .25);
      walking = walking && motion.walking;
      back = motion.back;
      mirror = motion.mirror;
    } else if (walking && distance < 80) motion.step += distance / (kind === 'wolf' ? 78 : 68) * TAU;
    motion.x = who.x;
    motion.y = who.y;
    const windup = who.telegraph ? clamp(1 - who.telegraph.remaining / who.telegraph.total, 0, 1) : 0;
    const pose = combatPose({ time, step: motion.step, walking, kind: isHero ? 'hero' : who.boss ? 'boss' : kind, dead, reducedMotion, windup,
      attackAge: time - motion.attackAt, hurtAge: time - motion.hurtAt,
      deathAge: Number.isFinite(motion.deathAt) ? time - motion.deathAt : Infinity });
    const prefix = `${kind}${back ? 'Back' : ''}`;
    const actionKey = pose.action && `${prefix}:${pose.action}`;
    const hasPose = actionKey && art.frames[actionKey];
    const walkKey = isHero && walking && `${prefix}:walk${pose.frame}`;
    const frame = setFrame(body, hasPose ? actionKey : walkKey && art.frames[walkKey] ? walkKey : `${prefix}:${pose.frame}`);
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
    const planted = (pose.frame === 0 || pose.frame === 2) && motion.footFrame !== pose.frame;
    motion.footFrame = walking ? pose.frame : -1;
    if (walking && !reducedMotion && distance > .25 && (isHero ? planted : time - motion.dustAt > .28)) {
      spawnFx('fx-brush', who.x, who.y + 1, { life: .34, scale: kind === 'boss' ? .75 : .45, vy: -3, alpha: .62 });
      motion.dustAt = time;
    }
    return frame;
  }
  function health(entry, who, frame) {
    const channeling = Boolean(!who.dead && who.telegraph?.channeling);
    entry.channel.visible = channeling;
    if(channeling){const p=clamp(1-who.telegraph.remaining/Math.max(.01,who.telegraph.total),0,1);entry.channel.graphics.clear()
      .beginFill(0x132b31,.9).drawRect(-34,0,68,5).endFill().beginFill(0x8bd5cd,.95).drawRect(-34,0,68*p,5).endFill();
      entry.channel.x=who.x;entry.channel.y=who.y-(frame?.pivotY??120)+23;}
    entry.aura.visible = Boolean(!who.dead && (who.bossPhase===2 || channeling));
    if(entry.aura.visible){entry.aura.x=who.x;entry.aura.y=who.y-7;entry.aura.scaleX=1.45/art.res;entry.aura.scaleY=.8/art.res;
      entry.aura.alpha=channeling?.38:.2;entry.aura.sharedMaterial=who.kind==='riverLord'?TEAL_LIGHT:CINNABAR;}
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
      delay = 0, frames = 0, gravity = 0, spin = 0, endScale = 1, alpha = 1, stretch = 1, flipX = false } = options;
    Object.assign(fx, { kind, x, y, age: -delay, life, scale, rotation, vx, vy, frames, gravity, spin, endScale, alpha, stretch, flipX });
    setFrame(fx.body, frames ? `${kind}:0` : kind);
    fx.body.visible = false;
    fx.body.sharedMaterial = tint;
    effects.push(fx);
  }
  function burst(x, y, { direction = 0, strong = false, jade = false, enemy = false } = {}) {
    spawnFx('fx-flare', x, y, { life: .14, scale: strong ? 1.2 : .8, tint: jade ? JADE_LIGHT : GOLD_LIGHT, endScale: .6 });
    spawnFx('fx-impact', x, y, { life: .23, frames: 3, scale: strong ? 1.45 : 1.08, rotation: degrees(direction), tint: jade ? JADE : enemy ? CINNABAR : null });
    const count = reducedMotion ? 3 : strong ? 11 : 8;
    for (let i = 0; i < count; i++) {
      const angle = direction + (i - (count - 1) / 2) * .51, speed = 95 + i % 4 * 43;
      spawnFx(i % 3 === 2 ? 'fx-splinter' : 'fx-spark', x, y, { life: .2 + i % 3 * .07,
        scale: .67 + i % 2 * .24, stretch: i % 3 === 2 ? 1 : 1.6, rotation: degrees(angle), vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * .65 - 22, gravity: 160, spin: i % 2 ? 95 : -80,
        tint: jade ? JADE_LIGHT : enemy ? CINNABAR : GOLD_LIGHT, endScale: .25 });
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
          const profession=event.profession??state.profession??'guard';
          if(profession!=='guard'){
            spawnFx('fx-glow',x+Math.cos(motion.direction)*19,y-72,{life:.2,scale:profession==='ritualist'?.65:.28,endScale:.5,tint:profession==='ritualist'?GOLD_LIGHT:TEAL_LIGHT});
            break;
          }
          // Rules strike .12 seconds after attack: no immediate fake impact.
          spawnFx('fx-cut', x + Math.cos(motion.direction) * 36, y - 35 + Math.sin(motion.direction) * 25,
            { life: .21, delay: .095, frames: 4, scale: 1.35, rotation: degrees(motion.direction) + 55 });
          spawnFx('fx-cut', x + Math.cos(motion.direction) * 42, y - 34 + Math.sin(motion.direction) * 25,
            { life: .22, delay: .12, frames: 4, scale: 1.65, endScale: 1.1, alpha: .32,
              rotation: degrees(motion.direction) + 47, tint: GOLD_LIGHT });
          if (!reducedMotion) {
            const prefix = hero.frameKey.replace(/:[^:]+$/, '');
            spawnFx(`${prefix}:attack`, x + Math.cos(motion.direction) * 3, y,
              { life: .14, delay: .12, alpha: .23, tint: GOLD_LIGHT, flipX: hero.scaleX < 0 });
          }
          break;
        }
        case 'hit': {
          motionFor(event.id).hurtAt = time;
          const source = event.sourceId ? state.enemies.find(foe => foe.id === event.sourceId) : state.hero;
          const angle = source ? Math.atan2(y - source.y, x - source.x) : 0;
          burst(x, y - 42, { direction: angle,
            enemy: event.id === 'hero', jade: event.cause === 'artifact' || event.cause === 'wind' });
          number(event.amount, x, y, event.id === 'hero');
          if (event.cause !== 'artifact') impulse(event.id === 'hero' ? (source?.boss ? 7.5 : 4.4) : 3.3,
            event.id === 'hero' ? .2 : .14, angle);
          break;
        }
        case 'artifactHit': {
          // `hit` already paints contact; this adds the readable ring inscription.
          const returning = event.phase === 'return';
          spawnFx('fx-sigil', x, y - 40, { life: .28, scale: .53, rotation: event.phase === 'return' ? -15 : 15,
            tint: event.phase === 'return' ? JADE : GOLD, endScale: 1.15 });
          spawnFx('fx-shock', x, y - 25, { life: .27, scale: .45, endScale: returning ? 3.6 : 2.7,
            tint: returning ? JADE_LIGHT : GOLD_LIGHT });
          impulse(returning ? 5.8 : 4.7, returning ? .21 : .17, Math.atan2(y-state.hero.y,x-state.hero.x));
          break;
        }
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
            spawnFx('fx-shock', tx, ty, { life: .32, scale: .6, endScale: 4.6, tint: GOLD_LIGHT });
          } else spawnFx('fx-cut', tx, ty - 34, { life: .2, frames: 4, scale: event.radius > 50 ? 1.2 : .83,
            rotation: degrees(direction) + 55, tint: CINNABAR });
          for (const mark of event.extra ?? []) {
            spawnFx('fx-shock', mark.x, mark.y, { life: .3, scale: .35, endScale: mark.radius / 16, tint: CINNABAR });
            spawnFx('fx-cut', mark.x, mark.y - 20, { life: .23, frames: 4, scale: 1, rotation: degrees(direction) + 55, tint: CINNABAR });
          }
          break;
        }
        case 'skillCast':
          spawnFx('fx-sigil', x, y, { life: .55, scale: event.radius / 52, endScale: 1.06, tint: JADE, alpha: .75 });
          spawnFx('fx-talisman', x, y - 58, { life: .85, scale: .7, vy: -13, tint: JADE });
          break;
        case 'classSkill': {
          const motion=motionFor('hero');motion.attackAt=time;motion.direction=Math.atan2((event.targetY??y)-y,(event.targetX??x)-x);
          if(event.profession==='guard'){
            spawnFx('fx-shock',x,y,{life:.32,scale:.6,endScale:(event.radius??120)/20,tint:GOLD_LIGHT});
            spawnFx('fx-cut',x,y-36,{life:.28,frames:4,scale:1.9,tint:GOLD});impulse(4,.18,motion.direction);
          }else if(event.profession==='ranger'){
            spawnFx('fx-streak',x,y-40,{life:.18,scale:.7,rotation:degrees(motion.direction),tint:TEAL_LIGHT});
          }else spawnFx('fx-sigil',event.targetX??x,event.targetY??y,{life:.6,scale:(event.radius??120)/52,endScale:1.05,tint:GOLD});
          break;
        }
        case 'castHit':
          spawnFx('fx-sigil',x,y,{life:.33,scale:(event.radius??48)/52,endScale:1.12,tint:GOLD});
          spawnFx('fx-flare',x,y-16,{life:.17,scale:.8,tint:GOLD_LIGHT});
          break;
        case 'projectileHit':
          spawnFx('fx-spark',x,y-36,{life:.22,scale:1.15,rotation:35,tint:TEAL_LIGHT});
          break;
        case 'interrupt':
          motionFor(event.id).hurtAt=time;
          spawnFx('fx-sigil',x,y-45,{life:.28,scale:1.2,endScale:1.7,tint:JADE});
          for(let i=0;i<4;i++)spawnFx('fx-talisman',x+(i-1.5)*13,y-55,{life:.45,scale:.45,vx:(i-1.5)*35,vy:-23,gravity:140,spin:(i-1.5)*60,tint:CINNABAR});
          break;
        case 'bossPhase':
          spawnFx('fx-sigil',x,y,{life:.85,scale:2.2,endScale:1.25,tint:CINNABAR});
          spawnFx('fx-shock',x,y,{life:.6,scale:.6,endScale:4.8,tint:GOLD_LIGHT});impulse(5,.25,0);
          break;
        case 'hazardAttack':
          spawnFx('fx-shock',x,y,{life:.32,scale:.45,endScale:(event.radius??65)/18,tint:CINNABAR});
          spawnFx('fx-impact',x,y-18,{life:.25,frames:3,scale:1.3,tint:CINNABAR});
          break;
        case 'skillPulse':
          spawnFx('fx-shock', x, y, { life: .42, scale: .6, endScale: event.radius / 27, tint: JADE_LIGHT, alpha: .8 });
          for (let i = 0; i < (reducedMotion ? 2 : 5); i++) {
            const angle = i * TAU / 5 + event.pulse * .7;
            spawnFx('fx-cut', x + Math.cos(angle) * 80, y + Math.sin(angle) * 65 - 14,
              { life: .34, frames: 4, scale: 1.15, rotation: degrees(angle) + 70, tint: JADE, alpha: .8 });
          }
          break;
        case 'rageTelegraph':
          rageDuration=event.duration??.42;
          spawnFx('fx-glow', x, y - 38, { life: event.duration ?? .42, scale: 1.2, endScale: 1.8, tint: GOLD_LIGHT, alpha: .65 });
          break;
        case 'rage':
          if((event.profession??state.profession)==='ranger'){
            for(let i=0;i<(reducedMotion?3:7);i++)spawnFx('fx-arrow',x+(i-3)*18,y-55-Math.abs(i-3)*8,{life:.2,scale:.6,rotation:80,vy:330,tint:TEAL_LIGHT});
          }
          impulse(8, .32, -.3);
          spawnFx('fx-flare', x, y - 35, { life: .22, scale: 2.25, endScale: 1.25, tint: GOLD_LIGHT });
          spawnFx('fx-shock', x, y, { life: .48, scale: .55, endScale: event.radius / 16, tint: GOLD_LIGHT });
          spawnFx('fx-sigil', x, y, { life: .52, scale: event.radius / 52, endScale: 1.06, tint: GOLD, alpha: .8 });
          for (let i = 0; i < (reducedMotion ? 2 : 6); i++) {
            const angle = i * TAU / 6;
            spawnFx('fx-dust', x + Math.cos(angle) * 46, y + Math.sin(angle) * 30,
              { life: .55, scale: 1.2, vx: Math.cos(angle) * 100, vy: Math.sin(angle) * 65, alpha: .7 });
          }
          break;
        case 'rageHit':
          // The paired rule `hit` already owns the damage number and recoil.
          spawnFx('fx-sigil', x, y - 40, { life: .28, scale: .7, endScale: 1.45, tint: GOLD });
          break;
        case 'kill': {
          motionFor(event.id).deathAt = time;
          spawnFx('fx-dust', x, y + 2, { life: .6, delay: .18, scale: event.boss ? 1.9 : .9, endScale: 1.4, vy: -4 });
          if (event.boss) {
            impulse(9, .38, -.4);
            spawnFx('fx-flare', x, y - 45, { life: .28, scale: 2.1, tint: GOLD_LIGHT, endScale: 1.45 });
            spawnFx('fx-shock', x, y, { life: .5, scale: .8, endScale: 5.2, tint: GOLD_LIGHT });
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
          spawnFx('fx-flare', x, y - 29, { life: .19, scale: .9, endScale: 1.3, tint: GOLD_LIGHT });
          ringClock = .06;
          break;
        case 'artifactReturn':
          spawnFx('fx-ringreturn', x, y - 22, { life: .3, scale: 1.2, endScale: 1.6, tint: JADE });
          break;
        case 'artifactCatch':
          burst(x, y - 35, { jade: true });
          spawnFx('fx-shock', x, y - 20, { life: .24, scale: .35, endScale: 2.6, tint: GOLD_LIGHT });
          impulse(1.8, .09, 0);
          lastRing = null;
          break;
        case 'gather':
          spawnFx('fx-sigil', x, y - 12, { life: .55, scale: .45, vy: -20, tint: JADE });
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
    const outline=warningOutline.graphics;g.clear();outline.clear();
    const drawMark = (mark, p, kind, friendly = false) => {
      const radius = mark.radius, fill=friendly?0xc89a50:0xa44331;
      // Exact collision footprint, with a dark keyline readable on either map.
      if(mark.shape==='ring'&&mark.innerRadius>0){
        const inner=Math.min(radius-1,mark.innerRadius);g.lineStyle(radius-inner,fill,.13+p*.16).drawCircle(mark.x,mark.y,(radius+inner)/2);
        g.lineStyle(2,0xe2b17c,.97).drawCircle(mark.x,mark.y,radius).lineStyle(2,0x99d3b5,.95).drawCircle(mark.x,mark.y,inner).lineStyle(0);
        g.beginFill(0x4a9878,.06).drawCircle(mark.x,mark.y,inner).endFill();
      }else if(mark.shape==='cross'){
        const a=(mark.width??64)/2,x=mark.x,y=mark.y,r=radius,points=[[-r,-a],[-a,-a],[-a,-r],[a,-r],[a,-a],[r,-a],[r,a],[a,a],[a,r],[-a,r],[-a,a],[-r,a]];
        g.lineStyle(2,0xe4aa73,.95).beginFill(fill,.13+p*.15).moveTo(x+points[0][0],y+points[0][1]);
        for(const[dx,dy]of points.slice(1))g.lineTo(x+dx,y+dy);g.lineTo(x+points[0][0],y+points[0][1]).endFill().lineStyle(0);
      }else{
        g.lineStyle(5,friendly?0x243c31:0x301e1b,.88).beginFill(fill,.09+p*.15).drawCircle(mark.x,mark.y,radius).endFill();
        g.lineStyle(1.6,friendly?0xffdf91:p>.75?0xffe4a4:0xda9870,.97).drawCircle(mark.x,mark.y,radius);
      }
      // Only a thin unfilled edge passes over roof overhangs. Ground tint and
      // all filled danger areas stay below scenery; bodies remain readable.
      outline.lineStyle(1.2,friendly?0xf4d98f:0xf0bb88,.58);
      if(mark.shape==='cross'){
        const a=(mark.width??64)/2,x=mark.x,y=mark.y,r=radius,points=[[-r,-a],[-a,-a],[-a,-r],[a,-r],[a,-a],[r,-a],[r,a],[a,a],[a,r],[-a,r],[-a,a],[-r,a]];
        outline.moveTo(x+points[0][0],y+points[0][1]);for(const[dx,dy]of points.slice(1))outline.lineTo(x+dx,y+dy);outline.lineTo(x+points[0][0],y+points[0][1]);
      }else outline.drawCircle(mark.x,mark.y,radius);
      if(mark.shape==='ring'&&mark.innerRadius>0)outline.lineStyle(1.3,0xa9e5c3,.75).drawCircle(mark.x,mark.y,mark.innerRadius);
      outline.lineStyle(0);
      g.lineStyle(3.5, 0xf2c578, 1).drawArc(mark.x, mark.y, Math.max(4, radius - 4), -Math.PI / 2, -Math.PI / 2 + p * TAU);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2, dx = Math.cos(angle), dy = Math.sin(angle);
        const cx = mark.x + dx * (radius + 6), cy = mark.y + dy * (radius + 6);
        g.lineStyle(2, 0xf3d29a, .9).moveTo(cx - dy * 5 - dx * 5, cy + dx * 5 - dy * 5)
          .lineTo(cx, cy).lineTo(cx + dy * 5 - dx * 5, cy - dx * 5 - dy * 5);
      }
      const cross = kind === 'slam' ? 16 : 9;
      g.lineStyle(2, 0xf7d49b, .7 + p * .25).moveTo(mark.x, mark.y - cross).lineTo(mark.x + cross, mark.y)
        .lineTo(mark.x, mark.y + cross).lineTo(mark.x - cross, mark.y).lineTo(mark.x, mark.y - cross).lineStyle(0);
      for(const safe of mark.safeZones??[]){g.lineStyle(2.5,0x9de0bb,.98).beginFill(0x399270,.16).drawCircle(safe.x,safe.y,safe.radius).endFill().lineStyle(0);
        outline.lineStyle(1.5,0xa9e5c3,.84).drawCircle(safe.x,safe.y,safe.radius).lineStyle(0);}
    };
    for (const foe of state.enemies) {
      const mark = foe.telegraph;
      if (!mark || foe.dead) continue;
      const p = clamp(1 - mark.remaining / Math.max(.01, mark.total), 0, 1);
      for (const target of [mark, ...(mark.extra ?? [])]) {
        drawMark(target, p, mark.kind);
        if (['bolt', 'dash', 'crosswind'].includes(mark.kind)) g.lineStyle(mark.kind === 'dash' ? 3 : 1.5, 0xf0bb7a, .35 + p * .3)
          .moveTo(foe.x, foe.y - 24).lineTo(target.x, target.y).lineStyle(0);
      }
      for(const target of mark.followUps??[]){g.lineStyle(1.5,0xcaa8ce,.55);for(let i=0;i<4;i++)g.drawArc(target.x,target.y,target.radius,i*TAU/4,i*TAU/4+TAU/8);g.lineStyle(0);}
    }
    for(const mark of state.hazards??[])drawMark(mark,clamp(1-mark.remaining/Math.max(.01,mark.total),0,1),mark.kind);
    for(const cast of state.casts??[]){const p=clamp(1-cast.remaining/Math.max(.01,cast.total),0,1);g.lineStyle(2,0xebce93,.7).beginFill(0xb38a49,.055).drawCircle(cast.x,cast.y,cast.radius).endFill()
      .lineStyle(3,0xf2df9c,.9).drawArc(cast.x,cast.y,cast.radius,-Math.PI/2,-Math.PI/2+p*TAU).lineStyle(0);}
    frameStats.casts=state.casts?.length??0;frameStats.hazards=state.hazards?.length??0;
    if (state.rage?.phase === 'charging') drawMark(state.rage, clamp(1 - state.rage.remaining / rageDuration, 0, 1), 'slam', true);
  }
  function drawPath(state) {
    const g = pathLine.graphics;
    g.clear();
    if (state.moveTarget) {
      const { x, y } = state.moveTarget;
      g.lineStyle(1.4, 0xe3c78b, .75).moveTo(x, y - 6).lineTo(x + 10, y).lineTo(x, y + 6).lineTo(x - 10, y).lineTo(x, y - 6).lineStyle(0);
    }
    let portalsVisible = 0;
    for (const entry of portalEntries) {
      const active = entry.mapId === activeMap;
      entry.body.visible = active;
      if (entry.label) entry.label.visible = active;
      if (!active) continue;
      portalsVisible++;
      const returning = entry.point.to === 'city' && (state.quest?.stage === 'return' || state.chapter?.stage === 'return');
      entry.body.alpha = returning ? .85 : reducedMotion ? .65 : .61 + Math.sin(time * 1.4) * .12;
      entry.body.rotation = 0;
    }
    frameStats.portals = portalsVisible;
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
    if (state.skillEffect) {
      g.lineStyle(2, 0x90d8ba, .43).drawCircle(state.hero.x, state.hero.y, state.skillEffect.radius).lineStyle(0);
    }
    if (state.hero.ward > 0) g.lineStyle(1.8, 0xb8e1c0, .6).drawEllipse(state.hero.x - 29, state.hero.y - 15, 58, 26).lineStyle(0);
  }
  function updateAmbient(dt, depth) {
    let count = 0;
    for (const entry of ambientEntries) {
      const visible = entry.mapId === activeMap;
      entry.body.visible = entry.shadow.visible = visible;
      if (!visible) continue;
      count++;
      let walking = false;
      if (!reducedMotion && dt > 0 && entry.route?.length > 1) {
        if (entry.wait > 0) entry.wait -= dt;
        else {
          const target = entry.route[entry.routeIndex % entry.route.length], dx = target.x - entry.x, dy = target.y - entry.y;
          const distance = Math.hypot(dx, dy), step = Math.min(distance, entry.speed * dt);
          if (distance > .1) { entry.x += dx / distance * step; entry.y += dy / distance * step; entry.distance += step; walking = true; if (Math.abs(dx) > 1) entry.mirror = dx < 0 ? -1 : 1; }
          if (distance <= step + .1) { entry.routeIndex = (entry.routeIndex + 1) % entry.route.length; entry.wait = entry.kind === 'hen' ? 1.7 + (entry.phase ?? 0) * .2 : .7; }
        }
      }
      const frame = walking ? Math.floor(entry.distance / (entry.kind === 'dog' ? 11 : 5) + (entry.phase ?? 0)) % 4
        : !reducedMotion && entry.kind === 'hen' && Math.sin(time * 2 + (entry.phase ?? 0)) > .2 ? 2 : 0;
      setFrame(entry.body, `ambient:${entry.kind}:${frame}`);
      entry.body.x = entry.shadow.x = entry.x; entry.body.y = entry.shadow.y = entry.y;
      entry.body.scaleX = entry.mirror / art.res; entry.body.scaleY = 1 / art.res;
      depth.push({ node: entry.body, y: entry.y, id: entry.id });
    }
    frameStats.ambient = count;
  }
  function updateGatherables(state, depth) {
    const live = new Set();
    for (const plant of state.gatherables ?? []) {
      if (plant.collected) continue;
      const id = `${activeMap}:${plant.id}`, key = plant.kind==='rescue'?'scout:0':plant.kind==='beacon'?'node:beacon':`item:${plant.itemId ?? 'qingxin-herb'}`;
      let entry = gatherNodes.get(id);
      if (!entry) { entry = { body: sprite(key, depthLane), glow: sprite('fx-sigil', underLane) }; gatherNodes.set(id, entry); }
      live.add(id); entry.body.visible = entry.glow.visible = true; setFrame(entry.body, key);
      entry.body.x = entry.glow.x = plant.x; entry.body.y = plant.y - 7; entry.glow.y = plant.y;
      entry.body.scaleX = entry.body.scaleY = (plant.kind==='rescue'?.67:plant.kind==='beacon'?.85:.7) / art.res;
      entry.glow.scaleX = .38 / art.res; entry.glow.scaleY = .19 / art.res;
      entry.glow.sharedMaterial = JADE_LIGHT; entry.glow.alpha = reducedMotion ? .5 : .43 + Math.sin(time * 1.6 + plant.x) * .1;
      depth.push({ node: entry.body, y: plant.y, id: `gather:${id}` });
    }
    for (const [id, entry] of gatherNodes) if (!live.has(id)) entry.body.visible = entry.glow.visible = false;
    frameStats.gatherables = live.size;
  }
  function updateProjectiles(state){
    const seen=new Set();
    for(const shot of state.projectiles??[]){let body=projectileNodes.get(shot.id);if(!body){body=projectilePool.pop();if(!body){if(projectileMade>=24)continue;body=sprite('fx-arrow',fxLane);projectileMade++;}projectileNodes.set(shot.id,body);}
      seen.add(shot.id);body.visible=true;body.x=shot.x;body.y=shot.y-35;body.rotation=degrees(Math.atan2(shot.dy,shot.dx));body.scaleX=.56/art.res;body.scaleY=.56/art.res;body.sharedMaterial=shot.skillId==='basic-arrow'?null:TEAL_LIGHT;}
    for(const[id,body]of projectileNodes)if(!seen.has(id)){body.visible=false;projectileNodes.delete(id);projectilePool.push(body);}frameStats.projectiles=seen.size;
  }
  function updateGear(state, armor, steel, equipped) {
    const alive = state.hero.action !== 'dead';
    gearBack.visible = gearFront.visible = alive;
    frameStats.gearGlows = 0;
    if (!alive) return;
    for (const group of gearGroups) {
      group.x = hero.x;
      group.y = hero.y;
      group.scaleX = hero.scaleX * art.res;
      group.scaleY = hero.scaleY * art.res;
      group.rotation = hero.rotation;
    }
    if (anchorFrame !== hero.frameKey) {
      anchorFrame = hero.frameKey;
      weaponAnchor = weaponAnchorForFrame(anchorFrame, art.frames[anchorFrame]);
    }
    const anchor = weaponAnchor;
    const profession=state.profession??'guard';
    const wind = equipped('weapon') === 'wind-sword';
    const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 3.8) * .08;
    const striking = time - motionFor('hero').attackAt > .09 && time - motionFor('hero').attackAt < .27;
    weaponGlow.x = anchor.x;
    weaponGlow.y = anchor.y;
    weaponGlow.rotation = anchor.rotation;
    weaponGlow.scaleX = anchor.length / 112 / art.res;
    weaponGlow.scaleY = (profession==='guard'?(steel?.59:.24):.18) / art.res;
    weaponGlow.alpha = (profession==='guard'?(steel?.7:.2):.16) * pulse + (striking ? .17 : 0);
    weaponGlow.sharedMaterial = profession==='ranger'||wind ? TEAL_LIGHT : GOLD_LIGHT;
    weaponFlare.x = anchor.tipX;
    weaponFlare.y = anchor.tipY;
    weaponFlare.scaleX = weaponFlare.scaleY = (profession==='ritualist'?.33:steel?.49:.19) / art.res;
    weaponFlare.alpha = profession==='ritualist'?.45* pulse:steel?.55*pulse:.17;
    weaponFlare.sharedMaterial = profession==='ranger'||wind ? TEAL_LIGHT : GOLD_LIGHT;
    armorGlow.visible = shoulderLeft.visible = shoulderRight.visible = armor;
    if (armor) {
      armorGlow.x = striking ? 5 : 0;
      armorGlow.y = -62;
      armorGlow.scaleX = 1.16 / art.res;
      armorGlow.scaleY = 1.65 / art.res;
      armorGlow.alpha = .25 * pulse;
      for (let i = 0; i < shoulderNodes.length; i++) {
        const node = shoulderNodes[i];
        node.x = (i ? 17 : -17) + (striking ? 5 : 0);
        node.y = -76;
        node.scaleX = node.scaleY = .31 / art.res;
        node.alpha = .5 * pulse;
      }
    }
    const ringSlot = Object.hasOwn(state.equipment ?? {}, 'ring') ? 'ring' : 'charm', ringId = equipped(ringSlot);
    const ringKey = `item:${ringId}`;
    charm.visible = charmGlow.visible = Boolean(ringId && art.frames[ringKey]);
    charmSigil.visible = charm.visible && ['jade-seal', 'storm-ring'].includes(ringId);
    if (charm.visible) {
      setFrame(charm, ringKey);
      // The grip is the endpoint opposite the tip, not a floating waist charm.
      charm.x = charmGlow.x = charmSigil.x = anchor.x * 2 - anchor.tipX + 1;
      charm.y = charmGlow.y = charmSigil.y = anchor.y * 2 - anchor.tipY + 1;
      charm.scaleX = charm.scaleY = .25 / art.res;
      charm.alpha = 1;
      charm.sharedMaterial = null;
      charmGlow.scaleX = charmGlow.scaleY = .25 / art.res;
      charmGlow.alpha = .5 * pulse;
      charmSigil.scaleX = charmSigil.scaleY = .14 / art.res;
      charmSigil.alpha = .55;
      charmSigil.rotation = reducedMotion ? 0 : time * 15;
    }
    const offhandId = equipped('offhand'), offhandKey = `item:${offhandId}`;
    offhand.visible = Boolean(offhandId && art.frames[offhandKey]);
    if (offhand.visible) {
      setFrame(offhand, offhandKey);
      const back = hero.frameKey.includes('Back'), attacking = hero.frameKey.endsWith(':attack'), hurt = hero.frameKey.endsWith(':hurt');
      const frame = art.frames[hero.frameKey], point = frame?.offhandAnchor ?? {
        x: back ? hurt ? -2 : attacking ? -29 : -31 : hurt ? 9 : 21,
        y: back ? -88 : -73, width: back ? 46 : 48, height: 52, rotation: back ? 17 : -13
      };
      offhand.x = point.x; offhand.y = point.y; offhand.rotation = point.rotation ?? 0;
      const icon = art.frames[offhandKey];
      offhand.scaleX = (point.width ?? 48) / icon.w / art.res;
      offhand.scaleY = (point.height ?? 52) / icon.h / art.res;
      offhand.sharedMaterial = offhandId === 'vanguard-shield' ? JADE : null;
    }
    const bootsId = equipped('boots'), bootsKey = `boots:${hero.frameKey}`;
    boots.visible = Boolean(bootsId && art.frames[bootsKey]);
    if (boots.visible) {
      setFrame(boots, bootsKey);
      boots.x = boots.y = boots.rotation = 0;
      boots.scaleX = boots.scaleY = 1 / art.res;
      boots.sharedMaterial = bootsId === 'wind-boots' ? JADE : MARCH_BOOT;
    }
    frameStats.gearGlows = 2 + (armor ? 3 : 0) + (charm.visible ? 1 : 0) + (charmSigil.visible ? 1 : 0);
    frameStats.gear = { weapon: equipped('weapon') ?? null, offhand: offhand.visible ? offhandId : null,
      boots: boots.visible ? bootsId : null, ring: charm.visible ? ringId : null, heroFrame: hero.frameKey,
      bootsFrame: boots.visible ? bootsKey : null };
  }
  function updateArtifact(state, dt) {
    const ring = state.artifact;
    artifact.visible = Boolean(ring && ring.phase !== 'idle');
    artifactGlow.visible = artifact.visible;
    if (!artifact.visible) { lastRing = null; ringClock = 0; return; }
    const returning = ring.phase === 'return';
    artifact.x = ring.x;
    artifact.y = ring.y - 22;
    artifact.rotation = time * (returning ? -680 : 680);
    artifact.sharedMaterial = returning ? JADE : GOLD;
    artifact.scaleX = artifact.scaleY = 1.12 / art.res;
    artifactGlow.x = artifact.x;
    artifactGlow.y = artifact.y;
    artifactGlow.scaleX = artifactGlow.scaleY = (returning ? 1.5 : 1.25) / art.res;
    artifactGlow.alpha = .7;
    artifactGlow.sharedMaterial = returning ? JADE_LIGHT : GOLD_LIGHT;
    ringClock += dt;
    const direction = lastRing ? Math.atan2(ring.y - lastRing.y, ring.x - lastRing.x) : Math.atan2(ring.dy, ring.dx);
    if (ringClock >= (reducedMotion ? .12 : .035)) {
      ringClock %= reducedMotion ? .12 : .035;
      spawnFx(returning ? 'fx-ringreturn' : 'fx-ringtrail', ring.x, ring.y - 22,
        { life: returning ? .24 : .2, scale: 1.15, stretch: 1.35, rotation: degrees(direction),
          tint: returning ? JADE_LIGHT : GOLD_LIGHT, endScale: .52, alpha: .92 });
      spawnFx('fx-streak', ring.x - Math.cos(direction) * 23, ring.y - 22 - Math.sin(direction) * 23,
        { life: .14, scale: .82, stretch: 1.3, rotation: degrees(direction),
          tint: returning ? JADE_LIGHT : GOLD_LIGHT, endScale: .4, alpha: .8 });
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
      fx.body.scaleX = scale * fx.stretch * (fx.flipX ? -1 : 1);
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
    const armor = equipped('armor') === 'scale-armor', steel = ['iron-sword', 'wind-sword'].includes(equipped('weapon'));
    const profession=state.profession??'guard';frameStats.profession=profession;
    const requestedKind = profession==='ritualist'||profession==='ranger'?profession:armor ? (steel ? 'heroEliteSteel' : 'heroElite') : (steel ? 'heroSteel' : 'hero');
    const heroKind = art.frames[`${requestedKind}:0`] ? requestedKind : armor ? 'heroElite' : 'hero';
    bodyFrame(hero, heroShadow, heroKind, state.hero, 'hero');
    updateGear(state, armor, steel, equipped);
    const depth = [...scenery[activeMap], { node: gearBack, y: state.hero.y - .1, id: 'gear-back' },
      { node: hero, y: state.hero.y, id: 'hero' }, { node: gearFront, y: state.hero.y + .1, id: 'gear-front' }], seen = new Set();
    for (const npc of MAPS[activeMap].npcs) {
      const requested = art.frames[`${npc.id}:0`] ? npc.id : npc.artKind ?? (npc.id === 'elder' ? 'elder' : 'smith');
      const kind = art.frames[`${requested}:0`] ? requested : 'elder', entry = actorEntry(`npc:${npc.id}`, kind);
      seen.add(entry.id);
      entry.body.visible = true;
      entry.bar.visible = false;
      const frame = bodyFrame(entry.body, entry.shadow, kind, { ...npc, facing: Math.PI / 2 }, entry.id);
      if (entry.tag) { entry.tag.visible = true; entry.tag.x = npc.x; entry.tag.y = npc.y - (frame?.pivotY ?? 100) - 17; }
      depth.push({ node: entry.body, y: npc.y, id: entry.id });
    }
    for (const foe of state.enemies) {
      const kind = art.frames[`${foe.kind}:0`]?foe.kind:foe.artKind ?? foe.kind, entry = actorEntry(foe.id, kind);
      seen.add(entry.id);
      entry.body.visible = true;
      const frame = bodyFrame(entry.body, entry.shadow, kind, foe, foe.id);
      health(entry, foe, frame);
      depth.push({ node: entry.body, y: foe.y, id: entry.id });
    }
    for (const [id, entry] of actors) if (!seen.has(id)) { entry.body.visible = entry.bar.visible = entry.shadow.visible = entry.channel.visible = entry.aura.visible = false; if (entry.tag) entry.tag.visible = false; }
    const liveDrops = new Set();
    for (const drop of state.drops) {
      const legacy = drop.itemId === 'gold' ? 'gold' : drop.itemId === 'potion' ? 'potion'
        : drop.itemId.includes('armor') ? 'armor' : drop.itemId.includes('sword') ? 'sword' : 'seal';
      const key = art.frames[`item:${drop.itemId}`] ? `item:${drop.itemId}` : legacy;
      if (!drops.has(drop.id)) drops.set(drop.id, { body: sprite(key, depthLane),
        glow: sprite('fx-sigil', underLane), beam: sprite('fx-streak', depthLane) });
      const entry = drops.get(drop.id);
      setFrame(entry.body, key);
      liveDrops.add(drop.id);
      entry.body.visible = entry.glow.visible = true;
      const rare = !['gold', 'potion', 'qingxin-herb', 'scrap-iron'].includes(drop.itemId);
      const seal = ['jade-seal', 'storm-ring', 'verdant-ring', 'wind-sword', 'wind-boots'].includes(drop.itemId);
      entry.beam.visible = rare;
      entry.body.x = drop.x;
      entry.body.y = drop.y - 10 + (reducedMotion ? 0 : Math.sin(time * 2.2 + drop.x) * 1.5);
      const f = art.frames[key], itemScale = f && f.w > 48 ? 36 / f.w : 1;
      entry.body.scaleX = entry.body.scaleY = itemScale / art.res;
      entry.glow.x = drop.x;
      entry.glow.y = drop.y;
      entry.glow.scaleX = (rare ? .67 : .25) / art.res;
      entry.glow.scaleY = (rare ? .36 : .13) / art.res;
      entry.glow.alpha = rare ? .8 : .32;
      entry.glow.sharedMaterial = seal ? JADE_LIGHT : GOLD_LIGHT;
      if (rare) {
        entry.beam.x = drop.x;
        entry.beam.y = drop.y - 31;
        entry.beam.rotation = -90;
        entry.beam.scaleX = .62 / art.res;
        entry.beam.scaleY = .85 / art.res;
        entry.beam.alpha = reducedMotion ? .65 : .65 + Math.sin(time * 3 + drop.x) * .1;
        entry.beam.sharedMaterial = seal ? JADE_LIGHT : GOLD_LIGHT;
        depth.push({ node: entry.beam, y: drop.y - .1, id: `beam:${drop.id}` });
      }
      depth.push({ node: entry.body, y: drop.y, id: `drop:${drop.id}` });
    }
    for (const [id, drop] of drops) if (!liveDrops.has(id)) drop.body.visible = drop.glow.visible = drop.beam.visible = false;
    updateGatherables(state, depth);
    updateAmbient(dt, depth);
    depth.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    for (const entry of depth) depthLane.setChildIndex(entry.node, depthLane.numChildren - 1);
    updateArtifact(state, dt);
    updateProjectiles(state);
    const elder = MAPS[activeMap].npcs.find(npc => npc.id === 'elder');
    quest.visible = Boolean(elder && (['unaccepted', 'return'].includes(state.quest?.stage)
      || state.quest?.stage === 'complete' && ['locked', 'offer', 'return'].includes(state.chapter?.stage)));
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
    worldAt: (x, y) => ({ x: (x - frameStats.shakeX) / camera.zoom + camera.x, y: (y - frameStats.shakeY) / camera.zoom + camera.y }),
    screenAt: (x, y) => ({ x: (x - camera.x) * camera.zoom + frameStats.shakeX, y: (y - camera.y) * camera.zoom + frameStats.shakeY }),
    dispose() { if (!disposed) { disposed = true; root.visible = false; } }
  };
}
