// The stage the puppets play on: the lit cloth, the wooden front of the booth, and the scenery pieces that hang
// between the lamp and the cloth. Each is a drawing in SVG; tools/author.mjs takes their pictures.
import { DYE, beads, blob, crescent, dot, leather, poly, ribbon, slit } from './leather.mjs';

const W = 960,
  H = 540;

/** The cloth, lit from behind: brightest where the lamp hangs, darker toward the frame, with the weave showing. */
export const screen = {
  file: 'screen.jpg',
  width: W,
  height: H,
  scale: 1,
  svg: `<defs>
    <radialGradient id="lamp" cx="50%" cy="40%" r="74%"><stop offset="0" stop-color="#fff6d2"/><stop offset="0.3" stop-color="#f9e3a6"/><stop offset="0.66" stop-color="#e2b266"/><stop offset="1" stop-color="#9b5f2c"/></radialGradient>
    <radialGradient id="corner" cx="50%" cy="46%" r="76%"><stop offset="0.62" stop-color="#3a1c0c" stop-opacity="0"/><stop offset="1" stop-color="#2a1208" stop-opacity="0.62"/></radialGradient>
    <filter id="weave" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.34" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.08  0.5 0.4 0.1 0 -0.34"/></filter>
    <filter id="warp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.3 1.1" numOctaves="2" seed="19"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.8  0.4 0.4 0.1 0 -0.36"/></filter>
    <filter id="stain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="3"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.25  0 0 0 0 0.1  0.9 0.6 0 0 -0.62"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#lamp)"/>
  <rect width="${W}" height="${H}" filter="url(#stain)" opacity="0.5"/>
  <rect width="${W}" height="${H}" filter="url(#weave)" opacity="0.55"/>
  <rect width="${W}" height="${H}" filter="url(#warp)" opacity="0.3"/>
  <!-- The cloth is three widths sewn together. -->
  <path d="M320 0V${H}M640 0V${H}" stroke="#7a4a22" stroke-opacity="0.2" stroke-width="1.2"/>
  <rect width="${W}" height="${H}" fill="url(#corner)"/>`
};

const tassel = x => `<path d="M${x} 46v10" stroke="#e0a21a" stroke-width="1.6"/><path d="M${x - 3} 56h6l1.5 13h-9z" fill="#b9281d"/><circle cx="${x}" cy="55" r="2.6" fill="#e0a21a"/>`;
/** The front of the booth: a carved beam with a short valance, two posts and the ledge the players stand behind. */
export const frame = {
  file: 'frame.png',
  width: W,
  height: H,
  scale: 1.5,
  svg: `<defs>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c160c"/><stop offset="1" stop-color="#150a05"/></linearGradient>
    <linearGradient id="post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#150a05"/><stop offset="0.5" stop-color="#32190d"/><stop offset="1" stop-color="#150a05"/></linearGradient>
    <linearGradient id="cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d1410"/><stop offset="1" stop-color="#8f1d16"/></linearGradient>
  </defs>
  <rect x="0" y="0" width="${W}" height="26" fill="url(#wood)"/>
  <path d="M0 26H${W}" stroke="#c98a2a" stroke-opacity="0.75" stroke-width="1.4"/>
  ${Array.from({ length: 23 }, (_, i) => `<path d="${crescent(30 + i * 41, 13, 6, 90)}${crescent(30 + i * 41, 13, 6, 270)}" fill="#c98a2a" fill-opacity="0.5"/>`).join('')}
  <!-- The valance: scallops of red cloth with a gold edge. -->
  <path d="M0 26${Array.from({ length: 12 }, (_, i) => `Q${i * 80 + 40} 66 ${i * 80 + 80} 26`).join('')}Z" fill="url(#cloth)"/>
  <path d="M0 26${Array.from({ length: 12 }, (_, i) => `Q${i * 80 + 40} 66 ${i * 80 + 80} 26`).join('')}" fill="none" stroke="#e0a21a" stroke-width="1.8"/>
  ${Array.from({ length: 12 }, (_, i) => tassel(i * 80 + 40)).join('')}
  <rect x="0" y="0" width="22" height="${H}" fill="url(#post)"/><rect x="${W - 22}" y="0" width="22" height="${H}" fill="url(#post)"/>
  <path d="M22 0V${H}M${W - 22} 0V${H}" stroke="#c98a2a" stroke-opacity="0.6" stroke-width="1.2"/>
  <rect x="0" y="${H - 16}" width="${W}" height="16" fill="url(#wood)"/>
  <path d="M0 ${H - 16}H${W}" stroke="#c98a2a" stroke-opacity="0.75" stroke-width="1.4"/>`
};

