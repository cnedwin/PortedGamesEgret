// The circuit: one closed curve through the control points below, sampled
// into evenly spaced stations. The rules ask it where a kart is (distance
// along the lap, offset from the centre line, road height) and the view
// builds the road, walls and scenery from the same stations, so what is
// drawn and what is driven on cannot drift apart.
import { CatmullRomCurve3D } from '@egret/engine/world3d';

/** Sizes in metres. Y is up; the circuit lies roughly in the XZ plane. */
export const TRACK = {
  halfWidth: 8.5, // centre line to the edge of the tarmac
  bridgeHalfWidth: 7.5,
  shoulder: 8, // grass between the tarmac and the wall
  spacing: 3, // distance between stations
  waterLevel: -0.6,
  lake: { x: -101, z: 198, rx: 112, rz: 65 },
};

// Control points [x, y, z], driven in this order. The lap starts part-way down
// the long southern straight, climbs a hill to the east, snakes back through an S-bend,
// crosses the lake on a stone bridge and returns through a western hairpin.
const POINTS = [
  [13, 0, -195],
  [130, 0, -195],
  [228, 1.5, -179],
  [296, 5, -124],
  [315, 8, -32],
  [280, 7, 58],
  [205, 4, 101],
  [146, 2, 52],
  [81, 1, 39],
  [36, 1.5, 101],
  [10, 3, 166],
  [-52, 4.6, 205],
  [-143, 4.6, 198],
  [-231, 2.5, 166],
  [-302, 1, 101],
  [-322, 0.5, 13],
  [-276, 0, -49],
  [-214, 0, -34],
  [-166, 0, -75],
  [-172, 0, -140],
  [-140, 0, -183],
  [-91, 0, -195],
];

/** Features placed by distance along the lap, as a fraction of its length. */
const BOOST_PADS = [
  [0.085, 0],
  [0.2, -3],
  [0.33, 3],
  [0.43, 0],
  [0.6, -2.5],
  [0.6, 2.5],
  [0.745, 0],
  [0.93, 3],
];
const RAMPS = [0.275, 0.69];
const BOX_ROWS = [0.05, 0.16, 0.3, 0.47, 0.585, 0.72, 0.84, 0.955];
const BOXES_PER_ROW = 4;

const TAU = Math.PI * 2;
/** Bring an angle into (-PI, PI]. */
export const wrapAngle = (a) => {
  a %= TAU;
  return a > Math.PI ? a - TAU : a <= -Math.PI ? a + TAU : a;
};
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Rolling hills far from the road; the same everywhere it is asked. */
function hills(x, z) {
  return (
    6 +
    Math.sin(x * 0.021 + 1.3) * 5 +
    Math.cos(z * 0.027 - 0.4) * 4.5 +
    Math.sin((x + z) * 0.043) * 2.2 +
    Math.cos((x - z) * 0.011) * 6
  );
}

/**
 * Build the circuit. Everything returned is plain data plus three queries:
 * `locate` (world point to track coordinates), `sample` (distance along the
 * lap to a world point) and `terrainHeight` (for the scenery).
 */
