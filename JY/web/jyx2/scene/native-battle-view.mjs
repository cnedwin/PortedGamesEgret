import {
  AnimationMixer3D, Mesh3D, Object3D, Scene3D, Skeleton3D, Texture3D,
  createAmbientLight3D, createDirectionalLight3D, createHemisphereLight3D, createOrthographicCamera3D,
  createPlaneGeometry3D, createPointLight3D, createRingGeometry3D, createUnlitMaterial3D,
  setColor3D, vec3Cross, vec3Dot, vec3Normalize,
} from '@egret/engine/world3d';
import { createWebGL2Renderer3D, loadGltfFromUrl3D, loadTexture3D } from '@egret/engine/webgl2/world3d';
import { createNativeBattleSprites } from './native-battle-sprites.mjs';
import { addNativeSanctuary } from './native-sanctuary.mjs';
import { addNativeOutdoorBattle } from './native-battle-outdoor.mjs';
import { addNativeGenericBattle } from './native-battle-generic.mjs';
import { nativeBattleField } from './native-battle-fields.mjs';

const modelPaths = new Map([
  [0, '../inn3d-actors/0.glb'], [53, '../inn3d-actors/53.glb'],
  ...[7, 8, 19, 36, 51].map(id => [id, `../actors/story-${id}.glb`]),
]);
const headings = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
const cameraRise = Math.sqrt(2 / 3) * 40;
const sunOffset = [-19, 25, -13];
const shadowExtent = 23, shadowResolution = 1024;
const shadowTexel = shadowExtent * 2 / shadowResolution;
const shadowRight = new Float32Array(3), shadowUp = new Float32Array(3);
vec3Normalize(shadowRight, vec3Cross(shadowRight, [0, 1, 0], sunOffset));
vec3Normalize(shadowUp, vec3Cross(shadowUp, sunOffset, shadowRight));

async function loadActor(id) {
  const asset = await loadGltfFromUrl3D(new URL(modelPaths.get(id), import.meta.url).href);
  const clips = new Set(asset.animations.map(clip => clip.name));
  let skinCount = 0;
  asset.scene.traverse(node => { if (node instanceof Mesh3D && node.skeleton) skinCount++; });
  if (skinCount && ['idle', 'walk', 'hit', 'attack'].every(clip => clips.has(clip))) return asset;
  asset.dispose();
  throw Error(`Battle role ${id} is missing a skin or battle animation.`);
}

