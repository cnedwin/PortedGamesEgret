// 卡片：设置、暂停、驿站、结局用的对话卡，由引擎的托管界面（createUiRoot）排成一列。根节点先让每一行在它自己的
// 作用域里准备好（量出高度），再一步提交整列；提交之后，每一行的控件（按钮、开关、滑条、单选）由界面零件画在
// 这一行的容器里，状态归引擎的控件管。卡片背后有一层暗幕。
//
// Cards: the dialogs for the settings, the pause, the stations and the ending, laid out by the engine's managed UI
// (`createUiRoot`) as one column. The root has each row prepared in its own scope (measured), then commits the column
// in one step; after the commit each row's control — a button, a switch, a slider, a choice — is drawn by the kit in
// that row's container, its state held by the engine's controls. A veil lies behind the card.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createUiRoot } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { FONT, INK, PAPER, SAFFRON, SANS, CONTROL, controlScale, createScreenKit } from './kit.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));
let serial = 0;

/** The height a row of each kind takes. */
const HEIGHT = { title: 42, text: 30, note: 24, button: CONTROL, buttons: CONTROL, toggle: CONTROL, slider: CONTROL, choice: CONTROL, gap: 8 };
const PAD = 16, INNER_PAD = 20, GAP = 6;
// A stable leaf width lets the engine move/reflow the owned root without retiring its leaf contents.
// Only the card contents are scaled within these slots; the backdrop and the modal veil use the real stage coordinates.
const SLOT_WIDTH = 1040;

const rowHeights = (rows) => rows.map((row) => row.kind === 'text' && row.lines ? HEIGHT.text * row.lines :
  HEIGHT[row.kind] + (row.kind === 'title' && row.en ? 20 : row.kind === 'choice' && row.text && row.options.length > 3 ? 28 : 0));

/** Card geometry in stage units, derived from the current engine plan. */
export function cardGeometry(screen, { rows, cardWidth = 520, top, left }) {
  const heights = rowHeights(rows),
    rowTotal = heights.reduce((sum, height) => sum + height, 0),
    gapCount = rows.length - 1,
    normalTotal = rowTotal + gapCount * GAP + PAD * 2,
    { safe, width, height, scale } = screen,
    f = controlScale(screen),
    margin = 10 / scale,
    // Reduce unused vertical space first, rather than scaling an otherwise 45 CSS-pixel control below 44.
    // Browser chrome on a folded phone can leave only 325 CSS pixels of landscape height.
    maxReduction = (PAD - 10) * 2 + (GAP - 3) * gapCount,
    squeeze = Math.max(0, Math.min(1, (normalTotal - (safe.height - 2 * margin) / f) / maxReduction)),
    pad = PAD - 6 * squeeze,
    gap = GAP - 3 * squeeze,
    total = rowTotal + gapCount * gap + pad * 2,
    sx = Math.min(f, Math.max(1, safe.width - 2 * margin) / cardWidth),
    sy = Math.min(f, Math.max(1, safe.height - 2 * margin) / total),
    w = cardWidth * sx, h = total * sy;
  return {
    x: Math.max(safe.x + margin, Math.min(safe.x + safe.width - margin - w, left === undefined ? (width - w) / 2 : safe.x + left)),
    y: Math.max(safe.y + margin, Math.min(safe.y + safe.height - margin - h, top === undefined ? (height - h) / 2 : safe.y + top)),
    w, h, sx, sy, pad, gap
  };
}

/**
 * Open a card over the current engine screen. `rows` are `{ kind, ... }`:
 * - `title`/`text`/`note`: words (`zh`, and `en` under them for a title),
 * - `button`: `{ text, sub, primary, onActivate }`; `buttons`: `{ items: [button, ...] }` side by side,
 * - `toggle`: `{ text, checked, onChange }`, `slider`: `{ text, min, max, step, value, onChange }`,
 * - `choice`: `{ text, options: [[key, words]], selected, onChange }`.
 * Returns `{ close(), repaint(), open, kit }`.
 */
