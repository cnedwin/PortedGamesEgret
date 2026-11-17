// Stock characters occupy the prefix and scene geometry follows them in the same pack.
const BODY_NAMES = new Set(['hero', 'blade', 'shield', 'bow', 'lu']);

function layout(index) {
  const entries = Object.entries(index).sort((a, b) => a[1].offset - b[1].offset);
  let scene, total = 0;
  for (const [name, info] of entries) {
    if (info.offset !== total || !Number.isSafeInteger(info.bytes) || info.bytes < 4 || info.bytes % 4 !== 0) return null;
    if (BODY_NAMES.has(name)) {
      if (!info.skinned || scene !== undefined) return null;
    } else {
      scene ??= total;
    }
    total += info.bytes;
  }
  return scene > 0 && Number.isSafeInteger(total) ? { entries, scene, total } : null;
}

async function fullPack(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Model pack HTTP ' + response.status);
  return { bin: await response.arrayBuffer(), offset: 0 };
}

async function rangedPack(url, start, end, total) {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=' + start + '-' + end } });
    if (response.status === 200) {
      // A static host can ignore Range. Keep the full file from that first response.
      const bin = await response.arrayBuffer();
      if (bin.byteLength === total) return { bin, offset: 0 };
    } else if (response.status === 206 &&
      response.headers.get('Content-Range') === 'bytes ' + start + '-' + end + '/' + total) {
      const bin = await response.arrayBuffer();
      if (bin.byteLength === end - start + 1) return { bin, offset: start };
    } else {
      await response.body?.cancel();
    }
  } catch {
    // Let the caller make one ordinary request if the host rejected a byte range.
  }
  return null;
}

function missingBodyRanges(entries, skip) {
  const ranges = [];
  for (const [name, info] of entries) {
    if (!BODY_NAMES.has(name)) break;
    if (skip.has(name)) continue;
    const end = info.offset + info.bytes - 1;
    const previous = ranges.at(-1);
    if (previous?.end === info.offset - 1) previous.end = end;
    else ranges.push({ start: info.offset, end });
  }
  return ranges;
}

async function loadScenePack(url, index) {
  const ranges = layout(index);
  const scene = ranges && await rangedPack(url, ranges.scene, ranges.total - 1, ranges.total);
  return { ranges, spans: [scene ?? await fullPack(url)] };
}

export async function loadModelPack(level, base, replacementBodies) {
  const url = new URL('models-' + level + '.bin', base);
  const manifest = fetch(new URL('models-' + level + '.json', base)).then((response) => {
    if (!response.ok) throw new Error('Model index HTTP ' + response.status);
    return response.json();
  });
  // Start the scene transfer as soon as its offsets are known. External GLBs decode independently.
  const packed = replacementBodies
    ? manifest.then((index) => loadScenePack(url, index))
    : fullPack(url).then((span) => ({ spans: [span] }));
  const [index, candidates, { ranges, spans }] = await Promise.all([
    manifest, replacementBodies, packed
  ]);
  const skip = new Set([...BODY_NAMES].filter((name) => candidates?.[name]?.length > 0));
  if (spans[0].offset !== 0) {
    for (const { start, end } of missingBodyRanges(ranges.entries, skip)) {
      const part = await rangedPack(url, start, end, ranges.total);
      if (!part || part.bin.byteLength === ranges.total) {
        return { index, skip, spans: [part ?? await fullPack(url)] };
      }
      spans.push(part);
    }
  }
  return { index, skip, spans };
}
