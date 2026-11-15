// The rules of the raid, with nothing about drawing or sound in them. One
// `createGame()` holds a whole run: the operator, the weapons, the soldiers,
// the three data terminals, the supply crates and the way out. Each step it
// reads an input record and appends what happened to `game.events`, which the
// view, the sound and the screen text consume.
import { createCharacterMotor3D, createNavCrowd3D, createNavMesh3D, createPhysicsWorld3D } from '@egret/engine/world3d';
import {
  ENEMIES,
  ENEMY_BODY,
  GRENADE,
  MISSION,
  PLAYER,
  RARITY_WEIGHT,
  SUPPLIES,
  SWITCH_TIME,
  VALUABLES,
  WEAPONS,
} from './data.mjs';
import { BOXES, BOUNDS, PLACES, createWalkMesh, walkable } from './level.mjs';

/** Collision categories: the map, and thrown grenades (which bullets pass through). */
const LAYER_WORLD = 1,
  LAYER_GRENADE = 2;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const span = (x, z) => Math.sqrt(x * x + z * z);

/** A small repeatable random source, so a seed replays the same run. */
export function createRandom(seed) {
  let state = seed >>> 0 || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1));
  return next;
}

/** An input record with nothing pressed; `update` reads one of these each step. */
export const idleInput = () => ({
  moveX: 0, // strafe, -1 left to 1 right
  moveZ: 0, // -1 back to 1 forward
  lookYaw: 0, // turn since the last step, radians (positive turns left)
  lookPitch: 0, // positive looks up
  fire: false,
  aim: false,
  sprint: false,
  crouch: false,
  jump: false,
  reload: false,
  interact: false,
  heal: false,
  grenade: false,
  weapon: '', // 'rifle' or 'pistol' to switch
});

