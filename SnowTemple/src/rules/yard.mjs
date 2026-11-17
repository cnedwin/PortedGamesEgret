// Holding the fodder yard: wave after wave comes in from the gate, the fence gaps and the sides, each a
// little larger and tougher than the last, with a leader among them from the third wave on.

/** Where men come into the yard. */
const WAYS = [
  [0, -4.4],
  [-2.2, -3.6],
  [2.4, -3.8],
  [-9.5, 3.2],
  [9.6, 4.6],
  [-0.4, 17.8],
  [-7.2, 9.6],
  [1.6, 18.4]
];
export const AFFIXES = {
  swift: { name: '快手', text: '走得快，出手也快' },
  iron: { name: '铁甲', text: '血厚，轻击打不动他' },
  ember: { name: '火把', text: '打到哪里烧到哪里，自己不怕火' }
};

/** Who comes in wave `n` (1 is the first): `{ kind, x, z, elite }`, and how much tougher they are. */
export function waveOf(n, rand) {
  const count = Math.min(3 + Math.floor(n / 2), 7),
    bows = Math.min(n >= 6 ? 3 : 2, Math.floor((n + 1) / 2)),
    shields = n >= 2 ? Math.min(2, Math.floor(n / 3) + 1) : 0,
    men = [],
    ways = [...WAYS];
  for (let i = 0; i < count; i++) {
    const [x, z] = ways.splice(Math.floor(rand() * ways.length), 1)[0];
    men.push({ kind: i < bows ? 'bow' : i < bows + shields ? 'shield' : 'blade', x, z, elite: null });
  }
  // From the third wave one of the close fighters leads them.
  if (n >= 3) {
    const close = men.filter((man) => man.kind !== 'bow');
    close[Math.floor(rand() * close.length)].elite = Object.keys(AFFIXES)[(n + Math.floor(rand() * 3)) % 3];
  }
  return { men, hp: 1 + (n - 1) * 0.07 };
}
