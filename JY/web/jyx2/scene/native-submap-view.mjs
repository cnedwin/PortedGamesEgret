import {
  Object3D, Raycaster3D, Scene3D,
  colorFromHex, createDirectionalLight3D, createHemisphereLight3D, createOrthographicCamera3D,
  createPerspectiveCamera3D, vec3Cross, vec3Dot, vec3Normalize,
} from '@egret/engine/world3d';
import { createWebGL2Renderer3D, loadGltfFromUrl3D } from '@egret/engine/webgl2/world3d';
import { cloneNativeSceneActor } from './native-scene-actor.mjs';
import { createNativeSceneSprites } from './native-scene-sprites.mjs';
import { createNativeStoryProps, nativeStoryEventProp } from './native-story-props.mjs';
import { loadNativeSubmapScenery } from './native-submap-scenery.mjs';
import { submapStoryActor, submapStoryRoles } from './story-cast.mjs';

const headings = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
const here = name => new URL(name, import.meta.url).href;
const sunDirection = vec3Normalize(new Float32Array(3), [-17, 30, -12]);
const shadowRight = vec3Normalize(new Float32Array(3), vec3Cross(new Float32Array(3), [0, 1, 0], sunDirection));
const shadowUp = vec3Normalize(new Float32Array(3), vec3Cross(new Float32Array(3), sunDirection, shadowRight));
const shadowAxes = [shadowRight, shadowUp];
const shadowTexel = 46 / 2048;

function eventPicture(event, tick, animate) {
  if (!event || event.currentPic <= 0) return 0;
  const span = event.endPic - event.beginPic;
  return !animate || event.beginPic < 0 || span <= 0 ? event.currentPic
    : event.beginPic + ((event.picDelay * 2 % span + tick) % (span + 1));
}

function actor(scene, asset, player = false) {
  const root = scene.addChild(new Object3D());
  const { cloned, mixer, actions, bones, skins } = cloneNativeSceneActor(asset);
  root.addChild(cloned);
  if (player && (!actions.has('idle') || !actions.has('walk'))) throw Error('Native KYS hero is missing an idle or walk clip.');
  const idle = actions.has('idle') ? 'idle' : actions.keys().next().value;
  let current, active;
  return { root, skins, bones,
    pose(x, y, z, direction, moving, delta, preferred) {
      root.setPosition(x, y, z).setRotation(0, headings[direction] ?? 0, 0);
      const name = actions.has(preferred) ? preferred : moving && actions.has('walk') ? 'walk' : idle;
      if (name === undefined) return 'rest';
      if (current !== name) {
        active?.stop();
        active = actions.get(name).reset().play();
        current = name;
      }
      mixer.update(delta);
      return name;
    } };
}

