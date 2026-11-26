function oval(c, r, colour, k = 0.002) {
  return { kind: 'egg', c, r, colour, k };
}

function rod(a, b, ra, rb, colour, k = 0.002) {
  return { kind: 'cap', a, b, ra, rb, colour, k };
}

// These are visual parts outside the fitted hand and projectile contact zones.
export function finishEquipment(name, item, rgb) {
  const { solids, edge } = item;
  const steel = rgb(0xb7c9d2), blackSteel = rgb(0x485864), bronze = rgb(0xb38a54);
  const redCord = rgb(0x8c2d28), hemp = rgb(0x9a7761), ebony = rgb(0x402c25);
  switch (name) {
    case 'spear':
      solids.push(rod([0, 0, 1.298], [0, 0, 1.373], 0.029, 0.025, ebony));
      for (const height of [1.306, 1.342, 1.362]) {
        solids.push(oval([0, 0, height], [0.033, 0.033, 0.006], bronze));
      }
      for (const side of [-1, 1]) {
        solids.push(rod([side * 0.024, -0.025, 1.272], [side * 0.052, -0.074, 1.095], 0.012, 0.006, redCord));
        solids.push(rod([side * 0.01, -0.227, 0.95], [side * 0.01, -0.174, 0.979], 0.003, 0.003, hemp));
        edge.push(rod([0, side * 0.014, 1.475], [0, side * 0.010, 1.755], 0.005, 0.0027, steel));
      }
      break;
    case 'glaive':
      solids.push(rod([0, 0, 0.987], [0, 0.004, 1.082], 0.035, 0.027, blackSteel));
      for (const side of [-1, 1]) {
        solids.push(rod([side * 0.032, -0.01, 1.004], [side * 0.027, 0.012, 1.078], 0.005, 0.004, bronze));
      }
      break;
    case 'sabre':
    case 'short': {
      const tip = name === 'sabre' ? 1.25 : 0.95;
      solids.push(oval([0, 0, 0.312], [0.031, 0.069, 0.013], blackSteel));
      for (const side of [-1, 1]) {
        solids.push(oval([0, side * 0.055, 0.312], [0.024, 0.010, 0.011], bronze));
        edge.push(rod([side * 0.0085, -0.013, 0.36], [side * 0.009, -0.015, tip - 0.13], 0.006, 0.003, blackSteel));
        edge.push(rod([side * 0.007, 0.049, 0.39], [side * 0.006, 0.061, tip], 0.0028, 0.002, steel));
      }
      break;
    }
    case 'rattan': {
      // Alternating dye and a copper rim read clearly even in the overhead fight.
      const sectors = 16;
      for (let i = 0; i < sectors; i++) {
        const first = (i / sectors) * 2 * Math.PI;
        const last = ((i + 1) / sectors) * 2 * Math.PI;
        const rim = (angle) => [0.05 + Math.cos(angle) * 0.394, Math.sin(angle) * 0.394, 0.104];
        solids.push(rod(rim(first), rim(last), 0.022, 0.022, i % 2 ? ebony : redCord, 0.003));
        if (i % 2 === 0) {
          solids.push(oval([0.05 + Math.cos(first) * 0.367, Math.sin(first) * 0.367, 0.125], [0.014, 0.014, 0.016], bronze));
        }
      }
      solids.push(oval([0.05, 0, 0.166], [0.073, 0.073, 0.037], bronze));
      break;
    }
    case 'longbow':
      for (const side of [-1, 1]) {
        solids.push(rod([0, side * 0.18, 0.198], [0, side * 0.34, 0.154], 0.016, 0.013, redCord));
        solids.push(rod([0, side * 0.34, 0.154], [0, side * 0.49, 0.100], 0.013, 0.010, ebony));
        for (const [height, depth] of [[0.222, 0.192], [0.318, 0.165], [0.51, 0.090]]) {
          solids.push(oval([0, side * height, depth], [0.017, 0.011, 0.018], hemp));
        }
      }
      break;
  }
  return item;
}

/** Lu's single-edged dao, with a separate spine, forged face and cutting bevel. */
export function makeGlaiveBlade(rgb) {
  const stations = [
    // z, back, edge, half thickness
    [1.04, -0.021, 0.028, 0.012],
    [1.13, -0.032, 0.066, 0.012],
    [1.28, -0.041, 0.102, 0.012],
    [1.48, -0.039, 0.125, 0.011],
    [1.65, -0.021, 0.148, 0.009],
    [1.77, 0.014, 0.167, 0.007],
    [1.86, 0.061, 0.176, 0.005],
    [1.927, 0.123, 0.179, 0.003]
  ];
  const rings = stations.map(([z, back, edge, thick]) => {
    const width = edge - back;
    return [
      [0, back, z],
      [0.7 * thick, back + width * 0.055, z],
      [thick, back + width * 0.14, z],
      [0.72 * thick, edge - width * 0.205, z],
      [0.08 * thick, edge, z],
      [-0.08 * thick, edge, z],
      [-0.72 * thick, edge - width * 0.205, z],
      [-thick, back + width * 0.14, z],
      [-0.7 * thick, back + width * 0.055, z]
    ];
  });
  const tints = [0x697684, 0x97a5ae, 0x9ca9b4, 0xc7d2d9, 0xaab8c0, 0xc7d2d9, 0x9ca9b4, 0x97a5ae, 0x697684].map(rgb);
  const positions = [], normals = [], colours = [], indices = [];
  function face(points, tint) {
    const [a, b, c] = points;
    const u = b.map((v, i) => v - a[i]), v = c.map((value, i) => value - a[i]);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...n), first = positions.length / 3;
    for (const point of points) {
      positions.push(...point);
      normals.push(...n.map(value => value / length));
      colours.push(...tint);
    }
    for (let i = 1; i + 1 < points.length; i++) indices.push(first, first + i, first + i + 1);
  }
  for (let i = 1; i < rings.length; i++) {
    const previous = rings[i - 1], next = rings[i];
    for (let j = 0; j < previous.length; j++) {
      const k = (j + 1) % previous.length;
      face([previous[j], previous[k], next[k], next[j]], tints[j]);
    }
  }
  const last = rings.at(-1), point = [0, 0.176, 1.964];
  for (let i = 0; i < last.length; i++) face([last[i], last[(i + 1) % last.length], point], tints[i]);
  face([...rings[0]].reverse(), tints[0]);
  return {
    positions: Float32Array.from(positions), normals: Float32Array.from(normals), colours: Float32Array.from(colours),
    stuffs: new Uint8Array(positions.length / 3).fill(3), indices: Uint32Array.from(indices),
    lo: [-0.012, -0.041, 1.04], hi: [0.012, 0.179, 1.964]
  };
}
