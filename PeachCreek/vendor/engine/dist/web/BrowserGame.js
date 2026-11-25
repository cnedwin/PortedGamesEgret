// SPDX-License-Identifier: Apache-2.0
// A game in a page from one call: a Host chosen for the browser, an Engine, a scope, pointer and keyboard input and
// a frame loop, each made the way its own entry makes it, and all of them ended by one dispose.
import { EgretError } from '@egret/runtime';
import { createAssetRef, createAssetType, createEngineForProfile, createImageData2D, createTexture, isTexture, SHARED_FRAME_PROFILE_2D } from '@egret/engine';
import { createBrowserTextureProvider } from './image.js';
import { decodeBrowserImage, sniffBrowserImageFormat } from './BrowserImageTextures.js';
import { createTextField, createTextRasterCache } from '@egret/engine/text';
import { createBrowserFrameLoop } from './loop.js';
import { createBrowserPointerInput } from './pointer.js';
import { createBrowserKeyboardInput } from './keyboard.js';
import { createBrowserStatsPanel } from './BrowserStatsPanel.js';
import { planScreen } from './screen.js';
const invalid = () => new EgretError('BROWSER_GAME_OPTIONS_INVALID');
const whole = (value) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const MAX_GAME_IMAGE_JOBS = 4;
const MAX_GAME_IMAGE_BYTES = 8 * 1024 * 1024;
function gameImageLimit() {
    return new EgretError('WEB_PNG_INPUT_LIMIT', { cause: new RangeError('Game image encoded payload limit') });
}
async function boundedGameImageBytes(response) {
    if (Number(response.headers.get('content-length')) > MAX_GAME_IMAGE_BYTES)
        throw gameImageLimit();
    if (response.body === null)
        return new Uint8Array();
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
        for (;;) {
            const chunk = await reader.read();
            if (chunk.done)
                break;
            length += chunk.value.byteLength;
            if (length > MAX_GAME_IMAGE_BYTES)
                throw gameImageLimit();
            chunks.push(chunk.value);
        }
    }
    catch (cause) {
        void reader.cancel().catch(() => { });
        throw cause;
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
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
        !['none', 'contain', 'cover', 'stretch', 'expand'].includes(options.fit ?? 'none') ||
        (options.fitTo !== undefined && (options.fitTo === null || typeof options.fitTo !== 'object')))
        throw invalid();
    // The plan of the stage: refused here, before anything is made, when the portrait size or the insets are not valid.
    const planFor = (box, insets) => planScreen({
        box,
        design: { width, height },
        ...(options.portrait === undefined ? {} : { portrait: options.portrait }),
        fit: options.fit === 'expand' ? 'expand' : 'contain',
        ...(insets === undefined ? {} : { insets })
    });
    try {
        planFor({ width, height }, options.insets);
    }
    catch {
        throw invalid();
    }
    let screen = planFor({ width, height });
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
        const scope = engine.createScope(), initialFrame = Object.freeze({ width, height, clearColor, clearAlpha });
        let frame = initialFrame;
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
        // With a panel, the loop draws through a step that keeps the frame, and each step tells the panel what the last one did.
        const made = (loop =
            panel === undefined
                ? createBrowserFrameLoop({
                    engine,
                    host,
                    frame: frameNow,
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
                    frame: frameNow,
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
        // Keep the strict PNG decoder and its ownership contract. Route other known encodings by
        // bytes so file names, query strings and response content types cannot select a wrong decoder.
        const imageType = createAssetType('egret.browser-game.image', isTexture);
        const pendingPngBytes = new WeakMap();
        const pngTextures = new WeakSet();
        let imageJobs = 0;
        const images = createBrowserTextureProvider({
            async readBytes(_ref, context) {
                const bytes = pendingPngBytes.get(context);
                if (bytes === undefined)
                    throw new Error('Missing PNG bytes for the current image load');
                return bytes;
            }
        });
        engine.assets.register(imageType, {
            async load(ref, context) {
                // Hold the original admission budget through fetch and decode for every format.
                // Even a cancelled native decode retains its slot until the browser settles it.
                if (imageJobs >= MAX_GAME_IMAGE_JOBS)
                    throw new EgretError('WEB_PNG_JOB_LIMIT', { cause: new RangeError('Game image occupied job limit') });
                if (context.signal.aborted)
                    throw context.signal.reason;
                const stop = new AbortController(), abort = () => stop.abort();
                imageJobs++;
                context.signal.addEventListener('abort', abort, { once: true });
                try {
                    let bytes;
                    try {
                        const response = await globalThis.fetch(ref.id, { signal: stop.signal });
                        if (!response.ok)
                            throw new EgretError('WEB_PNG_READ_FAILED', {
                                cause: new EgretError('BROWSER_GAME_IMAGE_FAILED', { cause: new Error(response.status + ' ' + ref.id) })
                            });
                        bytes = await boundedGameImageBytes(response);
                    }
                    catch (cause) {
                        stop.abort();
                        if (context.signal.aborted)
                            throw context.signal.reason;
                        if (cause instanceof EgretError)
                            throw cause;
                        throw new EgretError('WEB_PNG_READ_FAILED', { cause });
                    }
                    if (context.signal.aborted)
                        throw context.signal.reason;
                    const format = sniffBrowserImageFormat(bytes);
                    if (format !== undefined && format !== 'png') {
                        const texture = await decodeBrowserImage(bytes);
                        if (!context.signal.aborted)
                            return texture;
                        texture.dispose();
                        throw context.signal.reason;
                    }
                    pendingPngBytes.set(context, bytes);
                    const texture = await images.load(ref, context);
                    pngTextures.add(texture);
                    return texture;
                }
                finally {
                    imageJobs--;
                    context.signal.removeEventListener('abort', abort);
                    pendingPngBytes.delete(context);
                }
            },
            dispose(texture) {
                if (pngTextures.has(texture))
                    images.dispose(texture);
                else
                    texture.dispose();
            }
        });
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
        // The canvas in its element: sized now and whenever the element changes size. With "contain" and "expand" the
        // stage follows the plan of the screen: its size, and, with a portrait size, its shape.
        const fit = options.fit ?? 'none', holder = options.fitTo ?? canvas.parentElement;
        const screenListeners = new Set();
        let watcher, probe;
        // The page's safe-area insets, read from an element that is padded by them and shows nothing.
        const pageInsets = () => {
            if (options.insets !== undefined)
                return options.insets;
            const page = canvas.ownerDocument, view = page?.defaultView;
            if (page === undefined ||
                page === null ||
                view === null ||
                view === undefined ||
                typeof view.getComputedStyle !== 'function' ||
                typeof page.createElement !== 'function' ||
                page.body === null ||
                page.body === undefined)
                return undefined;
            if (probe === undefined) {
                probe = page.createElement('div');
                probe.setAttribute('aria-hidden', 'true');
                probe.style.cssText =
                    'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
                        'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
                page.body.appendChild(probe);
            }
            const style = view.getComputedStyle(probe), read = (value) => (Number.isFinite(parseFloat(value)) ? Math.max(0, parseFloat(value)) : 0);
            // Insets are of the window; the element may be anywhere in it.
            const box = (holder ?? canvas).getBoundingClientRect(), across = view.innerWidth, down = view.innerHeight;
            return {
                top: Math.max(0, read(style.paddingTop) - box.top),
                left: Math.max(0, read(style.paddingLeft) - box.left),
                right: Math.max(0, read(style.paddingRight) - (finite(across) ? across - box.right : 0)),
                bottom: Math.max(0, read(style.paddingBottom) - (finite(down) ? down - box.bottom : 0))
            };
        };
        if (fit !== 'none' && holder !== null) {
            const place = () => {
                const projected = holder.getBoundingClientRect();
                // CSS dimensions are set in the holder's layout space. A transformed bounding box is
                // measured in page space and would multiply the ancestor scale a second time.
                const box = { width: holder.clientWidth || projected.width, height: holder.clientHeight || projected.height };
                const style = canvas.style;
                if (fit === 'cover' || fit === 'stretch') {
                    const wide = box.width / width, tall = box.height / height;
                    const scaleX = fit === 'stretch' ? wide : Math.max(wide, tall), scaleY = fit === 'stretch' ? tall : scaleX;
                    style.width = width * scaleX + 'px';
                    style.height = height * scaleY + 'px';
                    // Centred in its element; with "cover" what does not fit is outside it, for the element to cut off.
                    style.marginLeft = (box.width - width * scaleX) / 2 + 'px';
                    style.marginTop = (box.height - height * scaleY) / 2 + 'px';
                    return;
                }
                if (!(box.width > 0 && box.height > 0))
                    return;
                const next = planFor({ width: box.width, height: box.height }, pageInsets()), before = screen;
                screen = next;
                if (next.width !== frame.width || next.height !== frame.height)
                    frame = Object.freeze({ width: next.width, height: next.height, clearColor, clearAlpha });
                style.width = next.width * next.scale + 'px';
                style.height = next.height * next.scale + 'px';
                style.marginLeft = next.left + 'px';
                style.marginTop = next.top + 'px';
                const moved = next.width !== before.width ||
                    next.height !== before.height ||
                    next.orientation !== before.orientation ||
                    ['x', 'y', 'width', 'height'].some(key => next.safe[key] !== before.safe[key]);
                if (moved)
                    for (const listener of [...screenListeners])
                        listener(next);
            };
            place();
            watcher = new ResizeObserver(place);
            watcher.observe(holder);
        }
        // Text: one cache for the Engine, made with the page's rasterizer when the first label is asked for.
        let textCache;
        let currentTextCache;
        // Leave headroom for cache actors settling after delivery. Queue entries are cancellable and bounded.
        const LABEL_LANES = 2, MAX_QUEUED_LABELS = 128;
        let labelsDrawing = 0, labelRefusals = 0, releasedRasters = 0;
        const labelsWaiting = [];
        const leaveLabelLane = () => {
            const next = labelsWaiting.shift();
            if (next)
                next(true);
            else
                labelsDrawing--;
        };
        async function createLabel(options = {}) {
            if (options === null || typeof options !== 'object')
                throw invalid();
            const { scope: owner = scope, ...given } = options;
            if (owner === null || typeof owner !== 'object')
                throw invalid();
            textCache ??= import('./text.js').then(text => (currentTextCache = createTextRasterCache(engine.assets, { provider: text.createCanvasTextRasterProvider() })));
            const cache = await textCache;
            const field = createTextField(engine, owner, cache);
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
            let ready = Promise.resolve(), asked = 0, adopted = -1, active = true, disposed = false, generation = 0, preparing, cancelQueued, running;
            const current = (epoch) => active && !disposed && !field.isDisposed && generation === epoch;
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
            const enterLabelLane = () => {
                if (labelsDrawing < LABEL_LANES) {
                    labelsDrawing++;
                    return true;
                }
                if (labelsWaiting.length >= MAX_QUEUED_LABELS) {
                    labelRefusals++;
                    throw new EgretError('TEXT_CACHE_BUDGET');
                }
                return new Promise(resolve => {
                    labelsWaiting.push(resolve);
                    cancelQueued = () => {
                        const at = labelsWaiting.indexOf(resolve);
                        if (at < 0)
                            return; // The lane has already been handed to this draw.
                        labelsWaiting.splice(at, 1);
                        resolve(false);
                    };
                });
            };
            // A label coalesces changes made while drawing and keeps only its latest request.
            const draw = async (epoch) => {
                let entered = false;
                try {
                    if (!current(epoch))
                        return;
                    entered = await enterLabelLane();
                    if (!entered)
                        return;
                    if (generation === epoch)
                        cancelQueued = undefined;
                    for (let shown = -1; current(epoch) && shown !== asked;) {
                        if (adopted !== asked) {
                            request();
                            adopted = asked;
                        }
                        shown = asked;
                        preparing = epoch;
                        try {
                            await field.prepare();
                        }
                        catch (cause) {
                            if (!current(epoch))
                                return;
                            if (!(cause instanceof EgretError) || cause.code !== 'TEXT_CACHE_BUDGET')
                                throw cause;
                            // Delivery can precede actor retirement. Retry once after actual settlement, without polling.
                            await cache.whenIdle();
                            if (!current(epoch))
                                return;
                            try {
                                await field.prepare();
                            }
                            catch (retry) {
                                if (!current(epoch))
                                    return;
                                if (retry instanceof EgretError && retry.code === 'TEXT_CACHE_BUDGET')
                                    labelRefusals++;
                                throw retry;
                            }
                        }
                        finally {
                            if (preparing === epoch)
                                preparing = undefined;
                        }
                    }
                }
                finally {
                    if (generation === epoch)
                        running = undefined;
                    if (entered)
                        leaveLabelLane();
                }
            };
            const schedule = () => {
                if (!active || running !== undefined)
                    return;
                const epoch = generation;
                const job = Promise.resolve().then(() => draw(epoch));
                running = ready = job;
                // Observe rejection while keeping it available on ready.
                void job.catch(() => { });
            };
            const apply = (next) => {
                if (next === null || typeof next !== 'object')
                    throw invalid();
                now = { ...now, ...next };
                // Refused at once when nothing is being drawn; otherwise when its turn comes, through `ready`.
                if (preparing !== generation) {
                    request();
                    adopted = asked + 1;
                }
                asked++;
                schedule();
            };
            const supersede = () => {
                generation++;
                cancelQueued?.();
                cancelQueued = undefined;
                running = undefined;
            };
            const countRelease = () => {
                if (field.getStatus().metrics?.raster !== undefined)
                    releasedRasters++;
            };
            const close = () => {
                if (disposed)
                    return;
                disposed = true;
                supersede();
                owner.signal.removeEventListener('abort', close);
                countRelease();
                field.dispose();
            };
            try {
                apply(given);
                owner.signal.addEventListener('abort', close, { once: true });
            }
            catch (cause) {
                close();
                throw cause;
            }
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
                setRasterActive(next) {
                    if (typeof next !== 'boolean')
                        throw invalid();
                    if (active === next || disposed || field.isDisposed)
                        return;
                    active = next;
                    supersede();
                    if (active)
                        schedule();
                    else {
                        countRelease();
                        field.releaseRaster();
                        ready = Promise.resolve();
                    }
                },
                dispose: close
            });
        }
        const game = Object.freeze({
            backend,
            engine,
            host,
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
            createLabel,
            getLabelStatus() {
                return Object.freeze({
                    drawing: labelsDrawing,
                    queued: labelsWaiting.length,
                    refusals: labelRefusals,
                    releasedRasters,
                    cache: currentTextCache?.getStatus()
                });
            },
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
                    watcher?.disconnect();
                    probe?.remove();
                    screenListeners.clear();
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
