// 过桥的人和车：每辆是一两节，每节两个轮（或两只脚），用引擎 2D 物理的圆形刚体表示，两轮之间一根杆；
// 拉车的牲口和车之间一根绳。质量、速度、轮径都在这里。
// Who crosses: each is one or two parts, each part two wheels (or two feet), circles of the engine's 2D physics with a
// rod between them; a rope between the beast and the cart it pulls. Masses, speeds and wheel sizes are here.

/** Each part: `mass` in kilograms, `base` the distance between its wheels, `radius` of a wheel, `height` drawn. */
export const VEHICLES = {
  porter: { speed: 1.6, gap: 1.2, parts: [{ mass: 90, base: 0.5, radius: 0.22, height: 1.7, look: 'porter' }] },
  barrow: { speed: 1.8, gap: 1.4, parts: [{ mass: 230, base: 1.0, radius: 0.3, height: 1.6, look: 'barrow' }] },
  sedan: { speed: 1.4, gap: 1.6, parts: [{ mass: 420, base: 2.2, radius: 0.22, height: 2.0, look: 'sedan' }] },
  horse: {
    speed: 2.6,
    gap: 2,
    parts: [
      { mass: 480, base: 1.3, radius: 0.28, height: 1.7, look: 'horse' },
      { mass: 650, base: 1.6, radius: 0.5, height: 1.8, look: 'cart', hitch: 0.8 }
    ]
  },
  ox: {
    speed: 1.3,
    gap: 2,
    parts: [
      { mass: 650, base: 1.5, radius: 0.3, height: 1.6, look: 'ox' },
      { mass: 900, base: 1.6, radius: 0.55, height: 1.9, look: 'oxcart', hitch: 0.8 }
    ]
  },
  stones: {
    speed: 1.1,
    gap: 2.2,
    parts: [
      { mass: 700, base: 1.5, radius: 0.3, height: 1.6, look: 'ox' },
      { mass: 2600, base: 1.8, radius: 0.55, height: 1.9, look: 'stonecart', hitch: 0.8 }
    ]
  }
};

export const VEHICLE_ORDER = ['porter', 'barrow', 'sedan', 'horse', 'ox', 'stones'];

/** The whole weight of a kind, kilograms. */
export const weightOf = (kind) => VEHICLES[kind].parts.reduce((s, p) => s + p.mass, 0);

/** The length a kind takes on the road, front wheel to last wheel, metres. */
export const lengthOf = (kind) => VEHICLES[kind].parts.reduce((s, p, i) => s + p.base + (i ? p.hitch : 0), 0);
