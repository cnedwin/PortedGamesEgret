// Original ink-and-brass palette. It contains no themed assets or game rules.
export const palette = Object.freeze({
  night: 0x101d22, deep: 0x16282e, card: 0x22383b, jade: 0x365951, jadeActive: 0x52796a,
  cream: 0xf8eaca, gold: 0xe7bd77, muted: 0xc6cebf, line: 0x627d70,
  red: 0x9e3d2f, redDim: 0x71372e, paleInk: 0x263a35, disabled: 0x475b58
});
export const skin = Object.freeze({
  panel: palette.deep, panelAlpha: 0.96, text: palette.cream,
  button: palette.jade, buttonText: palette.cream, disabled: palette.disabled,
  accent: palette.gold, track: palette.card, dim: 0.72, radius: 7, size: 18
});
// At 325 CSS px tall a 540-unit landscape scales to about 0.60 CSS px
// per logical unit; 76 units leave room for clipping/rounding at 44 CSS px.
export const metrics = Object.freeze({target: 76, pad: 12, gap: 7});
// Text/graphics are rendered in the engine's pixel density, independent of
// the screen fit. Limit device density to 2 to bound the UI's render target.
const density=Math.min(2,Math.max(1,Number(globalThis.devicePixelRatio)||1));
export const recommendedPlay = Object.freeze({
  width: 960, height: 540, portrait: Object.freeze({width:540,height:960}),
  fit:'expand', uiScale:Object.freeze({min:0.8,max:1.12}), pixelRatio:density, renderMode:'on-demand'
});
