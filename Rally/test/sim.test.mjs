// Rule tests: the circuit, driving, drifting, items and a whole race, all
// without a page. Run from the Rally folder with `node --test`.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { CLASSES, DRIVE, ITEMS, ITEM_KEYS, RACERS, TEXT, racerTuning } = await import('../src/data.mjs');
const { createRace, idleControls } = await import('../src/sim.mjs');
const { createTrack, wrapAngle } = await import('../src/track.mjs');

const track = createTrack();
const field = (human = -1) => RACERS.map((_, racer) => ({ racer, human: racer === human }));
/** A race with the first racer driven by the test, started and past the countdown. */
function started(options = {}) {
  const race = createRace({ track, seed: 3, entries: field(0), ...options });
  race.startCountdown();
  const controls = idleControls();
  while (race.state !== 'race') race.update(1 / 60, controls);
  race.events.length = 0;
  return { race, me: race.human, controls };
}
const run = (race, controls, seconds) => {
  for (let i = 0; i < seconds * 60; i++) race.update(1 / 60, controls);
};

test('the circuit is a closed loop with room between its stretches', () => {
  assert.ok(track.length > 1500 && track.length < 2200, `length ${track.length}`);
  let tightest = Infinity;
  for (let i = 0; i < track.count; i++) tightest = Math.min(tightest, 1 / Math.max(1e-6, Math.abs(track.curvature[i])));
  assert.ok(tightest > 15, `tightest corner radius ${tightest}`);
  // No two stretches come close enough for their walls to meet.
  for (let i = 0; i < track.count; i += 3)
    for (let j = i + 30; j < track.count; j += 3) {
      if (track.count - j + i < 30) continue;
      assert.ok(Math.hypot(track.px[i] - track.px[j], track.pz[i] - track.pz[j]) > 45, `stations ${i} and ${j} are too close`);
    }
});

test('a point converts to track coordinates and back', () => {
  for (const [fraction, lateral] of [
    [0.1, 3],
    [0.37, -5],
    [0.55, 2],
    [0.83, -6],
  ]) {
    const point = track.sample(fraction * track.length, lateral, {}),
      found = track.locate(point.x, point.z, -1, {});
    assert.ok(Math.abs(track.delta(found.s, fraction * track.length)) < 0.5, `distance at ${fraction}`);
    assert.ok(Math.abs(found.lateral - lateral) < 0.3, `offset at ${fraction}: ${found.lateral}`);
  }
});

test('the grid sits on a straight, behind the line, facing down the road', () => {
  for (let index = 0; index < 8; index++) {
    const slot = track.gridSlot(index),
      at = track.locate(slot.x, slot.z, -1, {});
    assert.ok(track.delta(0, at.s) < 0, 'behind the line');
    assert.ok(Math.abs(at.curvature) < 1 / 300, 'on a straight');
    assert.ok(Math.abs(wrapAngle(slot.heading - at.heading)) < 0.02, 'facing along the road');
  }
});

test('every racer and item is complete in both languages', () => {
  assert.equal(RACERS.length, 8);
  for (const racer of RACERS) {
    for (const lang of ['zh', 'en']) assert.ok(racer.name[lang] && racer.blurb[lang], racer.id);
    for (const stat of Object.values(racer.stats)) assert.ok(stat >= 1 && stat <= 5);
    assert.ok(racerTuning(racer).topSpeed > 30);
  }
  for (const key of ITEM_KEYS) {
    assert.equal(ITEMS[key].chances.length, 8, key);
    assert.ok(ITEMS[key].name.zh && ITEMS[key].name.en && ITEMS[key].icon);
  }
  assert.deepEqual(Object.keys(TEXT.zh).sort(), Object.keys(TEXT.en).sort());
  assert.equal(TEXT.zh.place.length, 8);
});

test('nobody moves before GO', () => {
  const race = createRace({ track, entries: field(0) });
  const controls = { ...idleControls(), throttle: 1 };
  race.update(1, controls);
  race.startCountdown();
  race.update(DRIVE.countdown - 0.2, controls);
  assert.equal(race.state, 'countdown');
  for (const kart of race.karts) assert.ok(Math.abs(kart.speed) < 0.01);
});

