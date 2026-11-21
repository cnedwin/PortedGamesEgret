import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import type { Object3D } from '../../rendering/world3d/Object3D.js';
import type { ViewportPoint3D } from '../../rendering/world3d/GeometryBuilder3D.js';
/** A screen marker to add: what it points at, its offset, whether it sticks to the screen's edge, and how far it shows. */
export interface ScreenMarkerOptions3D {
    /** What the element follows: a node's world position, or a fixed world point. */
    readonly target: Object3D | readonly [number, number, number];
    /** Added to the target's position in world units, as for a label above a head. */
    readonly offset?: readonly [number, number, number];
    /** Keep the element at the edge of the screen when its target is off it, `margin` pixels in. */
    readonly clampToEdge?: boolean;
    readonly margin?: number;
    /** Hide the element beyond this distance from the camera. */
    readonly maxDistance?: number;
}
/** A marker over the screen that follows a point of the scene: its element and where it is. */
export interface ScreenMarker3D {
    readonly element: HTMLElement;
    /** Where the element was placed last; `onEdge` when it was clamped. */
    readonly point: Readonly<ViewportPoint3D>;
    readonly onEdge: boolean;
    /** The direction from the screen's centre to the target, in radians, for an arrow on a clamped marker. */
    readonly angle: number;
    /** Replaces what the marker follows. */
    retarget(target: Object3D | readonly [number, number, number]): void;
    /** Takes the marker off; the element is removed from its container when the layer added it. */
    dispose(): void;
}
/** Screen markers to make: the container they go in, and the camera they follow. */
export interface ScreenMarkersOptions3D {
    /** The element markers are placed in; it should cover the canvas and have `position: relative` or similar. */
    readonly container: HTMLElement;
    readonly camera: Camera3D;
}
/** Elements over the screen that follow points of the scene: add them, and update them each frame. */
export interface ScreenMarkers3D {
    readonly markers: readonly ScreenMarker3D[];
    /** The camera markers are projected through; may be replaced. */
    camera: Camera3D;
    /** Follows a target with `element`, which is appended to the container when it has no parent. */
    add(element: HTMLElement, options: ScreenMarkerOptions3D): ScreenMarker3D;
    /** Places every marker; call once a frame after the camera moved, before or after drawing. */
    update(): void;
    /** Takes every marker off. */
    dispose(): void;
}
/**
 * A layer of page elements that follow scene points. Each element is moved with a CSS transform, so give it
 * `position: absolute; left: 0; top: 0` and centre it with a negative margin or a translate of its own child.
 * A marker gets `data-on-edge` while clamped and `hidden` while its target is behind the camera without clamping.
 */
export declare function createScreenMarkers3D(options: ScreenMarkersOptions3D): ScreenMarkers3D;
//# sourceMappingURL=markers3D.d.ts.map