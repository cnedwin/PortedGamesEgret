import {
  AnimationMixer3D, Mesh3D, Object3D, Scene3D, Skeleton3D, Texture3D,
  createAmbientLight3D, createDirectionalLight3D, createHemisphereLight3D, createOrthographicCamera3D,
  createPlaneGeometry3D, createPointLight3D, createRingGeometry3D, createUnlitMaterial3D,
  setColor3D, vec3Cross, vec3Dot, vec3Normalize,
} from '@egret/engine/world3d';
import { loadGltfFromUrl3D, loadTexture3D } from '@egret/engine/webgl2/world3d';
import { createWorldRenderer } from './world3d-renderer.mjs';
import { createBattleSpriteMaterial, createNativeBattleSprites } from './native-battle-sprites.mjs';
import { createBattleCharacterArt } from './native-battle-character-art.mjs';
import { battleModelFor } from '../actors/battle-models.mjs';
import { addNativeSanctuary } from './native-sanctuary.mjs';
import { addNativeOutdoorBattle } from './native-battle-outdoor.mjs';
import { addNativeGenericBattle } from './native-battle-generic.mjs';
import { nativeBattleField } from './native-battle-fields.mjs';

const headings = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
const forward = [[0, -1], [1, 0], [-1, 0], [0, 1]];
const cameraRise = Math.sqrt(2 / 3) * 40;
const sunOffset = [-19, 25, -13];
const shadowExtent = 23, shadowResolution = 1024;
const shadowTexel = shadowExtent * 2 / shadowResolution;
const shadowRight = new Float32Array(3), shadowUp = new Float32Array(3);
vec3Normalize(shadowRight, vec3Cross(shadowRight, [0, 1, 0], sunOffset));
vec3Normalize(shadowUp, vec3Cross(shadowUp, sunOffset, shadowRight));

async function loadActor(path, characterArt) {
  const asset = await loadGltfFromUrl3D(new URL(`../actors/${path}`, import.meta.url).href);
  const clips = new Set(asset.animations.map(clip => clip.name));
  let skinCount = 0;
  asset.scene.traverse(node => { if (node instanceof Mesh3D && node.skeleton) skinCount++; });
  if (skinCount && ['idle', 'walk', 'hit', 'attack'].every(clip => clips.has(clip))) {
    characterArt.finishMaterials(asset.scene);
    return asset;
  }
  asset.dispose();
  throw Error(`Battle model ${path} is missing a skin or battle animation.`);
}

