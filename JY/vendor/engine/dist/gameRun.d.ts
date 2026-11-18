/** Quality tiers from lowest to highest, as World3D names them. */
export declare const QUALITY_TIERS: readonly ["low", "medium", "high"];
export type QualityTier = (typeof QUALITY_TIERS)[number];
/**
 * Of several variants of one asset, the one for `quality`: an exact tier, or else the nearest below, or else the
 * nearest above. `variants` maps tiers to anything: a URL, a bundle entry name, a loaded model.
 */
export declare function pickQualityVariant<T>(variants: Partial<Record<QualityTier, T>>, quality: QualityTier): T;
/**
 * Names of the form `<base>-<tier>.<ext>` grouped by base and chosen for `quality`, as a bundle or a folder lists
 * them: `hero-high.glb`, `hero-low.glb` and `hall.webp` give `hero-low.glb` (for `medium`) and `hall.webp`.
 */
export declare function pickQualityFiles(names: readonly string[], quality: QualityTier): string[];
/** What a headless run needs of a game: its state and one step of its rules. */
export interface HeadlessGame<Input> {
    /** One step of `seconds` with the stand-in player's input. */
    update(seconds: number, input: Input): void;
}
export interface HeadlessRunOptions<G extends HeadlessGame<Input>, Input> {
    /** A new game for a seed. */
    readonly createGame: (seed: number) => G;
    /** The stand-in player for that game: given the game and a step, it returns the input. */
    readonly createPlayer: (game: G, seed: number) => (seconds: number) => Input;
    /** True when the run is over, as when the game is won or lost. */
    readonly done: (game: G) => boolean;
    /** The seeds to play: a count from 1, or a list. Defaults to 1. */
    readonly seeds?: number | readonly number[];
    /** Seconds a step. Defaults to 1/60. */
    readonly step?: number;
    /** Game seconds after which a run is stopped as unfinished. Defaults to 1200. */
    readonly maxSeconds?: number;
    /** What to record of a finished game, such as its outcome and score. */
    readonly summary?: (game: G) => Record<string, unknown>;
    /** Milliseconds now; `performance.now()` by default. */
    readonly now?: () => number;
}
export interface HeadlessRunResult {
    readonly seed: number;
    /** False when the run reached `maxSeconds` without `done`. */
    readonly finished: boolean;
    readonly seconds: number;
    readonly steps: number;
    /** Milliseconds per step: the average and the slowest. */
    readonly averageMs: number;
    readonly slowestMs: number;
    readonly summary: Record<string, unknown>;
}
/** Plays the game once per seed with the stand-in player and reports each run. */
export declare function runHeadless<G extends HeadlessGame<Input>, Input>(options: HeadlessRunOptions<G, Input>): HeadlessRunResult[];
//# sourceMappingURL=gameRun.d.ts.map