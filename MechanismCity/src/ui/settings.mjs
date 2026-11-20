// 设置卡：由引擎的托管界面（createUiRoot）排版成一列——标题、音效开关、音乐开关、关闭按钮。
// The settings card, laid out by the engine's managed UI (`createUiRoot`) as one column: a heading, a switch
// for the sound effects, one for the music, and a button that closes it. The root prepares each leaf, then
// commits the column in one step; the switches are the engine's toggle controls on the leaves it drew.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createActionControl, createControlKeys, createToggleControl, createUiRoot } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { GOLD, INK } from '../art/shapes.mjs';
import { FONT, SANS, paintPanel } from './kit.mjs';

const WIDTH = 360;
const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/**
 * Open the card over whatever is on the stage. `settings` holds `effects` and `music`; `onChange` is told of
 * each switch; `onClose` when the card is gone. Returns a handle whose `close()` takes it away.
 */
export async function openSettings(game, { semantics, sound, settings, onChange, onClose }) {
  const scope = game.engine.createScope(),
    keyboard = game.keyboard,
    parts = {},
    owned = [];
  // A veil over the screen behind the card: presses on it close the card.
  const veil = game.stage.addChild(scope.use(new Sprite()));
  veil.graphics.beginFill(0x05080c, 0.62).drawRect(0, 0, 960, 540).endFill();
  veil.touchEnabled = true;
  veil.hitArea = { x: 0, y: 0, width: 960, height: 540 };

  /**
   * A leaf of the column, made in the leaf's own scope when the root prepares: a sprite that can be pressed, and
   * its words, a label of that scope, which ends with it.
   */
  function leaf(id, height, text, { size = 20, family = FONT, weight = 400, centred = false, colour = 0xf0e4c8 } = {}) {
    return {
      revision: 0,
      async prepare(context) {
        const content = context.scope.use(new DisplayObjectContainer()),
          sprite = content.addChild(context.scope.use(new Sprite()));
        sprite.touchEnabled = true;
        sprite.hitArea = { x: 0, y: 0, width: context.width, height };
        const label = await game.createLabel({ text, fontSize: size, fontFamily: family, fontWeight: weight, color: colour, locale: 'zh', scope: context.scope });
        await label.ready;
        content.addChild(label.display);
        label.display.x = centred ? (context.width - label.display.width) / 2 : 14;
        label.display.y = (height - label.display.height) / 2;
        parts[id] = { sprite, width: context.width, height };
        return { content, measuredHeight: height };
      }
    };
  }
  const root = createUiRoot({
    engine: game.engine,
    scope,
    id: 'settings',
    viewport: { width: WIDTH, height: 300 },
    origin: { x: (960 - WIDTH) / 2, y: 110 },
    density: 1,
    input: game.pointer,
    keyboard: keyboard ? { input: keyboard, idPrefix: 'settings' } : undefined,
    tree: {
      id: 'card',
      kind: 'column',
      explicitWidth: WIDTH,
      padding: 20,
      gap: 12,
      children: [
        { id: 'heading', kind: 'leaf', explicitWidth: WIDTH - 40, explicitHeight: 50, content: leaf('heading', 50, '设 置', { size: 28, weight: 700, centred: true, colour: 0xf6e2b0 }) },
        { id: 'effects', kind: 'leaf', explicitWidth: WIDTH - 40, explicitHeight: 52, content: leaf('effects', 52, '音效 · Sound effects') },
        { id: 'music', kind: 'leaf', explicitWidth: WIDTH - 40, explicitHeight: 52, content: leaf('music', 52, '音乐 · Music') },
        { id: 'close', kind: 'leaf', explicitWidth: WIDTH - 40, explicitHeight: 50, content: leaf('close', 50, '关闭 · Close', { size: 20, weight: 600, centred: true, family: SANS }) }
      ]
    }
  });
  // The card's paper, drawn behind the column on the stage.
  const card = game.stage.addChildAt(scope.use(new Sprite()), game.stage.getChildIndex(veil) + 1);
  card.x = (960 - WIDTH) / 2;
  card.y = 110;
  paintPanel(card.graphics, WIDTH, 300);
  card.alpha = 0;
  animate(game.engine, scope, card).to({ alpha: 1 }, 0.2, 'quadOut').start();

  const ready = await root.prepare();
  const result = root.commit(ready);
  if (result.postCommitErrors.length) console.warn('settings', result.postCommitErrors);

  const focusId = () => keyboard?.getSnapshot().focusedId,
    shown = () => keyboard?.getSnapshot().focusVisible;
  /** A switch on a leaf: its state is the engine's toggle control; the knob and track are painted here. */
  function wireSwitch(id, key, name) {
    const part = parts[id],
      knob = part.sprite;
    const control = createToggleControl({
      input: game.pointer,
      target: knob,
      checked: settings[key],
      onChange: (on) => {
        settings[key] = on;
        sound?.play('tap');
        onChange?.(key, on);
        paint();
      },
      onPressChange: () => paint()
    });
    owned.push(control);
    const stopId = 'settings-' + id,
      registration = keyboard?.registerTarget({ id: stopId, target: knob }),
      keys = keyboard ? createControlKeys({ keyboard, target: knob, kind: 'toggle', control }) : null;
    if (keys) owned.push(keys);
    if (registration) owned.push(registration);
    function paint() {
      const g = knob.graphics,
        on = control.checked,
        x = part.width - 96,
        focused = shown() && focusId() === stopId;
      g.clear();
      g.beginFill(0xffffff, focused ? 0.08 : 0.03).drawRoundRect(0, 0, part.width, part.height, 10, 10).endFill();
      if (focused) g.lineStyle(2, 0xffe08a, 1).drawRoundRect(1, 1, part.width - 2, part.height - 2, 10, 10).lineStyle(0);
      g.lineStyle(2, INK, 1).beginFill(on ? 0x3f7a6e : 0x3a3530, 1).drawRoundRect(x, 10, 80, 32, 16, 16).endFill();
      g.beginRadialGradientFill(x + (on ? 58 : 18), 22, 18, stops([0, on ? 0xfff0c0 : 0xb8b0a0], [1, on ? GOLD : 0x6a6458])).drawCircle(x + (on ? 62 : 18), 26, 13).endFill().lineStyle(0);
    }
    paint();
    owned.push(
      semantics.add({
        id: stopId,
        role: 'switch',
        parent: 'settings-card',
        onActivate: () => control.toggle(),
        onFocus: () => keyboard?.focus(stopId, { visible: true }),
        describe: () => ({ name, bounds: semanticBoundsOf(knob), checked: control.checked, focused: focusId() === stopId })
      })
    );
    return paint;
  }
  owned.push(semantics.add({ id: 'settings-card', role: 'dialog', describe: () => ({ name: '设置', modal: true, bounds: semanticBoundsOf(card) }) }));
  const painters = [wireSwitch('effects', 'effects', '音效'), wireSwitch('music', 'music', '音乐')];

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    for (const thing of owned.reverse())
      if (typeof thing.remove === 'function') thing.remove();
      else thing.dispose();
    root.dispose();
    scope.dispose();
    onClose?.();
  }
  // The close button: an action on its leaf, and Escape.
  const closePart = parts.close;
  const closeAction = createActionControl({ input: game.pointer, target: closePart.sprite, onActivate: close, onPressChange: () => paintClose() });
  owned.push(closeAction);
  const closeRegistration = keyboard?.registerTarget({ id: 'settings-close', target: closePart.sprite });
  const closeKeys = keyboard ? createControlKeys({ keyboard, target: closePart.sprite, kind: 'action', control: closeAction }) : null;
  if (closeKeys) owned.push(closeKeys);
  if (closeRegistration) owned.push(closeRegistration);
  function paintClose() {
    const g = closePart.sprite.graphics,
      focused = shown() && focusId() === 'settings-close';
    g.clear();
    g.lineStyle(2, INK, 1).beginLinearGradientFill(0, 0, 0, closePart.height, stops([0, closeAction.pressed ? 0x7a1e18 : 0xc44a3a], [1, closeAction.pressed ? 0xc44a3a : 0x7a1e18])).drawRoundRect(0, 0, closePart.width, closePart.height, 10, 10).endFill();
    g.lineStyle(focused ? 3 : 1.5, focused ? 0xffe08a : GOLD, 0.9).drawRoundRect(4, 4, closePart.width - 8, closePart.height - 8, 7, 7).lineStyle(0);
  }
  paintClose();
  painters.push(paintClose);
  owned.push(
    semantics.add({
      id: 'settings-close',
      role: 'button',
      parent: 'settings-card',
      onActivate: close,
      onFocus: () => keyboard?.focus('settings-close', { visible: true }),
      describe: () => ({ name: '关闭设置', bounds: semanticBoundsOf(closePart.sprite), focused: focusId() === 'settings-close' })
    })
  );
  const stopVeil = veil.on(game.pointer.events.tap, close);
  owned.push({ dispose: stopVeil });
  keyboard?.focus('settings-effects', { visible: false });
  return { close, repaint: () => painters.forEach((paint) => paint()), get open() { return !closed; } };
}
