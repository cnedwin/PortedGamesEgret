// Sculpted as bare stone so the details receive the same light and shadow as the plinth.
const ink = (hex) => [16, 8, 0].map(shift => (((hex >> shift) & 255) / 255) ** 2.2);
const GRANITE = ink(0x788184), CUT = ink(0x475055), LIGHT = ink(0x8a918f);
const BASE = ink(0x616b70), SNOW = ink(0xd3e0e7);

function stone() {
  const solids = [];
  const egg = (c, r, options = {}) => solids.push({
    kind: 'egg', c, r, colour: GRANITE, k: 0.023, ...options
  });
  const box = (c, h, options = {}) => solids.push({
    kind: 'box', c, h, round: 0.04, colour: BASE, k: 0.014, ...options
  });
  const cap = (a, b, ra, rb, options = {}) => solids.push({
    kind: 'cap', a, b, ra, rb, colour: GRANITE, k: 0.023, ...options
  });
  return { solids, egg, box, cap };
}

export function guardianLion() {
  const { solids, egg, box, cap } = stone();
  box([0, 0.105, 0], [0.67, 0.105, 0.83]);
  box([0, 0.338, 0], [0.585, 0.154, 0.73], { colour: GRANITE });
  box([0, 0.53, 0], [0.63, 0.051, 0.79], { colour: LIGHT });
  box([0, 0.594, 0], [0.66, 0.033, 0.807], { colour: BASE, round: 0.021 });
  egg([0, 0.627, 0.065], [0.57, 0.034, 0.66], { colour: SNOW, rough: { scale: 8, amp: 0.028 } });

  egg([0, 1.06, -0.22], [0.395, 0.46, 0.458], { k: 0.08 });
  egg([0, 1.47, 0.065], [0.42, 0.47, 0.389], { k: 0.076 });
  for (const side of [-1, 1]) {
    const d = (y, z, x) => [x * side, y, z];
    egg(d(0.965, -0.21, 0.325), [0.177, 0.29, 0.356], { k: 0.062 });
    egg(d(0.727, -0.024, 0.342), [0.152, 0.113, 0.226], { k: 0.039 });
    cap(d(1.6, 0.255, 0.279), d(0.76, 0.48, 0.248), 0.165, 0.112, { k: 0.061 });
    egg(d(0.738, 0.542, 0.259), [0.153, 0.123, 0.249], { k: 0.052 });
    for (const toe of [-1, 0, 1]) {
      egg(d(0.697, 0.711, 0.259 + toe * 0.078), [0.056, 0.064, 0.086], { colour: LIGHT, k: 0.019 });
    }
  }
  // The tail lies across the rump and returns to one flank.
  const tail = [[0.24, 0.8, -0.52], [0.35, 0.94, -0.56], [0.314, 1.12, -0.626],
    [0.185, 1.22, -0.648], [0.04, 1.25, -0.592], [-0.044, 1.18, -0.548]];
  for (let i = 1; i < tail.length; i++) cap(tail[i - 1], tail[i], 0.057, 0.051);
  egg([0.045, 0.757, 0.575], [0.143, 0.145, 0.15], { colour: BASE });

  // Broad cheek plates, low brows and an undercut jaw read at the chapter camera.
  egg([0, 1.98, 0.092], [0.474, 0.506, 0.416], { k: 0.072 });
  egg([0, 2.196, 0.263], [0.408, 0.315, 0.367], { k: 0.062 });
  egg([0, 1.89, 0.502], [0.284, 0.167, 0.235], { k: 0.035 });
  egg([0, 2.13, 0.695], [0.119, 0.082, 0.08], { colour: BASE, k: 0.017 });
  for (const side of [-1, 1]) {
    egg([side * 0.341, 2.443, 0.143], [0.122, 0.166, 0.107], { k: 0.048, turn: [0.09, 0, side * -0.26] });
    egg([side * 0.141, 2.059, 0.583], [0.153, 0.136, 0.176], { colour: LIGHT, k: 0.046 });
    cap([side * 0.061, 2.282, 0.542], [side * 0.276, 2.352, 0.479], 0.066, 0.067, { colour: LIGHT, k: 0.035 });
    egg([side * 0.176, 2.205, 0.565], [0.121, 0.062, 0.097], { cut: true, colour: CUT, k: 0.018 });
    egg([side * 0.171, 2.205, 0.527], [0.061, 0.041, 0.055], { colour: LIGHT, k: 0.013 });
    egg([side * 0.065, 2.111, 0.753], [0.031, 0.028, 0.041], { cut: true, colour: CUT, k: 0.012 });
  }
  egg([0, 1.94, 0.72], [0.256, 0.071, 0.177], { cut: true, colour: CUT, k: 0.016 });
  for (const side of [-1, 1]) {
    cap([side * 0.179, 1.985, 0.662], [side * 0.162, 1.924, 0.658], 0.036, 0.013, { colour: LIGHT, k: 0.011 });
    cap([side * 0.378, 1.78, 0.238], [side * 0.234, 1.709, 0.365], 0.039, 0.041, { colour: LIGHT });
    cap([side * 0.234, 1.709, 0.365], [0, 1.662, 0.425], 0.041, 0.044, { colour: LIGHT });
  }
  egg([0, 1.598, 0.426], [0.078, 0.112, 0.059], { colour: LIGHT });

  // Shallow spiral grooves follow the exposed face of each mane curl.
  for (let row = 0; row < 3; row++) {
    const count = row === 0 ? 8 : 7;
    for (let i = 0; i < count; i++) {
      const angle = 0.84 + i * (2 * Math.PI - 1.68) / (count - 1);
      const s = Math.sin(angle), c = Math.cos(angle);
      const y = 2.316 - row * 0.218 + Math.abs(c) * 0.018;
      const x = s * (0.33 + row * 0.041), z = 0.121 + c * (0.28 + row * 0.032);
      egg([x, y, z], [0.124, 0.133, 0.127], { k: 0.042 });
      const curl = (step) => {
        const phi = step * 0.83 + i * 0.21 + row * 0.3, r = 0.018 + step * 0.014;
        const t = r * Math.cos(phi), rise = r * Math.sin(phi), reach = Math.sqrt(0.128 ** 2 - r ** 2) - 0.003;
        return [x + s * reach + c * t, y + rise, z + c * reach - s * t];
      };
      for (let step = 1; step <= 6; step++) {
        cap(curl(step - 1), curl(step), 0.019, 0.017, { cut: true, colour: BASE, k: 0.009 });
      }
    }
  }
  egg([0.025, 2.475, -0.027], [0.29, 0.105, 0.284], { colour: SNOW, k: 0.024, rough: { scale: 12, amp: 0.025 } });
  return solids;
}

