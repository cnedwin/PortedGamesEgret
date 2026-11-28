// SPDX-License-Identifier: Apache-2.0
// Page elements that follow points of a World3D scene: names over heads,
// damage numbers, objective markers that cling to the edge of the screen when
// their target is off it. The interface of a 3D game is usually ordinary page
// elements laid over the canvas; this places them each frame.
import { World3DError } from '../../rendering/world3d/core3D.js';
import { Object3D } from '../../rendering/world3d/Object3D.js';
import { DisplayObject, DisplayObjectContainer, EgretError } from '@egret/runtime';
import { createActionControl, createControlKeys } from '@egret/engine/ui';
import { projectToViewport3D } from '../../rendering/world3d/GeometryBuilder3D.js';
/**
 * A layer of page elements that follow scene points. Each element is moved with a CSS transform, so give it
 * `position: absolute; left: 0; top: 0` and centre it with a negative margin or a translate of its own child.
 * A marker gets `data-on-edge` while clamped and `hidden` while its target is behind the camera without clamping.
 */
export function createScreenMarkers3D(options) {
    if (!options?.container || typeof options.container.appendChild !== 'function' || !options.camera)
        throw new World3DError('WORLD3D_INPUT_INVALID', 'screen markers');
    const container = options.container;
    const markers = [];
    const world = new Float32Array(3);
    const layer = {
        markers,
        camera: options.camera,
        add(element, marker) {
            if (!element || !marker?.target)
                throw new World3DError('WORLD3D_INPUT_INVALID', 'marker');
            let target = marker.target;
            const added = !element.parentNode;
            if (added)
                container.appendChild(element);
            const point = { x: 0, y: 0, depth: 0, inFront: false, onScreen: false };
            let onEdge = false, angle = 0, disposed = false;
            const margin = marker.margin ?? 24;
            const entry = {
                element,
                point,
                get onEdge() {
                    return onEdge;
                },
                get angle() {
                    return angle;
                },
                retarget(next) {
                    if (!next)
                        throw new World3DError('WORLD3D_INPUT_INVALID', 'marker target');
                    target = next;
                },
                dispose() {
                    if (disposed)
                        return;
                    disposed = true;
                    const at = markers.indexOf(entry);
                    if (at >= 0)
                        markers.splice(at, 1);
                    if (added)
                        element.remove();
                },
                update(width, height) {
                    if (Array.isArray(target))
                        world.set(target);
                    else {
                        const node = target;
                        node.updateWorldMatrix();
                        const m = node.matrixWorld;
                        world[0] = m[12];
                        world[1] = m[13];
                        world[2] = m[14];
                    }
                    if (marker.offset)
                        for (let i = 0; i < 3; i++)
                            world[i] += marker.offset[i];
                    const camera = layer.camera;
                    projectToViewport3D(camera, world, width, height, point);
                    const eye = camera.matrixWorld;
                    const far = marker.maxDistance !== undefined &&
                        Math.hypot(world[0] - eye[12], world[1] - eye[13], world[2] - eye[14]) > marker.maxDistance;
                    let x = point.x, y = point.y;
                    angle = Math.atan2(y - height / 2, x - width / 2);
                    onEdge = false;
                    if (!point.onScreen && marker.clampToEdge) {
                        // Push the point out from the centre to the screen's edge along its direction.
                        // Behind the camera the projection already keeps the side the target lies on; one straight behind
                        // goes to the bottom edge.
                        let dx = x - width / 2, dy = y - height / 2;
                        if (!point.inFront && Math.hypot(dx, dy) < 1)
                            dy = 1;
                        if (!point.inFront) {
                            // Behind the camera a target is always off the screen, however close to the centre it projects.
                            const length = Math.hypot(dx, dy);
                            dx /= length;
                            dy /= length;
                        }
                        angle = Math.atan2(dy, dx);
                        const halfW = width / 2 - margin, halfH = height / 2 - margin;
                        const scale = Math.min(halfW / Math.max(Math.abs(dx), 1e-9), halfH / Math.max(Math.abs(dy), 1e-9));
                        x = width / 2 + dx * scale;
                        y = height / 2 + dy * scale;
                        x = Math.min(width - margin, Math.max(margin, x));
                        y = Math.min(height - margin, Math.max(margin, y));
                        onEdge = true;
                    }
                    const hidden = far || (!point.onScreen && !marker.clampToEdge);
                    element.hidden = hidden;
                    if (onEdge)
                        element.dataset['onEdge'] = '';
                    else
                        delete element.dataset['onEdge'];
                    if (!hidden)
                        element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
                    point.x = x;
                    point.y = y;
                }
            };
            markers.push(entry);
            return entry;
        },
        update() {
            const width = container.clientWidth, height = container.clientHeight;
            if (!(width > 0 && height > 0))
                return;
            layer.camera.updateViewMatrices();
            for (const marker of [...markers])
                marker.update(width, height);
        },
        dispose() {
            for (const marker of [...markers])
                marker.dispose();
        }
    };
    return layer;
}
const EMPTY_RECT = Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
const emptyPoint = () => ({
    x: 0,
    y: 0,
    depth: 0,
    onScreen: false,
    inFront: false,
    distance: 0
});
const validName = (name) => typeof name === 'string' && name.trim() !== '' && name.length <= 1024;
const markerInvalid = (detail) => new World3DError('WORLD3D_INPUT_INVALID', detail);
const finiteNonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const finiteMarkerPoint = (value) => (Array.isArray(value) || value instanceof Float32Array || value instanceof Float64Array) &&
    value.length === 3 &&
    value.every(Number.isFinite);
