import { World3DError } from '../../rendering/world3d/core3D.js';
import { ParticleEmitter3D } from '../../rendering/world3d/Particles3D.js';
/** Draws a scene from a camera on each tick of the Engine, updating its mixers and controls. */
export class World3DView {
    renderer;
    scene;
    camera;
    mixers;
    controls;
    /** Skip animation and drawing while true; the clock subscription stays active. */
    paused = false;
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
            (options.onFrameTiming !== undefined && typeof options.onFrameTiming !== 'function'))
            throw new World3DError('WORLD3D_INPUT_INVALID', 'view options');
        this.#options = options;
        this.renderer = options.renderer;
        this.scene = options.scene;
        this.camera = options.camera;
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
        try {
            if (options.autoResize ?? true) {
                const ratio = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, options.maxPixelRatio ?? 2);
                this.renderer.resizeToDisplaySize(ratio);
                const canvas = this.renderer.canvas;
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
            if (observer !== undefined)
                renderStart = performance.now();
            const accepted = this.renderer.render(this.scene, this.camera);
            if (observer !== undefined)
                renderEnd = performance.now();
            outcome = accepted ? 'rendered' : 'refused';
        }
        catch (cause) {
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
            if (observer !== undefined) {
                const ended = performance.now();
                const sample = Object.freeze({
                    id: ++this.#timingId,
                    elapsedSeconds,
                    deltaSeconds,
                    callbackStartMs: started,
                    callbackEndMs: ended,
                    updateMs: (renderStart ?? updateFailureEnd ?? ended) - started,
                    renderMs: renderStart === undefined ? 0 : (renderEnd ?? ended) - renderStart,
                    outcome
                });
                try {
                    observer(sample);
                }
                catch {
                    /* Independent diagnostics must not stop the view. */
                }
            }
        }
    }
    /** Stop ticking. The renderer, scene and controls stay owned by their creator. */
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        this.#subscription.dispose();
    }
}
/** Makes a view that draws a scene on each tick of the Engine's clock. */
export function createWorld3DView(engine, scope, options) {
    return new World3DView(engine, scope, options);
}
