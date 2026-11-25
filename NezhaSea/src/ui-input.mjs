import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

// Play owns navigation and draws its focus ring. The projection exposes the same controls to assistive technology.
export function createUiInput() {
  const tree = createUiSemantics();
  const aliases = new Map();
  let game, projection, projectedSize;
  const semantics = Object.create(tree, {
    add: { value(part) {
      const name = part.id.split(':').at(-1);
      return tree.add({
        ...part,
        describe: () => {
          const state = part.describe();
          const alias = aliases.get(name);
          return alias ? { ...state, name: alias() } : state;
        }
      });
    } }
  });
  function alias(name, get) {
    aliases.set(name, get);
    return () => { if (aliases.get(name) === get) aliases.delete(name); };
  }
  function focused() {
    const snapshot = tree.publish();
    return snapshot.nodes.find(node => node.id === snapshot.focused);
  }
  function focusCanvas() {
    game.canvas.focus({ preventScroll: true });
  }
  function pick(name) {
    const controls = tree.publish().nodes.filter(node => !node.inert && !node.disabled && node.actions.includes('focus'));
    const target = controls.find(node => node.id.endsWith(':' + name)) ?? controls[0];
    if (target !== undefined) {
      tree.perform(target.id, 'focus');
      tree.publish();
    }
    focusCanvas();
  }
  function resize() {
    const { width, height } = game.screen, key = width + 'x' + height;
    if (key === projectedSize) return;
    projection?.dispose();
    projection = createBrowserSemantics({ semantics: tree, canvas: game.canvas, width, height, onError: console.error });
    projectedSize = key;
  }
  function attach(made) {
    game = made;
    resize();
  }

  return {
    semantics, tree, alias, attach, resize, pick, focusCanvas,
    get name() { return focused()?.name; },
    get part() { return focused()?.id.split(':').at(-1); }
  };
}