export function createGame(options = {}) {
  const random = createRandom(options.seed ?? 20261115);
  const world = createPhysicsWorld3D({ gravity: [0, -PLAYER.gravity, 0] });
  world.createBody({
    type: 'static',
    shape: { type: 'box', halfExtents: [120, 1, 120] },
    position: [0, -1, 0],
    friction: 0.9,
    layer: LAYER_WORLD,
  });
  for (const b of BOXES)
    if (b.solid)
      world.createBody({
        type: 'static',
        shape: { type: 'box', halfExtents: [b.w / 2, b.h / 2, b.d / 2] },
        position: [b.x, b.y, b.z],
        friction: 0.8,
        layer: LAYER_WORLD,
        userData: b,
      });

  const navMesh = createNavMesh3D(createWalkMesh());
  const crowd = createNavCrowd3D(navMesh);

  const motor = createCharacterMotor3D(world, {
    radius: PLAYER.radius,
    height: PLAYER.height,
    position: [PLACES.spawn.x, PLAYER.height / 2 + 0.05, PLACES.spawn.z],
    jumpSpeed: PLAYER.jump,
    gravity: PLAYER.gravity,
    stepHeight: 0.35,
    acceleration: 55,
    airControl: 0.3,
    pushForce: 0,
    mask: LAYER_WORLD,
  });

  const player = {
    x: PLACES.spawn.x,
    y: 0,
    z: PLACES.spawn.z,
    yaw: PLACES.spawn.yaw,
    pitch: 0,
    /** Extra upward tilt from recoil; it settles back by itself. */
    kick: 0,
    eye: PLAYER.eye,
    health: PLAYER.health,
    armor: PLAYER.armor,
    bandages: PLAYER.bandages,
    grenades: PLAYER.grenades,
    alive: true,
    grounded: true,
    crouching: false,
    sprinting: false,
    /** 0 from the hip to 1 fully aimed. */
    aim: 0,
    speed: 0,
    /** Seconds since last hurt. */
    calm: 99,
    /** Seconds left of bandaging, 0 when not. */
    healing: 0,
    weapon: 'rifle',
    /** Seconds left of drawing the weapon just switched to. */
    drawing: 0,
    stride: 0,
    noSprint: 0,
  };
  const weapons = {};
  for (const key of Object.keys(WEAPONS)) {
    const def = WEAPONS[key];
    weapons[key] = {
      def,
      ammo: def.mag,
      reserve: def.reserve,
      cooldown: 0,
      reloading: 0,
      reloadTime: 0,
      heat: 0,
      triggerHeld: false,
    };
  }

  const game = {
    random,
    world,
    navMesh,
    player,
    weapons,
    enemies: [],
    grenades: [],
    /** What happened this step; whoever reads them empties the list. */
    events: [],
    terminals: PLACES.terminals.map((place, index) => ({ ...place, index, done: false })),
    crates: [],
    /** 'intro', 'play', 'dead' or 'won'. */
    state: 'intro',
    t: 0,
    introLeft: MISSION.introSeconds,
    /** What can be used right now: { kind, target, progress, seconds } or undefined. */
    prompt: undefined,
    terminalsDone: 0,
    /** Seconds until the helicopter is over the pad; counts down once all terminals are done. */
    heliEta: MISSION.heliSeconds,
    /** Seconds stood on the helipad with the helicopter waiting. */
    extracting: 0,
    loot: [],
    lootValue: 0,
    stats: { shots: 0, hits: 0, headshots: 0, kills: 0, damageTaken: 0 },
  };
  const emit = (type, more) => game.events.push({ type, ...more });

  // ---- supply crates ---------------------------------------------------------------------
  const pickRarity = () => {
    let roll = random() * RARITY_WEIGHT.reduce((a, b) => a + b, 0);
    for (let r = 1; r < RARITY_WEIGHT.length; r++) if ((roll -= RARITY_WEIGHT[r]) < 0) return r;
    return 1;
  };
  PLACES.crates.forEach(([x, z, turn], index) => {
    const items = [SUPPLIES[index % SUPPLIES.length]];
    for (let n = random.int(1, 2); n > 0; n--) {
      const rarity = pickRarity();
      const choices = VALUABLES.filter((item) => item.rarity === rarity);
      items.push(choices[random.int(0, choices.length - 1)]);
    }
    game.crates.push({ index, x, z, turn, items, opened: false });
  });

  // ---- sight lines and shots -------------------------------------------------------------
  const rayFrom = [0, 0, 0],
    rayDir = [0, 0, 0];
  /** Distance to the first wall along a ray, or `reach` when nothing is hit. Also returns the hit through `lastWallHit`. */
  let lastWallHit;
  function wallDistance(ox, oy, oz, dx, dy, dz, reach) {
    rayFrom[0] = ox;
    rayFrom[1] = oy;
    rayFrom[2] = oz;
    rayDir[0] = dx;
    rayDir[1] = dy;
    rayDir[2] = dz;
    lastWallHit = world.raycast(rayFrom, rayDir, reach, LAYER_WORLD);
    return lastWallHit ? lastWallHit.distance : reach;
  }
  /** True when nothing solid lies between two points. */
  game.clearLine = (ax, ay, az, bx, by, bz) => {
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az,
      length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 1e-4) return true;
    return wallDistance(ax, ay, az, dx / length, dy / length, dz / length, length) >= length - 0.05;
  };
  /** The first living soldier a ray meets within `reach`: { enemy, distance, head }. */
  function rayEnemies(ox, oy, oz, dx, dy, dz, reach) {
    let best;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      // Head: a sphere.
      const hx = enemy.x - ox,
        hy = ENEMY_BODY.headY - oy,
        hz = enemy.z - oz;
      const along = hx * dx + hy * dy + hz * dz;
      if (along > 0 && along < reach + 1) {
        const off = hx * hx + hy * hy + hz * hz - along * along,
          rr = ENEMY_BODY.headRadius * ENEMY_BODY.headRadius;
        if (off < rr) {
          const distance = along - Math.sqrt(rr - off);
          if (distance < reach && (!best || distance < best.distance)) best = { enemy, distance, head: true };
        }
      }
      // Body: an upright cylinder from the feet to the shoulders.
      const a = dx * dx + dz * dz;
      if (a < 1e-9) continue;
      const fx = ox - enemy.x,
        fz = oz - enemy.z,
        b = fx * dx + fz * dz,
        c = fx * fx + fz * fz - ENEMY_BODY.radius * ENEMY_BODY.radius,
        disc = b * b - a * c;
      if (disc < 0) continue;
      const distance = (-b - Math.sqrt(disc)) / a;
      if (distance <= 0 || distance >= reach) continue;
      const y = oy + dy * distance;
      if (y < 0.02 || y > ENEMY_BODY.shoulder) continue;
      if (!best || distance < best.distance) best = { enemy, distance, head: false };
    }
    return best;
  }

  const eyeY = () => player.y + player.eye;
  /** The way the operator looks, recoil included, as a unit vector. */
  function lookDirection(out, yawOffset = 0, pitchOffset = 0) {
    const yaw = player.yaw + yawOffset,
      pitch = clamp(player.pitch + player.kick + pitchOffset, -PLAYER.pitchLimit, PLAYER.pitchLimit),
      flat = Math.cos(pitch);
    out[0] = -Math.sin(yaw) * flat;
    out[1] = Math.sin(pitch);
    out[2] = -Math.cos(yaw) * flat;
    return out;
  }

  // ---- hurting the operator --------------------------------------------------------------
  function hurtPlayer(amount, fromX, fromZ) {
    if (!player.alive || game.state !== 'play') return;
    const soaked = player.armor > 0 ? Math.min(player.armor, amount * PLAYER.armorShare) : 0;
    player.armor -= soaked;
    player.health -= amount - soaked;
    player.calm = 0;
    player.healing = 0;
    game.stats.damageTaken += amount;
    // Where it came from, as an angle from straight ahead (positive to the left).
    const bearing = Math.atan2(-(fromX - player.x), -(fromZ - player.z)) - player.yaw;
    emit('playerHit', { amount, bearing: Math.atan2(Math.sin(bearing), Math.cos(bearing)), armor: soaked > 0 });
    if (player.health <= PLAYER.health * 0.3 && !game.lowSaid) {
      game.lowSaid = true;
      emit('comms', { key: 'low' });
    }
    if (player.health <= 0) {
      player.health = 0;
      player.alive = false;
      game.state = 'dead';
      emit('playerDown', {});
    }
  }

  // ---- soldiers ----------------------------------------------------------------------------
  let nextEnemyId = 1;
  function spawnEnemy(kind, x, z, alerted) {
    const def = ENEMIES[kind];
    const enemy = {
      id: nextEnemyId++,
      def,
      kind,
      x,
      z,
      yaw: random.range(-Math.PI, Math.PI),
      health: def.health,
      dead: false,
      /** Seconds since death, for the view's fall. */
      deadFor: 0,
      /** Which way the killing shot pushed, for the view. */
      fallYaw: 0,
      aware: false,
      sees: false,
      /** Seconds the operator has been in view, for the reaction delay. */
      seenFor: 0,
      lastSeenX: x,
      lastSeenZ: z,
      think: random.range(0, 0.3),
      look: random.range(0, 0.2),
      burstLeft: 0,
      shotIn: 0,
      pauseLeft: random.range(0.4, 1),
      strafeIn: random.range(1, 3),
      /** Seconds since last firing, for the view's muzzle flash and pose. */
      firedAgo: 9,
      hurtAgo: 9,
      speed: 0,
      homeX: x,
      homeZ: z,
      wanderIn: random.range(2, 6),
      agent: crowd.addAgent({ position: [x, 0, z], radius: 0.4, speed: def.speed * 0.45, acceleration: 18 }),
    };
    if (alerted) alert(enemy, player.x, player.z);
    game.enemies.push(enemy);
    emit('enemySpawn', { enemy });
    return enemy;
  }
  function alert(enemy, x, z) {
    if (enemy.dead) return;
    if (!enemy.aware) {
      enemy.aware = true;
      enemy.think = 0;
      if (!game.contactSaid && game.state === 'play') {
        game.contactSaid = true;
        emit('comms', { key: 'contact' });
      }
    }
    enemy.lastSeenX = x;
    enemy.lastSeenZ = z;
  }
  /** Tell every soldier within `reach` of a noise where it came from. */
  function noise(x, z, reach) {
    for (const enemy of game.enemies) if (!enemy.dead && span(enemy.x - x, enemy.z - z) < reach) alert(enemy, player.x, player.z);
  }
  function hurtEnemy(enemy, amount, head, dirX, dirZ) {
    if (enemy.dead) return false;
    enemy.health -= amount;
    enemy.hurtAgo = 0;
    alert(enemy, player.x, player.z);
    if (enemy.health > 0) return false;
    enemy.dead = true;
    enemy.deadFor = 0;
    enemy.fallYaw = Math.atan2(-dirX, -dirZ);
    crowd.removeAgent(enemy.agent);
    enemy.agent = undefined;
    game.stats.kills++;
    if (head) game.stats.headshots++;
    emit('enemyDown', { enemy, head });
    // Comrades close by notice.
    for (const other of game.enemies)
      if (!other.dead && span(other.x - enemy.x, other.z - enemy.z) < 16) alert(other, player.x, player.z);
    return true;
  }
  game.aliveCount = () => {
    let n = 0;
    for (const enemy of game.enemies) if (!enemy.dead) n++;
    return n;
  };

  const target = [0, 0, 0];
  function walkTo(enemy, x, z, speed) {
    enemy.agent.speed = speed;
    target[0] = clamp(x, BOUNDS.minX + 0.6, BOUNDS.maxX - 0.6);
    target[2] = clamp(z, BOUNDS.minZ + 0.6, BOUNDS.maxZ - 0.6);
    enemy.agent.setTarget(target);
  }

  function enemyFire(enemy, distance) {
    const def = enemy.def;
    enemy.firedAgo = 0;
    // Harder to hit from far away, on the move, crouched, or in the first moments of a fight.
    let chance = clamp(def.aim - distance * 0.009, 0.12, def.aim);
    if (player.speed > PLAYER.walk + 0.5) chance *= 0.65;
    else if (player.speed > 1) chance *= 0.85;
    if (player.crouching) chance *= 0.8;
    if (enemy.seenFor < 1.2) chance *= 0.55;
    const hit = random() < chance;
    const fromY = 1.35,
      aimY = eyeY() - 0.35;
    let tx = player.x,
      ty = aimY,
      tz = player.z;
    if (!hit) {
      // A miss passes close by and carries on to whatever is behind.
      const side = (random() < 0.5 ? -1 : 1) * random.range(0.5, 1.4),
        dx = player.x - enemy.x,
        dz = player.z - enemy.z,
        len = span(dx, dz) || 1;
      tx += (-dz / len) * side;
      tz += (dx / len) * side;
      ty += random.range(-0.4, 0.7);
      const ex = tx - enemy.x,
        ey = ty - fromY,
        ez = tz - enemy.z,
        el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1,
        reach = wallDistance(enemy.x, fromY, enemy.z, ex / el, ey / el, ez / el, el + 30);
      tx = enemy.x + (ex / el) * reach;
      ty = fromY + (ey / el) * reach;
      tz = enemy.z + (ez / el) * reach;
    }
    emit('enemyShot', { enemy, hit, fromX: enemy.x, fromY, fromZ: enemy.z, toX: tx, toY: ty, toZ: tz });
    if (hit) hurtPlayer(def.damage, enemy.x, enemy.z);
  }

  function updateEnemy(enemy, dt) {
    const def = enemy.def;
    enemy.firedAgo += dt;
    enemy.hurtAgo += dt;
    if (enemy.dead) {
      enemy.deadFor += dt;
      return;
    }
    const agent = enemy.agent,
      px = agent.position[0],
      pz = agent.position[2];
    enemy.speed = span(px - enemy.x, pz - enemy.z) / Math.max(dt, 1e-4);
    enemy.x = px;
    enemy.z = pz;
    const dx = player.x - enemy.x,
      dz = player.z - enemy.z,
      distance = span(dx, dz);

    // Look for the operator a few times a second.
    enemy.look -= dt;
    if (enemy.look <= 0) {
      enemy.look = 0.15;
      let sees = false;
      if (player.alive && distance < MISSION.sight) {
        // Soldiers on guard only notice what is in front of them and not too far off, or right next to them.
        const facing = Math.cos(enemy.yaw) * -dz + Math.sin(enemy.yaw) * -dx;
        if (enemy.aware || distance < 5 || (distance < MISSION.guardSight && facing > distance * 0.25))
          sees = game.clearLine(enemy.x, ENEMY_BODY.eye, enemy.z, player.x, eyeY() - 0.1, player.z);
      }
      if (sees) alert(enemy, player.x, player.z);
      enemy.sees = sees;
    }
    enemy.seenFor = enemy.sees ? enemy.seenFor + dt : 0;

    // Decide where to go.
    enemy.think -= dt;
    enemy.strafeIn -= dt;
    if (!enemy.aware) {
      // On guard: stroll around the post.
      enemy.wanderIn -= dt;
      if (enemy.wanderIn <= 0) {
        enemy.wanderIn = random.range(4, 9);
        const wx = enemy.homeX + random.range(-5, 5),
          wz = enemy.homeZ + random.range(-5, 5);
        if (walkable(wx, wz)) walkTo(enemy, wx, wz, def.speed * 0.4);
      }
    } else if (enemy.think <= 0) {
      enemy.think = 0.4;
      const run = def.speed;
      if (!enemy.sees) {
        // Go to where the operator was last seen; once there, close in on the noise.
        if (span(enemy.lastSeenX - enemy.x, enemy.lastSeenZ - enemy.z) < 2) {
          enemy.lastSeenX = player.x;
          enemy.lastSeenZ = player.z;
        }
        walkTo(enemy, enemy.lastSeenX, enemy.lastSeenZ, run);
      } else if (distance > def.far) walkTo(enemy, player.x, player.z, run);
      else if (distance < def.near) {
        const bx = enemy.x - (dx / distance) * 4,
          bz = enemy.z - (dz / distance) * 4;
        if (walkable(bx, bz)) walkTo(enemy, bx, bz, run * 0.8);
        else agent.stop();
      } else if (enemy.strafeIn <= 0) {
        enemy.strafeIn = random.range(1.6, 3.6);
        const side = random() < 0.5 ? -1 : 1,
          reach = random.range(2, 4),
          sx = enemy.x + (-dz / distance) * side * reach,
          sz = enemy.z + (dx / distance) * side * reach;
        if (walkable(sx, sz)) walkTo(enemy, sx, sz, run * 0.6);
      } else if (agent.arrived) agent.stop();
    }

    // Face the operator when fighting, the way of travel otherwise.
    let want = enemy.yaw;
    if (enemy.sees) want = Math.atan2(-dx, -dz);
    else if (enemy.speed > 0.4) want = Math.atan2(-agent.velocity[0], -agent.velocity[2]);
    const turn = Math.atan2(Math.sin(want - enemy.yaw), Math.cos(want - enemy.yaw));
    enemy.yaw += clamp(turn, -dt * 7, dt * 7);

    // Shoot in bursts once the operator has been in view a moment.
    if (enemy.sees && enemy.seenFor > 0.45 && player.alive && game.state === 'play') {
      if (enemy.burstLeft > 0) {
        enemy.shotIn -= dt;
        if (enemy.shotIn <= 0) {
          enemy.shotIn = def.interval;
          enemy.burstLeft--;
          enemyFire(enemy, distance);
          if (enemy.burstLeft === 0) enemy.pauseLeft = random.range(def.pause[0], def.pause[1]);
        }
      } else {
        enemy.pauseLeft -= dt;
        if (enemy.pauseLeft <= 0) {
          enemy.burstLeft = random.int(def.burst[0], def.burst[1]);
          enemy.shotIn = 0;
        }
      }
    } else enemy.burstLeft = 0;
  }

  // ---- reinforcements ----------------------------------------------------------------------
  const queue = [];
  let spawnIn = 0,
    pursuitIn = MISSION.pursuitEvery,
    pursuitLeft = 0;
  function sendWave(wave) {
    for (const kind of Object.keys(wave)) for (let n = wave[kind]; n > 0; n--) queue.push(kind);
    // Mix the kinds so a wave does not arrive sorted.
    for (let i = queue.length - 1; i > 0; i--) {
      const j = random.int(0, i);
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  }
  /** An entry point far from the operator, out of sight when one can be found. */
  function pickEntry() {
    const far = PLACES.entries.filter(([x, z]) => span(x - player.x, z - player.z) >= MISSION.spawnFar);
    const hidden = far.filter(([x, z]) => !game.clearLine(x, 1.6, z, player.x, eyeY(), player.z));
    const pool = hidden.length ? hidden : far.length ? far : PLACES.entries;
    return pool[random.int(0, pool.length - 1)];
  }
  function updateWaves(dt) {
    spawnIn -= dt;
    if (queue.length && spawnIn <= 0 && game.aliveCount() < MISSION.maxAlive) {
      spawnIn = MISSION.spawnStagger;
      const [x, z] = pickEntry();
      spawnEnemy(queue.shift(), x + random.range(-0.8, 0.8), z + random.range(-0.8, 0.8), true);
    }
    if (game.terminalsDone === game.terminals.length && pursuitLeft > 0) {
      pursuitIn -= dt;
      if (pursuitIn <= 0 && !queue.length && game.aliveCount() < MISSION.pursuitMinAlive) {
        pursuitIn = MISSION.pursuitEvery;
        pursuitLeft--;
        queue.push(random() < 0.6 ? 'rifle' : 'rush');
      }
    }
  }

  // ---- weapons -----------------------------------------------------------------------------
  const aimDir = [0, 0, 0];
  function startReload(weapon) {
    if (weapon.reloading > 0 || weapon.ammo >= weapon.def.mag || weapon.reserve <= 0) return false;
    weapon.reloadTime = weapon.ammo <= 0 ? weapon.def.reloadEmpty : weapon.def.reload;
    weapon.reloading = weapon.reloadTime;
    emit('reload', { weapon: weapon.def.key, seconds: weapon.reloadTime, empty: weapon.ammo <= 0 });
    return true;
  }
  function fireWeapon(weapon) {
    const def = weapon.def;
    weapon.ammo--;
    weapon.cooldown = def.interval;
    game.stats.shots++;
    player.noSprint = 0.3;
    // The cone widens from the hip, on the move, in the air and as the barrel heats.
    let spread = def.spread[0] + (def.spread[1] - def.spread[0]) * player.aim;
    spread *= 1 + weapon.heat * 1.4;
    if (player.speed > 1) spread *= 1 + 0.5 * (1 - player.aim);
    if (!player.grounded) spread *= 2.2;
    if (player.crouching) spread *= 0.8;
    const angle = random() * Math.PI * 2,
      off = Math.sqrt(random()) * spread;
    lookDirection(aimDir, Math.cos(angle) * off, Math.sin(angle) * off);
    const ox = player.x,
      oy = eyeY(),
      oz = player.z;
    const wall = wallDistance(ox, oy, oz, aimDir[0], aimDir[1], aimDir[2], def.range),
      wallHit = lastWallHit,
      struck = rayEnemies(ox, oy, oz, aimDir[0], aimDir[1], aimDir[2], wall);
    const reach = struck ? struck.distance : wall;
    const shot = {
      weapon: def.key,
      fromX: ox,
      fromY: oy,
      fromZ: oz,
      toX: ox + aimDir[0] * reach,
      toY: oy + aimDir[1] * reach,
      toZ: oz + aimDir[2] * reach,
      enemy: undefined,
      head: false,
      killed: false,
      surface: undefined,
      normal: undefined,
    };
    if (struck) {
      const amount = def.damage * (struck.head ? struck.enemy.def.head : 1);
      game.stats.hits++;
      shot.enemy = struck.enemy;
      shot.head = struck.head;
      shot.killed = hurtEnemy(struck.enemy, amount, struck.head, aimDir[0], aimDir[2]);
    } else if (wallHit) {
      shot.surface = wallHit.body.userData?.kind ?? 'ground';
      shot.normal = [wallHit.normal[0], wallHit.normal[1], wallHit.normal[2]];
    }
    emit('shot', shot);
    // Kick: part of it stays, the rest settles back.
    const kick = def.recoil * (1 - 0.35 * player.aim) * random.range(0.8, 1.2);
    player.kick += kick * 0.65;
    player.pitch = clamp(player.pitch + kick * 0.35, -PLAYER.pitchLimit, PLAYER.pitchLimit);
    player.yaw += kick * random.range(-0.45, 0.45);
    weapon.heat = Math.min(1.3, weapon.heat + 0.09);
    noise(player.x, player.z, MISSION.hearing);
    if (weapon.ammo === 0 && weapon.reserve > 0) weapon.autoReload = 0.25;
  }
  function updateWeapons(dt, input) {
    for (const key of Object.keys(weapons)) {
      const w = weapons[key];
      w.cooldown = Math.max(0, w.cooldown - dt);
      w.heat = Math.max(0, w.heat - dt * 1.6);
    }
    const weapon = weapons[player.weapon];
    player.drawing = Math.max(0, player.drawing - dt);
    if (input.weapon && input.weapon !== player.weapon && weapons[input.weapon]) {
      weapon.reloading = 0;
      player.weapon = input.weapon;
      player.drawing = SWITCH_TIME;
      emit('switch', { weapon: input.weapon });
      return;
    }
    if (weapon.reloading > 0) {
      weapon.reloading -= dt;
      if (weapon.reloading <= 0) {
        const need = Math.min(weapon.def.mag - weapon.ammo, weapon.reserve);
        weapon.ammo += need;
        weapon.reserve -= need;
        weapon.reloading = 0;
        emit('reloaded', { weapon: weapon.def.key });
      }
    }
    if (weapon.autoReload > 0 && (weapon.autoReload -= dt) <= 0) startReload(weapon);
    if (input.reload) startReload(weapon);
    const ready = player.drawing <= 0 && weapon.reloading <= 0 && player.healing <= 0 && !player.sprinting;
    const pulled = input.fire && (weapon.def.auto || !weapon.triggerHeld);
    if (pulled && ready && weapon.cooldown <= 0) {
      if (weapon.ammo > 0) fireWeapon(weapon);
      else if (!weapon.triggerHeld) {
        emit('dry', { weapon: weapon.def.key });
        startReload(weapon);
      }
    }
    weapon.triggerHeld = input.fire;
  }

  // ---- grenades ----------------------------------------------------------------------------
  let grenadeHeld = false;
  function throwGrenade() {
    player.grenades--;
    lookDirection(aimDir);
    const body = world.createBody({
      shape: { type: 'sphere', radius: 0.07 },
      mass: 0.4,
      position: [player.x + aimDir[0] * 0.5, eyeY() - 0.1 + aimDir[1] * 0.5, player.z + aimDir[2] * 0.5],
      restitution: 0.35,
      friction: 0.7,
      linearDamping: 0.05,
      layer: LAYER_GRENADE,
      mask: LAYER_WORLD,
      continuous: true,
    });
    body.linearVelocity[0] = aimDir[0] * GRENADE.speed;
    body.linearVelocity[1] = aimDir[1] * GRENADE.speed + GRENADE.lift;
    body.linearVelocity[2] = aimDir[2] * GRENADE.speed;
    const grenade = { body, fuse: GRENADE.fuse, x: 0, y: 0, z: 0 };
    game.grenades.push(grenade);
    emit('throw', { grenade });
  }
  function explode(grenade) {
    const [x, y, z] = grenade.body.position;
    world.removeBody(grenade.body);
    emit('explosion', { x, y, z });
    noise(x, z, MISSION.hearing + 20);
    const oy = Math.max(y, 0.2) + 0.2;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const d = span(enemy.x - x, enemy.z - z);
      if (d > GRENADE.radius || !game.clearLine(x, oy, z, enemy.x, 1.1, enemy.z)) continue;
      hurtEnemy(enemy, Math.max(25, GRENADE.damage * (1 - d / GRENADE.radius)), false, enemy.x - x, enemy.z - z);
    }
    const d = span(player.x - x, player.z - z);
    if (d < GRENADE.radius && game.clearLine(x, oy, z, player.x, player.y + 1, player.z))
      hurtPlayer(GRENADE.selfDamage * (1 - d / GRENADE.radius), x, z);
  }
  function updateGrenades(dt, input) {
    if (input.grenade && !grenadeHeld && player.grenades > 0 && player.healing <= 0) throwGrenade();
    grenadeHeld = input.grenade;
    for (let i = game.grenades.length - 1; i >= 0; i--) {
      const grenade = game.grenades[i];
      grenade.x = grenade.body.position[0];
      grenade.y = grenade.body.position[1];
      grenade.z = grenade.body.position[2];
      if ((grenade.fuse -= dt) <= 0) {
        explode(grenade);
        game.grenades.splice(i, 1);
      }
    }
  }

  // ---- using things ------------------------------------------------------------------------
  function findUsable() {
    let best,
      bestScore = Infinity;
    const fx = -Math.sin(player.yaw),
      fz = -Math.cos(player.yaw);
    const consider = (kind, item, seconds) => {
      const dx = item.x - player.x,
        dz = item.z - player.z,
        distance = span(dx, dz);
      if (distance > MISSION.interactRange) return;
      // It has to be roughly ahead, unless it is right underfoot.
      if (distance > 0.7 && (dx * fx + dz * fz) / distance < 0.35) return;
      if (distance < bestScore) {
        bestScore = distance;
        best = { kind, target: item, seconds };
      }
    };
    for (const terminal of game.terminals) if (!terminal.done) consider('terminal', terminal, MISSION.downloadSeconds);
    for (const crate of game.crates) if (!crate.opened) consider('crate', crate, MISSION.searchSeconds);
    return best;
  }
  function take(item) {
    const give = item.give;
    if (give) {
      if (give.ammo) weapons.rifle.reserve += give.ammo;
      if (give.bandages) player.bandages += give.bandages;
      if (give.grenades) player.grenades += give.grenades;
      if (give.armor) player.armor = Math.min(PLAYER.armor, player.armor + give.armor);
    } else {
      game.loot.push(item);
      game.lootValue += item.value;
    }
  }
  function finishUse(use) {
    if (use.kind === 'crate') {
      use.target.opened = true;
      for (const item of use.target.items) take(item);
      emit('loot', { crate: use.target, items: use.target.items });
      return;
    }
    const terminal = use.target;
    terminal.done = true;
    game.terminalsDone++;
    game.lootValue += MISSION.intelValue;
    emit('terminal', { terminal, done: game.terminalsDone, total: game.terminals.length });
    sendWave(MISSION.waves[Math.min(game.terminalsDone, MISSION.waves.length) - 1]);
    noise(player.x, player.z, 200);
    if (game.terminalsDone === game.terminals.length) {
      pursuitLeft = MISSION.pursuitExtra;
      emit('comms', { key: 'all' });
    } else emit('comms', { key: 'cut' + game.terminalsDone });
  }
  let useProgress = 0,
    useTarget;
  function updateUse(dt, input) {
    const use = findUsable();
    if (!use || use.target !== useTarget) useProgress = 0;
    useTarget = use?.target;
    if (!use) {
      game.prompt = undefined;
      return;
    }
    if (input.interact && player.healing <= 0) {
      if (useProgress === 0) emit('useStart', { kind: use.kind });
      useProgress += dt;
      if (useProgress >= use.seconds) {
        finishUse(use);
        useProgress = 0;
        useTarget = undefined;
        game.prompt = undefined;
        return;
      }
    } else useProgress = 0;
    use.progress = useProgress / use.seconds;
    game.prompt = use;
  }

  // ---- the operator ------------------------------------------------------------------------
  let healHeld = false;
  function updatePlayer(dt, input) {
    player.yaw += input.lookYaw;
    player.pitch = clamp(player.pitch + input.lookPitch, -PLAYER.pitchLimit, PLAYER.pitchLimit);
    player.kick *= Math.exp(-dt * 7);

    player.crouching = input.crouch;
    player.noSprint = Math.max(0, player.noSprint - dt);
    const moving = Math.abs(input.moveX) + Math.abs(input.moveZ) > 0.05;
    player.sprinting =
      input.sprint &&
      input.moveZ > 0.5 &&
      !input.crouch &&
      !input.aim &&
      player.noSprint <= 0 &&
      player.healing <= 0 &&
      player.grounded;
    const wantAim =
      input.aim && !player.sprinting && weapons[player.weapon].reloading <= 0 && player.drawing <= 0 && player.healing <= 0;
    player.aim = clamp(player.aim + (wantAim ? dt : -dt) * 7, 0, 1);

    let speed = player.sprinting ? PLAYER.sprint : PLAYER.walk;
    if (player.crouching) speed = PLAYER.crouch;
    else if (player.aim > 0.5) speed = PLAYER.aimWalk;
    if (player.healing > 0) speed = Math.min(speed, PLAYER.crouch);
    let mx = clamp(input.moveX, -1, 1),
      mz = clamp(input.moveZ, -1, 1);
    const size = span(mx, mz);
    if (size > 1) {
      mx /= size;
      mz /= size;
    }
    const sin = Math.sin(player.yaw),
      cos = Math.cos(player.yaw);
    // Forward is (-sin, -cos); right is (cos, -sin).
    const wishX = (-sin * mz + cos * mx) * speed,
      wishZ = (-cos * mz - sin * mx) * speed;
    const wasGrounded = player.grounded,
      fall = motor.velocity[1];
    motor.update(dt, moving ? wishX : 0, moving ? wishZ : 0, input.jump && !player.crouching);
    const p = motor.position;
    const moved = span(p[0] - player.x, p[2] - player.z);
    player.speed = moved / Math.max(dt, 1e-4);
    player.x = p[0];
    player.y = p[1] - PLAYER.height / 2;
    player.z = p[2];
    player.grounded = motor.isGrounded;
    if (motor.jumped) emit('jump', {});
    if (player.grounded && !wasGrounded && fall < -3) emit('land', { speed: -fall });
    if (player.grounded && player.speed > 0.6) {
      player.stride += moved;
      const length = player.sprinting ? 2.1 : player.crouching ? 1.05 : 1.55;
      if (player.stride >= length) {
        player.stride = 0;
        emit('step', { sprint: player.sprinting, indoors: isIndoors(player.x, player.z) });
        if (player.sprinting) noise(player.x, player.z, 9);
      }
    }
    const eyeTarget = player.crouching ? PLAYER.crouchEye : PLAYER.eye;
    player.eye += (eyeTarget - player.eye) * Math.min(1, dt * 11);

    // Health: a little comes back alone; bandages do the rest.
    player.calm += dt;
    if (player.calm > PLAYER.regenDelay && player.health < PLAYER.regenTo)
      player.health = Math.min(PLAYER.regenTo, player.health + PLAYER.regenRate * dt);
    if (player.health > PLAYER.health * 0.5) game.lowSaid = false;
    if (input.heal && !healHeld && player.healing <= 0 && player.bandages > 0 && player.health < PLAYER.health) {
      player.healing = PLAYER.bandageTime;
      emit('healStart', {});
    }
    healHeld = input.heal;
    if (player.healing > 0 && (player.healing -= dt) <= 0) {
      player.healing = 0;
      player.bandages--;
      player.health = Math.min(PLAYER.health, player.health + PLAYER.bandageHeal);
      emit('healed', {});
    }
  }
  /** True under one of the two roofs, for footsteps and echoes. */
  function isIndoors(x, z) {
    return (x > -8 && x < 16 && z > -26 && z < -8) || (x > 22 && x < 36 && z > -20 && z < 2);
  }
  game.isIndoors = isIndoors;

  // ---- the way out -------------------------------------------------------------------------
  function updateExtraction(dt) {
    if (game.terminalsDone < game.terminals.length) return;
    if (game.heliEta > 0) {
      game.heliEta = Math.max(0, game.heliEta - dt);
      if (game.heliEta === 0) emit('comms', { key: 'arrived' });
      return;
    }
    const pad = PLACES.helipad;
    const inside = span(player.x - pad.x, player.z - pad.z) < pad.radius;
    if (inside && game.extracting === 0) emit('extractStart', {});
    game.extracting = inside ? game.extracting + dt : Math.max(0, game.extracting - dt * 2);
    if (game.extracting >= MISSION.extractSeconds) {
      game.state = 'won';
      emit('comms', { key: 'done' });
      emit('won', {});
    }
  }

  /** A grade for the debrief: S, A, B or C. */
  game.rating = () => {
    const accuracy = game.stats.shots ? game.stats.hits / game.stats.shots : 0;
    let points = 0;
    points += game.t < 300 ? 3 : game.t < 480 ? 2 : game.t < 720 ? 1 : 0;
    points += accuracy > 0.45 ? 2 : accuracy > 0.28 ? 1 : 0;
    points += game.lootValue > 220000 ? 2 : game.lootValue > 140000 ? 1 : 0;
    points += game.stats.damageTaken < 120 ? 2 : game.stats.damageTaken < 260 ? 1 : 0;
    return points >= 8 ? 'S' : points >= 6 ? 'A' : points >= 3 ? 'B' : 'C';
  };

  // ---- one step ----------------------------------------------------------------------------
  for (const [x, z, kind] of PLACES.guards) spawnEnemy(kind, x, z, false);
  game.events.length = 0;

  /** Advance the run by `dt` seconds (at most a twentieth of a second at a time). */
  game.update = (dt, input) => {
    dt = Math.min(dt, 0.05);
    if (game.state === 'intro') {
      // The operator can look around while the briefing plays, but not act.
      player.yaw += input.lookYaw;
      player.pitch = clamp(player.pitch + input.lookPitch, -PLAYER.pitchLimit, PLAYER.pitchLimit);
      if (game.introLeft === MISSION.introSeconds) emit('comms', { key: 'intro' });
      game.introLeft -= dt;
      if (game.introLeft <= 0) game.state = 'play';
      motor.update(dt, 0, 0, false);
      world.step(dt);
      return;
    }
    if (game.state === 'play') {
      game.t += dt;
      updatePlayer(dt, input);
      updateWeapons(dt, input);
      updateGrenades(dt, input);
      updateUse(dt, input);
      updateWaves(dt);
      updateExtraction(dt);
    } else {
      game.prompt = undefined;
      for (let i = game.grenades.length - 1; i >= 0; i--) {
        world.removeBody(game.grenades[i].body);
        game.grenades.splice(i, 1);
      }
    }
    crowd.update(dt);
    for (const enemy of game.enemies) updateEnemy(enemy, dt);
    // The fallen stay a while, then are cleared away.
    for (let i = game.enemies.length - 1; i >= 0; i--)
      if (game.enemies[i].dead && game.enemies[i].deadFor > 9) {
        emit('enemyGone', { enemy: game.enemies[i] });
        game.enemies.splice(i, 1);
      }
    world.step(dt);
  };

  return game;
}
