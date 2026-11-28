import { World3DError } from '../../rendering/world3d/core3D.js';
import { ParticleEmitter3D } from '../../rendering/world3d/Particles3D.js';
/** Draws a scene from a camera on each tick of the Engine, updating its mixers and controls. */
export class World3DView {
    renderer;
    #scene;
    #camera;
    mixers;
    controls;
    #paused = false;
    #deferRender;
    #pending;
    #pendingTurn;
    #updating = 0;
    #subscription;
    #options;
    #disposed = false;
    #timingId = 0;
    constructor(engine, scope, options) {
        if (!engine || typeof engine.clock?.onTick !== 'function')
            throw new World3DError('WORLD3D_INPUT_INVALID', 'engine');
        if (!options?.renderer ||
            !options.scene ||
            !options.camera ||
            (options.deferRender !== undefined && typeof options.deferRender !== 'boolean') ||
            (options.onFrameTiming !== undefined && typeof options.onFrameTiming !== 'function'))
            throw new World3DError('WORLD3D_INPUT_INVALID', 'view options');
        this.#options = options;
        this.renderer = options.renderer;
        this.#scene = options.scene;
        this.#camera = options.camera;
        this.#deferRender = options.deferRender ?? false;
        this.mixers = [...(options.mixers ?? [])];
        this.controls = options.controls;
        // The Scope owns this view: closing the Scope ends ticking before the Engine closes.
        this.#subscription = engine.clock.onTick(scope, tick => {
            this.tick(tick.deltaSeconds, tick.elapsedSeconds);
            return undefined;
        });
        scope.use(this);
    }
    get isDisposed() {
        return this.#disposed;
    }
    get scene() {
        return this.#scene;
    }
    set scene(value) {
        if (value !== this.#scene)
            this.clearPending();
        this.#scene = value;
    }
    get camera() {
        return this.#camera;
    }
    set camera(value) {
        if (value !== this.#camera)
            this.clearPending();
        this.#camera = value;
    }
    /** Skip animation and drawing while true; the clock subscription stays active. */
    get paused() {
        return this.#paused;
    }
    set paused(value) {
        if (value !== this.#paused)
            this.clearPending();
        this.#paused = value;
    }
    /** Change the submission order without resetting the Engine clock or retaining old work. */
    get deferRender() {
        return this.#deferRender;
    }
    set deferRender(value) {
        if (typeof value !== 'boolean')
            throw new World3DError('WORLD3D_INPUT_INVALID', 'deferRender');
        if (value !== this.#deferRender)
            this.clearPending();
        this.#deferRender = value;
    }
    clearPending() {
        this.#pending = undefined;
        this.#pendingTurn = undefined;
    }
    preparePending(deltaSeconds, elapsedSeconds, started, updateMs) {
        const previous = this.#pending;
        this.#pending = {
            scene: this.scene,
            camera: this.camera,
            deltaSeconds: (previous?.deltaSeconds ?? 0) + deltaSeconds,
            elapsedSeconds,
            started: previous?.started ?? started,
            updateMs: (previous?.updateMs ?? 0) + updateMs
        };
        if (this.#pendingTurn === undefined) {
            const turn = {};
            this.#pendingTurn = turn;
            queueMicrotask(() => {
                // No implicit frame request or delayed draw. A missed synchronous consumer
                // must not replay the old view after a later event or context restoration.
                if (this.#pendingTurn === turn)
                    this.clearPending();
            });
        }
    }
    reportTiming(deltaSeconds, elapsedSeconds, started, updateMs, renderMs, outcome) {
        const observer = this.#options.onFrameTiming;
        if (observer === undefined)
            return;
        const sample = Object.freeze({
            id: ++this.#timingId,
            elapsedSeconds,
            deltaSeconds,
            callbackStartMs: started,
            callbackEndMs: performance.now(),
            updateMs,
            renderMs,
            outcome
        });
        try {
            observer(sample);
        }
        catch {
            /* Independent diagnostics must not stop the view. */
        }
    }
    /** Advance and draw one frame. Normally driven by the Engine clock. */
    tick(deltaSeconds, elapsedSeconds) {
        if (this.#disposed || this.paused)
            return;
        const options = this.#options;
        const observer = options.onFrameTiming;
        const started = observer === undefined ? 0 : performance.now();
        let renderStart;
        let renderEnd;
        let updateFailureEnd;
        let outcome = 'failed';
        let report = true;
        const deferredAtStart = this.#deferRender;
        this.#updating++;
        try {
            if (options.autoResize ?? true) {
                const ratio = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, options.maxPixelRatio ?? 2);
                this.renderer.resizeToDisplaySize(ratio);
                const canvas = this.renderer.renderSize ?? this.renderer.canvas;
                if (canvas.height > 0)
                    this.camera.aspect = canvas.width / canvas.height;
            }
            options.onUpdate?.(deltaSeconds, elapsedSeconds);
            for (const mixer of this.mixers)
                mixer.update(deltaSeconds);
            this.controls?.update(deltaSeconds);
            if (options.updateParticles ?? true) {
                this.scene.traverse(object => {
                    if (object instanceof ParticleEmitter3D && object.visible)
                        object.update(deltaSeconds);
                });
            }
            if ((this.#deferRender || deferredAtStart) && (this.#disposed || this.paused)) {
                report = false;
                return;
            }
            if (this.#deferRender) {
                this.preparePending(deltaSeconds, elapsedSeconds, started, observer === undefined ? 0 : performance.now() - started);
                report = false;
                return;
            }
            if (observer !== undefined)
                renderStart = performance.now();
            const accepted = this.renderer.render(this.scene, this.camera);
            if (observer !== undefined)
                renderEnd = performance.now();
            outcome = accepted ? 'rendered' : 'refused';
        }
        catch (cause) {
            this.clearPending();
            if (observer !== undefined) {
                if (renderStart !== undefined)
                    renderEnd = performance.now();
                else
                    updateFailureEnd = performance.now();
            }
            if (!options.onError)
                throw cause;
            options.onError(cause);
        }
        finally {
            this.#updating--;
            if (report && observer !== undefined) {
                const ended = performance.now();
                this.reportTiming(deltaSeconds, elapsedSeconds, started, (renderStart ?? updateFailureEnd ?? ended) - started, renderStart === undefined ? 0 : (renderEnd ?? ended) - renderStart, outcome);
            }
        }
    }
    /**
     * Consume the latest prepared draw synchronously, for example after the shared
     * 2D submission of the same browser frame. True only when the renderer accepted it.
     */
    drawPending() {
        if (this.#updating !== 0)
            return false;
        const pending = this.#pending;
        this.clearPending();
        if (!pending ||
            !this.#deferRender ||
            this.#disposed ||
            this.paused ||
            pending.scene !== this.scene ||
            pending.camera !== this.camera)
            return false;
        const options = this.#options;
        const observer = options.onFrameTiming;
        const renderStart = observer === undefined ? 0 : performance.now();
        let renderEnd = renderStart;
        let outcome = 'failed';
        try {
            const accepted = this.renderer.render(pending.scene, pending.camera);
            if (observer !== undefined)
                renderEnd = performance.now();
            outcome = accepted ? 'rendered' : 'refused';
            return accepted;
        }
        catch (cause) {
            if (observer !== undefined)
                renderEnd = performance.now();
            if (!options.onError)
                throw cause;
            options.onError(cause);
            return false;
        }
        finally {
            this.reportTiming(pending.deltaSeconds, pending.elapsedSeconds, pending.started, pending.updateMs, renderEnd - renderStart, outcome);
        }
    }
    /** Stop ticking. The renderer, scene and controls stay owned by their creator. */
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        this.clearPending();
        this.#subscription.dispose();
    }
}
/** Makes a view that draws a scene on each tick of the Engine's clock. */
export function createWorld3DView(engine, scope, options) {
    return new World3DView(engine, scope, options);
}
