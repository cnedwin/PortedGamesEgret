/** The wave of a tone. `noise` is a new random level `from`..`to` times a second, which gives it a pitch. */
export type SfxWave = 'sine' | 'square' | 'saw' | 'triangle' | 'noise';
/** One tone of an effect. */
export interface SfxTone {
    /** `square` unless given. */
    readonly wave?: SfxWave;
    /** The pitch it starts at, in hertz, from 20 to 12000. */
    readonly from: number;
    /** The pitch it slides to. The same as `from` unless given. */
    readonly to?: number;
    /** How long it sounds, from 0.01 to 3 seconds. */
    readonly seconds: number;
    /** 0 to 1; 0.5 unless given. */
    readonly volume?: number;
    /** How fast it dies away: 0 holds its loudness to the end, 4 (the default) is a pluck, 10 a tick. */
    readonly decay?: number;
    /** White noise mixed into the wave, 0 to 1; 0 unless given. */
    readonly noise?: number;
    /**
     * Made to be looped: its ends are not eased, so a tone of whole waves joins itself without a click. Give it a
     * `decay` of 0 and a length of whole waves, as `hum` has: 110 hertz for 1 second is 110 waves.
     */
    readonly seamless?: boolean;
}
/** An effect: one tone, or several played one after another. */
export type SfxRecipe = SfxTone | readonly SfxTone[];
/** The effects every game is given, by name. */
export declare const SFX_PRESETS: Readonly<Record<string, SfxRecipe>>;
/** Whether a value is a recipe `synthesizeSfx` takes. */
export declare function isSfxRecipe(recipe: unknown): recipe is SfxRecipe;
/**
 * The samples of an effect, one channel, from -1 to 1. The same recipe and seed give the same samples, so an
 * effect can be checked without a sound card.
 */
export declare function synthesizeSfx(recipe: SfxRecipe, sampleRate?: number, seed?: number): Float32Array;
//# sourceMappingURL=playSfx.d.ts.map