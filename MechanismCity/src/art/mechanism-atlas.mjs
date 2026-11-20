import { atlasFrames } from './mechanism-frames.mjs';
import { mechanismKey } from './mechanism-key.mjs';

/** Source rectangle in atlas pixels and its placement relative to the body's origin. */
export function mechanismFrame(kind, spec = {}, active = false) {
  return atlasFrames[mechanismKey(kind, spec, active)];
}
