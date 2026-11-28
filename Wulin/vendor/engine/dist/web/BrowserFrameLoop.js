// SPDX-License-Identifier: Apache-2.0
import { EgretError } from '@egret/runtime';
const invalid = () => new EgretError('FRAME_LOOP_OPTIONS_INVALID');
const backpressure = (error) => {
    const cause = error?.cause;
    return typeof cause?.code === 'string' && cause.code.endsWith('_BACKPRESSURE');
};
/**
 * The frame loop of a game in a page. On each frame the display shows, it advances the Engine's clock, which moves
 * tweens and sequences, calls `update`, and draws one frame. It keeps a step short after the page was hidden, and it
 * skips a frame, without failing, while the Host has not finished the frames it holds.
 */
export function createBrowserFrameLoop(options) {
    if (options === null || typeof options !== 'object')
        throw invalid();
    const { engine, frame, host, update, shouldRender, beforeRender, onError, renderRetry, onFrameTiming } = options, limit = options.maxPendingFrames ?? 2;
    const request = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
    const cancel = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle));
    if (engine === null ||
        typeof engine !== 'object' ||
        typeof engine.advanceTime !== 'function' ||
        typeof engine.renderSharedFrame !== 'function' ||
        frame === undefined ||
        frame === null ||
        (host !== undefined && (host === null || typeof host !== 'object' || typeof host.getStatus !== 'function')) ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        (update !== undefined && typeof update !== 'function') ||
        (shouldRender !== undefined && typeof shouldRender !== 'function') ||
        (beforeRender !== undefined && typeof beforeRender !== 'function') ||
        (renderRetry !== undefined &&
            (renderRetry === null ||
                typeof renderRetry !== 'object' ||
                !Number.isSafeInteger(renderRetry.maxConsecutive) ||
                renderRetry.maxConsecutive < 1 ||
                renderRetry.maxConsecutive > 8 ||
                typeof renderRetry.shouldRetry !== 'function')) ||
        (onError !== undefined && typeof onError !== 'function') ||
        (onFrameTiming !== undefined && typeof onFrameTiming !== 'function') ||
        typeof request !== 'function' ||
        typeof cancel !== 'function')
        throw invalid();
    const clockLimit = engine.clock?.maxDeltaSeconds, asked = options.maxStepSeconds ?? 0.1, catchUp = options.catchUpSeconds ?? 0;
    if (typeof clockLimit !== 'number' ||
        !(clockLimit > 0) ||
        typeof asked !== 'number' ||
        !(asked > 0) ||
        typeof catchUp !== 'number' ||
        !(catchUp >= 0) ||
        !Number.isFinite(catchUp))
        throw invalid();
    const maxStep = Math.min(asked, clockLimit);
    // Steps of one long frame are capped too, so a stalled page cannot spend a frame catching up forever.
    const maxStepsPerFrame = Math.max(1, Math.ceil(Math.max(catchUp, maxStep) / maxStep));
    let state = 'idle', handle, last;
    const retryLimit = renderRetry?.maxConsecutive ?? 0;
    const shouldRetry = renderRetry?.shouldRetry;
    let consecutiveRenderFailures = 0, recoveredRenderFailures = 0;
    let timingId = 0;
    let seconds = 0, steps = 0, frames = 0, skipped = 0, failure;
    const currentTick = () => state === 'running' && handle === undefined;
    const isClosed = () => state === 'closed';
    const tick = (milliseconds) => {
        handle = undefined;
        if (state !== 'running')
            return;
        const started = onFrameTiming === undefined ? 0 : performance.now();
        const durations = onFrameTiming === undefined
            ? undefined
            : { updateMs: 0, decisionMs: 0, hostCheckMs: 0, prepareMs: 0, renderMs: 0 };
        let phase = 'updateMs', phaseStart = started;
        let outcome = 'interrupted', observedPending;
        const nextPhase = durations === undefined
            ? undefined
            : (next) => {
                const now = performance.now();
                if (phase !== undefined)
                    durations[phase] += now - phaseStart;
                phase = next;
                phaseStart = now;
            };
        try {
            // The clock is given the loop's own seconds, which never jump. A long gap counts as one step of the longest
            // length, or, with catchUpSeconds, as several such steps up to that much time.
            const gap = last === undefined ? 0 : Math.max(0, (milliseconds - last) / 1000);
            last = milliseconds;
            let owed = catchUp > 0 ? Math.min(gap, Math.max(catchUp, maxStep)) : Math.min(gap, maxStep);
            for (let step = 0; step < maxStepsPerFrame; step++) {
                const delta = Math.min(maxStep, owed);
                owed -= delta;
                seconds += delta;
                engine.advanceTime(seconds);
                steps++;
                if (!currentTick())
                    return;
                update?.(delta);
                // The update may have stopped or disposed the loop.
                if (!currentTick())
                    return;
                if (!(owed > 1e-9))
                    break;
            }
            nextPhase?.('decisionMs');
            const wantsFrame = shouldRender?.() ?? true;
            if (!currentTick())
                return;
            if (wantsFrame) {
                nextPhase?.('hostCheckMs');
                const pending = host?.getStatus().pendingFrames;
                observedPending = pending;
                if (!currentTick())
                    return;
                if (pending !== undefined && pending >= limit) {
                    skipped++;
                    outcome = 'backpressure';
                    nextPhase?.();
                }
                else {
                    nextPhase?.('prepareMs');
                    beforeRender?.();
                    if (!currentTick())
                        return;
                    const optionsForFrame = typeof frame === 'function' ? frame() : frame;
                    if (!currentTick())
                        return;
                    nextPhase?.('renderMs');
                    try {
                        engine.renderSharedFrame(optionsForFrame);
                        nextPhase?.();
                        outcome = 'rendered';
                        frames++;
                        consecutiveRenderFailures = 0;
                    }
                    catch (error) {
                        nextPhase?.();
                        if (host === undefined && backpressure(error)) {
                            skipped++;
                            outcome = 'backpressure';
                        }
                        else {
                            const attempt = consecutiveRenderFailures + 1;
                            let retry = false;
                            if (shouldRetry !== undefined && attempt <= retryLimit) {
                                try {
                                    retry = shouldRetry(error, attempt) === true;
                                }
                                catch (decisionError) {
                                    throw new EgretError('FRAME_LOOP_RENDER_RETRY_FAILED', {
                                        cause: new AggregateError([error, decisionError], 'Render retry decision failed')
                                    });
                                }
                            }
                            if (!currentTick())
                                return;
                            if (!retry)
                                throw error;
                            consecutiveRenderFailures = attempt;
                            recoveredRenderFailures++;
                            outcome = 'retry';
                        }
                    }
                }
            }
            else {
                outcome = 'retained';
                nextPhase?.();
            }
            if (state === 'running' && handle === undefined)
                handle = request(tick);
        }
        catch (error) {
            nextPhase?.();
            outcome = 'failed';
            // A callback may have disposed the loop or explicitly queued a restart
            // before throwing. An error must not resurrect disposal or leave that request live.
            if (!isClosed())
                state = 'failed';
            const queued = handle;
            handle = undefined;
            let reported = error;
            if (queued !== undefined) {
                try {
                    cancel(queued);
                }
                catch (cancelError) {
                    reported = new EgretError('FRAME_LOOP_CANCEL_FAILED', {
                        cause: new AggregateError([error, cancelError], 'Frame failure and queued-request cancellation failed')
                    });
                }
            }
            failure = reported;
            if (onError === undefined)
                throw reported;
            onError(reported);
        }
        finally {
            if (onFrameTiming !== undefined && durations !== undefined) {
                nextPhase?.();
                const sample = Object.freeze({
                    id: ++timingId,
                    rafTimestampMs: milliseconds,
                    callbackStartMs: started,
                    callbackEndMs: performance.now(),
                    ...durations,
                    outcome,
                    ...(observedPending === undefined ? {} : { pendingFrames: observedPending })
                });
                try {
                    onFrameTiming(sample);
                }
                catch {
                    /* Diagnostics never change clock or rendering outcomes. */
                }
            }
        }
    };
    const stop = () => {
        if (handle !== undefined) {
            cancel(handle);
            handle = undefined;
        }
        if (state === 'running')
            state = 'idle';
    };
    const loop = {
        get state() {
            return state;
        },
        start() {
            if (state === 'closed')
                throw new EgretError('FRAME_LOOP_CLOSED');
            if (state === 'running')
                return;
            // What stopped the loop is forgotten when it is started again; the gap since it ran is not a step.
            state = 'running';
            failure = undefined;
            consecutiveRenderFailures = 0;
            last = undefined;
            handle = request(tick);
        },
        stop,
        snapshot: () => Object.freeze({
            state,
            steps,
            frames,
            skipped,
            seconds,
            failure,
            ...(renderRetry === undefined ? {} : { recoveredRenderFailures })
        }),
        dispose() {
            stop();
            state = 'closed';
        }
    };
    return Object.freeze(loop);
}
