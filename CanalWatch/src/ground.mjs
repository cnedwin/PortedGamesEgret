// The rain-darkened town is painted once under the clear engine canvas. The two routes, gates and
// building plots share the same coordinates as the simulation.
import { FIELD, GATES, PLOTS, WIDTH } from './sim/data.mjs';
import { seeded, WAYS } from './sim/world.mjs';

const rgba = (color, alpha) => `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;

/** Draw the map's simple shapes on the static 2D canvas. */
function canvasGraphics(context) {
  let fill = null,
    line = null,
    open = false;
  // What has been drawn since the last fill or line change is filled and stroked as the engine would.
  const flush = () => {
    if (open) {
      if (fill) {
        context.fillStyle = fill;
        context.fill();
      }
      if (line) {
        context.lineWidth = line.width;
        context.strokeStyle = line.style;
        context.lineJoin = line.options.joints ?? 'miter';
        context.lineCap = line.options.caps === 'round' ? 'round' : line.options.caps === 'square' ? 'square' : 'butt';
        context.setLineDash(line.options.dash ?? []);
        context.stroke();
      }
    }
    context.beginPath();
    open = false;
  };
  const g = {
    beginFill(color, alpha = 1) {
      flush();
      fill = rgba(color, alpha);
      return g;
    },
    endFill() {
      flush();
      fill = null;
      return g;
    },
    lineStyle(width = 0, color = 0, alpha = 1, options = {}) {
      flush();
      line = width > 0 ? { width, style: rgba(color, alpha), options } : null;
      return g;
    },
    moveTo(x, y) {
      context.moveTo(x, y);
      open = true;
      return g;
    },
    lineTo(x, y) {
      context.lineTo(x, y);
      open = true;
      return g;
    },
    curveTo(cx, cy, x, y) {
      context.quadraticCurveTo(cx, cy, x, y);
      open = true;
      return g;
    },
    drawRect(x, y, width, height) {
      context.rect(x, y, width, height);
      open = true;
      return g;
    },
    drawCircle(x, y, radius) {
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
      open = true;
      return g;
    },
    drawEllipse(x, y, width, height) {
      context.moveTo(x + width, y + height / 2);
      context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      open = true;
      return g;
    },
    finish: flush
  };
  return g;
}

const TAU = Math.PI * 2;
const { width: MAP_W, height: MAP_H } = FIELD;
const WATER = WAYS.water;
const ROAD = WAYS.road;

function polygon(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, color, tilt = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, tilt, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function stroke(ctx, x, y, toX, toY, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function wash(ctx, x, y, rx, ry, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  fade.addColorStop(0, color);
  fade.addColorStop(1, 'transparent');
  ellipse(ctx, 0, 0, 1, 1, fade);
  ctx.restore();
}

function routeStroke(ctx, way, width, color) {
  ctx.beginPath();
  ctx.moveTo(...way.points[0]);
  for (const point of way.points.slice(1)) ctx.lineTo(...point);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function routePoint(way, distance, offset = 0) {
  const { x, y, angle } = way.at(distance);
  return [x - Math.sin(angle) * offset, y + Math.cos(angle) * offset, angle];
}

/** Clip decoration to the actual rounded channel. */
function clipChannel(ctx) {
  const radius = WIDTH.water / 2;
  ctx.beginPath();
  for (let i = 1; i < WATER.points.length; i++) {
    const [ax, ay] = WATER.points[i - 1],
      [bx, by] = WATER.points[i],
      length = Math.hypot(bx - ax, by - ay),
      nx = -(by - ay) / length * radius,
      ny = (bx - ax) / length * radius;
    ctx.moveTo(ax + nx, ay + ny);
    ctx.lineTo(ax - nx, ay - ny);
    ctx.lineTo(bx - nx, by - ny);
    ctx.lineTo(bx + nx, by + ny);
    ctx.closePath();
  }
  for (const [x, y] of WATER.points) {
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, TAU);
  }
  ctx.clip();
}

function terrain(ctx, random) {
  const silk = ctx.createLinearGradient(0, 0, MAP_W * 0.74, MAP_H);
  silk.addColorStop(0, '#49594f');
  silk.addColorStop(0.33, '#7b806a');
  silk.addColorStop(0.57, '#777e68');
  silk.addColorStop(1, '#47564b');
  ctx.fillStyle = silk;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  wash(ctx, 260, 262, 275, 212, '#c1b2976e');
  wash(ctx, 710, 347, 250, 140, '#a3926663');
  wash(ctx, 850, 42, 180, 90, '#b4b49a72');
  wash(ctx, 100, 440, 220, 175, '#152d2e8c');
  wash(ctx, 432, 363, 180, 99, '#d6b9944c');

  // Uneven ridges dissolve into the silk wash along the distant shore.
  const ridges = [
    { color: '#233f397d', foot: 71, points: [[-12, 38], [57, 36], [122, 11], [177, 18], [255, 48], [329, 52], [404, 19], [440, 10], [520, 36], [616, 43], [701, 20], [787, 33], [863, 10], [977, 39]] },
    { color: '#293f3570', foot: 92, points: [[-12, 55], [72, 34], [102, 41], [205, 58], [301, 55], [359, 35], [415, 44], [515, 71], [583, 63], [671, 41], [732, 39], [826, 61], [888, 59], [977, 42]] },
    { color: '#adb29c66', foot: 119, points: [[-12, 80], [75, 77], [167, 61], [196, 65], [264, 87], [335, 78], [415, 60], [479, 73], [576, 77], [658, 59], [726, 76], [797, 80], [869, 61], [977, 76]] }
  ];
  for (const { color, foot, points } of ridges) {
    const ink = ctx.createLinearGradient(0, 12, 0, foot);
    ink.addColorStop(0, color);
    ink.addColorStop(0.68, color);
    ink.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(...points[0]);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i - 1],
        [ahead, rise] = points[i];
      ctx.quadraticCurveTo(x, y, (x + ahead) / 2, (y + rise) / 2);
    }
    ctx.lineTo(...points.at(-1));
    ctx.lineTo(MAP_W + 12, -10);
    ctx.closePath();
    ctx.fillStyle = ink;
    ctx.fill();
  }
  for (const [x, y, radius] of [[33, 301, 18], [181, 299, 15], [287, 325, 13], [460, 369, 20], [683, 361, 17], [797, 386, 15], [885, 466, 19], [34, 504, 16]]) {
    wash(ctx, x, y, radius, radius * 0.32, '#142e2a52');
    stroke(ctx, x - radius * 0.52, y + 1, x + radius * 0.56, y - 0.2, '#c3c0a740', 0.75);
  }
  // Broken horizontal fibres and dry brush marks on the silk.
  for (let i = 0; i < 800; i++) {
    const x = random() * MAP_W,
      y = random() * MAP_H,
      span = 9 + random() * 68;
    stroke(ctx, x, y, x + span, y + (random() - 0.5) * 0.7, i % 2 ? '#e1cfab12' : '#12272111', 0.55);
  }
  for (let i = 0; i < 2000; i++) {
    const x = random() * MAP_W,
      y = random() * MAP_H,
      span = 1 + random() * 16;
    stroke(ctx, x, y, x + span, y + (random() - 0.5) * 1.8, i % 3 ? '#1e332b13' : '#f0dcb51d', 0.5 + random());
  }
}

function canal(ctx, random) {
  routeStroke(ctx, WATER, WIDTH.water + 22, '#394c43');
  routeStroke(ctx, WATER, WIDTH.water + 16, '#9e9a7b');
  routeStroke(ctx, WATER, WIDTH.water + 11, '#777f6e');

  // Weathered revetment blocks, laid individually above the deep waterline.
  for (const side of [-1, 1]) {
    for (let s = 9; s < WATER.length - 6; s += 11) {
      const [x, y, angle] = routePoint(WATER, s, side * (WIDTH.water / 2 + 4.1));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const color = ['#aaa288', '#968f78', '#828b77', '#8e947a'][Math.floor(random() * 4)];
      polygon(ctx, [[-5.5, -3.2], [4.3, -3.8], [5.5, 2.1], [-4.4, 3.4]], color);
      stroke(ctx, -4.4, -2.8, 4, -3.5, side < 0 ? '#e3cfa368' : '#cac29c3f', 0.7);
      stroke(ctx, -4.8, 2.8, 3.9, 2.4, '#344b43a0', 0.8);
      ctx.restore();
    }
  }
  routeStroke(ctx, WATER, WIDTH.water + 2, '#2b3d36');
  const color = ctx.createLinearGradient(65, 58, 786, 375);
  color.addColorStop(0, '#4d776d');
  color.addColorStop(0.45, '#355f55');
  color.addColorStop(0.72, '#416c61');
  color.addColorStop(1, '#304f4b');
  routeStroke(ctx, WATER, WIDTH.water, color);
  routeStroke(ctx, WATER, WIDTH.water - 9, '#79a79619');

  ctx.save();
  clipChannel(ctx);
  for (let s = 10; s < WATER.length - 10; s += 5) {
    const [x, y, angle] = routePoint(WATER, s + random() * 6, (random() - 0.5) * 52);
    const length = 3 + Math.pow(random(), 2) * 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-length * 0.35, 0);
    ctx.quadraticCurveTo(0, -1.7 - random(), length * 0.65, 0.9);
    ctx.strokeStyle = ['#bad6b85b', '#8fb9a356', '#193e393e', '#cbd1aa3e'][Math.floor(random() * 4)];
    ctx.lineWidth = 0.55 + random() * 0.95;
    ctx.stroke();
    ctx.restore();
  }
  for (const gate of GATES) {
    const [x, y] = routePoint(WATER, gate.at);
    wash(ctx, x, y + 7, 46, 25, '#e6aa6258');
  }
  ctx.restore();
}

function towpath(ctx, random) {
  routeStroke(ctx, ROAD, WIDTH.road + 12, '#3a463b');
  routeStroke(ctx, ROAD, WIDTH.road + 7, '#747660');
  routeStroke(ctx, ROAD, WIDTH.road + 2, '#8e856d');
  const limestone = ctx.createLinearGradient(0, 377, 0, 495);
  limestone.addColorStop(0, '#c4ad85');
  limestone.addColorStop(0.53, '#b4a17e');
  limestone.addColorStop(1, '#adaa83');
  routeStroke(ctx, ROAD, WIDTH.road, limestone);
  routeStroke(ctx, ROAD, WIDTH.road - 10, '#dac2953d');

  // Three staggered courses, with the busiest joints kept near the shoulders.
  for (const offset of [-10, 0, 10]) {
    for (let s = 6 + Math.abs(offset * 0.63); s < ROAD.length - 6; s += 12 + random() * 6) {
      const [x, y, angle] = routePoint(ROAD, s, offset + (random() - 0.5) * 2);
      const length = 4 + random() * 4;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      polygon(ctx, [[-length, -3.6], [length - 1, -4.2], [length, 3.1], [-length + 2, 4.3]],
        ['#e4ce9d38', '#605c4a35', '#aa95745c'][Math.floor(random() * 3)]);
      if (offset) stroke(ctx, -length, -2.8, length - 2, -3.6, '#f2d8ac52', 0.66);
      ctx.restore();
    }
  }
}

function roof(ctx, span, height, lit) {
  const eave = span / 2;
  const tile = ctx.createLinearGradient(0, -height, 0, 4);
  tile.addColorStop(0, lit ? '#606a60' : '#59655c');
  tile.addColorStop(1, '#243936');
  ctx.beginPath();
  ctx.moveTo(-eave - 6, 0);
  ctx.quadraticCurveTo(-eave * 0.48, -5, -eave * 0.32, -height + 1);
  ctx.quadraticCurveTo(0, -height + 2, eave * 0.35, -height - 1);
  ctx.quadraticCurveTo(eave * 0.57, -5, eave + 7, -2);
  ctx.quadraticCurveTo(eave + 2, 3, eave - 6, 3);
  ctx.lineTo(-eave + 2, 5);
  ctx.quadraticCurveTo(-eave - 2, 5, -eave - 6, 0);
  ctx.fillStyle = tile;
  ctx.fill();
  ctx.strokeStyle = '#c6bb946a';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  for (let i = -5; i <= 5; i++) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(t * eave * 0.31, -height + 2);
    ctx.quadraticCurveTo(t * eave * 0.51, -7, t * (eave - 3), 2);
    ctx.strokeStyle = i % 2 ? '#d0d1b536' : '#172b2a96';
    ctx.stroke();
  }
  stroke(ctx, -eave + 2, 4, eave - 5, 3, lit ? '#a2513e' : '#424f42', 2);
}

function lantern(ctx, x, y, size = 1) {
  wash(ctx, x, y + 4 * size, 15 * size, 14 * size, '#ed9a4989');
  stroke(ctx, x, y - 6 * size, x, y - 3 * size, '#46372b', 1);
  ellipse(ctx, x, y, 2.8 * size, 4.1 * size, '#ab4c32');
  ellipse(ctx, x, y + 0.1, 1.8 * size, 2.9 * size, '#f3bc70');
  stroke(ctx, x - 2.2 * size, y - 3.6 * size, x + 2.1 * size, y - 3.6 * size, '#493b32', 1);
}

function house(ctx, x, y, width, height, { lit = false, raised = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  const half = width / 2;
  wash(ctx, 5, 4, half + 19, 16, '#142826a5');
  polygon(ctx, [[-half - 3, -2], [half + 2, -4], [half + 9, 3], [-half, 6]], '#8d9075');
  polygon(ctx, [[-half, -height], [half, -height], [half, 1], [-half, 2]], lit ? '#b6a380' : '#8c8b73');
  polygon(ctx, [[half, -height], [half + 6, -height - 4], [half + 6, -5], [half, 1]], '#48594f');
  stroke(ctx, -half, -2, half, -2, '#605b4c', 2);
  const posts = width > 48 ? 4 : 3;
  for (let i = 0; i < posts; i++) {
    const left = -half + i * width / (posts - 1);
    stroke(ctx, left, -height + 1, left, 0, lit ? '#733d33' : '#52604e', 2.2);
    if (i === posts - 1) continue;
    const px = left + width / (posts - 1) / 2;
    ctx.fillStyle = lit ? '#e1a95f' : '#43574c';
    ctx.fillRect(px - 3.5, -height * 0.72, 7, 5.5);
    stroke(ctx, px, -height * 0.72, px, -height * 0.72 + 5.5, '#70594a', 0.8);
    stroke(ctx, px - 3, -height * 0.72 + 2.8, px + 3, -height * 0.72 + 2.8, '#70594a', 0.8);
  }
  ctx.translate(0, -height);
  roof(ctx, width + 2, raised ? 14 : 10, lit);
  if (raised) {
    ctx.translate(0, -9);
    roof(ctx, width * 0.78, 8, lit);
    ctx.translate(0, 9);
  }
  if (lit) {
    lantern(ctx, -half + 5, 10, 0.74);
    lantern(ctx, half - 3, 10, 0.74);
  }
  ctx.restore();
}

function willow(ctx, x, y, size, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  wash(ctx, 6, 2, 27, 8, '#1c352e92');
  ctx.beginPath();
  ctx.moveTo(-4, 1);
  ctx.quadraticCurveTo(4, -8, -1, -20);
  ctx.quadraticCurveTo(5, -14, 3, -5);
  ctx.lineTo(2, 1);
  ctx.fillStyle = '#394038';
  ctx.fill();
  for (let i = 0; i < 28; i++) {
    const end = (random() - 0.5) * 54,
      long = 4 - random() * 20;
    ctx.beginPath();
    ctx.moveTo(-1, -20);
    ctx.quadraticCurveTo(end * 0.83, -36 + random() * 12, end, long);
    ctx.strokeStyle = ['#223c35a0', '#30493d94', '#6979549e', '#91977382'][i % 4];
    ctx.lineWidth = 0.7 + random() * 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function crates(ctx, x, y, count) {
  for (let i = 0; i < count; i++) {
    const px = x + i * 8;
    const py = y + i % 2 * 2;
    polygon(ctx, [[px, py - 6], [px + 6, py - 8], [px + 10, py - 5], [px + 4, py - 3]], '#a38f67');
    polygon(ctx, [[px, py - 6], [px + 4, py - 3], [px + 4, py + 3], [px, py]], '#71664e');
    polygon(ctx, [[px + 4, py - 3], [px + 10, py - 5], [px + 10, py + 1], [px + 4, py + 3]], '#524d3e');
    stroke(ctx, px + 4, py - 3, px + 10, py + 1, '#bda47a88', 0.65);
  }
}

function canalTown(ctx, random) {
  const halls = [
    [43, 66, 35, 12], [195, 44, 42, 13], [230, 55, 27, 9],
    [466, 55, 52, 12], [498, 64, 27, 9], [870, 103, 49, 15],
    [70, 220, 29, 12], [117, 246, 57, 19, true, true], [159, 229, 32, 12], [178, 255, 40, 10],
    [313, 334, 42, 12], [345, 346, 48, 14, true], [376, 336, 31, 11],
    [522, 324, 55, 17, true, true], [559, 335, 26, 10], [627, 354, 38, 12],
    [730, 338, 62, 16, true], [780, 361, 36, 12], [709, 363, 27, 10],
    [82, 427, 42, 12], [119, 415, 28, 10], [210, 524, 52, 15, true], [373, 518, 41, 11],
    [797, 525, 54, 15, true, true], [842, 530, 40, 12]
  ];
  const trees = [
    [37, 192, 1.08], [212, 191, 0.66], [80, 287, 1.25], [175, 326, 1.1], [254, 371, 0.8],
    [53, 391, 0.83], [162, 447, 0.75], [282, 482, 0.95], [492, 361, 0.87], [589, 342, 0.82],
    [654, 319, 0.83], [760, 293, 0.7], [862, 179, 0.9], [858, 499, 0.95], [567, 510, 0.72]
  ];
  // Small kitchen plots, retaining walls and damp yards on the land between the two routes.
  for (const [x, y, w, h] of [[45, 338, 89, 40], [195, 356, 76, 33], [609, 382, 112, 24], [838, 140, 65, 33], [6, 518, 105, 29]]) {
    polygon(ctx, [[x, y], [x + w, y - 12], [x + w + 19, y + h - 11], [x + 18, y + h]], '#4b654858');
    for (let row = 4; row < h - 1; row += 5) {
      stroke(ctx, x + row * 0.45, y + row, x + w + row * 0.45, y + row - 11, row % 2 ? '#30493662' : '#9b9d6c68', 1.1);
    }
  }
  // Quays sit outside the boat channel and lead to the storehouses.
  for (const [distance, side, count] of [[96, 1, 9], [323, 1, 6], [645, 1, 6], [1010, -1, 7]]) {
    const [x, y, angle] = routePoint(WATER, distance, side * 36);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const length = count * 4;
    for (let i = 0; i < count; i++) {
      const left = -length / 2 + i * 4;
      polygon(ctx, [[left, -4], [left + 3.5, -5], [left + 4, 5], [left, 6]], i % 2 ? '#776b4f' : '#887455');
    }
    stroke(ctx, -length * 0.46, side * -6, length * 0.45, side * -6, '#483f32', 1.4);
    for (const x of [-length * 0.4, length * 0.4]) {
      ellipse(ctx, x, side * -5, 1.8, 2.6, '#373d30');
      ellipse(ctx, x - 0.3, side * -5 - 2, 1.3, 1, '#aa9872');
    }
    ctx.restore();
  }
  for (const [x, y, width, height, lit, raised] of halls) house(ctx, x, y, width, height, { lit, raised });
  for (const [x, y, size] of trees) willow(ctx, x, y, size, random);
  for (const [x, y, count] of [[101, 255, 5], [148, 269, 3], [324, 354, 3], [509, 337, 4], [758, 351, 3], [831, 521, 3]]) crates(ctx, x, y, count);

  for (let s = 22; s < WATER.length - 54; s += 14 + random() * 23) {
    const side = random() < 0.5 ? 1 : -1;
    const [x, y] = routePoint(WATER, s, side * (32 + random() * 5));
    const height = 4 + random() * 8;
    for (let blade = -2; blade <= 2; blade++) {
      const lean = 1.8 + random() * 2;
      ctx.beginPath();
      ctx.moveTo(x + blade, y);
      ctx.quadraticCurveTo(x + blade + lean, y - height * 0.8, x + blade * 1.7 + lean * 2, y - height);
      ctx.strokeStyle = blade % 2 ? '#394c3c9c' : '#92916783';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
}

function cityWall(ctx) {
  const left = 936;
  const passage = (way, width) => {
    const [to, from] = way.points.slice(-2).reverse();
    const middle = from[1] + (to[1] - from[1]) * (left - from[0]) / (to[0] - from[0]);
    return [middle - width / 2 - 4, middle + width / 2 + 4];
  };
  const gates = [passage(WATER, WIDTH.water), passage(ROAD, WIDTH.road)];
  for (const [top, bottom] of [[0, gates[0][0]], [gates[0][1], gates[1][0]], [gates[1][1], MAP_H]]) {
    ctx.fillStyle = '#24343065';
    ctx.fillRect(left - 9, top, 11, bottom - top);
    const crown = ctx.createLinearGradient(left - 4, 0, MAP_W, 0);
    crown.addColorStop(0, '#868673');
    crown.addColorStop(0.13, '#a2a08b');
    crown.addColorStop(0.3, '#656d5e');
    crown.addColorStop(1, '#3c4d44');
    ctx.fillStyle = crown;
    ctx.fillRect(left, top, MAP_W - left, bottom - top);
    for (let y = top + 5; y < bottom - 2; y += 13) {
      ctx.fillStyle = '#6b7665';
      ctx.fillRect(left - 4, y, 5, 7);
      stroke(ctx, left, y + 1, MAP_W, y + 1, '#c9bb9c51', 0.7);
      stroke(ctx, left + (y % 2 === 0 ? 12 : 19), y + 1, left + (y % 2 === 0 ? 12 : 19), y + 12, '#263e346a', 0.6);
    }
  }
  // Gatehouses flank the openings where the paths actually reach the wall.
  for (const [top, bottom] of gates) {
    house(ctx, 951, top - 1, 33, 19, { lit: true, raised: true });
    house(ctx, 953, bottom + 13, 23, 11, { lit: true });
  }
}

function sluices(ctx) {
  for (const gate of GATES) {
    const reach = WIDTH.water / 2 + 6;
    for (const side of [-1, 1]) {
      const [x, y] = routePoint(WATER, gate.at, side * reach);
      ellipse(ctx, x + 2, y + 2.5, 11, 7, '#223932ac');
      ellipse(ctx, x, y, 9, 6, '#9d9c82');
      house(ctx, x, y + 1, 13, 10, { lit: true });
    }
  }
}

function sockets(ctx) {
  const g = canvasGraphics(ctx);
  for (const [x, y] of PLOTS) {
    g.beginFill(0x253a30, 0.48).drawEllipse(x - 24, y - 18, 48, 45).endFill();
    g.beginFill(0x867d63).drawCircle(x, y, 23).endFill();
    g.beginFill(0xafa285).drawCircle(x, y, 21).endFill();
    g.lineStyle(1.5, 0x534c43, 0.8, { dash: [5, 3] }).drawCircle(x, y, 19).lineStyle(0);
    g.beginFill(0xd0bb91).drawCircle(x, y, 16.5).endFill();
    g.lineStyle(0.8, 0xf3ddab, 0.58).drawCircle(x, y, 15).lineStyle(0);
    g.beginFill(0x776b53, 0.48).drawCircle(x, y, 1.4).endFill();
  }
  g.finish();
}

function drizzle(ctx, random) {
  for (let i = 0; i < 178; i++) {
    const x = random() * MAP_W,
      y = random() * MAP_H,
      length = 1.6 + random() * 6.4;
    stroke(ctx, x, y, x - length * 0.68, y + length, i % 4 ? '#d8d4ac21' : '#dbd9b840', 0.55);
  }
}

function paintCanalTown(ctx) {
  const random = seeded(71623);
  terrain(ctx, random);
  canal(ctx, random);
  towpath(ctx, random);
  canalTown(ctx, random);
  cityWall(ctx);
  sluices(ctx);
  drizzle(ctx, random);
  sockets(ctx);
}

/**
 * Paint the map on `canvas`, filling its box at the screen's pixel density, and again whenever the box changes size.
 * Returns a function that stops watching.
 */
export function paintGround(canvas) {
  const paint = () => {
    const box = canvas.getBoundingClientRect(),
      density = Math.min(globalThis.devicePixelRatio || 1, 2),
      width = Math.max(1, Math.round(box.width * density)),
      height = Math.max(1, Math.round(box.height * density));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.setTransform(width / FIELD.width, 0, 0, height / FIELD.height, 0, 0);
    paintCanalTown(context);
  };
  paint();
  const watch = new ResizeObserver(paint);
  watch.observe(canvas);
  return () => watch.disconnect();
}
