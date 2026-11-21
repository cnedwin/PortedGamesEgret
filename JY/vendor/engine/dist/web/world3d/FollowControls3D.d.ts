import type { Disposable } from '@egret/contracts';
import type { Camera3D } from '../../rendering/world3d/Camera3D.js';
import { FollowCamera3D } from '../../rendering/world3d/Character3D.js';
import type { FollowCameraOptions3D } from '../../rendering/world3d/Character3D.js';
import type { Object3D } from '../../rendering/world3d/Object3D.js';
/** Follow controls to make: how fast they turn and zoom. */
export interface FollowControlsOptions3D extends FollowCameraOptions3D {
    /** Radians turned per pixel dragged. Defaults to 0.005. */
    readonly rotateSpeed?: number;
    /** Share of the distance changed per wheel notch. Defaults to 0.1. */
    readonly zoomSpeed?: number;
}
/** Turns and zooms a follow camera with the mouse and touch. */
export declare class FollowControls3D implements Disposable {
    #private;
    readonly element: HTMLElement;
    /** The camera rig; read `follow.yaw` or call `follow.moveDirection()` to steer a character relative to the view. */
    readonly follow: FollowCamera3D;
    rotateSpeed: number;
    zoomSpeed: number;
    enabled: boolean;
    constructor(camera: Camera3D, element: HTMLElement, target: Object3D | ArrayLike<number>, options?: FollowControlsOptions3D);
    /** Place the camera; call once per frame after moving the target. */
    update(deltaSeconds?: number): void;
    dispose(): void;
    private forgetPointer;
    private releaseCapture;
}
/** Makes follow controls for a follow camera on an element. */
export declare function createFollowControls3D(camera: Camera3D, element: HTMLElement, target: Object3D | ArrayLike<number>, options?: FollowControlsOptions3D): FollowControls3D;
//# sourceMappingURL=FollowControls3D.d.ts.map