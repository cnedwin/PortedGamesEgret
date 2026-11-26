// 车队：三辆越野车，每辆是引擎的 createVehicle3D——一个动态车身加六个射线车轮（悬挂、转向、驱动）。
// 头车由玩家驾驶，后两辆沿路跟车，和前车保持间距；掉队太远或翻车了就由马帮把它扶回路上。
//
// The convoy: three trucks, each the engine's `createVehicle3D` — a dynamic chassis on six ray wheels with suspension,
// steering and drive. The player drives the lead truck; the other two follow the road and keep their distance from the
// truck ahead. One that falls too far behind or rolls over is set back on the road by the caravan's hands.
import { createVehicle3D } from '@egret/engine/world3d';
import { LAYER } from '../world/land.mjs';
import { ROAD_HALF_WIDTH, directionAt, nearestRoad, pointAt } from '../world/route.mjs';
import { LIVERIES, TRUCK, createTruckModel } from '../models/truck.mjs';

const MASS = 2600;
const GAP = 16;

/** The heading of a body about the vertical, as the yaw of its back (+Z) direction. */
export function headingOf(body) {
  const [x, y, z, w] = body.quaternion;
  // Local +Z rotated into the world.
  const bx = 2 * (x * z + w * y),
    bz = 1 - 2 * (x * x + y * y);
  return Math.atan2(bx, bz);
}

/** Up: the chassis's local +Y in the world, to tell whether it has rolled over. */
function upOf(body) {
  const [x, y, z, w] = body.quaternion;
  return 1 - 2 * (x * x + z * z);
}

/** One truck: its chassis body, its vehicle, its picture and its cargo. */
function createTruck(scene, physics, index, at, cab) {
  const livery = LIVERIES[index],
    model = createTruckModel(livery, cab);
  scene.addChild(model.root);
  for (const wheel of model.wheels) scene.addChild(wheel.node);
  // The chassis: a frame and bed low down, the cab and hood above the front; its origin is the centre of mass.
  const chassis = physics.createBody({
    type: 'dynamic',
    mass: MASS,
    shape: {
      type: 'compound',
      children: [
        { shape: { type: 'box', halfExtents: [1.12, 0.32, 3.2] }, position: [0, 0.12, 0.05] },
        { shape: { type: 'box', halfExtents: [1.02, 0.62, 0.78] }, position: [0, 0.92, -1.26] },
        { shape: { type: 'box', halfExtents: [0.82, 0.32, 0.8] }, position: [0, 0.4, -2.85] }
      ]
    },
    position: at.position,
    quaternion: at.quaternion,
    friction: 0.5,
    restitution: 0.05,
    linearDamping: 0.04,
    angularDamping: 0.35,
    layer: LAYER.vehicle,
    node: model.root,
    userData: { kind: 'truck', index }
  });
  const vehicle = createVehicle3D(physics, chassis, {
    wheels: model.wheels.map((wheel) => ({
      position: wheel.position,
      radius: TRUCK.wheelRadius,
      restLength: 0.5,
      travel: 0.32,
      steered: wheel.front,
      driven: true,
      grip: wheel.front ? 1.25 : 1.4,
      node: wheel.node
    })),
    engineForce: MASS * 7.5,
    brakeForce: MASS * 11,
    maxSteer: 0.55,
    topSpeed: 16.5,
    rollInfluence: 0.25,
    mask: LAYER.ground | LAYER.prop
  });
  return {
    index,
    livery,
    model,
    chassis,
    vehicle,
    cargo: TRUCK.cargoSlots,
    stuckFor: 0,
    s: 0,
    /** Bundles left on this truck; the picture shows as many. */
    setCargo(count) {
      this.cargo = Math.max(0, Math.min(TRUCK.cargoSlots, count));
      model.cargo.count = this.cargo;
    }
  };
}

/** Where to put a truck on the road at distance `s`: on the road, facing along it, a little above the ground. */
function placeOnRoad(s, heightAt, lane = 0) {
  const p = pointAt(s),
    [dx, dz] = directionAt(s),
    x = p[0] - dz * lane,
    z = p[2] + dx * lane,
    yaw = Math.atan2(-dx, -dz);
  // The road's own height counts too: on the bridge the ground is the bottom of the gorge.
  return { position: [x, Math.max(heightAt(x, z), p[1]) + 1.4, z], quaternion: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)] };
}

/**
 * The convoy on the road at distance `s`. `heightAt` gives the ground. Each frame: `drive(input, seconds)` before the
 * physics step, `afterStep()` after it.
 */
