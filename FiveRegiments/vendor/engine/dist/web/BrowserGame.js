// SPDX-License-Identifier: Apache-2.0
// A game in a page from one call: a Host chosen for the browser, an Engine, a scope, pointer and keyboard input and
// a frame loop, each made the way its own entry makes it, and all of them ended by one dispose.
import { EgretError } from '@egret/runtime';
import { createEngineForProfile, SHARED_FRAME_PROFILE_2D } from '@egret/engine';
import { createBrowserTextWork } from './browserTextWork.js';
import { createBrowserStaticLayers } from './browserStaticLayers.js';
import { createGameTextures } from './BrowserGameTextures.js';
import { createGameFrameUsage } from './browserGameFrameUsage.js';
import { createTextRasterCache } from '@egret/engine/text';
import { createGameLabels } from './browserGameLabels.js';
import { createBrowserFrameLoop } from './loop.js';
import { createBrowserPointerInput } from './pointer.js';
import { createBrowserKeyboardInput } from './keyboard.js';
import { createBrowserStatsPanel } from './BrowserStatsPanel.js';
import { planScreen } from './screen.js';
import { fitGameCanvas } from './browserGameScreen.js';
const GAME_FITS = [
    'none',
    'contain',
    'cover',
    'stretch',
    'expand',
    'fixedWidth',
    'fixedHeight',
    'fixedNarrow',
    'fixedWide'
];
/** The fits of which the stage follows the plan of the screen, its size included. */
const plannedFit = (fit) => fit === 'none' || fit === 'cover' || fit === 'stretch' ? undefined : fit;
const invalid = () => new EgretError('BROWSER_GAME_OPTIONS_INVALID');
const whole = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
// WebKit may discard a one-off frame or stop presenting after a backing resize. Chromium also advertises
// AppleWebKit in its compatibility UA; these presentation policies apply only to WebKit.
function isWebKitBrowser() {
    const userAgent = globalThis.navigator?.userAgent ?? '';
    return /AppleWebKit\//.test(userAgent) && !/(?:Chrome|Chromium|Edg|OPR|SamsungBrowser)\//.test(userAgent);
}
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
/** Tells a tool's `globalThis.__egretAgent.warning`, where a page has one, of a warning; what it throws is the tool's. */
function tellAgent(warning) {
    const agent = globalThis.__egretAgent;
    if (typeof agent?.warning !== 'function')
        return;
    try {
        agent.warning(warning);
    }
    catch {
        /* The tool's own failure, not the game's. */
    }
}
/**
 * What a game does with the diagnostics of its Engine. An error the Engine can only report, such as a listener of
 * pointer input that threw, which ends that input, is told as a failure of the loop is: to `onError`, or to the page,
 * where the console shows it. Without this it was told to no one, and the game went on without its input.
 */
export function gameDiagnostics(onError) {
    return diagnostic => {
        if (diagnostic.severity !== 'error')
            return;
        const error = diagnostic.cause ?? new EgretError(diagnostic.code);
        if (onError !== undefined) {
            onError(error);
            return;
        }
        const tell = globalThis.reportError;
        if (typeof tell === 'function')
            tell(error);
        // A page without reportError still shows a promise that nothing handled.
        else
            void Promise.reject(error);
    };
}
/**
 * The options of a game, read in the order they always were and refused together with `BROWSER_GAME_OPTIONS_INVALID`
 * before anything is made. The plan of the stage is refused here too, when the portrait size or the insets are not
 * valid; each plan reads the options it needs again.
 */
