// 一关的全部：读 Tiled 地图、搭物理世界、画机关、相机跟随、粒子与光效、瞄准与发射。
// One level, whole: the Tiled map read by the engine's importer and drawn by its tile map, the mechanisms
// as bodies of its physics world, the 2D camera that follows the pellet, shakes and pulls back to show the
// whole city, the particles of splinters, sparks and dust, glowing locks, and aiming the crossbow.
import { Bitmap, DisplayObjectContainer, Sprite, animate } from '@egret/engine';
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
  drawRope,
  drawSpring,
  drawStand,
  drawStone
} from '../art/shapes.mjs';
import { mechanismFrame } from '../art/mechanism-atlas.mjs';
import { createLevelSim } from '../sim/sim.mjs';
import { createScenery } from './scenery.mjs';
import { projectTrajectory } from './trajectory.mjs';

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
  const scenery = createScenery(scope, { width: map.width * map.tileWidth, height: map.height * map.tileHeight, chapter, panorama: textures.panorama });
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
  const baked = new WeakMap();
  function paintBaked(sprite, kind, spec, active = false) {
    const frame = mechanismFrame(kind, spec, active);
    if (!frame || !textures.mechanisms) return false;
    let image = baked.get(sprite);
    if (!image) {
      image = sprite.addChild(scope.use(new Bitmap(textures.mechanisms)));
      baked.set(sprite, image);
    }
    const {x, y, width, height, originX, originY, scale} = frame;
    image.sourceRect = {x, y, width, height};
    image.x = originX;
    image.y = originY;
    image.scaleX = image.scaleY = 1 / scale;
    return true;
  }

  function display(kind, spec) {
    const sprite = bodies.addChild(scope.use(new Sprite())),
      g = sprite.graphics;
    const isBaked = paintBaked(sprite, kind, spec);
    if (isBaked && kind !== 'lock' && kind !== 'pellet') return sprite;
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
        if (!isBaked) drawPellet(g, spec.type, spec.radius);
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
        if (!isBaked) drawLock(g, spec.width, spec.height, false);
        const rays = sprite.addChildAt(scope.use(new Bitmap(textures.lockLights)), 0);
        rays.sourceRect = { x: 0, y: 0, width: 64, height: 64 };
        rays.x = -spec.width * 0.85;
        rays.y = -spec.height * 0.95;
        rays.scaleX = -2 * rays.x / 64;
        rays.scaleY = -2 * rays.y / 64;
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
  const ropePictures = sim.ropes.map((rope) => ({
    rope, sprite: ropes.addChild(scope.use(new Sprite())), x: NaN, y: NaN,
  }));

  // ---- the crossbow ------------------------------------------------------------------------------------
  const bowAt = sim.bow;
  bowStand.x = bowAt.x;
  bowStand.y = bowAt.y;
  if (!paintBaked(bowStand, 'stand')) drawStand(bowStand.graphics);
  bow.x = bowAt.x;
  bow.y = bowAt.y;
  const aiming = { angle: bowAt.angle, power: bowAt.power, pulling: false };
  aim.name = 'trajectory-guide';
  aim.visible = false;
  const guide = Array.from({ length: 36 }, () => {
    const dot = aim.addChild(scope.use(new Bitmap(textures.dot)));
    dot.anchorOffsetX = dot.naturalWidth / 2;
    dot.anchorOffsetY = dot.naturalHeight / 2;
    dot.scaleX = dot.scaleY = 12 / dot.naturalWidth;
    return dot;
  });
  const impact = aim.addChild(scope.use(new Sprite()));
  impact.name = 'trajectory-contact';
  impact.graphics.lineStyle(6, 0x2d1d11, 0.92).drawCircle(0, 0, 12)
    .lineStyle(2.7, 0xffd77c).drawCircle(0, 0, 12)
    .lineStyle(0).beginFill(0xffefbb).drawCircle(0, 0, 2.7).endFill();

  // ---- particles: one emitter for each kind of debris, burst where something happens; what is bright adds up --
  const emitter = (options) => {
    const made = scope.use(createParticleEmitter({ running: false, rate: 0, maxParticles: 400, ...options }));
    effects.addChild(made.display);
    return made;
  };
  const splinters = emitter({ texture: textures.splinter, lifetime: [0.6, 1.2], speed: [120, 320], angle: [180, 360], gravity: { x: 0, y: 900 }, size: 16, endScale: 0.7, startColor: 0xd09a5a, endColor: 0x6a4424, endAlpha: 0, spin: 540, rotation: [0, 360], seed: 3 });
  const dust = emitter({ texture: textures.dust ?? textures.dot, lifetime: [0.5, 1.1], speed: [30, 110], angle: [190, 350], gravity: { x: 0, y: -20 }, drag: 1.5, size: 35, endScale: 2.2, startColor: 0xc2bea3, endColor: 0x746a5b, startAlpha: 0.61, endAlpha: 0, rotation: [0, 360], seed: 5 });
  const sparks = emitter({ texture: textures.spark ?? textures.dot, lifetime: [0.25, 0.6], speed: [160, 420], angle: [0, 360], gravity: { x: 0, y: 700 }, size: 11, endScale: 0.3, startColor: 0xfff0b0, endColor: 0xff7a20, endAlpha: 0, rotation: [0, 180], blendMode: 'add', seed: 7 });
  const thunder = emitter({ texture: textures.thunder ?? textures.dot, lifetime: [0.3, 0.9], speed: [200, 560], angle: [0, 360], drag: 2, size: 21, endScale: 0.2, startColor: 0xeafcff, endColor: 0x4f8de8, endAlpha: 0, rotation: [0, 360], maxParticles: 300, blendMode: 'add', seed: 9 });
  const glints = emitter({ texture: textures.spark ?? textures.dot, lifetime: [0.6, 1.4], speed: [20, 90], angle: [240, 300], gravity: { x: 0, y: -60 }, size: 16, endScale: 0.2, startColor: 0xffe9ae, endColor: 0xffb040, endAlpha: 0, blendMode: 'add', seed: 11 });
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
  let pull = null;
  const input = game.pointer;
  function offsetFromPull(sample) {
    if (pull === null || sample.session !== pull.session) return null;
    const dx = sample.globalX - pull.globalX, dy = sample.globalY - pull.globalY;
    return { dx, dy, length: Math.hypot(dx, dy) };
  }
  function aimFromPull({ dx, dy, length }) {
    // The pellet flies opposite the pull.
    setAim(Math.atan2(-dy, -dx) * 180 / Math.PI, length / AIM.pullForFull * 100);
  }
  function endPull() {
    pull = null;
    aiming.pulling = false;
  }
  const stops = [
    pad.on(input.events.begin, ({ payload }) => {
      if (pull !== null || !sim.ready()) return;
      pull = payload;
      aiming.pulling = true;
    }),
    pad.on(input.events.move, ({ payload }) => {
      const offset = offsetFromPull(payload);
      if (offset && offset.length >= 14) aimFromPull(offset);
    }),
    pad.on(input.events.end, ({ payload }) => {
      const release = offsetFromPull(payload);
      if (!release) return;
      endPull();
      if (release.length > 24) {
        aimFromPull(release);
        fire();
      }
    }),
    pad.on(input.events.cancel, ({ payload }) => {
      if (pull !== null && payload.session === pull.session) endPull();
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

  /** Show the projected flight up to the first contact with the city. */
  function drawAim(ready) {
    aim.visible = ready;
    if (!ready) return;
    const { points, contact } = projectTrajectory(sim, aiming.angle, aiming.power);
    const count = Math.min(points.length, guide.length);
    for (const [index, dot] of guide.entries()) {
      const point = index < count ? points[Math.floor(index * (points.length - 1) / Math.max(1, count - 1))] : null;
      dot.visible = !!point && (!contact || Math.hypot(point.x - contact.x, point.y - contact.y) > 14);
      if (dot.visible) {
        dot.x = point.x;
        dot.y = point.y;
        dot.alpha = 0.92 - 0.22 * index / count;
      }
    }
    impact.visible = !!contact;
    if (contact) {
      impact.x = contact.x;
      impact.y = contact.y;
    }
  }

  // ---- each frame -------------------------------------------------------------------------------------------
  let time = 0,
    wasReady = false,
    drawnAngle = NaN,
    drawnPower = -1;
  function update(seconds) {
    time += seconds;
    sim.update(seconds);
    scenery.update(time);

    // Ropes: from the anchor to where the joint holds the weight, which swings on it when struck.
    for (const picture of ropePictures) {
      const { rope, sprite } = picture;
      if (rope.cut) {
        sprite.visible = false;
        continue;
      }
      const weight = rope.weight.body,
        endX = weight.x,
        endY = weight.y - rope.top;
      if (Math.abs(picture.x - endX) <= 0.125 && Math.abs(picture.y - endY) <= 0.125) continue;
      picture.x = endX;
      picture.y = endY;
      sprite.graphics.clear();
      drawRope(sprite.graphics, rope.x, rope.y, endX, endY);
    }

    for (const picture of lockPictures) {
      if (!picture.sprite) continue;
      const extra = pictures.get(picture.sprite);
      if (picture.lock.open && !picture.open) {
        picture.open = true;
        const spec = picture.lock.part.spec;
        if (!paintBaked(picture.sprite, 'lock', spec, true)) drawLock(picture.sprite.graphics, spec.width, spec.height, true);
        if (extra) extra.rays.sourceRect = { x: 64, y: 0, width: 64, height: 64 };
        animate(game.engine, scope, picture.sprite).to({ scaleX: 1.18, scaleY: 1.18 }, 0.12, 'quadOut').to({ scaleX: 1, scaleY: 1 }, 0.35, 'backOut').start();
      }
      if (extra) extra.rays.alpha = picture.open ? 0.9 + Math.sin(time * 6) * 0.1 : 0.45 + Math.sin(time * 2.4 + picture.lock.part.spec.x) * 0.2;
    }
    for (const picture of platePictures)
      if (picture.sprite && picture.plate.on !== picture.on) {
        picture.on = picture.plate.on;
        const spec = picture.plate.part.spec;
        if (!paintBaked(picture.sprite, 'plate', spec, picture.on)) drawPlate(picture.sprite.graphics, spec.width, spec.height, picture.on);
      }
    // Drawings are made again only when what they show has changed.
    for (const picture of springPictures) {
      const squeeze = picture.pad.bounce > 0 ? Math.round((picture.pad.bounce / 0.3) * 20) / 20 : 0;
      if (picture.sprite && squeeze !== picture.squeeze) {
        picture.squeeze = squeeze;
        const spec = picture.pad.part.spec;
        if (!paintBaked(picture.sprite, 'spring', spec, squeeze)) drawSpring(picture.sprite.graphics, spec.width, spec.height, squeeze);
      }
    }

    // The bow follows the aim; its string is drawn back as far as the power.
    bow.rotation = aiming.angle;
    const ready = sim.ready();
    const draw = ready ? 0.25 + aiming.power / 140 : 0.05;
    if (drawnPower !== draw) drawBow(bow.graphics, draw);
    if (ready !== wasReady || (ready && (drawnAngle !== aiming.angle || drawnPower !== draw))) {
      drawnAngle = aiming.angle;
      drawAim(ready);
    }
    drawnPower = draw;

    // The camera: back to the bow once the city is still again.
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
