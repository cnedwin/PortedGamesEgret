const fabricMidtones = {
  'linxia-pool': [62, 145],
  'tangmi-pajama': [115, 190],
  'bailu-lounge': [135, 173],
  'bailu-stargazing': [142],
};

export function portraitDyes(name, colors) {
  return fabricMidtones[name]?.map((_, i) => typeof colors?.[i] === 'string' ? colors[i] : null) ?? [];
}

function raster(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d', { willReadFrequently: true });
}

function colorRamp(color, midtone) {
  if (!color) return null;
  const sample = raster(1, 1);
  sample.fillStyle = color;
  sample.fillRect(0, 0, 1, 1);
  const rgb = sample.getImageData(0, 0, 1, 1).data.subarray(0, 3);
  return Array.from({ length: 256 }, (_, lum) => {
    const shade = lum < midtone ? .86 * (lum - midtone) / midtone : .78 * (lum - midtone) / (255 - midtone);
    return rgb.map(channel => channel + shade * (shade < 0 ? channel : 255 - channel));
  });
}

// The mask stores separate soft coverage for fabric and piping. Only those
// areas change, and the original painted shadows and highlights stay visible.
export function paintDyedPortrait(name, image, mask, colors) {
  const { naturalWidth: width, naturalHeight: height } = image;
  const artwork = raster(width, height);
  const coverage = raster(width, height);
  artwork.drawImage(image, 0, 0);
  coverage.drawImage(mask, 0, 0, width, height);
  const pixels = artwork.getImageData(0, 0, width, height);
  const areas = coverage.getImageData(0, 0, width, height).data;
  const [fabric, trim] = fabricMidtones[name].map((tone, i) => colorRamp(colors[i], tone));
  const rgba = pixels.data;
  for (let i = 0; i < rgba.length; i += 4) {
    const body = fabric ? areas[i] / 255 : 0;
    const edge = trim ? areas[i + 1] / 255 : 0;
    if ((!body && !edge) || !rgba[i + 3]) continue;
    const lum = Math.round(.2126 * rgba[i] + .7152 * rgba[i + 1] + .0722 * rgba[i + 2]);
    const base = fabric?.[lum];
    const piping = trim?.[lum];
    for (let c = 0; c < 3; c++) {
      const before = rgba[i + c];
      const dyed = base ? before + body * (base[c] - before) : before;
      rgba[i + c] = piping ? dyed + edge * (piping[c] - dyed) : dyed;
    }
  }
  artwork.putImageData(pixels, 0, 0);
  return artwork.canvas;
}