export async function createNativeSubmapView(viewport, overlay, { map, textures = new Map(), width, height, scale = 1 }) {
  const roleIds = [...submapStoryRoles(map.id)];
  const required = ['story-props.glb', '../home3d-actors/0.glb'].map(name => loadGltfFromUrl3D(here(name)));
  const requests = await Promise.allSettled([
    ...required, ...roleIds.map(id => loadGltfFromUrl3D(here(`../actors/story-${id}.glb`))),
  ]);
  const resources = requests.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failed = requests.slice(0, required.length).find(result => result.status === 'rejected');
  if (failed) {
    for (const resource of resources) resource.dispose();
    throw failed.reason;
  }
  const [props, mainAsset] = requests.slice(0, required.length).map(result => result.value);
  const models = new Map();
  for (const [i, id] of roleIds.entries()) {
    const result = requests[required.length + i];
    if (result.status === 'fulfilled') models.set(Number(id), result.value);
    else console.warn(`Native story actor ${id} could not load; using the original sprite.`, result.reason);
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d-canvas submap3d-canvas native-world3d-canvas';
  canvas.dataset.engine = 'egret-world3d';
  canvas.dataset.sourceModels = [0, ...models.keys()].join(',');
  const scene = new Scene3D();
  const units = 18 * Math.SQRT2 * scale;
  const preservePerspective = map.id === 0 || map.id === 2;
  const cameraOffset = preservePerspective ? [10.5, 13.2, 10.5] : [38, 38 * Math.sqrt(2 / 3), 38];
  const lookHeight = preservePerspective ? .28 : 0;
  const options = { aspect: width / height, near: .1, far: 150 };
  const camera = preservePerspective ? createPerspectiveCamera3D({ ...options, fov: 38 })
    : createOrthographicCamera3D({ ...options, height: height / units });
  camera.setPosition(...cameraOffset).lookAt(0, lookHeight, 0);
  const facing = camera.quaternion.slice();
  const towardCamera = vec3Normalize(new Float32Array(3), [cameraOffset[0], cameraOffset[1] - lookHeight, cameraOffset[2]]);
  const quads = createNativeSceneSprites(textures, units);
  const sunlight = scene.addChild(createDirectionalLight3D({ color: 0xffe9c5, castShadow: true }));
  Object.assign(sunlight.shadow, { extent: 23, near: .5, far: 94, radius: 1.65, normalBias: .021 });
  const ambient = scene.addChild(createHemisphereLight3D({ color: 0xf6e9d9, groundColor: 0x60594d }));
  const ray = new Raycaster3D();
  const actors = new Map(), originalEvents = new Map();
  const story = createNativeStoryProps(scene, props, map.id);
  let scenery, renderer, player, events, location, cells, previousSize, forcedHero;
  let lastDraw = -Infinity, visible = true, lost = false, disposed = false;
  let targets = [];

  function setScene(next) {
    location = next;
    events = next.events;
    cells = [];
    for (const [index, slot] of next.layers.eventIndex.entries()) {
      if (slot >= 0) cells.push({ index, slot, x: index % next.width, y: Math.floor(index / next.width) });
    }
    scenery.setMap(next);
    scene.background = Array.from(colorFromHex(new Float32Array(3), scenery.cave ? 0x1b2020 : 0x586156));
    ambient.intensity = (scenery.cave ? 1.22 : 1.85) / Math.PI;
    sunlight.intensity = (scenery.cave ? 1.73 : 2.48) / Math.PI;
    canvas.dataset.modeledObjects = String(scenery.modeled);
    canvas.dataset.originalObjects = String(scenery.retained);
    canvas.dataset.omittedObjects = String(scenery.omitted);
    canvas.dataset.vegetationInstances = String(scenery.vegetationInstances);
    canvas.dataset.cave = String(scenery.cave);
    canvas.dataset.maskCells = String(scenery.maskCells);
    canvas.dataset.floorCells = String(scenery.floorCells);
    canvas.dataset.layoutRevision = String(scenery.layoutRevision);
    canvas.dataset.floorKinds = scenery.floor.children.map(mesh => mesh.name.replace('submap-floor-', '')).join(',');
    canvas.dataset.storyTiles = scenery.storyTiles;
  }

  function placeSprite(mesh, x, y, yWorld, rank) {
    const offset = rank * .006;
    return mesh.setPosition(x + towardCamera[0] * offset, yWorld + towardCamera[1] * offset, y + towardCamera[2] * offset)
      .setQuaternion(...facing);
  }

  function drawOriginalEvent(cell, raw, yWorld) {
    const id = Math.trunc(raw / 2);
    let mesh = originalEvents.get(cell.index);
    if (!mesh) {
      mesh = quads.create(id);
      if (!mesh) return;
      originalEvents.set(cell.index, scene.addChild(mesh));
    }
    if (!quads.change(mesh, id)) return;
    mesh.visible = true;
    placeSprite(mesh, cell.x, cell.y, yWorld, 3);
    return { id, mesh };
  }

  function update({ x, y, direction, moving, hidden, elapsedMs, cameraFocus, opacity = 1,
    sceneEvents = events, animationTick = 0, animateEvents = true, heroPicture, force }) {
    if (!visible || lost || disposed) return;
    canvas.style.opacity = opacity;
    const bounds = overlay.getBoundingClientRect();
    const w = Math.max(1, Math.round(bounds.width)), h = Math.max(1, Math.round(bounds.height));
    const pixelRatio = Math.min(1.6, Math.max(1, devicePixelRatio));
    const size = w + 'x' + h + '@' + pixelRatio;
    if (size !== previousSize) {
      previousSize = size;
      renderer.setSize(w, h, pixelRatio);
      if (preservePerspective) camera.aspect = w / h;
    } else if (!force && elapsedMs - lastDraw < 28) return;
    const delta = Number.isFinite(lastDraw) ? Math.min(.10, Math.max(0, (elapsedMs - lastDraw) / 1000)) : 0;
    lastDraw = elapsedMs;
    const fx = cameraFocus?.x ?? x, fy = cameraFocus?.y ?? y;
    const ey = scenery.heightAtActor(fx, fy);
    camera.setPosition(fx + cameraOffset[0], ey + cameraOffset[1], fy + cameraOffset[2]).lookAt(fx, ey + lookHeight, fy);
    const target = [fx, ey, fy];
    for (const axis of shadowAxes) {
      const coordinate = vec3Dot(target, axis), correction = Math.round(coordinate / shadowTexel) * shadowTexel - coordinate;
      for (let i = 0; i < 3; i++) target[i] += axis[i] * correction;
    }
    sunlight.setPosition(...target.map((value, i) => value + sunDirection[i] * 42)).lookAt(...target);

    const playerHeight = scenery.heightAtActor(x, y);
    if (forcedHero) forcedHero.visible = false;
    if (!hidden && heroPicture !== undefined) {
      if (!forcedHero) {
        const mesh = quads.create(heroPicture);
        if (mesh) forcedHero = scene.addChild(mesh);
      }
      if (forcedHero && quads.change(forcedHero, heroPicture)) {
        forcedHero.visible = true;
        placeSprite(forcedHero, x, y, playerHeight, 2);
      }
    }
    player.root.visible = !hidden && !forcedHero?.visible;
    const heroMotion = player.root.visible ? player.pose(x, playerHeight, y, direction, moving, delta) : '';
    for (const { root } of actors.values()) root.visible = false;
    story.begin();
    for (const mesh of originalEvents.values()) mesh.visible = false;
    targets = [];
    const actorStates = [], propStates = [], originalStates = [];
    let skins = player.root.visible ? player.skins : 0;
    let bones = player.root.visible ? player.bones : 0;
    for (const cell of cells) {
      const event = sceneEvents[cell.slot];
      const picture = eventPicture(event, animationTick, animateEvents);
      if (picture <= 0) continue;
      const h = scenery.heightAtActor(cell.x, cell.y);
      const state = submapStoryActor(location.id, cell.slot, picture);
      const model = models.get(state?.role);
      if (model) {
        const key = `${cell.index}:${state.role}`;
        if (!actors.has(key)) actors.set(key, actor(scene, model));
        const guest = actors.get(key);
        const [dx, dz] = state.visualOffset ?? [0, 0];
        guest.root.visible = true;
        guest.pose(cell.x + dx, h, cell.y + dz, state.direction, false, delta, state.action ?? state.pose);
        actorStates.push(`${cell.slot}:${state.role}`);
        skins += guest.skins;
        bones += guest.bones;
        if (event.event1 > 0) targets.push({ ...cell, renderX: cell.x + dx, renderY: cell.y + dz,
          height: h + (state.pose === 'sit' ? .67 : .82), radius: .72 });
        continue;
      }
      const descriptor = nativeStoryEventProp(location.id, cell.slot, Math.trunc(picture / 2));
      const prop = descriptor && story.draw(cell.slot, descriptor, cell.x, h, cell.y, elapsedMs);
      if (prop) {
        propStates.push(`${cell.slot}:${descriptor.kind}:${descriptor.state}`);
        if (event.event1 > 0) targets.push({ ...cell, mesh: prop });
      } else {
        const sprite = drawOriginalEvent(cell, picture, h);
        if (sprite) {
          originalStates.push(cell.slot + ':' + sprite.id);
          if (event.event1 > 0) targets.push({ ...cell, ...sprite });
        }
      }
    }

    scenery.updateWind(elapsedMs);
    renderer.render(scene, camera);
    canvas.dataset.nativeFrame = String(renderer.info.frame);
    canvas.dataset.drawCalls = String(renderer.info.drawCalls);
    canvas.dataset.triangles = String(renderer.info.triangles);
    canvas.dataset.shadowMaps = String(renderer.info.shadowMaps);
    canvas.dataset.wind = String(scenery.windActive);
    canvas.dataset.skinnedModels = String(skins);
    canvas.dataset.bones = String(bones);
    canvas.dataset.heroAnimation = heroMotion;
    canvas.dataset.heroPicture = forcedHero?.visible ? String(heroPicture) : '';
    canvas.dataset.storyActors = actorStates.join(',');
    canvas.dataset.storyProps = propStates.join(',');
    canvas.dataset.originalEvents = originalStates.join(',');
    canvas.dataset.cameraPose = [...camera.position, ...camera.quaternion].join(',');
    canvas.dataset.viewProjection = Array.from(camera.viewProjectionMatrix).join(',');
    canvas.dataset.sceneReady = 'true';
  }

  function pick(u, v) {
    if (!visible || lost || disposed || !canvas.dataset.sceneReady) return;
    ray.setFromCamera(u * 2 - 1, 1 - v * 2, camera);
    const ground = ray.intersect(scenery.floor, { firstHitOnly: true })[0];
    const [ox, oy, oz] = ray.origin, [dx, dy, dz] = ray.direction;
    let nearest = ground?.distance ?? Infinity, target;
    for (const cell of targets) {
      if (cell.mesh) {
        const hit = ray.intersect(cell.mesh, { firstHitOnly: cell.id === undefined })
          .find(hit => cell.id === undefined || quads.solid(cell.id, hit));
        if (hit && hit.distance < nearest) { nearest = hit.distance; target = cell; }
        continue;
      }
      const x = cell.renderX - ox, y = cell.height - oy, z = cell.renderY - oz;
      const t = x * dx + y * dy + z * dz;
      if (t <= 0 || t >= nearest) continue;
      if (Math.hypot(x - t * dx, y - t * dy, z - t * dz) <= cell.radius) { nearest = t; target = cell; }
    }
    if (target) {
      const blocked = ray.intersect(scenery.blockers, { firstHitOnly: true })[0];
      if (blocked && blocked.distance < nearest - .02) return;
      return { x: target.x, y: target.y };
    }
    if (ground) return { x: Math.round(ground.point[0]), y: Math.round(ground.point[2]) };
    const t = -oy / dy;
    return Number.isFinite(t) && t >= 0 ? { x: Math.round(ox + dx * t), y: Math.round(oz + dz * t) } : null;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer?.dispose();
    scenery?.dispose();
    story.dispose();
    quads.dispose();
    for (const resource of resources) resource.dispose();
    canvas.remove();
    viewport.classList.remove('scene3d-active', 'submap3d-active');
  }

  try {
    scenery = await loadNativeSubmapScenery(map, {
      storyTile: story.tile,
      sprite(id, x, y, yWorld, rank) {
        const mesh = quads.create(id);
        return mesh && placeSprite(mesh, x, y, yWorld, rank);
      },
    });
    scene.addChild(scenery.root);
    player = actor(scene, mainAsset, true);
    renderer = createWebGL2Renderer3D({ canvas, shadowAtlasSize: 2048, toneMapping: 'none',
      onContextLost() { lost = true; }, onContextRestored() { lost = false; } });
    setScene(map);
    viewport.insertBefore(canvas, overlay);
    viewport.classList.add('scene3d-active', 'submap3d-active');
  } catch (error) {
    dispose();
    throw error;
  }
  return { update, pick, setScene, propSlots: [], dispose,
    setVisible(value) { visible = value; canvas.hidden = !value; } };
}