function addActor(scene, asset, role, characterArt) {
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
  characterArt.equip(cloned, role);
  const mixer = new AnimationMixer3D(cloned);
  const actions = new Map(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  return { root, mixer, actions, bones, skins: skeletons.size };
}

function ease(value) { return value * value * (3 - 2 * value); }

function actorMotion(role, frame, attack) {
  if (role.dead) return;
  const [dx, dy] = forward[role.facing] ?? forward[0];
  const hitAge = frame - (role.hitFrame ?? -Infinity);
  if (hitAge >= 0 && hitAge < 8) {
    const recoil = (1 - hitAge / 8) ** 2;
    return { x: -.15 * dx * recoil, y: -.15 * dy * recoil, roll: (dx - dy) * recoil * 5 };
  }
  if (!attack || attack.key !== role.key) return;
  const { progress, impactAt } = attack;
  const releaseAt = impactAt * .58;
  const windup = ease(Math.min(1, progress / releaseAt));
  const release = ease(Math.max(0, Math.min(1, (progress - releaseAt) / (impactAt - releaseAt))));
  const recovery = ease(Math.max(0, (progress - impactAt) / (1 - impactAt)));
  // Both actor formats step back, commit, then settle on the gameplay tile.
  const stride = (-.08 * windup + .25 * release) * (1 - recovery);
  return {
    x: dx * stride, y: dy * stride,
    clipTime: .18 * windup + .28 * release + .54 * recovery,
    anticipation: progress < impactAt ? progress / impactAt : undefined,
  };
}

function poseActor(actor, role, frame, delta, units, motion) {
  const { root, mixer, actions } = actor;
  const hitAge = frame - (role.hitFrame ?? -Infinity);
  const defeatAge = frame - (role.defeatFrame ?? frame);
  const action = role.dead || role.action === 'stagger' || hitAge < 12 ? 'hit'
    : role.action === 'attack' ? 'attack' : role.action === 'walk' || role.action === 'dodge' ? 'walk' : 'idle';
  const skillClip = `attack-${role.selectedMagicId}`;
  const clip = action === 'attack' && actions.has(skillClip) ? skillClip : action;
  const progress = action === 'attack' ? motion?.clipTime ?? Math.min(1, role.actFrame / 14)
    : action === 'hit' ? Math.min(1, (role.dead ? defeatAge : Math.max(0, hitAge)) / 13) : undefined;
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
  root.setPosition(role.x + (motion?.x ?? 0), (role.z ?? 0) / (units * .866), role.y + (motion?.y ?? 0))
    .setRotation(tilt, headings[role.facing] ?? 0, 0).setScale(role.action === 'guard' ? 1.12 : 1.2);
  root.visible = role.alpha > .08;
}

function contactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(21,20,17,.58)');
  gradient.addColorStop(.58, 'rgba(21,20,17,.24)');
  gradient.addColorStop(1, 'rgba(21,20,17,0)');
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
  const characterArt = createBattleCharacterArt();
  const impacts = [], poseBySprite = new Map();
  const own = resource => { resources.add(resource); return resource; };
  let renderer, sprites, active = false, disposed = false, lost = false, previousFrame;

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (active) viewport.classList.remove('battle3d-active');
    sprites?.dispose();
    for (const actor of actors.values()) actor.mixer.stopAll();
    characterArt.dispose();
    for (const resource of resources) resource.dispose();
    resources.clear();
    renderer?.dispose();
    canvas.remove();
  }

  try {
    const roleModels = new Map([...spec.team, ...spec.enemy].map(role => [role.id, battleModelFor(role)])
      .filter(([, path]) => path));
    const actorPaths = [...new Set(roleModels.values())];
    const sampler = { colorSpace: 'srgb', wrapS: 'repeat', wrapT: 'repeat', anisotropy: 4 };
    const loadSurface = name => loadTexture3D(new URL(name, import.meta.url).href, sampler).then(own);
    const environmentLoads = authored ? [loadSurface('battle-paving.webp'), loadSurface('battle-wood.webp')]
      : [addNativeGenericBattle(scene, spec, camera, units, outdoor, artwork, own)];
    if (authored && outdoor) environmentLoads.push(snow ? undefined : loadSurface('battle-grass.webp'),
      loadGltfFromUrl3D(new URL('battle-trees.glb', import.meta.url).href).then(own));
    const results = await Promise.allSettled([...environmentLoads,
      ...actorPaths.map(path => loadActor(path, characterArt).then(own))]);
    const surfaces = results.slice(0, environmentLoads.length).map(result => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    });
    const loadedModels = new Map();
    for (const [index, result] of results.slice(environmentLoads.length).entries()) {
      const path = actorPaths[index];
      if (result.status === 'fulfilled') loadedModels.set(path, result.value);
      else console.warn(`Native battle model ${path} could not load; using its original sprites.`, result.reason);
    }
    for (const [id, path] of roleModels) if (loadedModels.has(path)) models.set(id, loadedModels.get(path));
    const environment = !authored ? surfaces[0] : outdoor ? addNativeOutdoorBattle(scene, spec, surfaces, own)
      : addNativeSanctuary(scene, spec, ...surfaces, own);
    const { instances, batches, groundTiles, treeCount = 0, wallCount = 0 } = environment;
    const sourceModels = [...models.keys()].join(',');
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
    const shadowGeometry = own(createPlaneGeometry3D({ width: 1.45, height: 1.16 }));
    const shadowMaterial = own(createUnlitMaterial3D({ map: contactMap, alphaMode: 'blend', depthWrite: false, toneMapped: false }));
    const markerGeometry = own(createRingGeometry3D({ innerRadius: .53, outerRadius: .58, thetaSegments: 40 }));
    const marker = flatMesh(scene, markerGeometry, own(createUnlitMaterial3D({ color: 0xf0cb80, side: 'double',
      alphaMode: 'blend', depthWrite: false, opacity: .88 })), 2);
    const impactGeometry = own(createRingGeometry3D({ innerRadius: .63, outerRadius: .76, thetaSegments: 32 }));
    renderer = createWorldRenderer({ canvas, antialias: true, toneMapping: 'none', shadows: true,
      // World3D gives each shadow one quadrant of the atlas.
      shadowAtlasSize: outdoor ? shadowResolution * 2 : shadowResolution,
      onContextLost() { lost = true; }, onContextRestored() { lost = false; } });
    renderer.setSize(width, height, Math.min(2, Math.max(1.5, devicePixelRatio)));
    viewport.insertBefore(canvas, overlay);

    function ensureActor(index, role) {
      if (!contacts.has(index)) contacts.set(index, flatMesh(scene, shadowGeometry, shadowMaterial));
      const model = models.get(role.id);
      if (model && !actors.has(index)) actors.set(index, addActor(scene, model, role, characterArt));
      return actors.get(index);
    }

    async function prepareOpeningPrograms(roles) {
      for (const [index, role] of roles.entries()) ensureActor(index, role);
      const requests = [];
      scene.traverse(mesh => {
        if (!(mesh instanceof Mesh3D)) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          requests.push({ mesh, material, fog: Boolean(scene.fog), environment: Boolean(scene.environment),
            receiveShadows: renderer.shadowsEnabled });
          if (renderer.shadowsEnabled && mesh.castShadow) requests.push({ mesh, material, pass: 'shadow' });
        }
      });
      // Billboard actors have no scene meshes until their first draw. Only the program
      // matters here, so the existing contact plane and texture stand in for the sprite art.
      const spriteMaterial = roles.some(role => !models.has(role.id))
        ? createBattleSpriteMaterial(contactMap, 'mask') : undefined;
      if (spriteMaterial) {
        const mesh = new Mesh3D(shadowGeometry, spriteMaterial);
        mesh.receiveShadow = false;
        requests.push({ mesh, material: spriteMaterial });
      }
      try {
        await renderer.preparePrograms(requests);
      } finally {
        spriteMaterial?.dispose();
      }
    }

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

      const attack = state.presentation?.attackMotion;
      const attackCue = !attack ? 'idle' : attack.progress < attack.impactAt ? 'windup'
        : attack.progress < attack.impactAt + .12 ? 'impact' : 'recovery';
      marker.visible = false;
      poseBySprite.clear();
      const visibleActors = [], motions = [];
      let bones = 0, skins = 0;
      for (const [index, role] of state.roles.entries()) {
        const motion = actorMotion(role, state.frame, attack);
        const x = role.x + (motion?.x ?? 0), y = role.y + (motion?.y ?? 0);
        const actor = ensureActor(index, role);
        const shadow = contacts.get(index);
        shadow.visible = role.alpha > 0;
        const grounding = 1 / (1 + Math.max(0, role.z ?? 0) / 90);
        shadow.setPosition(x, .025, y).setScale(grounding * Math.sqrt(Math.max(0, role.alpha)));
        if (motion?.anticipation !== undefined && role.alpha > 0) {
          marker.visible = true;
          marker.setPosition(x, .045, y).setScale(1.35 - motion.anticipation * .48);
          marker.material.opacity = .3 + motion.anticipation * .54;
        }
        if (!actor) {
          if (motion) poseBySprite.set(`r${index}`, motion);
          continue;
        }
        poseActor(actor, role, state.frame, delta, units, motion);
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
        ring.setPosition(impact.x, .037, impact.y).setScale(.53 + (1 - impact.alpha ** 2) * 1.18);
        ring.material.opacity = impact.alpha ** 3 * .64;
      }
      for (let i = hits.length; i < impacts.length; i++) impacts[i].visible = false;
      const drawn = sprites?.update(frames, camera.quaternion, poseBySprite);
      environment.tick?.(state.frame / 60);
      renderer.render(scene, camera);
      Object.assign(canvas.dataset, { sceneReady: 'true', nativeFrame: renderer.info.frame, battleTick: state.frame,
        drawCalls: renderer.info.drawCalls, triangles: renderer.info.triangles, shadowMaps: renderer.info.shadowMaps,
        visibleActors: visibleActors.join(','), actorClips: motions.join(','), bones, skinnedModels: skins,
        depthSprites: drawn?.actors ?? 0, depthEffects: drawn?.effects ?? 0, effectSprites: drawn?.effects ?? 0,
        attackCue,
        cameraPose: [...camera.position, ...camera.quaternion].join(','),
        projectionMatrix: Array.from(camera.projectionMatrix).join(','), viewProjection: Array.from(camera.viewProjectionMatrix).join(','),
      });
    }

    return { name, actors: sourceModels, draw, dispose, prepareOpeningPrograms,
      hasRole: id => models.has(Number(id)),
      setSpriteArt(art) {
        sprites?.dispose();
        sprites = createNativeBattleSprites(art, units, outdoor);
        scene.addChild(sprites.group);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
