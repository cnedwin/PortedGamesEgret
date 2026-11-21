/** Random numbers from a seed, repeatable: numbers, ranges, choices, shuffles and normal values. */
export interface Random {
    /** A number in [0, 1). */
    next(): number;
    /** A number in [min, max). */
    range(min: number, max: number): number;
    /** A whole number from min to max, both included. */
    int(min: number, max: number): number;
    /** True with probability `chance`, 0.5 by default. */
    chance(chance?: number): boolean;
    /** One item of a non-empty list. */
    pick<T>(items: readonly T[]): T;
    /** One item of a list, each as likely as its weight. */
    weighted<T>(items: readonly T[], weights: readonly number[]): T;
    /** The list in a new random order; the list itself is not changed. */
    shuffle<T>(items: readonly T[]): T[];
    /** A number around `mean` with the given spread, from a normal distribution. */
    normal(mean?: number, deviation?: number): number;
    /** A new generator seeded from this one, so one part of the game cannot change another's numbers. */
    fork(): Random;
    /** The state, to save and give to `createRandom` later. */
    state(): RandomState;
}
/** Four 32-bit words. */
export type RandomState = readonly [number, number, number, number];
/** Turns a string or number into a 32-bit seed. */
export declare function hashSeed(seed: string | number): number;
/** A generator from a seed (a number or string) or a saved state. */
export declare function createRandom(seed?: number | string | RandomState): Random;
//# sourceMappingURL=random.d.ts.map