const validateNativeTarget = (value) => {
    if (!(value instanceof Object3D) && !finiteMarkerPoint(value))
        throw markerInvalid('marker target');
};
function markerMargins(value) {
    if (value === undefined)
        return { left: 0, top: 0, right: 0, bottom: 0 };
    if (finiteNonnegative(value))
        return { left: value, top: value, right: value, bottom: value };
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw markerInvalid('marker margin');
    const sides = { left: value.left ?? 0, top: value.top ?? 0, right: value.right ?? 0, bottom: value.bottom ?? 0 };
    if (!Object.values(sides).every(finiteNonnegative))
        throw markerInvalid('marker margin');
    return sides;
}
function markerIntersection(a, b) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    return {
        x,
        y,
        width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
        height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y)
    };
}
const markerClamp = (value, min, max) => Math.max(min, Math.min(max, value));
/** The original overlay entry uses exactly the same native host and placement implementation. */
export function createOverlayScreenMarkers3D(options) {
    if (!options?.overlay)
        throw markerInvalid('overlay screen markers');
    return createNativeScreenMarkers3D({
        game: options.overlay.game,
        canvas: options.overlay.canvas,
        sceneCanvas: options.sceneCanvas,
        camera: options.camera,
        ...(options.semantics === undefined ? {} : { semantics: options.semantics }),
        ...(options.parent === undefined ? {} : { parent: options.parent })
    });
}
/**
 * A native marker layer on the existing BrowserGame stage (overlay or attached Play). All coordinates are native
 * stage units, not Play design units. No new clock, surface or input router is created.
 */
