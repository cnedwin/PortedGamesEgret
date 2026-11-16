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

// The valance and corner brackets hug the frame so they leave the upper jump lane open.
const valance = Array.from({ length: 8 }, (_, i) => {
  const x = i * 120;
  return `<path d="M${x} 24Q${x + 60} 61 ${x + 120} 24Z" fill="url(#silk)" stroke="#a07544" stroke-width="1.1"/>
  <path d="M${x + 7} 26Q${x + 60} 52 ${x + 113} 26M${x + 23} 25Q${x + 60} 49 ${x + 97} 25" fill="none" stroke="#d6ac79" stroke-opacity=".34" stroke-width=".7"/>
  <path d="M${x + 60} 42v6m-2 2-.9 11h5.8l-.9-11Z" fill="#852d28" stroke="#b8884b" stroke-width=".7"/>
  <circle cx="${x + 60}" cy="49" r="2" fill="#c2a064"/>`;
}).join('');

const carpentry = side => `<g${side === 'right' ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>
  <path d="M2 27H46L42 39Q32 38 26 61H2Z" fill="#251311" stroke="#93633f" stroke-width="1.5"/>
  <path d="M4 30H40L37 35Q28 36 22 55H4Z" fill="#543027" stroke="#c39362" stroke-width=".75"/>
  <path d="M6 44H14Q14 34 20 34q6 0 6 5t-8 5h-3m-8 8 12-1" fill="none" stroke="#c19766" stroke-width="1.1"/>
  <path d="M6 70V518M11 73V514" stroke="#ac794d" stroke-opacity=".42" stroke-width=".75"/>
  <path d="M18 70V523" stroke="#d0a46d" stroke-opacity=".7" stroke-width="1"/>
</g>`;

/** The front of the booth is lacquered wood, carved brackets and a short scalloped silk valance. */
export const frame = {
  file: 'frame.png',
  width: W,
  height: H,
  scale: 1.5,
  svg: `<defs>
    <linearGradient id="wood" x2="0%" y2="100%"><stop stop-color="#211210"/><stop offset=".45" stop-color="#482923"/><stop offset="1" stop-color="#21120e"/></linearGradient>
    <linearGradient id="post" x2="100%" y2="0%"><stop stop-color="#190f0d"/><stop offset=".52" stop-color="#503029"/><stop offset="1" stop-color="#221310"/></linearGradient>
    <linearGradient id="silk" x2="0%" y2="100%"><stop stop-color="#4c161a"/><stop offset="1" stop-color="#8b332a"/></linearGradient>
    <pattern id="inlay" width="78" height="15" patternUnits="userSpaceOnUse">
      <path d="M0 7.5h10l4-4 4 4-4 4-4-4m8 0h13l8-5 8 5-8 5-8-5m16 0h13l4-4 4 4-4 4-4-4m8 0h10" fill="none" stroke="#bb8f59" stroke-opacity=".65" stroke-width=".8"/>
      <circle cx="39" cy="7.5" r="1.7" fill="#b8915e"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${W}" height="26" fill="url(#wood)"/>
  <path d="M0 3H${W}M0 21H${W}" stroke="#b2834e" stroke-opacity=".65" stroke-width="1"/>
  <rect x="0" y="3" width="${W}" height="15" fill="url(#inlay)"/>
  ${valance}
  <path d="M0 24H${W}" stroke="#c49962" stroke-width="1.1"/>
  <rect x="0" y="0" width="20" height="${H}" fill="url(#post)"/><rect x="${W - 20}" y="0" width="20" height="${H}" fill="url(#post)"/>
  ${carpentry('left')}${carpentry('right')}
  <rect x="0" y="${H - 16}" width="${W}" height="16" fill="url(#wood)"/>
  <path d="M0 524H${W}M0 528H${W}M0 537H${W}" stroke="#b2834e" stroke-opacity=".6" stroke-width=".85"/>
  <rect x="22" y="526" width="${W - 44}" height="13" fill="url(#inlay)" opacity=".55"/>`
};