/** A curl of auspicious cloud: the outline, and the spiral cut into it. */
function cloud(x, y, s) {
  const shape = blob([[x - 46 * s, y + 6 * s], [x - 40 * s, y - 8 * s], [x - 22 * s, y - 12 * s], [x - 12 * s, y - 24 * s], [x + 8 * s, y - 26 * s], [x + 20 * s, y - 14 * s], [x + 40 * s, y - 12 * s], [x + 48 * s, y + 2 * s], [x + 30 * s, y + 10 * s], [x - 20 * s, y + 12 * s]], 0.6);
  const spiral = (cx, cy, r, turn) => [crescent(cx, cy, r, turn), crescent(cx, cy, r * 0.5, turn + 150)];
  return { shape, holes: [...spiral(x - 24 * s, y - 2 * s, 7 * s, 200), ...spiral(x + 2 * s, y - 12 * s, 9 * s, 250), ...spiral(x + 26 * s, y - 2 * s, 7 * s, 320), slit([x - 30 * s, y + 6 * s], [x + 30 * s, y + 6 * s], 1.2 * s)] };
}
const cloudPiece = (x, y, s, dye, opacity = 0.8) => leather({ ...cloud(x, y, s), fill: dye, opacity, edge: 1.1 });

const blurred = (art, amount) => `<defs><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${amount}"/></filter></defs><g filter="url(#soft)">${art}</g>`;

/** A hall of the heavenly palace, as one flat piece: a tiered roof on pillars. */
function hall(x, base, w, h, dye) {
  const roof = (y, half, rise) => poly([[x - half - 16, y + 4], [x - half, y - 2], [x - half * 0.5, y - rise], [x + half * 0.5, y - rise], [x + half, y - 2], [x + half + 16, y + 4], [x + half - 4, y + 9], [x - half + 4, y + 9]]);
  const top = base - h;
  return (
    leather({ shape: poly([[x - w / 2, base], [x + w / 2, base], [x + w / 2, top + 30], [x - w / 2, top + 30]]), fill: dye, opacity: 0.7, holes: Array.from({ length: Math.floor(w / 26) }, (_, i) => slit([x - w / 2 + 16 + i * 26, top + 44], [x - w / 2 + 16 + i * 26, base - 8], 5)) }) +
    leather({ shape: roof(top + 30, w / 2 + 8, 22), fill: dye, opacity: 0.85, holes: scalesRow(x - w / 2, top + 24, w, 6) }) +
    leather({ shape: roof(top + 6, w / 3, 18), fill: dye, opacity: 0.85, holes: scalesRow(x - w / 3 + 4, top + 1, (w * 2) / 3 - 8, 5) })
  );
}
const scalesRow = (x, y, width, size) => Array.from({ length: Math.floor(width / (size * 2)) }, (_, i) => crescent(x + size + i * size * 2, y, size * 0.7, 90));

/** Far behind the cloth: halls and cloud banks, out of focus. */
export const far = {
  file: 'far.png',
  width: 1400,
  height: 360,
  // It is out of focus, and loses nothing by being kept small.
  scale: 0.6,
  svg: blurred(hall(260, 330, 220, 150, '#8a5a3c') + hall(700, 340, 300, 210, '#7a4d38') + hall(1130, 330, 200, 130, '#8a5a3c') + [[90, 300, 1.6], [470, 320, 2], [930, 310, 1.8], [1300, 318, 1.5], [600, 120, 1.2], [1040, 90, 1]].map(([x, y, s]) => cloudPiece(x, y, s, '#9a6a4a', 0.55)).join(''), 3.2)
};

