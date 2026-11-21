// SPDX-License-Identifier: Apache-2.0
// Timers on the Engine's clock, for code that used Egret's Timer and setTimeout. They count the clock's seconds, so
// they stop while the clock is paused and keep pace with a game run by hand. A timer ends with its scope.
import { EgretError } from '@egret/runtime';
const invalid = () => new EgretError('TIMER_OPTIONS_INVALID');
/** The shortest delay: shorter ones would call more times in a frame than a frame should hold. */
const SHORTEST = 0.001;
const seconds = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < SHORTEST)
        throw invalid();
    return value;
};
const count = (value) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        throw invalid();
    return value;
};
/**
 * A timer: `createTimer(engine, scope, 1, 5).onTimer(n => …).onComplete(() => …).start()`. A frame longer than the
 * delay makes as many calls as the delay fits into it, so a count of seconds stays right however the frames fall.
 */
export function createTimer(engine, scope, delay, repeatCount = 0) {
    let every = seconds(delay), limit = count(repeatCount), done = 0, owed = 0, subscription;
    const ticks = [], ends = [];
    const halt = () => {
        subscription?.dispose();
        subscription = undefined;
    };
    const timer = {
        get delay() {
            return every;
        },
        set delay(value) {
            every = seconds(value);
        },
        get repeatCount() {
            return limit;
        },
        set repeatCount(value) {
            limit = count(value);
        },
        get currentCount() {
            return done;
        },
        get running() {
            return subscription !== undefined && !subscription.isDisposed;
        },
        onTimer(callback) {
            if (typeof callback !== 'function')
                throw invalid();
            ticks.push(callback);
            return timer;
        },
        onComplete(callback) {
            if (typeof callback !== 'function')
                throw invalid();
            ends.push(callback);
            return timer;
        },
        start() {
            if (timer.running || (limit > 0 && done >= limit))
                return timer;
            subscription = engine.clock.onTick(scope, tick => {
                owed += tick.deltaSeconds;
                // A callback may stop, reset or restart the timer, or change its delay.
                while (owed >= every && timer.running) {
                    owed -= every;
                    done++;
                    for (const callback of [...ticks])
                        callback(done);
                    if (limit > 0 && done >= limit && timer.running) {
                        halt();
                        owed = 0;
                        for (const callback of [...ends])
                            callback();
                    }
                }
                return undefined;
            });
            return timer;
        },
        stop() {
            halt();
            owed = 0;
            return timer;
        },
        reset() {
            halt();
            done = 0;
            owed = 0;
            return timer;
        }
    };
    return timer;
}
/** Calls a function once, `seconds` from now on the Engine's clock, as Egret's setTimeout. */
export function after(engine, scope, seconds, callback) {
    if (typeof callback !== 'function')
        throw invalid();
    let done = false;
    const timer = createTimer(engine, scope, seconds, 1)
        .onComplete(() => {
        done = true;
        callback();
    })
        .start();
    return {
        get done() {
            return done;
        },
        cancel() {
            if (!done) {
                done = true;
                timer.stop();
            }
        }
    };
}
//# sourceMappingURL=timer.js.map