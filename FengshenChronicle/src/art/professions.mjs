// Original painted class/campaign sheets, prepared once for native Egret.
// Connected cutouts retain long weapons without importing a neighboring actor.
import { yieldArtPreparation } from './prepare.mjs';

let prepared;

function sourcePixels(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return {
    width: canvas.width, height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data
  };
}

function isolate(source, index) {
  const cellWidth = source.width / 4;
  const cellHeight = source.height / 2;
  const column = index % 4;
  const row = Math.floor(index / 4);
  // Connectivity determines ownership inside this slightly wider search area.
  const left = Math.max(0, Math.floor(column * cellWidth - 58));
  const top = Math.floor(row * cellHeight);
  const right = Math.min(source.width, Math.ceil((column + 1) * cellWidth + 58));
  const bottom = Math.floor((row + 1) * cellHeight);
  const width = right - left;
  const height = bottom - top;
  const alphaAt = (x, y) => source.data[((top + y) * source.width + left + x) * 4 + 3];
  const centreX = (column + .5) * cellWidth - left;
  const centreY = cellHeight * .53;
  let seed = -1;
  let nearestDistance = Infinity;

  // Find an opaque torso pixel closest to the expected body centre.
  for (let y = Math.max(0, Math.floor(centreY - 90)); y < Math.min(height, centreY + 90); y++) {
    for (let x = Math.max(0, Math.floor(centreX - 100)); x < Math.min(width, centreX + 100); x++) {
      if (alphaAt(x, y) <= 160) continue;
      const distance = (x - centreX) ** 2 + (y - centreY) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        seed = y * width + x;
      }
    }
  }
  if (seed < 0) throw Error('Painted actor cell has no silhouette: ' + index);

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 1;
  queue[0] = seed;
  visited[seed] = 1;
  let minX = width, minY = height, maxX = 0, maxY = 0;

  // Eight-connected traversal keeps thin diagonal ribbons, hair and shafts.
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width, y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nextX = x + dx, nextY = y + dy;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
        const next = nextY * width + nextX;
        if (visited[next] || alphaAt(nextX, nextY) <= 14) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  // Solid low pixels locate the foot contact; the soft shadow is excluded.
  let contactY = 0;
  for (let y = Math.floor(height * .65); y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y * width + x] && alphaAt(x, y) > 190) contactY = Math.max(contactY, y);
    }
  }
  let contactSum = 0, contactWeight = 0;
  for (let y = Math.max(0, contactY - 32); y <= contactY; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y * width + x] || alphaAt(x, y) <= 190) continue;
      contactSum += x;
      contactWeight++;
    }
  }
  const pin = [left + (contactWeight ? contactSum / contactWeight : centreX), top + contactY];
  const canvas = document.createElement('canvas');
  canvas.width = maxX - minX + 3;
  canvas.height = maxY - minY + 3;
  const context = canvas.getContext('2d');
  const cutout = context.createImageData(canvas.width, canvas.height);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!visited[y * width + x]) continue;
      const sourceOffset = ((top + y) * source.width + left + x) * 4;
      const targetOffset = ((y - minY) * canvas.width + x - minX) * 4;
      for (let channel = 0; channel < 4; channel++) {
        cutout.data[targetOffset + channel] = source.data[sourceOffset + channel];
      }
    }
  }
  context.putImageData(cutout, 0, 0);
  return {
    canvas, bounds: [left + minX, top + minY, canvas.width, canvas.height], pin,
    cell: [column * cellWidth, row * cellHeight, cellWidth, cellHeight]
  };
}

function drawCutout(context, cutout, scale) {
  const [x, y, width, height] = cutout.bounds;
  context.drawImage(cutout.canvas,
    (x - cutout.pin[0]) * scale, (y - cutout.pin[1]) * scale, width * scale, height * scale);
}

function weapon(cutout, kind, pose) {
  const back = cutout.cell[1] > 0;
  const attack = pose === 'attack', hurt = pose === 'hurt';
  const local = kind === 'ritualist'
    ? attack ? [[386, 120], [285, 168]]
      : hurt ? [[95, 60], [139, 185]]
        : [[313, back ? 65 : 55], [295, back ? 225 : 205]]
    : attack ? [[405, 111], [333, 135]] : [[338, 175], [310, 250]];
  const [tip, grip] = local.map(([x, y]) => [
    (cutout.cell[0] + x - cutout.pin[0]) * .285,
    (cutout.cell[1] + y - cutout.pin[1]) * .285
  ]);
  const dx = tip[0] - grip[0], dy = tip[1] - grip[1];
  return {
    x: (tip[0] + grip[0]) / 2, y: (tip[1] + grip[1]) / 2,
    tipX: tip[0], tipY: tip[1], length: Math.hypot(dx, dy),
    rotation: Math.atan2(dy, dx) * 180 / Math.PI
  };
}

