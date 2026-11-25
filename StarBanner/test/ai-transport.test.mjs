import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBrain, nextOrder } from '../src/sim/ai.mjs';
import { battleSight, sightTile } from '../src/sim/fog.mjs';
import { act, cloneGame, createGame, unitAt } from '../src/sim/rules.mjs';

const sides = [{ commander: 'seline', ai: true }, { commander: 'garron', ai: true }];

function field({ width = 17, water = null, carrier, passengers = [{ type: 'pikeman', x: 1, y: 2 }], enemies = [], village, port = false }) {
  const height = 5;
  const terrain = Array.from({ length: width * height }, (_, n) => {
    const x = n % width;
    if (water && (x === water[0] - 1 || x === water[1] + 1)) return 'beach';
    if (water && x >= water[0] && x <= water[1]) return 'ocean';
    return 'road';
  });
  const buildings = [
    { kind: 'hq', owner: 0, x: 0, y: 0 },
    { kind: 'hq', owner: 1, x: width - 1, y: 0 },
    { kind: 'village', owner: -1, x: village ?? width - 3, y: 3 }
  ];
  if (port) {
    buildings.push({ kind: 'port', owner: 0, x: 1, y: 1 });
    terrain[width + 1] = 'dock';
  }
  return createGame({
    id: 'transport-test', w: width, h: height, terrain, gold: port ? 100 : 0, buildings,
    units: [
      ...passengers.map(unit => ({ ...unit, owner: 0 })),
      ...enemies.map(unit => ({ ...unit, owner: 1 })),
      ...(carrier ? [{ type: carrier, x: 2, y: 2, owner: 0 }] : [])
    ],
    commanders: [{ x: 0, y: height - 1 }, { x: width - 1, y: height - 1 }]
  }, sides, 3);
}

/** Play one real AI turn and return its commands and the simulation's events in order. */
function turn(game, brain = createBrain('normal')) {
  const owner = game.current;
  const played = [];
  while (game.current === owner && !game.over) {
    assert.ok(played.length < 30, 'AI turn must terminate');
    const order = nextOrder(game, brain);
    played.push({ order, events: act(game, order) });
  }
  return played;
}

function ofType(game, type) {
  return game.units.find(unit => unit.type === type);
}

test('a supply wagon carries slow infantry down a road and unloads near the front', () => {
  const game = field({ carrier: 'wagon' });
  const infantry = ofType(game, 'pikeman');
  const wagon = ofType(game, 'wagon');
  const played = turn(game);
  assert.ok(played.some(({ events }) => events.some(e => e.type === 'load' && e.unit === infantry.id && e.carrier === wagon.id)));
  assert.ok(played.some(({ events }) => events.some(e => e.type === 'unload' && e.unit === infantry.id && e.x >= 12)));
  assert.equal(wagon.cargo.length, 0);
  assert.equal(infantry.done, true);
});

test('a balloon takes two infantry across an impassable channel and uses distinct drop tiles', () => {
  const game = field({
    width: 15, water: [3, 6], carrier: 'balloon',
    passengers: [{ type: 'pikeman', x: 1, y: 2 }, { type: 'swordsman', x: 2, y: 1 }]
  });
  const balloon = ofType(game, 'balloon');
  const played = turn(game);
  const drops = played.flatMap(({ events }) => events).filter(e => e.type === 'unload' && e.carrier === balloon.id);
  assert.equal(drops.length, 2);
  assert.ok(drops.every(e => e.x >= 7));
  assert.notEqual(unitAt(game, drops[0].x, drops[0].y).id, unitAt(game, drops[1].x, drops[1].y).id);
});

test('a ferry advances in open water and safely finishes its crossing after reload', () => {
  const game = field({ width: 20, water: [3, 14], carrier: 'ferry' });
  const ferry = ofType(game, 'ferry');
  const infantry = ofType(game, 'pikeman');
  const first = turn(game);
  assert.ok(first.some(({ order }) => order.unit === ferry.id && order.to.x > 2 && order.then.kind === 'wait'));
  assert.equal(ferry.cargo[0]?.id, infantry.id);
  act(game, { kind: 'end' });
  const resumed = cloneGame(game);
  const originalOrders = turn(game);
  const resumedOrders = turn(resumed);
  assert.deepEqual(resumedOrders, originalOrders);
  assert.ok(resumedOrders.flatMap(({ events }) => events).some(e => e.type === 'unload' && e.unit === infantry.id && e.x >= 15));
  assert.deepEqual(cloneGame(resumed), cloneGame(game));
});

test('infantry capture an available village before spending the turn boarding', () => {
  const game = field({ carrier: 'wagon', village: 2 });
  const order = nextOrder(game, createBrain());
  assert.equal(order.unit, ofType(game, 'pikeman').id);
  assert.equal(order.then.kind, 'capture');
  assert.ok(act(game, order).some(e => e.type === 'capture'));
});

test('the AI buys a ferry for a reachable transport opportunity, but keeps its gold without one', () => {
  const make = (passengers) => {
    const game = field({ width: 17, water: [3, 11], port: true, passengers });
    for (const unit of game.units) if (unit.owner === 0) unit.done = true;
    return game;
  };
  const game = make([{ type: 'pikeman', x: 1, y: 2 }]);
  const order = nextOrder(game, createBrain());
  assert.equal(order.kind, 'recruit');
  assert.equal(order.type, 'ferry');
  assert.equal(order.at.x, 2);
  act(game, order);
  assert.equal(game.players[0].gold, 0);
  assert.equal(nextOrder(make([]), createBrain()).kind, 'end');
});

test('a ballista may select a visible target but cannot shoot through fog', () => {
  const game = field({
    passengers: [{ type: 'ballista', x: 7, y: 2 }],
    enemies: [{ type: 'archer', x: 11, y: 2 }]
  });
  const ballista = ofType(game, 'ballista');
  const archer = ofType(game, 'archer');
  const tile = sightTile(game, archer.x, archer.y);
  const visible = battleSight(game, 0);
  assert.equal(visible.has(tile), false);
  const brain = createBrain();
  const hidden = nextOrder(game, brain, { visible });
  assert.equal(hidden.unit, ballista.id);
  assert.notEqual(hidden.then.kind, 'attack');
  visible.add(tile);
  const found = nextOrder(game, brain, { visible });
  assert.equal(found.unit, ballista.id);
  assert.deepEqual(found.then, { kind: 'attack', target: { unit: archer.id } });
  assert.ok(act(game, found).some(e => e.type === 'strike' && e.to === archer.id));
});