test('the accelerator timing decides the start', () => {
  const launch = (pressAt) => {
    const race = createRace({ track, entries: field(0) }),
      controls = idleControls();
    race.startCountdown();
    for (let t = 0; race.state !== 'race'; t += 1 / 60) {
      controls.throttle = t >= pressAt ? 1 : 0;
      race.update(1 / 60, controls);
    }
    return race.human;
  };
  assert.ok(launch(DRIVE.countdown - 0.6).boost > 0, 'late press: rocket start');
  assert.ok(launch(0).stall > 0, 'held from the start: stall');
  const plain = launch(99);
  assert.ok(plain.boost === 0 && plain.stall === 0, 'no press: neither');
});

test('a kart accelerates to its top speed and steering right turns right', () => {
  const { race, me, controls } = started({ klass: 2 });
  controls.throttle = 1;
  run(race, controls, 4);
  // Coins picked up on the way raise the top speed a little.
  const top = me.tuning.topSpeed * CLASSES[2].speed * (1 + DRIVE.coinSpeed * me.coins);
  assert.ok(me.speed > top * 0.9 && me.speed <= top + 0.5, `speed ${me.speed} of ${top}`);
  const heading = me.heading,
    lateral = me.lateral;
  controls.steer = 1;
  run(race, controls, 0.4);
  assert.ok(wrapAngle(me.heading - heading) < -0.2, 'heading falls when turning right');
  assert.ok(me.lateral > lateral + 0.5, 'and the kart moves to the right of the road');
});

test('grass is slower than tarmac', () => {
  const { race, me, controls } = started();
  controls.throttle = 1;
  run(race, controls, 3);
  const fast = me.speed;
  // Drive along the verge for a while.
  for (let i = 0; i < 180; i++) {
    const at = track.locate(me.x, me.z, me.station, {}),
      wanted = at.halfWidth + 4;
    controls.steer = Math.max(-1, Math.min(1, (wanted - me.lateral) * 0.3 + wrapAngle(me.heading - at.heading) * 2));
    race.update(1 / 60, controls);
  }
  assert.ok(me.grass, 'on the grass');
  assert.ok(me.speed < fast * 0.7, `slowed from ${fast} to ${me.speed}`);
});

test('holding a drift charges a mini-turbo that fires on release', () => {
  const { race, me, controls } = started();
  controls.throttle = 1;
  run(race, controls, 3);
  // Start a drift to the right, then steer against it to hold a wide arc.
  controls.steer = 1;
  controls.drift = true;
  run(race, controls, 0.1);
  assert.ok(me.drifting && me.driftDir === 1, 'drifting right');
  controls.steer = -1;
  run(race, controls, 1.4);
  assert.ok(me.drifting, 'still drifting');
  assert.ok(me.driftLevel >= 1, `charge level ${me.driftLevel}`);
  controls.drift = false;
  controls.steer = 0;
  race.update(1 / 60, controls);
  assert.ok(!me.drifting && me.boost > 0, 'boost after release');
  assert.ok(race.events.some((event) => event.type === 'turbo' && event.kart === me.index));
});

test('walls keep every kart on the circuit', () => {
  const { race, me, controls } = started();
  controls.throttle = 1;
  controls.steer = 1;
  for (let i = 0; i < 600; i++) {
    race.update(1 / 60, controls);
    for (const kart of race.karts) {
      const at = track.locate(kart.x, kart.z, -1, {});
      assert.ok(
        Math.abs(at.lateral) <= at.limit + 0.01,
        `kart ${kart.index} is ${at.lateral} from the centre, limit ${at.limit}`,
      );
    }
  }
  assert.ok(Number.isFinite(me.x + me.z + me.speed));
});

