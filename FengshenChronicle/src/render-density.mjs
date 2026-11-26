// Rendering density is presentation-only; world logic, controls and collision units stay unchanged.
const positive = (value, fallback = 1) => Number.isFinite(value) && value > 0 ? value : fallback;
const fitOf = (logical, css) => Math.min(positive(css.width) / positive(logical.width), positive(css.height) / positive(logical.height));

export function worldPixelRatio(logical, css, dpr = 1) {
  const device = positive(dpr);
  const target = fitOf(logical, css) * device;
  // Never regress the original 2x-DPR default on ordinary devices. Bound GPU fill cost.
  const budget = Math.sqrt(3_500_000 / (positive(logical.width) * positive(logical.height)));
  return Math.max(1, Math.min(2.5, budget, Math.max(Math.min(device, 2), target)));
}

export function rpgDensity(landscape, portrait, css, dpr = 1) {
  const base = css.width < css.height ? portrait : landscape;
  const fit = fitOf(base, css);
  const required = Math.max(1, fit * positive(dpr));
  const area = positive(css.width) * positive(css.height) / (fit * fit);
  const edge = Math.max(positive(css.width), positive(css.height)) / fit;
  const steps = [1, 1.5, 2, 2.5].filter(scale => area * scale * scale <= 4_000_000 && edge * scale <= 4096);
  const scale = steps.find(value => value >= required) ?? steps.at(-1) ?? 1;
  const pixelRatio = Math.max(1, Math.min(2, required / scale, Math.sqrt(4_000_000 / (area * scale * scale)), 4096 / (edge * scale)));
  // Keep the same physical backing budget. Native paragraph raster density
  // is now independent of logical layout and the canvas pixel ratio.
  return { paragraphDensity: scale, pixelRatio: scale * pixelRatio };
}
