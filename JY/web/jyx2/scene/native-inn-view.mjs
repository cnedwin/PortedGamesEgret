import {
  InstancedMesh3D, Mesh3D, Object3D, Raycaster3D, Scene3D,
  createAmbientLight3D, createCustomShader3D, createDirectionalLight3D, createGeometry3D, createPerspectiveCamera3D,
  mat4Compose, mat4Invert, mat4Multiply, vec3TransformDirection, vec3TransformMat4,
} from '@egret/engine/world3d';
import { createWebGL2Renderer3D, loadGltfFromUrl3D } from '@egret/engine/webgl2/world3d';
import { cloneNativeSceneActor } from './native-scene-actor.mjs';

const actorsDirectory = '/jyx2/inn3d-actors/';
const headings = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
const aliases = { waiter: 'staff', innkeeper: 'staff', patron: 'guest' };
const patronTints = [0xcda284, 0xa3bbbc, 0xcab6bd, 0xa6ad8b];
const unitScale = [1, 1, 1];
const upGround = [0, -1, 0];
const groundName = /unity.?terrain|unity.?(?:inn|home).?(?:foundation|floor|ground)/i;
const linear = values => values.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
const matrix = () => new Float32Array(16);
const vector = () => new Float32Array(3);

const innWindVertex = `vec3 customVertex(vec3 world, vec3 local, vec3 normal, vec2 uv, vec4 color) {
  vec4 plant = uCustom[0]; // time, bend, flutter, height in world units
  vec4 blade = uCustom[1]; // authored up axis and root height
  float height = clamp((dot(local, blade.xyz) - blade.w) * uCustom[2].x, 0.0, 1.0);
  float bend = smoothstep(0.08, 1.0, height);
  float phase = dot(world.xz, vec2(0.24, 0.16));
  float sway = 0.40 * sin(plant.x * 0.73 + phase * 2.3)
             + 0.46 * sin(plant.x * 1.13 - phase)
             + 0.14 * sin(plant.x * 1.92 + phase * 0.57);
  float side = 0.38 * sin(plant.x * 1.35 + phase * 1.37);
  float flutter = sin(plant.x * 3.8 + dot(world, vec3(2.1, 3.4, -2.8)));
  vec2 along = vec2(0.82, 0.572);
  vec2 across = vec2(-along.y, along.x);
  vec2 offset = (along * sway + across * side) * bend * plant.y
              + across * flutter * bend * bend * plant.z;
  return world + vec3(offset.x, 0.0, offset.y) * plant.w * uCustom[2].y;
}`;

