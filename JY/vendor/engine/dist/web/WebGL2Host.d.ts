import type { SharedWebGL2HostOptions, SharedSceneWebGL2HostOptions } from './sharedWebGL2Options.js';
import type { SharedSceneWebGL2Host } from './webgl2Types.js';
import type { SharedLayerWebGL2Host } from './webgl2Types.js';
/** Explicit compatibility backend; the Engine retains the original shared-frame contract. */
export declare function createSharedWebGL2Host(options: SharedWebGL2HostOptions): SharedLayerWebGL2Host;
/** Internal fixed scene assembly, reached only from the separate package entry. */
export declare function createSharedSceneWebGL2HostInternal(options: SharedSceneWebGL2HostOptions): SharedSceneWebGL2Host;
//# sourceMappingURL=WebGL2Host.d.ts.map