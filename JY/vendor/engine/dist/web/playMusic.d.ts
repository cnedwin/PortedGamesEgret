/** The moods there are. Each has its own key, harmony, tempo and parts. */
export type MusicMood = 'calm' | 'mystery' | 'tense' | 'battle' | 'triumph';
/** The moods play music can be made in. */
export declare const MUSIC_MOODS: readonly MusicMood[];
/** The parts of a piece, from the quietest moment to the most intense. */
export declare const MUSIC_PARTS: readonly ["pad", "bass", "drums", "tune"];
/** One part of a piece of play music. */
export type MusicPart = (typeof MUSIC_PARTS)[number];
/** Music to make: its mood, seed, tempo and length in bars. */
export interface MusicOptions {
    readonly mood?: MusicMood;
    /** The same seed writes the same piece. */
    readonly seed?: number | string;
    /** Beats a minute; the mood's own unless given, from 50 to 200. */
    readonly tempo?: number;
    /** Bars of four beats before the piece repeats: 4 or 8; 8 unless given. */
    readonly bars?: 4 | 8;
}
/** A piece of music made from a seed: its mood, tempo, length and parts. */
export interface MusicPiece {
    readonly mood: MusicMood;
    readonly tempo: number;
    readonly bars: number;
    readonly rate: number;
    readonly seconds: number;
    /** Each part as samples from -1 to 1, all of one length, each joining itself where it repeats. */
    readonly parts: Readonly<Record<MusicPart, Float32Array>>;
}
/** Writes a piece. Every call with the same options gives the same samples. */
export declare function composeMusic(options?: MusicOptions, rate?: number): MusicPiece;
/** How loud each part is at an intensity from 0 to 1: the pad always, then the bass, the drums and the tune. */
export declare function musicMix(intensity: number): Record<MusicPart, number>;
//# sourceMappingURL=playMusic.d.ts.map