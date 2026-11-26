// The Play design surface is intentionally three quarters of the scenery's 1280 × 720 space.
// Match its physical backing pixels to the fitted viewport, not merely to the device DPR.
// The host fixes density at creation, so reserve the larger of both orientations for touch devices.
export function uiRenderDensity({ width, height, dpr = 1, coarse = false, screenWidth, screenHeight }, design = { width: 1280, height: 720 }, unit = 0.75) {
  const fit = (w, h) => Math.min(Math.max(1, w) / design.width, Math.max(1, h) / design.height);
  let scale = fit(width, height);
  if (coarse) {
    scale = Math.max(scale, fit(height, width));
    // Mobile browser controls can change the usable viewport during or after rotation.
    if (screenWidth > 0 && screenHeight > 0 && Number.isFinite(screenWidth) && Number.isFinite(screenHeight))
      scale = Math.max(scale, fit(screenWidth, screenHeight), fit(screenHeight, screenWidth));
  }
  const physicalDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  // Keep the transparent canvas below the engine's surface budget even on very high-DPI displays.
  const pixelBudget = coarse ? 4_800_000 : 6_400_000;
  const cap = Math.sqrt(pixelBudget / (design.width * design.height * unit * unit));
  return Math.min(cap, Math.max(1, scale * physicalDpr / unit));
}

// The custom multiline title uses BrowserGame labels rather than PlayText. Snap only its
// texture origin to the real backing-pixel grid; keep the authored panel and hit area unchanged.
export function alignLabelPixels(display, parent, frame, density) {
  if (!(frame?.width > 0 && frame?.height > 0 && density > 0)) return;
  const sx = Math.ceil(frame.width * density) / frame.width;
  const sy = Math.ceil(frame.height * density) / frame.height;
  const before = display.localToGlobal(0, 0);
  const local = parent.globalToLocal(before.x, before.y);
  const snapped = parent.globalToLocal(Math.round(before.x * sx) / sx, Math.round(before.y * sy) / sy);
  display.x += snapped.x - local.x;
  display.y += snapped.y - local.y;
}
