// 路上的危险：林子里和峡口的山匪、垭口的狼群。每处埋伏有一张导航网格（createNavMesh3D，按那一片的地形起伏铺出，
// 陡坡、水面和树干石头底下的三角形被关掉），埋伏的人或狼是一群导航体（createNavCrowd3D），追着最近的车跑、绕开
// 障碍、彼此让开。车速快时撞上山匪，他就倒成布娃娃（createRagdoll3D）；车慢下来时被他扒住，就会被抢走一捆茶。
// 狼咬住车会拖慢它、扯开篷布；按喇叭能把附近的狼吓跑。
//
// The dangers of the road: bandits in the forest and at the gorge, wolves at the pass. Each ambush has a navigation
// mesh (`createNavMesh3D`) laid over that stretch of ground, with the triangles on steep slopes, in water and under
// trunks and boulders switched off; its bandits or wolves are a crowd of agents (`createNavCrowd3D`) that run for the
// nearest truck, round the obstacles and out of each other's way. A bandit hit by a fast truck falls as a ragdoll
// (`createRagdoll3D`); one who catches a slow truck takes a bundle of tea. A wolf that gets hold of a truck slows it and
// tears at its tarp; the horn sends the wolves near it running.
import { Mesh3D, createCylinderGeometry3D, createGeometryBuilder3D, createNavCrowd3D, createNavMesh3D, createRagdoll3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createBandit, createWolf, play } from '../models/figures.mjs';
import { LAYER } from '../world/land.mjs';
import { AMBUSHES, RIVER, directionAt, nearestRoad, pointAt } from '../world/route.mjs';
import { seeded } from '../world/noise.mjs';
import { TRUCK } from '../models/truck.mjs';

/** How close the convoy comes before an ambush wakes, and how far past it before it is put away. */
const WAKE = 260,
  SLEEP = 320;
const PREPARE_DISTANCE = 60;
/** The grid of the navigation mesh, in metres. */
const CELL = 3;

const bark = createStandardMaterial3D({ vertexColors: true, roughness: 0.9 });
let logGeometry = null;
/** A felled pine log, bark and pale cut ends, along local Y as the capsule of its body is. */
function logShape() {
  logGeometry ??= createGeometryBuilder3D()
    .add(createCylinderGeometry3D({ radiusTop: 0.24, radiusBottom: 0.28, height: 5.2, radialSegments: 10 }), { color: 0x4a3524 })
    .add(createCylinderGeometry3D({ radiusTop: 0.22, radiusBottom: 0.22, height: 0.02, radialSegments: 10 }), { position: [0, 2.61, 0], color: 0xc9a77a })
    .add(createCylinderGeometry3D({ radiusTop: 0.26, radiusBottom: 0.26, height: 0.02, radialSegments: 10 }), { position: [0, -2.61, 0], color: 0xc9a77a })
    .build();
  return logGeometry;
}

/** A truck's frame: where a point lies along it, across it and above it, from its chassis. */
function local(body, x, y, z) {
  const r = body.rotation,
    p = body.position,
    dx = x - p[0],
    dy = y - p[1],
    dz = z - p[2];
  return [r[0] * dx + r[3] * dy + r[6] * dz, r[1] * dx + r[4] * dy + r[7] * dz, r[2] * dx + r[5] * dy + r[8] * dz];
}

/** Index each obstacle in all the world-space cells its circle's bounding box touches. */
function obstacleCells(obstacles) {
  const cells = new Map();
  for (const obstacle of obstacles) {
    const { x, z, r } = obstacle,
      left = Math.floor((x - r) / CELL),
      right = Math.floor((x + r) / CELL),
      top = Math.floor((z - r) / CELL),
      bottom = Math.floor((z + r) / CELL);
    for (let row = top; row <= bottom; row++) {
      let columns = cells.get(row);
      if (!columns) cells.set(row, (columns = new Map()));
      for (let column = left; column <= right; column++) {
        let nearby = columns.get(column);
        if (!nearby) columns.set(column, (nearby = []));
        nearby.push(obstacle);
      }
    }
  }
  return cells;
}

/**
 * The ground of an ambush as a navigation mesh: a square of `half` metres about its centre, cut in triangles on a
 * grid, with the ones that are too steep, under water or under an obstacle switched off.
 */