function readGameOptions(options) {
    if (options === null || typeof options !== 'object')
        throw invalid();
    const { canvas, width, height, update, onError, onWarning, onFrameTiming } = options;
    const asked = options.backend ?? 'auto', clearColor = options.clearColor ?? 0, clearAlpha = options.clearAlpha ?? 1, blendSpace = options.blendSpace ?? 'linear', enableEffects = options.effects ?? false, renderMode = options.renderMode ?? 'continuous';
    const deviceRatio = () => {
        const ratio = Number(globalThis.devicePixelRatio);
        return ratio > 0 && Number.isFinite(ratio) ? ratio : 1;
    };
    const wholeScale = options.wholeScale ?? false, pixelRatio = options.pixelRatio ?? (wholeScale ? 1 : Math.min(deviceRatio(), 2));
    if (canvas === null ||
        typeof canvas !== 'object' ||
        typeof canvas.getBoundingClientRect !== 'function' ||
        !whole(width) ||
        !whole(height) ||
        (asked !== 'auto' && asked !== 'webgpu' && asked !== 'webgl2') ||
        typeof pixelRatio !== 'number' ||
        !(pixelRatio > 0) ||
        !Number.isFinite(pixelRatio) ||
        !Number.isInteger(clearColor) ||
        clearColor < 0 ||
        clearColor > 0xffffff ||
        typeof clearAlpha !== 'number' ||
        !(clearAlpha >= 0 && clearAlpha <= 1) ||
        (blendSpace !== 'linear' && blendSpace !== 'srgb') ||
        typeof enableEffects !== 'boolean' ||
        (renderMode !== 'continuous' && renderMode !== 'on-demand') ||
        (options.textWorkBudgetMs !== undefined &&
            (!Number.isFinite(options.textWorkBudgetMs) || options.textWorkBudgetMs <= 0 || options.textWorkBudgetMs > 16)) ||
        (options.textWorkBudgetWhen !== undefined &&
            (options.textWorkBudgetMs === undefined || typeof options.textWorkBudgetWhen !== 'function')) ||
        (options.webgl2PageBatching !== undefined &&
            options.webgl2PageBatching !== 'single-page' &&
            options.webgl2PageBatching !== 'multi-page') ||
        (options.uiScale !== undefined && (plannedFit(options.fit ?? 'none') === undefined || wholeScale)) ||
        (update !== undefined && typeof update !== 'function') ||
        (onError !== undefined && typeof onError !== 'function') ||
        (options.beforeRender !== undefined && typeof options.beforeRender !== 'function') ||
        (options.afterFrame !== undefined && typeof options.afterFrame !== 'function') ||
        (onFrameTiming !== undefined && typeof onFrameTiming !== 'function') ||
        (options.measureSharedFrames !== undefined && typeof options.measureSharedFrames !== 'boolean') ||
        (options.renderRetry !== undefined &&
            (options.renderRetry === null ||
                typeof options.renderRetry !== 'object' ||
                !Number.isSafeInteger(options.renderRetry.maxConsecutive) ||
                options.renderRetry.maxConsecutive < 1 ||
                options.renderRetry.maxConsecutive > 8 ||
                typeof options.renderRetry.shouldRetry !== 'function')) ||
        (onWarning !== undefined && typeof onWarning !== 'function') ||
        [options.pointer, options.keyboard, options.hover, options.autoStart, options.stats, options.staticLayers].some(flag => flag !== undefined && typeof flag !== 'boolean') ||
        !GAME_FITS.includes(options.fit ?? 'none') ||
        typeof wholeScale !== 'boolean' ||
        (wholeScale && (plannedFit(options.fit ?? 'none') === undefined || pixelRatio !== 1)) ||
        (options.fitTo !== undefined && (options.fitTo === null || typeof options.fitTo !== 'object')))
        throw invalid();
    const planFor = (box, insets) => planScreen({
        box,
        design: { width, height },
        ...(options.portrait === undefined ? {} : { portrait: options.portrait }),
        fit: plannedFit(options.fit ?? 'none') ?? 'contain',
        ...(wholeScale ? { wholeScale, pixelRatio: deviceRatio() } : {}),
        ...(insets === undefined ? {} : { insets }),
        ...(options.uiScale === undefined ? {} : { uiScale: options.uiScale })
    });
    try {
        planFor({ width, height }, options.insets);
    }
    catch {
        throw invalid();
    }
    return {
        canvas,
        width,
        height,
        update,
        onError,
        onWarning,
        onFrameTiming,
        asked,
        clearColor,
        clearAlpha,
        blendSpace,
        enableEffects,
        renderMode,
        wholeScale,
        pixelRatio,
        planFor
    };
}
/**
 * Makes a game ready to draw: `await createBrowserGame({ canvas, width, height, update })`, then add display objects
 * to `game.stage`. Everything it makes is what the separate entries make; a game that outgrows it takes them apart.
 */
