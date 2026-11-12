/** The host supplies captured operations and owns scopes, gates and immediate Promise observation. */
export declare function createWebGPUMeshPipeline(shader: (descriptor: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (descriptor: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, format: 'rgba8unorm' | 'bgra8unorm'): Promise<GPURenderPipeline>;
/** Encode supplied resources only; the host owns admission, allocation, pass end and submission. */
export declare function encodeWebGPUMesh(pass: GPURenderPassEncoder, pipeline: GPURenderPipeline, vertices: GPUBuffer, indices: GPUBuffer, bindings: GPUBindGroup, indexCount: number, width: number, height: number): void;
//# sourceMappingURL=webgpuMeshPass.d.ts.map