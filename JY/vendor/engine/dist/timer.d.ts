import type { Scope } from '@egret/runtime';
import type { Engine } from './Engine.js';
/** Calls a function every `delay` seconds, `repeatCount` times or until it is stopped, as Egret's Timer. */
export interface Timer {
    /** Seconds between calls. It can be changed while it runs; the next call comes that long after the last. */
    delay: number;
    /** How many calls in all before it completes; 0 for no end. */
    repeatCount: number;
    /** How many calls there have been since it was made or reset. */
    readonly currentCount: number;
    readonly running: boolean;
    /** Called each time, with the count so far. Several can be added; they are called in the order they were. */
    onTimer(callback: (count: number) => void): this;
    /** Called once, after the last call of a timer with a `repeatCount`. */
    onComplete(callback: () => void): this;
    start(): this;
    /** Stops it, keeping its count; `start` waits a whole delay again before the next call, as Egret's did. */
    stop(): this;
    /** Stops it and sets its count back to 0. */
    reset(): this;
}
/** A call to come: `cancel` takes it back if it has not been made. */
export interface Delayed {
    readonly done: boolean;
    cancel(): void;
}
/**
 * A timer: `createTimer(engine, scope, 1, 5).onTimer(n => …).onComplete(() => …).start()`. A frame longer than the
 * delay makes as many calls as the delay fits into it, so a count of seconds stays right however the frames fall.
 */
export declare function createTimer(engine: Engine, scope: Scope, delay: number, repeatCount?: number): Timer;
/** Calls a function once, `seconds` from now on the Engine's clock, as Egret's setTimeout. */
export declare function after(engine: Engine, scope: Scope, seconds: number, callback: () => void): Delayed;
//# sourceMappingURL=timer.d.ts.map