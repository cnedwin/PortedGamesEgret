import {
  Attribute3D, Geometry3D, Mesh3D, Object3D, Scene3D, createBoxGeometry3D, createConeGeometry3D,
  createCylinderGeometry3D, createDirectionalLight3D, createHemisphereLight3D, createOrthographicCamera3D,
  createRingGeometry3D, createSphereGeometry3D, createStandardMaterial3D, createUnlitMaterial3D,
  mat4Invert, setColor3D, vec3TransformMat4,
} from '@egret/engine/world3d';
import { createWebGL2Renderer3D } from '@egret/engine/webgl2/world3d';
import { arena, bridge, height, isPath, mentor, rocks, trees, width } from './trial-data.mjs';

const hash = (x, y) => (Math.imul(x + 193, 73_856_093) ^ Math.imul(y + 71, 19_349_663)) >>> 0;
const pi = Math.PI;
const facingAngles = [pi, pi / 2, -pi / 2, 0];
const wooded = [0x4f683b, 0x607542, 0x3f5b3c, 0x71844c, 0x5f6d37];
const grass = [0x788451, 0x7a8854, 0x808b55, 0x758150, 0x758652, 0x7e8852];
const path = [0xb0a272, 0xb2a574, 0xb7aa7b, 0xa99d70];
const inBridge = (x, y) => x >= bridge.x0 && x <= bridge.x1 && y >= bridge.y0 && y <= bridge.y1;

function terrain() {
  const positions = [], normals = [], colors = [], indices = [];
  const color = new Float32Array(3);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (x >= 11 && x <= 13) continue;
    const palette = isPath(x, y) ? path : grass;
    setColor3D(color, palette[hash(x, y) % palette.length]);
    if (x === 10 || x === 14) setColor3D(color, 0x9d996b);
    const index = positions.length / 3;
    positions.push(x - .5, 0, y - .5, x + .5, 0, y - .5, x + .5, 0, y + .5, x - .5, 0, y + .5);
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    for (let i = 0; i < 4; i++) colors.push(...color);
    indices.push(index, index + 2, index + 1, index, index + 3, index + 2);
  }
  const mesh = new Geometry3D();
  mesh.setAttribute('position', new Attribute3D(new Float32Array(positions), 3));
  mesh.setAttribute('normal', new Attribute3D(new Float32Array(normals), 3));
  mesh.setAttribute('color', new Attribute3D(new Float32Array(colors), 3));
  return mesh.setIndex(indices);
}

