// 材料表：每种杆件的造价、重量、最长多长、多硬、能受多大的拉力和压力。单位：米、千克、牛顿、两银。
// 压杆越长越容易失稳：能受的压力按长度打折（`buckle` 是不打折的最长长度）。
// The materials: what each member costs, weighs, how long it may be, how stiff it is, and how much pull and push it
// takes. Units: metres, kilograms, newtons, taels of silver. A long strut buckles sooner: what it takes in compression
// falls with its length (`buckle` is the longest length that takes it whole).

/**
 * `deck`: carts run on it. `rope`: it pulls and never pushes. `mortar`: two stones in a line are held as one, so an
 * arch keeps its shape. `price` is taels a metre; `mass` kilograms a metre; `stiffness` the pull, in newtons, that
 * stretches it by its whole length (EA).
 */
export const MATERIALS = {
  bamboo: { price: 3, mass: 4, maxLength: 3, stiffness: 2.4e6, tension: 16000, compression: 12000, buckle: 2, colour: 0x8fae5a },
  wood: { price: 6, mass: 12, maxLength: 4, stiffness: 5e6, tension: 34000, compression: 30000, buckle: 2.5, colour: 0xa0703f },
  stone: { price: 5, mass: 60, maxLength: 2.5, stiffness: 9e6, tension: 12000, compression: 140000, buckle: 99, mortar: true, colour: 0x9a9a8c },
  rope: { price: 2, mass: 1.5, maxLength: 10, stiffness: 8e6, tension: 22000, compression: 0, buckle: 99, rope: true, colour: 0xc9a86a },
  chain: { price: 14, mass: 15, maxLength: 14, stiffness: 4e7, tension: 110000, compression: 0, buckle: 99, rope: true, colour: 0x5b5f66 },
  plank: { price: 8, mass: 28, maxLength: 2.5, stiffness: 2e7, tension: 30000, compression: 26000, buckle: 2.5, deck: true, colour: 0x8a5a2b },
  slab: { price: 10, mass: 80, maxLength: 2.5, stiffness: 2e7, tension: 24000, compression: 120000, buckle: 99, deck: true, mortar: true, colour: 0x7f8079 }
};

/** The order materials are offered in. */
export const MATERIAL_ORDER = ['plank', 'slab', 'wood', 'bamboo', 'stone', 'rope', 'chain'];

/** A boat under a pontoon: what it costs and weighs, and how it floats. */
/** `spring`: newtons more lift for each metre it sinks; `travel`: how far it sinks before the water comes over. */
export const PONTOON = { price: 60, mass: 400, spring: 60000, travel: 0.6 };
/** A stone pier from the riverbed: what each costs. */
export const PIER_PRICE = 120;

/** What a strut of this material and length takes in compression before it buckles. */
export function compressionOf(material, length) {
  const m = MATERIALS[material];
  if (m.rope) return 0;
  return m.compression * Math.min(1, (m.buckle / length) ** 2);
}

/** Taels for a member of this material and length. */
export const memberPrice = (material, length) => Math.round(MATERIALS[material].price * length * 10) / 10;