function prepareWind(root) {
  const probe = createCustomShader3D({ key: 'inn-wind-support', glslVertex: innWindVertex,
    glsl: 'vec4 customFragment(vec4 color, vec3 p, vec3 n, vec2 uv) { return color; }' });
  if (!probe.glslVertex) return;
  const variants = new Map();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let meshes = 0, instances = 0;
  root.updateWorldMatrices();
  root.traverse(mesh => {
    if (!(mesh instanceof Mesh3D) || Array.isArray(mesh.material)) return;
    const names = [mesh.material.name, mesh.name, mesh.parent?.name, mesh.parent?.parent?.name];
    const tree = names.map(name => /^Tree_(\d\d)(?:[ _]|$)/i.exec(name ?? '')).find(Boolean);
    const grass = names.map(name => /^Grass_(0[123])(?:[ _]|$)/i.exec(name ?? '')).find(Boolean);
    const flowers = names.some(name => /^Flowers?(?:_[\dt]|\b)/i.test(name ?? ''));
    if (!tree && !grass && !flowers) return;
    const [bend, flutter, maxHeight] = tree
      ? tree[1] === '10' ? [.038, .009, 8] : tree[1] === '09' ? [.050, .014, 7] : [.044, .011, 7.5]
      : flowers ? [.113, .026, 1.45] : grass[1] === '03' ? [.141, .036, 1.65] : [.134, .031, 1.7];
    const transform = mesh instanceof InstancedMesh3D && mesh.count
      ? mat4Multiply(matrix(), mesh.matrixWorld, mesh.instanceMatrices.subarray(0, 16)) : mesh.matrixWorld;
    const axes = [0, 4, 8];
    const lengths = axes.map(i => Math.hypot(transform[i], transform[i + 1], transform[i + 2]));
    const vertical = axes.map((i, axis) => transform[i + 1] / lengths[axis]);
    const axis = tree ? 2 : vertical.reduce((best, value, i) =>
      Math.abs(value) > Math.abs(vertical[best]) ? i : best, 0);
    const sign = tree ? 1 : Math.sign(vertical[axis]);
    const bounds = mesh.geometry.boundingBox;
    const height = bounds[axis + 3] - bounds[axis];
    if (!(height > 0) || !sign || !lengths[axis]) return;
    const up = [0, 0, 0];
    up[axis] = sign;
    const base = sign > 0 ? bounds[axis] : -bounds[axis + 3];
    const worldHeight = Math.min(Math.round(height * lengths[axis] * 32) / 32, maxHeight);
    const key = [bend, flutter, worldHeight, ...up, base, height].join(',');
    const original = mesh.material;
    if (!variants.has(original)) variants.set(original, new Map());
    const group = variants.get(original);
    if (!group.has(key)) {
      const material = original.clone();
      material.shader = createCustomShader3D({ key: 'kys-inn-wind', glslVertex: innWindVertex,
        uniforms: [0, bend, flutter, worldHeight, ...up, base, 1 / height, 1] });
      material.touch();
      group.set(key, material);
    }
    mesh.material = group.get(key);
    meshes++;
    instances += mesh instanceof InstancedMesh3D ? mesh.count : 1;
  });
  const materials = [...variants.values()].flatMap(group => [...group.values()]);
  return {
    meshes, instances, get enabled() { return meshes > 0 && !preference.matches; },
    update(elapsedMs) {
      const enabled = Number(this.enabled);
      for (const { shader } of materials) {
        shader.uniforms[0] = elapsedMs / 1000;
        shader.uniforms[9] = enabled;
      }
    },
    dispose() { for (const material of materials) material.dispose(); },
  };
}

function configurePost(renderer, settings = {}) {
  const post = renderer.postProcess;
  if (!post || !('ssao' in post)) return;
  const intensity = settings.intensity ?? (settings.globalVolumeActive === false ? 0 : 1.2);
  Object.assign(post, { enabled: true, ssao: true, ssaoRadius: .55, ssaoBias: .025,
    ssaoIntensity: settings.occlusionStrength ?? .47, fxaa: true,
    bloom: intensity > 0, bloomThreshold: settings.threshold ?? .72, bloomKnee: settings.softKnee ?? .584,
    bloomIntensity: 2 ** (intensity / 10) - 1, bloomLevels: 4 });
}

function sceneMatrix(layout) {
  return Float32Array.from({ length: 16 }, (_, i) => layout[(i % 4) * 4 + Math.floor(i / 4)]);
}

function orientCamera(camera, spec, transform) {
  const reference = spec.camera.steamReference;
  const rotation = reference?.rotation ?? spec.camera.sourceRotation;
  const unity = mat4Compose(matrix(), [0, 0, 0], rotation, unitScale);
  const direction = vec3TransformDirection(vector(), unity.subarray(8, 11), transform);
  const up = vec3TransformDirection(vector(), unity.subarray(4, 7), transform);
  camera.lookAt(...direction, up);

  // Convert the measured Unity camera's rays through the anisotropic scene-to-grid basis.
  const basis = transform.slice();
  basis[12] = basis[13] = basis[14] = 0;
  mat4Multiply(basis, basis, unity);
  for (let i = 8; i <= 11; i++) basis[i] *= -1;
  const inverse = matrix();
  if (!mat4Invert(inverse, basis)) throw Error('Invalid inn camera transform.');
  return mat4Multiply(matrix(), inverse, mat4Compose(matrix(), [0, 0, 0], camera.quaternion, unitScale));
}

