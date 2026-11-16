// Builds the puppets: draws every piece of leather, packs each puppet's pieces into one atlas page, writes the
// skeleton and its animations, and lists the lot in a resource manifest the engine loads.
//
//   node tools/author.mjs            writes assets/
//   node tools/author.mjs --sheet    also writes pictures of each puppet, assembled and in every pose, to tools/out/
//   node tools/author.mjs --sheet=attack   the same, for the animations whose names begin so, at more moments
//
// Drawing needs a browser: Playwright with Chromium (set PLAYWRIGHT to its module path if it is not installed here).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildResourceManifest } from '../vendor/contracts/dist/resources/index.js';
import { SCENERY } from './scenery.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)),
  OUT = path.join(HERE, '..', 'assets'),
  SHEET = process.argv.some(arg => arg.startsWith('--sheet')),
  // `--sheet=attack` draws only the animations whose names begin so, at more moments.
  ONLY = process.argv.find(arg => arg.startsWith('--sheet='))?.slice(8);
/** Atlas pixels for each stage unit. The stage is drawn at up to twice its size, and the camera closes in. */
const SCALE = 3,
  PAD = 2;
const PUPPETS = ['wukong', 'dummy'];
export const SPINE = '4.3.13';

const rad = Math.PI / 180,
  round = (value, places = 3) => Number(value.toFixed(places));

// ---- The skeleton ----------------------------------------------------------------------------------------------
/** Bones as the skeleton wants them: each placed and turned within its parent. The root's joint is the origin. */
export function skeletonBones(bones) {
  const [, , origin] = bones[0];
  const world = new Map();
  return bones.map(([name, parent, at, to]) => {
    // Design coordinates have y down; the skeleton has y up.
    const x = at[0] - origin[0],
      y = origin[1] - at[1],
      angle = Math.atan2(-(to[1] - at[1]), to[0] - at[0]),
      length = Math.hypot(to[0] - at[0], to[1] - at[1]);
    world.set(name, { x, y, angle });
    if (parent === null) return { name, length: round(length), x: 0, y: 0, rotation: round(angle / rad) };
    const up = world.get(parent),
      dx = x - up.x,
      dy = y - up.y,
      cos = Math.cos(-up.angle),
      sin = Math.sin(-up.angle);
    return { name, parent, length: round(length), x: round(dx * cos - dy * sin), y: round(dx * sin + dy * cos), rotation: round((angle - up.angle) / rad), world: world.get(name) };
  });
}

/** Where a piece sits on its bone: `box` is its rectangle in design coordinates. */
function attachment(box, bone, origin) {
  const cx = box.x + box.width / 2 - origin[0],
    cy = origin[1] - (box.y + box.height / 2),
    dx = cx - bone.x,
    dy = cy - bone.y,
    cos = Math.cos(-bone.angle),
    sin = Math.sin(-bone.angle);
  return { x: round(dx * cos - dy * sin), y: round(dx * sin + dy * cos), rotation: round(-bone.angle / rad), width: box.width, height: box.height };
}

/** How a key is arrived at, as the two inner points of a cubic curve from (0,0) to (1,1). */
const EASE = { inout: [0.42, 0, 0.58, 1], out: [0.16, 0.72, 0.3, 1], in: [0.6, 0, 0.88, 0.42] };
const curveOf = (ease, t0, t1, pairs) => {
  if (ease === 'lin') return undefined;
  if (ease === 'step') return 'stepped';
  const [x1, y1, x2, y2] = EASE[ease ?? 'inout'];
  return pairs.flatMap(([v0, v1]) => [round(t0 + (t1 - t0) * x1, 4), round(v0 + (v1 - v0) * y1), round(t0 + (t1 - t0) * x2, 4), round(v0 + (v1 - v0) * y2)]);
};