/** The Southern Gate of Heaven: a ceremonial arch, carved through, with its name on the board. */
export const gate = {
  file: 'gate.png',
  width: 420,
  height: 400,
  scale: 1.5,
  svg: (() => {
    const pillar = x => leather({ shape: poly([[x - 13, 396], [x + 13, 396], [x + 11, 120], [x - 11, 120]]), fill: DYE.crimson, opacity: 0.86, holes: [slit([x, 150], [x, 250], 2.4), slit([x, 270], [x, 370], 2.4), ...beads([x - 6, 132], [x + 6, 132], 3, 1.6)] }) + leather({ shape: poly([[x - 20, 400], [x + 20, 400], [x + 15, 384], [x - 15, 384]]), fill: DYE.black, opacity: 0.9 });
    const roof = (cx, y, half, rise, dye) =>
      leather({
        shape: blob([[cx - half - 30, y - 8], [cx - half, y + 2], [cx - half * 0.55, y - rise], [cx, y - rise - 6], [cx + half * 0.55, y - rise], [cx + half, y + 2], [cx + half + 30, y - 8], [cx + half + 6, y + 14], [cx, y + 12], [cx - half - 6, y + 14]], 0.35),
        fill: dye,
        opacity: 0.88,
        holes: [...scalesRow(cx - half, y + 3, half * 2, 7), ...scalesRow(cx - half * 0.7, y - rise * 0.5, half * 1.4, 6)]
      });
    const board = leather({ shape: poly([[150, 96], [270, 96], [270, 134], [150, 134]]), fill: DYE.teal, opacity: 0.9, holes: beads([156, 100.6], [264, 100.6], 12, 1.3).concat(beads([156, 129.4], [264, 129.4], 12, 1.3)), over: `<text x="210" y="124" text-anchor="middle" font-family="'Noto Serif CJK SC','Songti SC','SimSun',serif" font-weight="900" font-size="25" letter-spacing="5" fill="#f6dc9c">南天門</text>` });
    const beam = (y, h, dye) => leather({ shape: poly([[62, y], [358, y], [358, y + h], [62, y + h]]), fill: dye, opacity: 0.88, holes: Array.from({ length: 11 }, (_, i) => crescent(80 + i * 26, y + h / 2, h * 0.36, 90)).concat(Array.from({ length: 11 }, (_, i) => crescent(80 + i * 26, y + h / 2, h * 0.36, 270))) });
    return pillar(90) + pillar(330) + beam(138, 18, DYE.green) + beam(160, 10, DYE.gold) + roof(210, 84, 150, 34, DYE.green) + roof(210, 44, 96, 30, DYE.green) + board + cloudPiece(60, 388, 1.1, DYE.hide, 0.7) + cloudPiece(360, 388, 1.1, DYE.hide, 0.7);
  })()
};

/** A small cloud to drift by. */
export const wisp = { file: 'wisp.png', width: 120, height: 50, scale: 1.5, svg: blurred(cloudPiece(60, 30, 1.1, '#b98a5a', 0.5), 1.2) };

/** A spark: a soft bright point for the particles. */
export const spark = { file: 'spark.png', width: 32, height: 32, scale: 1, svg: `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="16" r="16" fill="url(#g)"/>` };
/** A scrap of straw, for what flies off the practice post. */
export const chaff = { file: 'chaff.png', width: 16, height: 6, scale: 2, svg: `<path d="${slit([1, 3], [15, 3], 2)}" fill="#fff"/>` };

