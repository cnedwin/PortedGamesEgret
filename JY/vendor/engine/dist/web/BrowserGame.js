// SPDX-License-Identifier: Apache-2.0
// A game in a page from one call: a Host chosen for the browser, an Engine, a scope, pointer and keyboard input and
// a frame loop, each made the way its own entry makes it, and all of them ended by one dispose.
import { EgretError } from '@egret/runtime';
import { createEngineForProfile, SHARED_FRAME_PROFILE_2D } from '@egret/engine';
import { createBrowserFrameLoop } from './loop.js';
import { createBrowserPointerInput } from './pointer.js';
import { createBrowserKeyboardInput } from './keyboard.js';
import { createBrowserStatsPanel } from './BrowserStatsPanel.js';
const invalid = () => new EgretError('BROWSER_GAME_OPTIONS_INVALID');
const whole = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
/** WebGPU where the browser has it and gives an adapter. Asking for an adapter does not touch the canvas, which can hold one kind of context only. */
async function chooseBackend(asked) {
    if (asked !== 'auto')
        return asked;
    const gpu = globalThis.navigator?.gpu;
    if (gpu === undefined || gpu === null)
        return 'webgl2';
    try {
        return (await gpu.requestAdapter()) ? 'webgpu' : 'webgl2';
    }
    catch {
        return 'webgl2';
    }
}
/**
 * Makes a game ready to draw: `await createBrowserGame({ canvas, width, height, update })`, then add display objects
 * to `game.stage`. Everything it makes is what the separate entries make; a game that outgrows it takes them apart.
 */
export async function createBrowserGame(options) {
    if (options === null || typeof options !== 'object')
        throw invalid();
    const { canvas, width, height, update, onError } = options;
    const asked = options.backend ?? 'auto', clearColor = options.clearColor ?? 0, clearAlpha = options.clearAlpha ?? 1;
    const device = Number(globalThis.devicePixelRatio), pixelRatio = options.pixelRatio ?? (device > 0 ? Math.min(device, 2) : 1);
    if (canvas === null || typeof canvas !== 'object' || typeof canvas.getBoundingClientRect !== 'function' || !whole(width) || !whole(height)
        || (asked !== 'auto' && asked !== 'webgpu' && asked !== 'webgl2') || typeof pixelRatio !== 'number' || !(pixelRatio > 0) || !Number.isFinite(pixelRatio)
        || !Number.isInteger(clearColor) || clearColor < 0 || clearColor > 0xffffff || typeof clearAlpha !== 'number' || !(clearAlpha >= 0 && clearAlpha <= 1)
        || (update !== undefined && typeof update !== 'function') || (onError !== undefined && typeof onError !== 'function')
        || [options.pointer, options.keyboard, options.autoStart, options.stats].some(flag => flag !== undefined && typeof flag !== 'boolean'))
        throw invalid();
    const backend = await chooseBackend(asked);
    // Only the chosen backend's module is loaded.
    const host = backend === 'webgpu' ? (await import('./webgpu.js')).createSharedWebGPUHost({ canvas, pixelRatio }) : (await import('./webgl2.js')).createSharedWebGL2Host({ canvas, pixelRatio });
    let engine;
    try {
        engine = await createEngineForProfile({ host }, SHARED_FRAME_PROFILE_2D);
    }
    catch (cause) {
        try {
            await host.close();
        }
        catch { /* The first failure is the one to tell. */ }
        throw cause;
    }
    let loop, stats, disposal;
    try {
        const scope = engine.createScope(), frame = Object.freeze({ width, height, clearColor, clearAlpha });
        const pointer = options.pointer === false ? undefined : createBrowserPointerInput({ engine, scope, width, height });
        const keyboard = options.keyboard === false ? undefined : createBrowserKeyboardInput({ engine, scope });
        const panel = stats = options.stats === true ? createBrowserStatsPanel({ canvas, label: backend }) : undefined;
        let drawn;
        // With a panel, the loop draws through a step that keeps the frame, and each step tells the panel what the last one did.
        const made = loop = panel === undefined
            ? createBrowserFrameLoop({ engine, host, frame, ...(update === undefined ? {} : { update }), ...(onError === undefined ? {} : { onError }) })
            : createBrowserFrameLoop({
                engine: { clock: engine.clock, advanceTime: (seconds) => engine.advanceTime(seconds), renderSharedFrame: (given) => drawn = engine.renderSharedFrame(given) },
                host, frame, ...(onError === undefined ? {} : { onError }),
                update(seconds) {
                    const now = made.snapshot();
                    panel.sample({ ...(drawn === undefined ? {} : { frame: drawn }), pendingFrames: host.getStatus().pendingFrames, frames: now.frames, skipped: now.skipped });
                    drawn = undefined;
                    update?.(seconds);
                },
            });
        const game = Object.freeze({
            backend, engine, stage: engine.stage, scope, frame, loop: made, pointer, keyboard, stats: panel,
            toStage(clientX, clientY) {
                const box = canvas.getBoundingClientRect();
                return { x: (clientX - box.left) * width / box.width, y: (clientY - box.top) * height / box.height };
            },
            dispose() {
                // The scope ends the input it was given; the Engine ends its scopes and its Host.
                return disposal ??= (async () => { made.dispose(); panel?.dispose(); await engine.dispose(); })();
            },
        });
        if (options.autoStart !== false)
            made.start();
        return game;
    }
    catch (cause) {
        loop?.dispose();
        stats?.dispose();
        try {
            await engine.dispose();
        }
        catch { /* The first failure is the one to tell. */ }
        throw cause;
    }
}
//# sourceMappingURL=BrowserGame.js.map