export function createConvoy(scene, physics, heightAt, { s = 30, count = 3, leadCab = null } = {}) {
  const trucks = [];
  for (let i = 0; i < count; i++) trucks.push(createTruck(scene, physics, i, placeOnRoad(Math.max(2, s - i * GAP), heightAt), i === 0 ? leadCab : null));
  const lead = trucks[0];
  const near = {};

  /** Put a truck back on the road, facing along it, at rest. */
  function reset(truck, at) {
    const place = placeOnRoad(at, heightAt);
    truck.chassis.setPosition(...place.position);
    truck.chassis.setQuaternion(...place.quaternion);
    truck.chassis.setLinearVelocity(0, 0, 0);
    truck.chassis.setAngularVelocity(0, 0, 0);
    truck.stuckFor = 0;
  }

  /** The steering that takes a truck toward a point on the road ahead of it, as a follower drives (also the autopilot). */
  function steerAlong(truck) {
    const body = truck.chassis,
      p = body.position,
      road = nearestRoad(p[0], p[2], near);
    truck.s = road.s;
    const look = Math.max(8, Math.abs(truck.vehicle.speed) * 0.9),
      goal = pointAt(road.s + look),
      heading = headingOf(body),
      // The direction to the goal against the truck's forward (-Z), as an angle; positive steers left.
      want = Math.atan2(-(goal[0] - p[0]), -(goal[2] - p[2]));
    let turn = want - heading;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    return { steer: Math.max(-1, Math.min(1, turn * 2.2)), road };
  }

  /** A follower: steer for a point on the road ahead, and hold the gap to the truck in front. */
  function follow(truck, ahead, seconds) {
    const { steer, road } = steerAlong(truck),
      body = truck.chassis;
    truck.vehicle.steering = steer;
    // The gap grows with speed, so a follower can stop when the truck ahead does.
    const gap = ahead.s - truck.s,
      want = GAP + Math.abs(truck.vehicle.speed) * 0.7,
      targetSpeed = Math.max(0, Math.min(17, (gap - want) * 0.8 + Math.abs(ahead.vehicle.speed))),
      speed = truck.vehicle.speed;
    truck.vehicle.throttle = Math.max(0, Math.min(1, (targetSpeed - speed) * 0.35 + 0.1 * Math.max(0, gap - want))) * (1 - (truck.drag ?? 0));
    truck.vehicle.brake = speed > targetSpeed + 1.5 || gap < GAP * 0.6 ? (gap < GAP * 0.45 ? 1 : 0.6) : 0;
    if (gap < GAP * 0.55) truck.vehicle.throttle = 0;
    // Stuck, rolled over or left far behind: set back on the road behind the truck ahead.
    const slow = Math.abs(speed) < 0.6 && truck.vehicle.throttle > 0.3;
    truck.stuckFor = slow || upOf(body) < 0.3 || road.d > ROAD_HALF_WIDTH * 4 ? truck.stuckFor + seconds : 0;
    if (truck.stuckFor > 4 || gap > 160) reset(truck, Math.max(2, ahead.s - GAP));
  }

  return {
    trucks,
    lead,
    /** Total bundles of tea still carried. */
    get cargo() {
      return trucks.reduce((sum, truck) => sum + truck.cargo, 0);
    },
    get capacity() {
      return trucks.length * TRUCK.cargoSlots;
    },
    /** Drive: the player's controls for the lead truck, the followers by themselves. Call before the physics step. */
    drive(input, seconds, { followers = true } = {}) {
      const v = lead.vehicle;
      v.steering = input.steer;
      // A wolf hanging on to a truck holds it back.
      v.throttle = input.throttle * (1 - (lead.drag ?? 0));
      v.brake = input.brake;
      if (input.handbrake) v.brake = 1;
      lead.s = nearestRoad(lead.chassis.position[0], lead.chassis.position[2], near).s;
      for (let i = 1; i < trucks.length; i++) {
        if (followers) follow(trucks[i], trucks[i - 1], seconds);
        else {
          trucks[i].vehicle.throttle = 0;
          trucks[i].vehicle.brake = 1;
        }
      }
      for (const truck of trucks) truck.vehicle.update(seconds);
    },
    /** Whether the lead truck lies on its side or roof. */
    get leadUpset() {
      return upOf(lead.chassis) < 0.35;
    },
    /** Set the lead truck back on the road where it is, as after a roll. */
    recover() {
      reset(lead, lead.s);
    },
    reset,
    steerAlong,
    heading: () => headingOf(lead.chassis)
  };
}