/** The tiles a level is built of, side by side in the order tools/level.mjs names them; each is 48 units square. */
export const tiles = {
  file: 'tiles.png',
  width: 240,
  height: 48,
  scale: 2,
  svg: (() => {
    const stone = x => `<rect x="${x}" y="0" width="48" height="48" fill="${DYE.black}" fill-opacity="0.9"/>`;
    const top =
      stone(0) +
      `<rect x="0" y="0" width="48" height="6" fill="${DYE.gold}" fill-opacity="0.94"/><path d="M0 0.5H48M0 6H48" stroke="${DYE.ink}" stroke-width="1"/>` +
      `<g fill="#f4d9a0" fill-opacity="0.6"><path d="${crescent(12, 20, 8, 90)}${crescent(12, 20, 3.8, 270)}${dot(24, 18, 1.8)}${crescent(36, 20, 8, 90)}${crescent(36, 20, 3.8, 270)}${dot(0, 18, 1.8)}${dot(48, 18, 1.8)}"/></g>` +
      `<path d="M0 33H48" stroke="${DYE.gold}" stroke-opacity="0.65" stroke-width="1.1"/>`;
    const fill = stone(48) + `<g fill="#f4d9a0" fill-opacity="0.18"><path d="${slit([54, 14], [72, 15.4], 1.3)}${slit([70, 36], [90, 37], 1.3)}"/></g>`;
    // A bank of cloud to stand on: flat above, scalloped below, with an end piece for each side.
    const bank = (x, left, right) => {
      const x0 = x + (left ? 5 : 0),
        x1 = x + 48 - (right ? 5 : 0);
      const under = `Q${x1 - 6} 33 ${x + 36} 27Q${x + 30} 35 ${x + 24} 27Q${x + 18} 35 ${x + 12} 27Q${x0 + 6} 33 ${x0} ${left ? 18 : 27}`;
      const shape = `M${x0} ${left ? 12 : 4}${left ? `Q${x0} 4 ${x0 + 8} 4` : ''}H${right ? x1 - 8 : x1}${right ? `Q${x1} 4 ${x1} 12V18` : 'V27'}${under}Z`;
      return (
        `<path d="${shape}" fill="${DYE.hide}" fill-opacity="0.84"/>` +
        `<path d="${shape}" fill="none" stroke="${DYE.ink}" stroke-width="1.1" stroke-linejoin="round"/>` +
        `<path d="M${x0 + (left ? 6 : 0)} 4H${x1 - (right ? 6 : 0)}" stroke="${DYE.ink}" stroke-width="1.6"/>` +
        `<path d="${crescent(x + 14, 15, 5, 200)}${crescent(x + 34, 15, 5, 340)}" fill="#fff6d2" fill-opacity="0.7" stroke="${DYE.ink}" stroke-width="0.4"/>`
      );
    };
    // Each tile is clipped to its own square, so that none bleeds into its neighbour.
    return [top, fill, bank(96, true, false), bank(144, false, false), bank(192, false, true)].map((art, i) => `<svg x="${i * 48}" y="0" width="48" height="48" viewBox="${i * 48} 0 48 48">${art}</svg>`).join('');
  })()
};

/** An arrow in flight, pointing right. */
export const arrow = {
  file: 'arrow.png',
  width: 46,
  height: 10,
  scale: 2,
  svg: `<path d="M3 5H38" stroke="${DYE.ink}" stroke-width="1.6"/><path d="M36 1.6L45 5L36 8.4Z" fill="${DYE.ink}"/><path d="M1 1.4L9 5L1 8.6M5 1.8L12 5L5 8.2" fill="none" stroke="${DYE.crimson}" stroke-width="1.5"/>`
};

/** A pennant on a pole: where he comes back to if he falls. It stands on the bottom edge of the picture. */
export const pennant = {
  file: 'pennant.png',
  width: 56,
  height: 120,
  scale: 1.5,
  svg:
    leather({ shape: poly([[12, 6], [15, 6], [15, 120], [12, 120]]), fill: DYE.black, opacity: 0.94, edge: 1 }) +
    leather({ shape: poly([[15, 10], [52, 16], [40, 26], [52, 36], [15, 42]]), fill: DYE.red, holes: [dot(24, 26, 3.2), slit([30, 20], [40, 22], 1.2), slit([30, 32], [40, 30], 1.2)], edge: 1 }) +
    leather({ shape: dot(13.5, 5, 3.4), fill: DYE.gold, edge: 1 })
};

/** The Universe Ring in flight: a hoop of gold, carved through all the way round. */
export const ring = {
  file: 'ring.png',
  width: 40,
  height: 40,
  scale: 2,
  svg: leather({ shape: dot(20, 20, 18), fill: DYE.gold, holes: [dot(20, 20, 11.5), ...Array.from({ length: 10 }, (_, i) => dot(20 + 14.8 * Math.cos((i * Math.PI) / 5), 20 + 14.8 * Math.sin((i * Math.PI) / 5), 1.3))], opacity: 0.95, edge: 1.2 }) + `<circle cx="20" cy="20" r="11.5" fill="none" stroke="${DYE.ink}" stroke-width="1.1"/>`
};

// ---- The orchard of the peaches of immortality: the second act -------------------------------------------------
const LEAF = '#2f7d4a',
  BLOSSOM = '#e58a78';
