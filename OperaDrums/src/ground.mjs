// 戏台：守旧（台后的大幕）、出将入相两扇门和门帘、台毯，由页面在一块二维画布上画一次，放在引擎透明画布的下面；
// 只在戏台框改变大小时重画。门楣上的「出将」「入相」是戏台的匾，属于画，不随语言变。
// The stage: the backdrop, the two doors with their curtains, and the carpet, painted once by the page on a 2D canvas
// under the engine's clear one, and again only when the stage's box changes size. The plaques over the doors ("enter
// the general", "exit the minister") are part of the picture and stay as they are in either language.

const W = 960,
  H = 540;

/** The meander (huiwen) border along a band from `x0` to `x1` at `y`, `size` high. */
function meander(context, x0, x1, y, size) {
  context.beginPath();
  for (let x = x0; x < x1; x += size * 1.5) {
    context.moveTo(x, y + size);
    context.lineTo(x, y);
    context.lineTo(x + size, y);
    context.lineTo(x + size, y + size * 0.66);
    context.lineTo(x + size * 0.33, y + size * 0.66);
    context.lineTo(x + size * 0.33, y + size * 0.33);
  }
  context.stroke();
}

function door(context, x, label) {
  const top = 300,
    width = 124,
    height = 172;
  // The frame, the curtain and its embroidered roundel.
  context.fillStyle = '#2b1a12';
  context.fillRect(x - 8, top - 8, width + 16, height + 8);
  const curtain = context.createLinearGradient(x, top, x + width, top);
  curtain.addColorStop(0, '#7d1712');
  curtain.addColorStop(0.5, '#a8231b');
  curtain.addColorStop(1, '#7d1712');
  context.fillStyle = curtain;
  context.fillRect(x, top, width, height);
  context.strokeStyle = 'rgba(217,164,65,0.55)';
  context.lineWidth = 1;
  for (let k = 1; k < 6; k++) {
    context.beginPath();
    context.moveTo(x + (width * k) / 6, top);
    context.lineTo(x + (width * k) / 6, top + height);
    context.stroke();
  }
  context.fillStyle = 'rgba(217,164,65,0.9)';
  context.beginPath();
  context.arc(x + width / 2, top + 70, 26, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#a8231b';
  context.beginPath();
  context.arc(x + width / 2, top + 70, 18, 0, Math.PI * 2);
  context.fill();
  // The plaque over the door.
  context.fillStyle = '#1d1412';
  context.fillRect(x + 12, top - 46, width - 24, 34);
  context.strokeStyle = '#d9a441';
  context.lineWidth = 2;
  context.strokeRect(x + 14, top - 44, width - 28, 30);
  context.fillStyle = '#d9a441';
  context.font = '600 22px "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x + width / 2, top - 28);
}

/** The whole stage, in stage units. */
export function drawStage(context) {
  // The backdrop: deep red cloth, darker at the edges.
  const cloth = context.createRadialGradient(W / 2, 330, 60, W / 2, 330, 620);
  cloth.addColorStop(0, '#8e1d17');
  cloth.addColorStop(0.6, '#5f120f');
  cloth.addColorStop(1, '#320908');
  context.fillStyle = cloth;
  context.fillRect(0, 0, W, H);
  // Folds of the cloth.
  for (let x = 0; x < W; x += 32) {
    const fold = context.createLinearGradient(x, 0, x + 32, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0.12)');
    fold.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    fold.addColorStop(1, 'rgba(0,0,0,0.12)');
    context.fillStyle = fold;
    context.fillRect(x, 0, 32, 470);
  }
  // Gold borders along the top and above the carpet.
  context.strokeStyle = 'rgba(217,164,65,0.75)';
  context.lineWidth = 2;
  meander(context, 6, W, 6, 12);
  meander(context, 6, W, 276, 10);
  // The roundel between the doors: a sun of petals.
  context.save();
  context.translate(W / 2, 384);
  context.fillStyle = 'rgba(217,164,65,0.22)';
  for (let k = 0; k < 16; k++) {
    context.rotate(Math.PI / 8);
    context.beginPath();
    context.ellipse(0, -44, 9, 26, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = 'rgba(217,164,65,0.55)';
  context.beginPath();
  context.arc(0, 0, 22, 0, Math.PI * 2);
  context.fill();
  context.restore();
  door(context, 236, '出将');
  door(context, 600, '入相');
  // The carpet.
  context.fillStyle = '#7a1914';
  context.fillRect(0, 470, W, 70);
  context.fillStyle = 'rgba(217,164,65,0.8)';
  context.fillRect(0, 470, W, 3);
  context.fillRect(0, 482, W, 1.5);
  context.fillStyle = 'rgba(0,0,0,0.25)';
  context.fillRect(0, 473, W, 9);
}

/** Paint the stage on `canvas` to fill its box, again whenever the box changes size. Returns a function that stops. */
export function paintStage(canvas) {
  const paint = () => {
    const box = canvas.getBoundingClientRect(),
      density = Math.min(globalThis.devicePixelRatio || 1, 2),
      width = Math.max(1, Math.round(box.width * density)),
      height = Math.max(1, Math.round(box.height * density));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.setTransform(width / W, 0, 0, height / H, 0, 0);
    drawStage(context);
  };
  paint();
  const watch = new ResizeObserver(paint);
  watch.observe(canvas);
  return () => watch.disconnect();
}
