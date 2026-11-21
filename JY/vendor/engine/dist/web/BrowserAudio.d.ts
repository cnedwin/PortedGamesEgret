import type { AudioBackend, AudioMixer, AudioMixerOptions } from '@egret/engine/audio';
/** Browser audio to make: its audio context, what unlocks it, whether it pauses when the page is hidden, and its limiter. */
export interface BrowserAudioOptions extends Omit<AudioMixerOptions, 'backend' | 'locked'> {
    /** An output the page made. It is used as it is and is not closed with the mixer. Without it one is made. */
    readonly context?: BaseAudioContext;
    /** Where the first touch or key of the person is listened for. Defaults to the document. */
    readonly unlockTarget?: EventTarget;
    /** Silence while the page is hidden. Defaults to true. */
    readonly pauseWhenHidden?: boolean;
    /**
     * Told what failed where nothing could be returned: in a listener of the page, or after the
     * output was asked to start or stop. Without it the failure is reported to the page.
     */
    readonly onError?: (cause: unknown) => void;
    /**
     * A limiter on the way out, so many sounds at once do not clip. `true` uses a gentle setting that leaves
     * ordinary transients alone; an object sets the compressor itself. Off by default.
     */
    readonly limiter?: boolean | BrowserAudioLimiter;
}
/** The compressor of the limiter, in its own units: decibels for threshold and knee, seconds for the times. */
export interface BrowserAudioLimiter {
    readonly threshold?: number;
    readonly knee?: number;
    readonly ratio?: number;
    readonly attack?: number;
    readonly release?: number;
}
/** The Web Audio half of browser sound alone: its output, what unlocks it, whether it pauses when hidden, its limiter. */
export interface WebAudioBackendOptions {
    readonly context?: BaseAudioContext;
    readonly unlockTarget?: EventTarget;
    readonly pauseWhenHidden?: boolean;
    readonly onError?: (cause: unknown) => void;
    readonly limiter?: boolean | BrowserAudioLimiter;
}
/**
 * A backend for `createAudioMixer` that plays through Web Audio. Give `locked` to the mixer as it is made, and then the
 * mixer to `attach`, so the lock follows the first touch and the sound pauses while the page is hidden.
 */
export interface WebAudioBackend extends AudioBackend {
    readonly context: BaseAudioContext;
    /** What every sound passes on its way out, once the mixer has made its master bus. */
    readonly output: AudioNode | undefined;
    /** Whether the output is waiting for the person to touch the page before it may sound. */
    readonly locked: boolean;
    /** The mixer made on this backend: its lock follows the output from now on. Once only. */
    attach(mixer: AudioMixer): void;
}
/** A sound mixer playing through Web Audio, with its context and output node. */
export interface BrowserAudio {
    readonly mixer: AudioMixer;
    readonly context: BaseAudioContext;
    /** What every sound passes on its way out. An analyser of the page can listen here. */
    readonly output: AudioNode;
    /** The same as disposing the mixer. A scope can own the sound of a game through this. */
    dispose(): void;
}
/**
 * A Web Audio backend for a mixer the page makes itself with `createAudioMixer`:
 *
 *     const backend = createWebAudioBackend();
 *     const mixer = createAudioMixer({ backend, locked: backend.locked });
 *     backend.attach(mixer);
 *
 * `createBrowserAudio` does these three steps in one call.
 */
export declare function createWebAudioBackend(options?: WebAudioBackendOptions): WebAudioBackend;
/**
 * Sound for a page on Web Audio. A page may not sound before the person has touched it: until
 * then the mixer is locked, music asked for waits, and the first touch or key lets it start.
 */
export declare function createBrowserAudio(options?: BrowserAudioOptions): BrowserAudio;
//# sourceMappingURL=BrowserAudio.d.ts.map