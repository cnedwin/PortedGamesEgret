// SPDX-License-Identifier: Apache-2.0
// A World3D game in a page from one call: the backend chosen from the address or the device, an Engine on a
// World3D host, a renderer set up for a picture quality, a frame loop, and a drawing resolution that follows the
// frame rate. Each piece is made the way its own module makes it, and one dispose ends them all.
import { createEngine } from '@egret/engine';
import { World3DError } from '../../rendering/world3d/core3D.js';
import { createWorld3DHost, startWorld3DLoop } from './host3D.js';
import { World3DView } from './World3DView.js';
/** The three qualities. A phone gets `low`, a desktop `high`; `medium` sits between for weaker computers. */
export const WORLD3D_QUALITY_PRESETS = Object.freeze({
    low: Object.freeze({
        pixelRatio: 1,
        antialias: false,
        shadows: false,
        shadowAtlasSize: 1024,
        post: false,
        bloom: false,
        ssao: false,
        fxaa: false
    }),
    medium: Object.freeze({
        pixelRatio: 1.5,
        antialias: true,
        shadows: true,
        shadowAtlasSize: 2048,
        post: true,
        bloom: true,
        ssao: false,
        fxaa: true
    }),
    high: Object.freeze({
        pixelRatio: 2,
        antialias: true,
        shadows: true,
        shadowAtlasSize: 4096,
        post: true,
        bloom: true,
        ssao: true,
        fxaa: true
    })
});
const QUALITIES = ['low', 'medium', 'high'];
const isQuality = (value) => typeof value === 'string' && QUALITIES.includes(value);
const params = (query) => {
    if (query instanceof URLSearchParams)
        return query;
    if (typeof query === 'string')
        return new URLSearchParams(query);
    const search = globalThis.location?.search;
    return typeof search === 'string' ? new URLSearchParams(search) : undefined;
};
/**
 * The picture quality for this device: the address's `quality`, then a stored choice, then `low` for software
 * rendering, a finger or a window shorter than 600 pixels, `medium` for 4 GB of memory or less, and `high` otherwise.
 */
export function pickWorld3DQuality(hints = {}) {
    const asked = params(hints.query)?.get('quality');
    if (isQuality(asked))
        return asked;
    if (isQuality(hints.stored))
        return hints.stored;
    const g = globalThis;
    // Drawn by the processor, every effect is paid for many times over.
    if (hints.softwareRenderer === true)
        return 'low';
    const coarse = hints.coarsePointer ?? g.matchMedia?.('(pointer: coarse)').matches ?? false;
    const shortSide = hints.shortSide ?? Math.min(g.innerWidth ?? 1200, g.innerHeight ?? 800);
    if (coarse || shortSide < 600)
        return 'low';
    const memory = hints.deviceMemory ?? g.navigator?.deviceMemory;
    if (typeof memory === 'number' && memory <= 4)
        return 'medium';
    return 'high';
}
/**
 * Whether WebGL here is drawn by software (SwiftShader, llvmpipe and the like), as in a headless browser, a virtual
 * machine or a page whose graphics card is blocked. It asks a throwaway context for its renderer's name.
 */
export function isSoftwareRendered3D(document = globalThis.document) {
    try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl)
            return false;
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /swiftshader|llvmpipe|softpipe|software/i.test(name);
    }
    catch {
        return false;
    }
}
/** The backend asked for by the address (`backend=webgpu`), or `fallback`. */
export function pickWorld3DBackend(query, fallback = 'webgl2') {
    const asked = params(query)?.get('backend');
    return asked === 'webgpu' || asked === 'webgl2' ? asked : fallback;
}
/** Makes a resolution scale that drops when frames are slow and rises when they are fast. */
export function createDynamicResolution3D(options = {}) {
    const min = options.min ?? 0.6, max = options.max ?? 1, step = options.step ?? 0.15, lowFps = options.lowFps ?? 45, highFps = options.highFps ?? 57, downAfter = options.downAfter ?? 1.5, upAfter = options.upAfter ?? 6;
    const numbers = [min, max, step, lowFps, highFps, downAfter, upAfter];
    if (!numbers.every(n => typeof n === 'number' && Number.isFinite(n) && n > 0) || min > max || lowFps >= highFps)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'dynamic resolution');
    let scale = max, fps = 60, slow = 0, fast = 0;
    return {
        get scale() {
            return scale;
        },
        get fps() {
            return fps;
        },
        update(deltaSeconds) {
            // A frame of zero or of a hidden tab says nothing about the device.
            if (!(deltaSeconds > 0) || deltaSeconds > 0.5)
                return scale;
            fps += (1 / deltaSeconds - fps) * 0.05;
            slow = fps < lowFps ? slow + deltaSeconds : 0;
            fast = fps > highFps ? fast + deltaSeconds : 0;
            if (slow >= downAfter && scale > min) {
                scale = Math.max(min, scale - step);
                slow = 0;
            }
            else if (fast >= upAfter && scale < max) {
                scale = Math.min(max, scale + step);
                fast = 0;
            }
            return scale;
        },
        reset() {
            scale = max;
            fps = 60;
            slow = fast = 0;
        }
    };
}
async function hasWebGPUAdapter(powerPreference) {
    const gpu = globalThis.navigator
        ?.gpu;
    if (!gpu || typeof gpu.requestAdapter !== 'function')
        return false;
    try {
        const options = powerPreference && powerPreference !== 'default' ? { powerPreference } : undefined;
        return (await gpu.requestAdapter(options)) != null;
    }
    catch {
        return false;
    }
}
/**
 * Starts a World3D game on `canvas`: an Engine, a renderer for the chosen backend and quality, and a frame loop.
 * Call `show(scene, camera)` to draw. `dispose()` ends the loop, the view, the renderer and the Engine.
 */
