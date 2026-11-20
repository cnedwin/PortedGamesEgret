// 一关的机关，不含画面：引擎的二维物理世界，加上墨家机关的规则。
// The mechanisms of one level, without a picture: the engine's 2D physics world, and the rules of the
// Mohist machines built on it. The same code runs in the page and in Node, where the solver and the
// tests play every level to its end.
//
// Everything that moves is a body of the engine's world. A weight hangs on a rope joint of the world and
// falls when the joint is cut. What the world does not have — a hinge that tips a plank — is a rule here
// that moves bodies through the world's own calls: the seesaw is a kinematic plank turned by its angle.
// ENGINE-NOTES.md records why.
import { createPhysicsWorld } from '@egret/engine/physics2d';
import { BODY, LAYER, PELLETS, RULES } from './rules.mjs';

/** The solid tiles of a tileset, by global id, from the property `solid` set on each tile in Tiled. */
function solidGids(map) {
  const solid = new Set();
  for (const set of map.tilesets)
    for (const [id, tile] of set.tiles) if (tile.properties.solid === true) solid.add(set.firstGid + id);
  return solid;
}

/** The objects of the layer `mechanisms`, by their Tiled id. */
function mechanismObjects(map) {
  const layer = map.layers.find((each) => each.type === 'object' && each.name === 'mechanisms');
  if (!layer) throw new Error('A level needs an object layer named "mechanisms".');
  return layer.objects;
}

/**
 * Build a level from an imported Tiled map. `display(kind, spec)` is asked for the display object of each
 * body as it is made (nothing in Node); `onEvent(event)` hears what happens, for sound, sparks and the HUD.
 */
