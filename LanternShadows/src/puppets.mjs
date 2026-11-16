// Puppets on the stage. Each is a Spine skeleton whose pieces were drawn and rigged by tools/author.mjs; here they
// are loaded through the engine's resource manifest, and given a small handle to play by.
import { admitResourceManifest } from '@egret/contracts/resources';
import { createSpineDisplay, createSpineInstance } from '@egret/spine';
import { createManifestSpineContentLoader } from '@egret/spine/web';

/** Loads the named puppets. Returns a function that gives the loaded asset of a name. */
export async function loadPuppets(engine, scope, names, base) {
  const response = await fetch(new URL('manifest.json', base));
  if (!response.ok) throw Error('The puppets are missing: run tools/author.mjs.');
  const admitted = admitResourceManifest(await response.json());
  if (!admitted.ok) throw Error('The puppet manifest was refused.');
  const loader = createManifestSpineContentLoader(engine, scope, admitted.value, { baseUrl: base.href, deadlineMs: 30000, networkRetries: 1 });
  const group = loader.load(scope, names.map(name => 'e_' + name));
  await group.ready;
  return name => group.getSpine('e_' + name);
}

/**
 * One puppet. `node` goes on the stage and is placed there; `play` starts an animation, `face` turns it, and
 * `advance` moves it on by the engine's tick.
 */
export function createPuppet(asset, scope, { onEvent } = {}) {
  const instance = createSpineInstance(asset, scope, { onEvent }),
    display = createSpineDisplay(instance, scope, { colorProfile: 'egret-shared-linear/1' }),
    node = display.node;
  let playing, key, rate = 1, size = 1;
  return {
    node,
    instance,
    get playing() {
      return playing;
    },
    /** Starts `name` unless it is already the one playing with the same `key`. */
    play(name, { loop = false, mix = 0.07, key: next = 0 } = {}) {
      if (playing === name && key === next) return;
      playing = name;
      key = next;
      instance.setAnimation(0, name, { loop, mixSeconds: mix });
    },
    /** Follows the current animation with another. */
    then(name, { loop = true, mix = 0.12 } = {}) {
      instance.addAnimation(0, name, { loop, mixSeconds: mix });
      playing = name;
      key = 0;
    },
    face(direction) {
      node.scaleX = direction < 0 ? -size : size;
    },
    scale(value) {
      size = value;
      node.scaleX = Math.sign(node.scaleX || 1) * value;
      node.scaleY = value;
    },
    /** 1 is the speed it was drawn at; 0 holds it still. */
    speed(value) {
      if (value === rate) return;
      rate = value;
      instance.setRate(value);
    },
    advance(tick) {
      return instance.advance(tick);
    },
    dispose() {
      display.dispose();
      instance.dispose();
    }
  };
}
