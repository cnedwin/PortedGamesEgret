// 茶马古道：一条从滇南茶山到高原驿站的路。路的中线是引擎的 Catmull-Rom 曲线，每两米取一个采样点；
// 路两边的地理在 geography.mjs。
//
// The Tea Horse Road: one road from the tea hills of the south to the plateau station. Its centre line is a
// Catmull-Rom curve of the engine, sampled every two metres; the land around it is in geography.mjs.
import { CatmullRomCurve3D } from '@egret/engine/world3d';
import { createGeography } from './geography.mjs';

// The road's centre line, in metres: x east, y up, z south. The convoy drives toward -z (north).
const ROAD = [
  [0, 20, 70],
  [0, 20, 0],
  [50, 22, -160],
  [-20, 28, -330],
  [-40, 32, -470],
  [20, 34, -600],
  [70, 31, -740],
  [72, 31, -810],
  [30, 40, -950],
  [-50, 46, -1080],
  [-60, 52, -1220],
  [-10, 56, -1360],
  [40, 58, -1460],
  [110, 64, -1570],
  [190, 80, -1690],
  [200, 95, -1810],
  [130, 108, -1910],
  [150, 118, -2030],
  [236, 126, -2130],
  [262, 130, -2210],
  [262, 130, -2250],
  [262, 130, -2290],
  [262, 130, -2330],
  [240, 134, -2440],
  [180, 140, -2580],
  [150, 146, -2700],
  [150, 150, -2800],
  [190, 165, -2930],
  [130, 190, -3080],
  [90, 212, -3200],
  [170, 238, -3330],
  [190, 258, -3460],
  [130, 280, -3580],
  [160, 298, -3700],
  [220, 290, -3840],
  [250, 282, -3990],
  [260, 278, -4150],
  [262, 278, -4240]
];

const SPACING = 2;

/** The road: the engine's Catmull-Rom curve, sampled every two metres by distance along it. */
const curve = new CatmullRomCurve3D(ROAD, { kind: 'centripetal' });
curve.arcLengthDivisions = 4000;
export const ROAD_LENGTH = curve.getLength();
const count = Math.floor(ROAD_LENGTH / SPACING) + 1;
export const samples = { x: new Float64Array(count), y: new Float64Array(count), z: new Float64Array(count), count };
{
  const p = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    curve.getPointAt(Math.min(1, (i * SPACING) / ROAD_LENGTH), p);
    samples.x[i] = p[0];
    samples.y[i] = p[1];
    samples.z[i] = p[2];
  }
}


/** The land around the road; see geography.mjs. */
export const geography = createGeography(samples);
export const { pointAt, directionAt, nearestRoad, heightAt, groundColor, groundWeights, onRoad, biomeAt, legAt, STATIONS, BRIDGE, RIVER, FORD, LAKE, AMBUSHES, PASS, LEGS } = geography;
export { ROAD_HALF_WIDTH } from './geography.mjs';
