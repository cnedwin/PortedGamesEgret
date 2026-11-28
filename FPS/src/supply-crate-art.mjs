// Cosmetic case art only. The supply rules and the lid hinge stay in the view/game.
import { createBuilder, rgb } from './build.mjs';

/** The original exterior envelope and latch, but an empty procedural shell. */
export function createSupplyCrateBodyGeometry() {
  const shell = rgb(0x4b5a3d), inner = rgb(0x3a4837);
  return createBuilder()
    .box(0, .035, 0, 1.05, .07, .62, { tint: inner })
    .box(-.5, .295, 0, .05, .45, .62, { tint: shell })
    .box(.5, .295, 0, .05, .45, .62, { tint: shell })
    .box(0, .295, -.285, .95, .45, .05, { tint: shell })
    .box(0, .295, .285, .95, .45, .05, { tint: shell })
    .box(0, .26, -.315, .22, .14, .02, { tint: rgb(0xd9a520) })
    .finish();
}

/**
 * One inexpensive vertex-colored mesh: recessed case lining, foam dividers,
 * generic sealed packages and a small colored quality tag. Geometry follows
 * the mounted body envelope, stays inside the rim, and does not represent or
 * affect individual inventory items. No emissive plane or extra draw layer.
 */
export function createSupplyCrateInteriorGeometry(bounds, rarity) {
  const [x0, y0, z0, x1, y1, z1] = bounds;
  const width = (x1 - x0) * .78, depth = (z1 - z0) * .72, height = y1 - y0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const liner = rgb(0x303a35), edge = rgb(0x49564c), foam = rgb(0x3d4843);
  const canvas = rgb(0x77765d), canvasEdge = rgb(0x646752), strap = rgb(0x414942);
  const box = rgb(0x646f72), lid = rgb(0x839091), pouch = rgb(0x796e62), seam = rgb(0xa49b83);
  const paper = rgb(0xbeb99e), ink = rgb(0x595f58), base = rgb(0x45574b);
  // A small restrained color cue from the original rarity palette; the whole
  // interior remains naturally lit instead of emitting saturation in darkness.
  const cue = base.map((component, i) => component * .60 + (rarity?.[i] ?? component) * .40);
  const b = createBuilder();
  // Coordinates are normalized to the inset plan; y is height above the floor.
  const put = (x, z, w, d, bottom, h, tint, yaw = 0) => b.box(
    cx + x * width, y0 + (bottom + h * .5) * height, cz + z * depth,
    w * width, h * height, d * depth, { tint, yaw, skipBottom: true }
  );
  put(0, 0, 1, 1, .145, .035, liner);
  put(-.475, 0, .05, 1, .18, .10, edge);
  put(.475, 0, .05, 1, .18, .10, edge);
  put(0, -.475, .90, .05, .18, .10, edge);
  put(0, .475, .90, .05, .18, .10, edge);
  put(0, 0, .055, .90, .18, .085, foam);
  put(.25, -.055, .40, .06, .18, .085, foam);
  // Canvas case: a shaped two-layer package, dark retaining straps and folded edge.
  put(-.235, -.035, .40, .72, .18, .35, canvasEdge);
  put(-.235, -.035, .36, .65, .53, .045, canvas);
  put(-.235, -.215, .37, .075, .575, .017, strap);
  put(-.235, .145, .37, .075, .575, .017, strap);
  put(-.235, -.035, .18, .20, .575, .014, paper);
  put(-.235, -.05, .12, .025, .589, .009, ink);
  // Small rigid labelled box and a smaller sealed parcel, both beneath the rim.
  put(.25, .215, .35, .39, .18, .43, box);
  put(.25, .215, .37, .41, .61, .045, lid);
  put(.25, .215, .22, .20, .655, .015, paper);
  put(.25, .18, .15, .028, .67, .008, ink);
  put(.25, -.285, .33, .30, .18, .27, pouch);
  put(.25, -.285, .31, .045, .45, .025, seam);
  put(.25, -.23, .19, .065, .45, .015, cue);
  return b.finish();
}