/** A peach tree as one flat piece: a leaning trunk, and a crown of leaves with fruit in it. */
function peachTree(x, base, s, trunk, leaf, fruit = true) {
  const crown = (cx, cy, r) => {
    const shape = blob(Array.from({ length: 9 }, (_, i) => [cx + Math.cos((i / 9) * Math.PI * 2) * r * (i % 2 ? 1 : 0.86), cy + Math.sin((i / 9) * Math.PI * 2) * r * 0.74 * (i % 2 ? 1 : 0.88)]), 0.6);
    const leaves = Array.from({ length: 7 }, (_, i) => crescent(cx + Math.cos(i * 2.4) * r * 0.55, cy + Math.sin(i * 2.4) * r * 0.4, r * 0.13, 40 + i * 70));
    return leather({ shape, fill: leaf, opacity: 0.8, holes: leaves, edge: 1.1 }) + (fruit ? [0.9, 3.2, 5.1].map(a => `<circle cx="${cx + Math.cos(a) * r * 0.5}" cy="${cy + Math.sin(a) * r * 0.36}" r="${r * 0.085}" fill="${BLOSSOM}" stroke="${DYE.ink}" stroke-width="0.7"/>`).join('') : '');
  };
  return (
    leather({ shape: ribbon([[x, base], [x - 4 * s, base - 60 * s], [x + 8 * s, base - 120 * s], [x - 6 * s, base - 176 * s]], [15 * s, 12 * s, 10 * s, 7 * s]), fill: trunk, opacity: 0.86, holes: [slit([x - 2 * s, base - 14 * s], [x - 5 * s, base - 54 * s], 2 * s), slit([x + 3 * s, base - 70 * s], [x + 7 * s, base - 112 * s], 1.8 * s)] }) +
    leather({ shape: ribbon([[x + 6 * s, base - 116 * s], [x + 40 * s, base - 150 * s], [x + 70 * s, base - 158 * s]], [7 * s, 5 * s, 3 * s]), fill: trunk, opacity: 0.86 }) +
    crown(x - 50 * s, base - 196 * s, 62 * s) +
    crown(x + 62 * s, base - 186 * s, 58 * s) +
    crown(x + 4 * s, base - 246 * s, 70 * s)
  );
}

/** Far behind the cloth in the orchard: rows of peach trees on a rise, out of focus. */
export const far2 = {
  file: 'far2.png',
  width: 1400,
  height: 360,
  scale: 0.6,
  svg: blurred(
    `<path d="M0 360V300Q200 262 420 290T860 280T1400 296V360Z" fill="#8a6a44" fill-opacity="0.5"/>` +
      [[110, 316, 0.62], [330, 300, 0.8], [560, 318, 0.56], [760, 296, 0.86], [990, 312, 0.66], [1200, 300, 0.8], [1350, 320, 0.5]].map(([x, base, s], i) => peachTree(x, base, s, '#7a4d38', i % 2 ? '#7c8a52' : '#8a8a4c', false)).join(''),
    3.2
  )
};

/** A peach tree to stand among the players. It stands on the bottom edge of the picture, its trunk in the middle. */
export const tree = { file: 'tree.png', width: 320, height: 380, scale: 1.5, svg: peachTree(160, 380, 1.12, DYE.fur, LEAF) };

/** A peach of immortality, with its leaf. */
export const peach = {
  file: 'peach.png',
  width: 28,
  height: 30,
  scale: 3,
  svg:
    leather({ shape: blob([[21, 4], [26, 7], [22, 11], [16, 9]], 0.5), fill: LEAF, holes: [slit([18, 8], [24, 7], 0.4)], edge: 0.9 }) +
    leather({ shape: blob([[14, 8], [21, 11], [24, 18], [20, 25], [14, 28.4], [8, 25], [4, 18], [7, 11]], 0.5), fill: BLOSSOM, opacity: 0.94, holes: [slit([14, 11], [13, 24], 0.7), crescent(9, 17, 2.2, 170)], edge: 1.1 })
};