export async function createBrowserGame(options) {
    const started = performance.now();
    const { canvas, width, height, update, onError, onWarning, onFrameTiming, asked, clearColor, clearAlpha, blendSpace, enableEffects, renderMode, wholeScale, pixelRatio, planFor } = readGameOptions(options);
    let screen = planFor({ width, height });
    const backend = await chooseBackend(asked), backendReady = performance.now();
    // Measure the selected module and native host separately. Neither needs to load the other backend.
    let moduleReady = backendReady;
    const host = backend === 'webgpu'
        ? await import('./webgpu.js').then(module => {
            moduleReady = performance.now();
            return module.createSharedWebGPUHost({
                canvas,
                pixelRatio,
                blendSpace,
                enableEffects,
                ...(options.staticLayers === true ? { enableLayers: true } : {})
            });
        })
        : await import('./webgl2.js').then(module => {
            moduleReady = performance.now();
            return module.createSharedWebGL2Host({
                canvas,
                pixelRatio,
                blendSpace,
                enableEffects,
                ...(isWebKitBrowser()
                    ? { presentationResize: 'stable', ...(renderMode === 'on-demand' ? { preserveDrawingBuffer: true } : {}) }
                    : {}),
                ...(options.measureSharedFrames === undefined ? {} : { measureSharedFrames: options.measureSharedFrames }),
                ...(options.webgl2PageBatching === undefined ? {} : { pageBatching: options.webgl2PageBatching })
            });
        });
    const hostCreated = performance.now();
    const staticCache = options.staticLayers === true && 'createSharedLayer2D' in host ? createBrowserStaticLayers(host) : undefined;
    let engine;
    try {
        engine = await createEngineForProfile({ host: staticCache?.adapter ?? host, onDiagnostic: gameDiagnostics(onError) }, SHARED_FRAME_PROFILE_2D);
    }
    catch (cause) {
        try {
            await host.close();
        }
        catch {
            /* The first failure is the one to tell. */
        }
        throw cause;
    }
    const engineOpened = performance.now();
    const webgl2Startup = 'getStartupTiming' in host ? host.getStartupTiming() : undefined;
    let ready = engineOpened, firstSubmit;
    let loop, stats, disposal;
    try {
        const scope = engine.createScope(), initialFrame = Object.freeze({ width, height, clearColor, clearAlpha });
        const textWork = options.textWorkBudgetMs === undefined
            ? undefined
            : scope.use(createBrowserTextWork(options.textWorkBudgetMs, options.textWorkBudgetWhen));
        const scheduleTextWork = textWork?.schedule;
        let frame = initialFrame;
        const revision = renderMode === 'on-demand' ? engine.watchDisplayRevision(scope) : undefined;
        let lastFrame, lastScreen, lastRevision = -1, lastLayerRevision = -1, lastGeneration = -1, redraw = 0, shownRedraw = -1;
        const invalidate = () => {
            if (revision !== undefined)
                redraw++;
        };
        const frameNow = () => frame;
        const stageSize = () => frame;
        const pointer = options.pointer === false
            ? undefined
            : createBrowserPointerInput({ engine, scope, width, height, size: stageSize });
        const keyboard = options.keyboard === false ? undefined : createBrowserKeyboardInput({ engine, scope });
        const hover = options.hover === true
            ? scope.use((await import('./hover.js')).createBrowserHoverInput({
                engine,
                scope,
                canvas,
                width,
                height,
                size: stageSize,
                ...(onError === undefined ? {} : { onError })
            }))
            : undefined;
        const panel = (stats = options.stats === true ? createBrowserStatsPanel({ canvas, label: backend }) : undefined);
        let drawn;
        let lastDrawAccepted = false;
        const warn = (warning) => {
            tellAgent(Object.freeze(warning));
            if (onWarning === undefined)
                return;
            try {
                onWarning(Object.freeze(warning));
            }
            catch (cause) {
                // A warning handler that throws stops the game, as an update that throws does.
                made.stop();
                if (onError === undefined)
                    throw cause;
                onError(cause);
            }
        };
        // What the last frame drawn held of a frame's images, and the frames not drawn for holding more.
        const frameUsage = createGameFrameUsage(warn);
        // Each frame is drawn through this, which ends the labels whose display is gone, keeps the frame for the usage and
        // the panel, and lets a frame that holds more images than a frame may go undrawn, with a warning, rather than stop
        // the game.
        const drawFrame = (given) => {
            // Only the running on-demand loop prepares labels before deciding whether to draw. External draws
            // (including Play, whose own clock drives this game) must still perform that maintenance here.
            if (revision === undefined || loop?.state !== 'running') {
                labels.sweep();
                labels.waitAtlas();
            }
            const pending = redraw, nextRevision = revision?.revision, nextLayer = staticCache?.api.revision ?? 0, nextScreen = screen, nextGeneration = revision === undefined ? -1 : host.getSessionStatus().generation;
            {
                let frame;
                try {
                    frame = engine.renderSharedFrame(given);
                }
                catch (cause) {
                    if (!(cause instanceof EgretError) || cause.code !== 'FRAME_IMAGE_BUDGET')
                        throw cause;
                    frameUsage.refuse(cause);
                    return undefined;
                }
                drawn = frame;
                if (firstSubmit === undefined)
                    firstSubmit = performance.now();
                // A refused frame leaves the dirty request pending; a late mutation after capture is not acknowledged.
                if (nextRevision !== undefined) {
                    lastFrame = given;
                    lastScreen = nextScreen;
                    lastRevision = nextRevision;
                    lastLayerRevision = nextLayer;
                    lastGeneration = nextGeneration;
                    shownRedraw = pending;
                }
                frameUsage.measure(frame);
                return frame;
            }
        };
        const drawing = {
            clock: engine.clock,
            advanceTime: (seconds) => engine.advanceTime(seconds),
            renderSharedFrame: onFrameTiming === undefined
                ? drawFrame
                : (given) => {
                    const result = drawFrame(given);
                    lastDrawAccepted = result !== undefined;
                    return result;
                }
        };
        // With a panel, each step tells it what the last one did.
        const made = (loop = createBrowserFrameLoop({
            engine: drawing,
            host,
            frame: frameNow,
            ...(revision === undefined
                ? {}
                : {
                    shouldRender: () => {
                        // Raster packing/disposal is work that must settle even when a static frame is retained.
                        labels.sweep();
                        labels.waitAtlas();
                        return (lastRevision !== revision.revision ||
                            lastLayerRevision !== (staticCache?.api.revision ?? 0) ||
                            lastGeneration !== host.getSessionStatus().generation ||
                            shownRedraw !== redraw ||
                            lastFrame !== frame ||
                            lastScreen !== screen);
                    }
                }),
            ...(onFrameTiming === undefined
                ? {}
                : {
                    onFrameTiming: (sample) => {
                        const outcome = sample.outcome === 'rendered' ? (lastDrawAccepted ? 'submitted' : 'refused') : sample.outcome;
                        onFrameTiming(Object.freeze({ ...sample, outcome }));
                    }
                }),
            ...(options.beforeRender === undefined ? {} : { beforeRender: options.beforeRender }),
            ...(options.afterFrame === undefined ? {} : { afterFrame: options.afterFrame }),
            ...(options.renderRetry === undefined ? {} : { renderRetry: options.renderRetry }),
            ...(onError === undefined ? {} : { onError }),
            update(seconds) {
                if (panel !== undefined) {
                    const now = made.snapshot();
                    panel.sample({
                        ...(drawn === undefined ? {} : { frame: drawn }),
                        pendingFrames: host.getStatus().pendingFrames,
                        drawCalls: host.getFrameDrawCalls(),
                        frames: now.frames,
                        skipped: now.skipped
                    });
                }
                drawn = undefined;
                update?.(seconds);
            }
        }));
        // Images the game loads, and pixels painted in code; each texture is leased for a scope.
        const textures = createGameTextures(engine, scope), leasePixels = textures.leasePixels;
        // The canvas in its element: sized now and whenever the element changes size. With the planned fits the
        // stage follows the plan of the screen: its size, and, with a portrait size, its shape.
        const screenListeners = new Set();
        const unfit = fitGameCanvas({
            canvas,
            holder: options.fitTo ?? canvas.parentElement,
            fit: options.fit ?? 'none',
            width,
            height,
            wholeScale,
            insets: options.insets,
            plan: planFor,
            current: () => screen,
            follow: next => {
                screen = next;
                if (next.width !== frame.width || next.height !== frame.height)
                    frame = Object.freeze({ width: next.width, height: next.height, clearColor, clearAlpha });
            },
            movedTo: next => {
                for (const listener of [...screenListeners])
                    listener(next);
            }
        });
        // Labels: one text cache for the Engine, made with the page's rasterizer when the first label is asked for.
        const labels = createGameLabels({
            engine,
            scope,
            pixelRatio,
            scheduleTextWork,
            page: () => canvas.ownerDocument,
            warn,
            leasePixels,
            openTextCache: adopt => import('./text.js').then(text => {
                const cache = createTextRasterCache(engine.assets, {
                    provider: text.createCanvasTextRasterProvider({
                        compatibility: 'game-labels',
                        ...(scheduleTextWork === undefined ? {} : { schedule: scheduleTextWork })
                    })
                });
                adopt(cache);
                return cache;
            }),
            // The two extra text paths load only on first use; ordinary labels keep the existing T1 provider and identity.
            loadParagraphs: () => import('./browserGameParagraph.js'),
            loadGlyphFont: () => import('./browserGameGlyphFont.js')
        });
        const game = Object.freeze({
            invalidate,
            getStartupTiming: () => Object.freeze({
                backendSelectMs: backendReady - started,
                backendModuleMs: moduleReady - backendReady,
                hostCreateMs: hostCreated - moduleReady,
                engineOpenMs: engineOpened - hostCreated,
                setupMs: ready - engineOpened,
                readyMs: ready - started,
                ...(firstSubmit === undefined ? {} : { firstSubmitMs: firstSubmit - started }),
                ...(webgl2Startup === undefined ? {} : { webgl2: webgl2Startup })
            }),
            backend,
            engine,
            host,
            ...(staticCache === undefined ? {} : { staticLayers: staticCache.api }),
            stage: engine.stage,
            scope,
            get frame() {
                return frame;
            },
            get screen() {
                return screen;
            },
            onScreenChange(listener) {
                if (typeof listener !== 'function')
                    throw invalid();
                screenListeners.add(listener);
                return () => {
                    screenListeners.delete(listener);
                };
            },
            loop: made,
            pointer,
            keyboard,
            hover,
            stats: panel,
            createLabel: labels.createLabel,
            ...(scheduleTextWork === undefined ? {} : { scheduleTextWork }),
            getLabelStatus() {
                return labels.status();
            },
            createAtlasLabel: labels.createAtlasLabel,
            createParagraphLabel: labels.createParagraphLabel,
            createGlyphFont: labels.createGlyphFont,
            getFrameUsage: () => frameUsage.current(),
            drawFrame,
            loadTexture: textures.loadTexture,
            textureFromPixels: (width, height, pixels) => leasePixels(width, height, pixels),
            textureFromCanvas: textures.textureFromCanvas,
            padHitArea(node, cssPixels = 44) {
                if (node === null ||
                    typeof node !== 'object' ||
                    typeof node.getBounds !== 'function' ||
                    !(typeof cssPixels === 'number' && cssPixels >= 0 && Number.isFinite(cssPixels)))
                    throw invalid();
                const drawn = node.getBounds(), box = canvas.getBoundingClientRect();
                const laidOut = box.width > 0 && box.height > 0;
                const halfX = (cssPixels / 2) * (laidOut ? frame.width / box.width : 1);
                const halfY = (cssPixels / 2) * (laidOut ? frame.height / box.height : 1);
                let wide = drawn.width, tall = drawn.height;
                if (cssPixels > 0) {
                    const cx = drawn.x + drawn.width / 2, cy = drawn.y + drawn.height / 2;
                    const center = node.localToGlobal(cx, cy);
                    try {
                        // Opposite corners are symmetric. Two adjacent corners give the local extents of the entire CSS square.
                        const top = node.globalToLocal(center.x + halfX, center.y - halfY);
                        const bottom = node.globalToLocal(center.x + halfX, center.y + halfY);
                        wide = Math.max(wide, 2 * Math.abs(top.x - cx), 2 * Math.abs(bottom.x - cx));
                        tall = Math.max(tall, 2 * Math.abs(top.y - cy), 2 * Math.abs(bottom.y - cy));
                    }
                    catch (cause) {
                        if (!(cause instanceof EgretError) || cause.code !== 'COORDINATE_TRANSFORM_SINGULAR')
                            throw cause;
                        // A collapsed node cannot receive a two-dimensional hit. Keep a finite area until it is laid out again.
                        const perCss = laidOut ? Math.max(frame.width / box.width, frame.height / box.height) : 1;
                        wide = Math.max(wide, (cssPixels * perCss) / (Math.abs(node.scaleX) || 1));
                        tall = Math.max(tall, (cssPixels * perCss) / (Math.abs(node.scaleY) || 1));
                    }
                }
                const area = Object.freeze({
                    x: drawn.x - (wide - drawn.width) / 2,
                    y: drawn.y - (tall - drawn.height) / 2,
                    width: wide,
                    height: tall
                });
                node.hitArea = area;
                return area;
            },
            get unitsPerCssPixel() {
                const box = canvas.getBoundingClientRect();
                // Before the page lays the canvas out, one unit is one pixel.
                return box.width > 0 && box.height > 0 ? Math.max(frame.width / box.width, frame.height / box.height) : 1;
            },
            toStage(clientX, clientY) {
                const box = canvas.getBoundingClientRect();
                return {
                    x: ((clientX - box.left) * frame.width) / box.width,
                    y: ((clientY - box.top) * frame.height) / box.height
                };
            },
            dispose() {
                // The scope ends the input it was given; the Engine ends its scopes and its Host.
                return (disposal ??= (async () => {
                    made.dispose();
                    panel?.dispose();
                    unfit();
                    screenListeners.clear();
                    // The scope ends the labels; then the cache they were drawn from can end, before the Engine does.
                    scope.dispose();
                    await labels.close();
                    await engine.dispose();
                    await textures.close();
                })());
            }
        });
        ready = performance.now();
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
        catch {
            /* The first failure is the one to tell. */
        }
        throw cause;
    }
}