test('items do what they say', () => {
  // Chili: a boost.
  let { race, me, controls } = started();
  race.give(me, 'chili');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.ok(me.boost > 0 && me.item === undefined);

  // Triple chili: three uses, one per press.
  ({ race, me, controls } = started());
  race.give(me, 'chili3');
  for (let n = 0; n < 3; n++) {
    controls.item = true;
    race.update(1 / 60, controls);
    controls.item = false;
    race.update(1 / 60, controls);
  }
  assert.equal(me.item, undefined);

  // Golden bell: nothing can hit it.
  ({ race, me, controls } = started());
  race.give(me, 'bell');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.ok(me.bell > 0);
  assert.equal(race.hit(me, 'tumble'), false);

  // Thunder drum: everyone else shrinks and drops their item.
  ({ race, me, controls } = started());
  race.give(race.karts[3], 'cuju');
  race.give(me, 'thunder');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.ok(race.karts.every((kart) => kart === me || kart.shrink > 0));
  assert.equal(race.karts[3].item, undefined);
  assert.equal(me.shrink, 0);

  // Firecracker: left on the road, spins the next kart to touch it.
  ({ race, me, controls } = started());
  race.give(me, 'firecracker');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.equal(race.things.length, 1);
  const cracker = race.things[0],
    victim = race.karts[5];
  victim.x = cracker.x;
  victim.z = cracker.z;
  race.update(1 / 60, controls);
  assert.ok(victim.spin > 0, 'the kart on the firecracker spins');
  assert.equal(race.things.length, 0);

  // Sky rocket: finds the leader and knocks it over.
  ({ race, me, controls } = started());
  run(race, controls, 4);
  race.give(me, 'rocket');
  controls.item = true;
  race.update(1 / 60, controls);
  controls.item = false;
  const leader = race.karts.find((kart) => kart.place === 1);
  let struck = false;
  for (let i = 0; i < 600 && !struck; i++) {
    race.update(1 / 60, controls);
    struck = race.events.some((event) => event.type === 'explosion');
  }
  assert.ok(struck, 'the rocket went off');
  assert.ok(leader.spin > 0 || leader.safe > 0, 'the leader was hit');
});

test('a hit kart is safe for a moment afterwards', () => {
  const { race, me } = started();
  assert.equal(race.hit(me, 'spin'), true);
  assert.equal(race.hit(me, 'spin'), false);
});

