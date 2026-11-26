import { copyImageData2DPixels } from '@egret/engine';
import {
  Mesh3D, Object3D, Texture3D, createCustomShader3D, createGeometry3D, createUnlitMaterial3D,
  quatFromAxisAngle, quatMultiply, vec3TransformQuat,
} from '@egret/engine/world3d';

const viewRight = [1, 0, 0], viewToward = [0, 0, 1];
const clipAlpha = (key, cutoff) => createCustomShader3D({ key, glsl: `
  vec4 customFragment(vec4 color, vec3 position, vec3 normal, vec2 uv) {
    if (color.a < ${cutoff}) discard;
    return color;
  }`,
});
const fadingRole = clipAlpha('kys-battle-role-alpha', '.22');
const fadingEffect = clipAlpha('kys-battle-effect-alpha', '.035');
const naturalColor = [1, 1, 1];
const outdoorColor = [.96, .91, .84];
const indoorColor = [.89, .85, .79];
const spriteAlphaCutoff = .22;

export function createBattleSpriteMaterial(map, alphaMode = 'blend') {
  return createUnlitMaterial3D({ map, side: 'double', toneMapped: false, alphaMode,
    alphaCutoff: spriteAlphaCutoff, fog: false });
}

export function createNativeBattleSprites(art, units, outdoor) {
  const group = new Object3D();
  const pages = new Map(), pieces = new Map(), slots = new Map();
  const right = new Float32Array(3), toward = new Float32Array(3);
  const beforeRoll = new Float32Array(3), afterRoll = new Float32Array(3);
  const roll = new Float32Array(4), rotation = new Float32Array(4);

  function piece(id) {
    if (pieces.has(id)) return pieces.get(id);
    const source = art.get(id);
    if (!source) return;
    const { dx, dy, image, region, scale = 1 } = source;
    if (!pages.has(image)) {
      const pixels = copyImageData2DPixels(image);
      const data = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      pages.set(image, new Texture3D({ width: image.width, height: image.height, data },
        { colorSpace: 'srgb', wrapS: 'clamp', wrapT: 'clamp', flipY: false, mipmaps: false }));
    }
    const { x, y, width, height } = region;
    const left = -dx / units, right = (width * scale - dx) / units;
    const top = dy / units, bottom = (dy - height * scale) / units;
    const u0 = (x + .5) / image.width, u1 = (x + width - .5) / image.width;
    const v0 = (y + .5) / image.height, v1 = (y + height - .5) / image.height;
    const geometry = createGeometry3D({
      positions: [left, bottom, 0, right, bottom, 0, right, top, 0, left, top, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      uvs: [u0, v1, u1, v1, u1, v0, u0, v0], indices: [0, 1, 2, 0, 2, 3],
    });
    const record = { geometry, map: pages.get(image), center: [(left + right) / 2, (top + bottom) / 2, 0] };
    pieces.set(id, record);
    return record;
  }

  function update(frames, facing, rolePoses) {
    const used = new Set();
    let actors = 0, effects = 0;
    vec3TransformQuat(right, viewRight, facing);
    vec3TransformQuat(toward, viewToward, facing);
    for (const frame of frames) {
      if (!(frame.alpha > 0)) continue;
      const picture = piece(frame.art);
      if (!picture) continue;
      const effect = Boolean(frame.effect);
      const legacyActor = !effect && frame.art.startsWith('battle:fight/');
      const scale = legacyActor ? .92 : 1;
      const pose = rolePoses?.get(frame.key);
      let slot = slots.get(frame.key);
      if (!slot) {
        const material = createBattleSpriteMaterial(picture.map);
        const mesh = group.addChild(new Mesh3D(picture.geometry, material));
        mesh.receiveShadow = false;
        slot = { mesh, material };
        slots.set(frame.key, slot);
      }
      const { mesh, material } = slot;
      const opacity = Math.min(1, frame.alpha);
      const mask = !effect && opacity >= 1;
      const alphaMode = mask ? 'mask' : 'blend';
      const blending = frame.additive ? 'additive' : 'normal';
      if (material.alphaMode !== alphaMode || material.blending !== blending || slot.effect !== effect) {
        Object.assign(material, { alphaMode, blending, alphaCutoff: spriteAlphaCutoff,
          shader: mask ? undefined : effect ? fadingEffect : fadingRole });
        material.touch();
      }
      slot.effect = effect;
      mesh.geometry = picture.geometry;
      // A billboard always faces the camera. Its shadow cannot face the light too.
      // The arena places the same soft ground contact under sprites and skinned meshes.
      mesh.castShadow = false;
      mesh.renderOrder = effect ? 1 : 0;
      material.map = picture.map;
      material.color.set(legacyActor ? outdoor ? outdoorColor : indoorColor : naturalColor);
      material.opacity = opacity;
      material.depthWrite = !effect && opacity > .52;
      const offset = effect ? .035 : .012;
      const shake = (frame.shakeX ?? 0) / units;
      let x = frame.x + (pose?.x ?? 0) + right[0] * shake + toward[0] * offset;
      let y = (frame.z ?? 0) / (units * Math.sqrt(.75)) + right[1] * shake + toward[1] * offset;
      let z = frame.y + (pose?.y ?? 0) + right[2] * shake + toward[2] * offset;
      const angle = (frame.rotation ?? 0) + (pose?.roll ?? 0);
      if (angle) {
        quatFromAxisAngle(roll, viewToward, -angle * Math.PI / 180);
        quatMultiply(rotation, facing, roll);
        vec3TransformQuat(beforeRoll, picture.center, facing);
        vec3TransformQuat(afterRoll, picture.center, rotation);
        x += (beforeRoll[0] - afterRoll[0]) * scale;
        y += (beforeRoll[1] - afterRoll[1]) * scale;
        z += (beforeRoll[2] - afterRoll[2]) * scale;
      } else rotation.set(facing);
      mesh.setPosition(x, y, z).setQuaternion(...rotation).setScale(scale);
      used.add(frame.key);
      if (effect) effects++; else actors++;
    }
    for (const [key, { mesh, material }] of slots) {
      if (used.has(key)) continue;
      mesh.removeFromParent();
      material.dispose();
      slots.delete(key);
    }
    return { actors, effects };
  }

  return { group, update, dispose() {
    group.removeFromParent();
    for (const { material } of slots.values()) material.dispose();
    for (const { geometry } of pieces.values()) geometry.dispose();
    for (const texture of pages.values()) texture.dispose();
    slots.clear();
    pieces.clear();
    pages.clear();
  } };
}
