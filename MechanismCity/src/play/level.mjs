// 一关的全部：读 Tiled 地图、搭物理世界、画机关、相机跟随、粒子与光效、瞄准与发射。
// One level, whole: the Tiled map read by the engine's importer and drawn by its tile map, the mechanisms
// as bodies of its physics world, the 2D camera that follows the pellet, shakes and pulls back to show the
// whole city, the particles of splinters, sparks and dust, glowing locks, and aiming the crossbow.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createCamera2D } from '@egret/engine/camera';
import { createParticleEmitter } from '@egret/engine/particles';
import { createTileMap, importTiledMap } from '@egret/engine/tilemap';
import {
  drawBlock,
  drawBow,
  drawCrate,
  drawGate,
  drawLock,
  drawPellet,
  drawPlank,
  drawPlate,
  drawPost,
  drawRamp,
  drawSpring,
  drawStand,
  drawStone
} from '../art/shapes.mjs';
import { RULES } from '../sim/rules.mjs';
import { createLevelSim } from '../sim/sim.mjs';
import { createScenery } from './scenery.mjs';

export const VIEW = { width: 960, height: 540 };
const AIM = { minAngle: -85, maxAngle: 15, pullForFull: 190 };

/**
 * Build a level on the stage. `textures` holds the leases of the tileset and the painted particles;
 * `on(event)` hears what happens in the city, for the HUD and the sound.
 */
