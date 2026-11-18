import type { AudioMixer, AudioMixerOptions } from '@egret/engine/audio';
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
export interface BrowserAudio {
    readonly mixer: AudioMixer;
    readonly context: BaseAudioContext;
    /** What every sound passes on its way out. An analyser of the page can listen here. */
    readonly output: AudioNode;
    /** The same as disposing the mixer. A scope can own the sound of a game through this. */
    dispose(): void;
}
/**
 * Sound for a page on Web Audio. A page may not sound before the person has touched it: until
 * then the mixer is locked, music asked for waits, and the first touch or key lets it start.
 */
export declare function createBrowserAudio(options?: BrowserAudioOptions): BrowserAudio;
//# sourceMappingURL=BrowserAudio.d.ts.map