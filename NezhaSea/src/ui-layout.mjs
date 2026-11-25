// The battle stays 540 × 960. Menus are measured in CSS pixels and projected into Egret's expanded stage.
export const GOLD = 0xf5d695;
export const PAPER = 0xfff2d6;
export const MUTED = 0xc6d8c9;
export const SKIN = {
  panel: 0x122e2b, panelAlpha: 0.97, button: 0x1a3a35, buttonText: PAPER,
  text: PAPER, disabled: 0x465954, accent: 0x99c58f, track: 0x142727, radius: 5, dim: 0.68
};

const FONT = 'system-ui, "Microsoft YaHei", sans-serif';
let measure;
const fonts = (size, bold) => (bold ? '700 ' : '400 ') + size + 'px ' + FONT;
const context = () => measure ??= document.createElement('canvas').getContext('2d');

export function textWidth(words, size, bold = false) {
  const ctx = context();
  ctx.font = fonts(size, bold);
  return ctx.measureText(words).width;
}

export function wrap(words, width, size, bold = false) {
  const rows = [];
  for (const line of String(words).split('\n')) {
    let row = '';
    const tokens = line.match(/[\p{Script=Han}]|[^\s\p{Script=Han}]+|\s+/gu) ?? [];
    for (const token of tokens) {
      if (row && textWidth(row + token, size, bold) > width) {
        rows.push(row.trimEnd());
        row = token.trimStart();
      } else row += token;
    }
    rows.push(row.trimEnd());
  }
  return rows.join('\n');
}

export function layoutFor(game) {
  const safe = game.safe;
  const u = game.screen.width / Math.max(1, game.canvas.getBoundingClientRect().width);
  const width = safe.width / u, height = safe.height / u;
  const units = (value) => typeof value === 'number' ? value * u : value;
  function map(part) {
    const made = { ...part };
    for (const key of ['x', 'y', 'width', 'height', 'size', 'padding', 'gap']) {
      if (part[key] !== undefined) made[key] = units(part[key]);
    }
    if (part.children) made.children = part.children.map(map);
    return made;
  }
  function show(label, root, { modal = false, state, bind, built, skin = SKIN } = {}) {
    return game.show({ label, root: map(root), modal, area: 'safe', skin: {
      ...skin, radius: units(skin.radius ?? SKIN.radius)
    } }, { state, bind, built });
  }
  return { u, width, height, safe, show };
}

export const panel = (name, x, y, width, height, extras) => ({ type: 'panel', name, x, y, width, height, ...extras });
export const label = (name, x, y, width, height, text, size, extras) => ({ type: 'text', name, x, y, width, height, text, size, ...extras });
export const button = (name, x, y, width, height, text, extras) => ({ type: 'button', name, x, y, width, height, text, size: 15, ...extras });

export function paper(children, x, y, width, height) {
  return panel(undefined, x, y, width, height, {
    card: true, children: [
      panel(undefined, 0, 0, width, height, { color: 0xbd9868 }),
      panel(undefined, 1, 1, width - 2, height - 2, { color: 0x0b2021, alpha: 1 }),
      panel(undefined, 4, 4, width - 8, height - 8, { color: 0x15332f }),
      ...children
    ]
  });
}

export const primary = { color: 0x9e4432, textColor: 0xffefd2 };
