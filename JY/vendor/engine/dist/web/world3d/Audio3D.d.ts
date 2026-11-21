import type { Disposable } from '@egret/contracts';
import { Object3D } from '../../rendering/world3d/Object3D.js';
/** An audio listener to make: its audio context and volume. */
export interface AudioListenerOptions3D {
    /** Reuse an existing context; otherwise one is created. */
    readonly context?: AudioContext;
    readonly volume?: number;
}
/** Ears of the scene. Attach it to the camera (or pass the camera to update()). */
export declare class AudioListener3D extends Object3D implements Disposable {
    #private;
    readonly context: AudioContext;
    /** Everything this listener hears passes through this gain. */
    readonly output: GainNode;
    constructor(options?: AudioListenerOptions3D);
    get volume(): number;
    set volume(value: number);
    /** Browsers start audio suspended until a user gesture; call this from one. */
    resume(): Promise<void>;
    /** Fetch and decode a sound file into a buffer that any number of sources can share. */
    load(url: string, signal?: AbortSignal): Promise<AudioBuffer>;
    /**
     * A buffer of samples made in code, for a sound synthesized rather than loaded: one array per channel, or one array
     * for mono, each value from -1 to 1, at `sampleRate` samples a second (default: the context's). Share it between
     * sources as a loaded buffer.
     */
    bufferFrom(samples: ArrayLike<number> | readonly ArrayLike<number>[], sampleRate?: number): AudioBuffer;
    /** @internal */ register(source: PositionalAudio3D): void;
    /** @internal */ unregister(source: PositionalAudio3D): void;
    /** Copy this node's world pose to the audio listener and every source's to its panner. */
    update(): void;
    dispose(): void;
}
/** A positional sound to make: its buffer and volume, how it fades with distance, its cone, rate, and whether it is spatial. */
export interface PositionalAudioOptions3D {
    readonly buffer?: AudioBuffer;
    readonly loop?: boolean;
    readonly volume?: number;
    /** Distance at which the volume starts to fall. */
    readonly refDistance?: number;
    /** Distance beyond which the volume no longer falls ('linear': reaches zero). */
    readonly maxDistance?: number;
    readonly rolloffFactor?: number;
    readonly distanceModel?: DistanceModelType;
    /** Cone, in degrees, for directional sources pointing along the node's -Z axis. */
    readonly coneInnerAngle?: number;
    readonly coneOuterAngle?: number;
    readonly coneOuterGain?: number;
    readonly playbackRate?: number;
    /** false plays without spatialization, for music and interface sounds. */
    readonly spatial?: boolean;
}
/** A sound placed in the scene. Each play() starts a fresh voice; several may overlap. */
export declare class PositionalAudio3D extends Object3D implements Disposable {
    #private;
    readonly listener: AudioListener3D;
    readonly gain: GainNode;
    readonly panner: PannerNode | undefined;
    buffer: AudioBuffer | undefined;
    loop: boolean;
    constructor(listener: AudioListener3D, options?: PositionalAudioOptions3D);
    get volume(): number;
    set volume(value: number);
    get isPlaying(): boolean;
    /** The speed and pitch of the voices: set, it changes the voices playing now as well as those to come. */
    get playbackRate(): number;
    set playbackRate(value: number);
    /**
     * Changes the speed and pitch of every voice, playing or to come, gliding over `rampSeconds` (default 0, at once): an
     * engine's note following its speed.
     */
    setPlaybackRate(rate: number, rampSeconds?: number): void;
    /** Start a voice after `delaySeconds`, from `offsetSeconds` into the buffer. */
    play(delaySeconds?: number, offsetSeconds?: number): AudioBufferSourceNode;
    /** Stop every voice of this source. */
    stop(): void;
    /** @internal Copy the node's world pose to the panner. */
    updatePanner(): void;
    dispose(): void;
}
/** Makes the listener 3D sounds are heard by, usually on the camera. */
export declare function createAudioListener3D(options?: AudioListenerOptions3D): AudioListener3D;
/** Makes a sound that plays from a place in the scene. */
export declare function createPositionalAudio3D(listener: AudioListener3D, options?: PositionalAudioOptions3D): PositionalAudio3D;
//# sourceMappingURL=Audio3D.d.ts.map