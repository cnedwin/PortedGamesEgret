import type { Disposable } from '@egret/contracts';
import type { SequencePlaybackMode, SequenceSample } from '@egret/runtime';
/** Whether a sequence playback is idle, running, paused, completed, stopped or failed. */
export type SequencePlaybackState = 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'failed';
/** Whether a sequence plays once or loops. */
export interface SequencePlaybackOptions {
    readonly mode?: SequencePlaybackMode;
}
declare const sequencePlaybackBrand: unique symbol;
/** A sequence playing on the game clock: start, pause, resume and stop it, and read its last sample. */
export interface SequencePlayback extends Disposable {
    readonly [sequencePlaybackBrand]: true;
    readonly state: SequencePlaybackState;
    readonly isDisposed: boolean;
    readonly elapsedSeconds: number;
    readonly lastSample: SequenceSample | undefined;
    start(): void;
    pause(): void;
    resume(): void;
    stop(): void;
    dispose(): void;
}
export {};
//# sourceMappingURL=sequencePlaybackTypes.d.ts.map