import type { SharedPreparationOptions2D } from '../rendering/prepareSharedDraws2D.js';
import type { SharedStorageLimits2D } from './sharedSubmissionStorage2D.js';
import type { WebGL2HostDiagnostic } from './webgl2Types.js';
export interface SharedWebGL2Configuration extends SharedPreparationOptions2D, SharedStorageLimits2D {
    readonly maxBackingPixels: number;
    readonly enableReadback: boolean;
    readonly enableEffects: boolean;
    readonly outputAlpha: 'premultiplied' | 'opaque';
    readonly restoreTimeoutMs: number;
}
export interface SharedWebGL2HostOptions extends Partial<SharedWebGL2Configuration> {
    readonly canvas: HTMLCanvasElement;
    readonly onDiagnostic?: (diagnostic: WebGL2HostDiagnostic) => unknown;
}
export type SharedSceneWebGL2HostOptions = Omit<SharedWebGL2HostOptions, 'outputAlpha'> & {
    readonly outputAlpha: 'opaque';
};
/** Capture all successful reads before semantics; preserve the first thrown getter value. */
export declare function admitSharedWebGL2Options(input: SharedWebGL2HostOptions, scene: boolean): {
    surface: HTMLCanvasElement;
    configuration: SharedWebGL2Configuration;
    callback: ((diagnostic: WebGL2HostDiagnostic) => unknown) | undefined;
};
//# sourceMappingURL=sharedWebGL2Options.d.ts.map