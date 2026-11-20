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
import { FONT, INK, PAPER, SAFFRON, SANS, STAGE, createScreenKit } from './kit.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));
let serial = 0;

/** The height a row of each kind takes. */
const HEIGHT = { title: 56, text: 30, note: 24, button: 60, buttons: 54, toggle: 50, slider: 70, choice: 80, gap: 8 };

/**
 * Open a card over the stage (`width` × `STAGE.height`). `rows` are `{ kind, ... }`:
 * - `title`/`text`/`note`: words (`zh`, and `en` under them for a title),
 * - `button`: `{ text, sub, primary, onActivate }`; `buttons`: `{ items: [button, ...] }` side by side,
 * - `toggle`: `{ text, checked, onChange }`, `slider`: `{ text, min, max, step, value, onChange }`,
 * - `choice`: `{ text, options: [[key, words]], selected, onChange }`.
 * Returns `{ close(), repaint(), open, kit }`.
 */
export async function openCard(game, { width: stageWidth, semantics, sound, rows, cardWidth = 520, veil = 0.6, name = '', onClose, top, left }) {
  // A root may not be made while the press that asked for it is still being delivered: leave that delivery first.
  await Promise.resolve();
  const scope = game.engine.createScope(),
    keyboard = game.keyboard,
    id = `card-${++serial}`,
    parts = {};
  // The card is modal: what had the focus behind it lets go first, or it would be focused and inert at once.
  const before = keyboard?.getSnapshot().focusedId;
  keyboard?.focus(undefined);
  const shade = game.stage.addChild(scope.use(new Sprite()));
  shade.graphics.beginFill(0x05080e, veil).drawRect(0, 0, stageWidth, STAGE.height).endFill();
  // The camp editor leaves the surrounding world available to its orbit and placement tools.
  shade.touchEnabled = veil > 0 || Boolean(onClose);
  shade.hitArea = { x: 0, y: 0, width: stageWidth, height: STAGE.height };
  const back = game.stage.addChild(scope.use(new Sprite())),
    holder = game.stage.addChild(scope.use(new DisplayObjectContainer()));

  const inner = cardWidth - 48;
  // Each row is a leaf that, prepared, is an empty container of its height; what goes in it comes after the commit.
  const leaves = rows.map((row, index) => {
    const key = `${id}-row-${index}`,
      height = row.kind === 'text' && row.lines ? HEIGHT.text * row.lines : HEIGHT[row.kind] + (row.kind === 'title' && row.en ? 20 : 0);
    return {
      id: key,
      kind: 'leaf',
      explicitWidth: inner,
      explicitHeight: height,
      content: {
        revision: 0,
        async prepare(context) {
          const content = context.scope.use(new DisplayObjectContainer());
          parts[key] = { content, width: context.width, height, row };
          return { content, measuredHeight: height };
        }
      }
    };
  });
  const total = rows.reduce((sum, row, i) => sum + leaves[i].explicitHeight, 0) + (rows.length - 1) * 10 + 48;
  const x = left ?? Math.round((stageWidth - cardWidth) / 2),
    y = top ?? Math.max(12, Math.round((STAGE.height - total) / 2));
  const root = createUiRoot({
    engine: game.engine,
    scope,
    id,
    viewport: { width: cardWidth, height: total },
    origin: { x, y },
    density: 1,
    input: game.pointer,
    keyboard: keyboard ? { input: keyboard, idPrefix: id } : undefined,
    tree: { id: `${id}-column`, kind: 'column', explicitWidth: cardWidth, padding: 24, gap: 10, children: leaves }
  });
  back.x = x;
  back.y = y;
  back.touchEnabled = true;
  back.hitArea = { x: 0, y: 0, width: cardWidth, height: total };
  const g = back.graphics;
  g.lineStyle(2, INK, 1).beginLinearGradientFill(0, 0, 0, total, stops([0, 0x2b4037, 0.99], [1, INK, 0.98])).drawRoundRect(0, 0, cardWidth, total, 16, 16).endFill();
  g.lineStyle(1.5, SAFFRON, 0.48).drawRoundRect(8, 8, cardWidth - 16, total - 16, 10, 10).lineStyle(0);
  g.beginFill(SAFFRON, 0.9).drawRoundRect(cardWidth / 2 - 28, 7, 56, 3, 1, 1).endFill();
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
  holder.x = 0;
  const focusables = [];
  for (const [index, row] of rows.entries()) {
    const part = parts[`${id}-row-${index}`],
      c = part.content;
    if (row.kind === 'title') {
      await kit.label(c, row.zh, { x: 0, y: 4, size: 30, weight: 700, color: 0xf6e2b0, align: 'center', width: part.width });
      if (row.en) await kit.label(c, row.en, { x: 0, y: 46, size: 15, color: 0xcfc2a0, family: SANS, align: 'center', width: part.width });
    } else if (row.kind === 'text' || row.kind === 'note') {
      await kit.label(c, row.zh, { x: 0, y: 2, size: row.kind === 'note' ? 14 : 19, color: row.kind === 'note' ? 0xc8bfa6 : PAPER, family: row.kind === 'note' ? SANS : FONT, align: row.align ?? 'center', width: part.width });
    } else if (row.kind === 'button') {
      focusables.push(await kit.button({ x: 0, y: 0, width: part.width, height: 58, text: row.text, sub: row.sub, primary: row.primary, onActivate: row.onActivate, container: c, name: row.name ?? row.text }));
    } else if (row.kind === 'buttons') {
      const each = (part.width - (row.items.length - 1) * 12) / row.items.length;
      for (const [i, item] of row.items.entries())
        focusables.push(await kit.button({ x: i * (each + 12), y: 0, width: each, height: 52, text: item.text, primary: item.primary, onActivate: item.onActivate, container: c, small: true, name: item.name ?? item.text }));
    } else if (row.kind === 'toggle') {
      focusables.push(await kit.toggle({ x: 0, y: 2, text: row.text, checked: row.checked, onChange: row.onChange, container: c, width: part.width }));
    } else if (row.kind === 'slider') {
      focusables.push(await kit.slider({ x: 8, y: 52, length: part.width - 16, min: row.min, max: row.max, step: row.step ?? 1, value: row.value, text: row.text, onChange: row.onChange, container: c }));
    } else if (row.kind === 'choice') {
      focusables.push(await kit.choice({ x: 0, y: 34, text: row.text, options: row.options, selected: row.selected, onChange: row.onChange, container: c, width: part.width }));
    }
  }
  semantics.publish();

  let closed = false;
  const card = {
    kit,
    get open() {
      return !closed;
    },
    repaint: () => kit.repaint(),
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
