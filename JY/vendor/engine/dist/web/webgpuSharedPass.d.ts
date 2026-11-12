import type { SharedMaterial2D } from '@egret/contracts';
export declare const SHARED_BLENDS: readonly ['normal', 'add-accumulate', 'add-preserve', 'multiply-factor', 'screen'];
/** All shaders and promises are immediately owned by the Host's captured startup boundaries. */
export declare function createSharedWebGPUPipeline(shader: (d: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (d: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, sampled: boolean, blend: SharedMaterial2D['blend']): Promise<GPURenderPipeline>;
//# sourceMappingURL=webgpuSharedPass.d.ts.map