async function prepareProfessionArt(loadImage) {
  const ids = ['ritualist', 'ritualist-walk', 'ranger', 'ranger-walk', 'campaign-enemies'];
  const images = await Promise.all(ids.map(id => loadImage('actors/' + id)));
  const sources = [], entries = [], aliases = {};
  for (const image of images) {
    sources.push(sourcePixels(image));
    await yieldArtPreparation();
  }
  for (const [kind, base, walk] of [
    ['ritualist', sources[0], sources[1]], ['ranger', sources[2], sources[3]]
  ]) {
    const cuts = [], strides = [];
    for (let index = 0; index < 8; index++) {
      cuts.push(isolate(base, index));
      await yieldArtPreparation();
      strides.push(isolate(walk, index));
      await yieldArtPreparation();
    }
    // Fixed scale preserves crouching/casting poses; contacts retain their pins.
    const add = (key, cutout, pose) => {
      const anchor = weapon(cutout, kind, pose);
      const back = key.includes('Back');
      entries.push({
        key, w: 178, h: 152, pivotY: 132, group: 'profession', profession: kind,
        draw: context => drawCutout(context, cutout, .285),
        weaponAnchor: anchor,
        offhandAnchor: {
          x: back ? -19 : -22, y: pose === 'attack' ? -82 : -65,
          width: kind === 'ritualist' ? 21 : 19, height: kind === 'ritualist' ? 21 : 25,
          rotation: back ? 15 : -12
        },
        eraseWeapon(context) {
          context.save();
          context.globalCompositeOperation = 'destination-out';
          if (kind === 'ritualist') {
            const grip = { x: anchor.x * 2 - anchor.tipX, y: anchor.y * 2 - anchor.tipY };
            context.lineWidth = 10;
            context.beginPath();
            context.moveTo(grip.x, grip.y);
            context.lineTo(grip.x + (back ? 1 : -4), 8);
            context.stroke();
          } else context.clearRect(back ? -62 : 20, -48, 42, 48);
          context.restore();
        }
      });
    };
    for (const back of [false, true]) {
      const prefix = kind + (back ? 'Back' : ''), first = back ? 4 : 0;
      for (const [column, pose] of [[0, '0'], [2, 'attack'], [3, 'hurt']]) {
        add(prefix + ':' + pose, cuts[first + column], pose);
      }
      for (let frame = 0; frame < 4; frame++) add(prefix + ':walk' + frame, strides[first + frame], 'walk');
      for (const frame of [1, 2, 3]) aliases[prefix + ':' + frame] = prefix + ':0';
      aliases[prefix + ':fallen'] = prefix + ':hurt';
    }
  }

  const foes = sources[4];
  for (const [column, kind, height] of [
    [0, 'sentinel', 121], [1, 'channeler', 124], [2, 'riverLord', 174], [3, 'warMarshal', 183]
  ]) {
    const idle = isolate(foes, column), attack = isolate(foes, column + 4);
    const scale = height / (idle.pin[1] - idle.bounds[1]);
    for (const [pose, cutout] of [['0', idle], ['attack', attack]]) {
      entries.push({
        key: kind + ':' + pose, w: kind === 'riverLord' || kind === 'warMarshal' ? 270 : 198,
        h: height + 31, pivotY: height + 12, group: 'campaignEnemy',
        draw: context => drawCutout(context, cutout, scale)
      });
    }
    aliases[kind + ':hurt'] = kind + ':0';
    aliases[kind + ':fallen'] = kind + ':0';
    for (const frame of [1, 2, 3]) aliases[kind + ':' + frame] = kind + ':0';
    for (const pose of ['0', '1', '2', '3', 'attack', 'hurt', 'fallen']) {
      aliases[kind + 'Back:' + pose] = kind + ':' + pose;
    }
    await yieldArtPreparation();
  }
  return { entries, aliases };
}

export async function loadProfessionArt(loadImage) {
  prepared ??= prepareProfessionArt(loadImage).catch(error => { prepared = undefined; throw error; });
  const art = await prepared;
  // Packing mutates coordinates: each game receives fresh entry objects.
  return { entries: art.entries.map(entry => ({ ...entry })), aliases: { ...art.aliases } };
}