export function createTrack() {
  const curve = new CatmullRomCurve3D(POINTS, { closed: true, kind: 'centripetal' });
  curve.arcLengthDivisions = 4000;
  const length = curve.getLength();
  const count = Math.round(length / TRACK.spacing);
  const step = length / count;
  const points = curve.getSpacedPoints(count);

  // Per-station arrays. Forward is (tx, tz); right is (-tz, tx), so a positive
  // offset from the centre line is to the driver's right.
  const px = new Float64Array(count),
    py = new Float64Array(count),
    pz = new Float64Array(count),
    tx = new Float64Array(count),
    tz = new Float64Array(count),
    heading = new Float64Array(count),
    curvature = new Float64Array(count),
    halfWidth = new Float64Array(count),
    limit = new Float64Array(count),
    bridge = new Uint8Array(count);
  const lake = TRACK.lake;
  /** 0 at the middle of the lake, 1 on its shore, more outside. */
  const lakeDistance = (x, z) => Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz);

  for (let i = 0; i < count; i++) {
    px[i] = points[i][0];
    py[i] = points[i][1];
    pz[i] = points[i][2];
  }
  for (let i = 0; i < count; i++) {
    const a = (i + count - 1) % count,
      b = (i + 1) % count,
      dx = px[b] - px[a],
      dz = pz[b] - pz[a],
      d = Math.hypot(dx, dz) || 1;
    tx[i] = dx / d;
    tz[i] = dz / d;
    heading[i] = Math.atan2(tx[i], tz[i]);
    bridge[i] = lakeDistance(px[i], pz[i]) < 0.93 ? 1 : 0;
  }
  for (let i = 0; i < count; i++) {
    const a = (i + count - 1) % count,
      b = (i + 1) % count;
    // Positive curvature turns left (the heading grows).
    curvature[i] = wrapAngle(heading[b] - heading[a]) / (2 * step);
    // The road narrows smoothly onto the bridge.
    let onBridge = 0;
    for (let k = -6; k <= 6; k++) onBridge += bridge[(i + k + count) % count];
    const blend = onBridge / 13;
    halfWidth[i] = TRACK.halfWidth + (TRACK.bridgeHalfWidth - TRACK.halfWidth) * blend;
    limit[i] = halfWidth[i] + TRACK.shoulder * (1 - smooth(blend * 1.6)) + 0.4;
  }

  const track = { length, count, step, px, py, pz, tx, tz, heading, curvature, halfWidth, limit, bridge, lakeDistance };

  /**
   * Track coordinates of a world point. `hint` is the station found last time
   * (search near it) or -1 (search the whole lap). Fills and returns `out`:
   * index, s (distance along the lap), lateral (offset to the right), y (road
   * height), heading, halfWidth, limit, curvature, slope and bridge.
   */
  track.locate = (x, z, hint, out) => {
    let best = 0,
      bestD = Infinity;
    if (hint >= 0) {
      for (let k = -14; k <= 14; k++) {
        const i = (hint + k + count) % count,
          d = (x - px[i]) ** 2 + (z - pz[i]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    // Far from the hinted stretch (or no hint): look everywhere.
    if (hint < 0 || bestD > 900) {
      for (let i = 0; i < count; i++) {
        const d = (x - px[i]) ** 2 + (z - pz[i]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    // Project onto the segment before or after the nearest station.
    let i = best,
      along = (x - px[i]) * tx[i] + (z - pz[i]) * tz[i];
    if (along < 0) {
      i = (i + count - 1) % count;
      along = Math.min(step, Math.max(0, (x - px[i]) * tx[i] + (z - pz[i]) * tz[i]));
    } else along = Math.min(step, along);
    const j = (i + 1) % count,
      f = along / step,
      mix = (array) => array[i] + (array[j] - array[i]) * f;
    const fx = tx[i] + (tx[j] - tx[i]) * f,
      fz = tz[i] + (tz[j] - tz[i]) * f,
      cx = mix(px),
      cz = mix(pz);
    out.index = i;
    out.s = (i + f) * step;
    out.lateral = (x - cx) * -fz + (z - cz) * fx;
    out.y = mix(py);
    out.heading = Math.atan2(fx, fz);
    out.halfWidth = mix(halfWidth);
    out.limit = mix(limit);
    out.curvature = mix(curvature);
    out.slope = (py[j] - py[i]) / step;
    out.bridge = bridge[i] === 1;
    return out;
  };

  /** World point at distance `s` along the lap and `lateral` metres to the right of the centre line. */
  track.sample = (s, lateral, out) => {
    const u = (((s % length) + length) % length) / step,
      i = Math.floor(u) % count,
      j = (i + 1) % count,
      f = u - Math.floor(u);
    const fx = tx[i] + (tx[j] - tx[i]) * f,
      fz = tz[i] + (tz[j] - tz[i]) * f,
      n = Math.hypot(fx, fz) || 1;
    out.x = px[i] + (px[j] - px[i]) * f + (-fz / n) * lateral;
    out.y = py[i] + (py[j] - py[i]) * f;
    out.z = pz[i] + (pz[j] - pz[i]) * f + (fx / n) * lateral;
    out.heading = Math.atan2(fx, fz);
    out.index = i;
    return out;
  };

  /** Shortest signed distance from `from` to `to` along the lap, in (-length/2, length/2]. */
  track.delta = (from, to) => {
    let d = (to - from) % length;
    if (d > length / 2) d -= length;
    else if (d <= -length / 2) d += length;
    return d;
  };

  const scratch = {};
  /** Height of the land at a point: the road's height beside the road, the lake bed in the lake, hills beyond. */
  track.terrainHeight = (x, z) => {
    const at = track.locate(x, z, -1, scratch),
      beyond = Math.abs(at.lateral) - at.limit,
      basin = smooth((1.12 - lakeDistance(x, z)) / 0.3);
    // Level with the road out to the wall, then blend into the hills.
    const land = at.y - 0.06 + (hills(x, z) - at.y) * smooth((beyond - 2) / 55);
    // In the lake the bed drops away, also under the bridge.
    return land + (-6 - land) * basin;
  };

  // ---- features ---------------------------------------------------------------------
  const place = (fraction, lateral) => {
    const at = track.sample(fraction * length, lateral, {});
    return { s: fraction * length, lateral, x: at.x, y: at.y, z: at.z, heading: at.heading };
  };
  /** Glowing strips that give a burst of speed. */
  track.pads = BOOST_PADS.map(([fraction, lateral]) => ({ ...place(fraction, lateral), halfWidth: 2.4, halfLength: 4 }));
  /** Wooden ramps across the middle of the road. */
  track.ramps = RAMPS.map((fraction) => ({ ...place(fraction, 0), halfWidth: 5.2, halfLength: 3.2 }));
  /** Item boxes, in rows across the road. */
  track.boxes = BOX_ROWS.flatMap((fraction) =>
    Array.from({ length: BOXES_PER_ROW }, (_, k) => {
      const reach = track.locate(...xz(place(fraction, 0)), -1, {}).halfWidth - 2.2;
      return place(fraction, -reach + (2 * reach * k) / (BOXES_PER_ROW - 1));
    }),
  );
  /** Grid slot `index` (0 is pole): two staggered columns behind the start line. */
  track.gridSlot = (index) => place(-(9 + index * 5.2) / length, index % 2 ? 3.2 : -3.2);

  return track;
}

const xz = (point) => [point.x, point.z];