export async function createWorld3DApp(canvas, options = {}) {
    if (typeof canvas !== 'object' || canvas === null)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'canvas');
    if (typeof options !== 'object' || options === null)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'options');
    const asked = options.backend ?? pickWorld3DBackend(options.query);
    if (asked !== 'webgl2' && asked !== 'webgpu')
        throw new World3DError('WORLD3D_INPUT_INVALID', 'backend');
    const askedQuality = options.quality ?? 'auto';
    if (askedQuality !== 'auto' && !isQuality(askedQuality))
        throw new World3DError('WORLD3D_INPUT_INVALID', 'quality');
    let quality = askedQuality === 'auto'
        ? pickWorld3DQuality({
            ...(options.query === undefined ? {} : { query: options.query }),
            ...(options.storedQuality === undefined ? {} : { stored: options.storedQuality }),
            softwareRenderer: isSoftwareRendered3D('ownerDocument' in canvas ? canvas.ownerDocument : undefined)
        })
        : askedQuality;
    const preset = WORLD3D_QUALITY_PRESETS[quality];
    const resolution = options.dynamicResolution === false
        ? undefined
        : createDynamicResolution3D(options.dynamicResolution === true ? {} : options.dynamicResolution);
    const backend = asked === 'webgpu' && (await hasWebGPUAdapter(options.powerPreference)) ? 'webgpu' : 'webgl2';
    const common = {
        canvas,
        antialias: preset.antialias,
        shadows: preset.shadows,
        shadowAtlasSize: preset.shadowAtlasSize,
        ...(options.toneMapping === undefined ? {} : { toneMapping: options.toneMapping }),
        ...(options.exposure === undefined ? {} : { exposure: options.exposure })
    };
    const engine = await createEngine({ host: createWorld3DHost(canvas) });
    let renderer;
    try {
        if (backend === 'webgpu') {
            const { createWebGPURenderer3D } = await import('./WebGPURenderer3D.js');
            renderer = await createWebGPURenderer3D({
                ...common,
                ...(options.powerPreference && options.powerPreference !== 'default'
                    ? { powerPreference: options.powerPreference }
                    : {}),
                ...(options.onDeviceLost ? { onDeviceLost: options.onDeviceLost } : {})
            });
        }
        else {
            const { createWebGL2Renderer3D } = await import('./WebGL2Renderer3D.js');
            renderer = createWebGL2Renderer3D({
                ...common,
                ...(options.powerPreference ? { powerPreference: options.powerPreference } : {}),
                ...(options.onDeviceLost ? { onContextLost: () => options.onDeviceLost('context lost') } : {})
            });
        }
    }
    catch (cause) {
        await engine.dispose();
        throw cause;
    }
    const scope = engine.createScope();
    scope.use(renderer);
    const apply = (next) => {
        renderer.shadowsEnabled = next.shadows;
        const post = renderer.postProcess;
        post.enabled = next.post;
        post.bloom = next.bloom;
        post.ssao = next.ssao;
        post.fxaa = next.fxaa;
    };
    apply(preset);
    let view, loop, disposed = false;
    const fail = (cause) => {
        if (!options.onError)
            throw cause;
        options.onError(cause);
    };
    const resize = (camera) => {
        const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
        const ratio = Math.min(dpr, WORLD3D_QUALITY_PRESETS[quality].pixelRatio) * (resolution?.scale ?? 1);
        renderer.resizeToDisplaySize(ratio);
        const drawn = renderer.canvas;
        if (drawn.height > 0)
            camera.aspect = drawn.width / drawn.height;
    };
    const app = {
        engine,
        scope,
        renderer,
        backend,
        fellBack: asked === 'webgpu' && backend === 'webgl2',
        get quality() {
            return quality;
        },
        get resolutionScale() {
            return resolution?.scale ?? 1;
        },
        get view() {
            return view;
        },
        setQuality(next) {
            if (!isQuality(next))
                throw new World3DError('WORLD3D_INPUT_INVALID', 'quality');
            quality = next;
            apply(WORLD3D_QUALITY_PRESETS[next]);
            resolution?.reset();
        },
        show(scene, camera, show = {}) {
            if (disposed)
                throw new World3DError('WORLD3D_DISPOSED', 'app');
            view?.dispose();
            resolution?.reset();
            const created = new World3DView(engine, scope, {
                renderer,
                scene,
                camera,
                autoResize: false,
                ...(show.mixers ? { mixers: show.mixers } : {}),
                ...(show.controls ? { controls: show.controls } : {}),
                ...(options.onError ? { onError: options.onError } : {}),
                onUpdate(deltaSeconds, elapsedSeconds) {
                    resolution?.update(deltaSeconds);
                    resize(created.camera);
                    show.onUpdate?.(deltaSeconds, elapsedSeconds);
                }
            });
            view = created;
            app.start();
            return created;
        },
        start() {
            if (disposed)
                throw new World3DError('WORLD3D_DISPOSED', 'app');
            loop ??= startWorld3DLoop(engine, cause => {
                loop = undefined;
                fail(cause);
            });
        },
        stop() {
            loop?.dispose();
            loop = undefined;
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            app.stop();
            view?.dispose();
            view = undefined;
            // Closing the Engine closes its scopes, which dispose the renderer.
            void engine.dispose();
        }
    };
    return app;
}
//# sourceMappingURL=app3D.js.map