test('the same seed replays the same race, and all eight finish', () => {
  const play = (seed) => {
    const race = createRace({ track, klass: 2, laps: 2, seed, entries: field() });
    race.startCountdown();
    for (let i = 0; i < 60 * 400 && race.state !== 'done'; i++) {
      race.update(1 / 60);
      race.events.length = 0;
    }
    return race;
  };
  const first = play(11),
    again = play(11);
  assert.equal(first.state, 'done');
  const order = (race) => race.results().map((row) => `${row.kart.racer}:${row.time.toFixed(3)}`);
  assert.deepEqual(order(first), order(again));
  const results = first.results();
  assert.deepEqual(
    results.map((row) => row.place),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  for (let i = 1; i < results.length; i++) assert.ok(results[i].time >= results[i - 1].time);
  // Two laps of this circuit cannot be done in under a minute.
  assert.ok(results[0].time > 60 && results[0].time < 200, `winner's time ${results[0].time}`);
  for (const row of results) assert.ok(row.bestLap > 25);
});

test('laps are counted for a kart driven by the player', () => {
  const { race, me, controls } = started({ laps: 1 });
  // Follow the centre line with simple steering.
  for (let i = 0; i < 60 * 240 && !me.finished; i++) {
    const at = track.locate(me.x, me.z, me.station, {}),
      ahead = track.sample(at.s + 14, 0, {}),
      off = wrapAngle(Math.atan2(ahead.x - me.x, ahead.z - me.z) - me.heading);
    controls.steer = Math.max(-1, Math.min(1, -off * 3));
    controls.throttle = Math.abs(off) > 0.5 && me.speed > 18 ? 0 : 1;
    race.update(1 / 60, controls);
  }
  assert.ok(me.finished, 'crossed the line');
  assert.ok(me.finishTime > 35, `lap time ${me.finishTime}`);
  assert.ok(me.total >= track.length);
});

/** Put a kart on the road at a feature, facing along the track, at `speed`. */
function placeAt(race, kart, s, lateral, speed = 0) {
  const at = track.sample(s, lateral, {});
  Object.assign(kart, { x: at.x, z: at.z, y: at.y, heading: at.heading, speed, slip: 0, station: -1 });
  const found = track.locate(kart.x, kart.z, -1, {});
  kart.station = found.index;
  kart.s = found.s;
  kart.lateral = found.lateral;
}

test('coins fill the purse, raise the top speed and spill when hit', () => {
  const { race, me, controls } = started();
  const coin = race.coins[0];
  placeAt(race, me, coin.s - 1, coin.lateral, 10);
  controls.throttle = 1;
  run(race, controls, 0.15);
  assert.ok(me.coins >= 1);
  assert.ok(coin.timer > 0, 'the coin is gone for a while');
  me.coins = DRIVE.coinLimit;
  race.hit(me, 'spin');
  assert.equal(me.coins, DRIVE.coinLimit - 3);
});

test('a cloud gate boosts a kart that drives through the middle, and only there', () => {
  const gate = track.gates[0];
  let { race, me, controls } = started();
  placeAt(race, me, gate.s - 3, gate.lateral, 20);
  controls.throttle = 1;
  run(race, controls, 0.4);
  assert.ok(me.boost > 0, 'through the gate');
  ({ race, me, controls } = started());
  placeAt(race, me, gate.s - 3, gate.lateral + gate.halfWidth + 2.5, 20);
  controls.throttle = 1;
  run(race, controls, 0.4);
  assert.equal(me.boost, 0, 'past the side of it');
});

test('mud slows a kart and stone lions stop it going through', () => {
  const mud = track.mud[0];
  let { race, me, controls } = started();
  placeAt(race, me, mud.s - mud.radius - 12, mud.lateral, 30);
  controls.throttle = 1;
  let slowest = Infinity,
    bogged = false;
  for (let i = 0; i < 50; i++) {
    race.update(1 / 60, controls);
    bogged ||= me.mud;
    slowest = Math.min(slowest, me.speed);
  }
  assert.ok(bogged, 'drove into the mud');
  assert.ok(slowest < 26, `slowed to ${slowest}`);

  const lion = track.lions[0];
  ({ race, me, controls } = started());
  placeAt(race, me, lion.s - 8, lion.lateral, 30);
  controls.throttle = 1;
  for (let i = 0; i < 60; i++) {
    race.update(1 / 60, controls);
    assert.ok(Math.hypot(me.x - lion.x, me.z - lion.z) >= lion.radius + DRIVE.radius * 0.85 - 0.05, 'never inside the lion');
  }
  assert.ok(race.events.some((event) => event.type === 'thud' && event.kart === me.index));
});

test('a rolling drum spins the kart it meets', () => {
  const { race, me, controls } = started();
  const drum = race.drums[0];
  race.update(1 / 60, controls);
  placeAt(race, me, drum.s, drum.offset, 0);
  race.update(1 / 60, controls);
  assert.ok(me.spin > 0);
});

test('the newer items do what they say', () => {
  // Jade charm: takes one hit, then is gone.
  let { race, me, controls } = started();
  race.give(me, 'jade');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.ok(me.jade > 0);
  assert.equal(race.hit(me, 'tumble'), false);
  assert.equal(me.jade, 0);
  assert.equal(me.spin, 0);

  // Bronze gong: spins the karts close by and pushes the user on.
  ({ race, me, controls } = started());
  const near = race.karts[1],
    far = race.karts[7];
  placeAt(race, near, me.s + 6, me.lateral);
  placeAt(race, far, me.s + 120, 0);
  race.give(me, 'gong');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.ok(near.spin > 0 && far.spin === 0);
  assert.ok(me.boost > 0);

  // Ink: only the karts ahead are splashed.
  ({ race, me, controls } = started());
  placeAt(race, me, track.length - 80, 0); // well behind the whole grid
  me.total = -80;
  race.update(1 / 60, controls);
  race.give(me, 'ink');
  controls.item = true;
  race.update(1 / 60, controls);
  assert.equal(me.inked, 0);
  assert.ok(race.karts.every((kart) => kart === me || kart.inked > 0));

  // Somersault cloud: carries the kart down the road by itself, faster than it can drive.
  ({ race, me, controls } = started());
  race.give(me, 'cloud');
  controls.item = true;
  race.update(1 / 60, controls);
  controls.item = false;
  const from = me.total;
  run(race, controls, 2);
  assert.ok(me.total - from > 90, `covered ${me.total - from} m in two seconds`);
  assert.equal(race.hit(me, 'spin'), false);
  run(race, controls, DRIVE.cloudSeconds);
  assert.equal(me.cloud, 0);
});

test('tucking in behind another kart earns a slipstream boost', () => {
  const { race, me, controls } = started();
  const leader = race.karts[1];
  // Park everyone else out of the way, then follow one kart closely at speed.
  race.karts.forEach((kart, index) => {
    if (kart !== me && kart !== leader) placeAt(race, kart, 600 + index * 30, 0);
  });
  controls.throttle = 1;
  let boosted = false;
  for (let i = 0; i < 60 * 3 && !boosted; i++) {
    placeAt(race, leader, me.s + 8, me.lateral, 30);
    me.speed = Math.max(me.speed, 30);
    race.update(1 / 60, controls);
    boosted = race.events.some((event) => event.type === 'boost' && event.source === 'draft' && event.kart === me.index);
  }
  assert.ok(boosted);
});