/** A curl of auspicious cloud: the outline, and the spiral cut into it. */
function cloud(x, y, s) {
  const shape = blob([[x - 46 * s, y + 6 * s], [x - 40 * s, y - 8 * s], [x - 22 * s, y - 12 * s], [x - 12 * s, y - 24 * s], [x + 8 * s, y - 26 * s], [x + 20 * s, y - 14 * s], [x + 40 * s, y - 12 * s], [x + 48 * s, y + 2 * s], [x + 30 * s, y + 10 * s], [x - 20 * s, y + 12 * s]], 0.6);
  const spiral = (cx, cy, r, turn) => [crescent(cx, cy, r, turn), crescent(cx, cy, r * 0.5, turn + 150)];
  return { shape, holes: [...spiral(x - 24 * s, y - 2 * s, 7 * s, 200), ...spiral(x + 2 * s, y - 12 * s, 9 * s, 250), ...spiral(x + 26 * s, y - 2 * s, 7 * s, 320), slit([x - 30 * s, y + 6 * s], [x + 30 * s, y + 6 * s], 1.2 * s)] };
}
const cloudPiece = (x, y, s, dye, opacity = 0.8) => leather({ ...cloud(x, y, s), fill: dye, opacity, edge: 1.1 });

const blurred = (art, amount) => `<defs><filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${amount}"/></filter></defs><g filter="url(#soft)">${art}</g>`;

const scalesRow = (x, y, width, size) => Array.from({ length: Math.floor(width / (size * 2)) }, (_, i) => crescent(x + size + i * size * 2, y, size * 0.7, 90));

/** Each backdrop is hung twice, with a small overlap. Its edges fade before the adjoining copy starts. */
const backdrop = art => `<defs>
  <linearGradient id="join"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".06" stop-color="#fff"/>
  <stop offset=".94" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="seams"><rect width="1400" height="360" fill="url(#join)"/></mask>
</defs><g mask="url(#seams)">${art}</g>`;