function addActor(scene, asset) {
  const cloned = asset.scene.clone();
  const nodes = new Map(), skeletons = new Map();
  function pair(original, copy) {
    nodes.set(original, copy);
    original.children.forEach((child, i) => pair(child, copy.children[i]));
  }
  pair(asset.scene, cloned);
  let bones = 0;
  for (const [original, copy] of nodes) {
    if (!(original instanceof Mesh3D) || !original.skeleton) continue;
    const skin = original.skeleton;
    if (!skeletons.has(skin)) {
      const joints = skin.bones.map(bone => nodes.get(bone));
      if (joints.some(joint => !joint)) throw Error('A native battle joint is outside its source asset.');
      skeletons.set(skin, new Skeleton3D(joints, skin.inverseBindMatrices));
      bones += joints.length;
    }
    copy.bind(skeletons.get(skin), original.bindMatrix);
    copy.frustumCulled = false;
  }
  const root = scene.addChild(new Object3D());
  root.addChild(cloned);
  const mixer = new AnimationMixer3D(cloned);
  const actions = new Map(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  return { root, mixer, actions, bones, skins: skeletons.size };
}

function poseActor(actor, role, frame, delta, units) {
  const { root, mixer, actions } = actor;
  const hitAge = frame - (role.hitFrame ?? -Infinity);
  const defeatAge = frame - (role.defeatFrame ?? frame);
  const clip = role.dead || role.action === 'stagger' || hitAge < 12 ? 'hit'
    : role.action === 'attack' ? 'attack' : role.action === 'walk' || role.action === 'dodge' ? 'walk' : 'idle';
  const progress = clip === 'attack' ? Math.min(1, role.actFrame / 14)
    : clip === 'hit' ? Math.min(1, (role.dead ? defeatAge : Math.max(0, hitAge)) / 13) : undefined;
  const seeking = Number.isFinite(progress);
  if (clip !== actor.clip || seeking !== actor.seeking) {
    const next = actions.get(clip);
    if (seeking || actor.seeking) mixer.stopAll();
    if (actor.action && !seeking && !actor.seeking) actor.action.crossFadeTo(next, .12);
    else next.reset().play();
    actor.action = next;
    actor.clip = clip;
    actor.seeking = seeking;
  }
  if (seeking) {
    actor.action.paused = true;
    actor.action.time = actor.action.clip.duration * progress;
  }
  mixer.update(seeking ? 0 : delta);
  const tilt = role.dead ? -Math.min(1, defeatAge / 12) * Math.PI / 2 : role.action === 'guard' ? .22 : 0;
  root.setPosition(role.x, (role.z ?? 0) / (units * .866), role.y)
    .setRotation(tilt, headings[role.facing] ?? 0, 0).setScale(role.action === 'guard' ? 1.12 : 1.2);
  root.visible = role.alpha > .08;
}

function contactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(22,17,13,.67)');
  gradient.addColorStop(.65, 'rgba(22,17,13,.36)');
  gradient.addColorStop(1, 'rgba(22,17,13,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new Texture3D(canvas, { colorSpace: 'srgb', mipmaps: false, wrapS: 'clamp', wrapT: 'clamp' });
}

function flatMesh(scene, geometry, material, renderOrder = 0) {
  const mesh = scene.addChild(new Mesh3D(geometry, material));
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.renderOrder = renderOrder;
  mesh.setRotation(-Math.PI / 2, 0, 0);
  return mesh;
}

export async function createNativeBattleArena(overlay, spec, width, height, scale, artwork) {
  const field = nativeBattleField(spec.battlefieldId);
  if (!field) throw Error('Unsupported native battle field ' + spec.battlefieldId);
  const { name, outdoor, authored } = field;
  const snow = name === 'snowfield';
  const viewport = overlay.parentElement;
  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d-canvas battle3d-canvas native-world3d-canvas';
  Object.assign(canvas.dataset, { engine: 'egret-world3d', battlefield: String(spec.battlefieldId), shadows: 'directional' });
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  const scene = new Scene3D();
  scene.background = Array.from(setColor3D(new Float32Array(3), snow ? 0xa4bac6 : outdoor ? 0x354737 : 0x161a1e));
  const units = 18 * Math.SQRT2 * scale;
  const camera = createOrthographicCamera3D({ aspect: width / height, height: height / units, near: 1, far: 180 });
  camera.setPosition(40, cameraRise, 40).lookAt(0, 0, 0);
  const resources = new Set(), models = new Map(), actors = new Map(), contacts = new Map();
  const impacts = [];
  const own = resource => { resources.add(resource); return resource; };
  let renderer, sprites, active = false, disposed = false, lost = false, previousFrame;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (active) viewport.classList.remove('battle3d-active');
    sprites?.dispose();
    for (const actor of actors.values()) actor.mixer.stopAll();
    for (const resource of resources) resource.dispose();
    resources.clear();
    renderer?.dispose();
    canvas.remove();
  }

  try {
    const roleIds = [...new Set([...spec.team, ...spec.enemy].map(role => role.id))].filter(id => modelPaths.has(id));
    const sampler = { colorSpace: 'srgb', wrapS: 'repeat', wrapT: 'repeat', anisotropy: 4 };
    const loadSurface = name => loadTexture3D(new URL(name, import.meta.url).href, sampler).then(own);
    const environmentLoads = authored ? [loadSurface('battle-paving.webp'), loadSurface('battle-wood.webp')]
      : [addNativeGenericBattle(scene, spec, camera, units, outdoor, artwork, own)];
    if (authored && outdoor) environmentLoads.push(snow ? undefined : loadSurface('battle-grass.webp'),
      loadGltfFromUrl3D(new URL('battle-trees.glb', import.meta.url).href).then(own));
    const results = await Promise.allSettled([...environmentLoads,
      ...roleIds.map(id => loadActor(id).then(asset => models.set(id, own(asset))))]);
    const surfaces = results.slice(0, environmentLoads.length).map(result => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    for (const [index, result] of results.slice(environmentLoads.length).entries()) {
      if (result.status === 'rejected') console.warn(`Native battle model ${roleIds[index]} could not load; using its original sprite.`, result.reason);
    }
    const environment = !authored ? surfaces[0] : outdoor ? addNativeOutdoorBattle(scene, spec, surfaces, own)
      : addNativeSanctuary(scene, spec, ...surfaces, own);
    const { instances, batches, groundTiles, treeCount = 0, wallCount = 0 } = environment;
    const sourceModels = roleIds.filter(id => models.has(id)).join(',');
    Object.assign(canvas.dataset, { instances, instancedMeshes: batches, groundTiles, treeCount, wallCount, sourceModels });
    if (!authored) Object.assign(canvas.dataset, {
      modeledTerrain: environment.modeledTerrain, originalProps: environment.originalProps,
      omittedTerrain: environment.omittedTerrain, maskCells: environment.maskCells,
    });

    // World3D normalizes diffuse light to a unit of one. The Three reference uses Lambert's 1/pi.
    const sun = scene.addChild(createDirectionalLight3D({ color: snow ? 0xfff0e3 : outdoor ? 0xffe5b8 : 0xffd7a1,
      intensity: (outdoor ? 1.98 : 1.84) / Math.PI, castShadow: true }));
    Object.assign(sun.shadow, { extent: shadowExtent, near: .5, far: 83, bias: outdoor ? .00012 : .0006, normalBias: .019 });
    scene.addChild(createAmbientLight3D({ color: snow ? 0xe0eeff : outdoor ? 0xf3e7cb : 0xb4bfd8, intensity: (outdoor ? .85 : .68) / Math.PI }));
    scene.addChild(createHemisphereLight3D({ color: outdoor ? 0xe4edfa : 0xe4d3b8, groundColor: outdoor ? 0x575037 : 0x50403a, intensity: 1.25 / Math.PI }));
    scene.addChild(createDirectionalLight3D({ color: outdoor ? 0xd6e9ff : 0xa9c8ff, intensity: (outdoor ? .34 : .52) / Math.PI })).setPosition(16, 10, 21).lookAt(0, 0, 0);
    if (!outdoor) scene.addChild(createPointLight3D({ color: 0xffb46b, intensity: 24 * 3.5 ** .7 / Math.PI, range: 15 })).setPosition(27, 3.5, 26);

    const contactMap = own(contactTexture());
    const shadowGeometry = own(createPlaneGeometry3D({ width: 1.6, height: 1.3 }));
    const shadowMaterial = own(createUnlitMaterial3D({ map: contactMap, alphaMode: 'blend', depthWrite: false, toneMapped: false }));
    const markerGeometry = own(createRingGeometry3D({ innerRadius: .53, outerRadius: .58, thetaSegments: 40 }));
    const marker = flatMesh(scene, markerGeometry, own(createUnlitMaterial3D({ color: 0xf0cb80, side: 'double',
      alphaMode: 'blend', depthWrite: false, opacity: .88 })), 2);
    const impactGeometry = own(createRingGeometry3D({ innerRadius: .63, outerRadius: .76, thetaSegments: 32 }));
    renderer = createWebGL2Renderer3D({ canvas, antialias: true, toneMapping: 'none', shadows: true,
      // World3D gives each shadow one quadrant of the atlas.
      shadowAtlasSize: outdoor ? shadowResolution * 2 : shadowResolution,
      onContextLost() { lost = true; }, onContextRestored() { lost = false; } });
    renderer.setSize(width, height, Math.min(2, Math.max(1.5, devicePixelRatio)));
    viewport.insertBefore(canvas, overlay);

    function draw(state, x, y, zoom, frames = []) {
      if (lost || disposed) return;
      if (!active) {
        active = true;
        canvas.hidden = false;
        viewport.classList.add('battle3d-active');
      }
      const delta = previousFrame === undefined ? 0 : Math.min(.1, Math.max(0, (state.frame - previousFrame) / 60));
      previousFrame = state.frame;
      const u = (width / 2 - x) / (zoom * 18 * scale), v = (height / 2 - y) / (zoom * 9 * scale);
      const cx = (v + u) / 2, cz = (v - u) / 2;
      camera.zoom = zoom;
      camera.setPosition(cx + 40, cameraRise, cz + 40).lookAt(cx, 0, cz);
      const target = [cx, 0, cz];
      for (const axis of [shadowRight, shadowUp]) {
        const coordinate = vec3Dot(target, axis);
        const correction = Math.round(coordinate / shadowTexel) * shadowTexel - coordinate;
        for (let i = 0; i < 3; i++) target[i] += axis[i] * correction;
      }
      sun.setPosition(target[0] + sunOffset[0], target[1] + sunOffset[1], target[2] + sunOffset[2]).lookAt(...target);

      const controlled = state.controlled ?? state.player;
      marker.visible = Boolean(controlled && !controlled.dead);
      if (marker.visible) marker.setPosition(controlled.x, .045, controlled.y);
      const visibleActors = [], motions = [];
      let bones = 0, skins = 0;
      for (const [index, role] of state.roles.entries()) {
        if (!contacts.has(index)) contacts.set(index, flatMesh(scene, shadowGeometry, shadowMaterial));
        const shadow = contacts.get(index);
        shadow.visible = role.alpha > 0;
        shadow.setPosition(role.x, .025, role.y).setScale(1 / (1 + Math.max(0, role.z ?? 0) / 90));
        const model = models.get(role.id);
        if (!model) continue;
        if (!actors.has(index)) actors.set(index, addActor(scene, model));
        const actor = actors.get(index);
        poseActor(actor, role, state.frame, delta, units);
        if (!actor.root.visible) continue;
        visibleActors.push(role.id);
        motions.push(`${role.id}:${actor.clip}`);
        skins += actor.skins;
        bones += actor.bones;
      }
      const hits = state.presentation?.impacts ?? [];
      for (const [index, impact] of hits.entries()) {
        if (!impacts[index]) impacts[index] = flatMesh(scene, impactGeometry, own(createUnlitMaterial3D({
          color: 0xf4c283, side: 'double', blending: 'additive', alphaMode: 'blend', depthWrite: false, toneMapped: false,
        })), 1);
        const ring = impacts[index];
        ring.visible = true;
        ring.setPosition(impact.x, .037, impact.y).setScale(.48 + (1 - impact.alpha) * 1.64);
        ring.material.opacity = impact.alpha * impact.alpha * .52;
      }
      for (let i = hits.length; i < impacts.length; i++) impacts[i].visible = false;
      const drawn = sprites?.update(frames, camera.quaternion);
      environment.tick?.(state.frame / 60);
      renderer.render(scene, camera);
      Object.assign(canvas.dataset, { sceneReady: 'true', nativeFrame: renderer.info.frame, battleTick: state.frame,
        drawCalls: renderer.info.drawCalls, triangles: renderer.info.triangles, shadowMaps: renderer.info.shadowMaps,
        visibleActors: visibleActors.join(','), actorClips: motions.join(','), bones, skinnedModels: skins,
        depthSprites: drawn?.actors ?? 0, depthEffects: drawn?.effects ?? 0, effectSprites: drawn?.effects ?? 0,
        cameraPose: [...camera.position, ...camera.quaternion].join(','),
        projectionMatrix: Array.from(camera.projectionMatrix).join(','), viewProjection: Array.from(camera.viewProjectionMatrix).join(','),
      });
    }

    return { name, actors: sourceModels, draw, dispose,
      hasRole: id => models.has(Number(id)),
      setSpriteArt(art) {
        sprites?.dispose();
        sprites = createNativeBattleSprites(art, units);
        scene.addChild(sprites.group);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
