// 月色、城廓与夜雾分置于三层视差中，保留清晰的机关轮廓。
// Moonlight, distant ramparts and mist occupy separate parallax layers behind the mechanisms.
import { Bitmap, Sprite } from '@egret/engine';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));
const PALETTES = [
  { sky: 0x0c1929, horizon: 0x344d55, ridge: 0x1b3944, roof: 0x0c2028, edge: 0x689695, fog: 0x8ebcb9, moon: 0xe8d9ad, moonX: 0.78, moonY: 0.22, exposure: 1 },
  { sky: 0x0e2027, horizon: 0x345553, ridge: 0x1b3a3d, roof: 0x0c2426, edge: 0x6e9b8b, fog: 0x9ebcb1, moon: 0xe1dfbd, moonX: 0.44, moonY: 0.18, exposure: 1 },
  { sky: 0x211726, horizon: 0x654744, ridge: 0x3d2d3b, roof: 0x281c28, edge: 0x9b6959, fog: 0xdb9f7e, moon: 0xf2cd9b, moonX: 0.53, moonY: 0.18, exposure: 0.88 }
];

/** Keep the painting under the viewport as the camera pans, zooms, and shakes. */
function mountPanorama(scope, layer, texture, palette, width, height) {
  const painting = layer.addChild(scope.use(new Bitmap(texture)));
  const scale = Math.max(width * 1.36 / painting.naturalWidth, height * 1.28 / painting.naturalHeight);
  painting.scaleX = painting.scaleY = scale;
  painting.x = (width - painting.naturalWidth * scale) / 2;
  painting.y = (height - painting.naturalHeight * scale) / 2;
  painting.alpha = palette.exposure;
}

function drawRidge(g, palette, left, right, height) {
  g.beginFill(palette.ridge).moveTo(left, height * 1.28);
  for (let x = left; x <= right; x += 48) {
    const silhouette = Math.sin(x / 112) * 0.07 + Math.cos(x / 41) * 0.04 + Math.sin(x / 26) * 0.025;
    g.lineTo(x, height * (0.61 + silhouette));
  }
  g.lineTo(right, height * 1.28).lineTo(left, height * 1.28).endFill();
}

/** A few silhouettes below the painted horizon give the camera a nearer plane. */
function drawTowers(g, palette, left, right, height, chapter) {
  const base = height * 1.12;
  for (let x = left + 75 + chapter * 44; x < right; x += 290) {
    const w = 68 + 12 * (1 + Math.sin(x * 0.027));
    const eave = height * (0.89 + 0.065 * Math.cos(x * 0.013));
    const crown = eave - w * 0.33;
    g.beginFill(palette.roof, 0.7)
      .moveTo(x - 19, eave - 5)
      .curveTo(x + w * 0.22, eave - 7, x + w / 2, crown)
      .curveTo(x + w * 0.8, eave - 7, x + w + 19, eave - 5)
      .lineTo(x + w + 10, eave + 2)
      .lineTo(x + w + 2, eave + 3)
      .lineTo(x + w + 11, base)
      .lineTo(x - 11, base)
      .lineTo(x - 2, eave + 3)
      .lineTo(x - 10, eave + 2)
      .lineTo(x - 19, eave - 5)
      .endFill();
    g.lineStyle(1.2, palette.edge, 0.3)
      .moveTo(x - 11, eave).curveTo(x + w / 2, eave + 9, x + w + 11, eave)
      .moveTo(x + w * 0.27, eave + 7).lineTo(x + w * 0.27, eave + 29)
      .moveTo(x + w * 0.72, eave + 7).lineTo(x + w * 0.72, eave + 29)
      .lineStyle(0);
    g.beginFill(0xd7a46e, 0.28)
      .drawRect(x + w * 0.39, eave + 12, 3, 8)
      .drawRect(x + w * 0.52, eave + 12, 3, 8)
      .endFill();
  }
}

/** Make the sky and the layers for a chapter. A loaded panorama replaces the far ink ridge. */
export function createScenery(scope, { width, chapter = 0, viewWidth = 960, viewHeight = 540, panorama }) {
  const palette = PALETTES[chapter % PALETTES.length];
  const sky = scope.use(new Sprite());
  sky.graphics
    .beginLinearGradientFill(0, 0, 0, viewHeight, stops([0, palette.sky], [0.46, palette.sky], [1, palette.horizon]))
    .drawRect(0, 0, viewWidth, viewHeight)
    .endFill();

  const left = -viewWidth * 0.36;
  const right = Math.max(width, viewWidth) + viewWidth * 0.45;
  const hills = scope.use(new Sprite());
  if (panorama) mountPanorama(scope, hills, panorama, palette, viewWidth, viewHeight);
  else drawRidge(hills.graphics, palette, left, right, viewHeight);

  const moonX = viewWidth * palette.moonX;
  const moonY = viewHeight * palette.moonY;
  const halo = hills.addChild(scope.use(new Sprite()));
  // The gradient fades before the corners, so the halo needs only a quad.
  const haloRadius = 74;
  halo.x = moonX;
  halo.y = moonY;
  halo.graphics
    .beginRadialGradientFill(0, 0, haloRadius, stops([0, palette.moon, 0.22], [0.38, palette.moon, 0.09], [1, palette.moon, 0]))
    .drawRect(-haloRadius, -haloRadius, haloRadius * 2, haloRadius * 2)
    .endFill();
  const moon = hills.addChild(scope.use(new Sprite()));
  moon.x = moonX;
  moon.y = moonY;
  moon.graphics
    .beginFill(palette.moon)
    .drawCircle(0, 0, 28).endFill()
    .beginFill(0xa18e79, 0.15)
    .drawEllipse(-14, -4, 17, 10)
    .drawEllipse(1, 7, 13, 9)
    .drawEllipse(4, -11, 6, 5)
    .endFill();

  const roofs = scope.use(new Sprite());
  drawTowers(roofs.graphics, palette, left, right, viewHeight, chapter);
  const mist = scope.use(new Sprite());
  const bankTop = viewHeight * 0.76;
  const bankBottom = viewHeight * 1.24;
  mist.graphics
    .beginLinearGradientFill(0, bankTop, 0, bankBottom, stops([0, palette.fog, 0], [0.47, palette.fog, 0.16], [1, palette.fog, 0]))
    .drawRect(left, bankTop, right - left, bankBottom - bankTop)
    .endFill();

  return {
    sky,
    moon,
    layers: [
      { display: hills, factor: 0.12 },
      { display: roofs, factor: 0.3 },
      { display: mist, factor: 0.55 }
    ],
    update(time) {
      mist.alpha = 0.5 + Math.sin(time * 0.4) * 0.08;
      halo.alpha = 0.84 + Math.sin(time * 1.3) * 0.06;
    }
  };
}