export async function openCard(game, { semantics, sound, rows, cardWidth = 520, veil = 0.6, name = '', onClose, top, left }) {
  // A root may be made while the press that asked for it is being delivered (ENGINE-NOTES.md, item 20).
  const scope = game.engine.createScope(),
    keyboard = game.keyboard,
    id = `card-${++serial}`,
    parts = {};
  // The card is modal: what had the focus behind it lets go, and the focus moves into the card once it is laid out
  // (ENGINE-NOTES.md, item 18).
  const before = keyboard?.getSnapshot().focusedId;
  keyboard?.focus(undefined);
  const shade = game.stage.addChild(scope.use(new Sprite()));
  // The camp editor leaves the surrounding world available to its orbit and placement tools.
  shade.touchEnabled = veil > 0 || Boolean(onClose);
  const back = game.stage.addChild(scope.use(new Sprite()));

  const inner = cardWidth - INNER_PAD * 2;
  const heights = rowHeights(rows);
  // Each row is a leaf that, prepared, is an empty container of its height; what goes in it comes after the commit.
  const leaves = rows.map((row, index) => {
    const key = `${id}-row-${index}`,
      height = heights[index];
    return {
      id: key,
      kind: 'leaf',
      explicitWidth: SLOT_WIDTH,
      explicitHeight: height,
      content: {
        revision: 0,
        async prepare(context) {
          const content = context.scope.use(new DisplayObjectContainer());
          parts[key] = { content, scope: context.scope, width: inner, height, row };
          return { content, measuredHeight: height };
        }
      }
    };
  });
  const geometry = (screen) => cardGeometry(screen, { rows, cardWidth, top, left });
  const origin = ({ x, y, w }) => ({ x: x - (SLOT_WIDTH - w) / 2, y });
  function tree({ sy, pad, gap }) {
    const spacer = (key) => ({ id: `${id}-${key}`, kind: 'leaf', explicitWidth: SLOT_WIDTH, explicitHeight: pad * sy });
    return { id: `${id}-column`, kind: 'column', explicitWidth: SLOT_WIDTH, children: [
      spacer('top'),
      ...leaves.map((leaf, i) => ({ ...leaf, explicitHeight: (heights[i] + (i === rows.length - 1 ? 0 : gap)) * sy })),
      spacer('bottom')
    ] };
  }
  let placed = geometry(game.screen);
  const root = createUiRoot({
    engine: game.engine,
    scope,
    id,
    viewport: { width: SLOT_WIDTH, height: placed.h },
    origin: origin(placed),
    density: 1,
    input: game.pointer,
    keyboard: keyboard ? { input: keyboard, idPrefix: id } : undefined,
    tree: tree(placed)
  });
  back.touchEnabled = true;
  function paintShade({ width, height }) {
    shade.graphics.clear();
    shade.graphics.beginFill(0x05080e, veil).drawRect(0, 0, width, height).endFill();
    shade.hitArea = { x: 0, y: 0, width, height };
  }
  function paintBack({ x, y, w, h, sx, sy }) {
    back.x = x;
    back.y = y;
    back.hitArea = { x: 0, y: 0, width: w, height: h };
    const g = back.graphics;
    g.clear();
    g.lineStyle(2, INK, 1).beginLinearGradientFill(0, 0, 0, h, stops([0, 0x2b4037, 0.99], [1, INK, 0.98])).drawRoundRect(0, 0, w, h, 16, 16).endFill();
    g.lineStyle(1.5, SAFFRON, 0.48).drawRoundRect(8, 8, w - 16, h - 16, 10, 10).lineStyle(0);
    g.beginFill(SAFFRON, 0.9).drawRoundRect(w / 2 - 28, 7, 56, 3, 1, 1).endFill();
    for (const { content } of Object.values(parts)) {
      content.x = (SLOT_WIDTH - w) / 2 + INNER_PAD * sx;
      content.scaleX = sx;
      content.scaleY = sy;
    }
  }
  paintShade(game.screen);
  paintBack(placed);
  back.alpha = 0;
  animate(game.engine, scope, back).to({ alpha: 1 }, 0.2, 'quadOut').start();

  const ready = await root.prepare();
  const result = root.commit(ready);
  if (result.postCommitErrors.length) console.warn('card', result.postCommitErrors);

  // The rows' controls, drawn by the kit into each committed row.
  // The dialog's node first: every control of the card is its child, so the modal dialog does not make them inert.
  const dialog = semantics.add({ id, role: 'dialog', describe: () => ({ name, modal: true, bounds: semanticBoundsOf(back) }) });
  const kit = createScreenKit(game, scope, { semantics, sound, prefix: id, semanticParent: id });
  kit.own(dialog);
  const focusables = [], rowKits = [];
  for (const [index, row] of rows.entries()) {
    const part = parts[`${id}-row-${index}`],
      c = part.content,
      rowKit = createScreenKit(game, part.scope, { semantics, sound, prefix: id, semanticParent: id });
    // Managed leaf commits validate the whole content subtree on resize. Give every row's controls and labels
    // the leaf's own public scope, not the card's outer scope, so the live objects can be retained.
    rowKits.push(rowKit);
    kit.own({ dispose: () => rowKit.dispose() });
    if (row.kind === 'title') {
      await rowKit.label(c, row.zh, { x: 0, y: 0, size: 30, weight: 700, color: 0xf6e2b0, align: 'center', width: part.width });
      if (row.en) await rowKit.label(c, row.en, { x: 0, y: 40, size: 15, color: 0xcfc2a0, family: SANS, align: 'center', width: part.width });
    } else if (row.kind === 'text' || row.kind === 'note') {
      await rowKit.label(c, row.zh, { x: 0, y: 2, size: row.kind === 'note' ? 14 : 19, color: row.kind === 'note' ? 0xc8bfa6 : PAPER, family: row.kind === 'note' ? SANS : FONT, align: row.align ?? 'center', width: part.width });
    } else if (row.kind === 'button') {
      focusables.push(await rowKit.button({ x: 0, y: 0, width: part.width, text: row.text, sub: row.sub, primary: row.primary, onActivate: row.onActivate, container: c, name: row.name ?? row.text }));
    } else if (row.kind === 'buttons') {
      const each = (part.width - (row.items.length - 1) * 12) / row.items.length;
      for (const [i, item] of row.items.entries())
        focusables.push(await rowKit.button({ x: i * (each + 12), y: 0, width: each, text: item.text, primary: item.primary, onActivate: item.onActivate, container: c, small: true, name: item.name ?? item.text }));
    } else if (row.kind === 'toggle') {
      focusables.push(await rowKit.toggle({ x: 0, y: 0, text: row.text, checked: row.checked, onChange: row.onChange, container: c, width: part.width }));
    } else if (row.kind === 'slider') {
      focusables.push(await rowKit.slider({ x: 154, y: CONTROL / 2, length: part.width - 166, min: row.min, max: row.max, step: row.step ?? 1, value: row.value, text: row.text, onChange: row.onChange, container: c, inline: true }));
    } else if (row.kind === 'choice') {
      const inline = Boolean(row.text) && row.options.length <= 3;
      focusables.push(await rowKit.choice({ x: inline ? 180 : 0, y: row.text && !inline ? 28 : 0, text: row.text, options: row.options, selected: row.selected, onChange: row.onChange, container: c, width: part.width - (inline ? 180 : 0), inline }));
    }
  }
  paintBack(placed);
  semantics.publish();

  let closed = false, arranging = false, pending;
  // The engine reuses the stable leaf binding (same source, width and density) on a geometry-only commit.
  // Coalesce changes while its asynchronous preparation runs; focus and selection stay on the existing controls.
  async function place(screen) {
    paintShade(screen);
    pending = geometry(screen);
    if (arranging || closed) return;
    arranging = true;
    try {
      while (pending && !closed) {
        const next = pending;
        pending = undefined;
        if (['x', 'y', 'w', 'h', 'sx', 'sy', 'pad', 'gap'].every((key) => Math.abs(next[key] - placed[key]) < 0.001)) continue;
        root.setOrigin(origin(next));
        root.setViewport({ width: SLOT_WIDTH, height: next.h }, 1);
        root.setTree(tree(next));
        const prepared = await root.prepare();
        if (closed) break;
        const result = root.commit(prepared);
        if (result.postCommitErrors.length) console.warn('card', result.postCommitErrors);
        placed = next;
        paintBack(placed);
        semantics.publish();
      }
    } catch (cause) {
      if (!closed) console.error('card placement', cause);
    } finally {
      arranging = false;
      if (pending && !closed) void place(game.screen);
    }
  }
  kit.onScreenChange((screen) => void place(screen));
  const card = {
    kit,
    get open() {
      return !closed;
    },
    repaint: () => rowKits.forEach((rowKit) => rowKit.repaint()),
    /** What the pad's A does: the card's main button. */
    confirm() {
      const main = rows.find((row) => row.kind === 'button' && row.primary) ?? rows.find((row) => row.kind === 'buttons')?.items.find((item) => item.primary);
      if (main) void main.onActivate?.();
    },
    focusFirst() {
      const first = focusables[0];
      if (first?.focus) first.focus(false);
      else if (first?.id) keyboard?.focus(first.id, { visible: false });
    },
    close() {
      if (closed) return;
      closed = true;
      kit.dispose();
      root.dispose();
      scope.dispose();
      // The focus goes back to where it was, if that is still there.
      try {
        if (before) keyboard?.focus(before, { visible: false });
      } catch {
        /* gone with its screen */
      }
      onClose?.();
    }
  };
  // A press on the veil closes a card that can be closed that way.
  if (onClose) kit.own({ dispose: shade.on(game.pointer.events.tap, () => card.close()) });
  card.focusFirst();
  return card;
}
