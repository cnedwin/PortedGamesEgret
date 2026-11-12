import type { PreparedCacheSlot2D } from '../rendering/preparedFrameCache2D.js';
import type { PreparedRectangles2D, PreparationBudget2D } from '../rendering/prepareRectangles2D.js';
export declare class WebGPUPackingError extends Error {
    readonly reason: 'precision' | 'budget' | 'device';
    constructor(reason: 'precision' | 'budget' | 'device', cause?: unknown);
}
export declare function packWebGPUVertices(prepared: PreparedRectangles2D, width: number, height: number, limits: {
    readonly maxUploadBytes: number;
    readonly maxBufferSize: number;
}, budget?: PreparationBudget2D, preparedCommandIndices?: number[], cacheSlot?: PreparedCacheSlot2D): {
    data: Float32Array<ArrayBuffer>;
    ranges: readonly {
        firstVertex: number;
        vertexCount: number;
    }[];
    collapsedTriangles: number;
    maxBackingDisplacement: number;
};
/** Host supplies captured methods, checks terminal gates, and owns surrounding scopes. */
export declare function createWebGPURectanglePipeline(shader: (descriptor: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (descriptor: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, format: 'rgba8unorm' | 'bgra8unorm'): Promise<GPURenderPipeline>;
export declare function encodeWebGPURectangles(pass: GPURenderPassEncoder, pipeline: GPURenderPipeline, buffer: GPUBuffer | undefined, ranges: readonly {
    firstVertex: number;
    vertexCount: number;
}[], width: number, height: number): void;
//# sourceMappingURL=webgpuPass.d.ts.map