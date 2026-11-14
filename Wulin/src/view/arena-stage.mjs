import { Mesh3D, Object3D } from '@egret/engine/world3d';
import { RULES } from '../core/battle.mjs';
import { createBuilding, treeParts } from './buildings.mjs';
import { BOX, FOLIAGE, ROD, TOON, grad, heightSurface, mix, model, shade } from './shapes.mjs';

const halfWidth = RULES.width / 2;
const halfDepth = RULES.depth / 2;
const stone = 0x797c76;
const edge = 0xb5ab96;
const ink = 0x4b5850;

/** A cliff-side martial courtyard. The level fighting surface follows the rules' existing bounds. */
export function createArenaStage(colors, random, sect, quality) {
  const node = new Object3D();
  const height = (x, z) => {
    const rise = Math.max(Math.abs(x) - halfWidth - 10, -z - halfDepth - 12, z - halfDepth - 24, 0);
    return -0.2 + Math.min(26, rise * rise * .013 * (.64 + .22 * Math.sin(x * .095) + .23 * Math.cos(z * .12)));
  };
  const ground = new Mesh3D(heightSurface(235, 205, 47, 41, height, (x, z, y) =>
    mix(mix(0x5c6950, 0x7c795f, .5 + .5 * Math.sin(x * .085 + z * .031)), 0x7c8178, Math.min(.85, Math.max(0, y) / 28))), TOON);
  ground.receiveShadow = true;
  node.addChild(ground);

  const platform = [[BOX, [0, -.19, 0], [50.6, .24, 31.8], 0x62665e]];
  // Staggered slabs reveal the perspective without placing a grid over the fighters.
  const slabWidth = 4.15;
  const slabDepth = 2.55;
  for (let row = -6; row <= 6; row++) {
    for (let column = -6; column <= 6; column++) {
      const x = (column + (row % 2 ? .5 : 0)) * slabWidth;
      if (Math.abs(x) + slabWidth * .5 > 25.4) continue;
      const z = row * slabDepth;
      platform.push([BOX, [x, -.046, z], [slabWidth - .045, .092, slabDepth - .045], shade(stone, .92 + random() * .17)]);
    }
  }
  for (const sign of [-1, 1]) {
    platform.push([BOX, [sign * 25.6, -.027, 0], [.52, .14, 33.6], edge]);
    platform.push([BOX, [0, -.027, sign * 16.6], [51.7, .14, .55], edge]);
    platform.push([BOX, [0, -.10, sign * 17.15], [51.7, .18, .55], ink]);
  }
  node.addChild(model(platform, TOON, false));

  const details = [];
  for (const sign of [-1, 1]) {
    // The far wall has a break at the main gate and low rails where the foreground can cross the camera.
    details.push([BOX, [sign * 16.25, .52, -17.7], [17.4, 1.18, .55], grad(edge)]);
    details.push([BOX, [sign * 16.25, 1.16, -17.7], [17.7, .16, .85], ink]);
    for (const x of [8, 13, 18, 23]) {
      const px = x * sign;
      details.push([BOX, [px, .75, -17.8], [.48, 1.55, .55], grad(edge)], [BOX, [px, 1.59, -17.8], [.68, .17, .72], ink]);
    }
    for (const z of [-12, -4, 4, 12]) {
      const x = sign * 25.65;
      details.push([BOX, [x, .56, z], [.5, 1.2, .55], grad(edge)], [BOX, [x, 1.21, z], [.65, .14, .69], ink]);
    }
    for (const z of [-12, 8]) {
      const x = sign * 21.7;
      const side = sign < 0 ? 0 : 1;
      details.push([ROD, [x, 2.4, z], [.065, 4.8, .065], grad(0x4a3526)],
        [BOX, [x, 4.34, z], [1.75, .09, .09], 0x493628],
        [BOX, [x, 3.27, z], [1.36, 1.92, .065], grad(shade(colors[side], .86))],
        [BOX, [x, 4.15, z + .035], [1.38, .12, .045], 0xcdb681]);
    }
    // Stone terrace, steps and lanterns set the scale of the entrance.
    details.push([BOX, [sign * 6.2, .22, -20.4], [1.1, .44, 5.9], edge]);
    details.push([BOX, [sign * 6.2, 1.12, -19.6], [.55, 1.7, .55], grad(0x8e8c80)]);
    details.push([BOX, [sign * 6.2, 2.1, -19.6], [.92, .30, .87], 0x3c493f]);
    details.push([BOX, [sign * 6.2, 1.78, -19.6], [.62, .38, .59], 0xd9a66e]);
  }
  for (let step = 0; step < 4; step++) details.push([BOX, [0, .08 + step * .14, -18.2 - step * .72], [9.7, .18 + step * .28, .76], shade(edge, .97 - step * .04)]);
  details.push([BOX, [0, .46, -22], [11.8, .90, 5.0], grad(edge)]);
  node.addChild(model(details));
  const gate = createBuilding('gate', 2, sect);
  gate.setPosition(0, .88, -22.3).setScale(1.6);
  node.addChild(gate);

  const grove = [];
  for (let index = 0; index < (quality === 'low' ? 18 : 32); index++) {
    const sign = index % 2 ? 1 : -1;
    const distant = index >= 8;
    const x = sign * (9 + random() * (distant ? 58 : 19));
    const z = -24 - random() * (distant ? 55 : 15);
    const y = height(x, z);
    const size = 1.1 + random() * 1.8;
    for (const [geometry, at, scale, color, rotation] of treeParts(x, z, size, index % 7 === 0 ? 'maple' : 'pine')) {
      grove.push([geometry, [at[0], at[1] + y, at[2]], scale, color, rotation]);
    }
  }
  node.addChild(model(grove, FOLIAGE));
  return node;
}
