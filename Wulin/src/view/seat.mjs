// A stronghold seen from above: its buildings laid out round a courtyard and
// its people going about the jobs they were given.
//
// The scene reads the world and never changes it. `refresh` is called when
// the world has moved on; it rebuilds the buildings only if they changed and
// keeps the figures in step with who lives here and what they are doing.
import { Mesh3D, Object3D, Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { ART_BY_ID, CLASSES } from '../data/arts.mjs';
import { PLACE_BY_ID } from '../data/places.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { PLOT, createBuilding, treeParts } from './buildings.mjs';
import { STRIKE_OF, createFigure } from './figure.mjs';
import { BALL, BOX, SPIKE, TOON, heightSurface, hexOf, mix, model, scatter, shade } from './shapes.mjs';
import { lightScene } from './stage.mjs';

/** How many people are shown at once, by picture quality. */
const CROWD = { high: 22, medium: 14, low: 9 };

/** Half the side of the flat ground the buildings stand on. */
const YARD = 42;

/**
 * Where buildings go. The hall is at the back of the courtyard and the gate
 * at the front; the rest fill the plots either side of the path between
 * them, nearest the middle first.
 */
function plots() {
  const list = [];
  for (const z of [-17, -6, 5, 16]) for (const column of [1, 2, 3]) for (const side of [-1, 1]) list.push({ x: side * (column * (PLOT - 1) - 1), z, column });
  return list.sort((a, b) => a.column - b.column || Math.abs(a.z + 4) - Math.abs(b.z + 4));
}
const HALL_AT = { x: 0, z: -24 },
  GATE_AT = { x: 0, z: YARD - 6 };
/** People and buildings are drawn larger than life so they read from above. */
const FIGURE_SCALE = 1.5;

/** The kinds that want a place of honour or a quiet corner get their plots first. */
const ORDER = ['board', 'yard', 'range', 'library', 'council', 'mess', 'dorm', 'store', 'clinic', 'cell', 'forge', 'loom', 'still', 'tower', 'garden', 'lumber', 'quarry', 'ironPit', 'goldPit'];

/** Hills round the yard, by how mountainous the place is. */
function ground(spec, random) {
  const steep = spec.resources.stone + spec.resources.iron >= 3 ? 1.5 : 1;
  const bumps = Array.from({ length: 9 }, () => [random() * 6.28, 20 + random() * 30, 0.5 + random()]);
  const height = (x, z) => {
    const far = Math.max(Math.abs(x), Math.abs(z)) - YARD;
    if (far <= 0) return 0;
    const angle = Math.atan2(z, x);
    let lift = 0;
    for (const [at, , tall] of bumps) lift += tall * Math.max(0, Math.cos(angle - at)) ** 6;
    // The front, where the gate is, stays low so the road can leave.
    const front = z > 0 ? Math.max(0.15, 1 - Math.exp(-((x / 26) ** 2))) : 1;
    return Math.min(60, far * far * 0.012 * (0.6 + lift) * steep * front);
  };
  const grass = spec.resources.herb >= 2 ? 0x5c8546 : 0x6f8a4e;
  const colour = (x, z, y) => {
    if (y > 26) return mix(0x8d8a80, 0xf2f4f6, Math.min(1, (y - 26) / 16));
    if (y > 0.2) return mix(grass, 0x7d7a66, Math.min(1, y / 26));
    // Inside the walls: packed earth with a paved path up the middle.
    if (Math.abs(x) < 2.6 && z > HALL_AT.z && z < 60) return 0x9d9684;
    return Math.abs(x) < YARD - 4 && Math.abs(z) < YARD - 4 ? ((Math.round(x / 3) + Math.round(z / 3)) % 2 ? 0x8f8263 : 0x958868) : grass;
  };
  const mesh = new Mesh3D(heightSurface(360, 360, 72, 72, height, colour), TOON);
  mesh.receiveShadow = true;
  return { mesh, height };
}

/** The wall round the yard, with a gap for the gate, and the trees outside it. */
function surroundings(height, random, sectColor) {
  const parts = [];
  const wall = (x, z, w, d) => parts.push([BOX, [x, 1.3, z], [w, 2.6, d], 0xe4dcc8], [BOX, [x, 2.75, z], [w + 0.5, 0.3, d + 0.5], 0x3f4a52]);
  const edge = YARD - 6;
  wall(0, -edge, edge * 2, 0.7);
  wall(-edge, 0, 0.7, edge * 2);
  wall(edge, 0, 0.7, edge * 2);
  for (const side of [-1, 1]) wall(side * (edge / 2 + 3.6), edge, edge - 7.2, 0.7);
  // Banners in the sect's colour along the path.
  for (const z of [-6, 8, 22])
    for (const side of [-1, 1]) parts.push([BOX, [side * 4, 2.2, z], [0.08, 4.4, 0.08], 0x5a4632], [BOX, [side * 4 + 0.45, 3.4, z], [0.8, 1.7, 0.04], sectColor]);
  // A stone lantern either side of the hall steps.
  for (const side of [-1, 1]) parts.push([BOX, [side * 6, 0.6, HALL_AT.z + 8], [0.5, 1.2, 0.5], 0xa9a69c], [BOX, [side * 6, 1.4, HALL_AT.z + 8], [0.8, 0.5, 0.8], 0xd8cf9a], [SPIKE, [side * 6, 1.95, HALL_AT.z + 8], [0.7, 0.6, 0.7], 0x5c5a60]);
  for (let i = 0; i < 90; i++) {
    const angle = random() * 6.28,
      radius = YARD + 4 + random() * 70,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius,
      y = height(x, z);
    if (y > 30 || (Math.abs(x) < 8 && z > 0)) continue;
    for (const part of treeParts(x, z, 1.4 + random() * 1.6, random() < 0.3)) parts.push([part[0], [part[1][0], part[1][1] + y, part[1][2]], part[2], part[3]]);
  }
  // A few clouds, far off.
  for (let i = 0; i < 7; i++) parts.push([BALL, [(random() - 0.5) * 300, 60 + random() * 25, -120 - random() * 60], [16 + random() * 14, 3.5, 8], 0xffffff]);
  return model(parts);
}

/** What someone with a job does on screen: where they stand and which actions they cycle through. */
function routine(person, sites) {
  const job = person.job ?? { kind: 'rest' };
  const near = (kinds, fallback) => kinds.map((kind) => sites[kind]).find(Boolean) ?? fallback;
  const court = { x: 0, z: 6, spread: 9 };
  if (job.kind === 'train') {
    const klass = ART_BY_ID[job.art]?.klass;
    if (klass === 'inner') return { at: near(['cell', 'library'], court), actions: ['sit'], spread: 3 };
    if (klass === 'light') return { at: court, actions: ['run'], spread: 14, roam: true };
    const strike = STRIKE_OF[klass] ?? 'punch';
    return { at: near(CLASSES[klass]?.family === 'hand' ? ['yard', 'range'] : ['range', 'yard'], court), actions: [strike, 'guard', strike, strike === 'slash' ? 'thrust' : 'guard'], spread: 3.6 };
  }
  if (job.kind === 'seclude') return { at: near(['cell'], { x: -8, z: -12 }), actions: ['sit'], spread: 2 };
  if (job.kind === 'gather') return { at: near([{ gold: 'goldPit', wood: 'lumber', stone: 'quarry', iron: 'ironPit', herb: 'garden' }[job.res]], { x: 26, z: 20 }), actions: ['work'], spread: 3.4 };
  if (job.kind === 'craft') return { at: near([{ weapon: 'forge', armor: 'loom', pill: 'still' }[job.make]], court), actions: ['work'], spread: 2.6, front: true };
  if (job.kind === 'patrol' || job.kind === 'extort') return { at: { x: 0, z: 14 }, actions: ['walk'], spread: 9, roam: true };
  return { at: near(['mess', 'dorm'], court), actions: ['idle', 'walk'], spread: 4, roam: true, front: true };
}

const weaponSlotOf = (person) => person.gear?.weapon?.slot ?? null;

/**
 * @param stage  the stage from stage.mjs
 * @param world  the world; read, never changed
 * @param placeId which stronghold to show
 */
export function createSeat(stage, world, placeId) {
  const spec = PLACE_BY_ID[placeId];
  const random = scatter(spec.id.length * 7919 + spec.at.x * 31 + spec.at.y);
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 42, near: 0.5, far: 700 });
  scene.addChild(camera);
  const { aim } = lightScene(scene, 'day', stage.quality);
  aim(0, 0, 0);
  const land = ground(spec, random);
  scene.addChild(land.mesh);

  let dressing = null,
    built = new Object3D(),
    signature = '',
    owner = null;
  scene.addChild(built);
  /** Where each kind of building ended up, for sending people to work. */
  let sites = {};
  /** Figures by person id. */
  const cast = new Map();

  function layBuildings(place) {
    scene.removeChild(built);
    built = new Object3D();
    scene.addChild(built);
    sites = {};
    const free = plots();
    const sorted = place.buildings.map((b, index) => ({ ...b, index })).sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    for (const building of sorted) {
      const at = building.kind === 'hall' ? HALL_AT : building.kind === 'gate' ? GATE_AT : free.shift();
      if (!at) continue;
      const node = createBuilding(building.kind, building.level);
      node.setPosition(at.x, 0, at.z);
      // Buildings either side of the path turn a little towards it.
      if (at.column) node.setRotation(0, -Math.sign(at.x) * 0.12, 0);
      if (building.kind === 'hall') node.setScale(1.35);
      built.addChild(node);
      sites[building.kind] ??= { x: at.x, z: at.z + (building.kind === 'hall' ? 8 : 0) };
    }
  }

  function refresh() {
    const place = world().places[placeId];
    if (place.owner !== owner) {
      owner = place.owner;
      if (dressing) scene.removeChild(dressing);
      dressing = surroundings(land.height, scatter(spec.at.x * 131 + spec.at.y), owner ? hexOf(SECT_BY_ID[owner].color) : 0x8a8474);
      scene.addChild(dressing);
    }
    const now = place.buildings.map((b) => b.kind + b.level).join();
    if (now !== signature) (signature = now), layBuildings(place);

    // Leaders and elders are always shown; the rest fill the remaining places.
    const here = Object.values(world().persons)
      .filter((person) => person.place === placeId && person.school === place.owner)
      .sort((a, b) => b.rank - a.rank || a.id - b.id)
      .slice(0, CROWD[stage.quality] ?? 12);
    const wanted = new Set(here.map((person) => person.id));
    for (const [id, actor] of cast) if (!wanted.has(id)) scene.removeChild(actor.figure.node), cast.delete(id);
    for (const person of here) {
      const jobKey = JSON.stringify([person.job?.kind, person.job?.art, person.job?.res, person.job?.make, person.rank, weaponSlotOf(person)]);
      let actor = cast.get(person.id);
      if (actor && actor.gearKey !== `${person.rank}|${weaponSlotOf(person)}`) scene.removeChild(actor.figure.node), (actor = null);
      if (!actor) {
        const figure = createFigure({ color: hexOf(SECT_BY_ID[person.school].color), female: person.female, rank: person.rank, weapon: weaponSlotOf(person), monk: person.school === 'shaolin' || person.school === 'chongsheng', seed: person.id });
        actor = { figure, gearKey: `${person.rank}|${weaponSlotOf(person)}`, x: (random() - 0.5) * 8, z: GATE_AT.z + random() * 4, heading: Math.PI, wait: random() * 2, step: 0 };
        scene.addChild(figure.node);
        cast.set(person.id, actor);
      }
      if (actor.jobKey !== jobKey) {
        actor.jobKey = jobKey;
        // The head of the sect stands before the hall; everyone else follows their job.
        actor.routine = person.rank >= 5 ? { at: { x: 0, z: HALL_AT.z + 9 }, actions: ['idle'], spread: 1.5 } : routine(person, sites);
        actor.goal = null;
      }
    }
  }

  /** Walks an actor to a spot near their station, then has them act there for a while. */
  function direct(actor, dt) {
    const { figure, routine: plan } = actor;
    if (!actor.goal) {
      const angle = random() * 6.28,
        radius = Math.sqrt(random()) * plan.spread;
      actor.goal = { x: plan.at.x + Math.cos(angle) * radius, z: plan.at.z + (plan.front ? PLOT / 2 + 1 : 0) + Math.sin(angle) * radius * (plan.front ? 0.4 : 1) };
    }
    const dx = actor.goal.x - actor.x,
      dz = actor.goal.z - actor.z,
      gap = Math.hypot(dx, dz);
    if (gap > 0.25) {
      const running = plan.actions[0] === 'run',
        pace = running ? 5 : 1.7;
      actor.heading = Math.atan2(dx, dz);
      actor.x += (dx / gap) * Math.min(gap, pace * dt);
      actor.z += (dz / gap) * Math.min(gap, pace * dt);
      if (figure.action !== (running ? 'run' : 'walk')) figure.play(running ? 'run' : 'walk');
    } else if (plan.roam) {
      actor.wait -= dt;
      if (figure.action !== 'idle') figure.play('idle');
      if (actor.wait <= 0) (actor.goal = null), (actor.wait = 1 + random() * 4);
    } else if (!figure.busy) {
      actor.wait -= dt;
      if (actor.wait <= 0) {
        const next = plan.actions[actor.step++ % plan.actions.length];
        figure.play(next, { base: next === 'sit' || next === 'work' ? next : 'guard' });
        actor.wait = 0.5 + random() * 1.2;
        // Now and then they shift to a new spot.
        if (random() < 0.06 && next !== 'sit') actor.goal = null;
      }
    }
    figure.node.setPosition(actor.x, 0, actor.z);
    figure.node.setRotation(0, actor.heading, 0);
    figure.node.setScale(FIGURE_SCALE);
    figure.update(dt);
  }

  refresh();
  return {
    scene,
    camera,
    placeId,
    refresh,
    enter() {
      stage.orbit.set({ target: [0, 1, -2], yaw: 0.45, pitch: 0.55, distance: 50, minDistance: 14, maxDistance: 120, minPitch: 0.2, maxPitch: 1.3, reach: 38, drift: 0.02 });
    },
    update(dt) {
      for (const actor of cast.values()) direct(actor, dt);
      stage.orbit.apply(camera, dt);
    },
  };
}