/** One animation, from the puppet's shorthand to the skeleton's timelines. */
export function timelines({ seconds, bones = {}, events = [] }) {
  const out = { bones: {} };
  for (const [bone, tracks] of Object.entries(bones)) {
    const lines = {};
    if (tracks.rot)
      lines.rotate = tracks.rot.map(([t, value], i, keys) => {
        const next = keys[i + 1],
          key = { time: round(t * seconds, 4), value };
        const curve = next && curveOf(next[2], t * seconds, next[0] * seconds, [[value, next[1]]]);
        if (curve) key.curve = curve;
        return key;
      });
    if (tracks.pos)
      lines.translate = tracks.pos.map(([t, x, y], i, keys) => {
        const next = keys[i + 1],
          key = { time: round(t * seconds, 4), x, y };
        const curve = next && curveOf(next[3], t * seconds, next[0] * seconds, [[x, next[1]], [y, next[2]]]);
        if (curve) key.curve = curve;
        return key;
      });
    out.bones[bone] = lines;
  }
  if (events.length) out.events = events.map(([t, name]) => ({ time: round(t * seconds, 4), name }));
  return out;
}

/** The whole skeleton document, given where each piece was found to lie. */
export function skeletonOf(puppet, boxes) {
  const bones = skeletonBones(puppet.bones),
    origin = puppet.bones[0][2],
    byName = new Map(bones.map(bone => [bone.name, bone.world ?? { x: 0, y: 0, angle: 0 }]));
  return {
    skeleton: { spine: SPINE },
    bones: bones.map(({ world, ...bone }) => bone),
    slots: puppet.parts.map(([name, bone]) => ({ name, bone, attachment: name })),
    skins: [{ name: 'default', attachments: Object.fromEntries(puppet.parts.map(([name, bone]) => [name, { [name]: attachment(boxes[name], byName.get(bone), origin) }])) }],
    events: Object.fromEntries((puppet.events ?? []).map(name => [name, {}])),
    animations: Object.fromEntries(Object.entries(puppet.animations).map(([name, animation]) => [name, timelines(animation)]))
  };
}

// ---- The atlas -------------------------------------------------------------------------------------------------
/** Rows of rectangles, tallest first, in a page no wider than `limit` pixels. */
export function pack(sizes, limit = 1024) {
  const order = [...sizes].sort((a, b) => b.height - a.height || b.width - a.width);
  let x = PAD,
    y = PAD,
    row = 0,
    width = 0;
  const places = {};
  for (const { name, width: w, height: h } of order) {
    if (x + w + PAD > limit) (x = PAD), (y += row + PAD), (row = 0);
    places[name] = { x, y, width: w, height: h };
    x += w + PAD;
    row = Math.max(row, h);
    width = Math.max(width, x);
  }
  // The page is drawn in whole stage units, so its sides are made whole numbers of them.
  const whole = value => Math.ceil(value / SCALE) * SCALE;
  return { places, width: whole(width), height: whole(y + row + PAD) };
}

const atlasText = (page, pageWidth, pageHeight, places) =>
  `${page}\nsize: ${pageWidth},${pageHeight}\nfilter: Linear,Linear\nrepeat: none\npma: false\n` +
  Object.entries(places)
    .map(([name, p]) => `${name}\nbounds: ${p.x},${p.y},${p.width},${p.height}\n`)
    .join('');

