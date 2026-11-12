import type { SceneLambertWorld3D, SceneWorld3D } from './sceneWorld3D.js';
type Vec3 = readonly [number, number, number];
type Quaternion = readonly [number, number, number, number];
type PlaybackMode = 'once' | 'loop';
type Interpolation = 'step' | 'linear';
interface TimedKey {
    readonly timeSeconds: number;
}
interface TimedTrack<Key extends TimedKey> {
    readonly interpolation: Interpolation;
    readonly keys: readonly Key[];
}
export interface SceneAnimationKey3D {
    readonly timeSeconds: number;
    readonly translation: Vec3;
    /** Quaternion in x, y, z, w order. */
    readonly rotation: Quaternion;
    readonly scale: Vec3;
}
export interface SceneAnimationTrackInput3D {
    readonly nodeId: string;
    readonly interpolation: Interpolation;
    readonly keys: readonly SceneAnimationKey3D[];
}
export interface SceneAnimationClipInput3D {
    readonly tracks: readonly SceneAnimationTrackInput3D[];
}
export interface SceneAnimationClip3D {
    readonly durationSeconds: number;
    sample(world: SceneLambertWorld3D, elapsedSeconds: number, mode?: PlaybackMode): SceneLambertWorld3D;
    sample(world: SceneWorld3D, elapsedSeconds: number, mode?: PlaybackMode): SceneWorld3D;
}
export interface ImportedSceneAnimationClip3D {
    readonly name?: string;
    readonly durationSeconds: number;
    sample(elapsedSeconds: number, mode?: PlaybackMode): SceneWorld3D;
}
export type SceneNodePose3D = Omit<SceneAnimationKey3D, 'timeSeconds'>;
export type SceneAnimationComponentTrack3D<Value> = TimedTrack<TimedKey & {
    readonly value: Value;
}>;
export interface ImportedSceneNodeTracks3D {
    readonly nodeId: string;
    readonly base: SceneNodePose3D;
    readonly translation?: SceneAnimationComponentTrack3D<Vec3>;
    readonly rotation?: SceneAnimationComponentTrack3D<Quaternion>;
    readonly scale?: SceneAnimationComponentTrack3D<Vec3>;
}
export declare function isAnimationTranslationInRange(value: Vec3): boolean;
export declare function isAnimationScaleInRange(value: Vec3): boolean;
export declare function hasMatchingAnimationScaleSigns(a: Vec3, b: Vec3): boolean;
export declare function matrixForSceneNodePose3D(pose: SceneNodePose3D): number[];
/** Tracks and base poses are owned and validated by the GLB reader before binding. */
export declare function bindImportedSceneAnimationClip3D(world: SceneWorld3D, tracks: readonly ImportedSceneNodeTracks3D[], durationSeconds: number, name?: string): ImportedSceneAnimationClip3D;
/** An owned rigid-node clip sampled with an explicit time and playback policy. */
export declare function createSceneAnimationClip3D(input: SceneAnimationClipInput3D): SceneAnimationClip3D;
export {};
//# sourceMappingURL=sceneAnimation3D.d.ts.map