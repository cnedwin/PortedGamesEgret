import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';

// Play owns navigation and draws its focus ring. The projection exposes the same controls to assistive technology.
export function createUiInput() {
  const tree = createUiSemantics();
  let game, projection, projectedSize;
  function focused() {
    const snapshot = tree.publish();
    return snapshot.nodes.find(node => node.id === snapshot.focused);
  }
  function focusCanvas() {
    game.canvas.focus({ preventScroll: true });
  }
  function pick(name, view) {
    const controls = tree.publish().nodes.filter(node => !node.inert && !node.disabled && node.actions.includes('focus'));
    const target = controls.find(node => node.id.endsWith(':' + name)) ?? controls[0];
    if (view) {
      // The view can focus and reveal a named control itself. Other live
      // views may contribute their own controls to the semantics tree.
      for (const control of [target, ...controls]) {
        if (!control) continue;
        const part = control.id.split(':').at(-1);
        try {
          if (view.focus(part)) break;
        } catch (error) {
          if (error.code !== 'UI_VIEW_NAME_UNKNOWN') throw error;
        }
      }
      tree.publish();
    } else if (target !== undefined) {
      // game.confirm returns a promise instead of exposing its view. A sale
      // must initially select No rather than its default Yes.
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
    semantics: tree, tree, attach, resize, pick, focusCanvas,
    get name() { return focused()?.name; },
    get part() { return focused()?.id.split(':').at(-1); }
  };
}
