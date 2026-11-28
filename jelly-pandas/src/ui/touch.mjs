// The visible mobile controls use engine contacts and control state; the scene's
// separate camera drag is handled by input.mjs through the overlay passthrough.
import { Sprite, DisplayObjectContainer } from '@egret/engine';
import { createActionControl, createMovementControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { RUN } from '../data.mjs';

const ACTIONS = ['jump', 'slam', 'roll', 'pause'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const point = (target, contact) => target.globalToLocal(contact.globalX, contact.globalY);
const within = (box, p) => p.x >= box.x && p.x < box.x + box.width && p.y >= box.y && p.y < box.y + box.height;

/**
 * Bind the real engine controls to the game's per-frame input, independently
 * of their artwork. The engine owns routed contacts, cancellation and outside
 * delivery. The centered stick and tap-only pause policies are those of this game.
 */
export function bindNativeTouchControls({ pointer, stick, actions, onMovement, onAction }, input) {
  const disposables = [], held = new Map();
  let active = false, stickOwner, pauseStart, pauseSwiped = false, pauseAllowed = false;
  const own = cleanup => (disposables.push(cleanup), cleanup);
  function movePaint(value, pressed) {
    input.touchMovement(value.x, value.y);
    onMovement?.(value, pressed);
  }
  // Native movement takes the down point as origin. Use its setDirection
  // to keep the original fixed-circle behavior (even an off-center first
  // down steers), while native capture and terminal release remain authoritative.
  const movement = createMovementControl({
    input: pointer, target: stick, radius: 32,
    onMovement(value) { if (!movement.active) movePaint(value, false); },
  });
  own(() => movement.dispose());
  function center(contact) {
    const box = stick.hitArea, p = point(stick, contact);
    const radius = Math.min(box.width, box.height) * 0.31;
    const dx = p.x - box.x - box.width / 2, dy = p.y - box.y - box.height / 2;
    const distance = Math.hypot(dx, dy), scale = Math.max(distance, radius);
    movement.setDirection(distance > radius * 0.12 ? dx / scale : 0, distance > radius * 0.12 ? dy / scale : 0);
    movePaint(movement.value, movement.active);
  }
  own(stick.on(pointer.events.begin, event => {
    if (!active || !movement.active || stickOwner !== undefined) return;
    stickOwner = event.payload.session;
    center(event.payload);
  }));
  own(stick.on(pointer.events.move, event => {
    if (active && event.payload.session === stickOwner) center(event.payload);
  }));

  const controls = new Map();
  for (const key of ACTIONS) {
    const target = actions[key];
    // Register the game's tap policy before the native action, so its activation
    // can read this result in the same synchronous pointer dispatch.
    own(target.on(pointer.events.begin, event => {
      if (!active || held.has(key)) return;
      const contact = event.payload;
      if (contact.session.pointerType === 'mouse' && !(contact.buttons & 1)) {
        event.stopImmediatePropagation();
        return;
      }
      held.set(key, contact.session);
      if (key === 'pause') {
        pauseStart = point(target, contact); pauseSwiped = false; pauseAllowed = false;
      }
    }));
    if (key === 'pause') {
      const swiped = contact => {
        const p = point(target, contact);
        return !pauseStart || Math.hypot(p.x - pauseStart.x, p.y - pauseStart.y) > 12;
      };
      own(target.on(pointer.events.move, event => {
        if (event.payload.session === held.get(key)) pauseSwiped ||= swiped(event.payload);
      }));
      own(target.on(pointer.events.end, event => {
        if (event.payload.session === held.get(key))
          pauseAllowed = !pauseSwiped && !swiped(event.payload) && within(target.hitArea, point(target,event.payload));
      }));
    }
    const action = createActionControl({
      input: pointer, target,
      onPressChange(pressed) {
        if (key !== 'pause') input.touchAction(key, pressed);
        onAction?.(key, pressed);
      },
      onActivate() {
        if (key === 'pause' && active && pauseAllowed) input.onCommand?.('menu');
      },
    });
    controls.set(key, action);
    own(() => action.dispose());
  }
  own(pointer.observe(notification => {
    if (notification.kind !== 'cancel' && notification.kind !== 'end') return;
    const session = notification.contact.session;
    if (stickOwner === session) {
      stickOwner = undefined;
      movePaint({ x: 0, y: 0 }, false);
    }
    for (const [key, owner] of held) {
      if (owner !== session) continue;
      held.delete(key);
      if (key === 'pause') {
        pauseStart = undefined; pauseSwiped = pauseAllowed = false;
      } else if (notification.kind === 'cancel' || notification.delivered === false) {
        input.cancelTouchAction(key);
      }
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
      held.clear(); stickOwner = undefined; pauseStart = undefined; pauseSwiped = pauseAllowed = false;
      movePaint({ x: 0, y: 0 }, false);
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
    // A semantic button action uses the same native pressed/activation state.
    activate(key) {
      const control = controls.get(key);
      if (!active || !control || control.pressed) return;
      if (key === 'pause') pauseAllowed = true;
      control.press(); control.release();
      if (key === 'pause') pauseAllowed = false;
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
    pointer, stick, actions,
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
