import { sharedWebGL2LayerVertexSource, sharedWebGL2LayerFragmentSource, sharedWebGL2LayerEffectFragmentSource } from './sharedWebGL2Shaders.js';
import { glFailure } from './webgl2Native.js';
import { readSharedLayerEffect2D, readSharedLayerPlacement2D } from './sharedLayers2D.js';
export { MAX_LAYER_HANDLES, sharedLayerBakeRefusal2D } from './sharedLayers2D.js';
const effectInvalid = () => {
    throw glFailure('WEBGL2_LAYER_EFFECT_INVALID');
};
const placementInvalid = () => {
    throw glFailure('WEBGL2_LAYER_INVALID');
};
/** Apply the original logical-to-physical clipping and RGB bounds. */
export function readWebGL2LayerEffect(options, input, frameWidth, frameHeight) {
    return readSharedLayerEffect2D(options.enableEffects, options.pixelRatio, input, frameWidth, frameHeight, effectInvalid);
}
/** Convert one verified revision's placement after the Host's lifecycle checks. */
export function readWebGL2LayerPlacement(revision, x, y, width, height, ratio, light) {
    return readSharedLayerPlacement2D(revision, x, y, width, height, ratio, light, placementInvalid);
}
/** Build program bindings; the Host owns generation invalidation and cache publication. */
export function createWebGL2LayerProgram(native, effect) {
    const gl = native.gl, program = native.program(sharedWebGL2LayerVertexSource, effect ? sharedWebGL2LayerEffectFragmentSource : sharedWebGL2LayerFragmentSource);
    const location = (name) => gl.getUniformLocation(program, name);
    const variant = {
        program,
        origin: location('origin'),
        extent: location('extent'),
        viewport: location('viewportSize'),
        texture: location('layerTexture'),
        effect: effect
            ? {
                min: location('effectMin'),
                max: location('effectMax'),
                scaleRG: location('multiplyRG'),
                scaleBAddR: location('multiplyBAddR'),
                addGB: location('addGB')
            }
            : undefined
    };
    return variant;
}
