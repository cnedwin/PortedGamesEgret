/**
 * Original, lightweight landscape plates. The engineering world remains vector-drawn.
 * The painted backdrop is decorative: controls and geometry are immediately available
 * and the ruled landscape is the fallback if the image cannot be decoded.
 */
import { Sprite } from '@egret/engine';

const PLATES = [
  ['jiangnan.jpg',1800/195],
  ['zhaozhou.jpg',1800/196],
  ['shu-road.jpg',1800/195],
  ['chaozhou.jpg',1800/295],
  ['dong-country.jpg',1800/295]
];

function attach(game, parent, file, ratio, box, fallback, flip = false) {
  const layer = new Sprite();
  parent.addChild(layer);
  let picture = null, closed = false, loading = false;
  const watchers = new Set();
  const status = {
    state: 'loading',
    watch(fn) {
      watchers.add(fn);
      fn(status.state);
    },
    retry() { if (status.state === 'fallback') startLoad(); },
    dispose() {
      closed = true;
      watchers.clear();
      if (picture && !picture.isDisposed) game.remove(picture);
      picture = null;
    }
  };
  const changed = (state) => {
    status.state = state;
    for (const fn of watchers) fn(state);
    game.invalidate?.();
  };
  // Preserve the plate aspect ratio, cropping at the canvas edge rather than stretching.
  const width = Math.max(box.w, box.h*ratio), height = width/ratio;
  function startLoad() {
    if (closed || layer.isDisposed || loading || picture) return;
    loading = true;
    changed('loading');
    Promise.resolve().then(() => {
      if (closed || layer.isDisposed) return null;
      return game.image('./assets/'+file, {
        layer, x: box.x+box.w/2, y: box.y+box.h/2, width, height
      });
    }).then(holder => {
      if (!holder) return;
      if (closed || layer.isDisposed) {
        if (!holder.isDisposed) game.remove(holder);
        return;
      }
      picture = holder;
      if (flip) picture.scaleX = -1;
      if (fallback && !fallback.isDisposed) fallback.visible = false;
      changed('ready');
    }).catch(() => {
      if (!closed && !layer.isDisposed) changed('fallback');
    }).finally(() => { loading = false; });
  }
  startLoad();
  return { layer, status };
}

export function titleArt(game, parent, box, fallback) {
  return attach(game,parent,'title-gorge.jpg',1500/844,box,fallback);
}
export function chapterArt(game, parent, level, box, fallback) {
  const [file,ratio] = PLATES[level.chapter] ?? PLATES[0];
  const art = attach(game,parent,file,ratio,box,fallback);
  // The cover is intentionally noninteractive; the camera and the HUD own input.
  parent.setChildIndex(art.layer, 0);
  return art;
}

/** Two art props rooted in each bank; the original procedural trees remain the fallback. */
export function treeArt(game,scene,level) {
  const which = level.chapter === 1 ? ['pine.png',434/440] :
    level.chapter === 2 || level.chapter === 4 ? ['hill-pine.png',418/440] : ['willow.png',420/440];
  const h = level.chapter === 2 ? 4.0 : level.chapter === 4 ? 3.6 : 3.4;
  return (scene.trees ?? []).map(({node,x,y,index}) => {
    const height = h*(index ? 0.88 : 1), width = height*which[1];
    return attach(game,scene,which[0],which[1],{x:x-width/2,y:y-height+0.03,w:width,h:height},node,index===1).status;
  });
}

/** Offer a non-blocking retry only when one of the decorative pictures failed. */
export function makeArtRetry(app, parent, states, options) {
  const button = app.kit.button(parent, app.say('artRetry'), {...options,kind:'quiet'}, () => {
    for (const state of states) state.retry();
  });
  const refresh = () => { button.visible = states.some(s => s.state === 'fallback'); };
  for (const state of states) state.watch(refresh);
  return button;
}
