import { AnimationClip3D, AnimationMixer3D, type AnimationAction3D } from './Animation3D.js';
import { type Material3D } from './Material3D.js';
import { Bone3D, Mesh3D, Skeleton3D } from './Mesh3D.js';
import { Object3D } from './Object3D.js';
import { SdfShape3D, type SdfMeshOptions3D } from './Sdf3D.js';
type Vec3 = readonly [number, number, number];
/** A bone of a rig: where it turns, what it moves, and the bone it hangs from. */
export interface SdfBone3D {
    /** Its name, by which clips move it. A pair made by `mirror` is named `name.L` (on +x) and `name.R`. */
    readonly name: string;
    /** The bone it hangs from, moving with it; the rig's root unless given. A pair hangs from the parent of its side. */
    readonly parent?: string;
    /** The joint, in the model's coordinates: where the bone turns, such as a shoulder or a hip. */
    readonly at: Vec3;
    /** The shapes this bone moves: the vertices nearest them follow it. A bone without parts only carries others. */
    readonly parts?: SdfShape3D | readonly SdfShape3D[];
    /** 'x' makes a pair from one side: `at` and `parts` on +x for `name.L`, mirrored across x for `name.R`. */
    readonly mirror?: 'x';
}
/** How a rig is made: the options of its mesh, its material, and how wide a joint bends. */
export interface SdfRigOptions3D extends SdfMeshOptions3D {
    /** The mesh's material; a standard one with vertex colours unless given. */
    readonly material?: Material3D;
    /**
     * How far, in the model's units, the skin at a joint is shared between the bones on either side: a fiftieth of the
     * model's size unless given. Larger bends more softly; smaller keeps parts stiff up to the joint.
     */
    readonly blend?: number;
}
/** A pose key: a time in seconds, the bone's turn as Euler angles in radians, and optionally how far it moves. */
export type SdfPoseKey3D = readonly [time: number, rotation: Vec3, offset?: Vec3];
/** A model that moves: its root to add to a scene, its skinned mesh, its bones by name, and its animation. */
export interface SdfRig3D {
    /** Add this to the scene and move it to move the model. */
    readonly root: Object3D;
    readonly mesh: Mesh3D;
    readonly bones: Readonly<Record<string, Bone3D>>;
    readonly skeleton: Skeleton3D;
    readonly mixer: AnimationMixer3D;
    /**
     * A clip from poses of named bones: `{ 'leg.L': [[0, [0.4, 0, 0]], [0.5, [-0.4, 0, 0]], [1, [0.4, 0, 0]]] }`. A
     * rotation is from the bone's rest pose; an offset moves it from where it rests. A clip loops cleanly when its last
     * key of each bone equals its first.
     */
    clip(name: string, duration: number, poses: Readonly<Record<string, readonly SdfPoseKey3D[]>>): AnimationClip3D;
    /** Plays a clip, fading out what was playing over `fade` seconds (0.2 unless given). */
    play(clip: AnimationClip3D, fade?: number): AnimationAction3D;
    /** Moves the animation on; call once a frame. */
    update(seconds: number): void;
}
/**
 * A rig of `shape`: its mesh, made as `createSdfGeometry3D` makes it, skinned to bones at the joints of the model.
 * Every vertex follows at most four bones, those whose parts are nearest it.
 */
export declare function createSdfRig3D(shape: SdfShape3D, bones: readonly SdfBone3D[], options?: SdfRigOptions3D): SdfRig3D;
export {};
//# sourceMappingURL=Rig3D.d.ts.map