/** Tiered halls carved from separate pieces, with openings that let the cloth show through. */
function cloudHall(x, y, scale, opacity, tiers = 2) {
  const roof = (height, half) => `<path d="M${-half - 18} ${height - 5}q21 8 48-20l12-10h${2 * half - 84}
    l12 10q27 28 48 20Q${half + 6} ${height + 12} 0 ${height + 10}Q${-half - 6} ${height + 12} ${-half - 18} ${height - 5}Z" fill="#557879" stroke="#41575b" stroke-width="1.2"/>
    <path d="M${-half - 8} ${height}Q${-half / 2} ${height - 1} 0 ${height - 3}T${half + 8} ${height}" fill="none" stroke="#cfc49b" stroke-opacity=".7" stroke-width="1.3"/>`;
  const pillars = [-56, -28, 0, 28, 56].map(dx => `<path d="M${dx - 4} -79h8l1 68h-10Z" fill="#9b7554"/>
    <path d="M${dx - 7} -16h14v6h-14Z" fill="#755548"/>`).join('');
  const railing = [-74, -52, -30, -8, 14, 36, 58].map(dx => `M${dx} -19v10`).join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <path d="M-86-8h172l12 8H-98Z" fill="#867f66"/>
    <path d="M-74-83h148v13H-74Z" fill="#8d6e53"/>${pillars}
    <path d="M-78-19h156${railing}" stroke="#ad9480" stroke-width="2" fill="none"/>
    ${roof(-88, 85)}
    ${tiers > 1 ? `<path d="M-44-112h88v26h-88Z" fill="#93705b"/>${roof(-115, 49)}` : ''}
    ${tiers > 2 ? `<path d="M-28-138h56v27h-56Z" fill="#94745c"/>${roof(-137, 45)}` : ''}
  </g>`;
}

/** Southern Heaven: pale mountain fans and a jade-roofed precinct suspended above the cloud banks. */
export const far = {
  file: 'far.png',
  width: 1400,
  height: 360,
  scale: 0.6,
  svg: backdrop(`
    <path d="M0 298 103 250 162 173 216 141 282 196 326 175 406 237 477 263 520 244 571 192 656 173 721 237
      772 253 819 234 908 124 954 155 1002 222 1070 250 1142 190 1190 174 1283 256 1400 279V347H0Z" fill="#719999" opacity=".38"/>
    <path d="M23 293Q130 230 226 258T420 278Q491 246 558 262T750 287Q826 252 936 244T1153 270Q1260 267 1400 306V352H0Z" fill="#a8a78a" opacity=".33"/>
    <path d="M80 312Q240 294 345 303T571 307Q673 277 824 293T1018 312Q1191 302 1380 322V339H80Z" fill="#9a8871" opacity=".38"/>
    ${cloudHall(131, 306, .75, .45, 1)}${cloudHall(410, 303, 1.08, .73)}
    ${cloudHall(710, 290, 1.39, .79, 3)}${cloudHall(1000, 312, .85, .66, 1)}
    ${cloudHall(1220, 300, 1.04, .6)}
    <g fill="#ad8d63" opacity=".45">
      <path d="M28 329Q119 319 171 330T318 330Q362 315 392 318 377 296 421 300 439 306 432 313Q497 307 533 330
        636 327 678 336 743 325 801 333Q866 322 939 329 991 308 1040 317Q1074 322 1060 331 1160 321 1258 337
        1336 323 1400 337V360H0Z"/>
      <path d="M48 273Q104 259 143 264 156 242 205 249 220 255 206 262Q256 255 315 268 233 279 48 273Z
        M824 215Q907 202 969 211 990 186 1031 197 1045 204 1034 210Q1091 204 1175 218 1053 229 824 215Z"/>
    </g>
    <path d="M28 341Q120 327 210 339t192-3 204 5m105-6q145-8 235 4t223 0m-126-104q80 5 163 0"
      fill="none" stroke="#dfd0a5" stroke-width="2" stroke-opacity=".7"/>`)
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

/** A row of flowering peach-tree silhouettes. Each branch carries irregular hand-cut petals. */
function blossomTree(x, y, scale, paint, flip = false) {
  const buds = [[-78, -123], [-50, -125], [-41, -149], [-18, -150], [-4, -166], [27, -138], [58, -146], [78, -128], [90, -139], [55, -111]];
  const petals = buds.map(([cx, cy], i) => {
    const size = 5 + i % 3 * 1.7;
    return `<path d="M${cx - size} ${cy}q${size * .36} ${-size} ${size} ${-size * .58}q${size * .66} ${-size * .64} ${size} ${size * .58}q${-size * .55} ${size} ${-size} ${size * .67}q${-size * .66} ${size * .45} ${-size} ${-size * .67}Z" fill="#eed3a2" opacity=".56"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
    <path d="M-11 0Q4-39-6-67L-35-98-69-122-84-130-57-124-28-105-28-127-20-143-21-116-8-91 5-71
      24-100 50-127 79-144 70-131 49-118 50-109 80-109 59-103 47-105 26-85 14-61Q9-17 16 0Z" fill="#88694b" opacity=".84"/>
    <path d="M-96-133Q-92-141-78-141-73-153-57-146-54-164-34-157-27-169-6-159 5-181 22-166 43-166
      47-152 66-163 72-149 89-155 92-142Q111-144 102-130 112-115 89-117 83-104 62-112 52-101 40-116
      27-112 23-126 7-121-7-139-25-132-38-140-51-127-62-134Q-85-119-96-133Z" fill="${paint}" opacity=".81"/>
    <path d="M-10-9q12-34 8-57m3 20q4-24 25-47m-41 9-26-22" fill="none" stroke="#cfab71" stroke-width="1.8" opacity=".55"/>
    ${petals}</g>`;
}

/** The Peach Orchard colours the distance with coral branches above cool, sparse hills. */
export const far2 = {
  file: 'far2.png',
  width: 1400,
  height: 360,
  scale: 0.6,
  svg: backdrop(`
    <path d="M0 275 71 231 130 240 171 222 234 201 286 222 345 254 429 215 522 232 590 184 634 175 683 207
      750 236 842 229 913 187 967 174 1038 213 1119 229 1182 195 1252 220 1314 224 1400 260V330H0Z" fill="#819485" opacity=".33"/>
    <path d="M0 307Q134 260 243 280T463 274Q570 251 689 282T938 280 1150 289 1400 280V349H0Z" fill="#7e9069" opacity=".48"/>
    <path d="M0 328Q122 302 245 309T438 309Q570 289 695 313T937 313 1182 319 1400 317V360H0Z" fill="#9d8c5b" opacity=".48"/>
    <g opacity=".59">
      ${blossomTree(76, 304, .46, '#c39386')}${blossomTree(272, 286, .64, '#c79486', true)}
      ${blossomTree(460, 310, .71, '#bb9485')}${blossomTree(608, 296, .56, '#d5aa8f', true)}
      ${blossomTree(835, 297, .64, '#cf9783')}${blossomTree(1010, 309, .78, '#ca9587', true)}
      ${blossomTree(1278, 304, .57, '#caa08b')}${blossomTree(1360, 319, .51, '#c59482', true)}
    </g>
    ${blossomTree(137, 332, 1.32, '#bd7f79', true)}${blossomTree(356, 335, .94, '#b57a77')}
    ${blossomTree(712, 346, 1.39, '#be8180', true)}${blossomTree(1124, 333, 1.17, '#b07c78')}
    ${blossomTree(1322, 354, .76, '#c18a81', true)}
    <path d="M38 347q106-14 209-1m43-11q86-18 176-5m178 14q180-20 338-4m32-2q101 5 186-2m32 16 120-6"
      stroke="#cfc093" stroke-width="1.5" opacity=".65" fill="none"/>`)
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

// ---- The Tushita Palace, where Laozi refines his elixir: the third act ------------------------------------------
/** A furnace for the elixir, as one flat piece: a round belly on three legs, a lid, and a mouth with the fire in it. */
function furnacePiece(x, base, s, dye = DYE.amber, lit = true) {
  const at = (dx, dy) => [x + dx * s, base - dy * s];
  return (
    [-22, 0, 22].map(dx => leather({ shape: poly([at(dx - 5, 0), at(dx + 5, 0), at(dx + 3, 22), at(dx - 3, 22)]), fill: DYE.black, opacity: 0.9 })).join('') +
    leather({
      shape: blob([at(-34, 30), at(-40, 56), at(-30, 84), at(0, 92), at(30, 84), at(40, 56), at(34, 30), at(0, 20)], 0.5),
      fill: dye,
      opacity: 0.88,
      holes: [dot(...at(0, 52), 13 * s), ...[-1, 1].flatMap(side => [crescent(...at(side * 25, 66), 4 * s, side > 0 ? 0 : 180), crescent(...at(side * 27, 44), 4 * s, side > 0 ? 0 : 180)]), ...beads(at(-24, 80), at(24, 80), 7, 1.3 * s)],
      over: `<circle cx="${x}" cy="${base - 52 * s}" r="${13 * s}" fill="none" stroke="${DYE.ink}" stroke-width="1.2"/>` + (lit ? `<circle cx="${x}" cy="${base - 52 * s}" r="${9 * s}" fill="${DYE.red}" fill-opacity="0.8"/>` : '')
    }) +
    leather({ shape: blob([at(-30, 90), at(-20, 104), at(0, 110), at(20, 104), at(30, 90), at(0, 86)], 0.4), fill: DYE.crimson, opacity: 0.9, holes: [slit(at(-14, 97), at(14, 97), 1.2 * s)] }) +
    leather({ shape: dot(...at(0, 114), 5 * s), fill: DYE.gold })
  );
}

/** Stained lattice, open around its axis so the stage light still reads through it. */
function palaceLattice(x, y, size) {
  return `<svg x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" viewBox="0 0 100 100">
    <path d="M33 7H67L93 33V67L67 93H33L7 67V33Z" fill="#c69059" fill-opacity=".16" stroke="#8c624a" stroke-width="3"/>
    <path d="M33 12H67L88 33V67L67 88H33L12 67V33Z" fill="none" stroke="#c19e64" stroke-width="2.5"/>
    <path d="M32 14v72m12-73v22m12-22v22m12-21v72M44 65v22m12-22v22M14 32h72M14 68h72
      M13 44h22m-22 12h22m30-12h22m-22 12h22" fill="none" stroke="#987156" stroke-width="1.8"/>
    <path d="M50 36 64 50 50 64 36 50Z" fill="none" stroke="#a7754c" stroke-width="2"/>
    <circle cx="50" cy="50" r="5" fill="#ba8b5d" opacity=".62"/>
  </svg>`;
}

/** The Tushita Palace is an interior of smoke, lacquered joinery and bronze alchemy furnaces. */
export const far3 = {
  file: 'far3.png',
  width: 1400,
  height: 360,
  scale: 0.6,
  svg: backdrop(`
    <defs><linearGradient id="soot" x2="0%" y2="100%"><stop stop-color="#772d29" stop-opacity="0"/>
      <stop offset=".11" stop-color="#772d29" stop-opacity=".55"/>
      <stop offset=".6" stop-color="#ad744e" stop-opacity=".12"/><stop offset="1" stop-color="#9f6c50" stop-opacity=".36"/>
    </linearGradient></defs>
    <rect width="1400" height="360" fill="url(#soot)"/>
    <path d="M0 44H1400V67H0ZM0 316H1400V330H0Z" fill="#70534a" opacity=".36"/>
    <path d="M0 53H1400M0 60H1400M0 321H1400M0 333H1400" stroke="#b08b66" stroke-width="2" opacity=".58"/>
    <g opacity=".65">
      ${palaceLattice(173, 130, 113)}${palaceLattice(457, 145, 136)}${palaceLattice(713, 124, 102)}
      ${palaceLattice(958, 135, 129)}${palaceLattice(1230, 144, 111)}
    </g>
    <g fill="none" stroke="#9c785d" stroke-width="1.3" opacity=".55">
      <path d="M0 209H1400M0 219H1400M0 279H1400M0 290H1400"/>
      <path d="M102 219v60m84-60v60m88-60v60m87-60v60m88-60v60m88-60v60m87-60v60m88-60v60m88-60v60m87-60v60m88-60v60m88-60v60m88-60v60m88-60v60m88-60v60"/>
    </g>
    <g opacity=".58">
      <path d="M42 48H280L259 79H63ZM314 51H578L565 89H327ZM625 50H799L785 82H642ZM846 49H1075L1057 84H865ZM1112 46H1354L1336 77H1129Z"
        fill="#854941" stroke="#ae8860" stroke-width="2"/>
      ${[49, 299, 603, 822, 1094, 1350].map(x => `<path d="M${x - 9} 47h18l3 278h-24Z" fill="#785246"/>
        <path d="M${x - 15} 66h30l-2 12h-26ZM${x - 15} 311h30v13h-30Z" fill="#695048"/>
        <path d="M${x - 4} 84v223M${x + 4} 84v223" stroke="#b2835b" stroke-width="1.8"/>`).join('')}
    </g>
    <g opacity=".64">${furnacePiece(201, 338, 1.22, '#a57958', false)}
      ${furnacePiece(506, 334, .88, '#997455', false)}${furnacePiece(724, 341, 1.43, '#987252', false)}
      ${furnacePiece(995, 338, 1.14, '#a38060', false)}${furnacePiece(1275, 345, 1.37, '#9e7458', false)}
    </g>
    <path d="M0 354Q163 319 302 348T602 344T872 344T1152 349T1400 340V360H0Z" fill="#9d795c" opacity=".28"/>`)
};

/** A small furnace that stands in his way and can be knocked over. It stands on the bottom edge of the picture, in the middle. */
export const furnace = { file: 'furnace.png', width: 96, height: 124, scale: 2, svg: furnacePiece(48, 124, 1) };

/** A pill from the alchemist's gourd. */
export const pill = { file: 'pill.png', width: 20, height: 20, scale: 3, svg: leather({ shape: dot(10, 10, 8), fill: DYE.red, opacity: 0.95, holes: [crescent(8, 8, 2.4, 220)], edge: 1.2 }) + `<circle cx="10" cy="10" r="2" fill="${DYE.gold}"/>` };

/** A grate in the floor that the furnace under it breathes fire through. It lies on the bottom edge of the picture. */
export const vent = {
  file: 'vent.png',
  width: 64,
  height: 16,
  scale: 2,
  svg: leather({ shape: poly([[2, 16], [62, 16], [56, 4], [8, 4]]), fill: DYE.black, opacity: 0.95, holes: Array.from({ length: 6 }, (_, i) => slit([13 + i * 7.6, 7], [12 + i * 7.6, 14], 1.3)), over: `<path d="M8 4H56" stroke="${DYE.gold}" stroke-width="1.6"/>` })
};

/** His staff, standing where it was flung: gold at either end. It stands on the bottom edge of the picture. */
export const staff = {
  file: 'staff.png',
  width: 14,
  height: 124,
  scale: 2,
  svg: leather({ shape: poly([[5.4, 4], [8.6, 4], [8.6, 124], [5.4, 124]]), fill: DYE.crimson, opacity: 0.95, edge: 1 }) + leather({ shape: poly([[4.4, 2], [9.6, 2], [9.6, 18], [4.4, 18]]), fill: DYE.gold, holes: [slit([7, 5], [7, 15], 0.6)], edge: 0.9 }) + leather({ shape: poly([[4.4, 106], [9.6, 106], [9.6, 122], [4.4, 122]]), fill: DYE.gold, edge: 0.9 })
};

/** The way out of the furnace room: a doorway under the palace's name. */
export const door = {
  file: 'door.png',
  width: 340,
  height: 380,
  scale: 1.5,
  svg: (() => {
    const post = x => leather({ shape: poly([[x - 14, 380], [x + 14, 380], [x + 12, 96], [x - 12, 96]]), fill: DYE.crimson, opacity: 0.88, holes: [slit([x, 130], [x, 240], 2.4), slit([x, 260], [x, 366], 2.4)] });
    const lintel = leather({ shape: poly([[30, 60], [310, 60], [318, 100], [22, 100]]), fill: DYE.black, opacity: 0.9, holes: beads([44, 92], [296, 92], 15, 1.5), over: `<path d="M30 60H310" stroke="${DYE.gold}" stroke-width="2.4"/>` });
    const board = leather({ shape: poly([[112, 16], [228, 16], [228, 52], [112, 52]]), fill: DYE.teal, opacity: 0.92, holes: beads([118, 21], [222, 21], 11, 1.2).concat(beads([118, 47], [222, 47], 11, 1.2)), over: `<text x="170" y="43" text-anchor="middle" font-family="'Noto Serif CJK SC','Songti SC','SimSun',serif" font-weight="900" font-size="22" letter-spacing="4" fill="#f6dc9c">兜率宮</text>` });
    const hanging = side => `<path d="M${170 + side * 112} 100Q${170 + side * 96} 190 ${170 + side * 118} 300L${170 + side * 80} 300Q${170 + side * 60} 190 ${170 + side * 40} 100Z" fill="${DYE.red}" fill-opacity="0.6" stroke="${DYE.ink}" stroke-width="1"/>`;
    return hanging(-1) + hanging(1) + post(54) + post(286) + lintel + board;
  })()
};

/** The floor of the palace, in the order tools/level.mjs names the tiles: boards over dark stone, and galleries to stand on. */
export const palace = {
  file: 'palace.png',
  width: 240,
  height: 48,
  scale: 2,
  svg: (() => {
    const stone = x => `<rect x="${x}" y="0" width="48" height="48" fill="#2c1a14" fill-opacity="0.93"/>`;
    const top = stone(0) + `<rect x="0" y="0" width="48" height="7" fill="${DYE.crimson}" fill-opacity="0.95"/><path d="M0 0.5H48M0 7H48" stroke="${DYE.ink}" stroke-width="1"/><path d="M0 3.6H48" stroke="${DYE.gold}" stroke-opacity="0.8" stroke-width="1"/>` + `<g fill="#f4d9a0" fill-opacity="0.45"><path d="${dot(12, 22, 5)}${dot(36, 22, 5)}${dot(24, 38, 3)}${dot(0, 38, 3)}${dot(48, 38, 3)}"/></g><g fill="#2c1a14"><path d="${dot(12, 22, 2.6)}${dot(36, 22, 2.6)}"/></g>`;
    const fill = stone(48) + `<g fill="#f4d9a0" fill-opacity="0.14"><path d="${slit([52, 16], [92, 16], 1)}${slit([52, 36], [92, 36], 1)}${slit([72, 2], [72, 14], 1)}${slit([60, 18], [60, 34], 1)}${slit([84, 18], [84, 34], 1)}"/></g>`;
    // A gallery: a rail of boards with a carved skirt under it. An end piece is the same rail pushed in from its side.
    const gallery = (x, from, to) =>
      [6, 18, 30, 42].map(at => `<path d="${crescent(x + at, 17, 4.6, 90)}" fill="${DYE.gold}" fill-opacity="0.85" stroke="${DYE.ink}" stroke-width="0.6"/>`).join('') +
      `<rect x="${x + from}" y="4" width="${to - from}" height="11" rx="2" fill="${DYE.crimson}" fill-opacity="0.93" stroke="${DYE.ink}" stroke-width="1.1"/>` +
      `<path d="M${x + Math.max(from, 0) + 3} 7.4H${x + Math.min(to, 48) - 3}" stroke="${DYE.gold}" stroke-opacity="0.8" stroke-width="1.1"/>`;
    return [top, fill, gallery(96, 3, 62), gallery(144, -14, 62), gallery(192, -14, 45)].map((art, i) => `<svg x="${i * 48}" y="0" width="48" height="48" viewBox="${i * 48} 0 48 48">${art}</svg>`).join('');
  })()
};

export const SCENERY = [screen, frame, far, gate, wisp, spark, chaff, tiles, arrow, pennant, ring, far2, tree, peach, moongate, orchard, far3, furnace, pill, vent, door, palace, staff];