export function createTrialWorld(canvas) {
  const scene = new Scene3D();
  scene.background = Array.from(setColor3D(new Float32Array(3), 0x92a18f));
  const camera = createOrthographicCamera3D({ height: 23, aspect: 16 / 9, near: .1, far: 140 });
  camera.setPosition(38, 26, 34).lookAt(12.5, 0, 9.8);
  const renderer = createWebGL2Renderer3D({ canvas, antialias: true, toneMapping: 'none', shadows: true, shadowAtlasSize: 2048 });
  scene.addChild(createHemisphereLight3D({ color: 0xffecd6, groundColor: 0x4b5b47, intensity: 1.1 }));
  const sun = scene.addChild(createDirectionalLight3D({ color: 0xffe2aa, intensity: 1.43, castShadow: true }));
  sun.setPosition(1, 18, 3).lookAt(13, 0, 10);
  Object.assign(sun.shadow, { extent: 20, near: .5, far: 55, radius: .8, normalBias: .015, bias: .0002 });

  const box = createBoxGeometry3D();
  const sphere = createSphereGeometry3D({ radius: .5, widthSegments: 9, heightSegments: 6 });
  const trunk = createCylinderGeometry3D({ radiusTop: .33, radiusBottom: .5, height: 1, radialSegments: 7 });
  const cone = createConeGeometry3D({ radius: .5, height: 1, radialSegments: 7 });
  const robe = createCylinderGeometry3D({ radiusTop: .33, radiusBottom: .5, height: 1, radialSegments: 10 });
  const staticMaterials = new Map();
  function solid(color) {
    if (!staticMaterials.has(color)) staticMaterials.set(color, createStandardMaterial3D({ color, roughness: .87 }));
    return staticMaterials.get(color);
  }
  function add(parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, shadow = true) {
    const mesh = parent.addChild(new Mesh3D(geometry, material));
    mesh.setPosition(x, y, z).setScale(sx, sy, sz);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    return mesh;
  }
  const shape = (parent, geometry, color, x, y, z, sx, sy, sz, shadow) =>
    add(parent, geometry, solid(color), x, y, z, sx, sy, sz, shadow);
  const ground = add(scene, terrain(), createStandardMaterial3D({ color: 0xffffff, roughness: .95, vertexColors: true }), 0, 0, 0);
  ground.castShadow = false;
  shape(scene, box, 0x706d51, 5.05, -.48, 9.5, 11.1, .91, 20, false);
  shape(scene, box, 0x706d51, 19.5, -.48, 9.5, 12, .91, 20, false);
  shape(scene, box, 0x416b67, 12, -.27, 9.5, 3.13, .22, 20.2, false);
  const ripples = [];
  for (let index = 0; index < 24; index++) {
    const x = 10.86 + index % 5 * .53, z = .48 + (index * 29 % 191) / 10;
    if (z > 8.5 && z < 10.5) continue;
    const mesh = shape(scene, box, index % 3 ? 0x648e80 : 0x81a191, x, -.148, z,
      .20 + index % 4 * .10, .007, .046, false);
    ripples.push({ mesh, x, z });
  }
  for (let i = 0; i < 16; i++) {
    shape(scene, box, i % 3 === 1 ? 0x9a784f : 0xae8958, 10.01 + i * .268, .076, 9.5, .261, .15, 2.06);
  }
  for (const z of [8.47, 10.53]) {
    shape(scene, box, 0x755637, 12, .57, z, 4.36, .085, .085);
    for (const x of [9.9, 11.3, 12.7, 14.1]) shape(scene, box, 0x7e5b37, x, .31, z, .10, .59, .10);
  }

  const treeTops = [];
  trees.forEach(([x, z], index) => {
    const seed = hash(x, z);
    const h = 1.6 + seed % 11 * .10, size = .9 + seed % 9 * .07;
    shape(scene, trunk, 0x655139, x, h * .39, z, .22, h * .78, .24);
    const top = scene.addChild(new Object3D()).setPosition(x, h * .42, z);
    for (let tier = 0; tier < 3; tier++) {
      const leaf = shape(top, cone, wooded[(index + tier) % wooded.length], 0, h * (.29 + tier * .17), 0,
        size * (1.19 - tier * .24), h * .60, size * (1.07 - tier * .20));
      leaf.setRotation(0, seed % 11 + tier, 0);
    }
    treeTops.push(top);
  });
  rocks.forEach(([x, z], index) => {
    shape(scene, sphere, 0x777972, x, .24, z, .77, .58, .58).setRotation(.1, index * .9, .1);
    shape(scene, sphere, 0x868575, x + .29, .12, z + .17, .46, .33, .34);
  });
  for (const [x, z, sx, sy] of [[2, .3, 5.5, 2.6], [5.5, .6, 6.4, 3.7], [22.5, -.2, 7.1, 4.9], [24.5, 19.2, 4, 2.7]]) {
    shape(scene, cone, 0x727f69, x, sy * .12, z, sx, sy, sx * .8, false);
  }

  // Wood joinery, roof ridges and carved floor are built from primitive meshes.
  shape(scene, box, 0x908270, 21, .16, 3.1, 4.82, .32, 3.51);
  shape(scene, box, 0xd1ba8a, 21, 1.05, 3.1, 4.36, 1.61, 3.07);
  for (const x of [18.85, 20.2, 21.8, 23.15]) {
    shape(scene, box, 0x694e3c, x, 1.04, 4.69, .15, 1.65, .15);
  }
  for (const x of [19.42, 22.59]) {
    shape(scene, box, 0x4d493e, x, 1.13, 4.646, .77, .67, .04);
    for (const offset of [-.19, 0, .19]) shape(scene, box, 0xaa8b60, x + offset, 1.13, 4.674, .035, .64, .03);
  }
  shape(scene, box, 0x77593c, 21, .81, 4.67, 1.13, 1.03, .10);
  shape(scene, box, 0x9d8e73, 21, .094, 4.97, 1.45, .188, .43);
  for (const side of [-1, 1]) {
    const roof = shape(scene, box, 0x454d4a, 21, 2.11, 3.1 + side * .95, 5.03, .15, 2.13);
    roof.setRotation(side * .36, 0, 0);
    shape(scene, box, 0x514f45, 21, 1.75, 3.1 + side * 1.96, 5.13, .10, .12);
  }
  shape(scene, box, 0x705748, 21, 2.51, 3.1, 5.27, .14, .16);
  const lanternMaterial = createUnlitMaterial3D({ color: 0xe6a450 });
  for (const x of [20.04, 21.96]) {
    add(scene, sphere, lanternMaterial, x, 1.63, 4.87, .23, .28, .23, false);
  }
  for (const [x, z] of [[15, 8], [18, 5], [23, 8], [23, 15]]) {
    shape(scene, box, 0x66513c, x, .44, z, .115, .88, .115);
    add(scene, box, lanternMaterial, x, .96, z, .21, .24, .21, false);
    shape(scene, box, 0x5b4a38, x, 1.12, z, .29, .065, .29);
  }

  function actor(coat, sash, straw) {
    const root = scene.addChild(new Object3D()), body = root.addChild(new Object3D());
    shape(body, robe, coat, 0, .55, 0, .56, .68, .40);
    shape(body, trunk, sash, 0, .64, 0, .51, .085, .36);
    shape(body, sphere, 0xd0a47d, 0, 1.01, 0, .31, .34, .31);
    shape(body, trunk, 0x3a3532, 0, 1.14, -.015, .34, .12, .33);
    shape(body, cone, straw, 0, 1.20, 0, .59, .22, .56);
    const arms = [-1, 1].map(side => {
      const arm = body.addChild(new Object3D()).setPosition(side * .24, .80, .025);
      shape(arm, trunk, coat, 0, -.13, 0, .145, .31, .16);
      shape(arm, sphere, 0xd0a47d, 0, -.31, .015, .13, .14, .13);
      return arm;
    });
    shape(arms[1], box, 0xd9ded5, 0, -.53, .03, .062, .47, .033);
    shape(arms[1], box, 0xb79358, 0, -.36, .03, .13, .047, .05);
    const legs = [-1, 1].map(side => {
      const leg = body.addChild(new Object3D()).setPosition(side * .12, .29, 0);
      shape(leg, trunk, 0x3e3731, 0, -.12, 0, .12, .25, .13);
      shape(leg, box, 0x382f29, 0, -.24, .05, .143, .085, .21);
      return leg;
    });
    return { root, body, arms, legs };
  }
  const hero = actor(0x864d48, 0xc39a6b, 0xb89259);
  const keeper = actor(0x587469, 0xab9a66, 0x82866a);
  const ring = createRingGeometry3D({ innerRadius: .34, outerRadius: .40, thetaSegments: 28 });
  const marker = add(scene, ring, createUnlitMaterial3D({ color: 0xe7c36f, side: 'double' }), 0, .02, 0, 1, 1, 1, false);
  marker.setRotation(-pi / 2, 0, 0);
  const strike = createRingGeometry3D({ innerRadius: .64, outerRadius: 1.0, thetaStart: -.42, thetaLength: 1.98, thetaSegments: 24 });
  const strikeMaterial = createUnlitMaterial3D({ color: 0xffe4a2, side: 'double', alphaMode: 'blend', depthWrite: false, opacity: .8 });
  const effects = Array.from({ length: 6 }, () => add(scene, strike, strikeMaterial, 0, 0, 0, 1, 1, 1, false));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const groundHeight = (x, z) => inBridge(x, z) ? .15 : 0;

  function pose(person, role, seconds) {
    const walk = role.walking || role.moving, dead = role.dead;
    const motion = reduced.matches ? 0 : Math.sin(seconds * (walk ? 13 : 3) + (person === hero ? 0 : 1.1));
    const attack = role.action === 'attack', guard = role.action === 'guard';
    const y = groundHeight(role.x, role.y) + Math.max(0, role.z ?? 0) / 32;
    person.root.setPosition(role.x, y, role.y).setRotation(dead ? -.9 : 0, facingAngles[role.facing] ?? 0, 0);
    person.body.setPosition(0, walk ? Math.abs(motion) * .028 : motion * .006, 0);
    person.legs[0].setRotation(walk ? motion * .36 : 0, 0, 0);
    person.legs[1].setRotation(walk ? -motion * .36 : 0, 0, 0);
    person.arms[0].setRotation(guard ? -.99 : walk ? -motion * .28 : .05, 0, .19);
    person.arms[1].setRotation(attack ? -.7 - Math.sin((role.actFrame ?? 0) * .27) * .95
      : guard ? -1.25 : walk ? motion * .27 : -.08, attack ? -.75 : 0, attack ? -.68 : -.18);
  }

  function draw(player, opponent = mentor, battle, now) {
    const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect();
    if (!cssWidth || !cssHeight) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.65);
    const w = Math.max(1, Math.round(cssWidth * ratio)), h = Math.max(1, Math.round(cssHeight * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.height = camera.aspect < 1.5 ? 27 : 23;
      camera.updateProjectionMatrix();
    }
    const seconds = reduced.matches ? 0 : now / 1000;
    for (const [index, top] of treeTops.entries()) top.setRotation(.039 * Math.sin(seconds * 1.6 + index), 0, .025 * Math.cos(seconds * 1.3 + index));
    for (const [index, ripple] of ripples.entries()) {
      ripple.mesh.setPosition(ripple.x + .05 * Math.sin(seconds + index), -.148, ripple.z + .12 * Math.cos(seconds + index));
    }
    pose(hero, player, seconds);
    pose(keeper, opponent, seconds);
    marker.setPosition(player.x, groundHeight(player.x, player.y) + .017, player.y);
    for (const [index, mesh] of effects.entries()) {
      const effect = battle?.effects[index];
      mesh.visible = Boolean(effect);
      if (!effect) continue;
      const age = Math.min(1, effect.frame / Math.max(1, effect.totalFrames));
      mesh.setPosition(effect.x, .55 + (effect.z ?? 0) / 32, effect.y)
        .setRotation(-pi / 2.65, 0, (effect.angle ?? 0) * pi / 180).setScale(.72 + age * .78);
    }
    renderer.render(scene, camera);
    canvas.dataset.frame = String(renderer.info.frame);
    canvas.dataset.shadowMaps = String(renderer.info.shadowMaps);
    canvas.dataset.effectCount = String(effects.filter(effect => effect.visible).length);
  }

  function screen(x, y, z) {
    const point = vec3TransformMat4(new Float32Array(3), [x, y, z], camera.viewProjectionMatrix);
    return [(point[0] + 1) / 2, (1 - point[1]) / 2];
  }

  function tileAt(x, y) {
    const inverse = mat4Invert(new Float32Array(16), camera.viewProjectionMatrix);
    if (!inverse) return null;
    const near = vec3TransformMat4(new Float32Array(3), [2 * x - 1, 1 - 2 * y, -1], inverse);
    const far = vec3TransformMat4(new Float32Array(3), [2 * x - 1, 1 - 2 * y, 1], inverse);
    const t = near[1] / (near[1] - far[1]);
    return { x: Math.round(near[0] + (far[0] - near[0]) * t), y: Math.round(near[2] + (far[2] - near[2]) * t) };
  }

  return { draw, screen, tileAt };
}