function extendTerrain(terrain) {
  const position = terrain.geometry.getAttribute('position');
  const uv = terrain.geometry.getAttribute('uv');
  if (!position || !uv || !terrain.parent) return;
  const [minX, , minZ, maxX, , maxZ] = terrain.geometry.boundingBox;
  const points = Array.from({ length: position.count }, (_, i) => [
    ...position.data.subarray(i * 3, i * 3 + 3), ...uv.data.subarray(i * 2, i * 2 + 2),
  ]);
  const positions = [], uvs = [];
  const distance = 28;
  const near = (a, b) => Math.abs(a - b) < .0001;
  const shifted = ([x, y, z, u, v], dx, dz) => [x + dx, y, z + dz, u, v];
  function quad(a, b, c, d) {
    const facesUp = (b[2] - a[2]) * (c[0] - a[0]) > (b[0] - a[0]) * (c[2] - a[2]);
    for (const [x, y, z, u, v] of facesUp ? [a, b, c, a, c, d] : [a, c, b, a, d, c]) {
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }
  for (const [axis, boundary, dx, dz] of [
    [0, minX, -distance, 0], [0, maxX, distance, 0], [2, minZ, 0, -distance], [2, maxZ, 0, distance],
  ]) {
    const other = 2 - axis;
    const edge = points.filter(point => near(point[axis], boundary)).sort((a, b) => a[other] - b[other]);
    for (let i = 1; i < edge.length; i++) {
      const a = edge[i - 1], b = edge[i];
      quad(a, b, shifted(b, dx, dz), shifted(a, dx, dz));
    }
  }
  for (const [x, dx] of [[minX, -distance], [maxX, distance]]) {
    for (const [z, dz] of [[minZ, -distance], [maxZ, distance]]) {
      const a = points.find(point => near(point[0], x) && near(point[2], z));
      if (a) quad(a, shifted(a, dx, 0), shifted(a, dx, dz), shifted(a, 0, dz));
    }
  }
  if (!positions.length) return;
  const extension = new Mesh3D(createGeometry3D({ positions, uvs }), terrain.material);
  extension.name = 'Inn terrain edge';
  extension.castShadow = false;
  extension.position.set(terrain.position);
  extension.quaternion.set(terrain.quaternion);
  extension.scale.set(terrain.scale);
  return terrain.parent.addChild(extension);
}

export function createNativeInnView(viewport, overlay, options) {
  return createNativeSceneView(viewport, overlay, options, {
    sceneId: 61, classKey: 'inn3d', assetDirectory: '/jyx2/inn3d/', manifest: 'scene.json',
    modelIds: ['0', '53', 'staff', 'guest'], terrainEdge: true, requireInstancing: true,
  });
}

export async function createNativeSceneView(viewport, overlay, { width = 640, height = 360 } = {}, {
  sceneId, classKey, assetDirectory, manifest, actorDirectory = actorsDirectory, modelIds,
  terrainEdge, requireInstancing, actorTints, prepareProps, createExitEffect, resolveActor,
}) {
  const response = await fetch(assetDirectory + manifest);
  if (!response.ok) throw Error(`Could not load 3D scene ${sceneId}.`);
  const spec = await response.json();
  if (spec.scene !== sceneId || !/^[a-z0-9_.-]+\.glb$/i.test(spec.asset) || !spec.camera?.offset) {
    throw Error(`Invalid 3D scene manifest for ${sceneId}.`);
  }

  const loaded = await Promise.allSettled([
    loadGltfFromUrl3D(assetDirectory + spec.asset),
    ...modelIds.map(id => loadGltfFromUrl3D(actorDirectory + id + '.glb')),
  ]);
  const assets = loaded.filter(row => row.status === 'fulfilled').map(row => row.value);
  const failure = loaded.find(row => row.status === 'rejected');
  if (failure) {
    for (const asset of assets) asset.dispose();
    throw failure.reason;
  }
  const [environment, ...models] = assets;
  const templates = new Map(modelIds.map((id, i) => [id, models[i]]));
  const canvas = document.createElement('canvas');
  canvas.className = `scene3d-canvas ${classKey}-canvas native-world3d-canvas`;
  canvas.dataset.engine = 'egret-world3d';
  canvas.dataset.asset = spec.asset;
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new Scene3D();
  scene.background = linear([.55, .61, .62]);
  scene.addChild(environment.scene);
  const { ambientScale = .7, keyScale = 1.05, fillScale = .48 } = spec.lightBalance ?? {};
  // World3D's direct and ambient diffuse lighting is already normalized.
  const ambient = spec.ambient ?? {};
  scene.addChild(createAmbientLight3D({ color: linear(ambient.sky ?? ambient.color ?? [.212, .227, .259]),
    intensity: (ambient.intensity ?? 1) * ambientScale }));
  for (const settings of spec.lights ?? []) {
    const castShadow = settings.castShadow ?? (typeof settings.shadows === 'boolean' ? settings.shadows : Boolean(settings.shadows?.type));
    const light = scene.addChild(createDirectionalLight3D({ color: linear(settings.color),
      intensity: settings.intensity * (castShadow ? keyScale : fillScale), castShadow }));
    const focus = spec.lightFocus ?? [29, spec.groundY ?? 0, 32];
    const direction = settings.direction ?? settings.towards;
    light.setPosition(...focus.map((value, i) => value + direction[i] * 44)).lookAt(...focus);
    if (light.castShadow) Object.assign(light.shadow, { extent: 36, near: .5, far: 105, bias: .0008, normalBias: .019, radius: 2.3 });
  }

  const reference = spec.camera.steamReference;
  const transform = sceneMatrix(spec.layout);
  const camera = createPerspectiveCamera3D({ fov: reference?.fov ?? spec.camera.verticalFov, aspect: width / height,
    near: spec.camera.near ?? .1, far: Math.min(spec.camera.far ?? 120, 140) });
  canvas.dataset.fov = String(camera.fov);
  const correction = orientCamera(camera, spec, transform);
  const customProjection = 'customProjection' in camera ? matrix() : undefined;
  const surfaces = [];
  let instancedMeshes = 0, instances = 0, environmentMeshes = 0, terrain;
  environment.scene.traverse(node => {
    if (!(node instanceof Mesh3D)) return;
    environmentMeshes++;
    if (node instanceof InstancedMesh3D) { instancedMeshes++; instances += node.count; }
    if (groundName.test(node.name) || groundName.test(node.parent?.name ?? '')) surfaces.push(node);
    if (!terrain && /terrain/i.test(node.name + node.parent?.name)) terrain = node;
  });
  // The outdoor heightfield receives building and actor shadows without shadowing itself.
  if (terrain) terrain.castShadow = false;
  const terrainExtension = terrainEdge && terrain ? extendTerrain(terrain) : undefined;
  for (const texture of environment.textures) texture.anisotropy = 8;
  canvas.dataset.environmentMeshes = String(environmentMeshes);
  canvas.dataset.instancedMeshes = String(instancedMeshes);
  canvas.dataset.instances = String(instances);
  canvas.dataset.assetRevision = spec.revision;
  canvas.dataset.terrainExtension = String(Boolean(terrainExtension));

  const ray = new Raycaster3D();
  const heights = new Map();
  const actors = new Map();
  const tints = new Map();
  const exitAnchor = spec.anchors?.exit?.position;
  let renderer, wind, interactiveProps, exitEffect, previousSize, previousAspect;
  let drawn = false, visible = true, disposed = false, lost = false;
  let lastDraw;

  function nearestGround() {
    let nearest;
    for (const surface of surfaces) {
      const hit = ray.intersect(surface, { firstHitOnly: true })[0];
      if (hit && (!nearest || hit.distance < nearest.distance)) nearest = hit;
    }
    return nearest;
  }

  function tileHeight(x, y) {
    const key = x + ':' + y;
    if (!heights.has(key)) {
      ray.set([x, 30, y], upGround);
      heights.set(key, nearestGround()?.point[1] ?? spec.groundY ?? 0);
    }
    return heights.get(key);
  }

  function groundHeight(x, y) {
    const i = Math.floor(x), j = Math.floor(y), dx = x - i, dy = y - j;
    const a = tileHeight(i, j);
    if (!dx && !dy) return a;
    return ((1 - dx) * a + dx * tileHeight(i + 1, j)) * (1 - dy)
      + ((1 - dx) * tileHeight(i, j + 1) + dx * tileHeight(i + 1, j + 1)) * dy;
  }

  function updateActor(person, delta) {
    const appearance = resolveActor?.(person, spec, groundHeight) ?? {};
    const role = appearance.role ?? person.role;
    let record = actors.get(person.key);
    if (record && record.role !== role) {
      scene.removeChild(record.root);
      actors.delete(person.key);
      record = undefined;
    }
    if (!record) {
      const model = templates.get(aliases[role] ?? String(role));
      if (!model) return;
      const root = scene.addChild(new Object3D());
      const tint = actorTints && (role === 'innkeeper' ? 0xb1a484
        : role === 'patron' ? patronTints[(person.variant ?? 0) % patronTints.length] : undefined);
      const { cloned, mixer, actions, bones, skins } = cloneNativeSceneActor(model, tint || undefined, tints);
      root.addChild(cloned);
      record = { root, mixer, actions, bones, skins, role };
      actors.set(person.key, record);
    }
    const { root, mixer, actions } = record;
    root.visible = true;
    record.person = person;
    const [dx, dz] = person.visualOffset ?? [0, 0];
    const anchor = person.anchor && spec.anchors?.[person.anchor]?.position;
    root.setPosition(...(appearance.position ?? anchor ?? [person.x + dx, groundHeight(person.x, person.y), person.y + dz]));
    root.setRotation(0, appearance.yaw ?? person.yaw ?? headings[person.direction] ?? 0, 0);
    const scale = appearance.scale ?? 1;
    if (typeof scale === 'number') root.setScale(scale, scale, scale);
    else root.setScale(...scale);
    const desired = appearance.action ?? (person.moving ? 'walk' : person.pose === 'sit' ? 'sit' : 'idle');
    const clip = actions.has(desired) ? desired : actions.has('idle') ? 'idle' : 'static';
    if (record.clip !== clip) {
      record.action?.stop();
      record.action = actions.get(clip)?.reset().play();
      record.clip = clip;
    }
    if (record.action && Number.isFinite(appearance.progress)) {
      record.action.paused = true;
      record.action.time = Math.max(0, Math.min(1, appearance.progress)) * record.action.clip.duration;
      mixer.update(0);
    } else {
      if (record.action?.paused) record.action.paused = false;
      mixer.update(delta);
    }
  }

  function resize() {
    const w = viewport.clientWidth >= 760 ? 1920 : 1280;
    const h = Math.round(w * (overlay.clientHeight && overlay.clientWidth ? overlay.clientHeight / overlay.clientWidth : height / width));
    const size = w + 'x' + h;
    if (previousSize === size) return;
    previousSize = size;
    renderer.setSize(w, h);
    const aspect = w / h;
    if (aspect !== previousAspect) {
      previousAspect = camera.aspect = aspect;
      if (customProjection) camera.customProjection = undefined;
      camera.updateProjectionMatrix();
      if (customProjection) {
        mat4Multiply(customProjection, camera.projectionMatrix, correction);
        camera.customProjection = customProjection;
        camera.updateProjectionMatrix();
      } else {
        mat4Multiply(camera.projectionMatrix, camera.projectionMatrix, correction);
      }
    }
    canvas.dataset.customProjection = String(Boolean(customProjection));
    canvas.dataset.projectionMatrix = Array.from(camera.projectionMatrix).join(',');
  }

  let offset = spec.camera.offset;
  const lookHeight = spec.camera.lookHeight ?? 0;
  if (reference) {
    const [x, y] = reference.referenceTile;
    const position = vec3TransformMat4(vector(), reference.position, transform);
    offset = [position[0] - x, position[1] - groundHeight(x, y) - lookHeight, position[2] - y];
  }
  const follow = reference?.follow;
  const dialoguePosition = follow && vec3TransformMat4(vector(), follow.position, transform);
  const dialogueForward = follow && vec3TransformDirection(vector(),
    mat4Compose(matrix(), [0, 0, 0], follow.rotation, unitScale).subarray(8, 11), transform);
  const dialogueYaw = dialogueForward && Math.atan2(dialogueForward[0], dialogueForward[2]);

  function update({ x, y, direction, moving, hidden, people = [], props, elapsedMs, opacity = 1, cameraFocus, stageEvent, heroAnimation }) {
    if (!visible || lost || disposed) return;
    resize();
    canvas.style.opacity = opacity;
    const delta = lastDraw === undefined ? 0 : Math.min(.1, Math.max(0, (elapsedMs - lastDraw) / 1000));
    lastDraw = elapsedMs;
    const openedSlots = interactiveProps?.update(props ?? []);
    canvas.dataset.openedProps = Array.isArray(openedSlots) ? openedSlots.join(',') : '';
    for (const record of actors.values()) record.root.visible = false;
    if (!hidden) {
      const hero = { key: 'hero', role: 0, x, y, direction, moving, animation: heroAnimation };
      const referenceTile = reference?.referenceTile;
      if (dialoguePosition && stageEvent === (reference.eventId ?? 476) && x === referenceTile[0] && y === referenceTile[1]) {
        Object.assign(hero, { x: dialoguePosition[0], y: dialoguePosition[2], yaw: dialogueYaw, moving: false });
      }
      updateActor(hero, delta);
    }
    for (const person of people) updateActor(person, delta);
    const fx = cameraFocus?.x ?? x, fy = cameraFocus?.y ?? y;
    camera.setPosition(fx + offset[0], groundHeight(fx, fy) + lookHeight + offset[1], fy + offset[2]);
    exitEffect?.update(elapsedMs, camera);
    wind?.update(elapsedMs);
    renderer.render(scene, camera);
    drawn = true;
    const active = [...actors.entries()].filter(([, record]) => record.root.visible);
    canvas.dataset.actors = active.map(([key]) => key).join(',');
    canvas.dataset.actorClips = active.map(([key, record]) => key + ':' + record.clip).join(',');
    canvas.dataset.openingPose = active.filter(([, record]) => record.person.animation)
      .map(([, record]) => `${record.person.animation.target}:${record.person.animation.picture}`).join(',');
    canvas.dataset.openingClips = active.filter(([, record]) => record.person.animation && record.action)
      .map(([, record]) => `${record.clip}:${record.action.time.toFixed(3)}`).join(',');
    canvas.dataset.skinnedModels = String(active.reduce((sum, [, actor]) => sum + actor.skins, 0));
    canvas.dataset.bones = String(active.reduce((sum, [, actor]) => sum + actor.bones, 0));
    canvas.dataset.nativeFrame = String(renderer.info.frame);
    canvas.dataset.drawCalls = String(renderer.info.drawCalls);
    canvas.dataset.triangles = String(renderer.info.triangles);
    canvas.dataset.shadowMaps = String(renderer.info.shadowMaps);
    canvas.dataset.wind = String(Boolean(wind?.enabled));
    canvas.dataset.ssao = String(Boolean(renderer.postProcess?.enabled && renderer.postProcess.ssao));
    canvas.dataset.cameraPose = [...camera.position, ...camera.quaternion].join(',');
    canvas.dataset.viewProjection = Array.from(camera.viewProjectionMatrix).join(',');
    canvas.dataset.sceneReady = 'true';
  }

  function pick(u, v) {
    if (!drawn || !visible) return;
    const nx = u * 2 - 1, ny = 1 - v * 2;
    const foot = vector(), center = vector();
    for (const { person, root, clip } of actors.values()) {
      if (!root.visible || !person.interactive) continue;
      camera.worldToScreenPoint(foot, root.position);
      camera.worldToScreenPoint(center, [root.position[0], root.position[1] + (clip === 'sit' ? .67 : .82), root.position[2]]);
      const radius = Math.max(.025, Math.abs(foot[1] - center[1]));
      if (Math.abs(nx - center[0]) < radius * .58 && Math.abs(ny - center[1]) < radius * .88) {
        return { x: person.x, y: person.y };
      }
    }
    ray.setFromCamera(nx, ny, camera);
    const prop = interactiveProps?.pick({ ray });
    if (prop) return prop;
    const surface = nearestGround();
    const t = ((spec.groundY ?? 0) - ray.origin[1]) / ray.direction[1];
    const hit = surface?.point ?? (Number.isFinite(t) && t >= 0
      ? [ray.origin[0] + t * ray.direction[0], spec.groundY ?? 0, ray.origin[2] + t * ray.direction[2]] : undefined);
    if (!hit) return;
    if (exitEffect?.containsGroundPoint(hit[0], hit[2])
      || (exitAnchor && Math.hypot(hit[0] - exitAnchor[0], hit[2] - exitAnchor[2]) < .85)) return { exit: true };
    return { x: Math.round(hit[0]), y: Math.round(hit[2]) };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer?.dispose();
    wind?.dispose();
    interactiveProps?.dispose?.();
    exitEffect?.dispose();
    for (const variants of tints.values()) for (const material of variants.values()) material.dispose();
    terrainExtension?.geometry.dispose();
    for (const asset of assets) asset.dispose();
    canvas.remove();
    viewport.classList.remove('scene3d-active', `${classKey}-active`);
  }

  try {
    if (requireInstancing && !instances) throw Error(`Scene ${sceneId} glTF must include native GPU instances.`);
    renderer = createWebGL2Renderer3D({ canvas, shadowAtlasSize: 4096, toneMapping: 'none',
      onContextLost() { lost = true; }, onContextRestored() { lost = false; } });
    interactiveProps = prepareProps?.(environment, spec);
    canvas.dataset.interactiveProps = String(interactiveProps?.slots.length ?? 0);
    if (createExitEffect) {
      try {
        exitEffect = await createExitEffect({ spec, transform });
        if (exitEffect) scene.addChild(exitEffect.node);
      } catch (error) {
        console.warn(`Scene ${sceneId} exit effect could not load`, error);
      }
    }
    const exitGroundCenter = exitEffect?.groundCenter ?? (exitAnchor && [exitAnchor[0], exitAnchor[2]]);
    if (exitGroundCenter) canvas.dataset.exitGroundCenter = exitGroundCenter.join(',');
    canvas.dataset.exitEffect = String(Boolean(exitEffect));
    wind = prepareWind(environment.scene);
    configurePost(renderer, spec.postEffects);
    canvas.dataset.vegetationMeshes = String(wind?.meshes ?? 0);
    canvas.dataset.vegetationInstances = String(wind?.instances ?? 0);
    canvas.dataset.bloom = String(Boolean(renderer.postProcess?.enabled && renderer.postProcess.bloom));
    canvas.dataset.fxaa = String(Boolean(renderer.postProcess?.enabled && renderer.postProcess.fxaa));
    viewport.insertBefore(canvas, overlay);
    viewport.classList.add('scene3d-active', `${classKey}-active`);
    resize();
  } catch (error) {
    dispose();
    throw error;
  }
  return { update, pick, propSlots: interactiveProps?.slots ?? [], dispose, setVisible(value) { visible = value; canvas.hidden = !value; } };
}
