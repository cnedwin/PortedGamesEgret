// 关卡背后的夜景：渐变的天、月和月晕、远山、城楼剪影和雾，按各自的速度随相机移动（视差层）。
// The night behind a level: a sky of linear gradients, the moon with a radial halo in `screen` blend, far
// hills, the roofs of the city and a band of mist. The hills, roofs and mist are layers of the engine's 2D
// camera and move at their own share of its speed.
import { Sprite } from '@egret/engine';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** A seeded number in [0, 1) for the shapes of the hills and roofs, the same every time a level is built. */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Make the sky and the layers for a chapter. Returns the parts the level puts on the stage and the camera. */
export function createScenery(scope, { width, height, chapter = 0, viewWidth = 960, viewHeight = 540 }) {
  const palettes = [
    { top: 0x0b1a2c, middle: 0x1d3a50, low: 0x5a6e70, hill: 0x16283a, roof: 0x0f1a26, mist: 0x9ab4c0 },
    { top: 0x101a30, middle: 0x2a3e5e, low: 0x7a6a62, hill: 0x1a2840, roof: 0x121a2c, mist: 0xb8b6c8 },
    { top: 0x150e22, middle: 0x3a2440, low: 0x8a5442, hill: 0x22182e, roof: 0x160e1e, mist: 0xd09a7a }
  ][chapter % 3];
  const random = seeded(17 + chapter * 101);

  // The sky stays where it is: it is drawn on the stage, under the world.
  const sky = scope.use(new Sprite());
  sky.graphics
    .beginLinearGradientFill(0, 0, 0, viewHeight, stops([0, palettes.top], [0.62, palettes.middle], [1, palettes.low]))
    .drawRect(0, 0, viewWidth, viewHeight)
    .endFill();
  // Stars: small dots, a little brighter where they gather.
  for (let i = 0; i < 70; i++) {
    const x = random() * viewWidth,
      y = random() * viewHeight * 0.55,
      r = random() < 0.12 ? 1.6 : 0.9;
    sky.graphics.beginFill(0xfff4dc, 0.35 + random() * 0.5).drawCircle(x, y, r).endFill();
  }
  const moon = sky.addChild(scope.use(new Sprite()));
  moon.x = viewWidth * (0.72 - chapter * 0.08);
  moon.y = 92;
  moon.graphics.beginRadialGradientFill(-8, -8, 46, stops([0, 0xfffbe8], [0.7, 0xf2e4b8], [1, 0xd8c08a])).drawCircle(0, 0, 38).endFill();
  moon.graphics.beginFill(0xcab27c, 0.5).drawCircle(10, 6, 7).drawCircle(-12, 12, 4).endFill();
  // The halo brightens the sky under it, as light does: `screen` blend.
  const halo = sky.addChild(scope.use(new Sprite()));
  halo.x = moon.x;
  halo.y = moon.y;
  halo.blendMode = 'screen';
  halo.graphics.beginRadialGradientFill(0, 0, 150, stops([0, 0xf6e6b0, 0.55], [0.35, 0xc8b88a, 0.22], [1, 0x000000, 0])).drawCircle(0, 0, 150).endFill();

  // Far hills, then the roofs of the city, then mist: each wider than the view, to move under it.
  const span = Math.max(width, viewWidth) + viewWidth;
  const hills = scope.use(new Sprite());
  hills.graphics.beginFill(palettes.hill, 1).moveTo(-viewWidth / 2, viewHeight);
  for (let x = -viewWidth / 2; x <= span; x += 60) hills.graphics.lineTo(x, viewHeight * 0.52 + Math.sin(x / 210) * 40 + random() * 30);
  hills.graphics.lineTo(span, viewHeight).lineTo(-viewWidth / 2, viewHeight).endFill();

  const roofs = scope.use(new Sprite());
  const g = roofs.graphics;
  for (let x = -viewWidth / 2; x < span; x += 90 + random() * 120) {
    const w = 70 + random() * 90,
      h = 70 + random() * 120,
      base = viewHeight * 0.95;
    // A hall: a wall and a roof with upturned eaves; now and then a pagoda of three storeys.
    g.beginFill(palettes.roof, 1).drawRect(x, base - h, w, h).endFill();
    const storeys = random() < 0.25 ? 3 : 1;
    for (let s = 0; s < storeys; s++) {
      const top = base - h - s * 34,
        inset = s * 12;
      g.beginFill(palettes.roof, 1)
        .moveTo(x - 16 + inset, top)
        .curveTo(x + w / 2, top - 16, x + w + 16 - inset, top)
        .lineTo(x + w - 8 - inset, top - 22)
        .lineTo(x + 8 + inset, top - 22)
        .lineTo(x - 16 + inset, top)
        .endFill();
      if (s + 1 < storeys) g.beginFill(palettes.roof, 1).drawRect(x + 14 + inset, top - 34, w - 28 - inset * 2, 14).endFill();
    }
    if (random() < 0.4) g.beginFill(0xf0b060, 0.6).drawRect(x + w * 0.4, base - h * 0.6, 8, 10).endFill();
  }

  const mist = scope.use(new Sprite());
  mist.blendMode = 'screen';
  mist.alpha = 0.55;
  mist.graphics
    .beginLinearGradientFill(0, viewHeight * 0.62, 0, viewHeight, stops([0, palettes.mist, 0], [0.55, palettes.mist, 0.22], [1, palettes.mist, 0.05]))
    .drawRect(-viewWidth / 2, viewHeight * 0.62, span + viewWidth / 2, viewHeight * 0.38)
    .endFill();

  return {
    sky,
    moon,
    layers: [
      { display: hills, factor: 0.12 },
      { display: roofs, factor: 0.3 },
      { display: mist, factor: 0.55 }
    ],
    /** Mist breathes: its alpha drifts slowly. */
    update(time) {
      mist.alpha = 0.5 + Math.sin(time * 0.4) * 0.08;
      halo.alpha = 0.9 + Math.sin(time * 1.3) * 0.06;
    }
  };
}
