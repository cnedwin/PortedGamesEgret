import type { Disposable } from '@egret/contracts';
import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import { TransformGizmo3D } from '../../rendering/world3d/Gizmo3D.js';
import type { GizmoMode3D, GizmoSpace3D, TransformGizmoOptions3D } from '../../rendering/world3d/Gizmo3D.js';
import type { Object3D } from '../../rendering/world3d/Object3D.js';
/** Drags a transform gizmo with the mouse and touch to move, turn or scale an object. */
export declare class TransformControls3D implements Disposable {
    #private;
    readonly camera: Camera3D;
    readonly element: HTMLElement;
    /** The handles; add this to the scene that holds the edited object. */
    readonly gizmo: TransformGizmo3D;
    /**
     * A press that lands on a handle is kept from orbit, fly and follow controls
     * on the same element, made before or after these: the handles listen in the
     * capture phase, which runs first. A press anywhere else reaches them.
     */
    constructor(camera: Camera3D, element: HTMLElement, options?: TransformGizmoOptions3D);
    get mode(): GizmoMode3D;
    set mode(value: GizmoMode3D);
    get space(): GizmoSpace3D;
    set space(value: GizmoSpace3D);
    get enabled(): boolean;
    set enabled(value: boolean);
    get dragging(): boolean;
    get object(): Object3D | undefined;
    attach(object: Object3D): this;
    detach(): this;
    /** Turn a pointer position into a world-space ray; false when the element has no size. */
    private ray;
    /** Keep the handles on the object and at a steady size; call once per frame. */
    update(): void;
    dispose(): void;
}
/** Makes transform controls for a camera on an element. */
export declare function createTransformControls3D(camera: Camera3D, element: HTMLElement, options?: TransformGizmoOptions3D): TransformControls3D;
//# sourceMappingURL=TransformControls3D.d.ts.map