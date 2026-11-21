import type { AtlasFrameLayout } from './atlasFrameLayout.js';
/** One frame of a sequence to make: its rectangle on the atlas, how long it shows, and its trim and rotation. */
export interface SequenceFrameInput {
    readonly layout?: AtlasFrameLayout;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly durationSeconds: number;
}
/** The atlas size and the frames of a sequence to make. */
export interface SequenceClipInput {
    readonly atlasWidth: number;
    readonly atlasHeight: number;
    readonly frames: readonly SequenceFrameInput[];
}
/** Whether a sequence plays once and stops on its last frame, or loops. */
export type SequencePlaybackMode = 'once' | 'loop';
/** Public immutable sequence metadata; authentic values come from createSequenceClip. */
export interface SequenceClip {
    readonly atlasWidth: number;
    readonly atlasHeight: number;
    readonly frameCount: number;
    readonly durationSeconds: number;
}
/** The rectangle of the atlas a sequence shows at one moment, with its trim and rotation. */
export interface SequenceRegion {
    readonly layout?: AtlasFrameLayout;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
/** What a sequence shows at a position: its frame and region, and whether it has reached its end or stopped. */
export interface SequenceSample {
    readonly frameIndex: number;
    readonly region: SequenceRegion;
    readonly positionSeconds: number;
    readonly atEnd: boolean;
    readonly stopped: boolean;
}
/** Checks and freezes a sequence from its atlas size and frames; malformed input is refused. */
export declare function createSequenceClip(input: unknown, profile?: 'trim-rotation-v1'): SequenceClip;
export declare function sampleSequenceClip(clip: SequenceClip, elapsedSeconds: number, options: {
    readonly mode: 'once' | 'loop';
    readonly stopAtSeconds?: number;
}): SequenceSample;
//# sourceMappingURL=sequenceClip.d.ts.map