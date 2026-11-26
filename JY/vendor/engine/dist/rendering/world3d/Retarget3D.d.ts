import { AnimationClip3D } from './Animation3D.js';
import type { Object3D } from './Object3D.js';
/** How a clip is moved to another skeleton: from where to where, which bones match, the root, scale and frame rate. */
export interface RetargetOptions3D {
    /** The rig the clip was made for, in its rest pose. */
    readonly source: Object3D;
    /** The rig to make a clip for, in its rest pose. */
    readonly target: Object3D;
    /** Target bone name to source bone name. Defaults to the same names, for every target bone the source has. */
    readonly bones?: Readonly<Record<string, string>>;
    /** The target bone that carries the travel, such as the hips; its source is found through `bones`. */
    readonly root?: string;
    /** Scale of the root's travel; by default the ratio of the two root bones' heights above the rig origin. */
    readonly scale?: number;
    /** Keys a second. Defaults to 30. */
    readonly fps?: number;
    readonly name?: string;
}
/** A clip for the target rig that moves it as `clip` moves the source rig. */
export declare function retargetAnimationClip3D(clip: AnimationClip3D, options: RetargetOptions3D): AnimationClip3D;
//# sourceMappingURL=Retarget3D.d.ts.map