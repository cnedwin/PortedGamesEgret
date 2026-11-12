import { setRenderEffect } from './renderEffect.js';
import { assertManagedMutable } from './ui/managedState.js';
import { isSharedMaterial2D } from '@egret/contracts';
import { registerDisplayHitNode, readDisplayHitState, writeDisplayHitArea, writeDisplayTouchEnabled } from './displayHitState.js';
import { queryDisplayBounds } from './displayBounds.js';
import { queryDisplayPoint } from './displayCoordinates.js';
import { EgretError } from './EgretError.js';
import { assertVisualMutable, copyRect, finite, unit, registerVisual, visualOf, readAnchorOffset, writeAnchorOffset, recordVisualChange, VISUAL_TRANSFORM, VISUAL_APPEARANCE } from './displayVisualState.js';
import { EventDispatcher } from "./EventDispatcher.js";
import { ASSERT_ATTACHABLE, ASSERT_BINDABLE, OWNERSHIP_CHILDREN } from "./ownership.js";
import { assertLive, isTerminated, parentOf, registerNode, terminateNode } from "./displayTreeState.js";
// Equality is checked only after the original validation; signed zero stays distinct.
const sameVisualValue = Object.is;
/** A live display node; detach and terminal dispose are separate operations. */
export class DisplayObject extends EventDispatcher {
    constructor() { super(); registerNode(this); registerVisual(this); registerDisplayHitNode(this); }
    /** Explicit input regions are separate from rendering content and opacity. */
    get touchEnabled() { return readDisplayHitState(this).touchEnabled; }
    set touchEnabled(value) { writeDisplayTouchEnabled(this, value); }
    get hitArea() { return readDisplayHitState(this).hitArea; }
    set hitArea(value) { writeDisplayHitArea(this, value); }
    get x() { return visualOf(this).x; }
    set x(value) {
        assertVisualMutable(this);
        if (!finite(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.x, value);
        state.x = value;
        if (changed)
            recordVisualChange(this, VISUAL_TRANSFORM);
    }
    get y() { return visualOf(this).y; }
    set y(value) {
        assertVisualMutable(this);
        if (!finite(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.y, value);
        state.y = value;
        if (changed)
            recordVisualChange(this, VISUAL_TRANSFORM);
    }
    /** Local pivot in logical pixels; finite values are stored without coercion. */
    get anchorOffsetX() { return readAnchorOffset(this, "anchorOffsetX"); }
    set anchorOffsetX(value) { writeAnchorOffset(this, "anchorOffsetX", value); }
    /** The pivot remains readable after disposal; writes obey node/Engine life. */
    get anchorOffsetY() { return readAnchorOffset(this, "anchorOffsetY"); }
    set anchorOffsetY(value) { writeAnchorOffset(this, "anchorOffsetY", value); }
    get scaleX() { return visualOf(this).scaleX; }
    set scaleX(value) {
        assertVisualMutable(this);
        if (!finite(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.scaleX, value);
        state.scaleX = value;
        if (changed)
            recordVisualChange(this, VISUAL_TRANSFORM);
    }
    get scaleY() { return visualOf(this).scaleY; }
    set scaleY(value) {
        assertVisualMutable(this);
        if (!finite(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.scaleY, value);
        state.scaleY = value;
        if (changed)
            recordVisualChange(this, VISUAL_TRANSFORM);
    }
    get rotation() { return visualOf(this).rotation; }
    set rotation(value) {
        assertVisualMutable(this);
        if (!finite(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.rotation, value);
        state.rotation = value;
        if (changed)
            recordVisualChange(this, VISUAL_TRANSFORM);
    }
    get alpha() { return visualOf(this).alpha; }
    set alpha(value) {
        assertVisualMutable(this);
        if (!unit(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.alpha, value);
        state.alpha = value;
        if (changed)
            recordVisualChange(this, VISUAL_APPEARANCE);
    }
    get visible() { return visualOf(this).visible; }
    set visible(value) {
        assertVisualMutable(this);
        if (typeof value !== 'boolean')
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = !sameVisualValue(state.visible, value);
        state.visible = value;
        if (changed)
            recordVisualChange(this, VISUAL_APPEARANCE);
    }
    /** A complete material value overrides the nearest inherited value. */
    get sharedMaterial() { return visualOf(this).sharedMaterial; }
    set sharedMaterial(value) {
        assertVisualMutable(this);
        if (value !== null && !isSharedMaterial2D(value))
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = state.sharedMaterial !== value;
        state.sharedMaterial = value;
        if (changed)
            recordVisualChange(this, VISUAL_APPEARANCE);
    }
    /** Shared backends execute effects; legacy captures explicitly refuse them. */
    get renderEffect() { return visualOf(this).renderEffect; }
    set renderEffect(value) { setRenderEffect(this, value); }
    /** An ordering boundary is metadata, not another display or resource owner. */
    get renderBoundary() { return visualOf(this).renderBoundary; }
    set renderBoundary(value) {
        assertVisualMutable(this);
        if (value !== 'none' && value !== 'isolate')
            throw new EgretError('DISPLAY_VALUE_INVALID');
        const state = visualOf(this), changed = state.renderBoundary !== value;
        state.renderBoundary = value;
        if (changed)
            recordVisualChange(this, VISUAL_APPEARANCE);
    }
    get clipRect() { return visualOf(this).clipRect; }
    set clipRect(value) {
        assertVisualMutable(this);
        let copy;
        try {
            copy = value === undefined ? undefined : copyRect(value, 'DISPLAY_VALUE_INVALID');
        }
        catch (cause) {
            if (cause instanceof EgretError)
                throw cause;
            throw new EgretError('DISPLAY_VALUE_INVALID', { cause });
        }
        assertVisualMutable(this);
        const state = visualOf(this), changed = !sameVisualValue(state.clipRect, copy);
        state.clipRect = copy;
        if (changed)
            recordVisualChange(this, VISUAL_APPEARANCE);
    }
    get parent() { return parentOf(this); }
    get isDisposed() { return isTerminated(this); }
    /** Map logical coordinates through the actual root, including its transform. */
    localToGlobal(localX, localY, options) {
        return queryDisplayPoint(this, localX, localY, options, false);
    }
    /** Solve the stored world matrix and return one owned, frozen point. */
    globalToLocal(globalX, globalY, options) {
        return queryDisplayPoint(this, globalX, globalY, options, true);
    }
    /** Measure descendant-transformed content in this node's local coordinates. */
    getBounds(options) {
        return queryDisplayBounds(this, options);
    }
    assertUsable() {
        assertLive(this);
    }
    eventParent() { return this.parent; }
    [ASSERT_BINDABLE]() { this.assertUsable(); }
    [ASSERT_ATTACHABLE]() { this.assertUsable(); }
    [OWNERSHIP_CHILDREN]() { return []; }
    /** Mark terminal before removing listeners, so callback reentry sees disposal. */
    dispose() {
        if (isTerminated(this))
            return;
        assertManagedMutable(this);
        terminateNode(this);
        this.clearListeners();
    }
}
//# sourceMappingURL=DisplayObject.js.map