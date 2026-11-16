// The people of the chapter: sculpted figures on a shared skeleton, and the poses that move them.
// A figure faces +z; its left is +x. Poses are sets of joint angles; each frame every joint eases toward
// the pose its state asks for, which is what gives the cuts their snap and the walk its weight.
import { Mesh3D, Object3D, Skeleton3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { BIND, BONES, JOINTS } from './rig.mjs';

/** Size, what is carried in the right hand, and what on the left arm. */
const LOOKS = {
  hero: { size: 1, weapon: 'spear' },
  blade: { size: 1, weapon: 'sabre' },
  shield: { size: 1.06, weapon: 'short', off: 'rattan' },
  bow: { size: 0.98, off: 'longbow' },
  lu: { size: 1.2, weapon: 'glaive' }
};
const POSED = ['hips', 'spine', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR', 'cloak', 'weapon', 'off'];

/** Build one figure of the given kind from the sculpted models. */
export function createFigure(kind, models) {
  const look = LOOKS[kind],
    cloth = createStandardMaterial3D({ vertexColors: true, roughness: 0.78, metallic: 0 }),
    gear = createStandardMaterial3D({ vertexColors: true, roughness: 0.6, metallic: 0.1 }),
    metal = createStandardMaterial3D({ vertexColors: true, roughness: 0.28, metallic: 0.9, emissive: 0x9fd4ff, emissiveIntensity: 0 }),
    root = new Object3D(),
    joints = { root },
    rest = {};
  for (const [name, [parent, x, y, z]] of Object.entries(JOINTS)) {
    const joint = new Object3D();
    joint.setPosition(x, y, z);
    // The pose the figure was sculpted in; the skin is bound to it.
    joint.setRotation(0, 0, BIND[name] ?? 0);
    rest[name] = [x, y, z];
    joints[parent].addChild(joint);
    joints[name] = joint;
  }
  root.updateWorldMatrices(true);
  const body = new Mesh3D(models[kind], cloth);
  body.castShadow = true;
  body.receiveShadow = true;
  root.addChild(body);
  body.bind(new Skeleton3D(BONES.map((name) => joints[name])));
  const hold = (joint, name, material) => {
    if (!models[name]) return;
    const mesh = new Mesh3D(models[name], material);
    mesh.castShadow = true;
    joints[joint].addChild(mesh);
  };
  if (look.weapon) (hold('weapon', look.weapon, gear), hold('weapon', look.weapon + 'Edge', metal));
  if (look.off) hold('off', look.off, gear);
  root.setScale(look.size);
  const angles = {};
  for (const name of POSED) angles[name] = [0, 0, 0];
  return { kind, look, root, joints, rest, angles, lift: 0, cloth, metal, glow: 0, flash: 0, scale: look.size, sink: 0 };
}

// ---- poses --------------------------------------------------------------------------------

const mix = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);
const span = (t, from, to) => Math.max(0, Math.min(1, (t - from) / (to - from)));

/** Blend two poses. */
function blend(a, b, k) {
  const out = { lift: mix(a.lift ?? 0, b.lift ?? 0, k) };
  for (const name of POSED) {
    const p = a[name] ?? ZERO,
      q = b[name] ?? ZERO;
    out[name] = [mix(p[0], q[0], k), mix(p[1], q[1], k), mix(p[2], q[2], k)];
  }
  return out;
}
const ZERO = [0, 0, 0];

const STAND = {
  hero: { spine: [0.06, -0.3, 0], head: [0, 0.25, 0], armR: [0.3, 0, -0.25], foreR: [-1.0, 0, 0], weapon: [-0.22, 0.42, 0], armL: [-0.25, 0, 0.18], foreL: [-0.7, 0, 0], legL: [-0.18, 0, 0.07], shinL: [0.2, 0, 0], legR: [0.22, 0, -0.07], shinR: [0.18, 0, 0], cloak: [0.12, 0, 0] },
  foe: { spine: [0.1, -0.2, 0], armR: [0.1, 0, -0.3], foreR: [-0.9, 0, 0], weapon: [-0.5, 0.25, 0], armL: [-0.2, 0, 0.2], foreL: [-0.6, 0, 0], legL: [-0.15, 0, 0.08], shinL: [0.18, 0, 0], legR: [0.18, 0, -0.08], shinR: [0.15, 0, 0], cloak: [0.1, 0, 0] },
  shield: { armL: [-0.95, 0, 0.1], foreL: [-1.1, 0, -0.5], off: [1.2, 0, 0] },
  bow: { armL: [-0.5, 0, 0.2], foreL: [-0.6, 0, 0], off: [0.9, 0, 0], armR: [0, 0, -0.15], foreR: [-0.4, 0, 0] }
};

/** A stride: `phase` runs 0..1 over two steps, `reach` is how far the legs swing. */
function stride(base, phase, reach, lean) {
  const s = Math.sin(phase * Math.PI * 2),
    c = Math.cos(phase * Math.PI * 2);
  return {
    ...base,
    lift: Math.abs(c) * 0.05 - 0.04,
    spine: [(base.spine?.[0] ?? 0) + lean, (base.spine?.[1] ?? 0) + s * 0.12, 0],
    legL: [-s * reach, 0, 0.03],
    shinL: [Math.max(0, c) * reach * 1.3 + 0.15, 0, 0],
    legR: [s * reach, 0, -0.03],
    shinR: [Math.max(0, -c) * reach * 1.3 + 0.15, 0, 0],
    armL: [s * reach * 0.7 - 0.15, 0, 0.15],
    foreL: [-0.6, 0, 0],
    cloak: [0.3 + lean * 1.4 + c * 0.08, 0, 0]
  };
}

// The three cuts, each as: ready, drawn back, struck.
const CUTS = [
  [
    { spine: [0.08, -0.75, 0], armR: [0.85, 0, -0.3], foreR: [-1.7, 0, 0], weapon: [0, 0.1, 0], armL: [-0.9, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-0.3, 0, 0.05], shinL: [0.4, 0, 0], legR: [0.35, 0, -0.05], shinR: [0.3, 0, 0], lift: -0.08 },
    { spine: [0.32, 0.55, 0], head: [0, -0.4, 0], armR: [-1.5, 0, 0.12], foreR: [-0.08, 0, 0], weapon: [0.04, 0, 0], armL: [0.5, 0, 0.3], foreL: [-0.4, 0, 0], legL: [-0.95, 0, 0.05], shinL: [0.95, 0, 0], legR: [0.6, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.2, cloak: [0.7, 0, 0] }
  ],
  [
    { spine: [0.1, -1.0, 0], armR: [-0.5, 0, -1.1], foreR: [-0.5, 0, 0], weapon: [0, -1.75, 0], armL: [-0.7, 0, -0.3], foreL: [-0.9, 0, 0], legL: [-0.25, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
    { spine: [0.18, 1.0, 0], head: [0, -0.6, 0], armR: [-1.25, 0, 0.75], foreR: [-0.2, 0, 0], weapon: [0.02, 1.6, 0], armL: [0.3, 0, 0.6], foreL: [-0.5, 0, 0], legL: [-0.5, 0, 0.2], shinL: [0.5, 0, 0], legR: [0.45, 0, -0.2], shinR: [0.25, 0, 0], lift: -0.14, cloak: [0.5, 0.5, 0] }
  ],
  [
    { spine: [-0.32, 0, 0], head: [0.3, 0, 0], armR: [-2.75, 0, -0.1], foreR: [-0.35, 0, 0], weapon: [-2.0, 0, 0], armL: [-2.6, 0, 0.1], foreL: [-0.4, 0, 0], legL: [-0.1, 0, 0.1], shinL: [0.1, 0, 0], legR: [0.1, 0, -0.1], shinR: [0.1, 0, 0], lift: 0.12 },
    { spine: [0.7, 0, 0], head: [-0.4, 0, 0], armR: [-0.95, 0, 0.1], foreR: [-0.2, 0, 0], weapon: [0.52, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.4, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32, cloak: [0.9, 0, 0] }
  ]
];

const HERO_POSES = {
  guard: { spine: [0.12, 0, 0], armR: [-1.0, 0, -0.35], foreR: [-0.9, 0, 0], weapon: [-0.2, 1.4, 0.2], armL: [-1.2, 0, 0.45], foreL: [-0.7, 0, 0], legL: [-0.35, 0, 0.16], shinL: [0.4, 0, 0], legR: [0.3, 0, -0.16], shinR: [0.35, 0, 0], lift: -0.12 },
  dodge: { spine: [1.0, 0, 0], head: [-0.4, 0, 0], armR: [0.6, 0, -0.3], foreR: [-0.6, 0, 0], weapon: [0.1, -0.5, 0], armL: [0.7, 0, 0.3], foreL: [-0.5, 0, 0], legL: [-1.2, 0, 0], shinL: [1.5, 0, 0], legR: [-0.3, 0, 0], shinR: [1.2, 0, 0], lift: -0.42, cloak: [1.2, 0, 0] },
  hurt: { spine: [-0.5, 0.35, 0], head: [-0.35, 0, 0], armR: [0.4, 0, -0.9], foreR: [-0.5, 0, 0], weapon: [0.3, -0.8, 0], armL: [0.3, 0, 0.9], foreL: [-0.4, 0, 0], legL: [0.25, 0, 0.1], shinL: [0.3, 0, 0], legR: [-0.2, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.06 },
  drink: { spine: [-0.18, 0, 0], head: [-0.5, 0, 0], armL: [-2.1, 0, 0.35], foreL: [-1.7, 0, 0], armR: [-0.4, 0, -0.35], foreR: [-0.5, 0, 0], weapon: [-1.45, 0, 0] },
  stars: { spine: [0.1, 0.55, 0], armL: [-1.55, 0, -0.1], foreL: [-0.05, 0, 0], armR: [0.5, 0, -0.5], foreR: [-0.7, 0, 0], weapon: [0.15, -1.3, 0], legL: [-0.5, 0, 0.1], shinL: [0.5, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.1 },
  rainUp: { spine: [-0.28, 0, 0], head: [-0.45, 0, 0], armR: [-3.0, 0, -0.08], foreR: [-0.1, 0, 0], weapon: [-1.57, 0, 0], armL: [-0.6, 0, 0.9], foreL: [-0.3, 0, 0], lift: 0.25, cloak: [1.0, 0, 0] },
  rainDown: { spine: [0.75, 0, 0], head: [-0.3, 0, 0], armR: [-1.0, 0, 0], foreR: [-0.5, 0, 0], weapon: [1.25, 0, 0], armL: [-1.0, 0, 0.2], foreL: [-0.5, 0, 0], legL: [-1.1, 0, 0.1], shinL: [1.3, 0, 0], legR: [0.3, 0, -0.1], shinR: [1.2, 0, 0], lift: -0.4 },
  glide: { spine: [0.75, 0, 0], head: [-0.6, 0, 0], armR: [0.9, 0, -0.4], foreR: [-0.3, 0, 0], weapon: [0.12, -0.25, 0], armL: [0.9, 0, 0.4], foreL: [-0.2, 0, 0], legL: [-0.7, 0, 0.05], shinL: [0.9, 0, 0], legR: [0.75, 0, -0.05], shinR: [0.5, 0, 0], lift: -0.1, cloak: [1.35, 0, 0] },
  dead: { hips: [-1.45, 0, 0.1], spine: [-0.1, 0, 0], head: [-0.2, 0.4, 0], armR: [0.2, 0, -1.2], armL: [0.1, 0, 1.3], weapon: [0.2, -1.2, 1.2], legL: [0.1, 0, 0.25], legR: [-0.15, 0, -0.2], shinR: [0.5, 0, 0], lift: -0.8 }
};

/** The hero's pose for what he is doing. Returns [pose, how fast the joints chase it]. */
export function heroPose(hero, tune, clock, travelled) {
  const base = STAND.hero;
  switch (hero.state) {
    case 'cut': {
      const cut = tune.cuts[hero.cut],
        [back, through] = CUTS[hero.cut];
      if (hero.t < cut.windup) return [{ ...base, ...back }, 30];
      if (hero.t < cut.windup + cut.active + 0.08) return [{ ...base, ...through }, 46];
      return [blend({ ...base, ...through }, base, ease(span(hero.t, cut.windup + cut.active + 0.08, cut.windup + cut.active + cut.recover))), 16];
    }
    case 'riposte':
      return hero.t < tune.riposte.strike * 0.7 ? [{ ...base, ...CUTS[0][0], lift: -0.25 }, 40] : [{ ...base, ...CUTS[0][1], lift: -0.3 }, 50];
    case 'guard':
      return [{ ...base, ...HERO_POSES.guard }, 26];
    case 'dodge':
      return [{ ...base, ...HERO_POSES.dodge, hips: [hero.t / tune.dodge.time < 0.8 ? 0.5 : 0, 0, 0] }, 26];
    case 'hurt':
      return [{ ...base, ...HERO_POSES.hurt }, 30];
    case 'drink':
      return [{ ...base, ...HERO_POSES.drink }, 14];
    case 'stars':
      return [{ ...base, ...HERO_POSES.stars }, 30];
    case 'rain':
      return hero.t < tune.rain.burstAt - 0.2 ? [{ ...base, ...HERO_POSES.rainUp, lift: 0.25 + Math.sin(clock * 3) * 0.05 }, 9] : [{ ...base, ...HERO_POSES.rainDown }, 34];
    case 'glide':
      return [{ ...base, ...HERO_POSES.glide }, 14];
    case 'dead':
      return [{ ...base, ...HERO_POSES.dead }, 7];
  }
  if (hero.moving) return [{ ...stride({ ...base, weapon: [0.12, 0.3, 0], armR: [0.35, 0, -0.25] }, travelled / 2.3, 0.85, 0.22) }, 18];
  const breath = Math.sin(clock * 1.8) * 0.02;
  return [{ ...base, spine: [0.06 + breath, -0.3, 0], lift: breath * 0.6 }, 10];
}

const FOE_POSES = {
  arcBack: { spine: [0.05, -0.9, 0], armR: [-0.9, 0, -1.2], foreR: [-0.7, 0, 0], weapon: [-0.55, -1.7, 0], legL: [-0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [0.3, 0, -0.1], shinR: [0.3, 0, 0], lift: -0.1 },
  arcThrough: { spine: [0.25, 0.95, 0], armR: [-1.3, 0, 0.6], foreR: [-0.2, 0, 0], weapon: [0.12, 1.5, 0], legL: [-0.7, 0, 0.1], shinL: [0.7, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.2, 0, 0], lift: -0.16, cloak: [0.6, 0.4, 0] },
  lineBack: { spine: [0.3, -0.6, 0], armR: [0.8, 0, -0.3], foreR: [-1.5, 0, 0], weapon: [0, 0.05, 0], legL: [-0.5, 0, 0.1], shinL: [0.8, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.8, 0, 0], lift: -0.25 },
  lineThrough: { spine: [0.4, 0.5, 0], armR: [-1.5, 0, 0.1], foreR: [-0.05, 0, 0], weapon: [0.03, 0, 0], legL: [-1.0, 0, 0.05], shinL: [1.0, 0, 0], legR: [0.7, 0, -0.05], shinR: [0.1, 0, 0], lift: -0.22, cloak: [1.1, 0, 0] },
  discBack: { spine: [-0.35, 0, 0], head: [0.3, 0, 0], armR: [-2.8, 0, -0.1], foreR: [-0.3, 0, 0], armL: [-2.7, 0, 0.1], foreL: [-0.3, 0, 0], weapon: [-2.05, 0, 0], lift: 0.14 },
  discThrough: { spine: [0.75, 0, 0], armR: [-0.9, 0, 0.1], foreR: [-0.2, 0, 0], armL: [-0.9, 0, -0.1], foreL: [-0.3, 0, 0], weapon: [0.55, 0, 0], legL: [-0.9, 0, 0.1], shinL: [1.1, 0, 0], legR: [0.5, 0, -0.1], shinR: [0.6, 0, 0], lift: -0.32 },
  fireBack: { spine: [0.55, -0.5, 0], armR: [0.3, 0, -0.5], foreR: [-0.4, 0, 0], weapon: [0.5, -0.9, 0], legL: [-0.6, 0, 0.1], shinL: [0.9, 0, 0], legR: [0.4, 0, -0.1], shinR: [0.7, 0, 0], lift: -0.28 },
  fireThrough: { spine: [-0.25, 0.6, 0], armR: [-2.2, 0, 0.3], foreR: [-0.2, 0, 0], weapon: [-1.0, 0.5, 0], lift: 0.05, cloak: [0.8, 0, 0] },
  wheel: { spine: [0.15, 0, 0], armR: [-1.4, 0, -0.9], foreR: [-0.1, 0, 0], armL: [-0.6, 0, 1.0], weapon: [0.05, -1.57, 0], lift: -0.12, cloak: [1.1, 0, 0] },
  draw: { spine: [0.02, -0.5, 0], head: [0, 0.4, 0], armL: [-1.5, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-1.35, 0, -0.5], foreR: [-2.0, 0, 0] },
  loft: { spine: [-0.35, -0.5, 0], head: [-0.3, 0.4, 0], armL: [-2.3, 0, -0.35], foreL: [-0.05, 0, 0], off: [1.55, 0, 0], armR: [-2.0, 0, -0.5], foreR: [-2.0, 0, 0] },
  stagger: { spine: [-0.55, 0.3, 0], head: [-0.4, 0, 0], armR: [0.3, 0, -1.0], foreR: [-0.4, 0, 0], weapon: [0.4, -1.0, 0.3], armL: [0.2, 0, 1.0], foreL: [-0.3, 0, 0], legL: [0.3, 0, 0.1], shinL: [0.35, 0, 0], legR: [-0.25, 0, -0.1], shinR: [0.35, 0, 0], lift: -0.08 },
  down: { spine: [0.7, 0, 0], head: [0.45, 0, 0], armR: [-0.8, 0, -0.2], foreR: [-0.9, 0, 0], weapon: [-1.35, 0, 0.15], armL: [-0.3, 0, 0.3], foreL: [-1.0, 0, 0], legL: [-1.4, 0, 0.1], shinL: [1.5, 0, 0], legR: [0.2, 0, -0.1], shinR: [1.5, 0, 0], lift: -0.46 },
  rage: { spine: [-0.42, 0, 0], head: [-0.5, 0, 0], armR: [-0.7, 0, -1.3], foreR: [-0.3, 0, 0], weapon: [-0.9, -0.9, 0], armL: [-0.7, 0, 1.3], foreL: [-0.4, 0, 0], legL: [-0.2, 0, 0.2], legR: [0.2, 0, -0.2], lift: 0.05, cloak: [1.0, 0, 0] },
  wait: { spine: [0.05, 0, 0], armR: [-0.35, 0, -0.3], foreR: [-0.5, 0, 0], weapon: [-1.5, 0, 0], armL: [0.1, 0, 0.12], foreL: [-0.2, 0, 0] }
};

/** A foe's pose for what he is doing. */
export function foePose(foe, clock, travelled) {
  const base = { ...STAND.foe, ...(STAND[foe.kind] ?? {}) },
    over = (pose) => ({ ...base, ...pose });
  switch (foe.state) {
    case 'dead':
      return [over({ ...HERO_POSES.dead, hips: [-1.5, 0, foe.id % 2 ? 0.2 : -0.2] }), 8];
    case 'stagger':
      return [over(FOE_POSES.stagger), 28];
    case 'down':
      return [over(FOE_POSES.down), 12];
    case 'rage':
      return foe.t < 0.8 ? [over(FOE_POSES.down), 12] : [over(FOE_POSES.rage), 16];
    case 'wait':
      return [over(foe.kind === 'lu' ? FOE_POSES.wait : {}), 8];
    case 'windup':
    case 'strike':
    case 'recover': {
      const move = foe.move,
        key = move.name === 'fire' ? 'fire' : move.name === 'wheel' ? 'wheel' : move.shape === 'arc' ? 'arc' : move.shape === 'line' ? 'line' : 'disc';
      if (foe.kind === 'bow') {
        const pose = over(move.name === 'volley' ? FOE_POSES.loft : FOE_POSES.draw);
        return foe.state === 'recover' ? [blend(pose, base, ease(span(foe.t, 0, 0.35))), 14] : [pose, 12];
      }
      if (key === 'wheel') return [over({ ...FOE_POSES.wheel, hips: [0, foe.state === 'strike' ? foe.t * 26 : 0, 0] }), foe.state === 'strike' ? 60 : 14];
      const back = over(FOE_POSES[key + 'Back']),
        through = over(FOE_POSES[key + 'Through']);
      if (foe.state === 'windup') return [blend(base, back, ease(span(foe.t, 0, move.windup * 0.55))), 16];
      if (foe.state === 'strike') return [through, 48];
      return [blend(through, base, ease(span(foe.t, move.recover * 0.35, move.recover))), 14];
    }
  }
  if (foe.walking) return [stride(base, travelled / (foe.kind === 'lu' ? 2.6 : 1.9), 0.6, 0.12), 16];
  const breath = Math.sin(clock * 1.6 + foe.id) * 0.02;
  return [{ ...base, lift: breath }, 10];
}

/** Ease the figure's joints toward a pose and place its weapon in its right hand. */
export function pose(figure, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt),
    joints = figure.joints;
  for (const name of POSED) {
    const want = target[name] ?? ZERO,
      now = figure.angles[name];
    for (let i = 0; i < 3; i++) now[i] += (want[i] - now[i]) * k;
    joints[name].setRotation(now[0], now[1], now[2]);
  }
  figure.lift += ((target.lift ?? 0) - figure.lift) * k;
  joints.hips.setPosition(0, figure.rest.hips[1] + figure.lift, 0);
  // The weapon is posed in the body's own space, and carried to wherever the hand has got to.
  figure.root.updateWorldMatrices(true);
  const hand = joints.hand.getWorldPosition(scratch);
  joints.spine.worldToLocal(scratch, hand);
  joints.weapon.setPosition(scratch[0], scratch[1], scratch[2]);
}
const scratch = [0, 0, 0];
