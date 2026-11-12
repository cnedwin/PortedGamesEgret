const rockPeaks = new Set([1348, 1349, 1352, 1362, 1363, 1374, 1375, 1376, 1377, 1381, 1383, 1386,
  1388, 1390, 1395, 1399, 1404, 1405, 1406, 1407, 1408, 1410, 1412, 1413, 1417, 1419, 1420, 1443]);
const temples = new Set([1364, 1365, 1370, 1380, 1393, 1394, 1409, 1415]);
const groves = new Set([1360, 1379, 1384, 1422]);
const ponds = new Set([1005, 1006, 1007, 1378, 1397, 1423]);
const courtyard = new Set([1354, 1356, 1357, 1359, 1367, 1368, 1369, 1371, 1372, 1373, 1382, 1385,
  1389, 1391, 1396, 1398, 1400, 1401, 1403]);
const between = (id, first, last) => id >= first && id <= last;

export function worldBuildingKind(id) {
  if (id === 1392) return 'inn';
  if (id === 1414) return 'homestead';
  if (ponds.has(id)) return 'pond';
  if (temples.has(id)) return 'temple';
  if (groves.has(id)) return 'grove';
  if (courtyard.has(id)) return 'courtyard';
  if (rockPeaks.has(id) || between(id, 1194, 1213)) return 'mountain';
  if (between(id, 1176, 1193) || between(id, 1242, 1245) || id === 1421) return 'hill';
  if (between(id, 1001, 1004) || between(id, 1165, 1166) || between(id, 1239, 1241) || id === 1418) return 'stone';
  if (between(id, 1070, 1080) || between(id, 1125, 1164)) return 'palm';
  if (between(id, 1017, 1034) || between(id, 1222, 1238)) return 'pine';
  if (between(id, 1035, 1069)) return 'autumn';
  if (between(id, 1081, 1098)) return 'snow-tree';
  if (between(id, 1214, 1221) || between(id, 1104, 1106)) return 'bare-tree';
  if (between(id, 1008, 1016) || between(id, 1099, 1124)) return 'broadleaf';
  if (between(id, 1172, 1175)) return 'reeds';
  if (id === 1416) return 'clearing';
  if (id === 1436) return 'shrine';
  if (between(id, 1402, 1445)) return 'house';
}

export function worldSurfaceKind(id) {
  if (between(id, 701, 731)) return 'field';
  if (between(id, 734, 794) || between(id, 900, 907)) return 'road';
  if (between(id, 801, 838) || between(id, 846, 850)) return 'stone';
  if (between(id, 839, 845)) return 'flowers';
  if (between(id, 863, 869)) return 'bridge';
  if (between(id, 873, 894)) return 'river-stone';
  if (between(id, 895, 899)) return 'dry-crack';
  if (between(id, 732, 733) || between(id, 908, 909)) return 'snow-cover';
}

export function worldBuildingFootprints(world) {
  const { width, height, layers } = world;
  const footprints = new Map();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = y * width + x;
    const id = layers.building[cell] >> 1;
    if (id > 1347 && id < 1450) footprints.set(cell, { x, y, id, left: x, right: x, top: y, bottom: y });
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const cell = y * width + x;
    const bx = layers.buildx[cell], by = layers.buildy[cell];
    if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
    const footprint = footprints.get(by * width + bx);
    if (!footprint) continue;
    footprint.left = Math.min(footprint.left, x);
    footprint.right = Math.max(footprint.right, x);
    footprint.top = Math.min(footprint.top, y);
    footprint.bottom = Math.max(footprint.bottom, y);
  }
  return footprints;
}

const broadleafCount = [3, 3, 4, 3, 3, 2, 2, 2, 3];
const pineCount = [4, 3, 4, 3, 2, 4, 2, 1, 4, 4, 3, 3, 3, 3, 2, 2, 1];

export function worldTreeCount(id, kind) {
  if (between(id, 1008, 1016)) return broadleafCount[id - 1008];
  if (between(id, 1017, 1033)) return pineCount[id - 1017];
  if (kind === 'palm') return between(id, 1134, 1154) ? 1 : 1 + id % 3;
  if (kind === 'snow-tree' || kind === 'autumn' || kind === 'pine') return 1 + id % 3;
  return between(id, 1107, 1119) ? 2 : 1;
}
