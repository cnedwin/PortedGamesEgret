/** Host supplies captured methods, lifecycle gates and surrounding validation scopes. */
export declare function createWebGPUImagePipeline(shader: (descriptor: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (descriptor: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, format: 'rgba8unorm' | 'bgra8unorm'): Promise<GPURenderPipeline>;
/** Encode one supplied draw; the host retains pass end, resources and settlement authority. */
export declare function encodeWebGPUImage(pass: GPURenderPassEncoder, pipeline: GPURenderPipeline, vertices: GPUBuffer, bindings: GPUBindGroup, vertexCount: number, width: number, height: number): void;
//# sourceMappingURL=webgpuImagePass.d.ts.map