function groundMesh(zone, heightAt, obstacles) {
  const half = zone.radius + 60,
    n = Math.round((half * 2) / CELL),
    x0 = zone.x - half,
    z0 = zone.z - half,
    positions = new Float32Array((n + 1) * (n + 1) * 3),
    indices = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * CELL,
        z = z0 + j * CELL,
        o = (j * (n + 1) + i) * 3;
      positions[o] = x;
      positions[o + 1] = heightAt(x, z);
      positions[o + 2] = z;
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i,
        b = a + 1,
        c = a + n + 1,
        d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  const nav = createNavMesh3D({ positions, indices }, { slopeLimit: 0.75 }),
    cells = obstacleCells(obstacles);
  const centre = [0, 0, 0];
  for (let t = 0; t < nav.triangleCount; t++) {
    nav.center(t, centre);
    const wet = Math.abs(centre[2] - RIVER.z(centre[0])) < RIVER.halfWidth + 2 && centre[1] < RIVER.y + 3;
    const nearby = cells.get(Math.floor(centre[2] / CELL))?.get(Math.floor(centre[0] / CELL));
    // The bucket only narrows the search. Test the actual centroid against each obstacle's circle.
    if (wet || nearby?.some((o) => Math.hypot(o.x - centre[0], o.z - centre[2]) < o.r)) nav.setEnabled(t, false);
  }
  return nav;
}

/**
 * The threats along the road. `convoy` is the trucks, `land` the ground, `flora` the obstacles, `effects` the dust
 * bursts, and `events(name, detail)` hears what happens (for the story, the sounds and the count of tea).
 */