// Each path is cut into the front. Coordinates keep the strokes wide enough to
// survive packing in the lowest quality tier.
const INSCRIPTION = [
  [[[-0.22, 0.09], [-0.215, -0.17], [0.24, -0.17], [0.235, 0.09]], [[0, 0.22], [-0.005, -0.17]]],
  [
    [[-0.211, 0.215], [-0.16, 0.169]], [[-0.277, 0.094], [-0.112, 0.094], [-0.267, -0.06]],
    [[-0.194, 0.02], [-0.2, -0.239]], [[-0.18, -0.012], [-0.11, -0.074]],
    [[-0.038, 0.12], [0.263, 0.11], [0.251, -0.114], [-0.04, -0.111], [-0.038, 0.12]],
    [[-0.028, 0.004], [0.248, 0.005]], [[0.099, 0.234], [0.1, -0.239]]
  ],
  [
    [[-0.019, 0.239], [0.029, 0.176]], [[0.26, 0.129], [-0.228, 0.13], [-0.234, -0.069], [-0.297, -0.226]],
    [[-0.166, -0.023], [0.214, -0.025], [0.212, -0.204], [-0.164, -0.207], [-0.166, -0.023]],
    [[-0.163, -0.112], [0.213, -0.111]], [[0.02, 0.093], [0.022, -0.204]]
  ]
];

export function templeStele() {
  const { solids, egg, box, cap } = stone();
  box([0, 0.25, 0], [0.74, 0.25, 0.434], { round: 0.051, rough: { scale: 12, amp: 0.014 } });
  box([0, 0.491, 0], [0.68, 0.084, 0.385], { colour: GRANITE, round: 0.045 });
  box([0, 1.855, 0], [0.514, 1.337, 0.155], { colour: GRANITE, round: 0.062, rough: { scale: 12, amp: 0.013 } });
  egg([0, 3.198, 0], [0.515, 0.078, 0.18], { colour: LIGHT, k: 0.035 });
  egg([0.101, 3.239, -0.049], [0.412, 0.041, 0.108], { colour: SNOW, rough: { scale: 12, amp: 0.022 } });
  const recess = (a, b, size) => cap(a, b, size, size, { cut: true, colour: CUT, k: 0.011 });
  for (const side of [-1, 1]) {
    recess([side * 0.41, 0.778, 0.156], [side * 0.41, 2.986, 0.154], 0.019);
    recess([side * 0.523, 1.1 + side * 0.09, 0.102], [side * 0.467, 1.02 + side * 0.09, 0.152], 0.038);
    recess([side * 0.53, 2.7 + side * 0.076, 0.06], [side * 0.489, 2.63 + side * 0.076, 0.137], 0.044);
  }
  for (let i = 0; i < INSCRIPTION.length; i++) {
    const centre = 2.62 - i * 0.58;
    const alongFace = ([x, y]) => [x, centre + y, 0.15];
    for (const path of INSCRIPTION[i]) {
      for (let j = 1; j < path.length; j++) recess(alongFace(path[j - 1]), alongFace(path[j]), 0.023);
    }
  }
  return solids;
}
