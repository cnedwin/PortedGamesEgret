import {
  AnimationMixer3D, Object3D, Raycaster3D, Scene3D, colorFromHex, createDirectionalLight3D,
  createHemisphereLight3D, createPerspectiveCamera3D, createSprite3D, vec3TransformMat4,
} from '@egret/engine/world3d';
import { createWebGL2Renderer3D, loadGltfFromUrl3D } from '@egret/engine/webgl2/world3d';
import { createWorldTerrainData, worldMist } from './world-map-data.mjs';
import { createNativeWorldTerrain } from './native-world-terrain.mjs';
import { createNativeWorldScenery } from './native-world-scenery.mjs';
import { createNativeWorldShip, worldHeadings } from './native-world-ship.mjs';
import { createWorldCanvasTexture } from './native-world-canvas-texture.mjs';

const chunkSize = 24;
const shadowSpan = 44;
const normalize = value => { const length = Math.hypot(...value); return value.map(v => v / length); };
const cross = ([ax, ay, az], [bx, by, bz]) => [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
const sunDirection = normalize([-18, 25, -12]);
const shadowRight = normalize(cross([0, 1, 0], sunDirection));
const shadowUp = normalize(cross(sunDirection, shadowRight));
const mistColor = Array.from(colorFromHex(new Float32Array(3), worldMist.color));

function createMarker(name) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const font = '600 26px "Microsoft JhengHei", "Noto Serif CJK TC", serif';
  context.font = font;
  canvas.width = Math.ceil(context.measureText(name).width + 44);
  canvas.height = 51;
  context.font = font;
  context.fillStyle = '#192c24';
  context.strokeStyle = '#d9c697';
  context.lineWidth = 1.3;
  context.beginPath();
  context.roundRect(2, 2, canvas.width - 4, 39, 7);
  context.moveTo(canvas.width / 2 - 5, 41);
  context.lineTo(canvas.width / 2, 48);
  context.lineTo(canvas.width / 2 + 5, 41);
  context.closePath();
  context.fill();
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f2e7c4';
  context.fillText(name, canvas.width / 2, 23);
  const texture = createWorldCanvasTexture(canvas);
  const sprite = createSprite3D({ map: texture, depthTest: false, depthWrite: false, fog: false, alphaMode: 'blend' });
  sprite.setScale(canvas.width * .026, canvas.height * .026, 1);
  sprite.castShadow = false;
  sprite.renderOrder = 4;
  sprite.visible = false;
  return sprite;
}

