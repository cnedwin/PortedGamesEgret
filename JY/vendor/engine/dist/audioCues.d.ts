import type { AudioMixer, AudioSound, AudioVoice } from './audioTypes.js';
export interface AudioCueDefinition {
    /** The takes; one is chosen each time. */
    readonly sounds: readonly AudioSound[];
    /** Defaults to the mixer's effects bus. */
    readonly bus?: string;
    /** Volume, as one number or a range that each play picks within. Defaults to 1. */
    readonly volume?: number | readonly [number, number];
    /** Rate (pitch and speed), as one number or a range. Defaults to 1. */
    readonly rate?: number | readonly [number, number];
    /** Seconds that must pass before the cue sounds again; plays inside it are skipped. Defaults to 0. */
    readonly cooldown?: number;
    /** At most this many voices of the cue at once; the oldest gives its place. Defaults to 4. */
    readonly maxVoices?: number;
}
export interface AudioCuePlayOptions {
    /** Multiplies the cue's volume, as for distance. */
    readonly volume?: number;
    readonly pan?: number;
    /** Multiplies the chosen rate. */
    readonly rate?: number;
}
export interface AudioCues {
    /** Plays a take of the cue, or nothing when it is cooling down. */
    play(name: string, options?: AudioCuePlayOptions): AudioVoice | undefined;
    /** Stops every voice of a cue. */
    stop(name: string, fade?: number): void;
    readonly names: readonly string[];
}
export interface AudioCuesOptions {
    /** Seconds now; `performance.now()` by default. Tests and replays give their own clock. */
    readonly now?: () => number;
    /** Numbers from 0 to 1 for choosing takes and ranges; `Math.random` by default. */
    readonly random?: () => number;
}
/** Names the sound effects of a game over `mixer`. */
export declare function createAudioCues(mixer: AudioMixer, cues: Readonly<Record<string, AudioCueDefinition>>, options?: AudioCuesOptions): AudioCues;
/**
 * 16-bit PCM WAV bytes from channels of samples between -1 and 1, all the same length. The mixer decodes them
 * like a file, so sounds a game synthesised can be played, mixed and limited like recorded ones.
 */
export declare function encodeWav(channels: readonly Float32Array[], sampleRate: number): Uint8Array<ArrayBuffer>;
//# sourceMappingURL=audioCues.d.ts.map