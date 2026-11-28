// The visible mobile controls use engine contacts and control state; the scene's
// separate camera drag is handled by input.mjs through the overlay passthrough.
import { Sprite, DisplayObjectContainer } from '@egret/engine';
import { createActionControl, createMovementControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { RUN } from '../data.mjs';

const ACTIONS = ['jump', 'slam', 'roll', 'pause'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
/** Fixed-circle geometry is local to its display; its visual radius is also the input radius. */
function stickGeometry(box) {
  const radius = box ? Math.min(box.width, box.height) * 0.31 : 32;
  return {
    radius, deadZone: radius * 0.12,
    center: box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : { x: 0, y: 0 },
  };
}

/**
 * Bind native fixed-centre movement and pointer activation policies to game input.
 * Only the gameplay-specific cancel-vs-release of a charged action needs its own terminal bookkeeping.
 */
export function bindNativeTouchControls({ pointer, stick, actions, onMovement, onAction, scale = 1 }, input) {
  const disposables = [], held = new Map(), controls = new Map();
  let active = false, tapScale = scale, paintedValue, paintedPressed;
  const own = cleanup => (disposables.push(cleanup), cleanup);
  function movePaint(value, pressed) {
    input.touchMovement(value.x, value.y);
    if (value.x === paintedValue?.x && value.y === paintedValue?.y && pressed === paintedPressed) return;
    paintedValue = value; paintedPressed = pressed;
    onMovement?.(value, pressed);
  }
  const movement = createMovementControl({
    input: pointer, target: stick, ...stickGeometry(stick.hitArea),
    onMovement(value) { movePaint(value, movement.active); },
  });
  own(() => movement.dispose());
  // A down exactly at the centre and its release do not change the direction;
  // repaint the held ring from the engine's active state, without a second contact owner.
  const syncStick = () => movePaint(movement.value, movement.active);
  own(stick.on(pointer.events.begin, syncStick));

  function makeAction(key) {
    return createActionControl({
      input: pointer, target: actions[key],
      ...(key === 'pause' ? { activation: 'tap', tapTolerance: 12 / tapScale } : {}),
      onPressChange(pressed) {
        if (key !== 'pause') input.touchAction(key, pressed);
        onAction?.(key, pressed);
      },
      onActivate() {
        if (key === 'pause' && active) input.onCommand?.('menu');
      },
    });
  }
  for (const key of ACTIONS) {
    const target = actions[key];
    // Preserve the game's primary-mouse policy. Only held gameplay actions
    // need a session to distinguish a cancelled jump charge from a release.
    own(target.on(pointer.events.begin, event => {
      if (!active || held.has(key)) return;
      const contact = event.payload;
      if (contact.session.pointerType === 'mouse' && !(contact.buttons & 1)) {
        event.stopImmediatePropagation();
        return;
      }
      if (key !== 'pause') held.set(key, contact.session);
    }));
    controls.set(key, makeAction(key));
    own(() => controls.get(key).dispose());
  }
  own(pointer.observe(notification => {
    if (notification.kind !== 'cancel' && notification.kind !== 'end') return;
    syncStick();
    const session = notification.contact.session;
    for (const [key, owner] of held) {
      if (owner !== session) continue;
      held.delete(key);
      if (notification.kind === 'cancel' || notification.delivered === false) input.cancelTouchAction(key);
    }
  }));
  function enable(next) {
    active = next;
    movement.setEnabled(next);
    stick.touchEnabled = next;
    for (const [key, control] of controls) {
      control.setEnabled(next);
      actions[key].touchEnabled = next;
    }
    if (!next) {
      held.clear();
      syncStick();
    }
  }
  const reset = () => {
    if (!active) return;
    enable(false); enable(true); // A resumed control requires an entirely new down.
  };
  own(input.bindTouchReset(reset));
  enable(false);
  return {
    setActive(next) { next = !!next; if (active !== next) enable(next); },
    layout(nextScale = tapScale) {
      movement.setGeometry(stickGeometry(stick.hitArea));
      syncStick();
      // This engine's tap tolerance uses stage units. The circle art uses CSS
      // equivalents, so recreate only the stateless Pause action if the scale
      // changes; its old held contact is retired, and 12 CSS pixels stay 12.
      if (nextScale !== tapScale) {
        controls.get('pause').dispose();
        tapScale = nextScale;
        const pause = makeAction('pause'); pause.setEnabled(active);
        controls.set('pause', pause);
      }
    },
    // A semantic button action uses the same native scripted activation state.
    activate(key) {
      const control = controls.get(key);
      if (!active || !control || control.pressed) return;
      control.press(); control.release();
    },
    dispose() {
      enable(false);
      for (const cleanup of disposables.reverse()) cleanup();
    },
  };
}

/** Mobile control art in the native overlay; dimensions and offsets stay in CSS-pixel equivalents. */
export async function createTouchUi({ game, root, semantics, t, onChanged = () => {}, scope = game.scope }, input) {
  const pointer = game.pointer, own = node => scope.use(node);
  const stickHolder = root.addChild(own(new DisplayObjectContainer()));
  const stick = stickHolder.addChild(own(new Sprite()));
  const thumb = stickHolder.addChild(own(new Sprite()));
  const actions = {}, holders = {}, labels = {}, semanticHandles = [];
  let active = false, current = { x: 0, y: 0 }, stickPressed = false;
  const pressed = Object.fromEntries(ACTIONS.map(key=>[key,false]));
  root.visible = false;
  const makeLabel = async (key, holder) => {
    const label = await game.createLabel({
      scope, text: t(key), fontSize: 14, fontWeight: 700, color: 0xfff6e4,
      fontFamily: 'Arial',
    });
    holder.addChild(label.display);
    await label.ready;
    return label;
  };
  for (const key of ACTIONS) {
    const holder = root.addChild(own(new DisplayObjectContainer()));
    holders[key] = holder;
    actions[key] = holder.addChild(own(new Sprite()));
    labels[key] = await makeLabel(key,holder);
  }
  function paintStick() {
    const box = stick.hitArea;
    if (!box) return;
    const w = box.width, radius = w * 0.31;
    stick.graphics.clear().lineStyle(2, stickPressed ? 0xffe29d : 0xd7b5f0, 0.87)
      .beginFill(stickPressed ? 0x53376f : 0x211134, 0.74).drawCircle(w/2,w/2,w/2-2).endFill();
    thumb.graphics.clear().lineStyle(2,0xe8c5ff,1).beginFill(0xc59afa)
      .drawCircle(0,0,w*.195).endFill();
    thumb.x = w/2 + current.x * radius; thumb.y = w/2 + current.y * radius;
  }
  function paintAction(key) {
    const face = actions[key], box = face.hitArea;
    if (!box) return;
    const g = face.graphics.clear().lineStyle(2,pressed[key]?0xffe29d:0xd7b5f0,0.87)
      .beginFill(pressed[key]?0x53376f:0x211134,0.77);
    if (key === 'pause') g.drawRoundRect(1,1,box.width-2,box.height-2,16,16);
    else g.drawCircle(box.width/2,box.height/2,box.width/2-2);
    g.endFill();
    const label = labels[key].display;
    label.x = (box.width - label.width)/2; label.y = (box.height - label.height)/2;
  }
  const native = bindNativeTouchControls({
    pointer, stick, actions, scale: game.screen.scale,
    onMovement(value, held) { current = value; stickPressed = held; paintStick(); },
    onAction(key, held) { pressed[key] = held; paintAction(key); },
  }, input);

  if (semantics) {
    semanticHandles.push(semantics.add({
      id: 'touch-controls', role: 'group',
      describe: () => ({ hidden: !active, bounds: { x: 0, y: 0, width: game.screen.width, height: game.screen.height } }),
    }));
    semanticHandles.push(semantics.add({
      id: 'touch-move', parent: 'touch-controls', role: 'group',
      describe: () => ({ name: t('touchMove'), bounds: semanticBoundsOf(stick) }),
    }));
    for (const key of ACTIONS) {
      semanticHandles.push(semantics.add({
        id: 'touch-'+key, parent:'touch-controls', role:'button',
        describe: () => ({ name:t(key), bounds:semanticBoundsOf(actions[key]), disabled:!active }),
        onActivate: () => native.activate(key),
      }));
    }
  }
  function layout(screen = game.screen) {
    const safe=screen.safe, scale=screen.scale, width=safe.width*scale, height=safe.height*scale;
    const short=width>height && height<=430, narrow=Math.min(width,height);
    root.x=safe.x; root.y=safe.y; root.scaleX=root.scaleY=1/scale;
    const size=clamp(narrow*.13,48,64), pad=short?clamp(narrow*.20,70,86):clamp(narrow*.24,86,110);
    const gap=clamp(narrow*.02,6,12);
    // Leave space for a full build (six toys and six charms), even if a tiny
    // logical width forces the HUD chips onto two lines.
    const chipSize=safe.width<560?25:28, columns=Math.max(1,Math.floor((safe.width-16)/chipSize));
    const gearRows=Math.ceil((RUN.toySlots+RUN.charmSlots)/columns);
    const bottom=Math.max(short?42:52,(8+gearRows*chipSize)*scale+4);
    stickHolder.x=12; stickHolder.y=height-bottom-pad;
    stick.hitArea={x:0,y:0,width:pad,height:pad};
    for (const [i,key] of ACTIONS.slice(0,3).entries()) {
      holders[key].x=width-12-(3-i)*size-(2-i)*gap; holders[key].y=height-bottom-size;
      actions[key].hitArea={x:0,y:0,width:size,height:size};
    }
    holders.pause.x=12; holders.pause.y=42;
    actions.pause.hitArea={x:0,y:0,width:54,height:45};
    native.layout(scale);
    paintStick(); for (const key of ACTIONS) paintAction(key); onChanged();
  }
  async function refreshLanguage() {
    stick.name=t('touchMove');
    for (const key of ACTIONS) {
      actions[key].name=t(key);
      labels[key].text=t(key);
    }
    await Promise.all(ACTIONS.map(key=>labels[key].ready));
    for (const key of ACTIONS) paintAction(key); onChanged();
  }
  layout(); await refreshLanguage();
  return {
    setActive(next) {
      next=!!next; if (active===next) return;
      active=next; root.visible=active; native.setActive(active); onChanged();
    },
    layout, refreshLanguage,
    dispose() {
      active=false; root.visible=false;
      native.dispose();
      for (const handle of semanticHandles.reverse()) handle.remove();
      for (const label of Object.values(labels)) label.dispose();
    },
  };
}