export async function createNativeWorldView(viewport, overlay, { world, places, canEnter }) {
  const data = createWorldTerrainData(world);
  const loaded = await Promise.allSettled([
    createNativeWorldTerrain(data),
    loadGltfFromUrl3D(new URL('world-scenery-detail.glb', import.meta.url).href),
    loadGltfFromUrl3D('/jyx2/home3d-actors/0.glb'),
    loadGltfFromUrl3D(new URL('world-ship.glb', import.meta.url).href),
  ]);
  const [terrain, library, heroAsset, shipAsset] = loaded.map(result => result.value);
  const assets = [library, heroAsset, shipAsset].filter(Boolean);
  const failure = loaded.find(result => result.status === 'rejected');
  if (failure) {
    for (const asset of assets) asset.dispose();
    throw failure.reason;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'scene3d-canvas world3d-canvas native-world3d-canvas';
  canvas.dataset.engine = 'egret-world3d';
  canvas.dataset.camera = 'perspective';
  canvas.setAttribute('aria-hidden', 'true');
  const scene = new Scene3D();
  scene.background = mistColor;
  scene.fog = { kind: 'linear', color: mistColor, near: worldMist.near, far: worldMist.far };
  scene.addChild(createHemisphereLight3D({ color: 0xf2eee1, groundColor: 0x79786a, intensity: 1.85 / Math.PI }));
  const sun = scene.addChild(createDirectionalLight3D({ color: 0xffebcb, intensity: 2.85 / Math.PI, castShadow: true }));
  Object.assign(sun.shadow, { extent: shadowSpan / 2, near: .5, far: 90, bias: .0004, normalBias: .018, radius: 1.9 });

  const hero = scene.addChild(new Object3D());
  hero.addChild(heroAsset.scene);
  const mixer = new AnimationMixer3D(heroAsset.scene);
  const actions = new Map(heroAsset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  if (actions.has('walk')) actions.get('walk').timeScale = 1.36;
  let activeAction;
  const landmarks = places.flatMap(place => {
    const point = place.worldEntrances.find(([x, y]) => (x || y) && x >= 0 && x < data.width && y >= 0 && y < data.height);
    if (!point) return [];
    const [x, y] = point;
    const sprite = scene.addChild(createMarker(place.name));
    sprite.setPosition(x, data.heightAt(x, y) + ([1, 61, 70].includes(place.id) ? 4.35 : 3.45), y);
    return [{ place, x, y, sprite }];
  });
  const scenery = createNativeWorldScenery(world, data, library.scene);
  const vessel = createNativeWorldShip(shipAsset.scene);
  scene.addChild(vessel.ship);
  scene.addChild(vessel.wake);
  canvas.dataset.shipModel = 'jyx2-oldship';
  const camera = createPerspectiveCamera3D({ fov: 39, aspect: 16 / 9, near: .15, far: 110 });
  const ray = new Raycaster3D();
  const projected = new Float32Array(3), cameraSpace = new Float32Array(3);
  const chunks = new Map();
  const controls = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const overview = document.createElement('button');
  overview.type = 'button';
  overview.className = 'world-camera-toggle';
  overview.textContent = '拉遠鏡頭';
  overview.setAttribute('aria-pressed', 'false');
  let distant = false, range = 1;
  overview.addEventListener('click', () => {
    distant = !distant;
    overview.textContent = distant ? '拉近鏡頭' : '拉遠鏡頭';
    overview.setAttribute('aria-pressed', String(distant));
    overlay.focus({ preventScroll: true });
  }, { signal: controls.signal });
  let renderer, centerX, centerY, width, height, visible = true, lost = false, disposed = false;
  let lastDraw = -Infinity;

  function removeChunk({ land, props }) {
    scene.removeChild(land.mesh);
    scene.removeChild(props.root);
    land.dispose();
  }

  function trackChunks(x, y) {
    const column = Math.floor(x / chunkSize), row = Math.floor(y / chunkSize);
    if (column === centerX && row === centerY) return;
    centerX = column;
    centerY = row;
    for (const [key, entry] of chunks) {
      if (entry.i >= column - 2 && entry.i <= column + 1 && entry.j >= row - 2 && entry.j <= row + 1) continue;
      removeChunk(entry);
      chunks.delete(key);
    }
    for (let j = row - 2; j <= row + 1; j++) for (let i = column - 2; i <= column + 1; i++) {
      const key = `${i},${j}`;
      if (chunks.has(key)) continue;
      const left = i * chunkSize, top = j * chunkSize, right = left + chunkSize, bottom = top + chunkSize;
      const land = terrain.chunk(left, top, right, bottom);
      const props = scenery.chunk(left, top, right, bottom);
      chunks.set(key, { land, props, i, j });
      scene.addChild(land.mesh);
      scene.addChild(props.root);
    }
    const props = [...chunks.values()].map(entry => entry.props);
    canvas.dataset.chunks = String(chunks.size);
    canvas.dataset.instances = String(props.reduce((total, entry) => total + entry.instances, 0));
    canvas.dataset.vegetationInstances = String(props.reduce((total, entry) => total + entry.windInstances, 0));
    canvas.dataset.buildings = String(props.reduce((total, entry) => total + entry.buildings, 0));
  }

  function positionSun(x, y) {
    const center = [x - 1.7, 0, y - 1.7];
    const texel = shadowSpan / 2048;
    for (const axis of [shadowRight, shadowUp]) {
      const offset = center.reduce((sum, value, i) => sum + value * axis[i], 0);
      const shift = Math.round(offset / texel) * texel - offset;
      axis.forEach((value, i) => { center[i] += value * shift; });
    }
    sun.setPosition(...center.map((value, i) => value + sunDirection[i] * 43)).lookAt(...center);
  }

  function update({ x, y, direction, moving, elapsedMs, sailing, opacity = 1 }) {
    if (!visible || lost || disposed) return;
    canvas.style.opacity = opacity;
    const bounds = overlay.getBoundingClientRect();
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const nextWidth = Math.max(1, Math.round(bounds.width * ratio));
    const nextHeight = Math.max(1, Math.round(bounds.height * ratio));
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1.1 ? 44 : 39;
      camera.updateProjectionMatrix();
    } else if (elapsedMs - lastDraw < 30) return;
    const delta = Number.isFinite(lastDraw) ? Math.max(0, Math.min(.1, (elapsedMs - lastDraw) / 1000)) : 0;
    lastDraw = elapsedMs;
    trackChunks(x, y);
    positionSun(x, y);
    const heightAtHero = data.heightAt(x, y);
    const target = distant ? 1.42 : 1;
    range = reducedMotion.matches ? target : range + (target - range) * .19;
    camera.setPosition(x + 11.2 * range, heightAtHero + 13.7 * range, y + 16.3 * range)
      .lookAt(x - 1.1 * range, heightAtHero + .58, y - 1.35 * range);
    const deck = vessel.update({ x, y, yWorld: heightAtHero, direction, sailing: Boolean(sailing), moving, elapsedMs });
    hero.setPosition(...(deck ?? [x, heightAtHero + .025, y])).setScale(deck ? .98 : 1.61)
      .setRotation(0, worldHeadings[direction] ?? 0, 0);
    const clip = moving && !sailing ? 'walk' : 'idle';
    const action = actions.get(clip) ?? actions.get('idle');
    if (activeAction !== action) {
      activeAction?.stop();
      activeAction = action?.reset().play();
    }
    mixer.update(delta);
    for (const { x: lx, y: ly, place, sprite } of landmarks) {
      const distance = Math.hypot(lx - x, ly - y);
      sprite.visible = distance < 20 && canEnter(place);
      sprite.material.opacity = Math.min(1, (20 - distance) / 4);
    }
    const time = reducedMotion.matches ? 0 : elapsedMs / 1000;
    terrain.tick(time);
    scenery.tick(time);
    renderer.render(scene, camera);
    canvas.dataset.sceneReady = 'true';
    canvas.dataset.sailing = String(Boolean(sailing));
    canvas.dataset.wake = String(vessel.wake.visible);
    canvas.dataset.cameraRange = distant ? 'far' : 'near';
    canvas.dataset.cameraPose = [...camera.position, ...camera.quaternion].join(',');
    canvas.dataset.projectionMatrix = Array.from(camera.projectionMatrix).join(',');
    canvas.dataset.viewProjection = Array.from(camera.viewProjectionMatrix).join(',');
    canvas.dataset.nativeFrame = String(renderer.info.frame);
    canvas.dataset.drawCalls = String(renderer.info.drawCalls);
    canvas.dataset.triangles = String(renderer.info.triangles);
    canvas.dataset.shadowMaps = String(renderer.info.shadowMaps);
    canvas.dataset.wind = String(scenery.windEnabled);
    canvas.dataset.actors = 'hero';
    canvas.dataset.actorClips = 'hero:' + clip;
  }

  function pick(u, v) {
    if (!visible || disposed || !chunks.size) return;
    const nx = u * 2 - 1, ny = 1 - v * 2;
    const [horizontal, , , , , vertical] = camera.projectionMatrix;
    for (const { x, y, sprite } of landmarks) {
      if (!sprite.visible) continue;
      camera.worldToScreenPoint(projected, sprite.position);
      vec3TransformMat4(cameraSpace, sprite.position, camera.viewMatrix);
      const depth = -cameraSpace[2];
      if (depth <= camera.near || projected[2] > 1) continue;
      if (Math.abs(nx - projected[0]) < sprite.scale[0] * horizontal / (depth * 2)
        && Math.abs(ny - projected[1]) < sprite.scale[1] * vertical / (depth * 2)) return { x, y };
    }
    ray.setFromCamera(nx, ny, camera);
    let hit;
    for (const { land } of chunks.values()) {
      const candidate = ray.intersect(land.mesh, { firstHitOnly: true })[0];
      if (candidate && (!hit || candidate.distance < hit.distance)) hit = candidate;
    }
    if (hit) return { x: Math.round(hit.point[0]), y: Math.round(hit.point[2]) };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    controls.abort();
    canvas.remove();
    overview.remove();
    for (const entry of chunks.values()) removeChunk(entry);
    chunks.clear();
    for (const { sprite } of landmarks) { sprite.material.map.dispose(); sprite.material.dispose(); }
    scenery.dispose();
    vessel.dispose();
    for (const asset of assets) asset.dispose();
    renderer?.dispose();
  }

  try {
    renderer = createWebGL2Renderer3D({ canvas, shadowAtlasSize: 4096, toneMapping: 'none',
      onContextLost() { lost = true; }, onContextRestored() { lost = false; } });
    viewport.insertBefore(canvas, overlay);
    viewport.append(overview);
  } catch (error) {
    dispose();
    throw error;
  }
  return { update, pick, propSlots: [], dispose,
    setVisible(value) { visible = value; canvas.hidden = overview.hidden = !value; } };
}
