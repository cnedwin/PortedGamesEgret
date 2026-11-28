import { EgretError } from '@egret/runtime';
import { World3DError } from '../../rendering/world3d/core3D.js';
/**
 * Host adapter that reserves `canvas` for one Engine. The world3d renderer
 * owns the WebGL context, so this host has no device to start or close.
 */
export function createWorld3DHost(canvas) {
    if (typeof canvas !== 'object' || canvas === null)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'canvas');
    return {
        surface: canvas,
        start() { },
        stop() { },
        async close() { },
        setTimeout(callback, delayMs) {
            const timer = setTimeout(callback, delayMs);
            return () => clearTimeout(timer);
        }
    };
}
/**
 * Advance the Engine clock once per display frame. A gap longer than the
 * clock's delta limit (a hidden tab, a long shader compile) re-anchors the
 * clock instead of producing one oversized step. Dispose the returned handle
 * before disposing the Engine. Failures stop the loop and go to `onError`
 * when given, otherwise they surface as uncaught errors.
 */
export function startWorld3DLoop(engine, onError, options = {}) {
    if (!engine || typeof engine.advanceTime !== 'function')
        throw new World3DError('WORLD3D_INPUT_INVALID', 'engine');
    if (!options ||
        typeof options !== 'object' ||
        (options.onFrameTiming !== undefined && typeof options.onFrameTiming !== 'function'))
        throw new World3DError('WORLD3D_INPUT_INVALID', 'loop options');
    const observer = options.onFrameTiming;
    let timingId = 0;
    let request = 0, stopped = false, previous;
    const reanchor = () => {
        engine.clock.pause();
        engine.clock.resume();
    };
    const frame = (milliseconds) => {
        if (stopped)
            return;
        const started = observer === undefined ? 0 : performance.now();
        request = requestAnimationFrame(frame);
        const seconds = milliseconds / 1000;
        const advanceStart = observer === undefined ? 0 : performance.now();
        let reanchored = false;
        let outcome = 'advanced';
        let ended;
        try {
            if (previous !== undefined && seconds - previous > engine.clock.maxDeltaSeconds) {
                reanchor();
                reanchored = true;
            }
            try {
                engine.advanceTime(seconds);
            }
            catch (cause) {
                // A restarted loop has no previous RAF timestamp. The Engine refuses an oversized first
                // sample before ticking, so only that refusal can be retried against a fresh anchor.
                if (previous !== undefined || !(cause instanceof EgretError) || cause.code !== 'CLOCK_DELTA_LIMIT')
                    throw cause;
                reanchor();
                reanchored = true;
                engine.advanceTime(seconds);
            }
            previous = seconds;
            if (observer !== undefined)
                ended = performance.now();
        }
        catch (cause) {
            if (observer !== undefined)
                ended = performance.now();
            outcome = 'failed';
            stopped = true;
            cancelAnimationFrame(request);
            if (!onError)
                throw cause;
            onError(cause);
        }
        finally {
            if (observer !== undefined) {
                const end = performance.now();
                try {
                    observer(Object.freeze({
                        id: ++timingId,
                        rafTimestampMs: milliseconds,
                        callbackStartMs: started,
                        callbackEndMs: end,
                        advanceMs: (ended ?? end) - advanceStart,
                        reanchored,
                        outcome
                    }));
                }
                catch {
                    /* Diagnostic only. */
                }
            }
        }
    };
    request = requestAnimationFrame(frame);
    return {
        dispose() {
            stopped = true;
            cancelAnimationFrame(request);
        }
    };
}
