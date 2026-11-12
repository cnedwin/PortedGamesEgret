import { worldBuildingFootprints, worldBuildingKind, worldSurfaceKind, worldTreeCount } from './world-layout.mjs';

function randomAt(x, y, salt = 0) {
  const seed = Math.imul(x + 181 * salt, 374761393) ^ Math.imul(y, 668265263);
  return ((Math.imul(seed ^ seed >>> 13, 1274126177) ^ seed >>> 16) >>> 0) / 4294967296;
}
const compoundKinds = new Set(['inn', 'homestead', 'courtyard', 'temple']);
const trees = {
  broadleaf: ['tree-broad', 0xf2efc9], pine: ['tree-tall', 0xf0f0d6], palm: ['palm', 0xeceabb],
  autumn: ['tree-slim', 0xfac687], 'snow-tree': ['snow-pine', 0xe3f4ec], 'bare-tree': ['bare', 0xf0d7a6],
};

export function createWorldPlacements(world, data, dimensions) {
  const { layers, width, height } = world;
  const footprints = worldBuildingFootprints(world);
  return (left, top, right, bottom) => {
    const placements = new Map();
    function add(key, x, y, size, angle, color, floor = data.heightAt(x, y)) {
      if (!dimensions.has(key)) return;
      if (!placements.has(key)) placements.set(key, []);
      placements.get(key).push({ x, y, size, angle, color, floor });
    }
    function fit(key, x, y, wide, high, deep, angle, color, floor) {
      const bounds = dimensions.get(key);
      if (!bounds) return;
      add(key, x, y, [wide / bounds.x, high / bounds.y, deep / bounds.z], angle, color, floor);
    }
    function compound(kind, footprint) {
      const { x, y, left, right, top, bottom } = footprint;
      const centerX = (left + right) / 2, centerY = (top + bottom) / 2;
      const wide = Math.max(1.60, right - left + 1), deep = Math.max(1.60, bottom - top + 1);
      const grades = [[x, y], [centerX, centerY], [left, top], [right, top], [left, bottom], [right, bottom]]
        .map(([fx, fy]) => data.heightAt(fx, fy));
      const base = Math.max(...grades) + .13;
      const podiumHeight = Math.min(.83, base - Math.min(...grades));
      const trim = 0xf1dfb9, white = 0xfff0d7;
      fit('terrace', centerX, centerY, wide, podiumHeight, deep, 0, kind === 'homestead' ? 0xe7d0a2 : 0xe9ded1, base - podiumHeight);
      if (kind === 'inn') {
        fit('house-red', centerX, centerY - deep * .32, wide * 1.04, 2.57, deep * .39, 0, white, base);
        fit('house-red', centerX - wide * .33, centerY + deep * .03, deep * .69, 2.04, wide * .35, Math.PI / 2, white, base);
        fit('gate', centerX + wide * .22, centerY + deep * .48, wide * .36, 1.08, .31, 0, trim, base);
        return;
      }
      const house = kind === 'temple' ? 'pavilion' : 'house-white';
      fit(house, centerX, centerY - deep * .28, wide * .82, kind === 'temple' ? 2.47 : 1.81, deep * .42, 0, white, base);
      if (kind === 'homestead') {
        fit('house-white', centerX - wide * .31, centerY + deep * .10, deep * .53, 1.25, wide * .35, Math.PI / 2, white, base);
      } else if (kind === 'courtyard' && wide > 2) {
        fit('house', centerX - wide * .31, centerY + deep * .06, deep * .53, 1.42, wide * .36, Math.PI / 2, white, base);
      }
      const wallHeight = kind === 'homestead' ? .41 : .59;
      fit('fence', centerX - wide * .48, centerY, deep, wallHeight, .10, Math.PI / 2, trim, base);
      fit('fence', centerX + wide * .48, centerY - deep * .10, deep * .80, wallHeight, .10, Math.PI / 2, trim, base);
      fit('fence', centerX - wide * .19, centerY + deep * .48, wide * .64, wallHeight, .10, 0, trim, base);
      fit('gate', centerX + wide * .29, centerY + deep * .47, wide * .33, wallHeight + .18, .18, 0, trim, base);
    }
    for (let y = Math.max(0, top); y < Math.min(height, bottom); y++) for (let x = Math.max(0, left); x < Math.min(width, right); x++) {
      const i = y * width + x, building = layers.building[i] >> 1, surface = layers.surface[i] >> 1;
      const hue = randomAt(x, y), scale = randomAt(y, x, 2), angle = Math.PI * 2 * hue;
      const kind = worldBuildingKind(building), groundDetail = worldSurfaceKind(surface);
      if (trees[kind]) {
        const [model, color] = trees[kind], count = worldTreeCount(building, kind);
        const grouping = count > 1 ? .31 : 0;
        const baseSize = kind === 'pine' || kind === 'snow-tree' ? .46 : kind === 'palm' ? .54 : .51;
        for (let n = 0; n < count; n++) {
          const turn = angle + n * Math.PI * 2 / count;
          const size = baseSize + randomAt(x, y, n + 3) * .34;
          const variety = kind === 'broadleaf' && hue > .72 ? 'tree-slim' : model;
          add(variety, x + Math.cos(turn) * grouping, y + Math.sin(turn) * grouping, size, turn, color);
        }
      } else if (compoundKinds.has(kind)) {
        compound(kind, footprints.get(i));
      } else if (kind === 'mountain' || kind === 'hill') {
        const snow = building >= 1190 && building <= 1208 || [1362, 1399].includes(building);
        const big = building > 1347;
        const tall = kind === 'hill' ? .35 + scale * .69 : big ? 4.10 + scale * .90 : 1.75 + scale * 2.20;
        fit('mountain', x, y, big ? 3.4 : 1.8 + scale, tall, big ? 3.7 : 2.2 + scale, angle, snow ? 0xe4ebec : 0xe6d6b2);
      } else if (kind === 'stone') {
        add('stone', x, y, .53 + scale * .46, angle, 0xe5d8b2);
      } else if (kind === 'pond' || kind === 'clearing') {
        const wide = building > 1347 ? 2.5 : 1.45;
        fit(kind === 'pond' ? 'pond' : 'terrace', x, y, wide, .13, wide * .80, angle, 0xcfd3b1);
      } else if (kind === 'grove') {
        for (let n = 0; n < 8; n++) {
          const turn = angle + n * Math.PI / 4;
          add('tree-broad', x + Math.cos(turn) * 1.02, y + Math.sin(turn) * .81, .52, turn, 0xe4eab9);
        }
        add('house', x, y, .78, angle, 0xffe6c6);
      } else if (kind === 'house' || kind === 'shrine') {
        const model = kind === 'shrine' ? 'pavilion' : building % 3 === 0 ? 'house-red' : 'house-white';
        add(model, x, y, kind === 'shrine' ? .67 : .94 + scale * .37, Math.floor(hue * 4) * Math.PI / 2, 0xffebcb);
      } else if (kind === 'reeds') {
        add('reeds', x, y, .9, angle, 0xebefab);
      }
      if (groundDetail === 'bridge') {
        const turn = surface % 2 ? Math.PI / 2 : 0;
        fit('bridge', x, y, .68, .22, 1.10, turn, 0xf2e5c0);
      } else if (groundDetail === 'stone' || groundDetail === 'river-stone') {
        add('stone', x, y, .19 + scale * .27, angle, 0xe5d8b2);
      } else if (groundDetail === 'flowers') {
        const model = surface % 2 ? 'flowers-yellow' : 'flowers-red';
        for (let n = 0; n < 3; n++) {
          const turn = angle + n * Math.PI * 2 / 3;
          add(model, x + Math.cos(turn) * .27, y + Math.sin(turn) * .27, .76 + scale * .41, turn, 0xfff3d1);
        }
      } else if (!building && !data.biomes[i * 4] && !data.routes[i] && !data.biomes[i * 4 + 1]
        && hue > .944) {
        add('brush', x + scale * .26, y + hue * .21, .62 + scale * .72, angle, 0xe2efb3);
      }
    }
    return placements;
  };
}
