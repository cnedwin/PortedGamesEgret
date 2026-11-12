import type { WebGPUHostDiagnostic, WebGPUHostOptions } from './WebGPUHost.js';
export interface TexturedWebGPUHostOptions extends WebGPUHostOptions {
    readonly maxSourceTriangles?: number;
    readonly maxFrameGeometryBytes?: number;
    readonly maxPendingGeometryBytes?: number;
    readonly maxTupleComparisons?: number;
}
export type TexturedWebGPUConfiguration = Required<Omit<TexturedWebGPUHostOptions, 'canvas' | 'device' | 'onDiagnostic'>>;
/** Snapshot every top-level read, then the selected policy reads, before any semantic refusal. */
export declare function admitTexturedWebGPUOptions(input: TexturedWebGPUHostOptions): {
    surface: HTMLCanvasElement;
    configuration: TexturedWebGPUConfiguration;
    borrowed: GPUDevice | undefined;
    callback: ((diagnostic: WebGPUHostDiagnostic) => unknown) | undefined;
};
//# sourceMappingURL=texturedWebGPUOptions.d.ts.map