/** The way out of the orchard: a moon gate in a tiled wall, with the orchard's name over it. */
export const moongate = {
  file: 'moongate.png',
  width: 380,
  height: 380,
  scale: 1.5,
  svg: (() => {
    const wall = leather({
      shape: poly([[24, 380], [356, 380], [356, 84], [24, 84]]),
      fill: '#cdb07c',
      opacity: 0.82,
      holes: [dot(190, 248, 112), ...[70, 310].flatMap(x => [slit([x - 16, 120], [x + 16, 120], 3), slit([x - 16, 136], [x + 16, 136], 3), slit([x - 16, 152], [x + 16, 152], 3)])],
      over: `<circle cx="190" cy="248" r="112" fill="none" stroke="${DYE.ink}" stroke-width="1.6"/><circle cx="190" cy="248" r="121" fill="none" stroke="${DYE.crimson}" stroke-opacity="0.85" stroke-width="6"/>`
    });
    const roof = leather({ shape: blob([[4, 78], [24, 66], [110, 52], [190, 46], [270, 52], [356, 66], [376, 78], [356, 92], [190, 88], [24, 92]], 0.3), fill: DYE.green, opacity: 0.88, holes: [...scalesRow(30, 80, 320, 7), ...scalesRow(60, 64, 260, 6)] });
    const board = leather({ shape: poly([[136, 98], [244, 98], [244, 130], [136, 130]]), fill: DYE.crimson, opacity: 0.92, holes: beads([141, 102], [239, 102], 11, 1.2).concat(beads([141, 126], [239, 126], 11, 1.2)), over: `<text x="190" y="122" text-anchor="middle" font-family="'Noto Serif CJK SC','Songti SC','SimSun',serif" font-weight="900" font-size="21" letter-spacing="4" fill="#f6dc9c">蟠桃園</text>` });
    return wall + roof + board;
  })()
};

/** The ground of the orchard, in the order tools/level.mjs names the tiles: turf over dark earth, and boughs to stand on. */
export const orchard = {
  file: 'orchard.png',
  width: 240,
  height: 48,
  scale: 2,
  svg: (() => {
    const earth = x => `<rect x="${x}" y="0" width="48" height="48" fill="#3a2414" fill-opacity="0.92"/>`;
    const top =
      earth(0) +
      `<rect x="0" y="0" width="48" height="7" fill="${LEAF}" fill-opacity="0.95"/><path d="M0 0.5H48M0 7H48" stroke="${DYE.ink}" stroke-width="1"/>` +
      `<g fill="#f4d9a0" fill-opacity="0.5"><path d="${slit([8, 11], [11, 21], 1.2)}${slit([14, 10], [15, 19], 1)}${slit([30, 11], [28, 22], 1.2)}${slit([36, 10], [38, 20], 1)}${dot(22, 30, 1.6)}${dot(42, 36, 1.4)}${dot(6, 38, 1.4)}"/></g>`;
    const fill = earth(48) + `<g fill="#f4d9a0" fill-opacity="0.16"><path d="${dot(60, 14, 2.4)}${dot(80, 30, 2)}${dot(68, 40, 1.6)}${slit([84, 10], [92, 12], 1.2)}"/></g>`;
    // A bough: a round limb with leaves hanging from it. An end piece is the same limb pushed in from its side.
    const bough = (x, from, to) =>
      [[8, 3], [20, -2], [33, 4], [43, -3]].map(([at, lean]) => `<path d="${slit([x + at, 14], [x + at + lean, 31], 3.2)}" fill="${LEAF}" fill-opacity="0.85" stroke="${DYE.ink}" stroke-width="0.7"/>`).join('') +
      `<rect x="${x + from}" y="4" width="${to - from}" height="12" rx="6" fill="${DYE.fur}" fill-opacity="0.92" stroke="${DYE.ink}" stroke-width="1.1"/>` +
      `<path d="M${x + Math.max(from, 0) + 6} 7.4H${x + Math.min(to, 48) - 6}" stroke="#f4d9a0" stroke-opacity="0.5" stroke-width="1"/>`;
    return [top, fill, bough(96, 3, 62), bough(144, -14, 62), bough(192, -14, 45)].map((art, i) => `<svg x="${i * 48}" y="0" width="48" height="48" viewBox="${i * 48} 0 48 48">${art}</svg>`).join('');
  })()
};

export const SCENERY = [screen, frame, far, gate, wisp, spark, chaff, tiles, arrow, pennant, ring, far2, tree, peach, moongate, orchard];
