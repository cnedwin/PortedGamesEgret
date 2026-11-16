// The stage the puppets play on: the lit cloth, the wooden front of the booth, and the scenery pieces that hang
// between the lamp and the cloth. Each is a drawing in SVG; tools/author.mjs takes their pictures.
import { DYE, beads, blob, crescent, dot, leather, poly, slit } from './leather.mjs';

const W = 960,
  H = 540;

/** The cloth, lit from behind: brightest where the lamp hangs, darker toward the frame, with the weave showing. */
export const screen = {
  file: 'screen.png',
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
  scale: 1,
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

/** The terrace the puppets stand on: one length of it, made to repeat. */
export const ground = {
  file: 'ground.png',
  width: 240,
  height: 110,
  scale: 1.5,
  svg:
    `<rect x="0" y="6" width="240" height="104" fill="${DYE.black}" fill-opacity="0.9"/>` +
    `<rect x="0" y="0" width="240" height="7" fill="${DYE.gold}" fill-opacity="0.92"/><path d="M0 0.6H240M0 7H240" stroke="${DYE.ink}" stroke-width="1.2"/>` +
    // A band of carved cloud heads, then plain stone with a few chisel marks.
    `<g fill="#f4d9a0" fill-opacity="0.62">${Array.from({ length: 6 }, (_, i) => `<path d="${crescent(20 + i * 40, 22, 9, 90)}${crescent(20 + i * 40, 22, 4.4, 270)}${dot(40 + i * 40, 20, 2)}"/>`).join('')}</g>` +
    `<path d="M0 36H240" stroke="${DYE.gold}" stroke-opacity="0.7" stroke-width="1.2"/>` +
    `<g fill="#f4d9a0" fill-opacity="0.2">${[[30, 56], [96, 70], [150, 52], [208, 78], [60, 92], [176, 96]].map(([x, y]) => `<path d="${slit([x, y], [x + 22, y + 2], 1.4)}"/>`).join('')}</g>`
};

/** A cloud to stand on, and smaller ones to drift by. */
/** Feet rest on the line y = 24 of this picture. */
export const platform = { file: 'cloud.png', width: 200, height: 84, scale: 1.5, svg: cloudPiece(100, 54, 1.9, DYE.hide, 0.82) };
export const wisp = { file: 'wisp.png', width: 120, height: 50, scale: 1.5, svg: blurred(cloudPiece(60, 30, 1.1, '#b98a5a', 0.5), 1.2) };

/** A spark: a soft bright point for the particles. */
export const spark = { file: 'spark.png', width: 32, height: 32, scale: 1, svg: `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="16" cy="16" r="16" fill="url(#g)"/>` };
/** A scrap of straw, for what flies off the practice post. */
export const chaff = { file: 'chaff.png', width: 16, height: 6, scale: 2, svg: `<path d="${slit([1, 3], [15, 3], 2)}" fill="#fff"/>` };

export const SCENERY = [screen, frame, far, gate, ground, platform, wisp, spark, chaff];
