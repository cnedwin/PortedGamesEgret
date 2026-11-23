// The chosen plot is the only durable decision. Population and timber are derived from it.
export const PLOTS = Object.freeze([
  { id: 'willow', x: 254, y: 360 },
  { id: 'terrace', x: 506, y: 314 },
  { id: 'ford', x: 740, y: 348 }
]);
export const MATERIALS = 12;
export const BUILD_COST = 8;
export const SETTLERS = 2;
export const isPlot = id => PLOTS.some(plot => plot.id === id);

export function beginWorld(house = null) {
  if (house !== null && !isPlot(house)) throw new TypeError('Unknown homesite');
  return { house, selected: null };
}

export function selectPlot(world, id) {
  if (world.house !== null || !isPlot(id)) return false;
  world.selected = id;
  return true;
}

export function cancelPreview(world) {
  world.selected = null;
}

export function buildHome(world) {
  if (world.house !== null || !isPlot(world.selected)) return false;
  world.house = world.selected;
  world.selected = null;
  return true;
}

export function supplies(world) {
  return { timber: MATERIALS - (world.house ? BUILD_COST : 0), residents: world.house ? SETTLERS : 0 };
}