export async function createLevel(game, { file, chapter, textures, on = () => {}, scope }) {
  const json = await (await fetch(new URL('../../levels/' + file, import.meta.url))).json(),
    map = importTiledMap(json);
  const root = game.stage.addChildAt(scope.use(new DisplayObjectContainer()), 0);
  const scenery = createScenery(scope, { width: map.width * map.tileWidth, height: map.height * map.tileHeight, chapter });
  root.addChild(scenery.sky);
  for (const layer of scenery.layers) root.addChild(layer.display);
  const world = root.addChild(scope.use(new DisplayObjectContainer()));

  // ---- the map, drawn by the engine from its tile layers --------------------------------------------
  const tiles = scope.use(createTileMap({ map, textures: { terrain: textures.terrain }, chunkSize: 16 }));
  world.addChild(tiles.display);
  tiles.layer('backdrop').display.alpha = 0.92;
  const ropes = world.addChild(scope.use(new Sprite())),
    bodies = world.addChild(scope.use(new DisplayObjectContainer())),
    effects = world.addChild(scope.use(new DisplayObjectContainer())),
    aim = world.addChild(scope.use(new Sprite())),
    bowStand = world.addChild(scope.use(new Sprite())),
    bow = world.addChild(scope.use(new Sprite()));

  // ---- each body's picture, made when the simulation makes the body ---------------------------------
  const pictures = new Map();
  function display(kind, spec) {
    const sprite = bodies.addChild(scope.use(new Sprite())),
      g = sprite.graphics;
    switch (kind) {
      case 'block':
        drawBlock(g, spec.width, spec.height);
        break;
      case 'crate':
        drawCrate(g, spec.width, spec.height);
        break;
      case 'stone':
        drawStone(g, spec.radius);
        break;
      case 'pellet': {
        drawPellet(g, spec.type, spec.radius);
        if (spec.type === 'thunder') sprite.renderEffect = { glow: { color: 0x7ac8ff, blur: 6, strength: 2 } };
        break;
      }
      case 'seesaw':
        drawPlank(g, spec.width, 10);
        break;
      case 'post':
        drawPost(g);
        break;
      case 'gate':
        drawGate(g, spec.width, spec.height);
        break;
      case 'plate':
        drawPlate(g, spec.width, spec.height, false);
        break;
      case 'spring':
        drawSpring(g, spec.width, spec.height, 0);
        break;
      case 'ramp':
        drawRamp(g, spec.points);
        break;
      case 'lock': {
        drawLock(g, spec.width, spec.height, false);
        // A closed lock is ringed in bronze light; its rays burn brighter with `add` blending.
        sprite.renderEffect = { outline: { color: 0x7fe0c0, width: 2, alpha: 0.85 } };
        const rays = sprite.addChild(scope.use(new Sprite()));
        rays.blendMode = 'add';
        rays.graphics.beginRadialGradientFill(0, 0, spec.width, [{ offset: 0, color: 0x3a8a70, alpha: 0.5 }, { offset: 1, color: 0x000000, alpha: 0 }], spec.height * 1.2).drawEllipse(-spec.width, -spec.height * 1.2, spec.width * 2, spec.height * 2.4).endFill();
        pictures.set(sprite, { rays });
        break;
      }
      default:
        break;
    }
    return sprite;
  }

  // The picture of each part, by the part's description, which a part keeps when its body is replaced.
  const displays = new Map();
  const sim = createLevelSim(map, {
    display: (kind, spec) => {
      const sprite = display(kind, spec);
      displays.set(spec, sprite);
      return sprite;
    },
    onEvent: (event) => {
      if (event.type === 'removed') {
        const sprite = displays.get(event.part.spec);
        if (sprite?.parent) sprite.parent.removeChild(sprite);
      }
      happen(event);
    }
  });

  // ---- the crossbow ------------------------------------------------------------------------------------
  const bowAt = sim.bow;
  bowStand.x = bowAt.x;
  bowStand.y = bowAt.y;
  drawStand(bowStand.graphics);
  bow.x = bowAt.x;
  bow.y = bowAt.y;
  const aiming = { angle: bowAt.angle, power: bowAt.power, pulling: false };

  // ---- particles: one emitter for each kind of debris, burst where something happens; what is bright adds up --
  const emitter = (options) => {
    const made = scope.use(createParticleEmitter({ running: false, rate: 0, maxParticles: 400, ...options }));
    effects.addChild(made.display);
    return made;
  };
  const splinters = emitter({ texture: textures.splinter, lifetime: [0.6, 1.2], speed: [120, 320], angle: [180, 360], gravity: { x: 0, y: 900 }, size: 16, endScale: 0.7, startColor: 0xd09a5a, endColor: 0x6a4424, endAlpha: 0, spin: 540, rotation: [0, 360], seed: 3 });
  const dust = emitter({ texture: textures.dot, lifetime: [0.5, 1.1], speed: [30, 110], angle: [190, 350], gravity: { x: 0, y: -20 }, drag: 1.5, size: 26, endScale: 2.2, startColor: 0xb8b0a0, endColor: 0x6a6660, startAlpha: 0.55, endAlpha: 0, seed: 5 });
  const sparks = emitter({ texture: textures.dot, lifetime: [0.25, 0.6], speed: [160, 420], angle: [0, 360], gravity: { x: 0, y: 700 }, size: 9, endScale: 0.3, startColor: 0xfff0b0, endColor: 0xff7a20, endAlpha: 0, blendMode: 'add', seed: 7 });
  const thunder = emitter({ texture: textures.dot, lifetime: [0.3, 0.9], speed: [200, 560], angle: [0, 360], drag: 2, size: 22, endScale: 0.2, startColor: 0xe6f6ff, endColor: 0x3a78ff, endAlpha: 0, maxParticles: 300, blendMode: 'add', seed: 9 });
  const glints = emitter({ texture: textures.dot, lifetime: [0.6, 1.4], speed: [20, 90], angle: [240, 300], gravity: { x: 0, y: -60 }, size: 12, endScale: 0.2, startColor: 0xffe6a0, endColor: 0xffb040, endAlpha: 0, blendMode: 'add', seed: 11 });
  const trail = emitter({ texture: textures.dot, lifetime: [0.25, 0.45], speed: [0, 12], size: 11, endScale: 0.2, startColor: 0xffe2a0, endColor: 0xff8a40, startAlpha: 0.8, endAlpha: 0, blendMode: 'add', seed: 13 });
  const burst = (stream, x, y, count) => {
    stream.x = x;
    stream.y = y;
    stream.burst(count);
  };

  // ---- the camera -----------------------------------------------------------------------------------------
  const mapWidth = sim.width,
    mapHeight = sim.height,
    overviewZoom = Math.min(VIEW.width / mapWidth, VIEW.height / mapHeight);
  const camera = scope.use(
    createCamera2D({ world, width: VIEW.width, height: VIEW.height, bounds: { x: 0, y: 0, width: mapWidth, height: mapHeight }, zoom: overviewZoom, minZoom: 0.4, maxZoom: 1.6, shakeOffset: 14, shakeRotation: 0.6, center: { x: mapWidth / 2, y: mapHeight / 2 } })
  );
  for (const layer of scenery.layers) camera.addLayer(layer.display, { factor: layer.factor, zoomFactor: layer.factor });
  const PLAY_ZOOM = 0.82;
  const view = { mode: 'overview', following: null, overviewHeld: false };
  /** Look at the crossbow and the near half of the city. */
  function lookAtBow(seconds = 0.8) {
    view.mode = 'bow';
    view.following = null;
    camera.zoomTo(PLAY_ZOOM, seconds);
    camera.panTo(bowAt.x + VIEW.width * 0.32, bowAt.y - 40, seconds);
  }
  function overview(seconds = 0.8) {
    view.mode = 'overview';
    view.following = null;
    camera.zoomTo(overviewZoom, seconds);
    camera.panTo(mapWidth / 2, mapHeight / 2, seconds);
  }

  // ---- what happens -------------------------------------------------------------------------------------
  function happen(event) {
    switch (event.type) {
      case 'hit':
        if (event.speed > 260) {
          if (event.on === 'block' || event.on === 'crate' || event.on === 'seesaw') burst(splinters, event.x, event.y, 6);
          else if (event.on === 'gate' || event.on === 'lock' || event.on === 'spring') burst(sparks, event.x, event.y, 12);
          else burst(dust, event.x, event.y, 6);
        }
        if (event.speed > 520) camera.shake({ trauma: 0.18 });
        break;
      case 'knock':
        burst(dust, event.x, event.y + 10, 4);
        break;
      case 'break':
        burst(splinters, event.x, event.y, 34);
        burst(dust, event.x, event.y, 12);
        camera.shake({ trauma: 0.35 });
        break;
      case 'cut':
        burst(sparks, event.x, event.y, 10);
        break;
      case 'tip':
        burst(dust, event.x, event.y + 12, 10);
        camera.shake({ trauma: 0.25 });
        break;
      case 'spring':
        burst(sparks, event.x, event.y, 8);
        break;
      case 'plate':
      case 'gate':
        burst(sparks, event.x, event.y, 14);
        camera.shake({ trauma: 0.2 });
        break;
      case 'boom':
        burst(thunder, event.x, event.y, 120);
        burst(dust, event.x, event.y, 20);
        camera.shake({ trauma: 0.75 });
        break;
      case 'lock':
        burst(glints, event.x, event.y, 40);
        burst(sparks, event.x, event.y, 24);
        camera.shake({ trauma: 0.3 });
        break;
      case 'shot':
        burst(dust, bowAt.x + 10, bowAt.y + 6, 5);
        break;
      default:
        break;
    }
    on(event);
  }

  // Pictures that change with their mechanism: locks, plates, springs.
  const findSprite = (part) => displays.get(part.spec);
  const lockPictures = sim.locks.map((lock) => ({ lock, sprite: findSprite(lock.part), open: false }));
  const platePictures = sim.plates.map((plate) => ({ plate, sprite: findSprite(plate.part), on: false }));
  const springPictures = sim.springs.map((pad) => ({ pad, sprite: findSprite(pad.part) }));

  // ---- aiming: drag back from anywhere to pull the string, as a sling is pulled --------------------------
  const pad = root.addChild(scope.use(new Sprite()));
  pad.touchEnabled = true;
  pad.hitArea = { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
  const pull = { from: null };
  const input = game.pointer;
  const stops = [
    pad.on(input.events.begin, (event) => {
      if (!sim.ready()) return;
      pull.from = { x: event.payload.globalX, y: event.payload.globalY, angle: aiming.angle, power: aiming.power };
      aiming.pulling = true;
    }),
    pad.on(input.events.move, (event) => {
      if (!pull.from) return;
      const dx = event.payload.globalX - pull.from.x,
        dy = event.payload.globalY - pull.from.y,
        length = Math.hypot(dx, dy);
      if (length < 14) return;
      // Pulling back aims the other way: the pellet flies opposite the pull.
      setAim((Math.atan2(-dy, -dx) * 180) / Math.PI, Math.min(100, (length / AIM.pullForFull) * 100));
    }),
    pad.on(input.events.end, (event) => {
      if (!pull.from) return;
      const moved = Math.hypot(event.payload.globalX - pull.from.x, event.payload.globalY - pull.from.y);
      pull.from = null;
      aiming.pulling = false;
      if (moved > 24) fire();
    }),
    pad.on(input.events.cancel, () => {
      pull.from = null;
      aiming.pulling = false;
    })
  ];
  scope.use({ dispose: () => stops.forEach((stop) => stop()) });

  function setAim(angle, power) {
    aiming.angle = Math.max(AIM.minAngle, Math.min(AIM.maxAngle, angle));
    aiming.power = Math.max(0, Math.min(100, power));
    on({ type: 'aim', angle: aiming.angle, power: aiming.power });
  }
  function fire() {
    if (!sim.fire(aiming.angle, aiming.power)) return false;
    const pellet = sim.pellets.at(-1);
    view.mode = 'follow';
    view.following = pellet;
    camera.follow(() => (pellet.alive ? { x: pellet.body.x, y: pellet.body.y } : { x: camera.snapshot().center.x, y: camera.snapshot().center.y }), { smoothing: 0.18, deadZone: { width: 140, height: 120 } });
    camera.zoomTo(0.9, 0.4);
    animate(game.engine, scope, bow).to({ scaleX: 0.85 }, 0.06, 'quadOut').to({ scaleX: 1 }, 0.25, 'backOut').start();
    return true;
  }

  /** Draw the first part of the flight the aim gives, as fading dots: only a guide, not the whole path. */
  function drawAim() {
    const g = aim.graphics;
    g.clear();
    if (!sim.ready()) return;
    const start = sim.launch(aiming.angle, aiming.power),
      dots = 16;
    for (let i = 1; i <= dots; i++) {
      const t = i * 0.035,
        x = start.x + start.vx * t,
        y = start.y + start.vy * t + 0.5 * RULES.gravity * t * t;
      g.beginFill(0xf6e2a8, 0.85 * (1 - i / (dots + 2))).drawCircle(x, y, 3.2 - i * 0.1).endFill();
    }
  }

  // ---- each frame -------------------------------------------------------------------------------------------
  let time = 0,
    wasReady = false,
    drawn = '';
  function update(seconds) {
    time += seconds;
    sim.update(seconds);
    scenery.update(time);

    // Ropes: from the anchor to where the joint holds the weight, which swings on it when struck.
    const rg = ropes.graphics;
    if (sim.ropes.length) rg.clear();
    for (const rope of sim.ropes) {
      if (rope.cut) continue;
      const weight = rope.weight.body,
        endX = weight.x,
        endY = weight.y - rope.top;
      rg.lineStyle(3, 0x3a2614, 1).moveTo(rope.x, rope.y).lineTo(endX, endY);
      rg.lineStyle(1.2, 0xc89a5a, 0.9).moveTo(rope.x, rope.y).lineTo(endX, endY);
      rg.lineStyle(0);
      rg.beginFill(0x8a6a3a, 1).drawRect(rope.x - 6, rope.y - 4, 12, 6).endFill();
    }

    for (const picture of lockPictures) {
      if (!picture.sprite) continue;
      const extra = pictures.get(picture.sprite);
      if (picture.lock.open && !picture.open) {
        picture.open = true;
        drawLock(picture.sprite.graphics, picture.lock.part.spec.width, picture.lock.part.spec.height, true);
        picture.sprite.renderEffect = { glow: { color: 0xffc860, blur: 10, strength: 3 } };
        animate(game.engine, scope, picture.sprite).to({ scaleX: 1.18, scaleY: 1.18 }, 0.12, 'quadOut').to({ scaleX: 1, scaleY: 1 }, 0.35, 'backOut').start();
      }
      if (extra) extra.rays.alpha = picture.open ? 0.9 + Math.sin(time * 6) * 0.1 : 0.45 + Math.sin(time * 2.4 + picture.lock.part.spec.x) * 0.2;
    }
    for (const picture of platePictures)
      if (picture.sprite && picture.plate.on !== picture.on) {
        picture.on = picture.plate.on;
        drawPlate(picture.sprite.graphics, picture.plate.part.spec.width, picture.plate.part.spec.height, picture.on);
      }
    // Drawings are made again only when what they show has changed.
    for (const picture of springPictures) {
      const squeeze = picture.pad.bounce > 0 ? Math.round((picture.pad.bounce / 0.3) * 20) / 20 : 0;
      if (picture.sprite && squeeze !== picture.squeeze) {
        picture.squeeze = squeeze;
        drawSpring(picture.sprite.graphics, picture.pad.part.spec.width, picture.pad.part.spec.height, squeeze);
      }
    }

    // The bow follows the aim; its string is drawn back as far as the power.
    bow.rotation = aiming.angle;
    const draw = sim.ready() ? 0.25 + aiming.power / 140 : 0.05,
      aimKey = `${draw}|${aiming.angle}|${sim.ready()}`;
    if (aimKey !== drawn) {
      drawn = aimKey;
      drawBow(bow.graphics, draw);
      drawAim();
    }

    // The camera: back to the bow once the city is still again.
    const ready = sim.ready();
    if (ready && !wasReady && !view.overviewHeld && view.mode === 'follow') lookAtBow(0.9);
    wasReady = ready;
    camera.update(seconds);
    tiles.cull(camera.snapshot().view);
    // A pellet in flight leaves sparks behind it, so the eye can follow it.
    for (const pellet of sim.pellets)
      if (pellet.alive && Math.hypot(pellet.body.vx, pellet.body.vy) > 120) {
        trail.x = pellet.body.x;
        trail.y = pellet.body.y;
        trail.burst(pellet.type === 'thunder' ? 3 : 1);
      }
    for (const stream of [splinters, dust, sparks, thunder, glints, trail]) stream.update(seconds);
  }

  return {
    root,
    sim,
    camera,
    aiming,
    map,
    setAim,
    fire,
    update,
    lookAtBow,
    overview,
    /** Hold the whole city in view, or let go and look at the bow again. */
    toggleOverview() {
      view.overviewHeld = view.mode !== 'overview';
      if (view.overviewHeld) overview(0.6);
      else lookAtBow(0.6);
      return view.overviewHeld;
    }
  };
}
