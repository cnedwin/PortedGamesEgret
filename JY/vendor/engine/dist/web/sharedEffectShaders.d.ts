/** Fixed separable box kernel, a spread of the group's alpha for a glow or an outline, Egret's colour matrix, and
 * source-over Alpha mask, in linear PMA space. Native targets encode sRGB on store; integer loads decode once on read. */
export type SharedEffectPass = 'horizontal' | 'vertical' | 'spread' | 'composite';
export declare const EFFECT_PASSES: readonly SharedEffectPass[];
/** The bytes of one group's uniform, as prepareEffects2D fills it. */
export declare const EFFECT_UNIFORM_BYTES: number;
/**
 * In a target that mixes stored codes the colour already is as it is seen, so the matrix reads and writes it
 * without the transfer.
 */
export declare function sharedEffectGLSL(mode: SharedEffectPass, srgb?: boolean): string;
export declare function createSharedEffectPipeline(shader: (d: GPUShaderModuleDescriptor) => GPUShaderModule, pipeline: (d: GPURenderPipelineDescriptor) => Promise<GPURenderPipeline>, mode: SharedEffectPass, srgb?: boolean): Promise<GPURenderPipeline>;
//# sourceMappingURL=sharedEffectShaders.d.ts.map