export function createLevelSim(map, { display = () => undefined, onEvent = () => {} } = {}) {
  const tile = map.tileWidth,
    width = map.width * tile,
    height = map.height * tile,
    world = createPhysicsWorld({ gravity: { x: 0, y: RULES.gravity }, fixedStep: RULES.step, maxSteps: 1, iterations: 12 });
  const terrain = map.layers.find((layer) => layer.type === 'tile' && layer.name === 'terrain'),
    solid = solidGids(map);
  // Runs of solid cells become a few static boxes.
  world.addTileColliders({
    columns: terrain.width,
    rows: terrain.height,
    tileWidth: tile,
    tileHeight: tile,
    layer: LAYER.ground,
    friction: 0.7,
    solid: (column, row) => solid.has(terrain.data[row * terrain.width + column] & 0x1fffffff)
  });

  const props = map.properties,
    level = {
      title: String(props.title ?? ''),
      shots: [...String(props.pellets ?? 'iron,iron,iron').split(',')].map((kind) => kind.trim()),
      par: Number(props.par ?? 1)
    };
  const state = {
    time: 0,
    shotsFired: 0,
    won: false,
    lost: false,
    quietFor: 0,
    combo: 0,
    comboTime: 0,
    score: 0
  };
  const parts = [],
    byObject = new Map(),
    pellets = [],
    locks = [],
    plates = [],
    gates = [],
    seesaws = [],
    ropes = [],
    springs = [];
  let bow;

  let settling = false;
  const emit = (type, detail = {}) => settling || onEvent({ ...detail, type, time: state.time });
  const say = (body) => body?.data;

  /** A body of the world with the part of the game it belongs to in `data`. */
  function addPart(kind, bodyOptions, spec) {
    const part = { kind, spec, body: null, alive: true };
    part.body = world.addBody({ ...bodyOptions, display: display(kind, spec, bodyOptions), data: part });
    parts.push(part);
    return part;
  }
  function removePart(part) {
    if (!part.alive) return;
    part.alive = false;
    if (part.body.state === 'active') world.removeBody(part.body);
    emit('removed', { part });
  }

  // ---- the objects of the map --------------------------------------------------------------
  const centre = (object) => ({ x: object.x + object.width / 2, y: object.y + object.height / 2 });
  for (const object of mechanismObjects(map)) {
    const p = object.properties,
      at = centre(object),
      spec = { id: object.id, name: object.name, x: at.x, y: at.y, width: object.width, height: object.height, props: p };
    switch (object.type) {
      case 'bow':
        bow = { x: object.x, y: object.y, angle: Number(p.angle ?? -35), power: Number(p.power ?? 70) };
        break;
      case 'block':
      case 'crate': {
        const part = addPart(
          object.type,
          {
            kind: 'dynamic',
            shape: { kind: 'box', width: object.width, height: object.height },
            x: at.x,
            y: at.y,
            density: object.type === 'crate' ? BODY.crate.density : BODY.block.density,
            friction: BODY.block.friction,
            restitution: 0.05,
            layer: LAYER.loose
          },
          spec
        );
        part.hp = object.type === 'crate' ? BODY.crate.hp : Infinity;
        byObject.set(object.id, part);
        break;
      }
      case 'stone': {
        const radius = object.width / 2;
        const part = addPart(
          'stone',
          { kind: 'dynamic', shape: { kind: 'circle', radius }, x: at.x, y: at.y, density: BODY.stone.density, friction: BODY.stone.friction, restitution: 0.15, layer: LAYER.loose },
          { ...spec, radius }
        );
        part.rolled = 0;
        byObject.set(object.id, part);
        break;
      }
      case 'seesaw': {
        const down = p.down === 'right' ? 1 : -1,
          plank = addPart(
            'seesaw',
            { kind: 'kinematic', shape: { kind: 'box', width: object.width, height: 10 }, x: at.x, y: at.y, angle: down * RULES.seesawTilt, friction: 0.8, layer: LAYER.ground },
            spec
          );
        // The post under it: a static wedge the plank turns on.
        addPart('post', { kind: 'static', shape: { kind: 'polygon', points: [{ x: 0, y: -10 }, { x: 14, y: 22 }, { x: -14, y: 22 }] }, x: at.x, y: at.y + 14, layer: LAYER.ground }, { ...spec, y: at.y + 14 });
        seesaws.push({ part: plank, x: at.x, y: at.y, half: object.width / 2, down, angle: down * RULES.seesawTilt, turning: 0, from: 0, to: 0, cool: 0 });
        break;
      }
      case 'rope':
        ropes.push({ id: object.id, x: object.x, y: object.y, length: object.height, holds: Number(p.holds), cut: false });
        break;
      case 'gate': {
        const part = addPart('gate', { kind: 'kinematic', shape: { kind: 'box', width: object.width, height: object.height }, x: at.x, y: at.y, friction: 0.5, layer: LAYER.ground }, spec);
        gates.push({ part, by: String(p.by), rise: Number(p.rise ?? object.height), home: at.y, open: false });
        break;
      }
      case 'plate': {
        const part = addPart('plate', { kind: 'static', shape: { kind: 'box', width: object.width, height: object.height }, x: at.x, y: at.y, sensor: true, layer: LAYER.sensor }, spec);
        plates.push({ part, name: object.name, needs: String(p.needs ?? 'any'), on: false });
        break;
      }
      case 'lock': {
        const part = addPart('lock', { kind: 'static', shape: { kind: 'box', width: object.width, height: object.height }, x: at.x, y: at.y, sensor: true, layer: LAYER.sensor }, spec);
        locks.push({ part, needs: String(p.needs ?? 'any'), open: false });
        break;
      }
      case 'spring': {
        const part = addPart('spring', { kind: 'static', shape: { kind: 'box', width: object.width, height: object.height }, x: at.x, y: at.y, restitution: 0, friction: 0, layer: LAYER.ground }, spec);
        springs.push({ part, power: Number(p.power ?? 700), bounce: 0 });
        break;
      }
      case 'ramp': {
        // A slope drawn in Tiled as a polygon: a static convex body around the middle of its points.
        const points = object.points,
          cx = points.reduce((sum, point) => sum + point.x, 0) / points.length,
          cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
        addPart(
          'ramp',
          { kind: 'static', shape: { kind: 'polygon', points: points.map((point) => ({ x: point.x - cx, y: point.y - cy })) }, x: object.x + cx, y: object.y + cy, friction: 0.5, layer: LAYER.ground },
          { ...spec, x: object.x + cx, y: object.y + cy, points: points.map((point) => ({ x: point.x - cx, y: point.y - cy })) }
        );
        break;
      }
      default:
        throw new Error(`Unknown mechanism "${object.type}" in level ${level.title}.`);
    }
  }
  if (!bow) throw new Error('A level needs a bow.');
  for (const rope of ropes) {
    const weight = byObject.get(rope.holds);
    if (!weight) throw new Error(`Rope ${rope.id} holds nothing.`);
    weight.rope = rope;
    rope.weight = weight;
    // The rope is tied to the top of what it holds, as long as it hangs; the weight can swing on it.
    const top = weight.kind === 'stone' ? weight.spec.radius : weight.spec.height / 2;
    rope.top = top;
    rope.joint = world.addJoint({ kind: 'rope', a: weight.body, point: { x: rope.x, y: rope.y }, anchorA: { x: 0, y: -top } });
  }

  // ---- what touches what ---------------------------------------------------------------------
  const before = new Map(); // the velocity of each body before the step, for the force of a blow
  const velocityOf = (body) => before.get(body) ?? { vx: body.vx, vy: body.vy };
  const speedOf = (body) => Math.hypot(velocityOf(body).vx, velocityOf(body).vy);
  const pending = []; // what contacts asked for, done after the step so the world is not changed inside it

  world.onContact((contact) => {
    if (contact.type !== 'begin') {
      if (contact.sensor) {
        const plate = plates.find((each) => each.part.body === contact.a || each.part.body === contact.b);
        if (plate) plate.touching = Math.max(0, (plate.touching ?? 0) - 1);
      }
      return;
    }
    const a = say(contact.a),
      b = say(contact.b);
    if (contact.sensor) {
      const sensor = a?.kind === 'lock' || a?.kind === 'plate' ? a : b,
        other = sensor === a ? b : a,
        otherBody = sensor === a ? contact.b : contact.a;
      if (!sensor || !other || otherBody.kind !== 'dynamic') return;
      pending.push(() => touchSensor(sensor, other));
      return;
    }
    for (const [mine, theirs, myBody, theirBody] of [
      [a, b, contact.a, contact.b],
      [b, a, contact.b, contact.a]
    ]) {
      if (!mine) continue;
      if (mine.kind === 'pellet') pending.push(() => pelletHit(mine, theirs, theirBody, contact.normal));
      if ((mine.kind === 'crate' || mine.kind === 'block') && theirBody.kind === 'dynamic')
        pending.push(() => knocked(mine, theirs, myBody, theirBody));
      if (mine.kind === 'seesaw' && theirBody.kind === 'dynamic') pending.push(() => landOnSeesaw(mine, theirs, theirBody));
      if (mine.kind === 'spring' && theirBody.kind === 'dynamic' && theirBody.y < myBody.y) pending.push(() => bounce(mine, theirBody));
    }
  });

  function touchSensor(sensor, other) {
    if (sensor.kind === 'plate') {
      const plate = plates.find((each) => each.part === sensor);
      if (!fits(plate.needs, other)) return;
      plate.touching = (plate.touching ?? 0) + 1;
      if (!plate.on) {
        plate.on = true;
        emit('plate', { name: plate.name, x: sensor.spec.x, y: sensor.spec.y });
        for (const gate of gates) if (gate.by === plate.name && !gate.open) openGate(gate);
        addScore(100, sensor.spec);
      }
      return;
    }
    const lock = locks.find((each) => each.part === sensor);
    if (lock.open || !fits(lock.needs, other)) return;
    lock.open = true;
    emit('lock', { x: sensor.spec.x, y: sensor.spec.y, left: locks.filter((each) => !each.open).length });
    addScore(500, sensor.spec);
    if (locks.every((each) => each.open)) {
      state.won = true;
      emit('win', { shots: state.shotsFired });
    }
  }
  const fits = (needs, part) => needs === 'any' || needs === part.kind || (needs === 'weight' && part.kind !== 'pellet');

  function pelletHit(pellet, other, otherBody, normal) {
    const speed = speedOf(pellet.body);
    if (pellet.kind !== 'pellet' || !pellet.alive) return;
    if (!pellet.landed && other && other.kind !== 'pellet') {
      emit('hit', { x: pellet.body.x, y: pellet.body.y, on: other?.kind ?? 'ground', speed, nx: normal.x, ny: normal.y });
    } else if (!other) emit('hit', { x: pellet.body.x, y: pellet.body.y, on: 'ground', speed, nx: normal.x, ny: normal.y });
    if (pellet.type === 'thunder' && !pellet.burst) {
      explode(pellet);
      return;
    }
    if (speed > 120) pellet.landed = true;
    void otherBody;
  }

  function knocked(part, other, body, otherBody) {
    const speed = Math.max(speedOf(otherBody), speedOf(body)),
      mass = otherBody.mass;
    if (speed < 90) return;
    emit('knock', { x: body.x, y: body.y, on: part.kind, speed });
    if (part.kind !== 'crate' || !part.alive) return;
    // A crate gives way to a blow with enough behind it.
    part.hp -= (speed * mass) / BODY.crate.toughness;
    if (part.hp <= 0) breakCrate(part);
    void other;
  }

  function breakCrate(part) {
    if (!part.alive) return;
    emit('break', { x: part.body.x, y: part.body.y, width: part.spec.width, height: part.spec.height });
    addScore(200, part.body);
    // Removing the crate removes the rope's joint with it.
    if (part.rope && !part.rope.cut) part.rope.cut = true;
    removePart(part);
  }

  function landOnSeesaw(plank, other, body) {
    const saw = seesaws.find((each) => each.part === plank);
    if (saw.turning > 0 || saw.cool > 0) return;
    const side = body.x < saw.x ? -1 : 1;
    // Only a weight on the raised end brings it down, and only one heavy enough.
    if (side === saw.down || body.mass < RULES.seesawMass) return;
    tip(saw, side, body.mass * speedOf(body));
  }

  function tip(saw, side, blow) {
    saw.from = saw.angle;
    saw.to = side * RULES.seesawTilt;
    saw.down = side;
    saw.turning = RULES.seesawTime;
    saw.cool = 0.4;
    emit('tip', { x: saw.x, y: saw.y, side });
    // What rests on the end that goes up is thrown.
    const reach = saw.half,
      endX = saw.x - side * reach * 0.6;
    for (const body of world.queryRect({ x: endX - reach * 0.55, y: saw.y - 70, width: reach * 1.1, height: 70 })) {
      if (body.kind !== 'dynamic') continue;
      // The harder the blow on the other end, the higher it flies; it is flung up and over the post.
      const throwSpeed = Math.min(RULES.seesawThrow, Math.max(RULES.seesawThrow * 0.35, ((blow / body.mass) * RULES.seesawLever)));
      body.vy = -throwSpeed;
      body.vx = side * throwSpeed * RULES.seesawFling;
      emit('thrown', { x: body.x, y: body.y });
    }
  }

  function bounce(spring, body) {
    const pad = springs.find((each) => each.part === spring);
    // It goes on the way it came, thrown up: the landing does not take its speed across.
    body.vx = velocityOf(body).vx;
    body.vy = -pad.power;
    pad.bounce = 0.3;
    emit('spring', { x: spring.spec.x, y: spring.spec.y });
  }

  function openGate(gate) {
    gate.open = true;
    gate.part.body.vy = -RULES.gateSpeed;
    emit('gate', { x: gate.part.spec.x, y: gate.part.spec.y });
  }

  function explode(pellet) {
    pellet.burst = true;
    const { x, y } = pellet.body,
      r = RULES.thunderRadius;
    emit('boom', { x, y, radius: r });
    for (const body of world.queryRect({ x: x - r, y: y - r, width: r * 2, height: r * 2 })) {
      const part = say(body);
      if (!part || part === pellet) continue;
      const dx = body.x - x,
        dy = body.y - y,
        d = Math.hypot(dx, dy);
      if (d > r) continue;
      const push = RULES.thunderPush * (1 - d / r);
      if (part.kind === 'crate') breakCrate(part);
      else if (body.kind === 'dynamic') body.applyImpulse(((dx / (d || 1)) * push) * body.mass, ((dy / (d || 1)) * push - push * 0.35) * body.mass);
    }
    // A rope in the blast is cut.
    for (const rope of ropes) {
      if (rope.cut) continue;
      const end = ropeEnd(rope);
      if (Math.hypot((rope.x + end.x) / 2 - x, (rope.y + end.y) / 2 - y) < r) cutRope(rope);
    }
    removePart(pellet);
  }

  function cutRope(rope) {
    if (rope.cut) return;
    rope.cut = true;
    const end = ropeEnd(rope);
    emit('cut', { x: (rope.x + end.x) / 2, y: (rope.y + end.y) / 2 });
    addScore(150, { x: rope.x, y: rope.y });
    if (rope.weight.alive) world.removeJoint(rope.joint);
  }

  /** Where the rope meets what it holds, now. */
  function ropeEnd(rope) {
    const body = rope.weight.body;
    return { x: body.x, y: body.y - rope.top };
  }

  /** Whether two segments come within `reach` of each other. */
  function segmentsMeet(ax, ay, bx, by, cx, cy, dx, dy, reach) {
    const cross = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const d1 = cross(cx, cy, dx, dy, ax, ay),
      d2 = cross(cx, cy, dx, dy, bx, by),
      d3 = cross(ax, ay, bx, by, cx, cy),
      d4 = cross(ax, ay, bx, by, dx, dy);
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    const toSegment = (px, py, sx, sy, ex, ey) => {
      const lx = ex - sx,
        ly = ey - sy,
        t = Math.max(0, Math.min(1, ((px - sx) * lx + (py - sy) * ly) / (lx * lx + ly * ly || 1)));
      return Math.hypot(px - (sx + lx * t), py - (sy + ly * t));
    };
    return Math.min(toSegment(ax, ay, cx, cy, dx, dy), toSegment(bx, by, cx, cy, dx, dy), toSegment(cx, cy, ax, ay, bx, by), toSegment(dx, dy, ax, ay, bx, by)) <= reach;
  }

  // A rope is cut by a pellet that passes through it: checked along the pellet's path each step.
  function ropeCuts(pellet, fromX, fromY) {
    const { x, y } = pellet.body,
      reach = pellet.body.shape.radius + 2;
    for (const rope of ropes) {
      if (rope.cut) continue;
      // The pellet's path this step against the rope, from its anchor to a little above what it holds.
      const end = ropeEnd(rope);
      if (segmentsMeet(fromX, fromY, x, y, rope.x, rope.y, end.x, end.y - 4, reach)) cutRope(rope);
    }
  }

  function addScore(points, at) {
    state.combo = state.comboTime > 0 ? state.combo + 1 : 1;
    state.comboTime = RULES.comboWindow;
    const gained = points * Math.min(5, state.combo);
    state.score += gained;
    emit('score', { points: gained, combo: state.combo, x: at.x, y: at.y });
  }

  // ---- shooting --------------------------------------------------------------------------------
  /** Whether the bow may shoot: pellets left, the last one at rest, nothing won or lost. */
  const ready = () => !state.won && !state.lost && state.shotsFired < level.shots.length && pellets.every((each) => !each.alive) && state.quietFor >= RULES.readyAfter;

  /** Where a pellet leaves the bow, and its speed, for an aim in degrees (0 right, -90 up) and a power 0–100. */
  function launch(angle, power) {
    const a = (angle * Math.PI) / 180,
      speed = RULES.minSpeed + ((RULES.maxSpeed - RULES.minSpeed) * Math.max(0, Math.min(100, power))) / 100;
    return { x: bow.x + Math.cos(a) * RULES.muzzle, y: bow.y + Math.sin(a) * RULES.muzzle, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  }

  function fire(angle, power) {
    if (!ready()) return false;
    const type = level.shots[state.shotsFired],
      kind = PELLETS[type] ?? PELLETS.iron,
      at = launch(angle, power);
    state.shotsFired++;
    state.combo = 0;
    const pellet = addPart(
      'pellet',
      { kind: 'dynamic', shape: { kind: 'circle', radius: kind.radius }, x: at.x, y: at.y, vx: at.vx, vy: at.vy, density: kind.density, restitution: kind.restitution, friction: 0.4, layer: LAYER.pellet },
      { type, radius: kind.radius }
    );
    pellet.type = type;
    pellet.still = 0;
    pellet.life = 0;
    pellet.landed = false;
    pellets.push(pellet);
    state.quietFor = 0;
    emit('shot', { pellet: type, x: at.x, y: at.y, angle, power, left: level.shots.length - state.shotsFired });
    return true;
  }

  // ---- one step ----------------------------------------------------------------------------------
  let carry = 0;
  /** Advance the level by `seconds`, in the world's fixed steps, the rules applied after each. */
  function update(seconds) {
    // The initial settling pass already ran. Keep its positions until the player releases the first shot.
    if (state.shotsFired === 0) return;
    carry += Math.min(seconds, 0.1);
    while (carry + 1e-9 >= RULES.step) {
      carry = Math.max(0, carry - RULES.step);
      once(RULES.step);
    }
  }

  function once(dt) {
    state.time += dt;
    before.clear();
    const path = new Map();
    for (const body of world.bodies) if (body.kind === 'dynamic') before.set(body, { vx: body.vx, vy: body.vy });
    for (const pellet of pellets) if (pellet.alive) path.set(pellet, { x: pellet.body.x, y: pellet.body.y });

    // Ropes hold their weights where they hang; seesaws turn.
    for (const saw of seesaws) {
      saw.cool = Math.max(0, saw.cool - dt);
      if (saw.turning > 0) {
        saw.turning = Math.max(0, saw.turning - dt);
        const t = 1 - saw.turning / RULES.seesawTime;
        saw.angle = saw.from + (saw.to - saw.from) * (t * t * (3 - 2 * t));
        saw.part.body.angle = saw.angle;
      }
    }
    for (const gate of gates)
      if (gate.open && gate.part.body.vy !== 0 && gate.part.body.y <= gate.home - gate.rise) {
        gate.part.body.vy = 0;
        gate.part.body.y = gate.home - gate.rise;
      }

    world.step(dt);
    for (const act of pending.splice(0)) act();

    for (const [pellet, from] of path) if (pellet.alive && !pellet.burst) ropeCuts(pellet, from.x, from.y);
    for (const pad of springs) pad.bounce = Math.max(0, pad.bounce - dt);

    // A stone rolls: its picture turns by the way it has gone.
    for (const part of parts)
      if (part.alive && part.kind === 'stone' && part.body.kind === 'dynamic') {
        part.rolled += (part.body.vx * dt) / part.spec.radius;
        part.body.angle = (part.rolled * 180) / Math.PI;
      }

    // Pellets come to rest, or leave the city, and are taken away.
    for (const pellet of pellets) {
      if (!pellet.alive) continue;
      pellet.life += dt;
      const { x, y, vx, vy } = pellet.body,
        slow = Math.hypot(vx, vy) < RULES.restSpeed;
      pellet.still = slow ? pellet.still + dt : 0;
      if (y > height + 200 || x < -200 || x > width + 200 || pellet.still > RULES.pelletRest || pellet.life > RULES.pelletLife) removePart(pellet);
    }
    // Loose parts that fall out of the city are gone.
    for (const part of parts) if (part.alive && part.body.kind === 'dynamic' && part.body.y > height + 300) removePart(part);

    // The city is still when nothing loose is moving, no gate is rising and no seesaw is turning.
    const moving =
      parts.some((part) => part.alive && part.body.kind === 'dynamic' && Math.hypot(part.body.vx, part.body.vy) > RULES.restSpeed * 2) ||
      gates.some((gate) => gate.part.body.vy !== 0) ||
      seesaws.some((saw) => saw.turning > 0);
    state.quietFor = moving || pellets.some((each) => each.alive) ? 0 : state.quietFor + dt;
    state.comboTime = Math.max(0, state.comboTime - dt);
    if (!state.won && !state.lost && state.shotsFired >= level.shots.length && state.quietFor > RULES.loseAfter) {
      state.lost = true;
      emit('lose', {});
    }
  }

  // Before the first shot the city settles: whatever was placed a little above its rest comes to rest, so a
  // shot does the same whenever it is fired. Nothing is told and nothing scores while it settles.
  settling = true;
  for (let t = 0; t < RULES.settle; t += RULES.step) once(RULES.step);
  settling = false;
  Object.assign(state, { time: 0, score: 0, combo: 0, comboTime: 0, quietFor: RULES.readyAfter });

  return {
    world,
    level,
    state,
    bow,
    width,
    height,
    parts,
    locks,
    plates,
    gates,
    seesaws,
    ropes,
    springs,
    pellets,
    ready,
    launch,
    fire,
    update,
    /** Stars for the shots it took: par or fewer is three, one more is two, any more is one. */
    stars: () => (!state.won ? 0 : state.shotsFired <= level.par ? 3 : state.shotsFired <= level.par + 1 ? 2 : 1),
    dispose: () => world.dispose()
  };
}
