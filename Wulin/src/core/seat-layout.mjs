// Shared stronghold placement for the 3D view and construction validation.
export const PLOT = 11;
export const YARD = 42;
export const HALL_AT = Object.freeze({ x: 0, z: -24 });
export const GATE_AT = Object.freeze({ x: 0, z: YARD - 6 });

/** Keep historical save indices in the same order as the courtyard plots. */
function createPlots() {
  const list = [];
  for (const z of [-17, -6, 5, 16]) for (const column of [1, 2, 3]) for (const side of [-1, 1]) {
    list.push(Object.freeze({ x: side * (column * (PLOT - 1) - 1), z, column }));
  }
  return Object.freeze(list.sort((a, b) => a.column - b.column || Math.abs(a.z + 4) - Math.abs(b.z + 4)));
}
export const SEAT_PLOTS = createPlots();
export const PLOT_COUNT = SEAT_PLOTS.length;

/** The kinds that want a place of honour or a quiet corner get their plots first. */
const ORDER = ['board', 'yard', 'range', 'library', 'council', 'mess', 'dorm', 'store', 'clinic', 'cell', 'forge', 'loom', 'still', 'tower', 'garden', 'lumber', 'quarry', 'ironPit', 'goldPit'];

/**
 * Where each kind of building would rather stand: the lower the number for a plot, the better.
 * Study and council sit quietly at the back near the hall; the drill yards flank the middle of
 * the avenue; kitchens, beds and stores keep to the east; the workshops, with their smoke and
 * noise, to the west by the gate; and whatever digs or grows goes to the outer edge.
 */
const side = (plot) => Math.sign(plot.x);
const WANTS = {
  board: (p) => Math.abs(p.z - 16) + p.column * 12 + (side(p) > 0 ? 0 : 1),
  yard: (p) => Math.abs(p.z - 5) + p.column * 9 + (side(p) < 0 ? 0 : 4),
  range: (p) => Math.abs(p.z - 5) + p.column * 9 + (side(p) > 0 ? 0 : 4),
  library: (p) => p.z + 17 + p.column * 4 + (side(p) < 0 ? 0 : 2),
  council: (p) => p.z + 17 + p.column * 4 + (side(p) > 0 ? 0 : 2),
  clinic: (p) => Math.abs(p.z + 6) + p.column * 3 + (side(p) < 0 ? 0 : 5),
  cell: (p) => p.z + 17 - p.column * 3,
  mess: (p) => Math.abs(p.z - 5) + p.column * 3 + (side(p) > 0 ? 0 : 9),
  dorm: (p) => Math.abs(p.z + 2) + p.column * 2 + (side(p) > 0 ? 0 : 7),
  store: (p) => Math.abs(p.z - 16) + p.column * 3 + (side(p) > 0 ? 0 : 7),
  forge: (p) => Math.abs(p.z - 16) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  loom: (p) => Math.abs(p.z - 10) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  still: (p) => Math.abs(p.z - 5) + p.column * 2 + (side(p) < 0 ? 0 : 9),
  tower: (p) => -Math.abs(p.z) - p.column * 6,
};
const edgeFirst = (p) => -p.column * 9 + (p.z + 17) * 0.3;

/** Resolve saved placements before filling spare plots by the building's preferences. */
export function seatLayout(buildings) {
  const sorted = buildings.map((building, index) => ({ building, index }))
    .sort((a, b) => ORDER.indexOf(a.building.kind) - ORDER.indexOf(b.building.kind));
  const reserved = new Map();
  for (const { building, index } of sorted) {
    if (building.kind === 'hall' || building.kind === 'gate') continue;
    const plot = Number(building.plot);
    // Older saves can carry a numeric string instead of a number.
    if ((building.plot === plot || building.plot === String(plot)) && Number.isInteger(plot) && SEAT_PLOTS[plot] && !reserved.has(plot)) reserved.set(plot, index);
  }

  const emptyPlots = SEAT_PLOTS.map((_, index) => index).filter(index => !reserved.has(index));
  const placements = [];
  for (const { building, index } of sorted) {
    if (building.kind === 'hall' || building.kind === 'gate') {
      placements.push({ building, index, plot: null, at: building.kind === 'hall' ? HALL_AT : GATE_AT });
      continue;
    }
    let plot = Number(building.plot);
    if (reserved.get(plot) !== index) {
      if (!emptyPlots.length) continue;
      const want = WANTS[building.kind] ?? edgeFirst;
      let best = 0;
      for (let i = 1; i < emptyPlots.length; i++) {
        if (want(SEAT_PLOTS[emptyPlots[i]]) < want(SEAT_PLOTS[emptyPlots[best]])) best = i;
      }
      plot = emptyPlots.splice(best, 1)[0];
    }
    placements.push({ building, index, plot, at: SEAT_PLOTS[plot] });
  }
  return { placements, emptyPlots };
}

export const availablePlots = (buildings) => seatLayout(buildings).emptyPlots;
