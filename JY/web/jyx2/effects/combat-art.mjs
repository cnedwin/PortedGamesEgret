import { createImageData2D } from '@egret/engine';

const width = 96;
const height = 46;
const columns = 4;
export const combatArtGroup = 'remastered-combat';
export const impactArtId = magicId => 10_000 + magicId;

// ID-based to keep distinct techniques separate when KYS shares an effect sheet.
const techniques = new Map([
  [1, ['palm', '#82b9f7']], [2, ['palm', '#c4dcc1']], [6, ['palm', '#df8a9e']],
  [11, ['palm', '#d1ac8a']], [13, ['frost', '#80c9ff']], [19, ['beam', '#f6d295']],
  [20, ['ring', '#a7dfd4']], [22, ['ring', '#acdd8c']], [24, ['palm', '#c0a2f0']],
  [25, ['dragon', '#f3be5a']], [28, ['ring', '#c493dd']], [29, ['ring', '#8eccc0']],
  [30, ['beam', '#69d5f8']], [31, ['blade', '#bacbd2']], [44, ['frost', '#d0efff']],
  [46, ['blade', '#e8b596']], [47, ['blade', '#c9cee9']], [48, ['blade', '#bba8e4']],
  [49, ['blade', '#e9acc5']], [51, ['blade', '#d5b0b0']], [57, ['blade', '#e9c78b']],
  [58, ['ring', '#c7dfdf']], [59, ['blade', '#d7cd9a']], [60, ['beam', '#ec9aba']],
  [61, ['blade', '#fbdfa0']], [67, ['blade', '#ffd384']], [86, ['staff', '#dfaa6c']],
  [88, ['staff', '#b8d99c']], [92, ['dragon', '#f8c978']],
]);

function aura(context, x, y, radius, color) {
  const glow = context.createRadialGradient(x, y, 1, x, y, radius);
  glow.addColorStop(0, color + 'a8');
  glow.addColorStop(.55, color + '38');
  glow.addColorStop(1, color + '00');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function beam(context) {
  context.beginPath();
  context.moveTo(9, 23);
  context.quadraticCurveTo(57, 17, 90, 22);
  context.quadraticCurveTo(59, 28, 9, 23);
  context.fill();
  for (const y of [13, 33]) {
    context.beginPath();
    context.moveTo(28, 23);
    context.quadraticCurveTo(58, y, 78, 23);
    context.stroke();
  }
}

function blade(context) {
  context.beginPath();
  context.moveTo(14, 34);
  context.bezierCurveTo(62, 40, 85, 20, 75, 5);
  context.bezierCurveTo(97, 24, 69, 44, 14, 34);
  context.fill();
  context.beginPath();
  context.moveTo(25, 35);
  context.quadraticCurveTo(71, 36, 78, 19);
  context.stroke();
}

function palm(context) {
  context.lineWidth = 2.5;
  for (const x of [37, 46, 54]) {
    context.beginPath();
    context.ellipse(x, 23, 15, 10, 0, -1.03, 1.03);
    context.stroke();
  }
}

function ring(context) {
  for (const [radius, tilt] of [[24, .28], [18, -.35]]) {
    context.beginPath();
    context.ellipse(53, 23, radius, radius * .46, tilt, 0, Math.PI * 2);
    context.stroke();
  }
}

function frost(context) {
  for (const [x, y, size] of [[34, 23, 14], [52, 12, 11], [61, 27, 18], [78, 21, 10]]) {
    context.beginPath();
    context.moveTo(x - size, y + 2);
    context.lineTo(x - 2, y - 6);
    context.lineTo(x + size, y - 3);
    context.lineTo(x + 4, y + 6);
    context.closePath();
    context.fill();
  }
}

function dragon(context) {
  context.lineWidth = 3.2;
  for (const offset of [-4, 4]) {
    context.beginPath();
    context.moveTo(10, 25 + offset);
    context.bezierCurveTo(28, 9 + offset, 34, 38 + offset, 53, 23 + offset);
    context.bezierCurveTo(63, 15 + offset, 75, 13 + offset, 86, 20 + offset);
    context.stroke();
  }
}

function staff(context) {
  context.lineWidth = 2.1;
  context.beginPath();
  context.moveTo(19, 28);
  context.lineTo(76, 17);
  context.stroke();
  for (const tilt of [-.28, .22]) {
    context.beginPath();
    context.ellipse(58, 24, 25, 11, tilt, -.9, 2.5);
    context.stroke();
  }
}

const brush = { beam, blade, palm, ring, frost, dragon, staff };

function trail(context, [shape, color]) {
  aura(context, 57, 23, 28, color);
  const shine = context.createLinearGradient(7, 0, 92, 0);
  shine.addColorStop(0, color + '00');
  shine.addColorStop(.42, color + 'ae');
  shine.addColorStop(.79, '#f8fcffe9');
  shine.addColorStop(1, color + '00');
  context.fillStyle = context.strokeStyle = shine;
  context.lineCap = 'round';
  context.lineWidth = 1.4;
  brush[shape](context);
}

function impact(context, [shape, color]) {
  const x = width / 2, y = height / 2;
  aura(context, x, y, 20, color);
  context.strokeStyle = color + 'da';
  context.fillStyle = '#fdfcffd2';
  context.lineWidth = 1.4;
  const rays = shape === 'beam' || shape === 'frost' ? 7 : 5;
  for (let index = 0; index < rays; index++) {
    const angle = index * Math.PI * 2 / rays + .37;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const radius = 15 + (index % 2) * 4;
    context.beginPath();
    context.moveTo(x + dx * 5, y + dy * 4);
    context.lineTo(x + dx * radius, y + dy * radius);
    context.stroke();
  }
  context.beginPath();
  context.arc(x, y, 3.2, 0, Math.PI * 2);
  context.fill();
}

export function createCombatArt(usedMagics, density = 1) {
  const entries = [...new Set(usedMagics)].flatMap(id => {
    const style = techniques.get(id);
    return style ? [{ id, style, paint: trail }, { id: impactArtId(id), style, paint: impact }] : [];
  });
  if (!entries.length) return new Map();
  const textures = new Map();
  const perPage = columns * 2;
  for (let offset = 0; offset < entries.length; offset += perPage) {
    const page = entries.slice(offset, offset + perPage);
    const atlas = document.createElement('canvas');
    atlas.width = width * Math.min(columns, page.length) * density;
    atlas.height = height * Math.ceil(page.length / columns) * density;
    const context = atlas.getContext('2d');
    const regions = page.map(({ id, style, paint }, index) => {
      const x = index % columns * width * density, y = Math.floor(index / columns) * height * density;
      context.save();
      context.translate(x, y);
      context.scale(density, density);
      context.beginPath();
      context.rect(0, 0, width, height);
      context.clip();
      paint(context, style);
      context.restore();
      return [id, { x, y, width: width * density, height: height * density }];
    });
    const { data } = context.getImageData(0, 0, atlas.width, atlas.height);
    const image = createImageData2D({ width: atlas.width, height: atlas.height, pixels: new Uint8Array(data) });
    for (const [id, region] of regions) textures.set(id, { image, dx: width / 2, dy: height / 2, region, scale: 1 / density });
  }
  return textures;
}
