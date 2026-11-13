// The rules of a race: how karts drive, drift, bump and jump, how rivals
// steer, what the items do, and who is in which place. Nothing here touches
// the page or the renderer, so a whole race can run in Node (see
// tools/headless.mjs). The view and the sound read the kart fields and the
// `events` list after each update.
import { CLASSES, DRIVE, ITEMS, ITEM_KEYS, RACERS, racerTuning } from './data.mjs';
import { wrapAngle } from './track.mjs';

const clamp = (v, low, high) => (v < low ? low : v > high ? high : v);
const sign = (v) => (v < 0 ? -1 : 1);

/** A small repeatable random source, so a seed replays the same race. */
function randomSource(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Controls with nothing pressed. `steer` is -1 (left) to 1 (right). */
export const idleControls = () => ({ throttle: 0, brake: 0, steer: 0, drift: false, item: false });

/**
 * Start a race on `track`. `entries` lists the karts in grid order as
 * `{ racer, human }` where `racer` indexes RACERS; at most one is human.
 * `klass` indexes CLASSES. Call `startCountdown()` when the intro is over and
 * `update(dt, controls)` every frame with the human's controls.
 */
export function createRace({ track, entries, klass = 1, laps = 3, seed = 1 }) {
  const random = randomSource(seed);
  const rules = CLASSES[klass] ?? CLASSES[1];
  const lapLength = track.length;
  const race = {
    track,
    laps,
    klass: rules,
    /** 'grid' before the countdown, then 'countdown', 'race' and 'done'. */
    state: 'grid',
    time: 0, // seconds since GO
    countdown: DRIVE.countdown,
    karts: [],
    /** Firecrackers, balls, kites and rockets in play. */
    things: [],
    boxes: track.boxes.map((box, index) => ({ ...box, index, timer: 0 })),
    /** What happened in the last update; the caller empties it. */
    events: [],
    human: undefined,
    finishedCount: 0,
  };
  const emit = (type, more) => race.events.push({ type, ...more });
  let thunderWait = 0,
    rocketWait = 0,
    endTimer = 0,
    lastCount = 0;

  // ---- karts ----------------------------------------------------------------------
  entries.forEach((entry, index) => {
    const slot = track.gridSlot(index),
      racer = RACERS[entry.racer];
    const kart = {
      index,
      racer: entry.racer,
      human: Boolean(entry.human),
      tuning: racerTuning(racer),
      // Where it is and how it moves. Forward is (sin heading, cos heading).
      x: slot.x,
      y: slot.y,
      z: slot.z,
      vx: 0,
      vy: 0,
      vz: 0,
      heading: slot.heading,
      speed: 0, // along the heading; negative in reverse
      slip: 0, // sideways speed, positive to the right
      airborne: false,
      // Where that is on the track.
      station: -1,
      s: 0,
      lateral: 0,
      ground: slot.y,
      slope: 0, // how steeply the road climbs in the direction of travel
      grass: false,
      /** Metres driven since the start line; negative on the grid. */
      total: 0,
      lap: 0,
      place: index + 1,
      finished: false,
      finishTime: 0,
      lapStart: 0,
      bestLap: 0,
      wrongWay: false,
      // Driving state.
      steer: 0, // eased steering, for the wheels and the lean
      throttle: 0,
      drifting: false,
      driftDir: 1, // 1 drifts right, -1 left
      driftCharge: 0,
      driftLevel: 0,
      hop: 0, // seconds left of the little hop that starts a drift
      boost: 0,
      boostStrength: 1,
      bell: 0,
      shrink: 0,
      spin: 0,
      spinTotal: 1,
      spinKind: '',
      safe: 0, // seconds during which nothing can hit it
      stall: 0,
      rev: 0, // how long the accelerator has been held in the countdown
      fromRamp: false,
      trick: false,
      // Items.
      item: undefined,
      itemCount: 0,
      roulette: 0,
      // Bookkeeping.
      pace: 1,
      padWait: 0,
      rampWait: 0,
      wallWait: 0,
      bumpWait: 0,
      wrongTime: 0,
      stuck: 0,
      driftHeld: false,
      itemHeld: false,
      controls: idleControls(),
      ai: {
        lane: (random() * 2 - 1) * 0.5,
        laneTimer: random() * 3,
        itemDelay: 0,
        itemAge: 0,
        driftTime: 0,
        temper: 0.97 + random() * 0.06, // each rival is a touch faster or slower
        nerve: random(), // compared with the class's skill: decides rocket starts and drifting
      },
    };
    const at = track.locate(kart.x, kart.z, -1, {});
    kart.station = at.index;
    kart.s = at.s;
    kart.lateral = at.lateral;
    kart.total = track.delta(0, at.s);
    race.karts.push(kart);
    if (kart.human) race.human = kart;
  });

  // ---- boosts and hits -------------------------------------------------------------
  function boost(kart, seconds, strength, source) {
    kart.boostStrength = kart.boost > 0 ? Math.max(kart.boostStrength, strength) : strength;
    kart.boost = Math.max(kart.boost, seconds);
    kart.speed += 5 * strength;
    emit('boost', { kart: kart.index, source });
  }

  function endDrift(kart, fire) {
    if (!kart.drifting) return;
    const level = kart.driftLevel;
    kart.drifting = false;
    kart.driftLevel = 0;
    kart.driftCharge = 0;
    if (fire && level > 0) {
      emit('turbo', { kart: kart.index, level });
      boost(kart, DRIVE.turboSeconds[level - 1], DRIVE.turboStrength[level - 1], 'turbo');
    }
  }

  /** Hit a kart: 'spin', 'tumble' or 'shrink'. Returns whether it took effect. */
  function hit(kart, kind) {
    if (kart.bell > 0 || kart.finished) return false;
    if (kind === 'shrink') {
      kart.shrink = DRIVE.shrinkSeconds;
      kart.item = undefined;
      kart.itemCount = 0;
      kart.roulette = 0;
      if (kart.safe <= 0) {
        endDrift(kart, false);
        kart.boost = 0;
        spinOut(kart, 'spin', 0.8, 0.55);
      }
      emit('hit', { kart: kart.index, kind });
      return true;
    }
    if (kart.safe > 0) return false;
    endDrift(kart, false);
    kart.boost = 0;
    if (kind === 'tumble') spinOut(kart, 'tumble', DRIVE.tumbleSeconds, 0.12);
    else spinOut(kart, 'spin', DRIVE.spinSeconds, 0.45);
    emit('hit', { kart: kart.index, kind });
    return true;
  }
  function spinOut(kart, kind, seconds, keep) {
    kart.spinKind = kind;
    kart.spin = kart.spinTotal = seconds;
    kart.safe = Math.max(kart.safe, seconds + 1.4);
    kart.speed *= keep;
    kart.slip *= keep;
  }

  /** Put a kart back on the centre line, facing the right way. */
  function rescue(kart) {
    const at = track.sample(kart.s, 0, {});
    kart.x = at.x;
    kart.z = at.z;
    kart.y = at.y;
    kart.heading = at.heading;
    kart.speed = kart.slip = kart.vy = 0;
    kart.airborne = false;
    kart.stuck = 0;
    kart.safe = Math.max(kart.safe, 1.5);
    endDrift(kart, false);
    emit('rescue', { kart: kart.index });
  }

  // ---- items -----------------------------------------------------------------------
  function rollItem(kart) {
    const column = clamp(kart.place, 1, 8) - 1;
    let sum = 0;
    const weights = ITEM_KEYS.map((key) => {
      let weight = ITEMS[key].chances[column];
      // One storm or rocket at a time is plenty.
      if (key === 'thunder' && thunderWait > 0) weight = 0;
      if (key === 'rocket' && rocketWait > 0) weight = 0;
      sum += weight;
      return weight;
    });
    let pick = random() * sum,
      chosen = 'chili';
    for (let i = 0; i < ITEM_KEYS.length; i++) {
      pick -= weights[i];
      if (pick < 0) {
        chosen = ITEM_KEYS[i];
        break;
      }
    }
    if (chosen === 'thunder') thunderWait = 30;
    if (chosen === 'rocket') rocketWait = 15;
    kart.item = chosen;
    kart.itemCount = ITEMS[chosen].count ?? 1;
    kart.ai.itemDelay = 0.8 + random() * 2.5;
    kart.ai.itemAge = 0;
    emit('item', { kart: kart.index, item: chosen });
  }

  function useItem(kart) {
    const item = kart.item;
    if (!item || kart.roulette > 0 || kart.spin > 0) return;
    const fx = Math.sin(kart.heading),
      fz = Math.cos(kart.heading);
    kart.itemCount--;
    if (kart.itemCount <= 0) kart.item = undefined;
    emit('use', { kart: kart.index, item });
    if (item === 'chili' || item === 'chili3') boost(kart, DRIVE.chiliSeconds, 1, 'chili');
    else if (item === 'firecracker')
      race.things.push({
        kind: 'firecracker',
        owner: kart.index,
        x: kart.x - fx * 2.8,
        y: kart.ground,
        z: kart.z - fz * 2.8,
        life: 60,
        arm: 0.5,
        age: 0,
      });
    else if (item === 'cuju') {
      const pace = Math.max(kart.speed, 18) + 26;
      race.things.push({
        kind: 'cuju',
        owner: kart.index,
        x: kart.x + fx * 2.8,
        y: kart.ground,
        z: kart.z + fz * 2.8,
        vx: fx * pace,
        vz: fz * pace,
        station: kart.station,
        bounces: 6,
        life: 9,
        arm: 0.4,
        age: 0,
      });
    } else if (item === 'kite') {
      // Chases whoever is one place ahead.
      const target = race.karts.find((other) => other.place === kart.place - 1);
      race.things.push({
        kind: 'kite',
        owner: kart.index,
        target: target?.index ?? -1,
        s: kart.s + 3,
        lateral: kart.lateral,
        x: kart.x,
        y: kart.ground,
        z: kart.z,
        heading: kart.heading,
        life: 10,
        arm: 0.5,
        age: 0,
      });
    } else if (item === 'rocket')
      race.things.push({
        kind: 'rocket',
        owner: kart.index,
        s: kart.s + 3,
        lateral: kart.lateral,
        x: kart.x,
        y: kart.ground,
        z: kart.z,
        heading: kart.heading,
        height: 0,
        dive: 0,
        life: 25,
        age: 0,
      });
    else if (item === 'bell') {
      kart.bell = DRIVE.bellSeconds;
      kart.shrink = 0;
      if (kart.spin > 0) kart.spin = 0;
    } else if (item === 'thunder') {
      emit('thunder', { kart: kart.index });
      for (const other of race.karts) if (other !== kart) hit(other, 'shrink');
    }
  }

  const spot = {},
    here = {};
  function updateThings(dt) {
    for (const thing of race.things) {
      thing.age += dt;
      thing.life -= dt;
      if (thing.arm > 0) thing.arm -= dt;
      if (thing.kind === 'cuju') {
        thing.x += thing.vx * dt;
        thing.z += thing.vz * dt;
        const at = track.locate(thing.x, thing.z, thing.station, here);
        thing.station = at.index;
        thing.y = at.y;
        // Bounce off the walls: mirror the speed across the track's direction.
        const reach = at.limit - 0.6;
        if (Math.abs(at.lateral) > reach) {
          const rx = -Math.cos(at.heading),
            rz = Math.sin(at.heading),
            side = sign(at.lateral),
            out = thing.vx * rx + thing.vz * rz;
          thing.x -= rx * side * (Math.abs(at.lateral) - reach);
          thing.z -= rz * side * (Math.abs(at.lateral) - reach);
          if (out * side > 0) {
            thing.vx -= 2 * out * rx;
            thing.vz -= 2 * out * rz;
            thing.bounces--;
            emit('bounce', { x: thing.x, y: thing.y, z: thing.z });
          }
          if (thing.bounces < 0) thing.life = 0;
        }
      } else if (thing.kind === 'kite') {
        const target = race.karts[thing.target];
        thing.s += 58 * dt;
        // Line up with the target once it is close; otherwise hold the middle of the road.
        let aim = 0;
        if (target && !target.finished) {
          const gap = track.delta(thing.s, target.s);
          if (gap > -4 && gap < 50) aim = target.lateral;
        }
        thing.lateral += clamp(aim - thing.lateral, -10 * dt, 10 * dt);
        const at = track.sample(thing.s, thing.lateral, spot);
        thing.x = at.x;
        thing.y = at.y;
        thing.z = at.z;
        thing.heading = at.heading;
      } else if (thing.kind === 'rocket') {
        const leader = race.karts.find((kart) => kart.place === 1 && !kart.finished) ?? race.karts.find((kart) => !kart.finished);
        if (!leader) thing.life = 0;
        else if (thing.dive > 0 || Math.abs(track.delta(thing.s, leader.s)) < 12) {
          // Over the leader: drop on it and go off.
          thing.dive += dt;
          const k = clamp(thing.dive / 0.45, 0, 1);
          thing.x += (leader.x - thing.x) * k;
          thing.z += (leader.z - thing.z) * k;
          thing.y = leader.y + thing.height * (1 - k);
          if (k >= 1) {
            emit('explosion', { x: thing.x, y: leader.y, z: thing.z });
            for (const kart of race.karts) if (Math.hypot(kart.x - thing.x, kart.z - thing.z) < 8) hit(kart, 'tumble');
            thing.life = 0;
            thing.silent = true;
          }
        } else {
          thing.s += 95 * dt;
          thing.height = Math.min(9, thing.height + 14 * dt);
          thing.lateral *= Math.max(0, 1 - dt * 2);
          const at = track.sample(thing.s, thing.lateral, spot);
          thing.x = at.x;
          thing.y = at.y + thing.height;
          thing.z = at.z;
          thing.heading = at.heading;
        }
      }
      // Anything on the road hits the first kart it touches.
      if (thing.kind !== 'rocket' && thing.life > 0) {
        for (const kart of race.karts) {
          if (kart.finished || (thing.arm > 0 && kart.index === thing.owner)) continue;
          if (kart.airborne && kart.y - kart.ground > 1.6) continue;
          if (Math.hypot(kart.x - thing.x, kart.z - thing.z) > DRIVE.radius + 0.7) continue;
          hit(kart, thing.kind === 'firecracker' ? 'spin' : 'tumble');
          thing.life = 0;
          break;
        }
      }
      if (thing.life <= 0 && !thing.silent) emit('pop', { kind: thing.kind, x: thing.x, y: thing.y, z: thing.z });
    }
    race.things = race.things.filter((thing) => thing.life > 0);
  }

  // ---- rivals ----------------------------------------------------------------------
  const between = (value, low, high) => value > low && value < high;
  const ahead = {},
    aim = {};
  /** Fill `controls` for a kart the game drives. */
  function drive(kart, dt, controls) {
    const ai = kart.ai,
      skill = rules.skill,
      speed = Math.abs(kart.speed);
    const stationAt = (metres) => (kart.station + Math.round(metres / track.step) + track.count) % track.count;

    // How sharply the road turns just ahead, and the slowest corner within braking distance.
    let near = 0,
      brake = false;
    const turn = kart.tuning.turnRate * (0.78 + 0.3 * skill);
    for (let d = 3; d <= 75; d += track.step) {
      const k = track.curvature[stationAt(d)];
      if (d <= 26) near += k;
      const cornerSpeed = turn / Math.max(Math.abs(k), 1e-4);
      if (speed * speed > cornerSpeed * cornerSpeed + 2 * 30 * d) brake = true;
    }
    near /= Math.floor(23 / track.step) + 1;

    // Where across the road to aim: a lane of its own on straights, the inside of corners.
    ai.laneTimer -= dt;
    if (ai.laneTimer <= 0) {
      ai.laneTimer = 2 + random() * 4;
      ai.lane = (random() * 2 - 1) * 0.55;
    }
    const half = track.halfWidth[kart.station] - 1.6,
      corner = Math.min(1, Math.abs(near) * 28);
    let lateral = ai.lane * half * (1 - corner) + -sign(near) * half * 0.6 * corner;
    // Without an item, steer for the next row of boxes; with room, take a boost pad.
    if (!kart.item && kart.roulette <= 0) {
      for (const box of race.boxes) {
        const gap = track.delta(kart.s, box.s);
        if (box.timer <= 0 && gap > 4 && gap < 45 && Math.abs(box.lateral - lateral) < 3.2) lateral = box.lateral;
      }
    }
    for (const pad of track.pads) {
      const gap = track.delta(kart.s, pad.s);
      if (gap > 4 && gap < 40 && Math.abs(pad.lateral - lateral) < 4 * skill) lateral = pad.lateral;
    }
    // Go around firecrackers.
    for (const thing of race.things) {
      if (thing.kind !== 'firecracker') continue;
      const at = track.locate(thing.x, thing.z, -1, ahead),
        gap = track.delta(kart.s, at.s);
      if (gap > 0 && gap < 30 && Math.abs(at.lateral - lateral) < 2.8 && random() < 0.5 + skill * 0.5)
        lateral = at.lateral + (lateral >= at.lateral ? 3.2 : -3.2);
    }
    lateral = clamp(lateral, -half, half);

    const point = track.sample(kart.s + 9 + speed * 0.5, lateral, aim),
      wanted = Math.atan2(point.x - kart.x, point.z - kart.z),
      off = wrapAngle(wanted - kart.heading);
    // A larger heading is a turn to the left, and positive steering turns right.
    controls.steer = clamp(-off * 2.8, -1, 1);
    controls.throttle = brake ? 0 : 1;
    controls.brake = brake ? 1 : 0;
    // Pointing the wrong way after a spin: back up and turn.
    if (Math.abs(off) > 2 && speed < 6) {
      controls.throttle = 0;
      controls.brake = 1;
      controls.steer = -controls.steer;
    }

    // Drift through long corners and let go on the way out.
    const here = track.curvature[kart.station];
    if (kart.drifting) {
      ai.driftTime += dt;
      const turning = Math.abs(near) > 1 / 75 && sign(near) === -kart.driftDir;
      controls.drift = turning || ai.driftTime < 0.5;
    } else {
      ai.driftTime = 0;
      controls.drift =
        !brake &&
        !kart.airborne &&
        speed > 18 &&
        Math.abs(near) > 1 / 48 &&
        Math.abs(here) > 1 / 90 &&
        sign(near) === sign(here) &&
        Math.abs(controls.steer) > 0.25 &&
        sign(controls.steer) === -sign(near) &&
        ai.nerve < skill;
    }

    // Items.
    controls.item = false;
    if (kart.item) {
      ai.itemAge += dt;
      if (ai.itemAge > ai.itemDelay) {
        const straight = Math.abs(near) < 1 / 120;
        let use = false;
        if (kart.item === 'chili' || kart.item === 'chili3') use = straight && kart.boost <= 0 && !kart.grass;
        else if (kart.item === 'firecracker')
          use = ai.itemAge > 9 || race.karts.some((other) => other !== kart && between(track.delta(other.s, kart.s), 2, 14));
        else if (kart.item === 'cuju')
          use =
            ai.itemAge > 10 ||
            (straight &&
              race.karts.some(
                (other) =>
                  other !== kart && between(track.delta(kart.s, other.s), 4, 36) && Math.abs(other.lateral - kart.lateral) < 4,
              ));
        else if (kart.item === 'kite' || kart.item === 'rocket' || kart.item === 'thunder')
          use = kart.place > 1 || ai.itemAge > 12;
        else use = true;
        if (use) {
          controls.item = true;
          ai.itemAge = ai.itemDelay - 0.6; // a breath between uses of a triple
        }
      }
    }
  }

  // ---- one kart, one step ----------------------------------------------------------
  const at = {};
  function stepKart(kart, controls, dt) {
    const tuning = kart.tuning,
      racing = race.state === 'race';
    for (const key of ['boost', 'bell', 'shrink', 'spin', 'safe', 'stall', 'hop', 'padWait', 'rampWait', 'wallWait', 'bumpWait'])
      if (kart[key] > 0) kart[key] = Math.max(0, kart[key] - dt);
    if (kart.roulette > 0) {
      kart.roulette -= dt;
      if (kart.roulette <= 0) rollItem(kart);
    }

    const free = racing && kart.spin <= 0 && kart.stall <= 0;
    const throttle = free ? controls.throttle : 0,
      brake = free ? controls.brake : 0,
      steer = free ? controls.steer : 0;
    kart.throttle = racing ? controls.throttle : 0;
    kart.steer += (steer - kart.steer) * Math.min(1, dt * 10);
    // Revving on the grid decides the start.
    if (race.state === 'countdown') kart.rev = controls.throttle > 0.5 ? kart.rev + dt : 0;

    // Using an item and starting a drift happen on the press, not while held.
    if (free && controls.item && !kart.itemHeld) useItem(kart);
    kart.itemHeld = controls.item;
    const driftPressed = free && controls.drift && !kart.driftHeld;
    kart.driftHeld = controls.drift;

    // ---- speed along the heading ----
    let top = tuning.topSpeed * rules.speed * kart.pace;
    if (kart.shrink > 0) top *= DRIVE.shrinkSpeed;
    const pushed = kart.boost > 0 || kart.bell > 0;
    if (kart.grass && !pushed) top *= DRIVE.grassFactor;
    if (kart.bell > 0) top += DRIVE.bellBonus;
    if (kart.boost > 0) top += DRIVE.boostBonus * kart.boostStrength;
    let speed = kart.speed;
    if (!kart.airborne) {
      if (kart.boost > 0 && speed < top) speed = Math.min(top, speed + DRIVE.boostPush * dt);
      else if (throttle > 0 && speed < top)
        // Pick-up fades toward the top speed.
        speed = Math.min(top, speed + tuning.acceleration * throttle * (1 - 0.55 * clamp(speed / top, 0, 1) ** 2) * dt);
      if (brake > 0) {
        if (speed > 0.5) speed = Math.max(0, speed - DRIVE.braking * brake * dt);
        else if (throttle <= 0) speed = Math.max(-DRIVE.reverseSpeed, speed - tuning.acceleration * 0.7 * brake * dt);
      }
      if (throttle <= 0 && brake <= 0 && kart.boost <= 0) speed -= sign(speed) * Math.min(Math.abs(speed), DRIVE.coasting * dt);
      if (speed > top) speed -= Math.min(speed - top, (kart.grass && !pushed ? 48 : 16) * dt);
      // Hills: slower up, faster down.
      speed -= kart.slope * DRIVE.gravity * 0.35 * dt;
    }

    // ---- hop and drift ----
    if (driftPressed) {
      if (kart.airborne) kart.trick = kart.fromRamp;
      else {
        kart.hop = 0.28;
        emit('hop', { kart: kart.index });
      }
    }
    if (
      !kart.drifting &&
      controls.drift &&
      free &&
      !kart.airborne &&
      kart.hop > 0 &&
      Math.abs(steer) > 0.3 &&
      speed > DRIVE.driftMinSpeed
    ) {
      kart.drifting = true;
      kart.driftDir = sign(steer);
      kart.driftCharge = 0;
      kart.driftLevel = 0;
      emit('drift', { kart: kart.index });
    }
    if (kart.drifting) {
      if (!controls.drift || !free) endDrift(kart, free);
      else if (speed < 8) endDrift(kart, false);
      else {
        // Steering into the drift charges it faster.
        kart.driftCharge += dt * tuning.driftCharge * (0.75 + 0.5 * Math.max(0, steer * kart.driftDir));
        const level = DRIVE.driftLevels.filter((seconds) => kart.driftCharge >= seconds).length;
        if (level > kart.driftLevel) {
          kart.driftLevel = level;
          emit('driftLevel', { kart: kart.index, level });
        }
      }
    }

    // ---- turning ----
    let yaw;
    if (kart.drifting) yaw = kart.driftDir * (0.62 + 0.5 * steer * kart.driftDir) * tuning.turnRate * 1.08;
    else {
      // Steering needs some speed, but a kart held against a wall can still turn away from it.
      const rolling = Math.max(clamp(Math.abs(speed) / 9, 0, 1), throttle > 0 || brake > 0 ? 0.4 : 0),
        authority = rolling * (1 - 0.16 * clamp(Math.abs(speed) / tuning.topSpeed, 0, 1));
      yaw = steer * tuning.turnRate * authority * (speed < -0.5 ? -1 : 1);
    }
    if (kart.airborne) yaw *= 0.45;
    // World velocity before the turn, measured again along the new heading.
    let fx = Math.sin(kart.heading),
      fz = Math.cos(kart.heading);
    const vx = fx * speed - fz * kart.slip,
      vz = fz * speed + fx * kart.slip;
    kart.heading = wrapAngle(kart.heading - yaw * dt);
    fx = Math.sin(kart.heading);
    fz = Math.cos(kart.heading);
    speed = vx * fx + vz * fz;
    let slip = vx * -fz + vz * fx;
    // Grip kills the sideways part; most of that speed carries into the new direction.
    const before = Math.hypot(speed, slip),
      grip = kart.airborne ? DRIVE.airGrip : kart.drifting ? DRIVE.driftGrip : DRIVE.grip;
    slip *= Math.exp(-grip * dt);
    const after = Math.hypot(speed, slip);
    if (after > 0.01 && !kart.airborne) {
      const kept = after + (before - after) * 0.85;
      speed = sign(speed) * Math.sqrt(Math.max(0, kept * kept - slip * slip));
    }

    // ---- move, then ask the track where that is ----
    kart.x += (fx * speed - fz * slip) * dt;
    kart.z += (fz * speed + fx * slip) * dt;
    const previous = kart.s;
    track.locate(kart.x, kart.z, kart.station, at);
    kart.station = at.index;

    // Walls: slide along, lose a little speed, bounce off a little.
    const reach = at.limit - DRIVE.radius;
    if (Math.abs(at.lateral) > reach) {
      const rx = -Math.cos(at.heading),
        rz = Math.sin(at.heading),
        side = sign(at.lateral),
        over = Math.abs(at.lateral) - reach;
      kart.x -= rx * side * over;
      kart.z -= rz * side * over;
      at.lateral = side * reach;
      let wx = fx * speed - fz * slip,
        wz = fz * speed + fx * slip;
      const into = (wx * rx + wz * rz) * side;
      if (into > 0) {
        wx -= 1.35 * into * side * rx;
        wz -= 1.35 * into * side * rz;
        const drag = 1 - Math.min(0.5, into * 0.03);
        speed = (wx * fx + wz * fz) * drag;
        slip = (wx * -fz + wz * fx) * drag;
        if (into > 5 && kart.wallWait <= 0) {
          kart.wallWait = 0.4;
          emit('wall', { kart: kart.index, hard: into > 12 });
          if (kart.drifting) endDrift(kart, false);
        }
      }
    }
    kart.s = at.s;
    kart.lateral = at.lateral;
    kart.ground = at.y;
    kart.slope = at.slope * Math.cos(wrapAngle(kart.heading - at.heading));
    kart.grass = !at.bridge && Math.abs(at.lateral) > at.halfWidth + 0.7;
    kart.speed = speed;
    kart.slip = slip;
    kart.vx = fx * speed - fz * slip;
    kart.vz = fz * speed + fx * slip;

    // ---- up and down ----
    if (kart.airborne) {
      kart.vy -= DRIVE.gravity * dt;
      kart.y += kart.vy * dt;
      if (kart.y <= kart.ground) {
        kart.y = kart.ground;
        kart.airborne = false;
        emit('land', { kart: kart.index });
        if (kart.fromRamp && kart.trick) boost(kart, 0.7, 0.8, 'trick');
        kart.fromRamp = kart.trick = false;
      }
    } else kart.y = kart.ground;

    // ---- ramps and boost pads ----
    if (!kart.airborne) {
      if (kart.rampWait <= 0 && speed > 12)
        for (const ramp of track.ramps)
          if (Math.abs(track.delta(ramp.s, kart.s)) < ramp.halfLength && Math.abs(kart.lateral - ramp.lateral) < ramp.halfWidth) {
            kart.airborne = true;
            kart.fromRamp = true;
            kart.trick = false;
            kart.vy = 9 + 0.16 * speed;
            kart.rampWait = 1.5;
            emit('jump', { kart: kart.index });
            break;
          }
      if (kart.padWait <= 0)
        for (const pad of track.pads)
          if (Math.abs(track.delta(pad.s, kart.s)) < pad.halfLength && Math.abs(kart.lateral - pad.lateral) < pad.halfWidth) {
            kart.padWait = 1;
            boost(kart, DRIVE.padSeconds, 1, 'pad');
            break;
          }
    }

    // ---- item boxes ----
    for (const box of race.boxes) {
      if (box.timer > 0 || Math.hypot(kart.x - box.x, kart.z - box.z) > 2.4 || kart.y - kart.ground > 2.5) continue;
      box.timer = 4;
      emit('box', { kart: kart.index, box: box.index });
      if (!kart.item && kart.roulette <= 0 && !kart.finished) kart.roulette = kart.human ? 1.7 : 1.1;
    }

    // ---- progress around the lap ----
    kart.total += clamp(track.delta(previous, kart.s), -25, 25);
    if (racing && !kart.finished) {
      const lap = Math.floor(kart.total / lapLength) + 1;
      if (lap > kart.lap) {
        if (kart.lap >= 1) {
          const lapTime = race.time - kart.lapStart;
          if (!kart.bestLap || lapTime < kart.bestLap) kart.bestLap = lapTime;
        }
        kart.lapStart = race.time;
        kart.lap = lap;
        if (lap > laps) {
          kart.finished = true;
          kart.finishTime = race.time;
          kart.lap = laps;
          kart.place = ++race.finishedCount;
          endDrift(kart, false);
          emit('finish', { kart: kart.index, place: kart.place });
        } else if (lap > 1) emit('lap', { kart: kart.index, lap, final: lap === laps });
      }
      // Driving against the flow for a moment shows the warning.
      const against = Math.cos(wrapAngle(kart.heading - at.heading)) < -0.3 && speed > 4;
      kart.wrongTime = against ? kart.wrongTime + dt : 0;
      kart.wrongWay = kart.wrongTime > 1;
      // A rival that has stopped moving is put back on the road.
      if (!kart.human || kart.finished) {
        kart.stuck = Math.abs(speed) < 2.5 && kart.spin <= 0 ? kart.stuck + dt : 0;
        if (kart.stuck > 2.2 || kart.wrongTime > 2.5) rescue(kart);
      }
    }
  }

  /** Push overlapping karts apart; the heavier one gives way less. */
  function collide() {
    const karts = race.karts;
    for (let i = 0; i < karts.length; i++)
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i],
          b = karts[j],
          dx = b.x - a.x,
          dz = b.z - a.z,
          distance = Math.hypot(dx, dz),
          reach = DRIVE.radius * 2;
        if (distance >= reach || distance < 1e-4 || Math.abs(a.y - b.y) > 1.5) continue;
        const nx = dx / distance,
          nz = dz / distance,
          massA = a.tuning.mass * (a.bell > 0 ? 25 : a.shrink > 0 ? 0.35 : 1),
          massB = b.tuning.mass * (b.bell > 0 ? 25 : b.shrink > 0 ? 0.35 : 1),
          shareA = massB / (massA + massB),
          overlap = reach - distance;
        a.x -= nx * overlap * shareA;
        a.z -= nz * overlap * shareA;
        b.x += nx * overlap * (1 - shareA);
        b.z += nz * overlap * (1 - shareA);
        const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (closing > 0) {
          const push = closing * 1.3;
          shove(a, -nx * push * shareA, -nz * push * shareA);
          shove(b, nx * push * (1 - shareA), nz * push * (1 - shareA));
          if (closing > 3 && a.bumpWait <= 0) {
            a.bumpWait = b.bumpWait = 0.3;
            emit('bump', { kart: a.index, other: b.index });
          }
        }
        // A golden bell knocks others spinning, and a full-size kart flattens a shrunken one.
        if (a.bell > 0 && b.bell <= 0) hit(b, 'spin');
        else if (b.bell > 0 && a.bell <= 0) hit(a, 'spin');
        else if (a.shrink > 0 && b.shrink <= 0) hit(a, 'spin');
        else if (b.shrink > 0 && a.shrink <= 0) hit(b, 'spin');
      }
  }
  /** Add a world-space push to a kart's speed. */
  function shove(kart, dvx, dvz) {
    const fx = Math.sin(kart.heading),
      fz = Math.cos(kart.heading);
    kart.vx += dvx;
    kart.vz += dvz;
    kart.speed = kart.vx * fx + kart.vz * fz;
    kart.slip = kart.vx * -fz + kart.vz * fx;
  }

  function rank() {
    const order = race.karts.filter((kart) => !kart.finished).sort((a, b) => b.total - a.total);
    order.forEach((kart, index) => {
      kart.place = race.finishedCount + index + 1;
    });
  }

  function step(dt, humanControls) {
    if (race.state === 'countdown') {
      race.countdown -= dt;
      const count = Math.ceil(race.countdown);
      if (count !== lastCount && count > 0) emit('count', { n: count });
      lastCount = count;
      if (race.countdown <= 0) {
        race.state = 'race';
        emit('go', {});
        for (const kart of race.karts) {
          // Pressing the accelerator late in the countdown gives a rocket start; too early stalls.
          const held = kart.human ? kart.rev : kart.ai.nerve < rules.skill * 0.7 ? 0.5 : 0;
          if (held >= 0.2 && held <= 0.95) boost(kart, 1.2, 1, 'start');
          else if (held > 0.95 && held <= 1.4) boost(kart, 0.5, 0.7, 'start');
          else if (held > 1.4) {
            kart.stall = 0.9;
            emit('stall', { kart: kart.index });
          }
        }
      }
    } else if (race.state === 'race') race.time += dt;
    if (thunderWait > 0) thunderWait -= dt;
    if (rocketWait > 0) rocketWait -= dt;

    const human = race.human;
    for (const kart of race.karts) {
      // Rivals keep close to the player: quicker when behind, easing off when far ahead.
      if (!kart.human)
        kart.pace =
          rules.rivals * kart.ai.temper * (human ? 1 + rules.catchUp * clamp((human.total - kart.total) / 90, -1, 1) : 1);
      let controls = humanControls;
      if (!kart.human || kart.finished || !humanControls) {
        controls = kart.controls;
        drive(kart, dt, controls);
        // After the flag a kart cruises on.
        if (kart.finished) {
          controls.throttle *= 0.6;
          controls.item = false;
          controls.drift = false;
        }
      }
      stepKart(kart, controls, dt);
    }
    collide();
    updateThings(dt);
    for (const box of race.boxes) if (box.timer > 0) box.timer -= dt;
    if (race.state === 'race') {
      rank();
      // The race ends when everyone is home, or a while after the player is.
      if (human?.finished) endTimer += dt;
      if (race.finishedCount === race.karts.length || endTimer > 30) race.state = 'done';
    }
  }

  /** Begin the 3-2-1. */
  race.startCountdown = () => {
    if (race.state !== 'grid') return;
    race.state = 'countdown';
    race.countdown = DRIVE.countdown;
    lastCount = 0;
  };

  /** Advance the race. `controls` drives the human kart; leave it out to let the game drive every kart. */
  race.update = (dt, controls) => {
    // Small fixed-size steps keep the handling the same at any frame rate.
    const steps = Math.max(1, Math.ceil(dt / (1 / 90)));
    for (let i = 0; i < steps; i++) step(dt / steps, controls);
  };

  /** Finishing order with times. Karts still out are placed by distance, with `time` undefined. */
  race.results = () =>
    [...race.karts]
      .sort((a, b) => a.place - b.place)
      .map((kart) => ({
        kart,
        place: kart.place,
        time: kart.finished ? kart.finishTime : undefined,
        bestLap: kart.bestLap || undefined,
      }));

  /** Hit a kart from outside the rules: for tests and for trying things in the browser console. */
  race.hit = hit;
  /** Hand a kart an item, likewise. */
  race.give = (kart, item) => {
    kart.item = item;
    kart.itemCount = ITEMS[item].count ?? 1;
  };
  rank();
  return race;
}
