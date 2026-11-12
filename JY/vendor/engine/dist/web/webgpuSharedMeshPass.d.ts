/** The host supplies captured operations and owns scopes, gates and immediate Promise observation. */
export declare function createSharedWebGPUMeshPipeline(shader: (descriptor: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (descriptor: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, format: 'rgba8unorm-srgb'): Promise<GPURenderPipeline>;
/** Encode supplied resources only; the host owns admission, allocation, pass end and submission. */
export declare function encodeSharedWebGPUMesh(pass: GPURenderPassEncoder, pipeline: GPURenderPipeline, vertices: GPUBuffer, indices: GPUBuffer, bindings: GPUBindGroup, indexCount: number, width: number, height: number): void;
/** Private cutout pass on the shared scene's existing color and reversed-depth targets. */
export declare function createSharedWebGPUCardPipeline(shader: Parameters<typeof createSharedWebGPUMeshPipeline>[0], pipeline: Parameters<typeof createSharedWebGPUMeshPipeline>[1]): ReturnType<typeof createSharedWebGPUMeshPipeline>;
/** Private authored textured meshes share the same opaque reversed-depth pass as untextured meshes. */
export declare function createSharedWebGPUTexturedMeshPipeline(shader: Parameters<typeof createSharedWebGPUMeshPipeline>[0], pipeline: Parameters<typeof createSharedWebGPUMeshPipeline>[1]): ReturnType<typeof createSharedWebGPUMeshPipeline>;
/** Private Lambert role on the existing opaque reversed-depth scene attachment. */
export declare function createSharedWebGPULambertMeshPipeline(shader: Parameters<typeof createSharedWebGPUMeshPipeline>[0], pipeline: Parameters<typeof createSharedWebGPUMeshPipeline>[1]): ReturnType<typeof createSharedWebGPUMeshPipeline>;
//# sourceMappingURL=webgpuSharedMeshPass.d.ts.map