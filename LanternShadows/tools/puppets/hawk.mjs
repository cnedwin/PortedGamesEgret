// The hawk that Erlang becomes: broad in the wing and short in the neck, dark, with his third eye still in its
// brow. It has the crane's bones under other names of feather, and so moves by the crane's animations. It is drawn
// in the air and facing right, with the middle of its body at (100, 120).
import { DYE, barbs, blob, crescent, curve, dot, leather, line, poly, ribbon, slit, stud } from '../leather.mjs';

export { animations, events } from './crane.mjs';

export const bones = [
  ['root', null, [100, 120], [112, 120]],
  ['body', 'root', [92, 123], [112, 118]],
  ['neck1', 'body', [112, 118], [118, 113]],
  ['neck2', 'neck1', [118, 113], [122, 108]],
  ['head', 'neck2', [122, 108], [131, 107]],
  ['wingF1', 'body', [103, 116], [93, 92]],
  ['wingF2', 'wingF1', [93, 92], [74, 72]],
  ['wingB1', 'body', [106, 115], [100, 91]],
  ['wingB2', 'wingB1', [100, 91], [85, 71]],
  ['tail', 'body', [92, 123], [74, 130]],
  ['legs', 'body', [101, 126], [110, 139]]
];

const wing = (points, widths, dye, opacity) => leather({ shape: ribbon(points, widths), fill: dye, opacity, holes: barbs([points[0], points.at(-1)], t => widths[0] * (1 - t * 0.4), 3.6, 0.7, 0.55) });

export const parts = [
  ['wingB2', 'wingB2', wing([[100, 91], [93, 81], [85, 71]], [8.6, 7, 3], DYE.black, 0.82)],
  ['wingB1', 'wingB1', wing([[106, 115], [103, 103], [100, 91]], [8, 9.4, 8.6], DYE.fur, 0.74)],
  ['tail', 'tail', leather({ shape: blob([[93, 119], [93, 127], [76, 137], [70, 130], [74, 122]], 0.4), fill: DYE.amber, holes: [slit([90, 123.4], [75, 129.4], 0.7), slit([89, 125.6], [78, 134], 0.6), slit([88, 121.6], [75, 124.6], 0.6)], over: line(curve([[78, 121.6], [73, 129.6], [77, 136]]), 1.6) })],
  ['legs', 'legs', leather({ shape: ribbon([[101, 126], [106, 133], [110, 139]], [3, 2.2, 1.4]), fill: DYE.gold, edge: 0.9 }) + line(curve([[110, 139], [115, 139.6]]), 1.2) + line(curve([[110, 139], [113.6, 143]]), 1.2) + line(curve([[110, 139], [108.6, 143.6]]), 1.2)],
  ['body', 'body', leather({ shape: blob([[88, 123], [95, 113.6], [108, 111], [116, 115], [117, 121.4], [109, 127.6], [97, 129.6]], 0.5), fill: DYE.fur, holes: [crescent(98, 121, 2.6, 200), crescent(104, 119, 2.6, 200), crescent(110, 118.4, 2.4, 200), crescent(101, 125.4, 2, 200), crescent(107, 124, 2, 200)] })],
  ['neck1', 'neck1', leather({ shape: ribbon([[112, 118], [115.4, 115.6], [118, 113]], [4.6, 4.2, 3.8]), fill: DYE.fur })],
  ['neck2', 'neck2', leather({ shape: ribbon([[118, 113], [120.4, 110.6], [122, 108]], [3.8, 3.6, 3.6]), fill: DYE.black, opacity: 0.9 })],
  [
    'head',
    'head',
    leather({ shape: blob([[127, 104.4], [134.6, 106], [136.6, 110.6], [133.6, 112.6], [133, 109], [127, 109.6]], 0.4), fill: DYE.gold, edge: 0.9 }) +
      leather({ shape: dot(124.4, 106.6, 5.4), fill: DYE.black, opacity: 0.92, holes: [dot(126.6, 105.6, 1.1)], over: `<path d="${slit([123, 101.8], [123.4, 105.4], 1.1)}" fill="${DYE.red}"/>` + line(curve([[124.6, 103], [128.6, 103.6]]), 1) })
  ],
  ['wingF1', 'wingF1', wing([[103, 116], [98, 104], [93, 92]], [8.6, 10, 9], DYE.fur, 0.92) + stud(103, 116, 1.1)],
  ['wingF2', 'wingF2', wing([[93, 92], [84, 82], [74, 72]], [9, 7.4, 3.2], DYE.black, 0.94) + stud(93, 92, 1)]
];
