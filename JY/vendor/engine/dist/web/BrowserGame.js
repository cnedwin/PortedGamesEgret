// SPDX-License-Identifier: Apache-2.0
// A game in a page from one call: a Host chosen for the browser, an Engine, a scope, pointer and keyboard input and
// a frame loop, each made the way its own entry makes it, and all of them ended by one dispose.
import { EgretError } from '@egret/runtime';
import { createAssetRef, createAssetType, createEngineForProfile, createImageData2D, createTexture, isTexture, SHARED_FRAME_PROFILE_2D } from '@egret/engine';
import { createBrowserTextureProvider } from './image.js';
import { createTextField, createTextRasterCache } from '@egret/engine/text';
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
 * Makes a game ready to draw: `await createBrowserGame({ canvas, width, height, update })`, then add display objects
 * to `game.stage`. Everything it makes is what the separate entries make; a game that outgrows it takes them apart.
 */
export async function createBrowserGame(options) {
    if (options === null || typeof options !== 'object')
        throw invalid();
    const { canvas, width, height, update, onError } = options;
    const asked = options.backend ?? 'auto', clearColor = options.clearColor ?? 0, clearAlpha = options.clearAlpha ?? 1, blendSpace = options.blendSpace ?? 'linear', enableEffects = options.effects ?? false;
    const device = Number(globalThis.devicePixelRatio), pixelRatio = options.pixelRatio ?? (device > 0 ? Math.min(device, 2) : 1);
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
        (update !== undefined && typeof update !== 'function') ||
        (onError !== undefined && typeof onError !== 'function') ||
        [options.pointer, options.keyboard, options.hover, options.autoStart, options.stats].some(flag => flag !== undefined && typeof flag !== 'boolean') ||
        !['none', 'contain', 'cover', 'stretch'].includes(options.fit ?? 'none') ||
        (options.fitTo !== undefined && (options.fitTo === null || typeof options.fitTo !== 'object')))
        throw invalid();
    const backend = await chooseBackend(asked);
    // Only the chosen backend's module is loaded.
    const host = backend === 'webgpu'
        ? (await import('./webgpu.js')).createSharedWebGPUHost({ canvas, pixelRatio, blendSpace, enableEffects })
        : (await import('./webgl2.js')).createSharedWebGL2Host({ canvas, pixelRatio, blendSpace, enableEffects });
    let engine;
    try {
        engine = await createEngineForProfile({ host, onDiagnostic: gameDiagnostics(onError) }, SHARED_FRAME_PROFILE_2D);
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
    let loop, stats, disposal;
    try {
        const scope = engine.createScope(), frame = Object.freeze({ width, height, clearColor, clearAlpha });
        const pointer = options.pointer === false ? undefined : createBrowserPointerInput({ engine, scope, width, height });
        const keyboard = options.keyboard === false ? undefined : createBrowserKeyboardInput({ engine, scope });
        const hover = options.hover === true
            ? scope.use((await import('./hover.js')).createBrowserHoverInput({
                engine,
                scope,
                canvas,
                width,
                height,
                ...(onError === undefined ? {} : { onError })
            }))
            : undefined;
        const panel = (stats = options.stats === true ? createBrowserStatsPanel({ canvas, label: backend }) : undefined);
        let drawn;
        // With a panel, the loop draws through a step that keeps the frame, and each step tells the panel what the last one did.
        const made = (loop =
            panel === undefined
                ? createBrowserFrameLoop({
                    engine,
                    host,
                    frame,
                    ...(update === undefined ? {} : { update }),
                    ...(onError === undefined ? {} : { onError })
                })
                : createBrowserFrameLoop({
                    engine: {
                        clock: engine.clock,
                        advanceTime: (seconds) => engine.advanceTime(seconds),
                        renderSharedFrame: (given) => (drawn = engine.renderSharedFrame(given))
                    },
                    host,
                    frame,
                    ...(onError === undefined ? {} : { onError }),
                    update(seconds) {
                        const now = made.snapshot();
                        panel.sample({
                            ...(drawn === undefined ? {} : { frame: drawn }),
                            pendingFrames: host.getStatus().pendingFrames,
                            drawCalls: host.getFrameDrawCalls(),
                            frames: now.frames,
                            skipped: now.skipped
                        });
                        drawn = undefined;
                        update?.(seconds);
                    }
                }));
        // Images by address: one asset type whose key is the address, read with the page's own request and decoded as PNG.
        const imageType = createAssetType('egret.browser-game.image', isTexture);
        const images = createBrowserTextureProvider({
            async readBytes(ref, context) {
                const stop = new AbortController(), abort = () => stop.abort();
                if (context.signal.aborted)
                    abort();
                else
                    context.signal.addEventListener('abort', abort, { once: true });
                try {
                    const response = await globalThis.fetch(ref.id, { signal: stop.signal });
                    if (!response.ok)
                        throw new EgretError('BROWSER_GAME_IMAGE_FAILED', { cause: new Error(response.status + ' ' + ref.id) });
                    return new Uint8Array(await response.arrayBuffer());
                }
                finally {
                    context.signal.removeEventListener('abort', abort);
                }
            }
        });
        engine.assets.register(imageType, images);
        // Textures painted in code: each call puts its texture under a key of its own, and its lease ends it.
        const paintedType = createAssetType('egret.browser-game.painted', isTexture), painted = new Map();
        let paintedCount = 0;
        engine.assets.register(paintedType, {
            async load(ref) {
                const texture = painted.get(ref.id);
                painted.delete(ref.id);
                if (texture === undefined)
                    throw invalid();
                return texture;
            },
            dispose(texture) {
                texture.dispose();
            }
        });
        const leasePixels = async (width, height, pixels) => {
            if (!whole(width) ||
                !whole(height) ||
                !(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) ||
                pixels.length !== width * height * 4)
                throw invalid();
            let texture;
            try {
                texture = createTexture(createImageData2D({ width, height, pixels: new Uint8Array(pixels) }));
            }
            catch (cause) {
                // Larger than the 2D image limits: 4,096 pixels on an edge, 4,194,304 in all.
                throw new EgretError('BROWSER_GAME_OPTIONS_INVALID', { cause });
            }
            const key = 'painted-' + ++paintedCount;
            painted.set(key, texture);
            try {
                return scope.use(await engine.assets.acquire(createAssetRef(paintedType, key), { signal: scope.signal }));
            }
            finally {
                // Not loaded (the scope ended first): the texture is ended here.
                if (painted.delete(key))
                    texture.dispose();
            }
        };
        // The canvas in its element: sized now and whenever the element changes size. The stage keeps its own units.
        const fit = options.fit ?? 'none', holder = options.fitTo ?? canvas.parentElement;
        let watcher;
        if (fit !== 'none' && holder !== null) {
            const place = () => {
                const box = holder.getBoundingClientRect(), wide = box.width / width, tall = box.height / height;
                const scaleX = fit === 'stretch' ? wide : fit === 'contain' ? Math.min(wide, tall) : Math.max(wide, tall), scaleY = fit === 'stretch' ? tall : scaleX;
                const style = canvas.style;
                style.width = width * scaleX + 'px';
                style.height = height * scaleY + 'px';
                // Centred in its element; with "cover" what does not fit is outside it, for the element to cut off.
                style.marginLeft = (box.width - width * scaleX) / 2 + 'px';
                style.marginTop = (box.height - height * scaleY) / 2 + 'px';
            };
            place();
            watcher = new ResizeObserver(place);
            watcher.observe(holder);
        }
        // Text: one cache for the Engine, made with the page's rasterizer when the first label is asked for.
        let textCache;
        // The text cache takes four drawings at a time and refuses more. Labels wait their turn here instead, two at a
        // time, so a game may make or change any number of them together.
        const LABEL_LANES = 2;
        let labelsDrawing = 0;
        const labelsWaiting = [];
        const enterLabelLane = () => {
            if (labelsDrawing < LABEL_LANES) {
                labelsDrawing++;
                return;
            }
            // The lane is handed over by the label that leaves it, so no newcomer takes it first.
            return new Promise(resolve => labelsWaiting.push(resolve));
        };
        const leaveLabelLane = () => {
            const next = labelsWaiting.shift();
            if (next)
                next();
            else
                labelsDrawing--;
        };
        async function createLabel(options = {}) {
            if (options === null || typeof options !== 'object')
                throw invalid();
            const { scope: owner = scope, ...given } = options;
            if (owner === null || typeof owner !== 'object')
                throw invalid();
            textCache ??= import('./text.js').then(text => createTextRasterCache(engine.assets, { provider: text.createCanvasTextRasterProvider() }));
            const field = createTextField(engine, owner, await textCache);
            let now = {
                text: '',
                fontFamily: 'sans-serif',
                fontSize: 24,
                fontWeight: 400,
                italic: false,
                lineHeight: 0,
                color: 0xffffff,
                locale: 'en',
                direction: 'ltr'
            };
            let ready = Promise.resolve(), asked = 0, drawing = false, running;
            const request = () => field.setRequest({
                text: now.text,
                fontFamily: now.fontFamily,
                fontSize: now.fontSize,
                fontWeight: now.fontWeight,
                fontStyle: now.italic ? 'italic' : 'normal',
                lineHeight: now.lineHeight > 0 ? now.lineHeight : now.fontSize * 1.25,
                locale: now.locale,
                direction: now.direction,
                density: pixelRatio,
                fillColor: now.color
            });
            // Draws the label's newest words. Words changed while it draws are asked for when that drawing is done, never
            // over it, so a label holds one drawing of the text cache at a time however often its words change.
            const draw = async () => {
                try {
                    await enterLabelLane();
                    try {
                        for (let shown = -1; shown !== asked;) {
                            if (shown !== -1)
                                request();
                            shown = asked;
                            drawing = true;
                            try {
                                // The cache frees a drawing's place a few turns after the drawing is handed over. A refusal for
                                // want of a place is waited out, without a timer; one that lasts is the label's failure.
                                for (let attempt = 0;; attempt++) {
                                    try {
                                        await field.prepare();
                                        break;
                                    }
                                    catch (cause) {
                                        if (!(cause instanceof EgretError) || cause.code !== 'TEXT_CACHE_BUDGET' || attempt >= 400)
                                            throw cause;
                                        await Promise.resolve();
                                    }
                                }
                            }
                            finally {
                                drawing = false;
                            }
                        }
                    }
                    finally {
                        leaveLabelLane();
                    }
                }
                finally {
                    running = undefined;
                }
            };
            const apply = (next) => {
                if (next === null || typeof next !== 'object')
                    throw invalid();
                now = { ...now, ...next };
                // Refused at once when nothing is being drawn; otherwise when its turn comes, through `ready`.
                if (!drawing)
                    request();
                asked++;
                running ??= draw();
                // A failure is the label's to tell through `ready`; it is not left unheard.
                running.catch(() => { });
                ready = running;
            };
            apply(given);
            return Object.freeze({
                display: field,
                get text() {
                    return now.text;
                },
                set text(value) {
                    if (value !== now.text)
                        apply({ text: value });
                },
                get ready() {
                    return ready;
                },
                set: apply,
                dispose() {
                    field.dispose();
                }
            });
        }
        const game = Object.freeze({
            backend,
            engine,
            host,
            stage: engine.stage,
            scope,
            frame,
            loop: made,
            pointer,
            keyboard,
            hover,
            stats: panel,
            createLabel,
            async loadTexture(url) {
                if (typeof url !== 'string' || url === '')
                    throw invalid();
                return scope.use(await engine.assets.acquire(createAssetRef(imageType, url), { signal: scope.signal }));
            },
            textureFromPixels: leasePixels,
            async textureFromCanvas(source) {
                if (source === null || typeof source !== 'object' || typeof source.getContext !== 'function')
                    throw invalid();
                const { width, height } = source;
                if (!whole(width) || !whole(height))
                    throw invalid();
                let context = source.getContext('2d');
                if (context === null) {
                    // A canvas of another kind of context: drawn onto a 2D canvas of its size, and read there.
                    const copy = typeof OffscreenCanvas === 'function'
                        ? new OffscreenCanvas(width, height)
                        : Object.assign(document.createElement('canvas'), { width, height });
                    context = copy.getContext('2d');
                    if (context === null)
                        throw invalid();
                    context.drawImage(source, 0, 0);
                }
                return leasePixels(width, height, context.getImageData(0, 0, width, height).data);
            },
            padHitArea(node, cssPixels = 44) {
                if (node === null ||
                    typeof node !== 'object' ||
                    typeof node.getBounds !== 'function' ||
                    !(typeof cssPixels === 'number' && cssPixels >= 0 && Number.isFinite(cssPixels)))
                    throw invalid();
                const drawn = node.getBounds(), box = canvas.getBoundingClientRect(), perCss = box.width > 0 && box.height > 0 ? Math.max(width / box.width, height / box.height) : 1;
                // The node's own units: undo its scale on the stage.
                const scaleX = Math.abs(node.scaleX) || 1, scaleY = Math.abs(node.scaleY) || 1;
                const wide = Math.max(drawn.width, (cssPixels * perCss) / scaleX), tall = Math.max(drawn.height, (cssPixels * perCss) / scaleY);
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
                return box.width > 0 && box.height > 0 ? Math.max(width / box.width, height / box.height) : 1;
            },
            toStage(clientX, clientY) {
                const box = canvas.getBoundingClientRect();
                return { x: ((clientX - box.left) * width) / box.width, y: ((clientY - box.top) * height) / box.height };
            },
            dispose() {
                // The scope ends the input it was given; the Engine ends its scopes and its Host.
                return (disposal ??= (async () => {
                    made.dispose();
                    panel?.dispose();
                    watcher?.disconnect();
                    // The scope ends the labels; then the cache they were drawn from can end, before the Engine does.
                    scope.dispose();
                    if (textCache !== undefined) {
                        const cache = await textCache.catch(() => undefined);
                        cache?.dispose();
                        await cache?.whenIdle();
                    }
                    await engine.dispose();
                    await images.close();
                })());
            }
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
        catch {
            /* The first failure is the one to tell. */
        }
        throw cause;
    }
}
//# sourceMappingURL=BrowserGame.js.map