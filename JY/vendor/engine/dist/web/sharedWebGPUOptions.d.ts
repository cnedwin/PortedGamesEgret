import type { WebGPUHostDiagnostic } from './WebGPUHost.js';
import type { TexturedWebGPUHostOptions, TexturedWebGPUConfiguration } from './texturedWebGPUOptions.js';
export interface SharedWebGPUHostOptions extends TexturedWebGPUHostOptions {
    readonly enableEffects?: boolean;
    readonly outputAlpha?: 'premultiplied' | 'opaque';
    readonly recovery?: {
        readonly mode: 'manual' | 'automatic';
        readonly timeoutMs?: number;
    };
}
export type SharedSceneWebGPUHostOptions = Omit<SharedWebGPUHostOptions, 'outputAlpha'> & {
    readonly outputAlpha: 'opaque';
};
export type SharedWebGPUConfiguration = TexturedWebGPUConfiguration & {
    readonly enableEffects: boolean;
    readonly outputAlpha: 'premultiplied' | 'opaque';
    readonly recovery: {
        readonly mode: 'manual' | 'automatic';
        readonly timeoutMs: number;
    } | undefined;
};
/** Snapshot every top-level read, then the selected policy reads, before any semantic refusal. */
export declare function admitSharedWebGPUOptions(input: SharedWebGPUHostOptions, scene: boolean): {
    surface: HTMLCanvasElement;
    configuration: SharedWebGPUConfiguration;
    borrowed: GPUDevice | undefined;
    callback: ((diagnostic: WebGPUHostDiagnostic) => unknown) | undefined;
};
//# sourceMappingURL=sharedWebGPUOptions.d.ts.map