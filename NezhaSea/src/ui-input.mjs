import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

// The browser projects names and actions to assistive technology. Canvas focus and its visible ring are game-owned.
export function createUiInput() {
  const tree = createUiSemantics();
  const aliases = new Map();
  let game, ring, projection, projectedSize, current, visible = false;
  const semantics = Object.create(tree, {
    add: { value(part) {
      const focusable = part.onActivate && ['button', 'switch', 'tab'].includes(part.role);
      const name = part.id.split(':').at(-1);
      return tree.add({
        ...part,
        describe: () => {
          const state = part.describe();
          const alias = aliases.get(name);
          return { ...state, ...(alias ? { name: alias() } : {}),
            ...(focusable ? { focused: current === part.id && !state.disabled && !state.hidden } : {}) };
        },
        ...(focusable ? { onFocus: () => focus(part.id, true) } : {})
      });
    } }
  });
  function alias(name, get) {
    aliases.set(name, get);
    return () => { if (aliases.get(name) === get) aliases.delete(name); };
  }
  const controls = () => tree.snapshot.nodes.filter(node => !node.inert && !node.disabled && node.actions.includes('focus'));

  function draw() {
    if (!ring) return;
    const bounds = tree.snapshot.nodes.find(node => node.id === tree.snapshot.focused)?.bounds;
    ring.visible = Boolean(visible && bounds);
    if (!ring.visible) return;
    const { x, y, width, height } = bounds;
    const screen = game.screen;
    const u = screen.width / Math.max(1, game.canvas.clientWidth);
    ring.graphics.clear().lineStyle(2 * u, 0xffdc9f)
      .drawRoundRect(screen.x + x - u, screen.y + y - u, width + 2 * u, height + 2 * u, 7 * u);
    if (game.ui.getChildAt(game.ui.numChildren - 1) !== ring) game.ui.setChildIndex(ring, game.ui.numChildren - 1);
  }
  function focus(id, outline = visible) {
    current = id;
    visible = outline;
    tree.publish();
    draw();
  }
  function pick(name, { outline = visible, focusCanvas = true } = {}) {
    current = undefined;
    tree.publish();
    const candidates = controls();
    const target = candidates.find(node => node.id.endsWith(':' + name)) ?? candidates[0];
    focus(target?.id, outline);
    if (focusCanvas) game.canvas.focus({ preventScroll: true });
  }
  function move(direction) {
    tree.publish();
    const candidates = controls();
    if (!candidates.length) return false;
    const index = candidates.findIndex(node => node.id === current);
    const next = index < 0 ? (direction > 0 ? 0 : candidates.length - 1) : (index + direction + candidates.length) % candidates.length;
    focus(candidates[next].id, true);
    return true;
  }
  function activate() {
    tree.publish();
    const target = controls().find(node => node.id === current);
    if (!target) return false;
    focus(target.id, true);
    return tree.perform(target.id, 'activate');
  }
  function handleKeys(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab' && move(event.shiftKey ? -1 : 1)) event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') {
      if (!event.repeat && activate()) event.preventDefault();
    }
  }
  function resize() {
    const { width, height } = game.screen, key = width + 'x' + height;
    if (key === projectedSize) return;
    projectedSize = key;
    projection?.dispose();
    projection = createBrowserSemantics({ semantics: tree, canvas: game.canvas, width, height, onError: console.error });
  }
  function attach(made) {
    game = made;
    ring = game.sprite(undefined, game.ui);
    ring.touchEnabled = ring.touchChildren = false;
    ring.visible = false;
    game.canvas.addEventListener('keydown', handleKeys, true);
    game.canvas.addEventListener('pointerdown', () => { visible = false; draw(); });
    tree.observe((snapshot, previous) => {
      if (snapshot.focused !== previous.focused || snapshot.nodes.find(node => node.id === current)?.bounds !== previous.nodes.find(node => node.id === current)?.bounds) draw();
    });
    resize();
  }

  return {
    semantics, tree, alias, attach, resize, pick, move, activate,
    get name() { return tree.snapshot.nodes.find(node => node.id === current)?.name; },
    get part() { return current?.split(':').at(-1); },
    get outlined() { return ring?.visible === true; }
  };
}