export function createThreats(scene, physics, { convoy, land, flora, effects, events = () => {} }) {
  const zones = AMBUSHES.map((zone) => ({ ...zone, state: 'waiting', crowd: null, nav: null, members: [], prepared: [] }));
  const timers = { retarget: 0 };

  function makeFigure(zone, index) {
    return zone.kind === 'wolf' ? createWolf(index) : createBandit(index);
  }

  function discardPrepared(zone) {
    for (const figure of zone.prepared) {
      if (!figure) continue;
      figure.mesh.geometry.dispose();
      figure.bundle?.geometry.dispose();
    }
    zone.prepared.length = 0;
  }

  /** Wake an ambush: lay its ground, and set its people or wolves in hiding off the road ahead. */
  function wake(zone) {
    zone.nav = groundMesh(zone, land.heightAt, flora.obstacles(zone.x, zone.z, zone.radius + 60));
    zone.crowd = createNavCrowd3D(zone.nav);
    zone.crowd.separation = 1.2;
    const random = seeded(zone.id.length * 977 + 13),
      n = {};
    for (let i = 0; i < zone.count; i++) {
      // A hiding place: beside the road, a little ahead of the centre, on the mesh.
      let spot = null;
      for (let tries = 0; tries < 30 && !spot; tries++) {
        const s = zone.s + (random() - 0.3) * zone.radius,
          side = (random() < 0.5 ? -1 : 1) * (16 + random() * 22),
          p = pointAt(s);
        nearestRoad(p[0], p[2], n);
        const dir = pointAt(s + 2),
          dx = dir[0] - p[0],
          dz = dir[2] - p[2],
          len = Math.hypot(dx, dz) || 1,
          x = p[0] - (dz / len) * side,
          z = p[2] + (dx / len) * side;
        const found = zone.nav.findNearest([x, land.heightAt(x, z), z], 6);
        if (found && zone.nav.isEnabled(found.triangle)) spot = found.point;
      }
      if (!spot) continue;
      const figure = zone.prepared[i] ?? makeFigure(zone, i);
      if (i < zone.prepared.length) zone.prepared[i] = null;
      figure.root.setPosition(spot[0], spot[1], spot[2]);
      scene.addChild(figure.root);
      const agent = zone.crowd.addAgent({
        position: spot,
        radius: zone.kind === 'wolf' ? 0.5 : 0.4,
        speed: zone.kind === 'wolf' ? 10.5 : 6.2,
        acceleration: zone.kind === 'wolf' ? 22 : 14,
        node: figure.root
      });
      const member = { zone, figure, agent, state: 'hidden', home: spot, hold: 0, truck: null, carrying: false, yaw: random() * Math.PI * 2, scared: 0, ragdoll: null, fallen: 0 };
      if (zone.kind === 'bandit') member.ragdoll = createRagdoll3D(physics, figure.root, figure.parts, { layer: LAYER.body, mask: LAYER.ground | LAYER.prop | LAYER.body, friction: 0.7, linearDamping: 0.1, angularDamping: 0.4 });
      zone.members.push(member);
    }
    discardPrepared(zone);
    // The bandits fell logs across the road ahead, so the convoy has to slow down where they wait. The logs are
    // dynamic bodies: a truck can shove them aside at a crawl; hit hard, they kick.
    zone.logs = [];
    if (zone.kind === 'bandit')
      for (let i = 0; i < 3; i++) {
        const s = zone.s - 6 + i * 3.2,
          p = pointAt(s),
          [dx, dz] = directionAt(s),
          // Across the road: the capsule, turned onto its side, lies along local X, which this yaw turns across.
          yaw = Math.atan2(-dx, -dz) + (i - 1) * 0.25,
          x = p[0] - dz * (i - 1) * 0.8,
          z = p[2] + dx * (i - 1) * 0.8,
          mesh = new Mesh3D(logShape(), bark);
        mesh.castShadow = true;
        scene.addChild(mesh);
        const body = physics.createBody({
          type: 'dynamic',
          mass: 260,
          shape: { type: 'capsule', radius: 0.27, halfHeight: 2.35 },
          position: [x, land.heightAt(x, z) + 0.35, z],
          // The capsule lies along local Y; turn it onto its side, across the road.
          quaternion: (() => {
            const qz = [0, 0, Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)],
              qy = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
            return [qy[3] * qz[0] + qy[0] * qz[3] + qy[1] * qz[2] - qy[2] * qz[1], qy[3] * qz[1] - qy[0] * qz[2] + qy[1] * qz[3] + qy[2] * qz[0], qy[3] * qz[2] + qy[0] * qz[1] - qy[1] * qz[0] + qy[2] * qz[3], qy[3] * qz[3] - qy[0] * qz[0] - qy[1] * qz[1] - qy[2] * qz[2]];
          })(),
          friction: 0.9,
          linearDamping: 0.2,
          angularDamping: 0.4,
          layer: LAYER.prop,
          node: mesh,
          userData: { kind: 'log' }
        });
        zone.logs.push({ mesh, body });
      }
    zone.state = 'awake';
  }

  /** Put an ambush away: its figures, its ragdolls and its crowd. */
  function sleep(zone) {
    discardPrepared(zone);
    for (const log of zone.logs ?? []) {
      physics.removeBody(log.body);
      log.mesh.removeFromParent();
    }
    zone.logs = [];
    for (const member of zone.members) {
      member.ragdoll?.dispose();
      member.figure.root.removeFromParent();
    }
    zone.members = [];
    zone.crowd = null;
    zone.nav = null;
    zone.state = 'done';
  }

  /** The truck a member would go for: the nearest of the convoy. */
  function nearestTruck(p) {
    let best = null,
      bestD = Infinity;
    for (const truck of convoy.trucks) {
      const c = truck.chassis.position,
        d = Math.hypot(c[0] - p[0], c[2] - p[2]);
      if (d < bestD) {
        bestD = d;
        best = truck;
      }
    }
    return { truck: best, distance: bestD };
  }

  /** A bandit knocked down by `truck`: he goes limp carrying the truck's speed, and drops what he carried. */
  function knockDown(member, truck) {
    const v = truck.chassis.linearVelocity;
    member.zone.crowd.removeAgent(member.agent);
    member.figure.mixer.stopAll();
    member.ragdoll.activate([v[0] * 0.9, 3.5 + Math.hypot(v[0], v[2]) * 0.15, v[2] * 0.9], [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6]);
    member.state = 'down';
    member.fallen = 0;
    const p = member.figure.root.position;
    effects.burst(p[0], p[1] + 0.3, p[2]);
    if (member.carrying) {
      member.carrying = false;
      member.figure.bundle.visible = false;
      const back = member.truck ?? truck;
      back.setCargo(Math.min(TRUCK.cargoSlots, back.cargo + 1));
      events('recovered', { truck: back });
    }
    events('knocked', { member, truck, position: [p[0], p[1], p[2]] });
  }

  /** The horn: wolves within reach run off for a while; bandits flinch. */
  function horn() {
    const lead = convoy.lead.chassis.position;
    let scared = 0;
    for (const zone of zones)
      for (const member of zone.members) {
        if (member.state === 'down' || member.state === 'gone') continue;
        const p = member.figure.root.position;
        if (Math.hypot(p[0] - lead[0], p[2] - lead[2]) > 38) continue;
        if (zone.kind === 'wolf') {
          member.state = 'scared';
          member.scared = 7;
          member.hold = 0;
          if (member.truck) member.truck.drag = 0;
          member.truck = null;
          scared++;
        }
      }
    if (scared) events('scared', { count: scared });
    return scared;
  }

  function updateBandit(member, seconds) {
    const { figure, agent, zone } = member,
      p = figure.root.position;
    if (member.state === 'down') {
      member.ragdoll.update();
      member.fallen += seconds;
      // Lying still a while, he is let be where he fell.
      if (member.fallen > 8 && member.ragdoll.active) member.ragdoll.deactivate();
      return;
    }
    if (member.state === 'gone') return;
    const { truck, distance } = nearestTruck(p);
    const leadS = convoy.lead.s;
    if (member.state === 'hidden') {
      play(figure, 'idle');
      if (leadS > zone.s - zone.radius - 60) {
        member.state = 'chase';
        events('ambush', { zone });
      }
      return;
    }
    if (member.state === 'flee') {
      play(figure, 'run');
      if (agent.arrived || Math.hypot(p[0] - member.home[0], p[2] - member.home[2]) < 2) {
        member.state = 'gone';
        figure.root.visible = false;
        zone.crowd.removeAgent(agent);
        if (member.carrying) events('stolen', { truck: member.truck });
      }
      return;
    }
    // Chasing or holding on: the truck's frame says whether he is beside it, and how fast it goes.
    const body = truck.chassis,
      [lx, ly, lz] = local(body, p[0], p[1] + 0.9, p[2]),
      beside = Math.abs(lx) < TRUCK.halfWidth + 0.55 && lz > -3.6 && lz < 3.6 && Math.abs(ly) < 2.2,
      speed = Math.abs(truck.vehicle.speed);
    if (beside && speed > 4.5) return knockDown(member, truck);
    if (member.state === 'chase') {
      play(figure, distance < 4 ? 'grab' : 'run');
      if (beside) {
        member.hold += seconds;
        if (member.hold > 1.1 && truck.cargo > 0) {
          // A bundle off the back of the truck, and away into the trees.
          truck.setCargo(truck.cargo - 1);
          member.carrying = true;
          member.truck = truck;
          figure.bundle.visible = true;
          member.state = 'flee';
          agent.setTarget(member.home);
          events('grab', { truck, member });
        }
      } else member.hold = Math.max(0, member.hold - seconds);
      // They give up once the convoy is well past.
      if (leadS > zone.s + zone.radius + 140 && distance > 50) {
        member.state = 'flee';
        agent.setTarget(member.home);
      }
    }
  }

  function updateWolf(member, seconds) {
    const { figure, agent, zone } = member,
      p = figure.root.position;
    if (member.state === 'gone') return;
    const { truck, distance } = nearestTruck(p);
    if (member.state === 'hidden') {
      play(figure, 'idle');
      if (convoy.lead.s > zone.s - zone.radius - 40) {
        member.state = 'chase';
        events('ambush', { zone });
      }
      return;
    }
    if (member.state === 'scared') {
      play(figure, 'run');
      member.scared -= seconds;
      if (member.scared <= 0) member.state = 'chase';
      return;
    }
    if (member.state === 'flee') {
      play(figure, 'run');
      if (agent.arrived) {
        member.state = 'gone';
        figure.root.visible = false;
        zone.crowd.removeAgent(agent);
      }
      return;
    }
    const body = truck.chassis,
      [lx, ly, lz] = local(body, p[0], p[1] + 0.5, p[2]),
      beside = Math.abs(lx) < TRUCK.halfWidth + 0.7 && lz > -3.6 && lz < 3.8 && Math.abs(ly) < 2,
      speed = Math.abs(truck.vehicle.speed);
    // Hit at speed, a wolf is thrown clear and gives up the chase.
    if (beside && speed > 7) {
      member.state = 'flee';
      if (member.truck) member.truck.drag = 0;
      agent.setTarget(member.home);
      effects.burst(p[0], p[1] + 0.3, p[2], 0xd8dde4);
      events('yelp', { member, position: [p[0], p[1], p[2]] });
      return;
    }
    play(figure, distance < 5 ? 'snarl' : 'run');
    if (beside) {
      member.hold += seconds;
      member.truck = truck;
      truck.drag = Math.min(0.7, (truck.drag ?? 0) + seconds * 0.3);
      if (member.hold > 2.5 && truck.tearTarp) {
        truck.tearTarp();
        member.hold = 0;
        events('bite', { truck });
      }
    } else member.hold = Math.max(0, member.hold - seconds);
    if (convoy.lead.s > zone.s + zone.radius + 220 && distance > 60) {
      member.state = 'flee';
      agent.setTarget(member.home);
    }
  }

  /** Where a member runs: just beside the truck it goes for, a little ahead, on the mesh. */
  function retarget(zone) {
    for (const member of zone.members) {
      if (member.state !== 'chase' && member.state !== 'scared') continue;
      const p = member.figure.root.position,
        { truck } = nearestTruck(p);
      if (member.state === 'scared') {
        const away = [p[0] * 2 - truck.chassis.position[0], 0, p[2] * 2 - truck.chassis.position[2]];
        const found = zone.nav.findNearest([away[0], land.heightAt(away[0], away[2]), away[2]], 20);
        if (found) member.agent.setTarget(found.point);
        continue;
      }
      const c = truck.chassis.position,
        v = truck.chassis.linearVelocity,
        ahead = Math.min(1.2, Math.hypot(p[0] - c[0], p[2] - c[2]) / 12),
        x = c[0] + v[0] * ahead,
        z = c[2] + v[2] * ahead;
      const found = zone.nav.findNearest([x, land.heightAt(x, z), z], 10);
      if (found) member.agent.setTarget(found.point);
    }
  }

  return {
    zones,
    horn,
    /** Whether any ambush is under way, for the music and the markers. */
    get danger() {
      return zones.some((zone) => zone.state === 'awake' && zone.members.some((m) => m.state === 'chase'));
    },
    update(seconds) {
      const leadS = convoy.lead.s;
      timers.retarget -= seconds;
      const again = timers.retarget <= 0;
      if (again) timers.retarget = 0.4;
      let prepared = false;
      for (const zone of zones) {
        if (zone.state === 'waiting') {
          const wakeAt = zone.s - WAKE;
          if (leadS > wakeAt && leadS < zone.s + zone.radius) wake(zone);
          else if (!prepared && leadS > wakeAt - PREPARE_DISTANCE && leadS <= wakeAt && zone.prepared.length < zone.count) {
            // Spread the mesh builds across frames. Only wake() may attach and animate them.
            zone.prepared.push(makeFigure(zone, zone.prepared.length));
            prepared = true;
          }
        }
        if (zone.state !== 'awake') continue;
        if (leadS > zone.s + SLEEP + zone.radius) {
          sleep(zone);
          continue;
        }
        if (again) retarget(zone);
        zone.crowd.update(seconds);
        for (const member of zone.members) {
          if (member.state !== 'down' && member.state !== 'gone') {
            // Face the way it runs, turning smoothly; the crowd keeps the feet on the mesh.
            const v = member.agent.velocity;
            if (Math.hypot(v[0], v[2]) > 0.4) {
              const want = Math.atan2(v[0], v[2]);
              let turn = want - member.yaw;
              while (turn > Math.PI) turn -= Math.PI * 2;
              while (turn < -Math.PI) turn += Math.PI * 2;
              member.yaw += turn * Math.min(1, seconds * 10);
            }
            member.figure.root.setRotation(0, member.yaw, 0);
            member.figure.mixer.update(seconds);
          }
          if (zone.kind === 'wolf') updateWolf(member, seconds);
          else updateBandit(member, seconds);
        }
      }
    },
    /** Put every ambush back to waiting, as when a run starts again from a station. */
    reset(fromS) {
      for (const zone of zones) {
        if (zone.state === 'awake') sleep(zone);
        else discardPrepared(zone);
        zone.state = fromS > zone.s + zone.radius ? 'done' : 'waiting';
      }
      for (const truck of convoy.trucks) truck.drag = 0;
    }
  };
}
