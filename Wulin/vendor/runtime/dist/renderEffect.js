import { readBitmapState as bitmapCaptureState } from './bitmapDisplayState.js';
import { assertLive } from './displayTreeState.js';
import { engineOf } from './ownership.js';
import { assertVisualMutable, copyRect, visualOf, recordVisualChange, VISUAL_APPEARANCE } from './displayVisualState.js';
import { EgretError } from './EgretError.js';
export function setRenderEffect(node, input) {
    assertVisualMutable(node);
    let value;
    if (input !== undefined) {
        if (input === null || typeof input !== 'object')
            throw new EgretError('DISPLAY_EFFECT_INVALID');
        const radius = input.blurRadius ?? 0, mask = input.alphaMask, rect = input.maskRect;
        if (!Number.isInteger(radius) || radius < 0 || radius > 8)
            throw new EgretError('DISPLAY_EFFECT_INVALID');
        let bounds;
        if (mask !== undefined) {
            if (!bitmapCaptureState(mask))
                throw new EgretError('DISPLAY_EFFECT_MASK_INVALID');
            assertLive(mask);
            if (engineOf(mask) !== engineOf(node))
                throw new EgretError('ENGINE_MISMATCH');
            if (rect === undefined)
                throw new EgretError('DISPLAY_EFFECT_INVALID');
            bounds = copyRect(rect, 'DISPLAY_EFFECT_INVALID');
            if (bounds.width <= 0 || bounds.height <= 0)
                throw new EgretError('DISPLAY_EFFECT_INVALID');
        }
        else if (rect !== undefined)
            throw new EgretError('DISPLAY_EFFECT_INVALID');
        value = Object.freeze({ blurRadius: radius, ...(mask === undefined ? {} : { alphaMask: mask, maskRect: bounds }) });
    }
    // Descriptor reads may execute application getters; publish only after life recheck.
    assertVisualMutable(node);
    visualOf(node).renderEffect = value;
    recordVisualChange(node, VISUAL_APPEARANCE);
}
