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
  return { scale, pixelRatio };
}

// Play paragraphs currently use one pixel per design unit. Higher design-unit
// density preserves the same CSS geometry and makes native long text sharper.
export function scaleViewPart(part, scale) {
  const result = { ...part };
  for (const key of ['x', 'y', 'width', 'height', 'padding', 'gap', 'size', 'radius', 'offsetX', 'offsetY']) {
    if (typeof part[key] === 'number') result[key] = part[key] * scale;
  }
  if (part.border && typeof part.border.width === 'number') result.border = { ...part.border, width: part.border.width * scale };
  if (part.paragraph) {
    result.paragraph = { ...part.paragraph };
    for (const key of ['lineHeight', 'letterSpacing', 'wordSpacing']) {
      if (typeof part.paragraph[key] === 'number') result.paragraph[key] = part.paragraph[key] * scale;
    }
  }
  if (part.children) result.children = part.children.map(child => scaleViewPart(child, scale));
  return result;
}