export function createNativeScreenMarkers3D(options) {
    if (!options?.game ||
        !(options.game.stage instanceof DisplayObjectContainer) ||
        options.game.scope.state !== 'open' ||
        options.game.scope.signal.aborted ||
        typeof options.canvas?.getBoundingClientRect !== 'function' ||
        typeof options.sceneCanvas?.getBoundingClientRect !== 'function' ||
        typeof options.camera?.updateViewMatrices !== 'function' ||
        (options.semantics !== undefined && typeof options.semantics?.add !== 'function'))
        throw markerInvalid('native screen markers');
    const { game, canvas: surface, sceneCanvas, semantics } = options, { stage, scope } = game;
    const parent = options.parent ?? stage;
    function parentOrigin() {
        if (!(parent instanceof DisplayObjectContainer) || parent.isDisposed)
            return undefined;
        let attached = false;
        for (let at = parent; at; at = at.parent)
            if (at === stage) {
                attached = true;
                break;
            }
        if (!attached)
            return undefined;
        const base = parent.localToGlobal(0, 0), x = parent.localToGlobal(1, 0), y = parent.localToGlobal(0, 1);
        const epsilon = 1e-6;
        if (Math.abs(x.x - base.x - 1) > epsilon ||
            Math.abs(x.y - base.y) > epsilon ||
            Math.abs(y.x - base.x) > epsilon ||
            Math.abs(y.y - base.y - 1) > epsilon)
            return undefined;
        return base;
    }
    const origin = parentOrigin();
    if (!origin)
        throw markerInvalid('native marker parent must be attached with a translation-only transform');
    const root = new DisplayObjectContainer();
    root.touchEnabled = false;
    root.touchChildren = true;
    root.x = -origin.x;
    root.y = -origin.y;
    parent.addChild(root);
    const records = [], world = new Float32Array(3);
    const ids = new Set();
    const hitRecords = new Map();
    let closed = false, stageRetires = false;
    function projectionFrame() {
        if (closed)
            return undefined;
        const scene = sceneCanvas.getBoundingClientRect(), canvas = surface.getBoundingClientRect(), plan = game.screen;
        if (!(scene.width > 0 &&
            scene.height > 0 &&
            canvas.width > 0 &&
            canvas.height > 0 &&
            plan.width > 0 &&
            plan.height > 0))
            return undefined;
        const camera = layer.camera;
        camera.updateViewMatrices();
        const unitsX = plan.width / canvas.width, unitsY = plan.height / canvas.height;
        const screen = Object.freeze(markerIntersection({
            x: (scene.left - canvas.left) * unitsX,
            y: (scene.top - canvas.top) * unitsY,
            width: scene.width * unitsX,
            height: scene.height * unitsY
        }, { x: 0, y: 0, width: plan.width, height: plan.height }));
        const safe = Object.freeze(markerIntersection(screen, plan.safe));
        return {
            scene,
            canvas,
            unitsX,
            unitsY,
            screen,
            safe,
            unitsPerCssPixel: Object.freeze({ x: unitsX, y: unitsY }),
            project(target, offset = [0, 0, 0], out = emptyPoint()) {
                validateNativeTarget(target);
                if (!finiteMarkerPoint(offset))
                    throw markerInvalid('marker offset');
                if (finiteMarkerPoint(target))
                    world.set(target);
                else {
                    const node = target;
                    node.updateWorldMatrix();
                    world.set(node.matrixWorld.subarray(12, 15));
                }
                for (let i = 0; i < 3; i++)
                    world[i] += offset[i];
                projectToViewport3D(camera, world, scene.width, scene.height, out);
                out.x = (scene.left - canvas.left + out.x) * unitsX;
                out.y = (scene.top - canvas.top + out.y) * unitsY;
                const eye = camera.matrixWorld;
                out.distance = Math.hypot(world[0] - eye[12], world[1] - eye[13], world[2] - eye[14]);
                return out;
            }
        };
    }
    const layer = {
        get markers() {
            return records.slice();
        },
        camera: options.camera,
        projectFrame: projectionFrame,
        hitTest(stageX, stageY) {
            if (closed || !Number.isFinite(stageX) || !Number.isFinite(stageY))
                return undefined;
            const target = stage.hitTest(stageX, stageY);
            return target === undefined ? undefined : hitRecords.get(target);
        },
        add(display, marker) {
            if (closed ||
                !(display instanceof DisplayObject) ||
                display.isDisposed ||
                display.parent !== undefined ||
                !marker ||
                typeof marker !== 'object')
                throw markerInvalid('native marker display or options');
            validateNativeTarget(marker.target);
            const offset = marker.offset ?? [0, 0, 0];
            if (!finiteMarkerPoint(offset))
                throw markerInvalid('marker offset');
            const area = marker.area ?? 'safe', margin = markerMargins(marker.margin), anchor = marker.anchor ?? { x: 0.5, y: 0.5 }, extent = marker.extent ?? { width: 0, height: 0 }, clamp = marker.clampToEdge ?? false, maxDistance = marker.maxDistance ?? Infinity;
            if ((area !== 'safe' && area !== 'screen') ||
                !finiteNonnegative(anchor.x) ||
                !finiteNonnegative(anchor.y) ||
                anchor.x > 1 ||
                anchor.y > 1 ||
                !finiteNonnegative(extent.width) ||
                !finiteNonnegative(extent.height) ||
                typeof clamp !== 'boolean' ||
                (maxDistance !== Infinity && !finiteNonnegative(maxDistance)))
                throw markerInvalid('overlay marker placement');
            const interaction = marker.interaction;
            const min = interaction?.minHitSize ?? 44;
            const hitSize = typeof min === 'number' ? { width: min, height: min } : min;
            if (interaction !== undefined &&
                (!interaction ||
                    typeof interaction !== 'object' ||
                    typeof interaction.id !== 'string' ||
                    !interaction.id.trim() ||
                    interaction.id.length > 128 ||
                    ids.has(interaction.id) ||
                    (typeof interaction.name !== 'function' && !validName(interaction.name)) ||
                    typeof interaction.onActivate !== 'function' ||
                    (interaction.onFocus !== undefined && typeof interaction.onFocus !== 'function') ||
                    !hitSize ||
                    !finiteNonnegative(hitSize.width) ||
                    !finiteNonnegative(hitSize.height) ||
                    game.pointer === undefined))
                throw markerInvalid('native marker interaction');
            const holder = new DisplayObjectContainer();
            holder.visible = false;
            holder.touchEnabled = false;
            holder.touchChildren = false;
            root.addChild(holder);
            try {
                holder.addChild(display);
            }
            catch (cause) {
                holder.dispose();
                throw cause;
            }
            let target = marker.target, enabled = true, wantsAction = interaction !== undefined, onEdge = false, angle = 0, disposed = false;
            const point = { x: 0, y: 0, depth: 0, onScreen: false, inFront: false }, rawPoint = emptyPoint();
            const anchorX = anchor.x, anchorY = anchor.y, extentW = extent.width, extentH = extent.height;
            let hitRect = { ...EMPTY_RECT }, action, registration, keys, semantic, releaseGuard;
            let pointerReleaseOwns = false, fromScriptedRelease = false;
            const shown = () => {
                if (disposed || holder.isDisposed || !display.visible || display.alpha <= 0 || display.parent !== holder)
                    return false;
                for (let at = holder; at; at = at.parent) {
                    if (at.isDisposed || !at.visible || at.alpha <= 0)
                        return false;
                    if (at === stage)
                        return true;
                }
                return false;
            };
            let awaitingPlacement = true;
            const available = () => shown() && wantsAction && !awaitingPlacement;
            function admit() {
                if (!action || holder.isDisposed)
                    return;
                const active = available();
                if (action.enabled !== active) {
                    action.setEnabled(active);
                    registration?.update({ disabled: !active });
                }
                if (holder.touchEnabled !== active)
                    holder.touchEnabled = active;
            }
            function hide() {
                holder.visible = false;
                admit();
            }
            function retireAction() {
                semantic?.remove();
                releaseGuard?.();
                keys?.dispose();
                registration?.dispose();
                action?.dispose();
                if (interaction)
                    ids.delete(interaction.id);
                semantic = undefined;
                releaseGuard = undefined;
                keys = undefined;
                registration = undefined;
                action = undefined;
            }
            // Clear a held physical press before a slot is hidden or rebound. Re-enabling a control never revives its old candidate.
            function cancelAction() {
                pointerReleaseOwns = false;
                if (action?.enabled) {
                    action.setEnabled(false);
                    registration?.update({ disabled: true });
                }
                if (!holder.isDisposed && holder.touchEnabled)
                    holder.touchEnabled = false;
            }
            function currentName() {
                const name = typeof interaction?.name === 'function' ? interaction.name() : interaction?.name;
                if (!validName(name))
                    throw markerInvalid('native marker name');
                return name;
            }
            if (interaction) {
                try {
                    holder.name = currentName();
                    const inert = () => semantics?.snapshot.nodes.some(node => node.id === interaction.id && node.inert) === true;
                    // The router correctly delivers the original captured end. Before ActionControl hears it, additionally
                    // admit only a release which is still owned by this holder in the *current* display order. A newly
                    // opened foreground panel must not activate an action beneath it. Keyboard/semantic releases use the
                    // same control but do not need a pointer coordinate.
                    releaseGuard = holder.on(game.pointer.events.end, event => {
                        pointerReleaseOwns = stage.hitTest(event.payload.globalX, event.payload.globalY) === holder;
                    });
                    action = createActionControl({
                        input: game.pointer,
                        target: holder,
                        activation: 'tap',
                        onActivate: () => {
                            const admitted = fromScriptedRelease || pointerReleaseOwns;
                            pointerReleaseOwns = false;
                            if (admitted && available() && !inert())
                                interaction.onActivate();
                        }
                    });
                    action.setEnabled(false);
                    const control = {
                        get enabled() {
                            return available() && action?.enabled === true && !inert();
                        },
                        press() {
                            if (this.enabled)
                                action?.press();
                        },
                        release() {
                            if (!this.enabled)
                                return;
                            fromScriptedRelease = true;
                            try {
                                action?.release();
                            }
                            finally {
                                fromScriptedRelease = false;
                            }
                        }
                    };
                    if (game.keyboard) {
                        registration = game.keyboard.registerTarget({ id: interaction.id, target: holder, disabled: true });
                        keys = createControlKeys({ keyboard: game.keyboard, target: holder, kind: 'action', control });
                    }
                    const requestFocus = game.keyboard
                        ? () => {
                            if (available())
                                game.keyboard.focus(interaction.id);
                        }
                        : interaction.onFocus;
                    if (semantics)
                        semantic = semantics.add({
                            id: interaction.id,
                            role: 'button',
                            describe: () => ({
                                name: currentName(),
                                bounds: {
                                    x: holder.x + hitRect.x,
                                    y: holder.y + hitRect.y,
                                    width: hitRect.width,
                                    height: hitRect.height
                                },
                                hidden: !shown(),
                                disabled: !available(),
                                focused: available() && game.keyboard?.getSnapshot().focusedId === interaction.id
                            }),
                            onActivate: () => {
                                if (control.enabled) {
                                    control.press();
                                    control.release();
                                }
                            },
                            ...(requestFocus
                                ? {
                                    onFocus: () => {
                                        if (available())
                                            requestFocus();
                                    }
                                }
                                : {})
                        });
                    ids.add(interaction.id);
                }
                catch (cause) {
                    retireAction();
                    holder.removeChild(display);
                    holder.dispose();
                    throw cause;
                }
            }
            const entry = {
                display,
                point,
                get visible() {
                    return !disposed && holder.visible;
                },
                get onEdge() {
                    return onEdge;
                },
                get angle() {
                    return angle;
                },
                retarget(next) {
                    if (disposed)
                        throw markerInvalid('disposed overlay marker');
                    validateNativeTarget(next);
                    awaitingPlacement = true;
                    cancelAction();
                    target = next;
                },
                setVisible(next) {
                    if (disposed || typeof next !== 'boolean')
                        throw markerInvalid('overlay marker visibility');
                    enabled = next;
                    if (!enabled)
                        hide();
                },
                setInteractive(next) {
                    if (disposed || typeof next !== 'boolean' || (next && !interaction))
                        throw markerInvalid('native marker interaction');
                    wantsAction = next;
                    admit();
                },
                dispose() {
                    if (disposed)
                        return;
                    disposed = true;
                    const at = records.indexOf(entry);
                    if (at >= 0)
                        records.splice(at, 1);
                    hitRecords.delete(holder);
                    retireAction();
                    if (!holder.isDisposed && !stageRetires) {
                        if (!display.isDisposed && display.parent === holder) {
                            try {
                                holder.removeChild(display);
                            }
                            catch (cause) {
                                if (cause instanceof EgretError && cause.code === 'ENGINE_CLOSED') {
                                    stageRetires = true;
                                    return;
                                }
                                throw cause;
                            }
                        }
                        holder.dispose();
                    }
                },
                update(projection, wantsCandidate) {
                    if (disposed)
                        return undefined;
                    if (holder.isDisposed || display.isDisposed || display.parent !== holder) {
                        entry.dispose();
                        return undefined;
                    }
                    onEdge = false;
                    if (!enabled || !projection) {
                        hide();
                        return undefined;
                    }
                    projection.project(target, offset, rawPoint);
                    point.x = rawPoint.x;
                    point.y = rawPoint.y;
                    point.depth = rawPoint.depth;
                    point.inFront = rawPoint.inFront;
                    point.onScreen = rawPoint.onScreen;
                    const { scene, canvas, unitsX, unitsY } = projection;
                    const rawX = rawPoint.x, rawY = rawPoint.y;
                    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || rawPoint.distance > maxDistance) {
                        hide();
                        return undefined;
                    }
                    const part = area === 'safe' ? projection.safe : projection.screen;
                    const drawn = holder.getBounds();
                    const width = Math.max(drawn.width, extentW, interaction ? hitSize.width * unitsX : 0), height = Math.max(drawn.height, extentH, interaction ? hitSize.height * unitsY : 0);
                    const drawnX = drawn.x + drawn.width * anchorX, drawnY = drawn.y + drawn.height * anchorY;
                    const left = part.x + margin.left * unitsX + width * anchorX, right = part.x + part.width - margin.right * unitsX - width * (1 - anchorX), top = part.y + margin.top * unitsY + height * anchorY, bottom = part.y + part.height - margin.bottom * unitsY - height * (1 - anchorY);
                    if (!(part.width > 0 && part.height > 0 && right >= left && bottom >= top)) {
                        hide();
                        return undefined;
                    }
                    // The scene centre is not the centre of a cropped intersection. Convert the original scene projection instead.
                    const sceneCenterX = (scene.left + scene.width / 2 - canvas.left) * unitsX, sceneCenterY = (scene.top + scene.height / 2 - canvas.top) * unitsY;
                    let dx = (rawX - sceneCenterX) / unitsX, dy = (rawY - sceneCenterY) / unitsY;
                    if (Math.hypot(dx, dy) < 1e-6)
                        dy = 1;
                    angle = Math.atan2(dy, dx);
                    let frameOpen = true;
                    const feasible = (x, y) => frameOpen &&
                        !disposed &&
                        enabled &&
                        Number.isFinite(x) &&
                        Number.isFinite(y) &&
                        x >= left &&
                        x <= right &&
                        y >= top &&
                        y <= bottom &&
                        (rawPoint.onScreen || clamp);
                    // Frame-local candidate custom placement keeps the default area/footprint constraints and updates actual hit geometry.
                    function place(x, y) {
                        if (!feasible(x, y))
                            return false;
                        holder.x = x - drawnX;
                        holder.y = y - drawnY;
                        holder.visible = true;
                        awaitingPlacement = false;
                        point.x = x;
                        point.y = y;
                        if (interaction) {
                            const hit = { x: drawnX - width * anchorX, y: drawnY - height * anchorY, width, height };
                            if (hit.x !== hitRect.x ||
                                hit.y !== hitRect.y ||
                                hit.width !== hitRect.width ||
                                hit.height !== hitRect.height) {
                                hitRect = hit;
                                holder.hitArea = hit;
                            }
                            const name = currentName();
                            if (holder.name !== name)
                                holder.name = name;
                        }
                        admit();
                        return true;
                    }
                    const inside = rawPoint.onScreen && feasible(rawX, rawY);
                    if (inside)
                        place(rawX, rawY);
                    else if (!clamp)
                        hide();
                    else {
                        const cx = markerClamp(sceneCenterX, left, right), cy = markerClamp(sceneCenterY, top, bottom);
                        dx *= unitsX;
                        dy *= unitsY;
                        const sx = dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : Infinity, sy = dy > 0 ? (bottom - cy) / dy : dy < 0 ? (top - cy) / dy : Infinity, k = Math.min(sx, sy);
                        onEdge = true;
                        place(markerClamp(cx + dx * k, left, right), markerClamp(cy + dy * k, top, bottom));
                    }
                    if (!wantsCandidate)
                        return undefined;
                    const candidate = {
                        marker: entry,
                        rawPoint,
                        get rect() {
                            return { x: point.x - width * anchorX, y: point.y - height * anchorY, width, height };
                        },
                        place,
                        hide: () => {
                            if (frameOpen && !disposed)
                                hide();
                        },
                        toFront: () => {
                            if (frameOpen && !disposed && holder.parent === root)
                                root.setChildIndex(holder, root.numChildren - 1);
                        },
                        close: () => {
                            frameOpen = false;
                        }
                    };
                    return candidate;
                }
            };
            records.push(entry);
            if (interaction)
                hitRecords.set(holder, entry);
            return entry;
        },
        update(resolve) {
            if (closed)
                return;
            if (resolve !== undefined && typeof resolve !== 'function')
                throw markerInvalid('native marker resolver');
            const origin = parentOrigin();
            if (origin && !root.isDisposed) {
                root.x = -origin.x;
                root.y = -origin.y;
            }
            const frame = origin && !root.isDisposed ? projectionFrame() : undefined, candidates = [];
            try {
                for (const record of [...records]) {
                    const candidate = record.update(frame, resolve !== undefined);
                    if (candidate)
                        candidates.push(candidate);
                }
                if (frame && resolve)
                    resolve(candidates, frame);
            }
            finally {
                for (const candidate of candidates)
                    candidate.close?.();
            }
        },
        dispose() {
            if (closed)
                return;
            closed = true;
            scope.signal.removeEventListener('abort', retire);
            let failed = false, error;
            for (const entry of [...records]) {
                try {
                    entry.dispose();
                }
                catch (cause) {
                    if (!failed) {
                        failed = true;
                        error = cause;
                    }
                }
            }
            if (!stageRetires) {
                try {
                    root.dispose();
                }
                catch (cause) {
                    if (!failed) {
                        failed = true;
                        error = cause;
                    }
                }
            }
            if (failed)
                throw error;
        }
    };
    const retire = () => layer.dispose();
    scope.signal.addEventListener('abort', retire, { once: true });
    return layer;
}
