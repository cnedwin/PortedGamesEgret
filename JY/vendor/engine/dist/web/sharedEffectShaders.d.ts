/** Fixed separable box kernel and source-over Alpha mask, in linear PMA space.
 * Native targets encode sRGB on store; integer loads decode once on read. */
export type SharedEffectPass = 'horizontal' | 'vertical' | 'composite';
export declare const EFFECT_PASSES: readonly SharedEffectPass[];
export declare function sharedEffectGLSL(mode: SharedEffectPass): string;
export declare function createSharedEffectPipeline(shader: (d: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (d: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, mode: SharedEffectPass): Promise<GPURenderPipeline>;
//# sourceMappingURL=sharedEffectShaders.d.ts.map