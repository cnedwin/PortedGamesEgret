import {
  Mesh3D, Object3D, Shape3D, createCylinderGeometry3D, createGeometry3D,
  createShapeGeometry3D, createStandardMaterial3D, createUnlitMaterial3D,
  quatFromAxisAngle, quatFromEuler, quatMultiply, vec3TransformMat4,
} from '@egret/engine/world3d';
import { createWorldCanvasTexture } from './native-world-canvas-texture.mjs';

export const worldHeadings = [Math.PI, Math.PI / 2, -Math.PI / 2, 0];
const vertical = [0, 1, 0];

function createWakeTexture() {
  const surface = document.createElement('canvas');
  surface.width = 128;
  surface.height = 256;
  const ctx = surface.getContext('2d');
  const foam = ctx.createLinearGradient(0, 256, 0, 0);
  foam.addColorStop(0, '#efffed00');
  foam.addColorStop(.28, '#e9fff4c9');
  foam.addColorStop(.65, '#d0efe37d');
  foam.addColorStop(1, '#d0efe300');
  ctx.strokeStyle = foam;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    ctx.lineWidth = 3 - i * .7;
    ctx.beginPath();
    ctx.moveTo(64 + side * (14 + i * 7), 224 + i * 7);
    ctx.bezierCurveTo(64 + side * (18 + i * 6), 149, 64 + side * (30 + i * 7), 100, 64 + side * (43 + i * 6), 5 + i * 17);
    ctx.stroke();
  }
  return createWorldCanvasTexture(surface);
}

export function createNativeWorldShip(hull) {
  const ship = new Object3D();
  ship.name = 'player-sailing-ship';
  ship.addChild(hull);
  const wood = createStandardMaterial3D({ color: 0x6a4b34, roughness: .94, metallic: 0 });
  const canvas = createStandardMaterial3D({ color: 0xc3a56c, roughness: 1, metallic: 0, side: 'double' });
  const rope = createStandardMaterial3D({ color: 0x9e7d50, roughness: 1, metallic: 0 });
  const geometries = [];

  function beam(parent, start, end, radius, material) {
    const axis = end.map((value, i) => value - start[i]);
    const length = Math.hypot(...axis);
    const [x, y, z] = axis.map(value => value / length);
    const q = [z, 0, -x, 1 + y];
    const magnitude = Math.hypot(...q);
    const geometry = createCylinderGeometry3D({ radiusTop: radius, radiusBottom: radius * 1.06,
      height: length, radialSegments: 7 });
    geometries.push(geometry);
    const mesh = new Mesh3D(geometry, material);
    mesh.setPosition(...start.map((value, i) => value + axis[i] * .5)).setQuaternion(...q.map(value => value / magnitude));
    parent.addChild(mesh);
  }

  const rig = ship.addChild(new Object3D().setPosition(0, 0, .42));
  beam(rig, [0, .26, 0], [.045, 2.45, 0], .038, wood);
  const profile = new Shape3D();
  profile.moveTo(-.89, .84).quadraticCurveTo(-.96, 1.46, -.62, 2.27).lineTo(.47, 2.33)
    .quadraticCurveTo(.77, 1.65, .70, .90).quadraticCurveTo(-.14, .76, -.89, .84);
  const cloth = createShapeGeometry3D(profile);
  const position = cloth.getAttribute('position');
  const camber = (z, y) => .025 + Math.cos(z * 1.52) * (.06 + .12 * Math.sin((y - .72) * 1.8));
  for (let i = 0; i < position.data.length; i += 3) {
    const z = position.data[i], y = position.data[i + 1];
    position.data[i] = camber(z, y);
    position.data[i + 2] = z;
  }
  position.touch();
  cloth.invalidateBounds();
  cloth.computeNormals();
  geometries.push(cloth);
  rig.addChild(new Mesh3D(cloth, canvas));
  for (let row = 0; row < 6; row++) {
    const y = .86 + row * .284;
    const rear = -.89 + Math.max(0, row - 2) * .074, front = .70 - Math.max(0, row - 2) * .065;
    const bend = camber(0, y) + .013;
    beam(rig, [camber(rear, y) + .013, y, rear], [bend, y - .008, 0], .018, wood);
    beam(rig, [bend, y - .008, 0], [camber(front, y) + .013, y + .034, front], .018, wood);
  }
  beam(ship, [.03, 2.33, .42], [.15, .37, 1.43], .010, rope);
  beam(ship, [.03, 2.33, .42], [-.14, .37, -1.40], .010, rope);

  const texture = createWakeTexture();
  const foam = createUnlitMaterial3D({ map: texture, alphaMode: 'blend', depthWrite: false, side: 'double' });
  const wakeShape = createGeometry3D({
    positions: [-1.7, 0, .39, 1.7, 0, .39, 1.7, 0, -4.71, -1.7, 0, -4.71],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1], indices: [0, 1, 2, 0, 2, 3],
  });
  const wake = new Mesh3D(wakeShape, foam);
  wake.castShadow = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const rider = new Float32Array(3), yawRotation = new Float32Array(4), tilt = new Float32Array(4);
  let time, power = 0;
  ship.visible = wake.visible = false;

  return { ship, wake,
    update({ x, y, yWorld, direction, sailing, moving, elapsedMs }) {
      const delta = Math.max(0, Math.min(90, elapsedMs - (time ?? elapsedMs)));
      time = elapsedMs;
      ship.visible = sailing;
      if (!sailing) { power = 0; wake.visible = false; return; }
      const animate = !reducedMotion.matches;
      const phase = animate ? elapsedMs / 530 : 0;
      const bob = animate ? Math.sin(phase) * .055 : 0;
      const yaw = worldHeadings[direction] ?? 0;
      quatFromAxisAngle(yawRotation, vertical, yaw);
      quatFromEuler(tilt, animate ? Math.sin(phase * .72) * .024 : 0, 0, animate ? Math.cos(phase * .91) * .044 : 0);
      quatMultiply(yawRotation, yawRotation, tilt);
      ship.setPosition(x, yWorld + bob, y).setQuaternion(...yawRotation);
      rig.setRotation(0, animate ? .12 + Math.sin(phase * .51) * .079 : .12, 0);
      power += ((moving ? 1 : 0) - power) * Math.min(1, delta / 165);
      wake.visible = power > .03;
      wake.setPosition(x, yWorld + .022, y).setRotation(0, yaw, 0).setScale(1, 1, .78 + power * .32);
      foam.opacity = power * (animate ? .77 + Math.sin(phase * 1.5) * .10 : .78);
      // Refresh the hull and sail together before reading the rider anchor.
      ship.updateWorldMatrices();
      return vec3TransformMat4(rider, [0, .32, -.92], ship.matrixWorld);
    },
    dispose() {
      for (const resource of [...geometries, wood, canvas, rope, wakeShape, foam, texture]) resource.dispose();
    },
  };
}