// ---- Drawing ---------------------------------------------------------------------------------------------------
const svg = (width, height, body, view = `0 0 ${width} ${height}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${view}">${body}</svg>`;

async function draw(browser, puppet, name) {
  const page = await browser.newPage({ deviceScaleFactor: SCALE });
  // 1. Lay the puppet out as it stands and measure each piece.
  await page.setContent(`<body style="margin:0;background:#f4e3b5">${svg(260, 240, puppet.parts.map(([part, , art]) => `<g id="p_${part}">${art}</g>`).join(''))}</body>`);
  const boxes = await page.evaluate(
    ({ names }) =>
      Object.fromEntries(
        names.map(part => {
          const b = document.getElementById('p_' + part).getBBox(),
            x = Math.floor(b.x - 1.5),
            y = Math.floor(b.y - 1.5);
          return [part, { x, y, width: Math.ceil(b.x + b.width + 1.5) - x, height: Math.ceil(b.y + b.height + 1.5) - y }];
        })
      ),
    { names: puppet.parts.map(([part]) => part) }
  );
  if (SHEET) {
    fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
    await page.locator('svg').screenshot({ path: path.join(HERE, 'out', name + '.png') });
  }
  // 2. Lay the pieces out again, apart, as the atlas page, and take its picture with nothing behind it.
  const { places, width, height } = pack(puppet.parts.map(([part]) => ({ name: part, width: boxes[part].width * SCALE, height: boxes[part].height * SCALE })));
  const body = puppet.parts
    .map(([part, , art]) => {
      const p = places[part],
        b = boxes[part];
      return `<svg x="${p.x / SCALE}" y="${p.y / SCALE}" width="${b.width}" height="${b.height}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}">${art}</svg>`;
    })
    .join('');
  await page.setContent(`<body style="margin:0;background:transparent">${svg(width / SCALE, height / SCALE, body)}</body>`);
  const png = await page.locator('body > svg').screenshot({ omitBackground: true });
  await page.close();
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw Error(`${name}: the page was drawn ${png.readUInt32BE(16)}×${png.readUInt32BE(20)}, not ${width}×${height}`);
  return { boxes, places, width, height, png };
}

// ---- Pose sheets -----------------------------------------------------------------------------------------------
// A picture of every animation at a few moments, drawn straight from the puppet's description. It is for whoever
// is animating to look at; the game never sees it. The easing here is close to the skeleton's, not identical.
const EASED = { lin: u => u, in: u => u * u, out: u => 1 - (1 - u) ** 3, step: () => 0, inout: u => u * u * (3 - 2 * u) };
function valueAt(keys, t, width) {
  if (!keys) return Array(width).fill(0);
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const from = keys[i],
    to = keys[i + 1];
  if (!to || t <= from[0]) return from.slice(1, 1 + width);
  const u = EASED[to[1 + width] ?? 'inout']((t - from[0]) / (to[0] - from[0]));
  return Array.from({ length: width }, (_, n) => from[1 + n] + (to[1 + n] - from[1 + n]) * u);
}
/** Each piece's transform, as an SVG matrix in design coordinates, at fraction `t` of an animation. */
export function poseOf(puppet, animation, t) {
  const bones = skeletonBones(puppet.bones),
    [ox, oy] = puppet.bones[0][2],
    rest = new Map(),
    posed = new Map();
  // A frame is `[cos, sin, x, y]`: a turn and a place, with y up.
  const compose = (up, x, y, turn) => (up ? [up[0] * Math.cos(turn) - up[1] * Math.sin(turn), up[1] * Math.cos(turn) + up[0] * Math.sin(turn), up[2] + up[0] * x - up[1] * y, up[3] + up[1] * x + up[0] * y] : [Math.cos(turn), Math.sin(turn), x, y]);
  for (const bone of bones) {
    const tracks = animation.bones?.[bone.name] ?? {},
      [turn] = valueAt(tracks.rot, t, 1),
      [dx, dy] = valueAt(tracks.pos, t, 2);
    rest.set(bone.name, compose(rest.get(bone.parent), bone.x, bone.y, bone.rotation * rad));
    posed.set(bone.name, compose(posed.get(bone.parent), bone.x + dx, bone.y + dy, (bone.rotation + turn) * rad));
  }
  const through = (name, [px, py]) => {
    const [rc, rs, rx, ry] = rest.get(name),
      [pc, ps, qx, qy] = posed.get(name),
      sx = px - ox - rx,
      sy = oy - py - ry,
      lx = sx * rc + sy * rs,
      ly = -sx * rs + sy * rc;
    return [qx + lx * pc - ly * ps + ox, oy - (qy + lx * ps + ly * pc)];
  };
  return Object.fromEntries(
    puppet.parts.map(([part, bone]) => {
      const [e, f] = through(bone, [0, 0]),
        [ax, ay] = through(bone, [1, 0]),
        [bx, by] = through(bone, [0, 1]);
      return [part, `matrix(${[ax - e, ay - f, bx - e, by - f, e, f].map(v => round(v, 4)).join(' ')})`];
    })
  );
}
async function poseSheet(browser, puppet, name, moments = ONLY ? 11 : 7) {
  const names = Object.keys(puppet.animations).filter(animation => !ONLY || animation.startsWith(ONLY)),
    cell = [150, 190];
  const cells = names.flatMap((animation, row) =>
    Array.from({ length: moments }, (_, column) => {
      const pose = poseOf(puppet, puppet.animations[animation], column / (moments - 1));
      return `<g transform="translate(${column * cell[0] - 25} ${row * cell[1] - 12})">${puppet.parts.map(([part, , art]) => `<g transform="${pose[part]}">${art}</g>`).join('')}<path d="M40 200H180" stroke="#7a4a22" stroke-width="0.6"/></g>` + (column ? '' : `<text x="6" y="${row * cell[1] + 16}" font-family="monospace" font-size="11" fill="#5a2a14">${animation} ${puppet.animations[animation].seconds}s</text>`);
    })
  );
  const page = await browser.newPage({ deviceScaleFactor: 1.5 });
  await page.setContent(`<body style="margin:0;background:#f4e3b5">${svg(moments * cell[0], names.length * cell[1], cells.join(''))}</body>`);
  fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
  await page.locator('body > svg').screenshot({ path: path.join(HERE, 'out', `poses-${name}.png`) });
  await page.close();
}

// ---- Writing ---------------------------------------------------------------------------------------------------
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
  const browser = await chromium.launch();
  const files = new Map(),
    entries = [];
  const provenance = { origin: 'Lantern Shadows puppet art', license: 'Apache-2.0', notice: 'Drawn and rigged by tools/author.mjs; not an Editor export.' };
  const row = (id, file, resourceKind, importer, artifactFormatVersion, mediaType, dependencies, settings = {}) => {
    const bytes = files.get(file),
      entry = role => ({ id: `f_${role}_${id.slice(2)}`, path: (role === 'asset' ? 'files/' : 'sources/') + file, role, mediaType, sha256: sha(bytes), byteLength: bytes.length });
    entries.push({ id, resourceKind, source: entry('source'), artifact: entry('asset'), importer: { id: importer, version: '1.0.0' }, artifactFormatVersion, targetProfile: 'web-shared/1', dependencies, settings, provenance });
  };
  for (const name of PUPPETS) {
    const puppet = await import(`./puppets/${name}.mjs`);
    if (SHEET && (!ONLY || Object.keys(puppet.animations).some(animation => animation.startsWith(ONLY)))) await poseSheet(browser, puppet, name);
    const drawn = await draw(browser, puppet, name);
    files.set(name + '.png', drawn.png);
    files.set(name + '.atlas', Buffer.from(atlasText(name + '.png', drawn.width, drawn.height, drawn.places)));
    files.set(name + '.json', Buffer.from(JSON.stringify(skeletonOf(puppet, drawn.boxes))));
    row(`e_${name}_page`, name + '.png', 'image', 'egret.png', 'png/1', 'image/png', []);
    row(`e_${name}_atlas`, name + '.atlas', 'spine-atlas', 'egret.spine-atlas', 'spine-atlas/4.3-1', 'text/plain', [`e_${name}_page`], { coreVersion: SPINE, pageNames: [name + '.png'] });
    row(`e_${name}`, name + '.json', 'spine', 'egret.spine-json', 'spine-json/4.3-1', 'application/json', [`e_${name}_atlas`], { coreVersion: SPINE });
    console.log(`${name}: ${puppet.parts.length} pieces, ${puppet.bones.length} bones, ${Object.keys(puppet.animations).length} animations, page ${drawn.width}×${drawn.height}`);
  }
  const result = buildResourceManifest({
    format: 'egret.resource-build/1',
    projectId: 'p_lantern_shadows',
    targetProfile: 'web-shared/1',
    versions: { engineVersion: '0.0.0', resourceFormatVersion: '1.0', toolProtocolVersion: '1.0' },
    entries
  });
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const entry of result.value.entries)
    for (const file of [entry.source, entry.artifact]) {
      fs.mkdirSync(path.dirname(path.join(OUT, file.path)), { recursive: true });
      fs.writeFileSync(path.join(OUT, file.path), files.get(path.basename(file.path)));
    }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(result.value, null, 2) + '\n');

  // The scenery is plain pictures, loaded by address.
  fs.mkdirSync(path.join(OUT, 'scene'), { recursive: true });
  for (const piece of SCENERY) {
    const page = await browser.newPage({ deviceScaleFactor: piece.scale });
    await page.setContent(`<body style="margin:0;background:transparent">${svg(piece.width, piece.height, piece.svg)}</body>`);
    const jpeg = piece.file.endsWith('.jpg');
    const bytes = await page.locator('body > svg').screenshot(jpeg ? { type: 'jpeg', quality: 86 } : { omitBackground: true });
    fs.writeFileSync(path.join(OUT, 'scene', piece.file), bytes);
    await page.close();
    console.log(`${piece.file}: ${piece.width * piece.scale}×${piece.height * piece.scale}, ${Math.round(bytes.length / 1024)} KB`);
  }
  await browser.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
